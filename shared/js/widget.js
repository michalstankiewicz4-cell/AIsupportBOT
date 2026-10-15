// Interfejs widżetu czatu, wspólny dla trzech asystentów.
// Dwa ekrany: (1) podanie imienia, (2) rozmowa z wirtualną konsultantką (SITE.assistant).
// Renderowany w Shadow DOM, żeby CSS strony go nie psuł
// (a nasz CSS nie psuł strony).
// Cały tekst pacjenta i modelu wstawiamy przez textContent — nigdy innerHTML.
import { respond } from './pipeline.js';
import { SITE, TILES, textOf, replyFor, fill, activeNotices, orderTiles } from './knowledge.js';
import { UI_TEXTS } from './texts.js';
import { getPanelConfig, logTurn, logClick, newSessionId } from '../../panel/client.js';
import { isSafeUrl } from '../../panel/schema.js';

// Ikony — stałe SVG (bezpieczne do wstawienia przez innerHTML).
const ICON_BUBBLE =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5c4.4 0 7.5 2.9 7.5 6.6s-3.1 6.6-7.5 6.6c-.9 0-1.8-.1-2.6-.4L5.6 19l1-3.3C5.4 14.5 4.5 12.9 4.5 11.1 4.5 7.4 7.6 4.5 12 4.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const ICON_CLOSE =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_SEND =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Imię, obrazy i napisy pochodzą z SITE — domyślne wartości albo zmiany z panelu („Strona i wygląd”),
// nałożone przez initPanel() przed zamontowaniem widżetu.
const DEFAULT_AVATAR = new URL('../img/avatar.png', import.meta.url).href;
const DEFAULT_LOGO = new URL('../img/logo.png', import.meta.url).href;
const avatarUrl = () => SITE.avatar || DEFAULT_AVATAR;
const NAME_MAX = 40;

// Powitanie (przypadek M) z 6 szybkimi przyciskami — zanim pacjent cokolwiek napisze.
const greetingFor = (name) => ({
  role: 'bot',
  greeting: true, // nie wysyłamy do AI — imię zostaje w przeglądarce
  text: textOf('M', { imie: `, ${name}` }),
  links: replyFor('powitanie').links,
  case: 'M',
});

