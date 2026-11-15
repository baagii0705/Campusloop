import { admissionYear, schools as curatedSchools, paths, programs as curatedPrograms, faculty } from './catalog.js';
import { loadStudyData } from './guide-data.js';

const $ = id => document.getElementById(id);
let studyData;
try {
  studyData = await loadStudyData();
} catch {
  studyData = { schools: curatedSchools, programs: curatedPrograms };
  $('study-load-error').hidden = false;
}
const { schools, programs } = studyData;
const programById = new Map(programs.map(program => [program.id, program]));
const views = ['programs', 'schools', 'faculty', 'saved'];
const compareLimit = 3;
const pageSize = 24;
let visibleCount = pageSize;
const institutionCounts = new Map();
for (const { school } of programs) institutionCounts.set(school, (institutionCounts.get(school) || 0) + 1);
const levels = [...new Set(programs.map(program => program.level || 'Бакалавр'))].sort(new Intl.Collator('mn-MN').compare);
const storageKey = 'solio.study.saved';
const symbols = {
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-2-15-4 18"/>',
  data: '<path d="M3 3v18h18M7 17v-4m5 4V8m5 9V5"/>',
  build: '<path d="M3 21 21 3v18H3Zm10-4h4v-4l-4 4Z"/>',
  finance: '<path d="M3 18h18M5 15l5-5 3 3 6-7m-4 0h4v4"/>',
  people: '<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m1 4a5 5 0 0 1 4 5v1"/>',
  bookmark: '<path d="M6 4h12v17l-6-4-6 4V4Z"/>',
};

const icon = name => '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + symbols[name] + '</svg>';
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
));

function validIds(ids) {
  return Array.isArray(ids) ? [...new Set(ids.filter(id => programById.has(id)))] : [];
}

function readSaved() {
  try {
    return new Set(validIds(JSON.parse(localStorage.getItem(storageKey))));
  } catch {
    return new Set();
  }
}

function readLocation() {
  const params = new URLSearchParams(location.search);
  const view = params.get('view');
  return {
    view: views.includes(view) ? view : 'programs',
    school: Object.hasOwn(schools, params.get('school')) ? params.get('school') : '',
    path: Object.hasOwn(paths, params.get('field')) ? params.get('field') : '',
    level: levels.includes(params.get('level')) ? params.get('level') : '',
    compare: validIds((params.get('compare') || '').split(',')).slice(0, compareLimit),
  };
}

let state = readLocation();
const saved = readSaved();

function currentUrl({ forSharing = false } = {}) {
  const url = new URL(location.href);
  for (const key of ['view', 'school', 'field', 'level', 'compare']) url.searchParams.delete(key);
  if (!forSharing) {
    if (state.view !== 'programs') url.searchParams.set('view', state.view);
    if (state.school) url.searchParams.set('school', state.school);
    if (state.path) url.searchParams.set('field', state.path);
    if (state.level) url.searchParams.set('level', state.level);
  }
  if (state.compare.length) url.searchParams.set('compare', state.compare.join(','));
  if (forSharing) url.hash = '';
  return url;
}

function setFilters(changes, { clearQuery = false, scroll = false } = {}) {
  state = { ...state, ...changes };
  visibleCount = pageSize;
  if (clearQuery) $('query').value = '';
  const url = currentUrl();
  if (url.href !== location.href) history.pushState(null, '', url);
  syncFilters();
  render();
  if (scroll) {
    $('directory-title').tabIndex = -1;
    $('directory-title').focus();
    $('directory').scrollIntoView({ block: 'start' });
  }
}

const tag = id => '<span class="school-tag" data-school="' + escape(id) + '">' + escape(schools[id].short) + '</span>';
const duration = program => program.duration || (program.years ? program.years + ' жил' : '');
const programLevel = program => program.level || 'Бакалавр';
const programPeriod = program => program.period || (program.path ? admissionYear : '');
const source = (href, label) => /^(https?:\/\/|\/study\/catalog\/\?)/i.test(href || '')
  ? '<a class="source" href="' + escape(href) + '" target="_blank" rel="noopener noreferrer">' + label + ' <span aria-hidden="true">↗</span></a>'
  : '';

