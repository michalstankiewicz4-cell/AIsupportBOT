// Panel sterowania asystentki — działa lokalnie na komputerze administratora (npm run panel).
// Łączy się z serwerem panelu (Cloudflare Worker, hasło) albo działa w trybie lokalnym
// (ustawienia i rozmowy w localStorage tej przeglądarki).
// Cały tekst z ustawień i rozmów wstawiamy przez textContent — nigdy innerHTML.
import { LOG_LEVELS, MODE_PRESETS, ENGINES, DEFAULT_CONFIG, LIMITS, sanitizeConfig, isSafeUrl, wrapSettings, unwrapSettings } from '../schema.js';
import { LOCAL_CONFIG_KEY, LOCAL_LOGS_KEY, SOURCE_KEY, SETTINGS_FILE_URL, setPanelConfig } from '../client.js';
import { INTENT_LABELS, ENGINE_LABELS, SOURCE_LABELS, intentLabel, isUnanswered } from '../labels.js';
import { INTENTS, DOCTOR_FIRST, defaultAnswer, SITE } from '../../shared/js/knowledge.js';
import { respond } from '../../shared/js/pipeline.js';
import { loadChain } from '../../shared/js/embed-core.js';
import { chainLabel } from '../../shared/js/router.js';
import { AI_CONFIG } from '../../ai/config.js';
import { cleanDataset, buildModel, topIntent, evaluate, countExamples, describeChanges } from '../../trained/trainer.js';
import { normalize } from '../../shared/js/text.js';

const $ = (sel) => document.querySelector(sel);
const ENDPOINT_KEY = 'lt-admin:endpoint';
const PASSWORD_KEY = 'lt-admin:password';
const MODE_KEY = 'lt-admin:mode';
const SITE_CHECK_KEY = 'lt-admin:sitecheck';
// Panel otwarty z Twojego komputera (npm run panel)? Na publicznej stronie działa tylko demo.
const IS_LOCAL_HOST = ['localhost', '127.0.0.1'].includes(location.hostname);

// Krótkie wskazówki do kart wyboru.
const MODE_HINTS = {
  bot: 'Domyślny tryb. Nic nie kosztuje i nie wysyła pytań poza przeglądarkę pacjenta.',
  trained: 'Lepiej rozumie różne sformułowania niż bot. Uczysz go, dopisując przykłady do training.json.',
  ai: 'Wymaga serwera AI i klucza API. Ustaw limit wydatków (docs/ZABEZPIECZENIA.md).',
  'trained>ai': 'Najlepszy stosunek jakości do kosztów: AI odpowiada tylko na pytania, których nasz model nie rozpozna.',
  'bot>ai': 'Jak wyżej, ale pierwszy odpowiada bot — przewidywalny, choć rozumie mniej.',
  'ai>trained': 'Gdy AI przekroczy limit lub nie działa, pacjent i tak dostanie sensowną odpowiedź.',
  'trained>bot': 'Darmowa kombinacja dwóch silników — bot łapie to, czego model nie jest pewien.',
};
const LEVEL_HINTS = {
  0: 'Nic nie jest wysyłane ani zapisywane. Najbezpieczniej, ale nie widać, o co pytają pacjenci.',
  1: 'Dobry start: widzisz popularne tematy i pytania bez odpowiedzi, bez danych o zdrowiu konkretnych osób.',
  2: 'Treść pytań pomaga uczyć asystentkę. Wymaga zgody pacjenta i zapisu w polityce prywatności.',
  3: 'Najwięcej danych — także odpowiedzi asystentki. Przydatne przy kontroli jakości; najwięcej obowiązków RODO.',
};

const state = {
  api: null,
  saved: sanitizeConfig(DEFAULT_CONFIG),
  draft: sanitizeConfig(DEFAULT_CONFIG),
  logs: [],
  siteReport: null,
  learn: { saved: null, draft: null, version: '', writable: false, savedModel: null, draftModel: null, inbox: [], eval: null, error: '' },
  selectedRule: null,
  tab: 'mode',
};

// =============================================================================
// Dostęp do danych: serwer panelu albo tryb lokalny
// =============================================================================

function remoteApi(endpoint, password) {
  const base = endpoint.replace(/\/+$/, '');
  async function call(method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: { Authorization: `Bearer ${password}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) throw new Error('Nieprawidłowe hasło.');
    if (res.status === 429) throw new Error('Zbyt wiele prób — spróbuj ponownie za 15 minut.');
    if (res.status === 404) throw new Error('Serwer nie odpowiada na tym adresie (albo Twój adres IP nie ma dostępu).');
    if (!res.ok) throw new Error(`Błąd serwera (${res.status}).`);
    return res.json();
  }
  return {
    kind: 'remote',
    label: new URL(base).host,
    getConfig: () => call('GET', '/admin/config'),
    putConfig: (cfg) => call('PUT', '/admin/config', cfg),
    getLogs: async (days) => (await call('GET', `/admin/logs?days=${days}`)).logs,
    deleteLogs: () => call('DELETE', '/admin/logs'),
    getSiteCheck: () => call('GET', '/admin/site-check'),
    runSiteCheck: () => call('POST', '/admin/site-check'),
  };
}

function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

// Kontrola strony bez serwera panelu: stronę kliniki pobiera lokalny serwer (npm run panel),
// bo przeglądarka sama nie może (CORS). Ostatni wynik pamiętamy w tej przeglądarce.
const localSiteCheck = {
  getSiteCheck: async () => readStore(SITE_CHECK_KEY, null),
  runSiteCheck: async (config) => {
    const res = await fetch('/api/site-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, previous: readStore(SITE_CHECK_KEY, null) }),
    }).catch(() => null);
    if (!res?.ok) throw new Error('Kontrola działa tylko w panelu uruchomionym na Twoim komputerze poleceniem npm run panel.');
    const report = await res.json();
    localStorage.setItem(SITE_CHECK_KEY, JSON.stringify(report));
    return report;
  },
};

// Źródło „plik”: panel/settings.json. Z lokalnym serwerem (npm run panel) — odczyt i zapis
// na dysku; bez niego (np. publiczny podgląd) — tylko odczyt, zmiany przez „Eksport”.
async function fileApi() {
  const writable = IS_LOCAL_HOST && (await fetch('/api/settings').then((r) => r.ok).catch(() => false));
  return {
    kind: 'file',
    label: 'plik panel/settings.json',
    readOnly: !writable,
    getConfig: async () => {
      const res = await fetch(writable ? '/api/settings' : SETTINGS_FILE_URL, { cache: 'no-cache' });
      if (res.status === 404) return sanitizeConfig(DEFAULT_CONFIG);
      if (!res.ok) throw new Error(`Nie można odczytać pliku ustawień (${res.status}).`);
      return unwrapSettings(await res.json());
    },
    putConfig: async (cfg) => {
      if (!writable) throw new Error('Plik jest tylko do odczytu — użyj „Eksport” i podmień plik panel/settings.json na hostingu.');
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wrapSettings(cfg)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Błąd zapisu (${res.status}).`);
      return unwrapSettings(data);
    },
    getLogs: async () => [],
    deleteLogs: async () => {},
    ...localSiteCheck,
  };
}

function localApi() {
  const read = readStore;
  return {
    kind: 'local',
    label: 'tryb lokalny',
    getConfig: async () => sanitizeConfig(read(LOCAL_CONFIG_KEY, DEFAULT_CONFIG)),
    putConfig: async (cfg) => {
      const clean = sanitizeConfig({ ...cfg, updatedAt: new Date().toISOString() });
      localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(clean));
      return clean;
    },
    getLogs: async (days) => {
      const minTs = Date.now() - days * 86400000;
      return read(LOCAL_LOGS_KEY, []).filter((l) => l.ts >= minTs).sort((a, b) => b.ts - a.ts);
    },
    deleteLogs: async () => localStorage.removeItem(LOCAL_LOGS_KEY),
    ...localSiteCheck,
  };
}

// =============================================================================
// Logowanie
// =============================================================================

function showLogin(error) {
  $('#app').hidden = true;
  $('#login').hidden = false;
  $('#local-origin').textContent = location.origin;
  $('#public-note').hidden = IS_LOCAL_HOST;
  $('#login-remote').hidden = !IS_LOCAL_HOST;
  $('#file-divider').hidden = !IS_LOCAL_HOST;
  $('#file-desc').textContent = IS_LOCAL_HOST
    ? 'Odczyt i zapis pliku panel/settings.json na Twoim dysku (przed każdym zapisem robiona jest kopia w panel/backups/). Plik wgrywasz potem na hosting razem z czatem.'
    : 'Podgląd opublikowanego pliku panel/settings.json — tylko odczyt. Zmiany możesz wyeksportować do pliku.';
  $('#login-endpoint').value = localStorage.getItem(ENDPOINT_KEY) || '';
  const err = $('#login-error');
  err.hidden = !error;
  err.textContent = error || '';
}

