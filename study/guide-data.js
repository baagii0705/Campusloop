import { schools as curatedSchools, programs as curatedPrograms } from './catalog.js';

async function read(name) {
  const response = await fetch(new URL('./catalog/data/' + name, import.meta.url));
  if (!response.ok) throw new Error('Study data HTTP ' + response.status);
  if (name.endsWith('.json')) return response.json();
  const bytes = await response.arrayBuffer();
  const signature = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
  if (signature[0] !== 0x1f || signature[1] !== 0x8b) return JSON.parse(new TextDecoder().decode(bytes));
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
}

// Use source content so shared links survive reordering and insertion of records.
function recordId(row, used) {
  let hash = 14695981039346656037n;
  for (const character of JSON.stringify(row)) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(character.codePointAt(0))) * 1099511628211n);
  }
  const key = 'catalog-' + hash.toString(36);
  const occurrence = used.get(key) || 0;
  used.set(key, occurrence + 1);
  return occurrence ? key + '-' + occurrence : key;
}

function priority(period) {
  if (period === '2026–2027' || period === '2026') return 0;
  if (period === '2023 намар' || period === 'Архив') return 2;
  return 1;
}

export function mergeStudyData(directory, records) {
  const schools = { ...curatedSchools };
  const plans = new Set(directory.programsWithPlans);
  const branches = new Map();
  for (const [id, , name, address, source] of directory.campuses) {
    if (!branches.has(id)) branches.set(id, []);
    branches.get(id).push({ name, address, source });
  }
  for (const [id, short, name, ownership, parent, registration, license, issued, expires, address, site, admission, , , note, source] of directory.schools) {
    schools[id] = {
      short, name, ownership, parent, registration, license, issued, expires, address, site, note, source,
      admission: admission || curatedSchools[id]?.admission,
      rules: curatedSchools[id]?.rules,
      branches: branches.get(id) || []
    };
  }
  const ids = new Map();
  const catalog = records.map(row => {
    const [school, , department, level, name, code, index, english, credits, duration, mode, period, source, officialDetail, note, sourceId, indexSource] = row;
    return {
      id: recordId(row, ids), school, department, level, name, code, index, english, credits, duration,
      mode, period, source, officialDetail, note, indexSource,
      planUrl: plans.has(sourceId) ? '/study/catalog/?view=curriculum&ref=' + encodeURIComponent(sourceId) : ''
    };
  }).sort((a, b) => priority(a.period) - priority(b.period));
  return { schools, programs: [...curatedPrograms, ...catalog] };
}

export async function loadStudyData() {
  const [directory, records] = await Promise.all([read('schools.json'), read('programs.json.gz')]);
  return mergeStudyData(directory, records);
}
