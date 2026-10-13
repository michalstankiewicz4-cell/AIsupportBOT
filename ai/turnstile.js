// Cloudflare Turnstile (niewidoczna captcha) dla asystenta "ai".
// Potwierdza Workerowi, że pyta prawdziwa przeglądarka, więc boty nie wyczerpią
// budżetu API. Tokeny są jednorazowe — pobieramy nowy, gdy Worker o niego
// poprosi; potem Worker wydaje nam token sesji.
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

// Zwraca świeży token Turnstile (ok. 1 s, zwykle niewidocznie dla pacjenta).
export async function getTurnstileToken(siteKey, timeoutMs = 15000) {
  await loadScript();

  if (widgetId === null) {
    // Renderowany w zwykłym DOM (nie w Shadow DOM czatu). W trybie
    // "interaction-only" jest niewidoczny, chyba że Cloudflare wymaga kliknięcia.
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