function programCard(program) {
  const { id, school, name, path, roles, department, code, index } = program;
  const meta = [path && paths[path].category, programLevel(program), duration(program)].filter(Boolean).join(' · ');
  const note = [code || index, programPeriod(program)].filter(Boolean).join(' · ');
  return '<article class="card"><div class="card-top">' + tag(school) +
    '<span class="meta">' + escape(meta) + '</span></div>' +
    '<h3>' + escape(name) + '</h3>' +
    (roles || department ? '<p class="roles">' + escape(roles || department) + '</p>' : '') +
    (note ? '<p>' + escape(note) + '</p>' : '') +
    '<div class="card-actions"><button class="primary" type="button" data-detail="' + id + '">Дэлгэрэнгүй</button>' +
    '<button class="secondary" type="button" data-compare="' + id + '" aria-pressed="false">Харьцуулах</button>' +
    '<button class="icon-button" type="button" data-save="' + id + '" aria-pressed="false">' + icon('bookmark') + '</button></div></article>';
}

function personCard(person) {
  return '<article class="card"><div class="card-top">' + tag(person.school) + '</div>' +
    '<h3>' + escape(person.name) + '</h3><p>' + escape(person.role) + ' · ' + escape(person.department) + '</p>' +
    (person.focus ? '<p class="roles">' + escape(person.focus) + '</p>' : '') +
    '<div class="card-actions">' + source(person.source, 'Албан ёсны эх сурвалж') + '</div></article>';
}

function schoolCard([id, school]) {
  const totalPrograms = institutionCounts.get(id) || 0;
  const totalTeachers = faculty.filter(person => person.school === id).length;
  const rows = [
    ['Өмчийн хэлбэр', school.ownership], ['Харьяалах сургууль', schools[school.parent]?.name],
    ['Хаяг', school.address], ['Регистр', school.registration], ['Зөвшөөрөл', school.license],
    ['Олгосон огноо', school.issued], ['Бүртгэлд заасан дуусах огноо', school.expires]
  ].filter(([, value]) => value);
  const campuses = school.branches?.length
    ? '<ul>' + school.branches.map(branch => '<li>' + escape([branch.name, branch.address].filter(Boolean).join(' · ')) + ' ' + source(branch.source, 'Эх сурвалж') + '</li>').join('') + '</ul>'
    : '';
  return '<article class="card"><div class="card-top">' + tag(id) + '</div><h3>' + escape(school.name) + '</h3>' +
    '<p>' + (totalPrograms ? totalPrograms.toLocaleString('mn-MN') + ' хөтөлбөрийн бүртгэл' : 'Хөтөлбөрийн мэдээлэл баталгаажаагүй') +
    (totalTeachers ? ' · ' + totalTeachers + ' багш' : '') + '</p>' +
    (school.note ? '<p>' + escape(school.note) + '</p>' : '') +
    (rows.length || campuses ? '<details><summary>Сургуулийн мэдээлэл</summary>' + detailsList(rows) + campuses + '</details>' : '') +
    '<div class="card-actions">' +
    (totalPrograms ? '<button class="primary" type="button" data-school-programs="' + id + '">Хөтөлбөрүүд</button>' : '') +
    (totalTeachers ? '<button class="secondary" type="button" data-school-faculty="' + id + '">Багш нар</button>' : '') +
    source(school.admission, 'Элсэлтийн сайт') + source(school.site, 'Сургуулийн сайт') + source(school.source, 'Яамны бүртгэл') + '</div></article>';
}

function normalize(value) {
  return String(value).toLocaleLowerCase('mn-MN').normalize('NFC')
    .replaceAll('компьютерийн', 'компьютерын').replaceAll('программ', 'програм')
    .replace(/[.\-]/g, '').trim();
}

