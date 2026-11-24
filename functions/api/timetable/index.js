import { binding, originOK, readJSON, response, verifiedUser } from '../../../sponsor-api-utils.js';

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const nativeOrigins = new Set(['capacitor://localhost', 'https://localhost']);

function allowedOrigin(request) {
  return originOK(request) || nativeOrigins.has(request.headers.get('Origin'));
}

function addNativeHeaders(request, result) {
  const origin = request.headers.get('Origin');
  if (nativeOrigins.has(origin)) {
    result.headers.set('Access-Control-Allow-Origin', origin);
    result.headers.set('Vary', 'Origin');
  }
  return result;
}

function storedLessons(prefs) {
  const items = prefs?.solioTimetable;
  if (!Array.isArray(items)) return [];
  return items.filter(item => typeof item?.id === 'string' && typeof item.name === 'string' &&
    Number.isInteger(item.day) && item.day >= 0 && item.day < 7 &&
    typeof item.start === 'string' && typeof item.end === 'string' && typeof item.room === 'string')
    .map(({ id, name, day, start, end, room }) => ({ id, name, day, start, end, room }));
}

function validatedLesson(input) {
  if (!input || typeof input.id !== 'string' || !input.id || input.id.length > 100 ||
      typeof input.name !== 'string' || typeof input.room !== 'string' ||
      !Number.isInteger(input.day) || input.day < 0 || input.day > 6 ||
      typeof input.start !== 'string' || !timePattern.test(input.start) ||
      typeof input.end !== 'string' || !timePattern.test(input.end) || input.start >= input.end) return null;
  const name = input.name.trim();
  const room = input.room.trim();
  if (!name || name.length > 100 || room.length > 80) return null;
  return { id: input.id, name, day: input.day, start: input.start, end: input.end, room };
}

async function snapshot(db, owner) {
  const row = await db.prepare('SELECT lessons_json, revision FROM student_timetables WHERE owner_id=?')
    .bind(owner).first();
  return row ? { lessons: JSON.parse(row.lessons_json), revision: row.revision } : null;
}

async function initialSnapshot(db, user) {
  const existing = await snapshot(db, user.id);
  if (existing) return existing;
  // A concurrent first visit must never reset a row once another request has created it.
  await db.prepare('INSERT INTO student_timetables (owner_id, lessons_json) VALUES (?, ?) ON CONFLICT(owner_id) DO NOTHING')
    .bind(user.id, JSON.stringify(storedLessons(user.prefs))).run();
  return snapshot(db, user.id);
}

async function handle(context, action) {
  const { request } = context;
  if (!allowedOrigin(request)) return response({ error: 'Энэ сайтаас хүсэлт илгээнэ үү.' }, 403);
  const user = await verifiedUser(request, { includePrefs: true });
  if (!user || request.headers.get('X-Solio-Timetable-Owner') !== user.id) {
    return addNativeHeaders(request, response({ error: 'Нэвтэрнэ үү.' }, 401));
  }
  let result;
  try {
    result = await action(binding(context), user);
  } catch {
    result = response({ error: 'Хуваарийг синк хийж чадсангүй. Дахин оролдоно уу.' }, 503);
  }
  return addNativeHeaders(request, result);
}

export function onRequestOptions({ request }) {
  if (!allowedOrigin(request)) return response({ error: 'Энэ сайтаас хүсэлт илгээнэ үү.' }, 403);
  return addNativeHeaders(request, new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Solio-Timetable-Owner'
    }
  }));
}

export function onRequestGet(context) {
  return handle(context, async (db, user) => response(await initialSnapshot(db, user)));
}

export function onRequestPost(context) {
  return handle(context, async (db, user) => {
    let input;
    try { input = await readJSON(context.request, 4096); }
    catch (error) { return response({ error: error.message }, 400); }
    const { action, id, revision } = input;
    const lesson = action === 'delete' ? null : validatedLesson({ ...input.lesson, id });
    if (!['create', 'update', 'delete'].includes(action) || !Number.isSafeInteger(revision) || revision < 0 ||
        typeof id !== 'string' || !id || id.length > 100 || (action !== 'delete' && !lesson)) {
      return response({ error: 'Хичээлийн мэдээллийг шалгана уу.' }, 400);
    }
    const current = await initialSnapshot(db, user);
    const previous = current.lessons.find(item => item.id === id);
    // Repeating a request after a lost response may already have achieved the desired state.
    if ((action === 'delete' && !previous) || (lesson && JSON.stringify(previous) === JSON.stringify(lesson))) {
      return response(current);
    }
    if (current.revision !== revision || (action === 'create' && previous) || (action === 'update' && !previous)) {
      return response(current, 409);
    }
    if (action === 'create' && current.lessons.length >= 60) {
      return response({ error: 'Хуваарьт 60 хүртэл хичээл нэмэх боломжтой.' }, 422);
    }
    const next = current.lessons.filter(item => item.id !== id);
    if (lesson) next.push(lesson);
    const saved = await db.prepare('UPDATE student_timetables SET lessons_json=?, revision=revision+1 WHERE owner_id=? AND revision=? RETURNING revision')
      .bind(JSON.stringify(next), user.id, revision).first();
    if (!saved) return response(await snapshot(db, user.id), 409);
    return response({ lessons: next, revision: saved.revision });
  });
}
