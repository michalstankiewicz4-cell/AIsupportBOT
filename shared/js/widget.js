// Chat widget UI shared by all three assistants.
// Rendered inside a Shadow DOM so the host website's CSS cannot break it
// (and our CSS cannot break the host website).
// All user and model text is inserted with textContent — never innerHTML.
import { respond } from './pipeline.js';
import { SITE } from './knowledge.js';

const ICON_CHAT =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4A.5.5 0 0 1 5 19v-3h-.5A.5.5 0 0 1 4 15.5z" fill="currentColor"/></svg>';
const ICON_CLOSE =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_SEND =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2.5-6.5z" fill="currentColor"/></svg>';

const GREETING = {
  text: 'Dzień dobry! Pomogę znaleźć właściwego specjalistę i zakładkę na stronie. Nie udzielam porad medycznych — o leczeniu decyduje zawsze lekarz. W czym mogę pomóc?',
  chips: ['Jakiego specjalisty potrzebuję?', 'Cennik', 'Jak umówić wizytę?', 'Kontakt'],
};

const DEGRADED_NOTE = {
  offline: 'Tryb offline — odpowiada asystent regułowy.',
  network: 'Brak połączenia z AI — odpowiada asystent regułowy.',
  error: 'AI chwilowo niedostępne — odpowiada asystent regułowy.',
  rate_limited: 'Zbyt wiele pytań naraz — odpowiada asystent regułowy.',
};

/**
 * Mount the widget on the page.
 * @param {object} opts
 * @param {object} opts.engine   engine with { name, label, version, ask() }
 * @param {string} opts.cssUrl   absolute URL of shared/css/widget.css
 * @param {string} [opts.title]
 * @param {string} [opts.accent] CSS color for the brand accent
 * @param {'left'|'right'} [opts.position]
 * @param {boolean} [opts.open]  open on load
 * @param {HTMLElement} [opts.container] mount inline in this element (demo page)
 */