function render() {
  const { view, school, path, level } = state;
  const terms = normalize($('query').value).split(/\s+/).filter(Boolean);
  function matches(schoolId, ...values) {
    if (school && school !== schoolId) return false;
    const institution = schools[schoolId];
    const haystack = normalize([...values, institution.short, institution.name].join(' '));
    return terms.every(term => haystack.includes(term));
  }

  let cards, unit;
  let total;
  if (view === 'schools') {
    cards = Object.entries(schools).filter(([id, school]) => matches(id, school.address, school.branches?.map(branch => branch.name).join(' '))).map(schoolCard);
    unit = 'сургууль';
  } else if (view === 'faculty') {
    cards = faculty.filter(person => matches(person.school, person.name, person.role, person.department, person.focus)).map(personCard);
    unit = 'багш';
  } else {
    const filtered = programs.filter(program => (
      (view !== 'saved' || saved.has(program.id)) &&
      (!path || path === program.path) &&
      (!level || level === programLevel(program)) &&
      matches(program.school, program.name, program.roles, program.topics, program.department,
        paths[program.path]?.category, program.code, program.index, program.english, programPeriod(program), programLevel(program))
    ));
    cards = filtered.slice(0, visibleCount).map(programCard);
    total = filtered.length;
    unit = 'хөтөлбөрийн бүртгэл';
  }

  total ??= cards.length;
  const hasFilters = Boolean(terms.length || school || path || level);
  const empty = view === 'saved' && !saved.size
    ? 'Сонирхсон хөтөлбөр дээрээ хадгалах товч дараарай.'
    : 'Тохирох ' + unit + ' олдсонгүй. Хайлтаа өөрчилж үзээрэй.';
  $('results').innerHTML = cards.join('') || '<p class="empty">' + empty + '</p>';
  $('result-count').textContent = total.toLocaleString('mn-MN') + ' ' + unit +
    (cards.length < total ? ' · ' + cards.length.toLocaleString('mn-MN') + ' харагдаж байна' : '');
  $('more-results').hidden = cards.length >= total;
  $('reset').hidden = !hasFilters;
  updateActions();
}

function updateActions() {
  document.querySelectorAll('[data-save]').forEach(button => {
    const program = programById.get(button.dataset.save);
    const active = saved.has(program.id);
    button.setAttribute('aria-pressed', active);
    const label = (active ? 'Хадгалснаас хасах · ' : 'Хадгалах · ') + program.name;
    button.setAttribute('aria-label', label);
    button.title = label;
  });
  document.querySelectorAll('[data-compare]').forEach(button => {
    const program = programById.get(button.dataset.compare);
    const active = state.compare.includes(program.id);
    button.setAttribute('aria-pressed', active);
    button.textContent = active ? 'Сонгосон' : 'Харьцуулах';
    button.setAttribute('aria-label', (active ? 'Харьцуулалтаас хасах · ' : 'Харьцуулах · ') + program.name);
  });
  $('saved-total').hidden = !saved.size;
  $('saved-total').textContent = saved.size;
  $('selection').hidden = !state.compare.length;
  $('selection-count').textContent = state.compare.length + ' / ' + compareLimit + ' хөтөлбөр сонгосон';
  $('open-compare').disabled = state.compare.length < 2;
  $('selected-programs').innerHTML = state.compare.map(id => {
    const program = programById.get(id);
    const name = escape(schools[program.school].short) + ' · ' + escape(program.name);
    return '<button type="button" data-remove="' + id + '" aria-label="Харьцуулалтаас хасах · ' + name + '">' +
      name + ' <span aria-hidden="true">×</span></button>';
  }).join('');
}

function syncFilters() {
  document.querySelectorAll('[data-view]').forEach(link => {
    if (link.dataset.view === state.view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-path]').forEach(button => {
    button.setAttribute('aria-pressed', button.dataset.path === state.path);
  });
  $('school').value = state.school;
  $('field').value = state.path;
  $('level').value = state.level;
  $('level-filter').hidden = !['programs', 'saved'].includes(state.view);
  $('field-filter').hidden = !['programs', 'saved'].includes(state.view);
  $('query').placeholder = {
    programs: 'Хөтөлбөр, код, ажил мэргэжил…',
    schools: 'Сургуулийн нэр…',
    faculty: 'Багшийн нэр, тэнхим, судалгааны чиглэл…',
    saved: 'Хадгалсан хөтөлбөрөөс хайх…',
  }[state.view];
}

