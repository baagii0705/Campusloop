'use strict';

const studentDays = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];
const studentDayFormat = new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'Asia/Ulaanbaatar' });
const studentEventFormat = new Intl.DateTimeFormat('mn-MN', {
  month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Ulaanbaatar'
});
const studentHomeElement = id => document.getElementById(id);
const studentToday = () => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(studentDayFormat.format());
const studentScheduleKey = 'solioTimetable';
const studentMaximumLessons = 60;
let studentSelectedDay = studentToday();
let studentHomeSessionReady = false;
let studentHomeUser = '';
let studentLessons = [];
let studentLessonId = '';
let studentLessonBusy = false;
const studentHomeFeeds = new Map();

function studentLessonsFromPrefs(prefs) {
  const items = prefs?.[studentScheduleKey];
  if (!Array.isArray(items)) return [];
  return items.filter(item => typeof item?.id === 'string' && typeof item.name === 'string' &&
    Number.isInteger(item.day) && item.day >= 0 && item.day < 7 &&
    typeof item.start === 'string' && typeof item.end === 'string' && typeof item.room === 'string');
}

function setupStudentHome() {
  const days = studentHomeElement('studentScheduleDays');
  const form = studentHomeElement('studentLessonForm');
  const dialog = studentHomeElement('studentLessonDialog');
  studentDays.forEach((name, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name.slice(0, 2);
    button.setAttribute('aria-label', name);
    button.onclick = () => { studentSelectedDay = index; renderStudentSchedule(); };
    days.append(button);
    form.elements.day.add(new Option(name, index));
  });
  studentHomeElement('studentLessonAdd').onclick = () => {
    if (studentHomeSessionReady) requireSolioAccount(() => openStudentLesson(), 'Хичээлийн хуваарь');
  };
  studentHomeElement('studentLessonClose').onclick = () => dialog.close();
  studentHomeElement('studentLessonDelete').onclick = () => {
    if (confirm('Энэ хичээлийг хуваариас устгах уу?')) saveStudentLesson(true);
  };
  form.onsubmit = event => { event.preventDefault(); saveStudentLesson(); };
  dialog.addEventListener('cancel', event => { if (studentLessonBusy) event.preventDefault(); });
}

function setStudentHomeSession(value) {
  const user = value?.user;
  if (studentHomeUser !== (user?.id || '')) studentHomeElement('studentLessonDialog').close();
  studentHomeUser = user?.id || '';
  studentLessons = studentLessonsFromPrefs(user?.prefs);
  finishStudentHomeSession();
}

function finishStudentHomeSession() {
  studentHomeSessionReady = true;
  if (!studentHomeElement('studentHome').hidden) renderStudentSchedule();
}

function showStudentHome() {
  renderStudentSchedule();
  loadStudentHomeFeeds();
}

function renderStudentSchedule() {
  const today = studentToday();
  const todayCount = studentLessons.filter(lesson => lesson.day === today).length;
  studentHomeElement('studentTodaySummary').textContent =
    studentHomeUser ? todayCount + ' хичээл' : studentDays[today];
  [...studentHomeElement('studentScheduleDays').children].forEach((button, index) => {
    button.setAttribute('aria-pressed', String(studentSelectedDay === index));
    if (index === today) button.setAttribute('aria-current', 'date');
    else button.removeAttribute('aria-current');
  });
  studentHomeElement('studentScheduleDay').textContent =
    (studentSelectedDay === today ? 'Өнөөдөр · ' : '') + studentDays[studentSelectedDay];
  const lessons = studentLessons.filter(lesson => lesson.day === studentSelectedDay)
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  const add = studentHomeElement('studentLessonAdd');
  add.disabled = !studentHomeSessionReady;
  studentHomeElement('studentScheduleStatus').textContent = !studentHomeSessionReady ? 'Хуваарийг ачаалж байна…' :
    !studentHomeUser ? 'Хувийн хуваариа харах, нэмэхийн тулд нэвтэрнэ үү.' :
    lessons.length ? '' : 'Энэ өдөр хичээл нэмээгүй байна.';
  const list = studentHomeElement('studentScheduleLessons');
  list.replaceChildren(...lessons.map(lesson => {
    const item = document.createElement('li');
    const time = document.createElement('span');
    time.className = 'studentLessonTime';
    time.textContent = lesson.start + '–' + lesson.end;
    const details = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = lesson.name;
    details.append(title);
    if (lesson.room) {
      const room = document.createElement('small');
      room.textContent = lesson.room;
      details.append(room);
    }
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Засах';
    edit.setAttribute('aria-label', lesson.name + ' засах');
    edit.onclick = () => openStudentLesson(lesson);
    item.append(time, details, edit);
    return item;
  }));
}

function openStudentLesson(lesson) {
  if (!studentHomeUser || studentLessonBusy) return;
  const form = studentHomeElement('studentLessonForm');
  form.reset();
  studentLessonId = lesson?.id || '';
  form.elements.day.value = String(lesson?.day ?? studentSelectedDay);
  for (const field of ['name', 'start', 'end', 'room']) form.elements[field].value = lesson?.[field] || '';
  studentHomeElement('studentLessonTitle').textContent = lesson ? 'Хичээл засах' : 'Хичээл нэмэх';
  studentHomeElement('studentLessonStatus').textContent = '';
  studentHomeElement('studentLessonDelete').hidden = !lesson;
  studentHomeElement('studentLessonDialog').showModal();
}

