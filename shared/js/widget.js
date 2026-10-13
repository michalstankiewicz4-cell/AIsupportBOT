// Interfejs widżetu czatu, wspólny dla trzech asystentów.
// Dwa ekrany: (1) podanie imienia, (2) rozmowa z "wirtualnym konsultantem".
// Renderowany w Shadow DOM, żeby CSS strony go nie psuł
// (a nasz CSS nie psuł strony).
// Cały tekst pacjenta i modelu wstawiamy przez textContent — nigdy innerHTML.
import { respond } from './pipeline.js';
import { SITE } from './knowledge.js';

// Ikony — stałe SVG (bezpieczne do wstawienia przez innerHTML).
const ICON_BUBBLE =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5c4.4 0 7.5 2.9 7.5 6.6s-3.1 6.6-7.5 6.6c-.9 0-1.8-.1-2.6-.4L5.6 19l1-3.3C5.4 14.5 4.5 12.9 4.5 11.1 4.5 7.4 7.6 4.5 12 4.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const ICON_CLOSE =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_SEND =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const BOT_LABEL = 'Konsultant';
const CHIPS = ['Jakiego specjalisty potrzebuję?', 'Cennik', 'Jak umówić wizytę?', 'Kontakt'];
const NAME_MAX = 40;

const greetingFor = (name) => ({
  role: 'bot',
  greeting: true, // nie wysyłamy do AI — imię zostaje w przeglądarce
  text: `Dzień dobry, ${name}! Jestem wirtualnym konsultantem. W czym mogę pomóc?`,
  chips: CHIPS,
});

const DEGRADED_NOTE = {
  offline: 'Tryb offline — odpowiada asystent regułowy.',
  network: 'Brak połączenia z AI — odpowiada asystent regułowy.',
  error: 'AI chwilowo niedostępne — odpowiada asystent regułowy.',
  rate_limited: 'Zbyt wiele pytań naraz — odpowiada asystent regułowy.',
};

/**
 * Montuje widżet na stronie.
 * @param {object} opts
 * @param {object} opts.engine   silnik z { name, label, version, ask() }
 * @param {string} opts.cssUrl   pełny adres shared/css/widget.css
 * @param {string} [opts.title]  nazwa w nagłówku (domyślnie „Lekarze i Terapeuci”)
 * @param {string} [opts.accent] kolor przewodni (CSS) — przyciski i dymki pacjenta
 * @param {'left'|'right'} [opts.position]
 * @param {boolean} [opts.open]  otwarty od razu po załadowaniu
 * @param {HTMLElement} [opts.container] osadź w tym elemencie (strona demo)
 */
