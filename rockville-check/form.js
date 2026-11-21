// Rockville visibility check form. Posts to the same /api/visibility-check endpoint as the dental
// check, tagged source "rockville-hvac". If the endpoint is down, it offers a prefilled email instead.
const form = document.querySelector('#rc-form');
const button = document.querySelector('#rc-submit');
const status = document.querySelector('#rc-status');
const EMAIL = 'max@maxfisher.net';
let previousPayload = '';
let requestId = '';
button.disabled = false;

function mailtoLink(d) {
  const body = `Company link: ${d.practice}\nZIP: ${d.town}\nEmail: ${d.email}`;
  return `mailto:${EMAIL}?subject=${encodeURIComponent('Rockville visibility check request')}&body=${encodeURIComponent(body)}`;
}
function fallback(d, message) {
  status.textContent = `${message} `;
  const a = document.createElement('a');
  a.href = mailtoLink(d);
  a.textContent = 'Send it by email instead.';
  status.append(a);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (button.disabled) return;
  const data = Object.fromEntries(new FormData(form));
  for (const k of Object.keys(data)) data[k] = String(data[k]).trim();
  if (data.websiteConfirmation) return;
  if (!data.practice || !data.town || !data.email) { status.textContent = 'Fill in your company link, ZIP code and email.'; return; }
  if (!/^https?:\/\//i.test(data.practice)) data.practice = `https://${data.practice}`;
  if (!/^\d{5}$/.test(data.town)) { status.textContent = 'Enter a five-digit ZIP code, like 20850.'; return; }
  if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(data.email)) { status.textContent = 'Enter a valid email address.'; return; }
  data.source = 'rockville-hvac';
  const payload = JSON.stringify(data);
  if (payload !== previousPayload) { requestId = crypto.randomUUID(); previousPayload = payload; }
  button.disabled = true;
  status.textContent = 'Saving your request…';
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, requestId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok || result.requestId !== requestId) {
      fallback(data, result.error || 'Your request could not be confirmed.');
      return;
    }
    form.hidden = true;
    status.textContent = 'Request received. I’ll run your Rockville searches and email you to set up the two-minute call.';
  } catch {
    fallback(data, 'Your request could not be confirmed.');
  } finally {
    button.disabled = false;
  }
});