async function connect(api) {
  state.api = api;
  const cfg = sanitizeConfig(await api.getConfig());
  state.saved = cfg;
  state.draft = structuredClone(cfg);
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#conn').textContent = {
    remote: `Serwer (baza): ${api.label}`,
    file: api.readOnly ? 'Plik panel/settings.json — tylko odczyt' : 'Plik: panel/settings.json',
    local: IS_LOCAL_HOST ? 'Tryb lokalny — tylko ta przeglądarka' : 'Podgląd demo — zmiany tylko w tej przeglądarce',
  }[api.kind];
  $('#conn').classList.toggle('local', api.kind !== 'remote');
  // Czat w tej przeglądarce (np. podgląd czatów) korzysta z tego samego źródła.
  localStorage.setItem(SOURCE_KEY, JSON.stringify({ remote: 'server', file: 'file', local: 'local' }[api.kind]));
  renderAll();
  loadLogs();
  loadSiteCheck();
  loadTraining();
}

$('#login-remote').addEventListener('submit', async (e) => {
  e.preventDefault();
  const endpoint = $('#login-endpoint').value.trim();
  const password = $('#login-password').value;
  try {
    await connect(remoteApi(endpoint, password));
    localStorage.setItem(ENDPOINT_KEY, endpoint);
    localStorage.setItem(MODE_KEY, 'remote');
    sessionStorage.setItem(PASSWORD_KEY, password); // hasło tylko do zamknięcia karty
  } catch (err) {
    showLogin(err.message.includes('fetch') ? 'Nie można połączyć się z serwerem. Sprawdź adres.' : err.message);
  }
});

$('#login-local').addEventListener('click', () => {
  localStorage.setItem(MODE_KEY, 'local');
  connect(localApi());
});

$('#login-file').addEventListener('click', async () => {
  try {
    await connect(await fileApi());
    localStorage.setItem(MODE_KEY, 'file');
  } catch (err) {
    showLogin(err.message);
  }
});

$('#logout').addEventListener('click', () => {
  if (isDirty() && !confirm('Masz niezapisane zmiany. Wylogować mimo to?')) return;
  sessionStorage.removeItem(PASSWORD_KEY);
  localStorage.removeItem(MODE_KEY);
  $('#login-password').value = '';
  showLogin();
});

// =============================================================================
// Zapis i stan „niezapisane zmiany”
// =============================================================================

function isDirty() {
  return JSON.stringify(sanitizeConfig(state.draft)) !== JSON.stringify(sanitizeConfig(state.saved));
}

function changed() {
  const dirty = isDirty();
  const readOnly = Boolean(state.api?.readOnly);
  $('#dirty').hidden = !dirty;
  $('#dirty').textContent = readOnly ? 'Niezapisane — użyj „Eksport”' : 'Niezapisane zmiany';
  $('#discard').hidden = !dirty;
  $('#save').disabled = !dirty || readOnly;
  $('#save').title = readOnly
    ? 'Plik jest tylko do odczytu. Użyj „Eksport” i podmień plik panel/settings.json na hostingu.'
    : 'Zapisuje wszystkie zakładki naraz.';
  $('#rules-count').textContent = state.draft.rules.length || '';
  $('#ovr-count').textContent = Object.keys(state.draft.overrides).length || '';
}

$('#save').addEventListener('click', async () => {
  const btn = $('#save');
  btn.disabled = true;
  btn.textContent = 'Zapisywanie…';
  try {
    const cfg = sanitizeConfig(await state.api.putConfig(sanitizeConfig(state.draft)));
    state.saved = cfg;
    state.draft = structuredClone(cfg);
    toast(
      {
        remote: 'Zapisano. Na stronie zmiany będą widoczne w ciągu ok. minuty.',
        file: 'Zapisano do panel/settings.json (poprzednia wersja w panel/backups/). Wgraj plik na hosting, żeby zmiany trafiły na stronę.',
        local: 'Zapisano lokalnie.',
      }[state.api.kind],
    );
    renderAll();
  } catch (err) {
    toast(`Nie zapisano: ${err.message}`, true);
  } finally {
    btn.textContent = 'Zapisz zmiany';
    changed();
  }
});

$('#discard').addEventListener('click', () => {
  state.draft = structuredClone(state.saved);
  state.selectedRule = null;
  renderAll();
});

window.addEventListener('beforeunload', (e) => {
  if (state.api && (isDirty() || learnDirty())) e.preventDefault();
});

// =============================================================================
// Eksport i import ustawień
// =============================================================================

$('#export').addEventListener('click', () => {
  const data = wrapSettings(state.draft);
  download(`ustawienia-asystentki-${dateStamp()}.json`, JSON.stringify(data, null, 2) + '\n', 'application/json');
  toast(isDirty() ? 'Wyeksportowano bieżące ustawienia (razem z niezapisanymi zmianami).' : 'Wyeksportowano ustawienia.');
});

$('#import').addEventListener('click', () => $('#import-file').click());

$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    if (file.size > 1_000_000) throw new Error('Plik jest za duży (maks. 1 MB).');
    const cfg = unwrapSettings(JSON.parse(await file.text()));
    state.draft = structuredClone(cfg);
    state.selectedRule = null;
    renderAll();
    toast(
      `Wczytano „${file.name}”: tryb ${chainLabel(cfg.engine.chain)}, własne odpowiedzi: ${cfg.rules.length}, zmienione wbudowane: ${Object.keys(cfg.overrides).length}. ` +
        (state.api.readOnly ? 'Sprawdź i użyj „Eksport”.' : 'Sprawdź i kliknij „Zapisz zmiany”.'),
    );
  } catch (err) {
    toast(`Nie wczytano pliku: ${err instanceof SyntaxError ? 'to nie jest poprawny plik JSON.' : err.message}`, true);
  }
});

// =============================================================================
// Zakładki
// =============================================================================

document.querySelectorAll('[role="tab"]').forEach((tab) =>
  tab.addEventListener('click', () => selectTab(tab.dataset.tab)),
);

