import {safeURL} from './sponsor-api-utils.js';

export const SITE_ORIGIN = 'https://sol1o.me';
const assets = '/partner-assets';
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[ch]);

const dateFormatter = new Intl.DateTimeFormat('mn-MN', {
  timeZone: 'Asia/Ulaanbaatar', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
const date = value => dateFormatter.format(new Date(value));

function layout({title, description, path, content, unavailable = false, share = false}) {
  const url = SITE_ORIGIN + path;
  return `<!doctype html>
<html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title><meta name="description" content="${escape(description)}">
${unavailable ? '<meta name="robots" content="noindex">' : `
<link rel="canonical" href="${escape(url)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Sol1o">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(url)}"><meta property="og:image" content="${SITE_ORIGIN}${assets}/social.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Sol1o · Оюутны хөнгөлөлт"><meta name="twitter:card" content="summary_large_image">`}
<meta name="theme-color" content="#faf8f3"><link rel="icon" href="/solio-icon.svg">
<link rel="stylesheet" href="${assets}/offers.css">${share ? `<script defer src="${assets}/share.js"></script>` : ''}</head>
<body><header class="mast"><a class="brand" href="/" aria-label="Sol1o нүүр хуудас">sol<span>1</span>o<span>.</span></a>
<nav aria-label="Үндсэн цэс"><a href="/#deals">Хөнгөлөлтүүд</a><a href="/">Зарууд</a></nav></header>
<main>${content}</main><footer><a href="/">sol1o.me</a><a href="/partners">Байгууллагад</a></footer></body></html>`;
}

export function partnerLanding() {
  return layout({
    title: 'Оюутанд хөнгөлөлт санал болгох · Sol1o', path: '/partners',
    description: 'Оюутанд зориулсан хөнгөлөлтөө Sol1o-д нийтлүүлээрэй. Санал бүр сошиалд хуваалцах холбоос, лангуун дээр тавих QR кодтой.',
    content: `<section class="partner-hero"><div class="intro">
<p class="eyebrow">Байгууллагад</p><h1>Оюутнуудад<br>өөрийгөө таниул.</h1>
<p class="lead">Танай байгууллага хоёр аргаар оролцоно: оюутанд хөнгөлөлт санал болгох эсвэл нүүр хуудсанд төлбөртэй сурталчилгаа байрлуулах. Аль нь тохирохоо сонгоорой.</p>
<div class="actions"><a class="button primary" href="/#deals/apply">Хөнгөлөлт санал болгох</a><a class="button secondary" href="/?sponsor=1&amp;placement=feed">Баннерын үнэ, захиалга</a></div></div>
<aside class="counter" aria-label="Оюутны хөнгөлөлтүүдийг нээх QR код"><div class="counter-card">
<div class="counter-top"><span class="brand small">sol<span>1</span>o<span>.</span></span><span>sol1o.me</span></div>
<h2>Оюутны<br>хөнгөлөлт</h2><div class="counter-foot"><p>Утсаараа уншуулаад<br>саналуудыг үзээрэй.</p><a href="/#deals"><img width="112" height="112" src="/partner-assets/deals-qr.svg" alt="Оюутны хөнгөлөлтүүдийг нээх"></a></div>
</div></aside></section>
<section class="details-row"><div><h2>Нэг санал, нэг холбоос</h2>
<p>Байршил, хугацаа, хэнд үйлчлэхээ бичнэ. Санал батлагдаж, хугацаа нь эхлэхэд оюутан холбоосоор орж нөхцөл, кодыг бүртгэлгүй үзнэ.</p></div>
<div><h2>Сошиалд ч, лангуун дээр ч</h2><p>Саналынхаа холбоосыг Facebook групп, Instagram story-д хуваалцаарай. Саналаа QR кодтой нь хэвлээд кассын дэргэд тавьж болно.</p></div></section>
<section class="paid"><div><h2>1. Оюутны хөнгөлөлт</h2><p>Байгууллагын нэр, саналын нөхцөл, хугацаагаа оруулна. Админ баталсны дараа санал нэг холбоос, QR кодтой нийтлэгдэнэ.</p></div><div><h2>2. Төлбөртэй сурталчилгаа</h2><p>Зарын дунд, утасны доод хэсэг эсвэл хоёр байрлалд 7, 30 хоногийн багцаас сонгоно. Үнийг илгээхээс өмнө харуулна. Төлбөрийг хүсэлт батлагдсаны дараа тохиролцоно.</p></div>
<a href="/?sponsor=1&amp;placement=feed">Баннерын багц сонгох</a></section>`
  });
}

export function offerPage(deal) {
  const path = '/deals/' + encodeURIComponent(deal.id);
  const title = deal.title + ' · ' + deal.company;
  const target = safeURL(deal.target_url, true);
  const school = deal.school || 'Бүх сургуулийн оюутанд';
  const term = (label, value) => `<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`;
  return layout({
    title: title + ' | Sol1o', path, share: true,
    description: [deal.benefit, school, deal.conditions].join(' · ').slice(0, 240),
    content: `<article class="offer"><div class="offer-copy"><p class="eyebrow">${escape(deal.company)} · ${escape(deal.category)}</p>
<h1>${escape(deal.title)}</h1><p class="benefit">${escape(deal.benefit)}</p>
<h2>Ашиглах нөхцөл</h2><p class="terms">${escape(deal.conditions)}</p>
<dl>${term('Хэнд', school)}${deal.location ? term('Байршил', deal.location) : ''}
${term('Дуусах хугацаа', date(deal.end_at) + ' (УБ)')}</dl>
${deal.code ? `<div class="code"><span>Хөнгөлөлтийн код</span><strong id="offer-code">${escape(deal.code)}</strong><button type="button" data-action="code" hidden>Код хуулах</button></div>` : ''}
<div class="actions">${target ? `<a class="button primary" href="${escape(target)}" target="_blank" rel="noopener noreferrer sponsored">Байгууллагын хуудас</a>` : ''}
<button class="button secondary" type="button" data-action="share" hidden>Хуваалцах</button></div>
<p class="feedback" id="share-feedback" role="status"></p><input id="manual-copy" aria-label="Хуулах текст" readonly hidden></div>
<aside class="offer-qr"><h2>Утсаараа нээх</h2><img width="168" height="168" src="${path}?format=qr" alt="Энэ саналын QR код">
<p class="qr-domain">sol1o.me</p><div class="qr-actions"><a href="${path}?format=qr&amp;download=1" download>QR татах</a><button type="button" data-action="print" hidden>Хэвлэх</button></div></aside></article>
<section class="student-next"><div><h2>Sol1o дээр өөр юу байна?</h2><p>Бусад хөнгөлөлт, оюутнуудын зарыг үзээрэй. Бүртгүүлбэл өөрөө зар оруулж болно.</p></div>
<div><a href="/#deals">Хөнгөлөлтүүд →</a><a href="/">Зарууд →</a><a href="/#register">Бүртгүүлэх →</a></div></section>`
  });
}

export function unavailablePage(status) {
  const title = status === 503 ? 'Саналыг түр ачаалж чадсангүй' : 'Энэ санал одоогоор нээлтгүй байна';
  const description = status === 503 ? 'Хэсэг хугацааны дараа дахин нээгээрэй.' : 'Одоо ашиглаж болох хөнгөлөлтүүдийг доороос үзээрэй.';
  return layout({title, description, path: '/', unavailable: true, content:
    `<section class="unavailable"><p class="eyebrow">Оюутны хөнгөлөлт</p><h1>${title}</h1><p class="lead">${description}</p><a class="button primary" href="/#deals">Хөнгөлөлтүүд үзэх →</a></section>`
  });
}
