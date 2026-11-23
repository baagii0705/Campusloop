import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../student-home.js', import.meta.url), 'utf8');

test('a lesson update merges with account preferences and supports validated edits and deletion', async () => {
  let values = { name: 'Электроник', day: '4', start: '08:30', end: '10:00', room: '305 тоот' };
  const form = { elements: [] };
  const status = {};
  const dialog = { close() {} };
  let account = { $id: 'student', prefs: { anotherSetting: 'keep' } };
  const context = {
    document: { getElementById: id => ({ studentLessonForm: form, studentLessonStatus: status, studentLessonDialog: dialog })[id] },
    crypto: { randomUUID: () => 'lesson' },
    FormData: class { get(key) { return values[key]; } },
    appwriteAccount: { get: async () => account, updatePrefs: async prefs => (account = { ...account, prefs }) }
  };
  const actions = runInNewContext(source + `
    studentHomeUser = 'student';
    renderStudentSchedule = () => {};
    ({ save: saveStudentLesson, edit: () => { studentLessonId = 'lesson'; } })
  `, context);

  await actions.save();
  assert.equal(account.prefs.anotherSetting, 'keep');
  assert.equal(account.prefs.solioTimetable[0].name, 'Электроник');
  assert.equal(account.prefs.solioTimetable[0].day, 4);
  actions.edit();
  values = { ...values, end: '07:30' };
  await actions.save();
  assert.match(status.textContent, /Дуусах цаг/);
  assert.equal(account.prefs.solioTimetable[0].end, '10:00');
  values = { ...values, end: '10:30' };
  await actions.save();
  assert.equal(account.prefs.solioTimetable.length, 1);
  assert.equal(account.prefs.solioTimetable[0].end, '10:30');
  await actions.save(true);
  assert.equal(account.prefs.solioTimetable.length, 0);

  account = { $id: 'another-user', prefs: { anotherSetting: 'separate' } };
  await actions.save();
  assert.equal(account.prefs.solioTimetable, undefined);
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
