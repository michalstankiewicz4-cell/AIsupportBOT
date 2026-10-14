// Czytelne nazwy tematów (intencji) do panelu i raportów.
export const INTENT_LABELS = {
  psychiatra: 'Psychiatra',
  psycholog: 'Psycholog / terapeuta',
  bezsennosc: 'Bezsenność',
  otylosc: 'Leczenie otyłości',
  cukrzyca: 'Cukrzyca',
  serce: 'Nadciśnienie i serce',
  tarczyca: 'Tarczyca',
  migrena: 'Migrena / ból głowy',
  zoladek: 'Problemy żołądkowe',
  uklad_moczowy: 'Układ moczowy',
  skora: 'Dermatologia',
  alergia: 'Alergie i astma',
  infekcja: 'Infekcje i przeziębienia',
  ginekologia: 'Ginekologia',
  antykoncepcja: 'Antykoncepcja',
  dzien_po: 'Tabletka „dzień po”',
  trt: 'TRT / zdrowie mężczyzn',
  recepta: 'e-Recepta',
  l4: 'L4',
  wyniki: 'Omówienie wyników',
  skierowanie: 'Skierowanie',
  kontynuacja: 'Kontynuacja leczenia',
  badania_dom: 'Badania w domu',
  inny_specjalista: 'Inny specjalista (laryngolog, okulista…)',
  jaki_specjalista: '„Jakiego specjalisty potrzebuję?”',
  cennik: 'Cennik',
  jak_dziala: 'Jak to działa',
  umow: 'Umawianie wizyty',
  kontakt: 'Kontakt',
  dla_lekarzy: 'Dla lekarzy i firm',
  konto: 'Konto i logowanie',
  prawne: 'Regulamin, RODO, zwroty',
  powitanie: 'Powitanie',
  podziekowanie: 'Podziękowanie',
  opinia: 'Prośba o diagnozę / dawkowanie (odmowa)',
  offtopic: 'Pytania nie na temat',
  fallback: 'Nie rozpoznano pytania',
  emergency: 'Stan nagły (112)',
  crisis: 'Kryzys psychiczny',
  ai: 'AI — odpowiedź swobodna',
  error: 'Błąd',
  empty: 'Pusta wiadomość',
};

export const ENGINE_LABELS = { bot: 'Bot', trained: 'Nasz model', ai: 'AI', auto: 'Kombinacja' };

export const SOURCE_LABELS = {
  engine: 'Silnik',
  custom: 'Własna odpowiedź',
  safety: 'Bezpieczeństwo',
};

// Nazwa tematu z uwzględnieniem własnych reguł i połączeń „opinia + temat”.
export function intentLabel(intent, rules = []) {
  if (!intent) return '—';
  if (intent.startsWith('custom:')) {
    const rule = rules.find((r) => r.id === intent.slice(7));
    return `Własna: ${rule?.name || rule?.phrases?.[0] || intent.slice(7)}`;
  }
  if (intent.startsWith('opinia+')) return `Odmowa opinii → ${INTENT_LABELS[intent.slice(7)] || intent.slice(7)}`;
  return INTENT_LABELS[intent] || intent;
}

// Czy wpis oznacza pytanie, którego asystentka nie umiała obsłużyć (kandydat do nauki).
export function isUnanswered(intent) {
  return intent === 'fallback' || intent === 'error';
}