function toggleSave(id) {
  const program = programById.get(id);
  const wasSaved = saved.delete(id);
  if (!wasSaved) saved.add(id);
  let message = wasSaved ? 'Хадгалснаас хаслаа.' : 'Энэ төхөөрөмжид хадгаллаа.';
  try {
    localStorage.setItem(storageKey, JSON.stringify([...saved]));
  } catch {
    message = wasSaved ? message : 'Энэ удаагийн хандалтад хадгаллаа. Төхөөрөмжид хадгалах боломжгүй байна.';
  }
  $('notice').textContent = program.name + ' · ' + message;
  if (state.view === 'saved' && wasSaved) {
    render();
    document.querySelector('[data-view="saved"]').focus();
  } else {
    updateActions();
  }
}

function toggleCompare(id) {
  const selected = state.compare.includes(id);
  if (!selected && state.compare.length === compareLimit) {
    const count = $('selection-count');
    count.textContent = 'Дээд тал нь ' + compareLimit + ' хөтөлбөр харьцуулна. Нэгийг хасаарай.';
    $('notice').textContent = count.textContent;
    return;
  }
  state.compare = selected ? state.compare.filter(item => item !== id) : [...state.compare, id];
  history.replaceState(null, '', currentUrl());
  updateActions();
}

function detailsList(rows) {
  return '<dl class="details">' + rows.map(([title, value]) => (
    '<div><dt>' + title + '</dt><dd>' + escape(value) + '</dd></div>'
  )).join('') + '</dl>';
}

const programRows = [
  ['Түвшин', programLevel],
  ['Сургуулийн код', p => p.code],
  ['Улсын индексийн лавлагаа', p => p.index],
  ['Англи нэр', p => p.english],
  ['Салбар, тэнхим', p => p.department],
  ['Хугацаа', duration],
  ['Багц цаг', p => p.credits],
  ['Сургалтын хэлбэр', p => p.mode],
  ['Эх сурвалжийн үе', programPeriod],
  ['Судлах сэдвийн жишээ', p => p.topics],
  ['Ажиллах чиглэлийн жишээ', p => p.roles],
  ['ЭШ-ийн хичээл', p => p.subjects],
  ['ЭШ-ийн босго', p => p.threshold],
];

function programSources(program) {
  const school = schools[program.school];
  return [
    source(program.source, 'Эх сурвалж'),
    source(program.officialDetail !== program.source && program.officialDetail, 'Албан мэдээлэл'),
    source(program.indexSource, 'Индексийн эх PDF'),
    source(program.path && school.rules, 'Элсэлтийн журам'),
    source(school.admission, 'Элсэлтийн сайт'),
    source(program.curriculum, 'Сургалтын хөтөлбөр'),
    source(program.planUrl, 'МУИС-ийн төлөвлөгөө')
  ].filter(Boolean);
}

function showDetail(id) {
  const program = programById.get(id);
  const school = schools[program.school];
  const teachers = faculty.filter(person => person.school === program.school && person.department === program.department);
  $('detail-content').innerHTML = tag(program.school) + '<h2 id="detail-title">' + escape(program.name) + '</h2>' +
    '<p class="detail-department">' + escape(school.name) + '</p>' +
    detailsList([
      ...programRows.map(([label, get]) => [label, get(program)]),
      ['Эх сурвалжийн тайлбар', program.note]
    ].filter(([, value]) => value != null && value !== '')) +
    (teachers.length ? '<section class="detail-faculty"><h3>Тэнхимийн багш нараас</h3><ul>' +
      teachers.map(person => '<li>' + source(person.source, escape(person.name)) + ' · ' + escape(person.role) + '</li>').join('') +
      '</ul></section>' : '') +
    '<div class="detail-links">' + programSources(program).join('') + '</div>';
  $('detail').showModal();
}

