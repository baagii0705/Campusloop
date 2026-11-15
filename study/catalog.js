const mustRules = 'https://elselt.edu.mn/media/uploads/2026/04/20/2026-2027-elselt-juram-20260410a123.pdf';
const numRules = 'https://www.num.edu.mn/wp-content/uploads/2026/06/NUM2121-2026-2027-Бакалаврын-намрын-элсэлтийн-журам.pdf';
const ufeRules = 'https://admission.ufe.edu.mn/docs/elseltiin-juram.pdf';

export const admissionYear = '2026–2027';

export const schools = {
  must: { short: 'ШУТИС', name: 'Шинжлэх ухаан, технологийн их сургууль', admission: 'https://elselt.edu.mn/', rules: mustRules },
  num: { short: 'МУИС', name: 'Монгол Улсын Их Сургууль', admission: 'https://elselt.num.edu.mn/', rules: numRules },
  ufe: { short: 'СЭЗИС', name: 'Санхүү, эдийн засгийн их сургууль', admission: 'https://admission.ufe.edu.mn/mn', rules: ufeRules },
};

export const paths = {
  software: { icon: 'code', label: 'Апп, систем бүтээх', category: 'Технологи' },
  data: { icon: 'data', label: 'Өгөгдөл, AI-тай ажиллах', category: 'Өгөгдөл, AI' },
  engineering: { icon: 'build', label: 'Барилга, төхөөрөмж зохион бүтээх', category: 'Инженерчлэл' },
  finance: { icon: 'finance', label: 'Санхүү, бизнес судлах', category: 'Бизнес, санхүү' },
  people: { icon: 'people', label: 'Хүний зан үйл судлах', category: 'Нийгмийн ухаан' },
};

const mustComputing = 'МХТС · Компьютерын ухааны тэнхим';
const numComputing = 'МТЭС · Мэдээлэл, компьютерын ухааны тэнхим';
const ufeSystems = 'Мэдээллийн системийн менежментийн тэнхим';
const mathPhysics = 'Математик эсвэл Физик';
const socialEnglish = 'Нийгэм судлал эсвэл Англи хэл';
const mustTech = { subjects: mathPhysics + ' / ' + socialEnglish, threshold: 'Суурь 490 · Дагалдах 450' };
const numThreshold = 'Суурь 490 · Дагалдах 490';
const numTech = { subjects: mathPhysics + ' / Нийгэм судлал, Англи хэл, Математик, Физикээс нэг', threshold: numThreshold };
const ufeMathEnglish = { subjects: 'Математик болон Англи хэл', threshold: '580' };