export function mountWidget(opts) {
  const { engine } = opts;
  const storeKey = `lt-chat:${engine.name}`;
  const state = loadState(storeKey) || { open: !!opts.open, messages: [] };

  // --- DOM skeleton --------------------------------------------------------
  const host = document.createElement('div');
  host.className = 'lt-chat-host';
  const root = host.attachShadow({ mode: 'open' });
  const inline = Boolean(opts.container);

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = opts.cssUrl;
  root.appendChild(css);

  const wrap = el('div', `chat ${inline ? 'inline' : 'floating'} ${opts.position === 'left' ? 'left' : 'right'}`);
  if (opts.accent) wrap.style.setProperty('--accent', opts.accent);
  wrap.dataset.variant = engine.name;
  root.appendChild(wrap);

  const launcher = el('button', 'launcher');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Otwórz czat z asystentem');
  launcher.innerHTML = ICON_CHAT; // static SVG constant, safe

  const panel = el('section', 'panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', opts.title || 'Asystent pacjenta');

  const header = el('header', 'header');
  const titleBox = el('div', 'title');
  titleBox.append(el('strong', '', opts.title || 'Asystent pacjenta'), el('span', 'subtitle', engine.label));
  const badge = el('span', 'version', `${engine.name} v${engine.version}`);
  badge.title = 'Wersja asystenta';
  const closeBtn = el('button', 'close');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Zamknij czat');
  closeBtn.innerHTML = ICON_CLOSE;
  header.append(titleBox, badge);
  if (!inline) header.append(closeBtn);

  const notice = el('p', 'notice', 'Asystent nie udziela porad medycznych. W nagłym zagrożeniu życia dzwoń 112.');

  const log = el('div', 'log');
  log.setAttribute('aria-live', 'polite');

  const form = el('form', 'composer');
  const input = el('textarea', 'input');
  input.rows = 1;
  input.maxLength = 500;
  input.placeholder = 'Napisz pytanie…';
  input.setAttribute('aria-label', 'Twoje pytanie');
  const send = el('button', 'send');
  send.type = 'submit';
  send.setAttribute('aria-label', 'Wyślij');
  send.innerHTML = ICON_SEND;
  form.append(input, send);

  const foot = el('p', 'foot', 'Nie podawaj danych osobowych (PESEL, nazwisko). Infolinia: ');
  const tel = el('a', '', SITE.phone);
  tel.href = SITE.phoneHref;
  foot.append(tel);

  panel.append(header, notice, log, form, foot);
  wrap.append(panel);
  if (!inline) wrap.append(launcher);
  (opts.container || document.body).appendChild(host);

  // --- Rendering -----------------------------------------------------------
  function renderMessage(msg, animate = true) {
    const item = el('div', `msg ${msg.role}${msg.emergency ? ' emergency' : ''}${animate ? ' enter' : ''}`);
    const bubble = el('div', 'bubble');
    appendLinkified(bubble, msg.text);
    item.append(bubble);

    if (msg.links?.length) {
      const links = el('div', 'links');
      for (const l of msg.links) {
        const a = el('a', 'link', l.label);
        a.href = l.url;
        if (!l.url.startsWith('tel:')) {
          a.target = '_top'; // open the tab on the clinic site itself
        }
        links.append(a);
      }
      item.append(links);
    }
    if (msg.note) item.append(el('div', 'note', msg.note));
    log.append(item);

    if (msg.chips?.length) renderChips(msg.chips);
    log.scrollTop = log.scrollHeight;
  }

  function renderChips(chips) {
    log.querySelectorAll('.chips').forEach((c) => c.remove());
    const row = el('div', 'chips');
    for (const c of chips) {
      const b = el('button', 'chip', c);
      b.type = 'button';
      b.addEventListener('click', () => ask(c));
      row.append(b);
    }
    log.append(row);
  }

  function showTyping() {
    const t = el('div', 'msg bot typing');
    t.append(el('div', 'bubble', ''));
    t.firstChild.append(el('i'), el('i'), el('i'));
    log.append(t);
    log.scrollTop = log.scrollHeight;
    return () => t.remove();
  }

  // --- Behaviour -----------------------------------------------------------
  let busy = false;

  async function ask(text) {
    const message = text.trim();
    if (!message || busy) return;
    busy = true;
    send.disabled = true;
    log.querySelectorAll('.chips').forEach((c) => c.remove());

    const userMsg = { role: 'user', text: message };
    state.messages.push(userMsg);
    renderMessage(userMsg);

    const stopTyping = showTyping();
    const history = state.messages
      .filter((m) => m !== userMsg)
      .slice(-6)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));

    const started = Date.now();
    const reply = await respond(engine, message, history);
    // Short minimum delay so instant bot answers don't feel abrupt.
    await wait(Math.max(0, 350 - (Date.now() - started)));
    stopTyping();

    const botMsg = {
      role: 'bot',
      text: reply.text,
      links: reply.links,
      chips: reply.chips,
      emergency: reply.emergency,
      note: reply.degraded ? DEGRADED_NOTE[reply.degraded] : '',
    };
    state.messages.push(botMsg);
    state.messages = state.messages.slice(-40);
    renderMessage(botMsg);
    saveState(storeKey, state);

    busy = false;
    send.disabled = false;
    input.focus();
  }

  function setOpen(open) {
    state.open = open;
    wrap.classList.toggle('open', open);
    launcher.setAttribute('aria-expanded', String(open));
    saveState(storeKey, state);
    if (open) setTimeout(() => input.focus(), 50);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    autoGrow();
    ask(v);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  const autoGrow = () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  };
  input.addEventListener('input', autoGrow);
  launcher.addEventListener('click', () => setOpen(!state.open));
  closeBtn.addEventListener('click', () => setOpen(false));
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !inline) setOpen(false);
  });

  // Restore conversation (e.g. after the patient clicked a link to a tab).
  if (state.messages.length) {
    state.messages.forEach((m) => renderMessage(m, false));
  } else {
    renderMessage({ role: 'bot', ...GREETING }, false);
  }
  setOpen(inline ? true : state.open);

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    ask,
    reset() {
      state.messages = [];
      log.textContent = '';
      saveState(storeKey, state);
      renderMessage({ role: 'bot', ...GREETING }, false);
    },
    destroy: () => host.remove(),
  };
}

// --- helpers ---------------------------------------------------------------

function el(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Turn clinic URLs inside model text into links; everything else stays text.
function appendLinkified(parent, text) {
  const host = new URL(SITE.base).hostname;
  const parts = String(text || '').split(/(https?:\/\/[^\s)]+)/g);
  for (const part of parts) {
    let url = null;
    try {
      if (/^https?:\/\//.test(part) && new URL(part).hostname.endsWith(host)) url = part.replace(/[.,;]+$/, '');
    } catch { /* not a URL */ }
    if (url) {
      const a = el('a', 'inline-link', url.replace(/^https?:\/\/(www\.)?/, ''));
      a.href = url;
      a.target = '_top';
      parent.append(a);
    } else if (part) {
      parent.append(document.createTextNode(part));
    }
  }
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// sessionStorage can be blocked (privacy mode, iframes) — never let it crash.
function loadState(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key));
  } catch {
    return null;
  }
}
function saveState(key, state) {
  try {
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch { /* ignore */ }
}
