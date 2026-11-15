export const schools = ["Бүх сургууль","МУИС","ШУТИС","АШУҮИС","МУБИС","СЭЗИС","ХААИС","Төмөр замын дээд сургууль","Монгол Улсын Консерватори","СУИС","ХИС","ОУУБИС","Отгонтэнгэр их сургууль","Их Засаг олон улсын их сургууль","Улаанбаатар Эрдэм их сургууль","Хүмүүнлэгийн ухааны их сургууль","Монголын Үндэсний Их Сургууль","Үндэсний Техникийн Их Сургууль","Этүгэн их сургууль","Ач Анагаах Ухааны Их Сургууль","Эм Зүйн Шинжлэх Ухааны Их Сургууль","Оточ Манрамба Их Сургууль","Монос их сургууль","Улаанбаатар их сургууль","Сити их сургууль","Рояаль олон улсын их сургууль","Глобал удирдагч их сургууль","Идэр их сургууль","Шихихутуг их сургууль","Санхүү эдийн засгийн их сургууль","Дотоод хэргийн их сургууль","Үндэсний батлан хамгаалахын их сургууль","Монгол-Германы хамтарсан ашигт малтмал, технологийн их сургууль","Хөдөлмөр, нийгмийн харилцааны дээд сургууль","Мандах их сургууль","Зохиомж дээд сургууль","Ховд их сургууль","Дорнод их сургууль","Орхон их сургууль","Эрдэнэт цогцолбор дээд сургууль","Дархан-Уул аймаг дахь АШУҮИС-ийн салбар сургууль"];

export const ALL_SCHOOLS = schools[0];

const schoolProgramIds = new Map([
  ['МУИС', 'num'],
  ['ШУТИС', 'must'],
  ['АШУҮИС', 'mnums'],
  ['МУБИС', 'msue'],
  ['ХААИС', 'muls'],
  ['Төмөр замын дээд сургууль', 'rum'],
  ['Монгол Улсын Консерватори', 'conserv'],
  ['СУИС', 'suis'],
  ['Дотоод хэргийн их сургууль', 'uia'],
  ['Үндэсний батлан хамгаалахын их сургууль', 'mndu'],
  ['Монгол-Германы хамтарсан ашигт малтмал, технологийн их сургууль', 'gmit'],
  ['Эрдэнэт цогцолбор дээд сургууль', 'eit'],
  ['Удирдлагын академи', 'naog'],
  ['Үндэсний тагнуулын их сургууль', 'intel'],
  ['ШУТИС-ийн харьяа Өмнөговь аймаг дахь Технологийн дээд сургууль', 'omno'],
  ['Монгол Улсын консерваторын харьяа Завхан аймаг дахь Хөгжим бүжгийн коллеж', 'zavcon'],
  ['Шинжлэх ухаан, технологийн их сургуулийн харьяа технологийн коллеж', 'koosen'],
]);

for (const name of schoolProgramIds.keys()) {
  if (!schools.includes(name)) schools.push(name);
}

const aliases = {
  'ШУТИС': ['must', 'Шинжлэх ухаан, технологийн их сургууль'],
  'МУИС': ['num', 'Монгол Улсын Их Сургууль'],
  'СЭЗИС': ['ufe', 'Санхүү эдийн засгийн их сургууль', 'Санхүү, эдийн засгийн их сургууль'],
  'АШУҮИС': ['mnums', 'Анагаахын шинжлэх ухааны үндэсний их сургууль'],
  'МУБИС': ['msue', 'Монгол улсын боловсролын их сургууль'],
  'ХААИС': ['muls', 'Хөдөө аж ахуйн их сургууль'],
};

export function searchText(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('mn-MN').trim().replace(/\s+/g, ' ');
}

export function canonicalSchool(value) {
  const text = searchText(value);
  if (!text) return '';
  for (const [school, names] of Object.entries(aliases)) {
    if ([school, ...names].some(name => searchText(name) === text)) return school;
  }
  return schools.slice(1).find(name => searchText(name) === text) || '';
}

export const directory = [...new Set(schools.slice(1).map(canonicalSchool))];

export function schoolValues(value) {
  const school = canonicalSchool(value);
  return school ? [school, ...(aliases[school] || []).slice(1)] : [];
}

export function schoolName(school) {
  return aliases[school]?.[1] || school;
}

export function schoolAbbreviation(value) {
  const school = canonicalSchool(value);
  if (!school || !school.includes(' ')) return school || value || '';
  return school.split(/\s+/).filter(word => word !== 'дахь').map(word => Array.from(word)[0]).join('').toUpperCase();
}

export function schoolUrl(school) {
  return '/schools/' + encodeURIComponent(aliases[school]?.[0] || searchText(school).replaceAll(' ', '-'));
}

export function schoolProgramPath(school) {
  const id = schoolProgramIds.get(canonicalSchool(school));
  return id ? '/study/?school=' + id + '#directory' : '';
}

export function schoolFromPath(path) {
  return directory.find(school => schoolUrl(school) === path.replace(/\/$/, '')) || '';
}

export function matchSchoolNames(query) {
  const text = searchText(query);
  return directory.filter(school => searchText([school, ...(aliases[school] || [])].join(' ')).includes(text));
}

export function searchTerms(value) {
  return [...new Set(searchText(value).slice(0, 120).split(' ').filter(Boolean))].slice(0, 10);
}

export function searchableListing(row) {
  return searchText([row.title, row.description, row.school, row.category].join(' '));
}