function selectTab(name) {
  state.tab = name;
  document.querySelectorAll('[role="tab"]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
  document.querySelectorAll('.tab').forEach((s) => (s.hidden = s.id !== `tab-${name}`));
  if (name === 'logs') loadLogs();
  if (name === 'site') renderSite();
  if (name === 'learn') renderLearn();
}

function renderAll() {
  renderMode();
  renderLogging();
  renderRules();
  renderBuiltin();
  renderLogs();
  changed();
}

// =============================================================================
// 1. Tryb pracy
// =============================================================================

// Stan wdrożenia silników: bot i nasz model działają od razu; AI wymaga serwera AI i klucza API.
function engineStatus(name) {
  if (name !== 'ai') return { done: true };
  if (AI_CONFIG.endpoint) return { done: true };
  return {
    done: false,
    todo: 'uruchomić serwer AI (Cloudflare Worker + klucz API Anthropic) i wpisać jego adres w ai/config.js albo w atrybucie data-endpoint na stronie — instrukcja: docs/AI-SERWER.md. Do tego czasu zamiast AI odpowiada bot.',
  };
}

function chainStatus(chain) {
  const missing = chain.map(engineStatus).filter((s) => !s.done);
  return missing.length ? { done: false, hint: `Do zrobienia: ${missing[0].todo}` } : { done: true, hint: 'Gotowe — działa od razu, bez dodatkowej konfiguracji.' };
}

function renderMode() {
  const chain = state.draft.engine.chain;
  const key = chain.join('>');
  const box = $('#mode-presets');
  box.textContent = '';
  for (const p of MODE_PRESETS) {
    const card = choiceCard({
      name: 'mode',
      checked: p.chain.join('>') === key,
      title: p.name,
      text: p.short,
      badge: chainLabel(p.chain),
      recommended: p.chain.join('>') === 'trained>ai',
      hint: MODE_HINTS[p.chain.join('>')],
      status: chainStatus(p.chain),
      onPick: () => {
        state.draft.engine.chain = [...p.chain];
        renderMode();
        changed();
      },
    });
    box.append(card);
  }

  // Własna kolejność: 3 listy wyboru.
  const row = $('#chain-row');
  row.textContent = '';
  for (let i = 0; i < 3; i++) {
    const wrap = el('label', 'field');
    wrap.append(el('span', '', i === 0 ? '1. Odpowiada' : `${i + 1}. Gdy poprzedni nie rozpozna`));
    const sel = el('select');
    if (i > 0) sel.append(option('', '— brak —'));
    for (const e of ENGINES) sel.append(option(e, ENGINE_LABELS[e]));
    sel.value = chain[i] || '';
    sel.disabled = i > 0 && !chain[i - 1];
    sel.addEventListener('change', () => {
      const next = [...chain];
      next[i] = sel.value;
      state.draft.engine.chain = next.slice(0, i + 1).concat(sel.value ? next.slice(i + 1) : []).filter(Boolean);
      state.draft = sanitizeConfig(state.draft);
      renderMode();
      changed();
    });
    wrap.append(sel);
    row.append(wrap);
  }

  const cs = chainStatus(chain);
  const notes = [`Aktualnie: ${chainLabel(chain)} — ${cs.done ? '✓ zrobione' : '⏳ do zrobienia'}.`];
  if (!cs.done) notes.push(cs.hint);
  $('#chain-note').textContent = notes.join(' ');
}

// =============================================================================
// 2. Rejestracja rozmów
// =============================================================================

function renderLogging() {
  const lg = state.draft.logging;
  const box = $('#log-levels');
  box.textContent = '';
  for (const level of LOG_LEVELS) {
    box.append(
      choiceCard({
        name: 'level',
        checked: lg.level === level.id,
        title: `${level.id}. ${level.name}`,
        text: level.short,
        recommended: level.id === 1,
        hint: LEVEL_HINTS[level.id],
        onPick: () => {
          state.draft.logging.level = level.id;
          renderLogging();
          changed();
        },
      }),
    );
  }

  const ret = $('#retention');
  ret.value = lg.retentionDays;
  ret.disabled = lg.level === 0;
  ret.oninput = () => {
    state.draft.logging.retentionDays = Number(ret.value) || 1;
    renderConsentPreview();
    changed();
  };
  ret.onchange = () => {
    state.draft = sanitizeConfig(state.draft);
    ret.value = state.draft.logging.retentionDays;
    changed();
  };
  renderConsentPreview();

  const note = $('#rodo-note');
  note.textContent = '';
  if (state.api?.kind === 'file') {
    note.classList.add('warn');
    note.append(
      el('strong', '', 'Źródło „plik”: rozmowy nie są zapisywane. '),
      el('span', '', 'Rejestr wymaga serwera panelu (bazy), który odbiera wpisy od czatów pacjentów. Ustawienie poziomu zostanie zapisane w pliku i zadziała po przejściu na serwer panelu.'),
    );
    return;
  }
  if (lg.level === 0) {
    note.append(el('p', '', 'Rejestracja wyłączona — nic nie jest zapisywane ani wysyłane.'));
  } else if (lg.level === 1) {
    note.append(el('p', '', 'Statystyki nie zawierają treści rozmów ani danych pacjenta (tylko temat, godzinę i losowy identyfikator rozmowy). Wystarczy wzmianka w polityce prywatności.'));
  } else {
    note.classList.add('warn');
    note.append(
      el('strong', '', 'RODO: treść pytań o zdrowie to dane szczególnej kategorii (art. 9). '),
      el('span', '', 'Przed włączeniem: zapis o rejestrze w polityce prywatności, umowa powierzenia z Cloudflare, ustalony czas przechowywania i dostęp tylko dla upoważnionych osób. Pacjent bez zgody trafia do rejestru tylko jako statystyka.'),
    );
  }
  if (lg.level < 2) note.classList.remove('warn');
}

function renderConsentPreview() {
  const box = $('#consent-preview');
  box.textContent = '';
  if (state.draft.logging.level < 2) {
    box.append(el('p', 'muted small', 'Przy poziomie 2 i 3 pacjent zobaczy na ekranie powitalnym pole zgody.'));
    return;
  }
  box.append(el('span', 'label', 'Pacjent zobaczy:'));
  const p = el('p', 'consent-sample');
  p.append(
    el('span', 'box'),
    el('span', '', `Zgadzam się na zapisanie treści tej rozmowy (bez mojego imienia, numerów i adresów e-mail) w celu ulepszania asystentki. Zapis jest usuwany po ${state.draft.logging.retentionDays || '…'} dniach. Zgoda jest dobrowolna — czat działa także bez niej.`),
  );
  box.append(p);
}

// =============================================================================
// 3. Własne odpowiedzi
// =============================================================================

function renderRules() {
  const list = $('#rules-list');
  const q = $('#rules-search').value.trim().toLowerCase();
  list.textContent = '';
  const rules = state.draft.rules.filter(
    (r) => !q || [r.name, r.text, ...r.phrases].join(' ').toLowerCase().includes(q),
  );
  if (!state.draft.rules.length) {
    list.append(el('li', 'empty', 'Brak własnych odpowiedzi. Kliknij „+ Nowa”.'));
  }
  for (const r of rules) {
    const li = el('li', `item${r.id === state.selectedRule ? ' active' : ''}${r.active ? '' : ' off'}`);
    li.tabIndex = 0;
    li.append(el('strong', '', r.name || r.phrases[0] || '(bez frazy)'), el('span', 'muted small', r.phrases.slice(0, 4).join(' · ')));
    if (!r.active) li.append(el('span', 'pill', 'wyłączona'));
    const pick = () => {
      state.selectedRule = r.id;
      renderRules();
    };
    li.addEventListener('click', pick);
    li.addEventListener('keydown', (e) => e.key === 'Enter' && pick());
    list.append(li);
  }
  renderRuleEditor();
}

$('#rules-search').addEventListener('input', renderRules);

$('#rule-add').addEventListener('click', () => addRule());

function addRule(phrase = '') {
  if (state.draft.rules.length >= LIMITS.rules) return toast(`Maksymalnie ${LIMITS.rules} reguł.`, true);
  const id = `r${Date.now().toString(36)}`;
  state.draft.rules.unshift({ id, name: '', phrases: phrase ? [phrase] : [], text: '', links: [], active: true });
  state.selectedRule = id;
  selectTab('rules');
  renderRules();
  changed();
  setTimeout(() => $(phrase ? '#rule-text' : '#rule-phrases')?.focus(), 30);
}

function renderRuleEditor() {
  const box = $('#rule-editor');
  box.textContent = '';
  const rule = state.draft.rules.find((r) => r.id === state.selectedRule);
  if (!rule) {
    box.append(el('p', 'muted center', 'Wybierz odpowiedź z listy albo dodaj nową.'));
    return;
  }
  const update = () => {
    renderRulesListOnly();
    changed();
  };

  const name = textField('Nazwa (dla Ciebie, opcjonalnie)', rule.name, (v) => ((rule.name = v), update()), 'Widzisz ją tylko Ty — na liście reguł i w raportach. Pacjent jej nie zobaczy.');
  const phrases = textArea(
    'Frazy — jedna w wierszu',
    rule.phrases.join('\n'),
    (v) => ((rule.phrases = v.split('\n').map((s) => s.trim()).filter(Boolean)), update()),
    {
      id: 'rule-phrases',
      rows: 4,
      placeholder: 'np.\nsobot*\nw weekend\ngodziny otwarcia',
      hint: 'Jedna fraza w wierszu. Wystarczy, że pytanie pacjenta ją zawiera. Polskie znaki i wielkość liter nie mają znaczenia. Gwiazdka na końcu = dowolna końcówka (sobot* → sobota, sobotę).',
    },
  );
  const text = textArea('Odpowiedź asystentki', rule.text, (v) => ((rule.text = v), update()), {
    id: 'rule-text',
    rows: 5,
    max: LIMITS.textLength,
    placeholder: `np. W soboty i niedziele infolinia działa w godz. 9:00–18:00: ${SITE.phone}.`,
    hint: 'Tekst, który zobaczy pacjent. Pisz krótko i konkretnie. Nie wpisuj porad medycznych ani diagnoz — kieruj do zakładki lub lekarza.',
  });
  const links = linksField(rule.links, (v) => ((rule.links = v), update()));

  const active = el('label', 'check');
  const cb = el('input');
  cb.type = 'checkbox';
  cb.checked = rule.active;
  cb.addEventListener('change', () => ((rule.active = cb.checked), update()));
  active.append(cb, el('span', '', 'Aktywna'), tip('Wyłączona odpowiedź zostaje zapisana, ale asystentka jej nie używa. Wygodne na czas próby.'));

  const actions = el('div', 'row');
  const del = el('button', 'btn danger', 'Usuń odpowiedź');
  del.type = 'button';
  del.addEventListener('click', () => {
    state.draft.rules = state.draft.rules.filter((r) => r.id !== rule.id);
    state.selectedRule = null;
    renderRules();
    changed();
  });
  const test = el('button', 'btn ghost', 'Sprawdź na pierwszej frazie');
  test.type = 'button';
  test.addEventListener('click', () => {
    $('#test-input').value = (rule.phrases[0] || '').replace(/\*$/, '');
    runTest();
  });
  actions.append(active, el('span', 'spacer'), test, del);

  const warn = el('p', 'error small rule-warn');
  if (!rule.phrases.length || !rule.text.trim()) warn.textContent = 'Reguła bez frazy lub bez odpowiedzi nie zostanie zapisana.';

  box.append(name, phrases, text, links, warn, actions);
}

// Odświeża tylko listę (bez przerysowania edytora, żeby nie gubić kursora).
function renderRulesListOnly() {
  const editor = $('#rule-editor');
  const list = $('#rules-list');
  const q = $('#rules-search').value.trim().toLowerCase();
  list.textContent = '';
  for (const r of state.draft.rules.filter((r) => !q || [r.name, r.text, ...r.phrases].join(' ').toLowerCase().includes(q))) {
    const li = el('li', `item${r.id === state.selectedRule ? ' active' : ''}${r.active ? '' : ' off'}`);
    li.append(el('strong', '', r.name || r.phrases[0] || '(bez frazy)'), el('span', 'muted small', r.phrases.slice(0, 4).join(' · ')));
    if (!r.active) li.append(el('span', 'pill', 'wyłączona'));
    li.addEventListener('click', () => {
      state.selectedRule = r.id;
      renderRules();
    });
    list.append(li);
  }
  const rule = state.draft.rules.find((r) => r.id === state.selectedRule);
  const warn = editor.querySelector('.rule-warn');
  if (warn) warn.textContent = rule && (!rule.phrases.length || !rule.text.trim()) ? 'Reguła bez frazy lub bez odpowiedzi nie zostanie zapisana.' : '';
}

// --- Tester -----------------------------------------------------------------------

$('#test-form').addEventListener('submit', (e) => {
  e.preventDefault();
  runTest();
});

async function runTest() {
  const q = $('#test-input').value.trim();
  const box = $('#test-result');
  box.textContent = '';
  if (!q) return;
  box.append(el('p', 'muted', 'Sprawdzam…'));
  // Stosujemy bieżące (niezapisane) ustawienia tylko w tej karcie przeglądarki.
  setPanelConfig(state.draft);
  const engine = await loadChain(state.draft.engine.chain);
  const r = await respond(engine, q);
  box.textContent = '';
  const meta = el('div', 'test-meta');
  meta.append(
    pill(SOURCE_LABELS[r.source] || r.source, r.source),
    pill(intentLabel(r.intent, state.draft.rules)),
  );
  if (r.engine) meta.append(pill(`${ENGINE_LABELS[r.engine] || r.engine}${r.via ? ` (po: ${r.via.map((v) => ENGINE_LABELS[v]).join(', ')})` : ''}`));
  if (r.matched) meta.append(pill(`fraza: ${r.matched}`));
  if (r.degraded) meta.append(pill('AI niedostępne', 'warn'));
  const bubble = el('div', `test-bubble${r.emergency ? ' emergency' : ''}`, r.text);
  box.append(meta, bubble);
  if (r.links?.length) {
    const links = el('div', 'test-links');
    for (const l of r.links) {
      const a = el('a', '', l.label);
      a.href = l.url;
      a.target = '_blank';
      a.rel = 'noopener';
      links.append(a);
    }
    box.append(links);
  }
  if (r.intent === 'fallback') {
    const b = el('button', 'btn ghost', '+ Dodaj własną odpowiedź na to pytanie');
    b.type = 'button';
    b.addEventListener('click', () => addRule(q));
    box.append(b);
  }
}

// =============================================================================
// 4. Odpowiedzi wbudowane
// =============================================================================

$('#doctor-first').textContent = `„${DOCTOR_FIRST}”`;
$('#builtin-search').addEventListener('input', renderBuiltin);
$('#builtin-only').addEventListener('change', renderBuiltin);

function renderBuiltin() {
  const box = $('#builtin-list');
  box.textContent = '';
  const q = $('#builtin-search').value.trim().toLowerCase();
  const only = $('#builtin-only').checked;
  const groups = [
    ['Kierowanie do specjalistów i usług', INTENTS.filter((i) => i.routing).map((i) => i.id)],
    ['Informacje o serwisie i rozmowa', INTENTS.filter((i) => !i.routing).map((i) => i.id)],
    ['Gdy asystentka nie rozpozna pytania', ['fallback']],
  ];
  for (const [title, ids] of groups) {
    const cards = ids
      .map((id) => builtinCard(id))
      .filter(({ id, haystack }) => (!q || haystack.includes(q)) && (!only || state.draft.overrides[id]))
      .map(({ node }) => node);
    if (!cards.length) continue;
    box.append(el('h3', 'group', title), ...cards);
  }
  if (!box.children.length) box.append(el('p', 'muted center', 'Nic nie pasuje do wyszukiwania.'));
}

function builtinCard(id) {
  const def = defaultAnswer(id);
  const ovr = state.draft.overrides[id];
  const intent = INTENTS.find((i) => i.id === id);
  const card = el('article', `card builtin${ovr ? ' changed' : ''}`);
  const head = el('div', 'row');
  head.append(el('strong', '', INTENT_LABELS[id] || id), el('code', 'muted small', id));
  if (intent?.routing) head.append(pill('+ „najpierw lekarz”'), tip(`Do tej odpowiedzi asystentka zawsze dopisze: „${DOCTOR_FIRST}”. Nie musisz tego powtarzać w tekście.`));
  if (ovr) head.append(pill('zmieniona', 'ok'));
  head.append(el('span', 'spacer'));
  if (ovr) {
    const reset = el('button', 'btn ghost small', 'Przywróć domyślną');
    reset.type = 'button';
    reset.addEventListener('click', () => {
      delete state.draft.overrides[id];
      renderBuiltin();
      changed();
    });
    head.append(reset);
  }

  const details = el('details');
  details.open = Boolean(ovr);
  const summary = el('summary', '', ovr ? ovr.text : def.text);
  details.append(summary);

  const defBox = el('div', 'default');
  defBox.append(el('span', 'label', 'Domyślnie:'), el('p', '', def.text));
  if (def.links?.length) defBox.append(el('p', 'muted small', def.links.map((l) => `${l.label} → ${l.url}`).join('  ·  ')));

  const ta = textArea('Twoja wersja (puste = domyślna)', ovr?.text || '', (v) => {
    if (v.trim()) state.draft.overrides[id] = { ...(state.draft.overrides[id] || {}), text: v };
    else delete state.draft.overrides[id];
    card.classList.toggle('changed', Boolean(state.draft.overrides[id]));
    summary.textContent = v.trim() || def.text;
    changed();
  }, { rows: 3, placeholder: def.text, max: LIMITS.textLength, hint: 'Wpisz nowy tekst odpowiedzi. Zostaw puste, żeby używać tekstu domyślnego. Zmiana działa w bocie i naszym modelu.' });

  const linksToggle = el('label', 'check');
  const lcb = el('input');
  lcb.type = 'checkbox';
  lcb.checked = Array.isArray(ovr?.links);
  linksToggle.append(lcb, el('span', '', 'Zmień też linki pod odpowiedzią'), tip('Domyślnie zostają przyciski z odpowiedzi wbudowanej. Zaznacz, żeby ustawić własne.'));
  const linksBox = el('div');
  const drawLinks = () => {
    linksBox.textContent = '';
    const o = state.draft.overrides[id];
    if (!lcb.checked) return;
    if (!o) {
      linksBox.append(el('p', 'muted small', 'Najpierw wpisz własny tekst odpowiedzi.'));
      return;
    }
    if (!Array.isArray(o.links)) o.links = structuredClone(def.links || []);
    linksBox.append(linksField(o.links, (v) => ((o.links = v), changed())));
  };
  lcb.addEventListener('change', () => {
    const o = state.draft.overrides[id];
    if (!lcb.checked && o) delete o.links;
    drawLinks();
    changed();
  });
  drawLinks();

  details.append(defBox, ta, linksToggle, linksBox);
  card.append(head, details);
  const haystack = [id, INTENT_LABELS[id], def.text, ovr?.text].join(' ').toLowerCase();
  return { id, node: card, haystack };
}

// =============================================================================
// 5. Rozmowy
// =============================================================================

['#logs-days'].forEach((s) => $(s).addEventListener('change', loadLogs));
['#logs-filter', '#logs-search'].forEach((s) => $(s).addEventListener('input', renderLogs));
$('#logs-refresh').addEventListener('click', loadLogs);

async function loadLogs() {
  if (!state.api) return;
  try {
    state.logs = await state.api.getLogs(Number($('#logs-days').value));
  } catch (err) {
    state.logs = [];
    toast(`Nie wczytano rozmów: ${err.message}`, true);
  }
  renderLogs();
}

function filteredLogs() {
  const f = $('#logs-filter').value;
  const q = $('#logs-search').value.trim().toLowerCase();
  return state.logs.filter((l) => {
    if (f === 'unanswered' && !isUnanswered(l.intent)) return false;
    if (f === 'custom' && l.source !== 'custom') return false;
    if (f === 'safety' && l.source !== 'safety') return false;
    if (f === 'text' && !l.question) return false;
    if (q && !(l.question || '').toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderLogs() {
  const all = state.logs;
  const stats = $('#logs-stats');
  stats.textContent = '';
  const sessions = new Set(all.map((l) => l.session).filter(Boolean)).size;
  const unanswered = all.filter((l) => isUnanswered(l.intent)).length;
  const safety = all.filter((l) => l.source === 'safety').length;
  const consent = all.filter((l) => l.consent).length;
  const pct = (n) => (all.length ? `${Math.round((n / all.length) * 100)}%` : '—');
  stats.append(
    statTile('Rozmowy', sessions || '—', '', 'Ilu pacjentów rozpoczęło rozmowę (jedna rozmowa = jedno okno czatu).'),
    statTile('Pytania', all.length || '—', '', 'Łączna liczba pytań zadanych asystentce w wybranym okresie.'),
    statTile('Bez odpowiedzi', `${unanswered} · ${pct(unanswered)}`, unanswered ? 'warn' : '', 'Pytania, których asystentka nie rozpoznała. Im mniej, tym lepiej — dodawaj dla nich własne odpowiedzi.'),
    statTile('Stany nagłe', safety, safety ? 'danger' : '', 'Ile razy asystentka wykryła możliwy stan nagły i skierowała pod 112 lub do telefonu zaufania.'),
    statTile('Ze zgodą na treść', `${consent} · ${pct(consent)}`, '', 'Pytania pacjentów, którzy zgodzili się na zapis treści (poziom 2 lub 3).'),
  );

  // Najczęstsze tematy.
  const topics = $('#logs-topics');
  topics.textContent = '';
  const counts = {};
  for (const l of all) counts[l.intent || '—'] = (counts[l.intent || '—'] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const th = el('h3', '', 'Najczęstsze tematy');
  th.append(tip('O co pacjenci pytają najczęściej. Pomarańczowy pasek = pytania bez odpowiedzi.'));
  topics.append(th);
  if (!top.length) topics.append(el('p', 'muted small', 'Brak danych w wybranym okresie.'));
  const max = top[0]?.[1] || 1;
  for (const [intent, n] of top) {
    const row = el('div', 'bar-row');
    const bar = el('div', 'bar');
    const fill = el('span');
    fill.style.width = `${(n / max) * 100}%`;
    if (isUnanswered(intent)) fill.classList.add('warn');
    bar.append(fill);
    row.append(el('span', 'bar-label', intentLabel(intent, state.draft.rules)), bar, el('span', 'bar-n', String(n)));
    topics.append(row);
  }

  // Tabela.
  const body = $('#logs-body');
  body.textContent = '';
  const rows = filteredLogs();
  const empty = $('#logs-empty');
  empty.hidden = rows.length > 0;
  empty.textContent =
    state.api?.kind === 'file'
      ? 'Przy źródle „plik” rozmowy nie są zapisywane — rejestr wymaga serwera panelu (bazy).'
      : state.draft.logging.level === 0 && !all.length
      ? 'Rejestracja jest wyłączona — włącz ją w zakładce „Rejestracja rozmów”.'
      : 'Brak rozmów spełniających kryteria.';
  for (const l of rows.slice(0, 500)) {
    const tr = el('tr');
    if (isUnanswered(l.intent)) tr.classList.add('unanswered');
    if (l.source === 'safety') tr.classList.add('safety');
    tr.append(
      el('td', 'nowrap', new Date(l.ts).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })),
      el(
        'td',
        'nowrap',
        l.source && l.source !== 'engine'
          ? SOURCE_LABELS[l.source] || l.source
          : `${ENGINE_LABELS[l.variant] || l.variant || '—'}${l.degraded ? ' ⚠' : ''}`,
      ),
      el('td', '', intentLabel(l.intent, state.draft.rules)),
      el('td', 'q', l.question || (l.consent ? '—' : 'bez zgody')),
      el('td', 'a', l.answer ? truncate(l.answer, 140) : '—'),
    );
    const act = el('td', 'nowrap');
    if (l.question && (!l.source || l.source === 'engine')) {
      const b = el('button', 'btn ghost small', '+ Odpowiedź');
      b.type = 'button';
      b.title = 'Utwórz własną odpowiedź z tym pytaniem jako frazą';
      b.addEventListener('click', () => addRule(l.question.toLowerCase()));
      act.append(b);
    }
    tr.append(act);
    if (l.answer) tr.querySelector('.a').title = l.answer;
    body.append(tr);
  }
}

$('#logs-csv').addEventListener('click', () => {
  const rows = filteredLogs();
  if (!rows.length) return toast('Brak danych do eksportu.', true);
  const head = ['data', 'silnik', 'wersja', 'temat', 'id_tematu', 'zrodlo', 'zgoda', 'pytanie', 'odpowiedz', 'rozmowa'];
  const lines = [head.join(';')].concat(
    rows.map((l) =>
      [
        new Date(l.ts).toISOString(),
        l.variant,
        l.version,
        intentLabel(l.intent, state.draft.rules),
        l.intent,
        l.source,
        l.consent ? 'tak' : 'nie',
        l.question || '',
        l.answer || '',
        l.session,
      ].map(csvCell).join(';'),
    ),
  );
  // BOM, żeby Excel poprawnie pokazał polskie znaki.
  download(`rozmowy-${dateStamp()}.csv`, '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
});

$('#logs-train').addEventListener('click', () => {
  const out = { _info: 'Pytania z rejestru rozmów pogrupowane według tematu. Sprawdź je, przenieś do trained/data/training.json i uruchom: npm run train. Pytania z "_do_przypisania" asystentka nie rozpoznała — dopisz je ręcznie do właściwego tematu.' };
  for (const l of state.logs) {
    if (!l.question || l.source === 'safety') continue;
    let key = l.intent || '_do_przypisania';
    if (isUnanswered(key) || key.startsWith('custom:') || key === 'ai') key = '_do_przypisania';
    if (key.startsWith('opinia+')) key = key.slice(7);
    out[key] = [...new Set([...(out[key] || []), l.question.toLowerCase()])];
  }
  if (Object.keys(out).length === 1) return toast('Brak pytań z treścią (wymaga poziomu 2 lub 3 i zgody pacjentów).', true);
  download(`trening-z-rozmow-${dateStamp()}.json`, JSON.stringify(out, null, 2), 'application/json');
});

let deleteArmed = false;
$('#logs-delete').addEventListener('click', async () => {
  const btn = $('#logs-delete');
  if (!deleteArmed) {
    deleteArmed = true;
    btn.textContent = 'Na pewno? Kliknij ponownie';
    setTimeout(() => {
      deleteArmed = false;
      btn.textContent = 'Usuń wszystkie';
    }, 4000);
    return;
  }
  deleteArmed = false;
  btn.textContent = 'Usuń wszystkie';
  try {
    await state.api.deleteLogs();
    toast('Usunięto wszystkie zapisane rozmowy.');
    loadLogs();
  } catch (err) {
    toast(`Nie usunięto: ${err.message}`, true);
  }
});

// =============================================================================
// 6. Nauka naszego modelu
// =============================================================================

const TRAINING_URL = new URL('../../trained/data/training.json', import.meta.url).href;
// Temat zaznaczamy z góry tylko, gdy model jest wystarczająco pewny — inaczej wybierasz ręcznie,
// żeby „Dodaj wszystkie” nie nauczyło modelu jego własnych pomyłek.
const SUGGEST_MIN = 0.5;
const intentName = (id) => INTENT_LABELS[id] || id;

async function loadTraining() {
  const L = state.learn;
  L.error = '';
  try {
    // Z lokalnym serwerem (npm run panel) — odczyt i zapis; bez niego — tylko odczyt opublikowanego pliku.
    const local = IS_LOCAL_HOST ? await fetch('/api/training').then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
    if (local) {
      L.saved = local.dataset;
      L.version = local.version;
      L.writable = true;
    } else {
      const res = await fetch(TRAINING_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error('Dane treningowe nie są dostępne pod tym adresem.');
      L.saved = cleanDataset(await res.json()).dataset;
      L.writable = false;
    }
    L.draft = structuredClone(L.saved);
    L.savedModel = buildModel(L.saved, 'zapisany');
    L.draftModel = L.savedModel;
    L.eval = null;
  } catch (err) {
    L.error = err.message;
  }
  renderLearn();
}

function learnDirty() {
  const L = state.learn;
  return Boolean(L.draft && JSON.stringify(L.draft) !== JSON.stringify(L.saved));
}

// Po każdej zmianie: model „po zmianach” uczony od nowa w przeglądarce (trwa ułamek sekundy).
let rebuildTimer;
function learnChanged() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    const L = state.learn;
    L.draftModel = learnDirty() ? buildModel(L.draft, 'roboczy') : L.savedModel;
    L.inbox.forEach((item) => (item.suggest = suggestFor(item.text)));
    renderLearn();
  }, 120);
  renderLearnBar();
}

function suggestFor(text) {
  const t = topIntent(state.learn.draftModel, text);
  return t.knownFeatures === 0 ? { id: '', p: 0, ranked: [] } : { id: t.id, p: t.p, ranked: t.ranked.slice(0, 3) };
}

function alreadyKnown(text) {
  const key = normalize(text);
  return Object.entries(state.learn.draft).some(([k, list]) => !k.startsWith('_') && list.some((x) => normalize(x) === key));
}

function addToInbox(texts, from) {
  const L = state.learn;
  let added = 0;
  for (const raw of texts) {
    const text = String(raw).replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!text || alreadyKnown(text) || L.inbox.some((i) => normalize(i.text) === normalize(text))) continue;
    const suggest = suggestFor(text);
    L.inbox.push({ text, from, suggest, chosen: suggest.p >= SUGGEST_MIN ? suggest.id : '' });
    added++;
  }
  return added;
}

function addExample(intent, text) {
  const L = state.learn;
  const clean = String(text).replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!clean || !intent) return false;
  if ((L.draft[intent] || []).some((x) => normalize(x) === normalize(clean))) return false;
  L.draft[intent] = [...(L.draft[intent] || []), clean];
  return true;
}

function renderLearnBar() {
  const L = state.learn;
  const dirty = learnDirty();
  $('#learn-dirty').hidden = !dirty;
  $('#learn-discard').hidden = !dirty;
  $('#learn-save').disabled = !dirty || !L.writable;
  $('#learn-save').title = L.writable
    ? 'Zapisuje przykłady (z kopią w panel/backups/), uczy model od nowa i podbija wersję „trained” z wpisem w CHANGES.md.'
    : 'Zapis działa tylko w panelu uruchomionym na Twoim komputerze (npm run panel). Tutaj użyj „Pobierz pliki”.';
  $('#learn-count').textContent = L.inbox.length ? String(L.inbox.length) : '';
}

function renderLearn() {
  const L = state.learn;
  renderLearnBar();
  const stats = $('#learn-stats');
  stats.textContent = '';
  if (L.error || !L.draft) {
    stats.append(el('p', 'error', L.error || 'Wczytywanie danych treningowych…'));
    return;
  }
  const ids = INTENTS.map((i) => i.id);
  const covered = ids.filter((id) => (L.draft[id] || []).length).length;
  const change = describeChanges(L.saved, L.draft);
  stats.append(
    statTile('Przykłady', countExamples(L.draft), '', 'Łączna liczba przykładowych pytań, z których uczy się model.'),
    statTile('Tematy z przykładami', `${covered} / ${ids.length}`, covered < ids.length ? 'warn' : '', 'Tematy bez przykładów model rozpoznaje tylko po słowach kluczowych bota.'),
    statTile(
      'Trafność',
      L.eval ? `${(L.eval.accuracy * 100).toFixed(1)}%` : '—',
      '',
      'Odsetek przykładów, które model odgaduje, gdy ich wcześniej „nie widział”. Kliknij „Sprawdź trafność”, żeby policzyć dla bieżących danych.',
    ),
    statTile('Wersja modelu', L.version || '—', '', 'Wersja „trained” — po „Zapisz i naucz model” podnosi się automatycznie.'),
  );
  $('#learn-note').textContent = [
    learnDirty() ? `Niezapisane: ${change.text}.` : '',
    L.writable ? '' : 'Tylko podgląd — zapis i trening działają w panelu uruchomionym na Twoim komputerze (npm run panel). Zmiany możesz pobrać jako pliki.',
  ]
    .filter(Boolean)
    .join(' ');

  renderInbox();
  renderExamples();
  renderLearnErrors();
}

function intentSelect(selected, withEmpty = true) {
  const sel = el('select');
  if (withEmpty) sel.append(option('', '— wybierz temat —'));
  const sorted = [...INTENTS].sort((a, b) => intentName(a.id).localeCompare(intentName(b.id), 'pl'));
  for (const i of sorted) sel.append(option(i.id, `${intentName(i.id)} (${(state.learn.draft[i.id] || []).length})`));
  sel.value = selected || '';
  return sel;
}

function renderInbox() {
  const L = state.learn;
  const list = $('#learn-inbox');
  list.textContent = '';
  if (!L.inbox.length) {
    list.append(el('li', 'empty muted small', 'Lista jest pusta. Kliknij „Wczytaj z rozmów” albo wklej pytania powyżej.'));
    return;
  }
  L.inbox.forEach((item, idx) => {
    const li = el('li', 'inbox-item');
    const q = el('div', 'inbox-q');
    q.append(el('strong', '', `„${item.text}”`));
    if (item.from) q.append(el('span', 'muted small', item.from));
    const sug = el('div', 'muted small');
    sug.textContent = item.suggest.id
      ? `Podpowiedź modelu: ${item.suggest.ranked.map((r) => `${intentName(r.id)} ${Math.round(r.p * 100)}%`).join(' · ')}` +
        (item.suggest.p < SUGGEST_MIN ? ' — model nie jest pewny, wybierz temat ręcznie.' : '')
      : 'Model nie zna żadnego słowa z tego pytania — wybierz temat ręcznie.';
    const row = el('div', 'row');
    const sel = intentSelect(item.chosen);
    sel.addEventListener('change', () => (item.chosen = sel.value));
    const ok = el('button', 'btn primary small', '✓ Dodaj');
    ok.type = 'button';
    ok.title = 'Dodaje pytanie jako przykład wybranego tematu.';
    ok.addEventListener('click', () => {
      if (!item.chosen) return toast('Najpierw wybierz temat.', true);
      addExample(item.chosen, item.text);
      L.inbox.splice(idx, 1);
      learnChanged();
      renderLearn();
    });
    const skip = el('button', 'btn ghost small', '✕ Pomiń');
    skip.type = 'button';
    skip.title = 'Usuwa pytanie z listy bez dodawania (np. pytanie bez sensu).';
    skip.addEventListener('click', () => {
      L.inbox.splice(idx, 1);
      renderLearn();
    });
    row.append(sel, ok, skip);
    li.append(q, sug, row);
    list.append(li);
  });
}

function renderExamples() {
  const L = state.learn;
  const sel = $('#learn-intent');
  const current = sel.value || INTENTS[0].id;
  const fresh = intentSelect(current, false);
  sel.textContent = '';
  sel.append(...fresh.childNodes);
  sel.value = current;
  const q = normalize($('#learn-filter').value);
  const list = $('#learn-examples');
  list.textContent = '';
  const examples = (L.draft[current] || []).map((text, i) => ({ text, i })).filter((x) => !q || normalize(x.text).includes(q));
  if (!examples.length) list.append(el('li', 'empty muted small', q ? 'Brak przykładów pasujących do wyszukiwania.' : 'Ten temat nie ma jeszcze przykładów.'));
  const savedSet = new Set((L.saved[current] || []).map(normalize));
  for (const { text, i } of examples.reverse()) {
    const li = el('li', savedSet.has(normalize(text)) ? '' : 'new');
    li.append(el('span', '', text));
    if (!savedSet.has(normalize(text))) li.append(pill('nowy', 'ok'));
    const del = el('button', 'icon-btn', '✕');
    del.type = 'button';
    del.title = 'Usuń ten przykład';
    del.addEventListener('click', () => {
      L.draft[current] = L.draft[current].filter((_, j) => j !== i);
      learnChanged();
      renderExamples();
    });
    li.append(del);
    list.append(li);
  }
}

function renderLearnErrors() {
  const L = state.learn;
  const box = $('#learn-errors-box');
  const list = $('#learn-errors');
  list.textContent = '';
  box.hidden = !L.eval?.errors.length;
  if (!L.eval) return;
  for (const e of L.eval.errors.slice(0, 40)) {
    const li = el('li');
    li.append(el('span', '', `„${e.text}”`), el('span', 'muted small', ` — temat: ${intentName(e.expected)}, model wybrał: ${intentName(e.got)}`));
    list.append(li);
  }
}

$('#learn-intent').addEventListener('change', renderExamples);
$('#learn-filter').addEventListener('input', renderExamples);

$('#learn-add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#learn-add');
  if (!addExample($('#learn-intent').value, input.value)) return toast('Ten przykład już jest albo pole jest puste.', true);
  input.value = '';
  learnChanged();
  renderExamples();
});

