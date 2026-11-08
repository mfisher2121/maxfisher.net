const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex',
};
const send = (status, body) => Response.json(body, { status, headers });
const unavailable = () => send(503, { ok: false, error: 'The form is temporarily unavailable. Please try again later.' });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.websiteConfirmation) return null;
  if (['requestId', 'practice', 'town', 'email'].some((key) => typeof input[key] !== 'string')) return null;
  const { requestId } = input;
  const practice = input.practice.trim();
  const town = input.town.trim();
  const email = input.email.trim().toLowerCase();
  if (!uuid.test(requestId) || !practice || practice.length > 500 || !town || town.length > 60 ||
      /[\x00-\x1f\x7f]/.test(town) || email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) return null;
  let url;
  try { url = new URL(practice); } catch { return null; }
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.') ||
      url.username || url.password || url.href.length > 500) return null;
  const source = ['youtube', 'homepage'].includes(input.source) ? input.source : 'direct';
  return { requestId, practice: url.href, town, email, source };
}

export async function POST(request) {
  const origin = process.env.VISIBILITY_SITE_ORIGIN || new URL(request.url).origin;
  if (request.headers.get('origin') !== origin) return send(403, { ok: false, error: 'Open the form from the visibility-check page.' });
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return send(415, { ok: false, error: 'Submit the form from the visibility-check page.' });
  if (Number(request.headers.get('content-length')) > 4096) return send(413, { ok: false, error: 'The request is too large.' });
  let input;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 4096) return send(413, { ok: false, error: 'The request is too large.' });
    input = normalizeRequest(JSON.parse(body));
  } catch {
    return send(400, { ok: false, error: 'Check the form and try again.' });
  }
  if (!input) return send(400, { ok: false, error: 'Enter a valid practice link, town or ZIP, and report email.' });
  const url = process.env.VISIBILITY_N8N_WEBHOOK_URL;
  const secret = process.env.VISIBILITY_N8N_WEBHOOK_SECRET;
  if (!url || !secret) return unavailable();
  try {
    if (new URL(url).protocol !== 'https:') return unavailable();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Visibility-Secret': secret },
      body: JSON.stringify(input),
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status !== 201) return unavailable();
    const receipt = await response.json();
    if (receipt.ok !== true || receipt.requestId !== input.requestId) return unavailable();
    return send(201, { ok: true, requestId: input.requestId });
  } catch {
    return unavailable();
  }
}