export function mountWidget(opts) {
  const { engine } = opts;
  const title = opts.title || 'Lekarze i Terapeuci';
  const storeKey = `lt-chat:${engine.name}`;
  const state = loadState(storeKey) || { open: !!opts.open, name: '', startedAt: 0, messages: [] };

  // --- Szkielet DOM ---------------------------------------------------------
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
  wrap.dataset.version = engine.version;
  root.appendChild(wrap);

  const launcher = el('button', 'launcher');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Otwórz czat z konsultantem');
  launcher.innerHTML = ICON_BUBBLE;

  const panel = el('section', 'panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', `${title} — wirtualny konsultant`);

  const closeBtn = el('button', 'close');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Zamknij czat');
  closeBtn.innerHTML = ICON_CLOSE;

  // --- Ekran 1: imię ---------------------------------------------------------
  const intro = el('div', 'intro');
  const brand = el('div', 'brand');
  const logo = el('div', 'logo');
  logo.innerHTML = ICON_BUBBLE;
  brand.append(logo, el('span', 'brand-name', title));
  const introTop = el('div', 'intro-top');
  introTop.append(brand);
  if (!inline) introTop.append(closeBtn.cloneNode(true));

  const nameForm = el('form', 'intro-form');
  const h = el('h2', 'intro-title', 'Dzień dobry! Proszę podać swoje imię.');
  const lead = el('p', 'intro-lead', 'Proszę wpisać imię, aby rozpocząć rozmowę z konsultantem.');
  const nameId = `lt-name-${engine.name}`;
  const label = el('label', 'intro-label', 'Imię');
  label.htmlFor = nameId;
  const nameInput = el('input', 'intro-input');
  nameInput.id = nameId;
  nameInput.type = 'text';
  nameInput.autocomplete = 'given-name';
  nameInput.maxLength = NAME_MAX;
  nameInput.required = true;
  const start = el('button', 'primary', 'Rozpocznij rozmowę');
  start.type = 'submit';
  const hint = el('p', 'intro-hint', 'Twoje imię będzie widoczne w historii rozmowy.');
  nameForm.append(h, lead, label, nameInput, start, hint);
  // Logo kliniki w wolnym miejscu między nagłówkiem a formularzem.
  const introLogo = el('div', 'intro-logo');
  const logoImg = el('img');
  logoImg.src = new URL('../img/logo.png', import.meta.url).href;
  logoImg.alt = title;
  logoImg.decoding = 'async';
  introLogo.append(logoImg);
  intro.append(introTop, introLogo, nameForm);

  // --- Ekran 2: rozmowa ------------------------------------------------------
  const chatView = el('div', 'chat-view');
  const header = el('header', 'header');
  const avatar = el('div', 'avatar');
  avatar.innerHTML = ICON_BUBBLE;
  avatar.append(el('span', 'status-dot'));
  const titleBox = el('div', 'title');
  titleBox.append(el('strong', '', title), el('span', 'subtitle', 'Wirtualny konsultant · online'));
  header.title = `${engine.label} · ${engine.name} v${engine.version}`;
  header.append(avatar, titleBox);
  if (!inline) header.append(closeBtn);

  const log = el('div', 'log');
  log.setAttribute('aria-live', 'polite');

  const form = el('form', 'composer');
  const input = el('textarea', 'input');
  input.rows = 1;
  input.maxLength = 500;
  input.placeholder = 'Napisz wiadomość…';
  input.setAttribute('aria-label', 'Twoja wiadomość');
  const send = el('button', 'send');
  send.type = 'submit';
  send.setAttribute('aria-label', 'Wyślij');
  send.innerHTML = ICON_SEND;
  form.append(input, send);

  chatView.append(header, log, form);
  panel.append(intro, chatView);
  wrap.append(panel);
  if (!inline) wrap.append(launcher);
  (opts.container || document.body).appendChild(host);

  // --- Wyświetlanie ----------------------------------------------------------
  function renderIntroLines() {
    log.append(el('div', 'day', formatDay(state.startedAt)));
    const notice = el('div', 'notice', 'Konsultant nie udziela porad medycznych. W nagłym zagrożeniu życia dzwoń 112. Infolinia: ');
    const tel = el('a', '', SITE.phone);
    tel.href = SITE.phoneHref;
    notice.append(tel);
    log.append(notice);
  }

  function renderMessage(msg, animate = true) {
    const item = el('div', `msg ${msg.role}${msg.emergency ? ' emergency' : ''}${animate ? ' enter' : ''}`);
    item.append(el('div', 'who', msg.role === 'user' ? state.name : BOT_LABEL));
    const bubble = el('div', 'bubble');
    appendLinkified(bubble, msg.text);
    item.append(bubble);

    if (msg.links?.length) {
      const links = el('div', 'links');
      for (const l of msg.links) {
        const a = el('a', 'link', l.label);
        a.href = l.url;
        if (!l.url.startsWith('tel:')) a.target = '_top'; // otwórz zakładkę na stronie kliniki
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
    t.append(el('div', 'who', `${BOT_LABEL} pisze…`));
    const b = el('div', 'bubble');
    b.append(el('i'), el('i'), el('i'));
    t.append(b);
    log.append(t);
    log.scrollTop = log.scrollHeight;
    return () => t.remove();
  }

  function renderConversation() {
    log.textContent = '';
    renderIntroLines();
    state.messages.forEach((m) => renderMessage(m, false));
  }

  function showScreen() {
    const hasName = Boolean(state.name);
    wrap.classList.toggle('has-name', hasName);
    if (hasName) renderConversation();
  }

  // --- Zachowanie ------------------------------------------------------------
  let busy = false;

  function startConversation(name) {
    state.name = name;
    state.startedAt = Date.now();
    state.messages = [greetingFor(name)];
    saveState(storeKey, state);
    showScreen();
    input.focus();
  }

  async function ask(text) {
    const message = text.trim();
    if (!message || busy || !state.name) return;
    busy = true;
    send.disabled = true;
    log.querySelectorAll('.chips').forEach((c) => c.remove());

    const userMsg = { role: 'user', text: message };
    state.messages.push(userMsg);
    renderMessage(userMsg);

    const stopTyping = showTyping();
    // Historia dla AI: bez powitania (zawiera imię) i bez bieżącego pytania.
    const history = state.messages
      .filter((m) => m !== userMsg && !m.greeting)
      .slice(-6)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));

    const started = Date.now();
    const reply = await respond(engine, message, history);
    // Krótkie minimalne opóźnienie, żeby natychmiastowe odpowiedzi bota nie były zbyt nagłe.
    await wait(Math.max(0, 600 - (Date.now() - started)));
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
    if (open) setTimeout(() => (state.name ? input : nameInput).focus(), 50);
  }

  nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
    if (name) startConversation(name);
  });
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
  root.querySelectorAll('.close').forEach((b) => b.addEventListener('click', () => setOpen(false)));
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !inline) setOpen(false);
  });

  showScreen();
  setOpen(inline ? true : state.open);

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    ask,
    // Czyści rozmowę i imię — wraca do ekranu powitalnego.
    reset() {
      state.name = '';
      state.messages = [];
      log.textContent = '';
      nameInput.value = '';
      saveState(storeKey, state);
      showScreen();
    },
    destroy: () => host.remove(),
  };
}

// --- funkcje pomocnicze ------------------------------------------------------

function el(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// „Dzisiaj, 10:24” / „Wczoraj, 10:24” / „12.10.2026, 10:24”.
function formatDay(ts) {
  const d = new Date(ts || Date.now());
  const time = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `Dzisiaj, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Wczoraj, ${time}`;
  return `${d.toLocaleDateString('pl-PL')}, ${time}`;
}

// Zamienia adresy kliniki w tekście modelu na linki; reszta zostaje zwykłym tekstem.
function appendLinkified(parent, text) {
  const host = new URL(SITE.base).hostname;
  const parts = String(text || '').split(/(https?:\/\/[^\s)]+)/g);
  for (const part of parts) {
    let url = null;
    try {
      if (/^https?:\/\//.test(part) && new URL(part).hostname.endsWith(host)) url = part.replace(/[.,;]+$/, '');
    } catch { /* to nie jest adres */ }
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

// sessionStorage może być zablokowany (tryb prywatny, iframe) — nie pozwalamy, by to wywróciło czat.
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
  } catch { /* pomijamy */ }
}