$('#learn-paste-add').addEventListener('click', () => {
  const lines = $('#learn-paste').value.split('\n');
  const n = addToInbox(lines, 'wklejone');
  $('#learn-paste').value = '';
  toast(n ? `Dodano do listy: ${n}. Sprawdź podpowiedzi i zatwierdź.` : 'Nic nowego — te pytania już są w przykładach albo na liście.');
  renderLearn();
});

$('#learn-from-logs').addEventListener('click', async () => {
  if (!state.logs.length) await loadLogs();
  // Pytania, z którymi model sobie nie poradził: nierozpoznane, błędy i te, na które musiało odpowiedzieć AI.
  const candidates = state.logs.filter((l) => l.question && (isUnanswered(l.intent) || l.intent === 'ai')).map((l) => l.question);
  const n = addToInbox(candidates, 'z rozmów');
  toast(
    n
      ? `Wczytano z rozmów: ${n} pytań do nauczenia.`
      : state.logs.some((l) => l.question)
        ? 'Brak nowych pytań do nauczenia — wszystkie nierozpoznane pytania są już w przykładach.'
        : 'W rozmowach nie ma treści pytań (wymaga rejestracji na poziomie 2 lub 3 i zgody pacjentów).',
  );
  renderLearn();
});

$('#learn-accept-all').addEventListener('click', () => {
  const L = state.learn;
  const ready = L.inbox.filter((i) => i.chosen);
  ready.forEach((i) => addExample(i.chosen, i.text));
  L.inbox = L.inbox.filter((i) => !i.chosen);
  toast(ready.length ? `Dodano ${ready.length} przykładów.${L.inbox.length ? ` Bez tematu zostało: ${L.inbox.length}.` : ''}` : 'Żadne pytanie nie ma wybranego tematu.');
  learnChanged();
  renderLearn();
});

