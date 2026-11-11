import {binding} from '../../sponsor-api-utils.js';
import {DEAL_PUBLIC_FIELDS} from '../../student-deals.js';
import {offerPage, unavailablePage, SITE_ORIGIN} from '../../partner-pages.js';
import {qrSvg} from '../../offer-qr.js';

const headers = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'};
function html(content, status) {
  return new Response(content, {status, headers: {...headers, 'Content-Type': 'text/html; charset=utf-8'}});
}

export async function onRequestGet(context) {
  const id = context.params.id;
  if (!/^[a-zA-Z0-9_-]{1,70}$/.test(id)) return html(unavailablePage(404), 404);
  try {
    const now = new Date().toISOString();
    const deal = await binding(context).prepare(
      'SELECT ' + DEAL_PUBLIC_FIELDS.join(',') +
      ' FROM student_deals WHERE id=? AND active=1 AND start_at<=? AND end_at>?'
    ).bind(id, now, now).first();
    if (!deal) return html(unavailablePage(404), 404);
    const query = new URL(context.request.url).searchParams;
    if (query.get('format') === 'qr') {
      const qrHeaders = {...headers, 'Content-Type': 'image/svg+xml', 'X-Robots-Tag': 'noindex'};
      if (query.get('download') === '1') qrHeaders['Content-Disposition'] = 'attachment; filename="sol1o-' + id + '.svg"';
      return new Response(qrSvg(SITE_ORIGIN + '/deals/' + id), {headers: qrHeaders});
    }
    return html(offerPage(deal), 200);
  } catch {
    return html(unavailablePage(503), 503);
  }
}

export async function onRequestHead(context) {
  const response = await onRequestGet(context);
  return new Response(null, {status: response.status, headers: response.headers});
}
