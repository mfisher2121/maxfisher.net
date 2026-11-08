const form = document.querySelector('#visibility-form');
const button = document.querySelector('#submit-check');
const status = document.querySelector('#form-status');
const sources = new Set(['youtube', 'homepage']);
let previousPayload = '';
let requestId = '';
button.disabled = false;

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (button.disabled) return;
  const data = Object.fromEntries(new FormData(form));
  const source = new URLSearchParams(window.location.search).get('src');
  data.source = sources.has(source) ? source : 'direct';
  const payload = JSON.stringify(data);
  if (payload !== previousPayload) {
    requestId = crypto.randomUUID();
    previousPayload = payload;
  }
  button.disabled = true;
  status.textContent = 'Saving your request…';
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, requestId }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok || result.requestId !== requestId) {
      status.textContent = result.error || 'Your request could not be confirmed. Please try again.';
      return;
    }
    form.hidden = true;
    status.textContent = 'Request received. I’ll review your office’s search results and send your check to the email you provided.';
  } catch {
    status.textContent = 'Your request could not be confirmed. Please try again.';
  } finally {
    button.disabled = false;
  }
});