function showCompare() {
  const comparison = state.compare.map(id => programById.get(id));
  if (comparison.length < 2 || $('comparison').open) return;
  const hasValue = value => value != null && value !== '';
  const rows = programRows.map(([title, get]) => [title, comparison.map(get)])
    .filter(([, values]) => values.some(hasValue));
  $('compare-year').textContent = 'Бүртгэлүүдийн эх сурвалж, он өөр байж болно. Элсэлтийн нөхцөлийг албан ёсны холбоосоор шалгаарай.';
  $('compare-content').innerHTML = '<div class="compare-grid" tabindex="0" role="region" aria-label="Харьцуулалтын хүснэгт"><table>' +
    '<thead><tr><th scope="col">Үзүүлэлт</th>' + comparison.map(p => '<th scope="col">' + tag(p.school) + '<br>' + escape(p.name) + '</th>').join('') +
    '</tr></thead><tbody>' + rows.map(([title, values]) => '<tr><th scope="row">' + title + '</th>' +
      values.map(value => '<td>' + escape(hasValue(value) ? value : '—') + '</td>').join('') + '</tr>').join('') +
    '<tr><th scope="row">Эх сурвалж</th>' + comparison.map(p => '<td>' + (programSources(p).join('<br>') || '—') + '</td>').join('') +
    '</tr></tbody></table></div>';
  $('share-status').hidden = true;
  $('comparison').showModal();
}

$('path-options').innerHTML = Object.entries(paths).map(([id, entry]) => (
  '<button class="path-button" type="button" data-path="' + id + '" aria-pressed="false">' +
  '<span class="path-icon">' + icon(entry.icon) + '</span><span>' + escape(entry.label) + '</span><span aria-hidden="true">↘</span></button>'
)).join('');
Object.entries(schools).forEach(([id, school]) => $('school').add(new Option(school.short, id)));
Object.entries(paths).forEach(([id, path]) => $('field').add(new Option(path.category, id)));
levels.forEach(level => $('level').add(new Option(level, level)));

$('path-options').addEventListener('click', event => {
  const button = event.target.closest('[data-path]');
  if (button) setFilters({ view: 'programs', path: state.path === button.dataset.path ? '' : button.dataset.path, school: '', level: '' }, { clearQuery: true, scroll: true });
});
document.querySelector('.views').addEventListener('click', event => {
  const link = event.target.closest('[data-view]');
  if (!link || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  event.preventDefault();
  if (link.dataset.view !== state.view) setFilters({ view: link.dataset.view, path: '', level: '' }, { clearQuery: true });
});
$('filters').addEventListener('submit', event => event.preventDefault());
$('query').addEventListener('input', () => { visibleCount = pageSize; render(); });
$('more-results').addEventListener('click', () => {
  const firstNew = visibleCount;
  visibleCount += pageSize;
  render();
  const heading = $('results').children[firstNew]?.querySelector('h3');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus();
  }
});
$('level').addEventListener('change', event => setFilters({ level: event.target.value }));
$('school').addEventListener('change', event => setFilters({ school: event.target.value }));
$('field').addEventListener('change', event => setFilters({ path: event.target.value }));
$('reset').addEventListener('click', () => setFilters({ school: '', path: '', level: '' }, { clearQuery: true }));
$('results').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const { detail, save, compare, schoolPrograms, schoolFaculty } = button.dataset;
  if (detail) showDetail(detail);
  if (save) toggleSave(save);
  if (compare) toggleCompare(compare);
  if (schoolPrograms) setFilters({ school: schoolPrograms, view: 'programs', path: '', level: '' }, { clearQuery: true, scroll: true });
  if (schoolFaculty) setFilters({ school: schoolFaculty, view: 'faculty', path: '', level: '' }, { clearQuery: true, scroll: true });
});
$('selected-programs').addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const id = button.dataset.remove;
  toggleCompare(id);
  const cardButton = $('results').querySelector('[data-compare="' + id + '"]');
  (cardButton || $('selected-programs').querySelector('button') || $('query')).focus();
});
$('open-compare').addEventListener('click', showCompare);
$('share-compare').addEventListener('click', async () => {
  const url = currentUrl({ forSharing: true }).href;
  const status = $('share-status');
  try {
    await navigator.clipboard.writeText(url);
    status.textContent = 'Холбоосыг хууллаа.';
  } catch {
    status.textContent = url;
  }
  status.hidden = false;
});
document.querySelectorAll('[data-close]').forEach(button => {
  button.addEventListener('click', () => button.closest('dialog').close());
});
window.addEventListener('popstate', () => {
  state = readLocation();
  visibleCount = pageSize;
  $('query').value = '';
  if ($('comparison').open) $('comparison').close();
  if ($('detail').open) $('detail').close();
  syncFilters();
  render();
});

syncFilters();
render();
if (state.compare.length >= 2) showCompare();
