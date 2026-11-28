'use strict';

const studentDays = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];
const studentDayFormat = new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'Asia/Ulaanbaatar' });
const studentEventFormat = new Intl.DateTimeFormat('mn-MN', {
  month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Ulaanbaatar'
});
const studentHomeElement = id => document.getElementById(id);
const studentToday = () => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(studentDayFormat.format());
let studentSelectedDay = studentToday();
let studentHomeSessionReady = false;
let studentHomeUser = '';
let studentLessons = [];
let studentScheduleRevision = -1;
let studentScheduleLoad;
let studentScheduleError = '';
let studentHomeGeneration = 0;
let studentLessonDraft;
let studentLessonBusy = false;
const studentHomeFeeds = new Map();

async function studentTimetableRequest(owner, input) {
  const token = await appwriteAccount.createJWT();
  const headers = {
    Authorization: 'Bearer ' + token.jwt,
    'X-Solio-Timetable-Owner': owner,
    ...(input ? { 'Content-Type': 'application/json' } : {}),
  };
  const response = await fetch(solioPublicPath('/api/timetable'), {
    method: input ? 'POST' : 'GET',
    cache: 'no-store',
    headers,
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
  const data = await response.json();
  const conflict = response.status === 409;
  if (!response.ok && !conflict) throw Error(data.error || 'Хуваарийг шинэчилж чадсангүй.');
  return { ...data, conflict };
}

function acceptStudentTimetable({ lessons, revision }) {
  if (!Array.isArray(lessons) || !Number.isSafeInteger(revision) || revision < studentScheduleRevision) return;
  studentLessons = lessons;
  studentScheduleRevision = revision;
  studentScheduleError = '';
}

function loadStudentTimetable() {
  if (!studentHomeUser || studentScheduleLoad) return studentScheduleLoad;
  const owner = studentHomeUser;
  const generation = studentHomeGeneration;
  studentScheduleError = '';
  studentScheduleLoad = studentTimetableRequest(owner).then(data => {
    if (generation === studentHomeGeneration) acceptStudentTimetable(data);
  }).catch(() => {
    if (generation === studentHomeGeneration) studentScheduleError = 'Хуваарийг ачаалж чадсангүй.';
  }).finally(() => {
    if (generation !== studentHomeGeneration) return;
    studentScheduleLoad = null;
    if (!studentHomeElement('studentHome').hidden) renderStudentSchedule();
  });
  return studentScheduleLoad;
}

function setupStudentHome() {
  const form = studentHomeElement('studentLessonForm');
  const dialog = studentHomeElement('studentLessonDialog');
  studentDays.forEach((name, index) => form.elements.day.add(new Option(name, index)));
  studentHomeElement('studentLessonAdd').onclick = () => {
    if (!studentHomeSessionReady) return;
    requireSolioAccount(async () => {
      const generation = studentHomeGeneration;
      if (studentScheduleRevision < 0) await loadStudentTimetable();
      if (generation === studentHomeGeneration) openStudentLesson();
    }, 'Хичээлийн хуваарь');
  };
  studentHomeElement('studentLessonClose').onclick = () => dialog.close();
  studentHomeElement('studentLessonDelete').onclick = () => {
    if (confirm('Энэ хичээлийг хуваариас устгах уу?')) saveStudentLesson(true);
  };
  form.onsubmit = event => { event.preventDefault(); saveStudentLesson(); };
  studentHomeElement('studentCalendarOpen').onclick = openStudentCalendar;
  studentHomeElement('studentCalendarClose').onclick = () => studentHomeElement('studentCalendarDialog').close();
  studentHomeElement('studentCalendarForm').onsubmit = downloadStudentCalendar;
  dialog.addEventListener('cancel', event => { if (studentLessonBusy) event.preventDefault(); });
}

function setStudentHomeSession(value) {
  const owner = value?.user?.id || '';
  if (studentHomeUser !== owner) {
    studentHomeGeneration++;
    studentHomeUser = owner;
    studentLessons = [];
    studentScheduleRevision = -1;
    studentScheduleLoad = null;
    studentScheduleError = '';
    studentLessonDraft = null;
    studentHomeElement('studentLessonDialog').close();
    studentHomeElement('studentCalendarDialog').close();
  }
  finishStudentHomeSession();
  if (!studentHomeElement('studentHome').hidden || studentScheduleRevision < 0) loadStudentTimetable();
}

function finishStudentHomeSession() {
  studentHomeSessionReady = true;
  if (!studentHomeElement('studentHome').hidden) renderStudentSchedule();
}

function showStudentHome() {
  loadStudentTimetable();
  renderStudentSchedule();
  loadStudentHomeFeeds();
}

function renderStudentSchedule() {
  const today = studentToday();
  const add = studentHomeElement('studentLessonAdd');
  add.disabled = !studentHomeSessionReady || Boolean(studentHomeUser && studentScheduleRevision < 0);
  studentHomeElement('studentCalendarOpen').hidden = !studentHomeUser || !studentLessons.length;
  const status = studentHomeElement('studentScheduleStatus');
  status.textContent = !studentHomeSessionReady ? 'Хуваарийг ачаалж байна…' :
    !studentHomeUser ? 'Хувийн хуваариа үүсгэхийн тулд нэвтэрнэ үү.' :
    studentScheduleError || (studentScheduleRevision < 0 ? 'Хуваарийг ачаалж байна…' :
      studentLessons.length ? '' : '«Хичээл нэмэх» товчоор хуваариа үүсгээрэй.');
  if (studentScheduleError) {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Дахин ачаалах';
    retry.onclick = () => { loadStudentTimetable(); renderStudentSchedule(); };
    status.append(' ', retry);
  }
  const times = [...new Set(studentLessons.map(lesson => lesson.start + '–' + lesson.end))].sort();
  const rows = times.length ? times : ['07:40–09:10', '09:20–10:50', '11:00–12:30', '12:40–14:10',
    '14:20–15:50', '16:00–17:30', '17:40–19:10'];
  const colors = new Map([...new Set(studentLessons.map(lesson => lesson.name))].sort().map((name, index) => [name, index % 6]));
  const body = studentHomeElement('studentWeekRows');
  const header = body.previousElementSibling.rows[0];
  studentDays.forEach((_, day) => {
    const cell = header.cells[day + 1];
    if (day === today) cell.setAttribute('aria-current', 'date');
    else cell.removeAttribute('aria-current');
  });
  body.replaceChildren(...rows.map(time => {
    const row = document.createElement('tr');
    const label = document.createElement('th');
    label.scope = 'row';
    label.textContent = time;
    row.append(label);
    studentDays.forEach((_, day) => {
      const cell = row.insertCell();
      if (day === today) cell.classList.add('studentWeekToday');
      for (const lesson of studentLessons) {
        if (lesson.day !== day || lesson.start + '–' + lesson.end !== time) continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'studentWeekLesson';
        button.dataset.color = colors.get(lesson.name);
        button.setAttribute('aria-label', lesson.name + ' засах');
        const title = document.createElement('strong');
        title.textContent = lesson.name;
        button.append(title);
        if (lesson.room) {
          const room = document.createElement('small');
          room.textContent = lesson.room;
          button.append(room);
        }
        button.onclick = () => openStudentLesson(lesson);
        cell.append(button);
      }
    });
    return row;
  }));
}

function openStudentCalendar() {
  if (!studentHomeUser || !studentLessons.length) return;
  const form = studentHomeElement('studentCalendarForm');
  form.reset();
  form.elements.termStart.value = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ulaanbaatar' }).format();
  studentHomeElement('studentCalendarStatus').textContent = '';
  studentHomeElement('studentCalendarDialog').showModal();
}

async function downloadStudentCalendar(event) {
  event.preventDefault();
  const user = studentHomeUser;
  const dialog = studentHomeElement('studentCalendarDialog');
  if (!user || !dialog.open) return;
  const form = event.currentTarget;
  const values = new FormData(form);
  const button = form.querySelector('[type="submit"]');
  const status = studentHomeElement('studentCalendarStatus');
  if (button.disabled) return;
  status.textContent = '';
  button.disabled = true;
  try {
    const { timetableCalendar } = await import('/event-calendar.js');
    if (studentHomeUser !== user || !dialog.open) return;
    const calendar = timetableCalendar(studentLessons, values.get('termStart'), values.get('termEnd'));
    const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }));
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sol1o-hicheeliin-huvaari.ics';
      document.body.append(link);
      link.click();
      link.remove();
      status.textContent = 'Татсан файлаа календарьтаа оруулна уу.';
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  } catch (error) {
    if (studentHomeUser === user && dialog.open) {
      status.textContent = error instanceof RangeError ? error.message : 'Файлыг бэлдэж чадсангүй. Дахин оролдоно уу.';
    }
  } finally {
    button.disabled = false;
  }
}

