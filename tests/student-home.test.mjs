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