async function saveStudentLesson(remove = false) {
  if (studentLessonBusy || !studentHomeUser) return;
  const form = studentHomeElement('studentLessonForm');
  const status = studentHomeElement('studentLessonStatus');
  const userId = studentHomeUser;
  const editing = studentLessonId;
  const values = new FormData(form);
  const lesson = {
    id: editing || crypto.randomUUID(),
    name: values.get('name').trim(),
    day: Number(values.get('day')),
    start: values.get('start'),
    end: values.get('end'),
    room: values.get('room').trim()
  };
  if (!remove && (!lesson.name || lesson.start >= lesson.end)) {
    status.textContent = !lesson.name ? 'Хичээлийн нэрээ бичнэ үү.' : 'Дуусах цаг эхлэх цагаас хойш байх ёстой.';
    return;
  }
  const controls = [...form.elements];
  studentLessonBusy = true;
  controls.forEach(control => { control.disabled = true; });
  status.textContent = 'Хадгалж байна…';
  try {
    const account = await appwriteAccount.get();
    if (account.$id !== userId || studentHomeUser !== userId) return;
    const lessons = studentLessonsFromPrefs(account.prefs);
    if (!remove && !editing && lessons.length >= studentMaximumLessons) {
      status.textContent = 'Хуваарьт 60 хүртэл хичээл нэмэх боломжтой.';
      return;
    }
    const next = lessons.filter(item => item.id !== lesson.id);
    if (!remove) next.push(lesson);
    const updated = await appwriteAccount.updatePrefs({ ...account.prefs, [studentScheduleKey]: next });
    if (studentHomeUser !== userId || updated.$id !== userId) return;
    studentLessons = studentLessonsFromPrefs(updated.prefs);
    if (!remove) studentSelectedDay = lesson.day;
    studentHomeElement('studentLessonDialog').close();
    renderStudentSchedule();
  } catch {
    status.textContent = 'Хадгалж чадсангүй. Дахин оролдоно уу.';
  } finally {
    studentLessonBusy = false;
    controls.forEach(control => { control.disabled = false; });
  }
}

function loadStudentHomeFeeds() {
  if (studentHomeElement('studentHome').hidden) return;
  const scope = profileSchool;
  const feeds = [
    { root: 'studentHomeDeals', api: '/api/deals?', key: 'deals', empty: 'Одоогоор идэвхтэй хөнгөлөлт алга.' },
    { root: 'studentHomeEvents', api: '/api/societies?kind=event&scope=upcoming&', key: 'items', empty: 'Одоогоор удахгүй болох эвент алга.' }
  ];
  feeds.forEach(feed => loadStudentHomeFeed(feed, scope));
}

async function loadStudentHomeFeed(feed, scope, force = false) {
  const current = studentHomeFeeds.get(feed.root);
  if (!force && current?.scope === scope && (current.pending || Date.now() - current.loadedAt < 60000)) return;
  const request = { scope, pending: true, loadedAt: 0 };
  studentHomeFeeds.set(feed.root, request);
  const root = studentHomeElement(feed.root);
  const status = document.createElement('p');
  status.className = 'studentHomeStatus';
  status.setAttribute('role', 'status');
  status.textContent = 'Ачаалж байна…';
  root.replaceChildren(status);
  try {
    const result = await fetch(solioPublicPath(feed.api + new URLSearchParams({ school: scope })), { cache: 'no-store' });
    if (!result.ok) throw Error('Home feed unavailable');
    const items = (await result.json())[feed.key];
    if (studentHomeFeeds.get(feed.root) !== request) return;
    if (!items.length) status.textContent = feed.empty;
    else root.replaceChildren(...items.slice(0, 3).map(item => studentHomeFeedLink(feed.key, item)));
    request.loadedAt = Date.now();
  } catch {
    if (studentHomeFeeds.get(feed.root) !== request) return;
    status.textContent = 'Ачаалж чадсангүй. ';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Дахин оролдох';
    retry.onclick = () => loadStudentHomeFeed(feed, scope, true);
    status.append(retry);
  } finally {
    request.pending = false;
  }
}

function formatStudentEventDate(value) {
  const date = new Date(value);
  if (Number.isNaN(+date)) return '';
  const parts = Object.fromEntries(studentEventFormat.formatToParts(date).map(({ type, value }) => [type, value]));
  return parts.month + ' сарын ' + parts.day + ' · ' + parts.hour + ':' + parts.minute;
}

function studentHomeFeedLink(kind, item) {
  const deal = kind === 'deals';
  const link = document.createElement('a');
  link.className = 'studentHomeFeedLink';
  link.href = deal ? solioPublicPath('/deals/' + encodeURIComponent(item.id)) : '#societies/event/' + encodeURIComponent(item.id);
  const heading = document.createElement('strong');
  heading.textContent = item.title;
  const summary = document.createElement('small');
  summary.textContent = (deal ? [item.company, item.benefit] :
    [formatStudentEventDate(item.starts_at), item.location]).filter(Boolean).join(' · ');
  link.append(heading, summary);
  return link;
}