$('#learn-clear').addEventListener('click', () => {
  state.learn.inbox = [];
  renderLearn();
});

$('#learn-test-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#learn-test').value.trim();
  const box = $('#learn-test-result');
  box.textContent = '';
  if (!q || !state.learn.savedModel) return;
  const before = topIntent(state.learn.savedModel, q);
  const after = topIntent(state.learn.draftModel, q);
  const col = (title, r) => {
    const c = el('div', 'compare-col');
    c.append(el('span', 'label', title));
    if (r.knownFeatures === 0) {
      c.append(el('p', 'muted small', 'Nie zna żadnego słowa → „nie na temat”'));
      return c;
    }
    for (const x of r.ranked.slice(0, 3)) {
      const row = el('div', 'bar-row compact');
      const bar = el('div', 'bar');
      const fill = el('span');
      fill.style.width = `${Math.round(x.p * 100)}%`;
      bar.append(fill);
      row.append(el('span', 'bar-label', intentName(x.id)), bar, el('span', 'bar-n', `${Math.round(x.p * 100)}%`));
      c.append(row);
    }
    return c;
  };
  const wrap = el('div', 'compare');
  wrap.append(col('Zapisany model', before), col(learnDirty() ? 'Po Twoich zmianach' : 'Po zmianach (brak zmian)', after));
  box.append(wrap);
  if (before.id !== after.id) box.append(el('p', 'small hint', `Zmiana: ${intentName(before.id)} → ${intentName(after.id)}`));
  const add = el('button', 'btn ghost small', '+ Dodaj to pytanie do listy do nauczenia');
  add.type = 'button';
  add.addEventListener('click', () => {
    addToInbox([q], 'z testu') ? toast('Dodano do listy „Pytania do nauczenia”.') : toast('To pytanie już jest w przykładach albo na liście.');
    renderLearn();
  });
  box.append(add);
});

