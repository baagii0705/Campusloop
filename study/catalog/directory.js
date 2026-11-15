const ui = Object.fromEntries([
  'views', 'filters', 'query', 'school', 'level', 'school-filter', 'level-filter',
  'context', 'status', 'reset', 'results', 'more', 'retry', 'sources'
].map(name => [name, document.getElementById('catalog-' + name)]));

const pageSize = 24;
const activeLinks = [...ui.views.querySelectorAll('[data-view]')];
const placeholders = {
  schools: 'Сургуулийн нэр эсвэл товчлол',
  programs: 'Хөтөлбөрийн нэр эсвэл код',
  index: 'Мэргэжлийн нэр эсвэл индекс',
  courses: 'Хичээлийн нэр эсвэл код',
  curriculum: 'Хөтөлбөр эсвэл төлөвлөгөөний нэр',
  relations: 'Хичээл эсвэл төлөвлөгөөний нэр'
};
const descriptions = {
  schools: 'Боловсролын яамны жагсаалтад төрийн өмчийн гэж бүртгэгдсэн сургуулиуд.',
  programs: 'Өөр өөр оны каталог, элсэлтийн жагсаалт хамрагдсан. Одоогийн элсэлтийг сургуулийн албан ёсны холбоосоор шалгана уу.',
  index: 'А/146 тушаалын PDF-ээс хөрвүүлсэн лавлах. Нэр, код болон түвшнийг эх PDF-ээс тулгах боломжтой.',
  courses: 'МУИС-ийн 2023 оны намрын нээлттэй өгөгдөл.',
  curriculum: 'МУИС-ийн 2023 оны намрын өгөгдөлд багтсан сургалтын төлөвлөгөө.',
  relations: 'МУИС-ийн 2023 оны намрын өгөгдөлд багтсан хичээлийн залгамж холбоо.'
};
const indexLevels = ['Дэд бакалавр', 'Бакалавр', 'Магистр', 'Доктор'];
const formatNumber = new Intl.NumberFormat('mn-MN');
const datasets = new Map();
let state = getState();
let catalog;
let activeRows = null;
let matched = [];
let displayed = 0;
let loadVersion = 0;

function getState() {
  const params = new URLSearchParams(location.search);
  const view = params.get('view');
  return {
    view: Object.hasOwn(placeholders, view) ? view : 'schools',
    school: params.get('school') || '',
    level: params.get('level') || '',
    q: (params.get('q') || '').slice(0, 160),
    ref: params.get('ref') || ''
  };
}

function urlFor(next) {
  const query = new URLSearchParams({ view: next.view });
  for (const key of ['school', 'level', 'q', 'ref']) {
    if (next[key]) query.set(key, next[key]);
  }
  return '?' + query;
}

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function link(text, url, className = 'source') {
  const anchor = node('a', text, className);
  anchor.href = url;
  return anchor;
}

