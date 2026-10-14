// Ustawienia wyglądu panelu i strony z czatami, zapamiętywane w tej przeglądarce.
// „Tylko bot” (domyślnie włączone): na start pracujemy na bocie regułowym, więc opcje AI,
// naszego modelu i kombinacji są przysłonięte panelem „SOON” (nie usunięte — po wyłączeniu
// przełącznika wszystko wraca).
export const BOT_ONLY_KEY = 'lt-ui:bot-only';

export function getBotOnly() {
  try {
    return localStorage.getItem(BOT_ONLY_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setBotOnly(on) {
  try {
    localStorage.setItem(BOT_ONLY_KEY, on ? 'true' : 'false');
  } catch { /* pomijamy */ }
}

/**
 * Przysłania element półprzezroczystym panelem z napisem „SOON”.
 * Zawartość pod spodem zostaje widoczna, ale nie da się w nią kliknąć ani wejść klawiaturą.
 */
export function setSoon(target, on, text = 'Wkrótce — na start pracujemy na bocie regułowym') {
  if (!target) return;
  const existing = target.querySelector(':scope > .soon-cover');
  target.classList.toggle('soon-host', on);
  for (const child of target.children) if (!child.classList.contains('soon-cover')) child.inert = on;
  if (!on) return existing?.remove();
  if (existing) return;
  const cover = document.createElement('div');
  cover.className = 'soon-cover';
  const badge = document.createElement('span');
  badge.className = 'soon-badge';
  badge.textContent = 'SOON';
  const note = document.createElement('span');
  note.className = 'soon-text';
  note.textContent = text;
  cover.append(badge, note);
  // Kliknięcie w panel nie może zaznaczyć niczego pod spodem.
  cover.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  target.append(cover);
}

// Wspólny wygląd przełącznika (tworzony w JS, żeby panel i strona główna wyglądały tak samo).
export function createBotOnlyToggle(onChange) {
  const label = document.createElement('label');
  label.className = 'bot-only';
  label.title = 'Włączone: widać tylko to, co dotyczy bota regułowego. Opcje AI, naszego modelu i kombinacji są przysłonięte napisem SOON. Wyłącz, żeby je zobaczyć.';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.role = 'switch';
  input.checked = getBotOnly();
  const track = document.createElement('span');
  track.className = 'bot-only-track';
  const text = document.createElement('span');
  text.className = 'bot-only-text';
  text.textContent = 'Tylko bot';
  input.addEventListener('change', () => {
    setBotOnly(input.checked);
    onChange(input.checked);
  });
  label.append(input, track, text);
  return label;
}