function openStudentLesson(lesson) {
  if (!studentHomeUser || studentScheduleRevision < 0 || studentLessonBusy) return;
  const form = studentHomeElement('studentLessonForm');
  form.reset();
  for (const control of form.elements) control.disabled = false;
  studentLessonDraft = { previous: lesson, id: lesson?.id || crypto.randomUUID(), revision: studentScheduleRevision };
  form.elements.day.value = String(lesson?.day ?? studentSelectedDay);
  for (const field of ['name', 'start', 'end', 'room']) form.elements[field].value = lesson?.[field] || '';
  studentHomeElement('studentLessonTitle').textContent = lesson ? 'Хичээл засах' : 'Хичээл нэмэх';
  studentHomeElement('studentLessonStatus').textContent = '';
  studentHomeElement('studentLessonDelete').hidden = !lesson;
  studentHomeElement('studentLessonDialog').showModal();
}

async function saveStudentLesson(remove = false) {
  if (studentLessonBusy || !studentHomeUser || !studentLessonDraft || studentLessonDraft.stale) return;
  const form = studentHomeElement('studentLessonForm');
  const status = studentHomeElement('studentLessonStatus');
  const userId = studentHomeUser;
  const generation = studentHomeGeneration;
  const draft = studentLessonDraft;
  const values = new FormData(form);
  const lesson = {
    id: draft.id,
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
    const result = await studentTimetableRequest(userId, {
      action: remove ? 'delete' : draft.previous ? 'update' : 'create',
      id: draft.id,
      lesson,
      revision: draft.revision,
    });
    if (generation !== studentHomeGeneration) return;
    acceptStudentTimetable(result);
    renderStudentSchedule();
    if (result.conflict) {
      const latest = studentLessons.find(item => item.id === draft.id);
      if (JSON.stringify(latest) === JSON.stringify(draft.previous)) {
        draft.revision = studentScheduleRevision;
        status.textContent = 'Хуваарь өөр төхөөрөмж дээр шинэчлэгдсэн. Дахин хадгална уу.';
      } else {
        draft.stale = true;
        status.textContent = 'Энэ хичээл өөр төхөөрөмж дээр өөрчлөгдсөн. Хаагаад хамгийн сүүлийн хуваариас дахин нээнэ үү.';
      }
      return;
    }
    if (!remove) studentSelectedDay = lesson.day;
    studentHomeElement('studentLessonDialog').close();
  } catch (error) {
    if (generation === studentHomeGeneration) {
      status.textContent = error instanceof SyntaxError ? 'Хадгалж чадсангүй. Дахин оролдоно уу.' : error.message;
    }
  } finally {
    studentLessonBusy = false;
    controls.forEach(control => {
      control.disabled = generation === studentHomeGeneration && draft.stale &&
        (control.type === 'submit' || control.id === 'studentLessonDelete');
    });
  }
}

