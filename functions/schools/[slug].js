import { schoolFromPath } from '../../schools-data.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!schoolFromPath(url.pathname)) return new Response('Сургууль олдсонгүй.', { status: 404 });
  return env.ASSETS.fetch(new URL('/', url));
}
