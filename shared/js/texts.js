// WSZYSTKIE TEKSTY ODPOWIEDZI ASYSTENTKI — w jednym pliku (specyfikacja v1.1, pkt 8.7).
//
// Każdy tekst ma klucz (np. "D"), przypadek ze specyfikacji (A–M) i opis dla panelu.
// Właściciel zmienia teksty bez programisty w panelu: „Odpowiedzi wbudowane”
// (zmiany zapisują się w ustawieniach panelu / panel/settings.json, z kopiami zapasowymi).
// Teksty alarmowe (A, B) są celowo NIE do zmiany w panelu — zmienia je tylko programista
// po zatwierdzeniu przez lekarza kierującego serwisem (specyfikacja, sekcja 11 pkt 3).
//
// Zasady treści (specyfikacja, sekcja 3): maks. 3–4 zdania, bez diagnoz, bez dawek,
// zawsze z przyciskiem (przyciski dobiera shared/js/knowledge.js).

export const TEXTS = {
  // --- A / B: zagrożenie życia (warstwa bezpieczeństwa, shared/js/safety.js) ---
  ALARM: {
    case: 'A',
    label: 'Karta alarmowa (czerwona, zawsze NA DOLE czatu) — A i B',
    locked: true,
    text:
      'To może być stan nagły. Proszę natychmiast zadzwonić pod numer alarmowy 112 lub 999 (pogotowie) albo udać się na najbliższy SOR. ' +
      'Konsultacja online nie zastąpi pomocy w nagłym zagrożeniu zdrowia lub życia.',
  },
  A2: {
    case: 'A',
    label: 'A — odpowiedź 1 (zielona, u góry; czerwona karta pod nią)',
    locked: true,
    text:
      'Zadbaj o swoje bezpieczeństwo i wezwij pomoc. Jeśli potrzebujesz konsultacji lekarskiej online i uważasz, ' +
      'że jesteśmy w stanie Ci pomóc — umów konsultację lekarską.',
  },
  B2: {
    case: 'B',
    label: 'B — odpowiedź 1 (zielona, u góry; czerwona karta pod nią)',
    locked: true,
    text: 'Bardzo mi przykro, że tak się czujesz. Nie jesteś z tym sam(a). Jeśli grozi Ci niebezpieczeństwo, zadzwoń pod 112.',
  },
  B2_BLISKI: {
    case: 'B',
    label: 'B — odpowiedź 1, gdy chodzi o osobę bliską',
    locked: true,
    text: 'Bardzo mi przykro, że to dotyczy kogoś bliskiego. Jeśli ktoś jest w niebezpieczeństwie, zadzwoń pod 112.',
  },
  // Decyzja właściciela (specyfikacja, sekcja 11 pkt 1): domyślnie WYŁĄCZONE.
  // Włącza się w panelu („Tryb pracy” → „Telefon wsparcia w komunikacie B”).
  B_WSPARCIE: {
    case: 'B',
    label: 'B — opcjonalna linia z telefonem wsparcia',
    locked: true,
    text: 'Możesz też zadzwonić na bezpłatny telefon wsparcia: 116 123 (dorośli) lub 116 111 (dzieci i młodzież).',
  },

  // --- C: zdrowie psychiczne ---
  C: {
    case: 'C',
    label: 'C — zdrowie psychiczne (psychiatra / psycholog / terapeuta)',
    text:
      'Przy objawach takich jak obniżony nastrój, lęk czy problemy z lekami psychiatrycznymi właściwym specjalistą jest psychiatra. ' +
      'Jeśli potrzebujesz rozmowy i wsparcia w stresie lub lęku — pomoże psycholog lub terapeuta. ' +
      'Nie oceniam objawów ani nie udzielam porad medycznych — najlepszą drogą jest zawsze konsultacja ze specjalistą.',
  },

  // --- D: dolegliwości — domyślna ścieżka ---
  D: {
    case: 'D',
    label: 'D — dolegliwości: konsultacja lekarska (domyślnie)',
    text:
      'Przy takich dolegliwościach najlepszym pierwszym krokiem jest konsultacja lekarska online. ' +
      'Lekarz oceni Twoją sytuację, omówi wyniki badań, jeśli je masz — a jeśli się nie badałeś(aś), może wystawić skierowanie na badania. ' +
      'Nie oceniam objawów ani nie udzielam porad medycznych — robi to lekarz, dlatego najlepszym krokiem jest konsultacja online.',
  },

  // --- E–H: usługi ---
  E: {
    case: 'E',
    label: 'E — recepta',
    text:
      'E-receptę wystawia lekarz po konsultacji online — nawet w 15 minut. ' +
      'Wybierz, czego potrzebujesz: konsultację lekarską, nową receptę albo kontynuację leczenia. ' +
      'To lekarz decyduje, czy wystawienie recepty jest możliwe.',
  },
  F: {
    case: 'F',
    label: 'F — L4 / zwolnienie lekarskie',
    text:
      'Zwolnienie lekarskie (L4) wystawia lekarz po konsultacji online — bez wychodzenia z domu. ' +
      'Opisz objawy w formularzu; to lekarz decyduje o zwolnieniu.',
  },
  G: {
    case: 'G',
    label: 'G — wyniki badań i skierowania',
    text: 'Lekarz omówi z Tobą wyniki badań i zaplanuje dalsze kroki. Jeśli nie masz jeszcze badań — lekarz może wystawić skierowanie.',
  },
  H: {
    case: 'H',
    label: 'H — usługi dla kobiet i mężczyzn',
    text:
      'Konsultacja online jest dostępna całą dobę, a e-recepta — w kilka minut. Dyskretnie i bez wizyty stacjonarnej. ' +
      'To lekarz decyduje o leczeniu.',
  },

  // --- I: dawki leków ---
  I: {
    case: 'I',
    label: 'I — pytanie o dawkę leku / opinię medyczną',
    text:
      'Nie podaję dawek leków ani nie doradzam w leczeniu — dawkę zawsze ustala lekarz lub farmaceuta na podstawie ulotki i Twojej sytuacji. ' +
      'Chętnie pomogę umówić konsultację z lekarzem.',
  },

  // --- J: cennik ---
  // {cena} zastępuje zdanie z ceną rozpoznanej usługi (tabela SERVICES w knowledge.js).
  J: {
    case: 'J',
    label: 'J — cena rozpoznanej usługi ({cena} = zdanie z ceną usługi i usługi pokrewnej)',
    text: '{cena} Wybierz i umów od razu:',
  },
  J_OGOLNY: {
    case: 'J',
    label: 'J — cennik, gdy usługa nie jest rozpoznana ({ceny} = 4 najczęstsze)',
    text: 'Najczęściej wybierane: {ceny}. Wybierz i umów od razu:',
  },

  // --- K: jak umówić / jaki specjalista / kontakt ---
  K: {
    case: 'K',
    label: 'K — jak umówić wizytę',
    text:
      'To proste: 1) wybierz usługę, 2) wybierz specjalistę, 3) umów termin (telefon lub wideo), ' +
      '4) rozmawiaj z lekarzem — e-recepty i zwolnienia przychodzą online. Lekarze są dostępni 24/7.',
  },
  K_SPECJALISTA: {
    case: 'K',
    label: 'K — jaki specjalista?',
    text:
      'Jaki specjalista? Dolegliwości i choroby → lekarz. Nastrój, lęk, leki psychiatryczne → psychiatra. ' +
      'Rozmowa i wsparcie → psycholog lub terapeuta. Każdą konsultację umówisz online.',
  },
  K_KONTAKT: {
    case: 'K',
    label: 'K — kontakt (infolinia, e-mail)',
    text: 'Infolinia: {telefon} ({godziny}), e-mail: {email}. Szczegóły w zakładce „Kontakt”.',
  },
  K_DLA_LEKARZY: {
    case: 'K',
    label: 'K — współpraca dla lekarzy i firm',
    text: 'Informacje o współpracy dla lekarzy i terapeutów znajdziesz w zakładce „Dla lekarzy”. Oferta dla pracodawców — „Dla firm”.',
  },
  K_KONTO: {
    case: 'K',
    label: 'K — konto i logowanie',
    text: 'Do konta zalogujesz się w zakładce „Zaloguj się”. Przy problemach z logowaniem pomoże infolinia: {telefon}.',
  },
  K_PRAWNE: {
    case: 'K',
    label: 'K — regulamin, prywatność, zwroty',
    text:
      'Zasady korzystania z serwisu, ochrony danych i reklamacji opisują „Regulamin” i „Polityka prywatności”. ' +
      'W sprawach indywidualnych (zwroty, faktury) prosimy o kontakt z infolinią.',
  },

  // --- L: niejasne / poza tematem ---
  L: {
    case: 'L',
    label: 'L — niejasne pytanie / poza tematem',
    text:
      'Nie jestem pewna, czego dotyczy pytanie. Proszę opisać je krótko — z jakim problemem zdrowotnym jest związane. ' +
      'Na przykład: skóra, konsultacja lekarska, recepta, L4, tabletka „dzień po”. Wtedy będę mogła pomóc.',
  },

  // --- M: powitanie / podziękowanie ---
  // {imie} — imię pacjenta z ekranu powitalnego (zostaje w przeglądarce).
  M: {
    case: 'M',
    label: 'M — powitanie (start czatu i „cześć”); {imie} = imię pacjenta',
    text:
      'Dzień dobry{imie}! Jestem {asystentka}, wirtualna konsultantka. Nie jestem lekarzem i nie udzielam porad medycznych — ' +
      'pomogę wybrać właściwą konsultację. Opisz krótko, w czym mogę pomóc, albo wybierz poniżej (ceny przy każdej usłudze).',
  },
  M_DZIEKUJE: {
    case: 'M',
    label: 'M — po „dziękuję”',
    text: 'Proszę! Jeśli będziesz potrzebować konsultacji, jestem tutaj.',
  },
};

// Stałe napisy interfejsu czatu (specyfikacja, pkt 8.6, 8.9).
export const UI_TEXTS = {
  placeholder: 'Opisz własnymi słowami, w czym możemy pomóc',
  emergencyFooter: 'W nagłym zagrożeniu życia dzwoń 112 lub 999.',
  alarmTitle: 'komunikat alarmowy',
  writeToUs: 'Napisz do nas',
};

// Opisy przypadków do panelu i rejestru rozmów.
export const CASE_LABELS = {
  A: 'A — zagrożenie życia',
  B: 'B — kryzys psychiczny',
  C: 'C — zdrowie psychiczne',
  D: 'D — dolegliwości → lekarz',
  E: 'E — recepta',
  F: 'F — L4',
  G: 'G — wyniki / skierowanie',
  H: 'H — kobiety / mężczyźni',
  I: 'I — dawka leku',
  J: 'J — cennik',
  K: 'K — jak umówić / kontakt',
  L: 'L — niejasne / poza tematem',
  M: 'M — powitanie',
};