let studentFeedObserver;
function loadStudentHomeFeeds() {
  studentFeedObserver?.disconnect();
  if (studentHomeElement('studentHome').hidden) return;
  const scope = profileSchool;
  const feeds = [
    { root: 'studentHomeDeals', api: '/api/deals?', key: 'deals', empty: 'Одоогоор идэвхтэй хөнгөлөлт алга.' },
    { root: 'studentHomeEvents', api: '/api/societies?kind=event&scope=upcoming&', key: 'items', empty: 'Одоогоор удахгүй болох эвент алга.' }
  ];
  if (typeof IntersectionObserver === 'undefined') {
    feeds.forEach(feed => loadStudentHomeFeed(feed, scope));
    return;
  }
  studentFeedObserver = new IntersectionObserver((entries, observer) => {
    if (observer !== studentFeedObserver || scope !== profileSchool) return;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      loadStudentHomeFeed(feeds.find(feed => feed.root === entry.target.id), scope);
    }
  }, { rootMargin: '180px 0px' });
  for (const feed of feeds) {
    const root = studentHomeElement(feed.root);
    if (studentHomeFeeds.get(feed.root)?.scope !== scope) {
      studentHomeFeeds.delete(feed.root);
      root.textContent = 'Ачаалж байна…';
    }
    studentFeedObserver.observe(root);
  }
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