$('#learn-eval').addEventListener('click', () => {
  const btn = $('#learn-eval');
  btn.disabled = true;
  btn.textContent = 'Liczę…';
  // setTimeout — żeby przycisk zdążył pokazać „Liczę…” przed kilkusekundowym liczeniem.
  setTimeout(() => {
    state.learn.eval = evaluate(state.learn.draft);
    btn.disabled = false;
    btn.textContent = 'Sprawdź trafność';
    renderLearn();
  }, 30);
});

$('#learn-discard').addEventListener('click', () => {
  const L = state.learn;
  L.draft = structuredClone(L.saved);
  L.draftModel = L.savedModel;
  L.eval = null;
  renderLearn();
});

$('#learn-download').addEventListener('click', () => {
  const L = state.learn;
  if (!L.draft) return;
  download('training.json', JSON.stringify(L.draft, null, 2) + '\n', 'application/json');
  setTimeout(() => download('model.json', JSON.stringify(buildModel(L.draft, L.version || 'z-panelu')), 'application/json'), 300);
  toast('Pobrano training.json i model.json. Podmień je w trained/data/ i trained/ (wersję podbij: npm run bump -- trained patch "…").');
});

$('#learn-save').addEventListener('click', async () => {
  const L = state.learn;
  const btn = $('#learn-save');
  btn.disabled = true;
  btn.textContent = 'Uczę model…';
  try {
    const res = await fetch('/api/training', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset: L.draft }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Błąd zapisu (${res.status}).`);
    const prev = L.eval?.accuracy;
    L.saved = structuredClone(L.draft);
    L.version = data.version;
    L.savedModel = buildModel(L.saved, data.version);
    L.draftModel = L.savedModel;
    L.eval = { accuracy: data.accuracy, correct: data.correct, total: data.total, errors: evaluate(L.saved).errors };
    toast(
      `Model nauczony: trafność ${(data.accuracy * 100).toFixed(1)}%${prev != null ? ` (było ${(prev * 100).toFixed(1)}%)` : ''}, wersja trained ${data.version}. ` +
        'Wgraj trained/model.json na hosting (albo git push), żeby czat na stronie używał nowego modelu.',
    );
  } catch (err) {
    toast(`Nie zapisano: ${err.message}`, true);
  } finally {
    btn.textContent = 'Zapisz i naucz model';
    renderLearn();
  }
});

// =============================================================================
// 7. Kontrola strony
// =============================================================================

async function loadSiteCheck() {
  try {
    state.siteReport = await state.api.getSiteCheck();
  } catch {
    state.siteReport = null;
  }
  renderSite();
}

$('#site-run').addEventListener('click', async () => {
  const btn = $('#site-run');
  btn.disabled = true;
  btn.textContent = 'Sprawdzam… (do minuty)';
  try {
    state.siteReport = await state.api.runSiteCheck(sanitizeConfig(state.saved));
    toast(state.siteReport.ok ? 'Kontrola zakończona — wszystko w porządku.' : 'Kontrola zakończona — są rzeczy do sprawdzenia.', !state.siteReport.ok);
  } catch (err) {
    toast(`Nie udało się sprawdzić: ${err.message}`, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sprawdź teraz';
    renderSite();
  }
});

// Podpowiedź, gdzie poprawić link — zależnie od tego, gdzie jest używany.
function fixHint(where) {
  const w = where.join(' ');
  const hints = [];
  if (w.includes('Własna odpowiedź')) hints.push('popraw link w zakładce „Własne odpowiedzi”');
  if (w.includes('Zmieniona odpowiedź')) hints.push('popraw link w „Odpowiedzi wbudowane” (pole linków)');
  if (/Odpowiedź:|Zakładka:/.test(w)) hints.push('zmień link w „Odpowiedzi wbudowane” → „Zmień też linki” albo na stałe w shared/js/knowledge.js');
  return hints.length ? `Jak poprawić: ${hints.join('; ')}.` : '';
}

function renderSite() {
  const r = state.siteReport;
  $('#site-auto').textContent =
    state.api?.kind === 'remote'
      ? 'Serwer panelu sprawdza stronę automatycznie codziennie rano. Dodatkowo GitHub co rano wysyła e-mail, jeśli coś jest nie tak.'
      : 'W trybie lokalnym kontrola działa po kliknięciu „Sprawdź teraz”. Automatycznie co rano sprawdza ją GitHub (e-mail przy błędzie) i — po wdrożeniu — serwer panelu.';
  const count = $('#site-count');
  count.textContent = r && !r.ok ? (r.summary.unreachable ? '!' : String(r.summary.errors + r.summary.factsMissing)) : '';
  ['#site-stats', '#site-problems', '#site-facts', '#site-changes', '#site-body'].forEach((s) => ($(s).textContent = ''));
  $('#site-when').textContent = r ? `Ostatnio: ${new Date(r.checkedAt).toLocaleString('pl-PL')}` : 'Jeszcze nie sprawdzano.';
  $('#site-all').hidden = !r;
  $('#site-facts').hidden = !r;
  $('#site-changes').hidden = !r;
  if (!r) return;

  const s = r.summary;
  $('#site-stats').append(
    statTile('Linki działające', `${s.links - s.errors - s.warnings} / ${s.links}`, '', 'Linki z odpowiedzi asystentki, które otwierają właściwą stronę.'),
    statTile('Błędy', s.errors, s.errors ? 'danger' : '', 'Linki prowadzące do nieistniejących lub niedziałających stron. Pacjent trafi na błąd — popraw je jak najszybciej.'),
    statTile('Ostrzeżenia', s.warnings, s.warnings ? 'warn' : '', 'Linki działają, ale przekierowują gdzie indziej albo brakuje na stronie wskazanej sekcji. Warto sprawdzić.'),
    statTile('Brakujące fakty', s.factsMissing, s.factsMissing ? 'danger' : '', 'Ceny, telefon lub godziny, których nie znaleziono na stronie — możliwe, że klinika je zmieniła.'),
    statTile('Zmienione strony', s.changed, s.changed ? 'warn' : '', 'Strony, których treść zmieniła się od poprzedniego sprawdzenia. Przejrzyj je, czy odpowiedzi są nadal aktualne.'),
  );

  // Do poprawienia
  const problems = r.links.filter((l) => l.level === 'error' || l.level === 'warn');
  const box = $('#site-problems');
  if (s.unreachable) {
    const n = el('div', 'notice warn');
    n.append(
      el('strong', '', 'Nie udało się połączyć ze stroną kliniki. '),
      el('span', '', 'Żadna podstrona nie odpowiedziała — sprawdź połączenie z internetem albo czy strona lekarzeiterapeuci.pl działa, i spróbuj ponownie za chwilę.'),
    );
    box.append(n);
  } else if (problems.length) {
    const h = el('h3', 'group', 'Do sprawdzenia');
    box.append(h);
    for (const l of problems) {
      const card = el('article', `card problem ${l.level}`);
      const head = el('div', 'row');
      head.append(pill(l.level === 'error' ? 'błąd' : 'uwaga', l.level === 'error' ? 'safety' : 'warn'));
      const a = el('a', 'url', l.url);
      a.href = l.url;
      a.target = '_blank';
      a.rel = 'noopener';
      head.append(a);
      card.append(head, el('p', '', l.problem), el('p', 'muted small', `Używany w: ${l.where.join(' · ')}`));
      const hint = fixHint(l.where);
      if (hint) card.append(el('p', 'small hint', hint));
      box.append(card);
    }
  } else {
    box.append(el('div', 'notice', 'Wszystkie linki w odpowiedziach działają.'));
  }

  // Fakty
  const facts = $('#site-facts');
  const fh = el('h3', '', 'Fakty ze strony');
  fh.append(tip('Ceny, telefon i godziny, które asystentka podaje pacjentom. Lista jest w shared/js/knowledge.js (SITE_FACTS).'));
  facts.append(fh);
  for (const f of r.facts) {
    const row = el('div', `fact ${f.state}`);
    row.append(el('span', 'fact-icon', f.state === 'ok' ? '✓' : f.state === 'missing' ? '✗' : '?'), el('span', '', f.label));
    if (f.note) row.append(el('span', 'muted small', ` — ${f.note}`));
    facts.append(row);
  }

  // Zmiany
  const ch = $('#site-changes');
  const chh = el('h3', '', 'Zmiany na stronie');
  chh.append(tip('Porównanie z poprzednim sprawdzeniem. Zmiana nie musi oznaczać problemu — przejrzyj stronę i sprawdź, czy odpowiedzi asystentki są nadal aktualne.'));
  ch.append(chh);
  if (!r.changes.length) ch.append(el('p', 'muted small', 'Brak zmian od poprzedniego sprawdzenia (albo to pierwsze sprawdzenie).'));
  for (const c of r.changes) {
    const row = el('p', 'small');
    const a = el('a', '', c.title);
    a.href = c.url;
    a.target = '_blank';
    a.rel = 'noopener';
    row.append(a, el('span', 'muted', ` — zmieniona od ${new Date(c.since).toLocaleString('pl-PL')}`));
    ch.append(row);
  }

  // Wszystkie linki
  const body = $('#site-body');
  for (const l of r.links) {
    const tr = el('tr');
    tr.append(
      el('td', 'nowrap', l.level === 'ok' ? `✓ ${l.status || ''}` : l.level === 'error' ? `✗ ${l.status || ''}` : l.level === 'warn' ? `⚠ ${l.status || ''}` : '—'),
    );
    const td = el('td');
    const a = el('a', '', l.url);
    a.href = l.url;
    a.target = '_blank';
    a.rel = 'noopener';
    td.append(a);
    if (l.problem) td.append(el('div', 'muted small', l.problem));
    tr.append(td, el('td', 'small', l.where.join(' · ')));
    body.append(tr);
  }
}

// =============================================================================
// Elementy interfejsu
// =============================================================================

function el(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function option(value, label) {
  const o = el('option', '', label);
  o.value = value;
  return o;
}

// Ikonka „?” z krótką wskazówką (pokazywaną po najechaniu albo stuknięciu).
function tip(text) {
  const t = el('span', 'tip', '?');
  t.tabIndex = 0;
  t.dataset.tip = text;
  return t;
}

function pill(text, kind = '') {
  return el('span', `pill ${kind}`, text);
}

function statTile(label, value, kind = '', hint = '') {
  const t = el('div', `stat ${kind}`);
  const l = el('span', 'stat-label', label);
  if (hint) l.append(tip(hint));
  t.append(l, el('strong', '', String(value)));
  return t;
}

function choiceCard({ name, checked, title, text, badge, recommended, hint, status, onPick }) {
  const card = el('label', `choice${checked ? ' checked' : ''}`);
  const input = el('input');
  input.type = 'radio';
  input.name = name;
  input.checked = checked;
  input.addEventListener('change', onPick);
  const body = el('div');
  const head = el('div', 'row');
  head.append(el('strong', '', title));
  if (recommended) head.append(pill('zalecane', 'ok'));
  if (hint) head.append(tip(hint));
  body.append(head, el('p', '', text));
  if (badge || status) {
    const foot = el('div', 'row choice-foot');
    if (badge) foot.append(el('span', 'chain', badge));
    if (status) {
      const st = el('span', `status ${status.done ? 'done' : 'todo'}`, status.done ? '✓ zrobione' : '⏳ do zrobienia');
      st.title = status.hint;
      foot.append(st, tip(status.hint));
    }
    body.append(foot);
  }
  card.append(input, body);
  return card;
}

function textField(label, value, onInput, hint) {
  const wrap = el('label', 'field');
  const input = el('input');
  input.type = 'text';
  input.value = value || '';
  input.maxLength = 80;
  input.addEventListener('input', () => onInput(input.value));
  wrap.append(labelSpan(label, hint), input);
  return wrap;
}

function textArea(label, value, onInput, { id, rows = 3, placeholder = '', max, hint } = {}) {
  const wrap = el('label', 'field');
  const ta = el('textarea');
  if (id) ta.id = id;
  ta.rows = rows;
  ta.value = value || '';
  ta.placeholder = placeholder;
  if (max) ta.maxLength = max;
  const counter = max ? el('small', 'muted counter') : null;
  const update = () => counter && (counter.textContent = `${ta.value.length}/${max}`);
  ta.addEventListener('input', () => {
    update();
    onInput(ta.value);
  });
  update();
  wrap.append(labelSpan(label, hint), ta);
  if (counter) wrap.append(counter);
  return wrap;
}

// Linki jako wiersze „Etykieta | adres” — prosto do wpisania i czytelnie.
function linksField(links, onChange) {
  const wrap = el('label', 'field');
  const ta = el('textarea');
  ta.rows = 3;
  ta.placeholder = 'Etykieta | adres, np.\nKontakt | https://lekarzeiterapeuci.pl/#kontakt\nZadzwoń | tel:+48881238227';
  ta.value = (links || []).map((l) => `${l.label} | ${l.url}`).join('\n');
  const err = el('small', 'error');
  ta.addEventListener('input', () => {
    const parsed = [];
    const bad = [];
    for (const line of ta.value.split('\n').map((s) => s.trim()).filter(Boolean)) {
      const [label, ...rest] = line.split('|');
      const url = rest.join('|').trim();
      if (label.trim() && isSafeUrl(url)) parsed.push({ label: label.trim(), url });
      else bad.push(line);
    }
    err.textContent = bad.length ? `Pominięte (wymagany format „Etykieta | https://…” lub tel:/mailto:): ${bad.join('; ')}` : '';
    if (parsed.length > LIMITS.links) err.textContent += ` Maksymalnie ${LIMITS.links} linki.`;
    onChange(parsed.slice(0, LIMITS.links));
  });
  wrap.append(
    labelSpan(
      `Przyciski z linkami (opcjonalnie, maks. ${LIMITS.links})`,
      'Każdy wiersz to jeden przycisk pod odpowiedzią: najpierw napis, potem pionowa kreska i adres. Dozwolone adresy: https://, tel:, mailto:.',
    ),
    ta,
    err,
  );
  return wrap;
}

function labelSpan(text, hint) {
  const span = el('span', '', text);
  if (hint) span.append(tip(hint));
  return span;
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = el('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let toastTimer;
function toast(message, isError = false) {
  const t = $('#toast');
  t.textContent = message;
  t.classList.toggle('error', isError);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 4500);
}

// =============================================================================
// Start
// =============================================================================

(async function init() {
  const mode = localStorage.getItem(MODE_KEY);
  const endpoint = localStorage.getItem(ENDPOINT_KEY);
  const password = sessionStorage.getItem(PASSWORD_KEY);
  try {
    if (mode === 'local') return await connect(localApi());
    if (mode === 'file') return await connect(await fileApi());
    if (IS_LOCAL_HOST && mode === 'remote' && endpoint && password) return await connect(remoteApi(endpoint, password));
  } catch (err) {
    return showLogin(err.message);
  }
  showLogin();
})();