function source(text, url) {
  if (!/^https?:\/\//i.test(url || '')) return null;
  const anchor = link(text, url);
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  return anchor;
}

function addSources(target, links) {
  for (const [caption, url] of links) {
    const anchor = source(caption, url);
    if (anchor) target.append(anchor);
  }
}

async function loadData(name) {
  if (!datasets.has(name)) {
    const task = (async () => {
      const compressed = name !== 'schools';
      const url = new URL('./data/' + name + '.json' + (compressed ? '.gz' : ''), import.meta.url);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Catalog HTTP ' + response.status);
      if (!compressed) return response.json();
      const body = await response.arrayBuffer();
      const signature = new Uint8Array(body, 0, Math.min(2, body.byteLength));
      if (signature[0] !== 0x1f || signature[1] !== 0x8b) return JSON.parse(new TextDecoder().decode(body));
      return new Response(new Blob([body]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
    })();
    datasets.set(name, task);
    task.catch(() => datasets.delete(name));
  }
  return datasets.get(name);
}

function normalize(text) {
  return String(text).normalize('NFKC').toLocaleLowerCase('mn-MN').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function codeText(value) {
  return normalize(value || '').replaceAll(' ', '');
}

const views = {
  schools: { text: row => [row[1], row[2], row[9], ...(catalog.branches.get(row[0]) || []).flatMap(branch => branch.slice(2, 4))] },
  programs: { text: row => [row[1], ...row.slice(2, 8), row[11]], code: row => row.slice(5, 7), level: row => [row[3]] },
  index: { text: row => row.slice(0, 2), code: row => [row[0]], level: row => indexLevels.filter((_, i) => row[i + 2] === '+') },
  courses: { text: row => row.slice(1, 7), code: row => [row[1]], level: row => [row[6]], refs: row => [row[0]] },
  curriculum: { text: row => row.slice(2, 6), refs: row => [row[1]] },
  relations: { text: row => [row[1], row[2], row[3], row[5], row[7]], level: row => [row[3]], refs: row => [row[0]] }
};

function prepare(rows, view) {
  const spec = views[view];
  return rows.map(row => ({
    row,
    text: normalize(spec.text(row).join(' ')),
    codes: (spec.code?.(row) || []).filter(Boolean).map(codeText),
    levels: (spec.level?.(row) || []).filter(Boolean),
    refs: (spec.refs?.(row) || []).filter(Boolean)
  }));
}

function schoolOptions() {
  return catalog.schools.map(row => new Option(row[1], row[0]));
}

function syncControls() {
  const programView = state.view === 'programs';
  ui.query.value = state.q;
  ui.query.placeholder = placeholders[state.view];
  ui['school-filter'].hidden = !programView;
  ui.school.replaceChildren(new Option('Бүх сургууль', ''), ...schoolOptions());
  ui.school.value = state.school;
  if (!ui.school.value) state.school = '';

  const levels = state.view === 'index' ? indexLevels : [...new Set(activeRows.flatMap(item => item.levels))].sort(new Intl.Collator('mn-MN').compare);
  ui['level-filter'].hidden = levels.length === 0;
  ui.level.replaceChildren(new Option('Бүх түвшин', ''), ...levels.map(level => new Option(level, level)));
  ui.level.value = state.level;
  if (!ui.level.value) state.level = '';
}

function drawSources() {
  for (const [name, note, url] of catalog.notes) {
    const item = node('li', note + ' ');
    const anchor = source(name, url);
    if (anchor) item.append(anchor);
    ui.sources.append(item);
  }
}

function card(tag, title, meta) {
  const article = node('article', null, 'card catalog-card');
  const top = node('div', null, 'card-top');
  if (tag) top.append(node('span', tag, 'school-tag'));
  if (meta) top.append(node('span', meta, 'meta'));
  if (top.childElementCount) article.append(top);
  article.append(node('h2', title));
  return article;
}

function details(article, fields, branches) {
  const detail = node('details');
  const list = node('dl', null, 'details');
  detail.append(node('summary', 'Дэлгэрэнгүй'), list);
  for (const [name, value] of fields) {
    if (value == null || value === '') continue;
    const item = node('div');
    item.append(node('dt', name), node('dd', value));
    list.append(item);
  }
  if (branches?.length) {
    detail.append(node('p', 'Салбар сургуулиуд'));
    const branchList = node('ul');
    for (const [,, name, address, url] of branches) {
      const item = node('li', [name, address].filter(Boolean).join(' · ') + ' ');
      const anchor = source('Эх сурвалж', url);
      if (anchor) item.append(anchor);
      branchList.append(item);
    }
    detail.append(branchList);
  }
  if (list.childElementCount || branches?.length) article.append(detail);
}

function actions(article, sources, primaryLink) {
  const group = node('div', null, 'card-actions');
  if (primaryLink) group.append(primaryLink);
  addSources(group, sources);
  if (group.childElementCount) article.append(group);
}

function schoolCard(row) {
  const [id, short, name, ownership, parent, registration, license, issued, expires, address, site, admissions, programs, coded, note, url] = row;
  const article = card(short, name, ownership);
  article.append(node('p', programs ? formatNumber.format(programs) + ' хөтөлбөрийн бүртгэл' : 'Хөтөлбөрийн мэдээлэл баталгаажаагүй'));
  if (note) article.append(node('p', note));
  const parentName = catalog.schools.find(school => school[0] === parent)?.[2];
  details(article, [
    ['Хаяг', address], ['Харьяалах сургууль', parentName], ['Регистр', registration], ['Зөвшөөрлийн дугаар', license],
    ['Олгосон огноо', issued], ['Бүртгэлд заасан дуусах огноо', expires], ['Кодтой бүртгэл', programs ? coded : null]
  ], catalog.branches.get(id));
  const programLink = programs ? link('Хөтөлбөр үзэх →', urlFor({ view: 'programs', school: id })) : null;
  actions(article, [['Элсэлт', admissions], ['Сургуулийн сайт', site], ['Яамны бүртгэл', url]], programLink);
  return article;
}

function programCard(row) {
  const [, short, unit, level, name, code, index, english, credits, duration, mode, period, url, detail, note, id, indexUrl] = row;
  const article = card(short, name, level);
  const summary = [code && 'Сургуулийн код ' + code, index && 'Улсын индексийн лавлагаа ' + index, period].filter(Boolean);
  if (summary.length) article.append(node('p', summary.join(' · ')));
  details(article, [
    ['Сургууль, тэнхим', unit], ['Англи нэр', english], ['Багц цаг', credits],
    ['Хугацаа', duration], ['Сургалтын хэлбэр', mode], ['Эх сурвалжийн тайлбар', note], ['Эх өгөгдлийн ID', id]
  ]);
  const plans = catalog.programsWithPlans.has(id) ? link('МУИС-ийн төлөвлөгөө →', urlFor({ view: 'curriculum', ref: id })) : null;
  actions(article, [['Эх сурвалж', url], ['Албан мэдээлэл', detail !== url && detail], ['Индексийн эх PDF', indexUrl]], plans);
  return article;
}

function indexCard(row) {
  const [code, name, , , , , page, url] = row;
  const article = card(code, name, 'PDF-ийн ' + page + '-р хуудас');
  article.append(node('p', views.index.level(row).join(' · ')));
  actions(article, [['Тушаалын PDF', url]]);
  return article;
}

function courseCard([id, code, name, english, unit, department, level, credits, term, period, url]) {
  const article = card(code, name || english || 'Хичээл', level);
  article.append(node('p', [english, credits != null && credits + ' багц цаг'].filter(Boolean).join(' · ')));
  details(article, [['Салбар сургууль', unit], ['Тэнхим', department], ['Улирал', term], ['Өгөгдлийн үе', period], ['Хичээлийн ID', id]]);
  actions(article, [['МУИС-ийн нээлттэй өгөгдөл', url]]);
  return article;
}

function curriculumCard([id, programId, name, program, year, term, period, url]) {
  const article = card('МУИС', program || name || 'Сургалтын төлөвлөгөө', [year, term].filter(Boolean).join(' · '));
  if (name && name !== program) article.append(node('p', 'Төлөвлөгөө ' + name));
  details(article, [['Өгөгдлийн үе', period], ['Төлөвлөгөөний ID', id], ['Хөтөлбөрийн ID', programId]]);
  const relations = catalog.plansWithRelations.has(id) ? link('Залгамж хичээл →', urlFor({ view: 'relations', ref: id })) : null;
  actions(article, [['МУИС-ийн нээлттэй өгөгдөл', url]], relations);
  return article;
}

function relationCard([planId, plan, mode, level, id, name, nextId, next, group, period, url]) {
  const article = card('МУИС', [name, next].filter(Boolean).join(' → ') || 'Хичээлийн залгамж холбоо', level);
  if (plan) article.append(node('p', plan));
  details(article, [['Бүлэг', group], ['Сургалтын хэлбэр', mode], ['Өгөгдлийн үе', period], ['Төлөвлөгөөний ID', planId], ['Хичээлийн ID', id], ['Дараагийн хичээлийн ID', nextId]]);
  const courses = node('div', null, 'card-actions');
  if (id) courses.append(link('Эхний хичээл', urlFor({ view: 'courses', ref: id })));
  if (nextId) courses.append(link('Залгамж хичээл', urlFor({ view: 'courses', ref: nextId })));
  if (courses.childElementCount) article.append(courses);
  actions(article, [['МУИС-ийн нээлттэй өгөгдөл', url]]);
  return article;
}

const renderCard = { schools: schoolCard, programs: programCard, index: indexCard, courses: courseCard, curriculum: curriculumCard, relations: relationCard };

function showMore() {
  const batch = matched.slice(displayed, displayed + pageSize);
  ui.results.append(...batch.map(item => renderCard[state.view](item.row)));
  displayed += batch.length;
  ui.more.hidden = displayed >= matched.length;
  ui.status.textContent = matched.length
    ? formatNumber.format(matched.length) + ' бүртгэл · ' + formatNumber.format(displayed) + ' харагдаж байна'
    : 'Тохирох мэдээлэл олдсонгүй.';
}

function render() {
  if (!activeRows) return;
  const terms = normalize(state.q).split(' ').filter(Boolean).slice(0, 12);
  const code = terms.join('');
  matched = activeRows.filter(item =>
    (state.view !== 'programs' || !state.school || item.row[0] === state.school) &&
    (!state.level || item.levels.includes(state.level)) &&
    (!state.ref || item.refs.includes(state.ref)) &&
    (terms.every(term => item.text.includes(term)) || item.codes.some(value => value.includes(code)))
  );
  displayed = 0;
  ui.results.replaceChildren();
  ui.reset.hidden = !(state.school || state.level || state.q || state.ref);
  showMore();
}

async function loadView() {
  const version = ++loadVersion;
  activeRows = null;
  ui.results.replaceChildren();
  ui.more.hidden = true;
  ui.retry.hidden = true;
  ui.reset.hidden = true;
  ui['school-filter'].hidden = true;
  ui['level-filter'].hidden = true;
  ui.query.value = state.q;
  ui.query.placeholder = placeholders[state.view];
  ui.context.textContent = descriptions[state.view];
  ui.context.hidden = false;
  for (const item of activeLinks) {
    if (item.dataset.view === state.view) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  ui.status.textContent = 'Мэдээлэл ачаалж байна…';
  try {
    const [schools, rows] = await Promise.all([
      loadData('schools'),
      state.view === 'schools' ? Promise.resolve(null) : loadData(state.view)
    ]);
    if (version !== loadVersion) return;
    if (!catalog) {
      catalog = {
        ...schools,
        branches: new Map(),
        programsWithPlans: new Set(schools.programsWithPlans),
        plansWithRelations: new Set(schools.plansWithRelations)
      };
      for (const branch of schools.campuses) {
        const group = catalog.branches.get(branch[0]) || [];
        group.push(branch);
        catalog.branches.set(branch[0], group);
      }
      drawSources();
    }
    if (state.view === 'programs') {
      const priority = period => period === '2026–2027' ? 0 : period === '2026' ? 1 : period === '2023 намар' || period === 'Архив' ? 3 : 2;
      rows.sort((a, b) => priority(a[11]) - priority(b[11]));
    }
    activeRows = prepare(rows || schools.schools, state.view);
    syncControls();
    render();
  } catch {
    if (version !== loadVersion) return;
    ui.status.textContent = 'Мэдээллийг ачаалж чадсангүй.';
    ui.retry.hidden = false;
  }
}

function updateFilters() {
  state = {
    ...state,
    q: ui.query.value.trim().slice(0, 160),
    school: state.view === 'programs' && !ui['school-filter'].hidden ? ui.school.value : state.school,
    level: !ui['level-filter'].hidden ? ui.level.value : state.level
  };
  history.replaceState(null, '', urlFor(state));
  render();
}

ui.views.addEventListener('click', event => {
  const item = event.target.closest('[data-view]');
  if (!item || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (item.dataset.view === state.view) return;
  history.pushState(null, '', item.href);
  state = getState();
  loadView();
});
window.addEventListener('popstate', () => { state = getState(); loadView(); });
ui.filters.addEventListener('submit', event => { event.preventDefault(); updateFilters(); });
ui.query.addEventListener('input', updateFilters);
ui.school.addEventListener('change', updateFilters);
ui.level.addEventListener('change', updateFilters);
ui.reset.addEventListener('click', () => {
  state.ref = '';
  ui.query.value = '';
  ui.school.value = '';
  ui.level.value = '';
  updateFilters();
});
ui.more.addEventListener('click', () => {
  const firstNew = ui.results.childElementCount;
  showMore();
  const heading = ui.results.children[firstNew]?.querySelector('h2');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus();
  }
});
ui.retry.addEventListener('click', loadView);
loadView();