// Napisy techniczne (np. „Tryb offline…”) pacjent nie widzi (specyfikacja, pkt 8.6) —
// pokazujemy je tylko na stronie podglądu (opcja showTech) i zapisujemy w rejestrze rozmów.
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
  const BOT_LABEL = SITE.assistant; // np. „Ilona”
  // Atrybuty data-* na stronie mają pierwszeństwo przed ustawieniami z panelu.
  const title = opts.title || SITE.title;
  const accent = opts.accent || SITE.accent;
  const position = opts.position || SITE.position;
  if (opts.open === undefined) opts.open = SITE.autoOpen;
  const storeKey = opts.storeKey || `lt-chat:${engine.name}`;
  const state = loadState(storeKey) || { open: !!opts.open, name: '', startedAt: 0, session: '', consent: false, messages: [] };
  // Stan przebiegu rozmowy dla pipeline: tryb kryzysowy i licznik niezrozumiałych pytań.
  state.flow = state.flow || { crisis: false, unclear: 0 };

  // --- Szkielet DOM ---------------------------------------------------------
  const host = document.createElement('div');
  host.className = 'lt-chat-host';
  const root = host.attachShadow({ mode: 'open' });
  const inline = Boolean(opts.container);

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = opts.cssUrl;
  root.appendChild(css);

  const wrap = el('div', `chat ${inline ? 'inline' : 'floating'} ${position === 'left' ? 'left' : 'right'}${opts.fill ? ' fill' : ''}`);
  if (accent) wrap.style.setProperty('--accent', accent);
  applyTileStyle(wrap, TILES);
  wrap.dataset.variant = engine.name;
  wrap.dataset.version = engine.version;
  root.appendChild(wrap);

  const launcher = el('button', 'launcher');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', `Otwórz czat — ${SITE.assistant}, wirtualna konsultantka`);
  launcher.innerHTML = ICON_BUBBLE;

  const panel = el('section', 'panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', `${title} — ${SITE.assistant}, wirtualna konsultantka`);

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
  const h = el('h2', 'intro-title', fill(SITE.introTitle));
  const lead = el('p', 'intro-lead', fill(SITE.introLead));
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
  // Zgoda na zapis treści rozmowy — pokazywana tylko, gdy panel ustawia poziom 2 lub 3.
  const logging = getPanelConfig().logging;
  const consentBox = el('label', 'consent');
  const consentInput = el('input');
  consentInput.type = 'checkbox';
  consentBox.append(
    consentInput,
    el(
      'span',
      '',
      `Zgadzam się na zapisanie treści tej rozmowy (bez mojego imienia, numerów i adresów e-mail) w celu ulepszania asystentki. ` +
        `Zapis jest usuwany po ${logging.retentionDays} dniach. Zgoda jest dobrowolna — czat działa także bez niej.`,
    ),
  );
  const privacy = el('a', 'consent-link', 'Polityka prywatności');
  privacy.href = `${SITE.base}/polityka-prywatnosci`;
  privacy.target = '_blank';
  privacy.rel = 'noopener';
  consentBox.lastChild.append(' ', privacy);
  nameForm.append(h, lead, label, nameInput);
  if (logging.level >= 2) nameForm.append(consentBox);
  nameForm.append(start, hint, el('p', 'sos', UI_TEXTS.emergencyFooter));
  // Logo kliniki w wolnym miejscu między nagłówkiem a formularzem.
  const introLogo = el('div', 'intro-logo');
  const logoImg = el('img');
  logoImg.src = SITE.logo || DEFAULT_LOGO;
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
  titleBox.append(el('strong', '', title), el('span', 'subtitle', `${SITE.assistant} · wirtualna konsultantka · online`));
  header.title = `${engine.label} · ${engine.name} v${engine.version}`;
  header.append(avatar, titleBox);
  if (!inline) header.append(closeBtn);

  const log = el('div', 'log');
  log.setAttribute('aria-live', 'polite');

  const form = el('form', 'composer');
  const input = el('textarea', 'input');
  input.rows = 1;
  input.maxLength = 500;
  input.placeholder = SITE.placeholder || UI_TEXTS.placeholder;
  input.setAttribute('aria-label', 'Twoja wiadomość');
  const send = el('button', 'send');
  send.type = 'submit';
  send.setAttribute('aria-label', 'Wyślij');
  send.innerHTML = ICON_SEND;
  form.append(input, send);
  // Stały dopisek pod polem (specyfikacja, pkt 8.9) — widoczny zawsze.
  const sos = el('p', 'sos', UI_TEXTS.emergencyFooter);

  chatView.append(header, log, form, sos);
  panel.append(intro, chatView);
  wrap.append(panel);
  if (!inline) wrap.append(launcher);
  (opts.container || document.body).appendChild(host);

  // --- Wyświetlanie ----------------------------------------------------------
  function renderIntroLines() {
    log.append(el('div', 'day', formatDay(state.startedAt)));
    const notice = el('div', 'notice', 'Wirtualna konsultantka nie udziela porad medycznych. Infolinia: ');
    const tel = el('a', '', SITE.phone);
    tel.href = SITE.phoneHref;
    notice.append(tel);
    log.append(notice);
    // Komunikaty okresowe z panelu (np. „24–26.12 infolinia nieczynna”) — tylko w swoim terminie.
    for (const n of activeNotices()) log.append(el('div', 'announce', n.text));
  }

  function renderMessage(msg, animate = true) {
    const item = el('div', `msg ${msg.role}${msg.emergency ? ' emergency' : ''}${animate ? ' enter' : ''}`);
    if (msg.emergency) {
      // Karta alarmowa: zawsze rozwinięta, ogłaszana od razu czytnikom ekranu.
      item.setAttribute('role', 'alert');
      item.setAttribute('aria-live', 'assertive');
    }
    const who = msg.role === 'user' ? state.name : msg.title ? `${BOT_LABEL} · ${msg.title}` : BOT_LABEL;
    item.append(whoRow(who, msg.role !== 'user'));
    const bubble = el('div', 'bubble');
    appendLinkified(bubble, msg.text);
    item.append(bubble);

    if (msg.links?.length) {
      // Usługi — kolorowe kafelki z ceną (każda usługa w swoim kolorze, obrys = wariant);
      // informacje (cennik, kontakt, „Jaki specjalista?”) — małe szare przyciski; 112 — czerwony.
      const tiles = el('div', 'tiles');
      const links = el('div', 'links');
      // Kafelki usług w kolejności z ustawień panelu; podpowiedzi (szare) i 112 — na swoich miejscach.
      const isTile = (l) => l.kind !== 'alarm' && (l.tile || (l.main && l.kind !== 'info'));
      const ordered = [...orderTiles(msg.links.filter(isTile)), ...msg.links.filter((l) => !isTile(l))];
      for (const l of ordered) {
        const alarm = l.kind === 'alarm';
        const tile = !alarm && (l.tile || (l.main && l.kind !== 'info'));
        const cls = alarm ? 'link main k-alarm' : tile ? `tile${l.outline ? ' outline' : ''}` : 'link';
        const node = buttonNode(l, cls, tile, msg.case);
        if (!node) continue;
        if (!alarm) paint(node, l.color, tile && !l.outline);
        (tile ? tiles : links).append(node);
      }
      if (tiles.children.length) {
        tiles.classList.toggle('single', tiles.children.length === 1); // „Pojedynczy kafelek dopasowany do treści”
        item.append(tiles);
        if (TILES.nobreak || TILES.pack) requestAnimationFrame(() => layoutTiles(tiles, TILES));
      }
      if (links.children.length) item.append(links);
    }
    if (msg.note && opts.showTech) item.append(el('div', 'note', msg.note));
    log.append(item);

    if (msg.chips?.length) renderChips(msg.chips);
    log.scrollTop = log.scrollHeight;
  }

  // Kolor przycisku z ustawień (tylko #rrggbb). Na jasnym kolorze napis ciemny — dla czytelności.
  function paint(node, color, filled) {
    if (!/^#[0-9a-f]{6}$/i.test(color || '')) return;
    node.style.setProperty('--k', color);
    if (filled && contrastWithWhite(color) < 3) node.style.setProperty('--k-ink', '#1d1d1f');
  }

  // Plakietka z ceną: kolor z panelu (napis biały albo ciemny — co czytelniejsze); brak = auto.
  function paintPrice(node, color) {
    if (!/^#[0-9a-f]{6}$/i.test(color || '')) return node;
    node.style.background = color;
    node.style.color = contrastWithWhite(color) < 3 ? '#1d1d1f' : '#fff';
    return node;
  }

  // Jeden przycisk: link (https/tel) albo pytanie zadawane w czacie (l.ask).
  // Kafelek: nazwa usługi + cena w drugiej linii („e-Recepta online · od 59 zł”).
  function buttonNode(l, cls, tile, caseId) {
    let node;
    if (l.ask) {
      node = el('button', cls);
      node.type = 'button';
      node.addEventListener('click', () => {
        clicked(l.label, caseId);
        ask(l.ask);
      });
    } else {
      if (!isSafeUrl(l.url)) return null; // tylko https/tel/mailto — nigdy javascript:
      node = el('a', cls);
      node.href = l.url;
      if (!l.url.startsWith('tel:')) node.target = '_top'; // otwórz zakładkę na stronie kliniki
      node.addEventListener('click', () => clicked(l.label, caseId));
    }
    const [name, price] = String(l.label).split(' · ');
    if (tile) {
      node.append(el('span', 'tile-name', name));
      if (price) node.append(paintPrice(el('span', 'tile-price', price), l.priceColor));
    } else {
      node.textContent = l.label;
    }
    return node;
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
    t.append(whoRow(`${BOT_LABEL} pisze…`, true));
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

  // Rejestr: kliknięty przycisk + przypadek A–M (bez treści rozmowy).
  function clicked(button, caseId) {
    logClick({ session: state.session, consent: state.consent, variant: engine.name, version: engine.version, button, caseId });
  }

  function startConversation(name, consent) {
    state.name = name;
    state.consent = consent;
    state.session = newSessionId();
    state.startedAt = Date.now();
    state.messages = [greetingFor(name)];
    state.flow = { crisis: false, unclear: 0 };
    saveState(storeKey, state);
    showScreen();
    input.focus({ preventScroll: true });
  }

  async function ask(text) {
    const message = text.trim();
    if (!message || busy || !state.name) return;
    busy = true;
    send.disabled = true;
    try {
      await askInner(message);
    } finally {
      // Nawet po nieoczekiwanym błędzie czat nie zostaje zablokowany.
      busy = false;
      send.disabled = false;
    }
    input.focus({ preventScroll: true });
  }

  async function askInner(message) {
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
    state.flow.name = state.name || ''; // do {imie} w odpowiedziach (np. powitanie po „halo”)
    const reply = await respond(engine, message, history, state.flow);
    // Krótkie minimalne opóźnienie, żeby natychmiastowe odpowiedzi bota nie były zbyt nagłe.
    // Karta alarmowa — bez opóźnienia.
    if (!reply.emergency) await wait(Math.max(0, 600 - (Date.now() - started)));
    stopTyping();

    const botMsg = {
      role: 'bot',
      text: reply.text,
      links: reply.links,
      chips: reply.chips,
      title: reply.title,
      case: reply.case,
      note: reply.degraded ? DEGRADED_NOTE[reply.degraded] : '',
    };
    state.messages.push(botMsg);
    renderMessage(botMsg);
    // A i B: czerwona karta z 112 ZAWSZE jako ostatnia wiadomość — na dole, tuż nad polem wpisywania.
    if (reply.alarm) {
      const card = { role: 'bot', text: reply.alarm.text, links: reply.alarm.links, emergency: true, title: 'komunikat alarmowy', case: reply.case };
      state.messages.push(card);
      renderMessage(card);
      log.scrollTop = log.scrollHeight;
    }
    state.messages = state.messages.slice(-40);
    saveState(storeKey, state);

    // Rejestr rozmów (zakres zależy od poziomu z panelu i zgody pacjenta; imię nigdy nie jest wysyłane).
    logTurn({ session: state.session, consent: state.consent, variant: engine.name, version: engine.version, question: message, reply });
  }

  function setOpen(open) {
    state.open = open;
    wrap.classList.toggle('open', open);
    launcher.setAttribute('aria-expanded', String(open));
    saveState(storeKey, state);
    if (open) setTimeout(() => (state.name ? input : nameInput).focus({ preventScroll: true }), 50);
  }

  nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
    if (name) startConversation(name, consentInput.checked);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (busy) return; // asystentka jeszcze odpowiada — wpisany tekst zostaje w polu
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
  // Podgląd w panelu: rozmowa startuje od razu (bez ekranu z imieniem), żeby widać było powitanie.
  if (opts.autoStartName && !state.name) startConversation(opts.autoStartName, false);

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    ask,
    // Czyści rozmowę i imię — wraca do ekranu powitalnego.
    reset() {
      state.name = '';
      state.consent = false;
      state.session = '';
      consentInput.checked = false;
      state.messages = [];
      state.flow = { crisis: false, unclear: 0 };
      log.textContent = '';
      nameInput.value = '';
      saveState(storeKey, state);
      showScreen();
    },
    destroy: () => host.remove(),
  };
}

// --- funkcje pomocnicze ------------------------------------------------------

// Podpis nad dymkiem; przy konsultantce — miniatura logo jak zdjęcie profilowe.
function whoRow(name, withAvatar) {
  const row = el('div', 'who');
  if (withAvatar) {
    const img = el('img', 'who-avatar');
    img.src = avatarUrl();
    img.alt = '';
    row.append(img);
  }
  row.append(el('span', '', name));
  return row;
}

// Wygląd kafelków z panelu: marginesy (zmienne CSS) i przełączniki jako klasy.
export function applyTileStyle(node, t) {
  const p = t.padding;
  node.style.setProperty('--tile-pad', `${p.t}px ${p.r}px ${p.b}px ${p.l}px`);
  node.classList.toggle('tiles-fit', Boolean(t.fit));
  node.classList.toggle('tiles-nobreak', Boolean(t.nobreak));
  node.classList.toggle('tiles-autow', Boolean(t.autoWidth));
  node.classList.toggle('tiles-center-h', Boolean(t.centerH));
  node.classList.toggle('tiles-center-v', Boolean(t.centerV));
  node.classList.toggle('tiles-single-fit', t.singleFit !== false);
  node.style.setProperty('--tile-fs', `${t.fontSize || 13.5}px`);
  node.classList.toggle('tiles-pack', Boolean(t.pack) && !t.autoWidth);
}

// Układ kafelków po narysowaniu: zmniejszenie napisu („bez przenoszenia liter”) i —
// przy „równych odstępach w pionie” — dosunięcie kafelków w kolumnach (siatka z wierszami po 1 px,
// każdy kafelek zajmuje tyle wierszy, ile ma wysokości + odstęp). Kolejność zostaje wierszami.
export function layoutTiles(container, t) {
  if (t.nobreak) fitTileText(container);
  else container.querySelectorAll('.tile-name, .pv-name').forEach((n) => (n.style.fontSize = ''));
  const grids = container.matches?.('.tiles, .tile-preview') ? [container] : [...container.querySelectorAll('.tiles')];
  for (const g of grids) {
    const items = [...g.children];
    g.classList.remove('packed');
    items.forEach((i) => (i.style.gridRowEnd = ''));
    if (!t.pack || t.autoWidth) continue;
    const gap = parseFloat(getComputedStyle(g).columnGap) || 8;
    const heights = items.map((i) => i.getBoundingClientRect().height);
    g.classList.add('packed');
    items.forEach((i, k) => (i.style.gridRowEnd = `span ${Math.max(1, Math.round(heights[k] + gap))}`));
  }
}

// „Bez przenoszenia liter”: gdy najdłuższy wyraz nie mieści się w kafelku, zmniejsz napis
// (maks. do 11 px) zamiast łamać wyraz w środku.
export function fitTileText(root) {
  for (const name of root.querySelectorAll('.tile-name, .pv-name')) {
    name.style.fontSize = '';
    name.style.overflowWrap = '';
    let size = parseFloat(getComputedStyle(name).fontSize) || 13.5;
    while (name.scrollWidth > name.clientWidth + 0.5 && size > 10) {
      size -= 0.5;
      name.style.fontSize = `${size}px`;
    }
    // Gdy nawet najmniejszy napis się nie mieści — łamiemy wyraz, żeby nic nie wyszło poza kafelek.
    if (name.scrollWidth > name.clientWidth + 0.5) name.style.overflowWrap = 'anywhere';
  }
}

// Kontrast koloru z białym tekstem (WCAG) — eksportowany też do panelu.
export function contrastWithWhite(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return 1.05 / (L + 0.05);
}

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
      const h = /^https:\/\//.test(part) ? new URL(part).hostname : '';
      if (h && (h === host || h.endsWith(`.${host}`))) url = part.replace(/[.,;]+$/, '');
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
