import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../student-home.js', import.meta.url), 'utf8');

test('a stale edit cannot overwrite a lesson changed on another device', async () => {
  const values = { name: 'Электроник', day: '4', start: '08:30', end: '10:00', room: '305 тоот' };
  const saveButton = { type: 'submit' };
  const cancelButton = { type: 'button' };
  const status = {};
  const previous = { ...values, day: 4, id: 'lesson' };
  const current = { ...previous, room: '406 тоот' };
  let requests = 0;
  const context = {
    document: { getElementById: id => ({
      studentLessonForm: { elements: [saveButton, cancelButton] },
      studentLessonStatus: status,
    })[id] },
    FormData: class { get(key) { return values[key]; } },
    appwriteAccount: { createJWT: async () => ({ jwt: 'token' }) },
    solioPublicPath: path => path,
    fetch: async (path, options) => {
      requests++;
      assert.equal(path, '/api/timetable');
      assert.equal(options.headers['X-Solio-Timetable-Owner'], 'student');
      assert.equal(JSON.parse(options.body).revision, 0);
      return Response.json({ lessons: [current], revision: 1 }, { status: 409 });
    },
    previous,
  };
  const save = runInNewContext(source + `
    studentHomeUser = 'student';
    studentLessonDraft = { id: 'lesson', revision: 0, previous };
    renderStudentSchedule = () => {};
    saveStudentLesson
  `, context);
  await save();
  assert.match(status.textContent, /энэ хичээл өөр төхөөрөмж дээр өөрчлөгдсөн/i);
  assert.equal(saveButton.disabled, true);
  assert.equal(cancelButton.disabled, false);
  await save();
  assert.equal(requests, 1);
});

test('timetable export uses Ulaanbaatar time and includes the final day of term', async () => {
  const { timetableCalendar } = await import('../event-calendar.js');
  const monday = {
    id: 'mon', day: 0, start: '07:30', end: '09:00',
    name: 'Электроник, хэмжилт; '.repeat(6), room: '2-р байр\r305 тоот'
  };
  const tuesday = { id: 'tue', day: 1, start: '10:00', end: '11:00', name: 'Физик' };
  const calendar = timetableCalendar([monday, tuesday], '2026-11-25', '2026-12-07', new Date('2026-11-24T03:00:00Z'));
  const lines = calendar.replace(/\r\n /g, '').split('\r\n');
  assert.ok(lines.includes('DTSTART:20261129T233000Z'));
  assert.ok(lines.includes('DTEND:20261130T010000Z'));
  assert.ok(lines.includes('RRULE:FREQ=WEEKLY;COUNT=2'));
  assert.ok(lines.includes('DTSTART:20261201T020000Z'));
  assert.ok(lines.includes('LOCATION:2-р байр\\n305 тоот'));
  assert.ok(lines.includes('SUMMARY:' + 'Электроник\\, хэмжилт\\; '.repeat(6)));
  assert.ok(calendar.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
  assert.throws(() => timetableCalendar([monday], '2026-11-25', '2026-11-29'), /хичээл алга/);
  assert.throws(() => timetableCalendar([monday], '2026-02-30', '2026-03-10'), /огноог зөв/);
});