export const programs = [
  {
    id: 'must-software', school: 'must', path: 'software', name: 'Программ хангамжийн инженерчлэл', years: 4,
    ...mustTech, department: mustComputing,
    topics: 'Программчлал, системийн зохиомж, программын чанар',
    roles: 'Программ хөгжүүлэгч, программын чанарын инженер',
  },
  {
    id: 'num-software', school: 'num', path: 'software', name: 'Программ хангамж', years: 4,
    ...numTech, department: numComputing, curriculum: 'https://site.num.edu.mn/storage/curriculum/SE2025-cur.pdf',
    topics: 'Программчлал, өгөгдлийн бүтэц, программын хөгжүүлэлт',
    roles: 'Веб хөгжүүлэгч, программ хангамжийн инженер',
  },
  {
    id: 'ufe-systems', school: 'ufe', path: 'software', name: 'Мэдээллийн систем + AI', years: 3,
    ...ufeMathEnglish, department: ufeSystems,
    topics: 'Байгууллагын мэдээллийн систем, өгөгдөл, AI ашиглалт',
    roles: 'Бизнес шинжээч, мэдээллийн системийн мэргэжилтэн',
  },
  {
    id: 'must-computing', school: 'must', path: 'software', name: 'Компьютерын ухаан', years: 4,
    ...mustTech, department: mustComputing,
    topics: 'Алгоритм, өгөгдлийн бүтэц, компьютерын систем',
    roles: 'Программ хөгжүүлэгч, системийн шинжээч',
  },
  {
    id: 'num-computing', school: 'num', path: 'software', name: 'Компьютерын ухаан', years: 4,
    ...numTech, department: numComputing, curriculum: 'https://site.num.edu.mn/storage/curriculum/ics-doc/cs-cur.pdf',
    topics: 'Алгоритм, тооцоолол, программчлал',
    roles: 'Программ хөгжүүлэгч, тооцооллын судлаач',
  },
  {
    id: 'num-systems', school: 'num', path: 'software', name: 'Мэдээллийн систем', years: 4,
    ...numTech, department: numComputing, curriculum: 'https://site.num.edu.mn/information-system',
    topics: 'Өгөгдлийн сан, системийн архитектур, мэдээллийн аюулгүй байдал',
    roles: 'Мэдээллийн системийн инженер, системийн шинжээч',
  },
  {
    id: 'must-ai', school: 'must', path: 'data', name: 'Хиймэл оюун', years: 4,
    ...mustTech, department: mustComputing,
    topics: 'Машин сургалт, өгөгдөл боловсруулах, AI загвар',
    roles: 'Машин сургалтын инженер, өгөгдлийн шинжээч',
  },
  {
    id: 'num-ai', school: 'num', path: 'data', name: 'Хиймэл оюун', years: null,
    ...numTech, subjects: mathPhysics + ' / ' + socialEnglish, department: numComputing,
    topics: 'Машин сургалт, хиймэл оюуны арга, программчлал',
    roles: 'AI инженер, өгөгдлийн шинжээч',
  },
  {
    id: 'must-data', school: 'must', path: 'data', name: 'Өгөгдлийн ухаан', years: 4,
    ...mustTech,
    topics: 'Статистик, өгөгдлийн шинжилгээ, таамаглах загвар',
    roles: 'Өгөгдлийн шинжээч, өгөгдлийн инженер',
  },
  {
    id: 'must-civil', school: 'must', path: 'engineering', name: 'Барилгын инженерчлэл', years: 4,
    ...mustTech, threshold: 'Суурь 490 · Дагалдах 490', department: 'Барилга, архитектурын сургууль',
    topics: 'Барилгын бүтээц, материал, инженерийн тооцоо',
    roles: 'Барилгын инженер, бүтээцийн зураг төслийн инженер',
  },
  {
    id: 'must-electronics', school: 'must', path: 'engineering', name: 'Электроникийн инженерчлэл', years: 4,
    ...mustTech, department: 'Мэдээлэл, холбооны технологийн сургууль',
    topics: 'Цахилгаан хэлхээ, электроник төхөөрөмж, микроконтроллер',
    roles: 'Электроникийн инженер, төхөөрөмжийн хөгжүүлэгч',
  },
  {
    id: 'ufe-accounting', school: 'ufe', path: 'finance', name: 'Нягтлан бодох бүртгэл', years: 3,
    ...ufeMathEnglish, department: 'Нягтлан бодох бүртгэлийн тэнхим',
    topics: 'Санхүүгийн тайлан, нягтлан бодох бүртгэл, аудит',
    roles: 'Нягтлан бодогч, аудитын туслах',
  },
  {
    id: 'ufe-marketing', school: 'ufe', path: 'finance', name: 'Маркетинг + AI', years: 3,
    ...ufeMathEnglish,
    topics: 'Хэрэглэгчийн судалгаа, брэнд, дижитал маркетинг',
    roles: 'Маркетингийн мэргэжилтэн, зах зээлийн шинжээч',
  },
  {
    id: 'ufe-finance', school: 'ufe', path: 'finance', name: 'Санхүү, банк', years: 3,
    subjects: 'Математик болон Англи хэл', threshold: '620',
    topics: 'Хөрөнгө оруулалт, банкны үйл ажиллагаа, санхүүгийн шинжилгээ',
    roles: 'Санхүүгийн шинжээч, зээлийн мэргэжилтэн',
  },
  {
    id: 'num-economics', school: 'num', path: 'finance', name: 'Эдийн засаг', years: null,
    subjects: 'Математик / Нийгэм судлал', threshold: numThreshold,
    topics: 'Зах зээл, эдийн засгийн бодлого, тоон шинжилгээ',
    roles: 'Эдийн засагч, бодлогын шинжээч',
  },
  {
    id: 'num-psychology', school: 'num', path: 'people', name: 'Сэтгэл судлал', years: null,
    subjects: 'Нийгэм судлал эсвэл Математик / Монгол хэл, Англи хэл, Нийгэм судлал, Математикаас нэг', threshold: numThreshold,
    topics: 'Хүний зан үйл, сэтгэцийн үйл явц, судалгааны арга',
    roles: 'Зан үйлийн судлаач, хүний нөөцийн мэргэжилтэн',
  },
  {
    id: 'must-psychology', school: 'must', path: 'people', name: 'Сэтгэл судлал', years: 4,
    subjects: 'Нийгэм судлал эсвэл Математик / Монгол хэл эсвэл Англи хэл', threshold: 'Суурь 490 · Дагалдах 490', department: 'Нийгэм, хүмүүнлэгийн сургууль',
    topics: 'Хүний хөгжил, сэтгэл зүйн судалгаа, харилцаа',
    roles: 'Зан үйлийн судлаач, хүний нөөцийн мэргэжилтэн',
  },
];

export const faculty = [
  {
    school: 'must', department: mustComputing, name: 'А.Хүдэр', role: 'Доктор, дэд профессор',
    focus: 'Хэл боловсруулалт, машин сургалт, өгөгдлийн бүтэц ба алгоритм',
    source: 'https://www.sict.edu.mn/mn/teachers/akhuder',
  },
  {
    school: 'must', department: mustComputing, name: 'Г.Ганчимэг', role: 'Профессор',
    source: 'https://www.sict.edu.mn/en/governance/departments/computer-science/teachers',
  },
  {
    school: 'must', department: mustComputing, name: 'Д.Золзаяа', role: 'Профессор',
    source: 'https://www.sict.edu.mn/en/governance/departments/computer-science/teachers',
  },
  {
    school: 'num', department: numComputing, name: 'Б.Батням', role: 'Ахлах багш, доктор',
    focus: 'Программ хангамжийн согогийг таамаглах судалгаа',
    source: 'https://site.num.edu.mn/dep/ics/news',
  },
  {
    school: 'num', department: numComputing, name: 'Ц.Алтангэрэл', role: 'Дэд профессор',
    source: 'https://site.num.edu.mn/storage/curriculum/ics-doc/cs-cur.pdf',
  },
  {
    school: 'ufe', department: ufeSystems, name: 'Д.Анхтуяа', role: 'Дэд профессор',
    focus: 'Мэдээллийн системийн үндэс, боловсрол судлал',
    source: 'https://ufe.edu.mn/employee/18',
  },
  {
    school: 'ufe', department: ufeSystems, name: 'Н.Саранчимэг', role: 'Тэнхимийн эрхлэгч',
    source: 'https://www.ufe.edu.mn/widgetDetail/1956',
  },
  {
    school: 'ufe', department: 'Нягтлан бодох бүртгэлийн тэнхим', name: 'Ц.Пүрэвтуяа', role: 'Профессор, доктор',
    focus: 'Нягтлан бодох бүртгэл, татвар, аудит',
    source: 'https://www.ufe.edu.mn/employee/41',
  },
];
