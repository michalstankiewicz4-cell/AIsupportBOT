// Cloudflare Turnstile (invisible CAPTCHA) for the "ai" assistant.
// Proves to our Worker that a real browser is asking, so bots cannot burn
// the API budget. Tokens are single-use, so we fetch a fresh one when the
// Worker asks for it; afterwards the Worker gives us a session token.
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise = null;
let widgetId = null;
let container = null;
let pending = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_URL;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Turnstile script failed to load'));
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

// Returns a fresh Turnstile token (resolves in ~1 s, usually invisibly).
export async function getTurnstileToken(siteKey, timeoutMs = 15000) {
  await loadScript();

  if (widgetId === null) {
    // Rendered in the normal DOM (not the chat's Shadow DOM). With
    // "interaction-only" it stays invisible unless Cloudflare needs a click.
    container = document.createElement('div');
    container.style.cssText = 'position:fixed;bottom:90px;right:20px;z-index:2147483001;';
    document.body.appendChild(container);
    widgetId = window.turnstile.render(container, {
      sitekey: siteKey,
      appearance: 'interaction-only',
      execution: 'execute',
      callback: (token) => pending?.resolve(token),
      'error-callback': () => pending?.reject(new Error('Turnstile error')),
      'expired-callback': () => pending?.reject(new Error('Turnstile expired')),
    });
  } else {
    window.turnstile.reset(widgetId);
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Turnstile timeout')), timeoutMs);
    pending = {
      resolve: (t) => { clearTimeout(timer); pending = null; resolve(t); },
      reject: (e) => { clearTimeout(timer); pending = null; reject(e); },
    };
    window.turnstile.execute(widgetId);
  });
}
