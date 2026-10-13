// Baza wiedzy o lekarzeiterapeuci.pl — jedno źródło prawdy dla
// wszystkich trzech asystentów. Gdy zmieni się strona (zakładki, ceny, telefon,
// usługi), poprawiaj tutaj, a nie w silnikach.
//
// Słowa kluczowe piszemy BEZ polskich znaków i małymi literami
// (patrz normalize() w shared/js/text.js). Gwiazdka "*" na końcu oznacza "początek słowa",
// np. "alergi*" pasuje do "alergia", "alergii", "alergiczny".

export const SITE = {
  name: 'Lekarze i Terapeuci',
  base: 'https://lekarzeiterapeuci.pl',
  phone: '+48 881 238 227',
  phoneHref: 'tel:+48881238227',
  email: 'kontakt@lekarzeiterapeuci.pl',
  hours: 'pon–pt 8:00–20:00, sob–niedz 9:00–18:00',
};

const B = SITE.base;
const form = (service) =>
  service ? `${B}/wypelnij-formularz?service=${encodeURIComponent(service).replace(/%20/g, '+')}` : `${B}/wypelnij-formularz`;

// Zakładki / podstrony, do których asystent może kierować.
export const PAGES = {
  book: { label: 'Umów wizytę', url: form() },
  services: { label: 'Usługi', url: `${B}/#uslugi` },
  pricing: { label: 'Cennik', url: `${B}/#cennik` },
  how: { label: 'Jak to działa?', url: `${B}/jak-to-dziala` },
  womenMen: { label: 'Dla kobiet i mężczyzn', url: `${B}/dla-kobiet-i-mezczyzn` },
  conditions: { label: 'Choroby i stany', url: `${B}/conditions` },
  knowledge: { label: 'Baza wiedzy', url: `${B}/baza-wiedzy` },
  homeTests: { label: 'Badania w domu', url: `${B}/badania-w-domu` },
  doctors: { label: 'Dla lekarzy', url: `${B}/dla-lekarzy` },
  companies: { label: 'Dla firm', url: `${B}/dla-firm` },
  contact: { label: 'Kontakt', url: `${B}/#kontakt` },
  login: { label: 'Zaloguj się', url: `${B}/login` },
  terms: { label: 'Regulamin', url: `${B}/warunki-umowy` },
  privacy: { label: 'Polityka prywatności', url: `${B}/polityka-prywatnosci` },
  phone: { label: `Zadzwoń: ${SITE.phone}`, url: SITE.phoneHref },
};

// Zdanie dopisywane do każdej odpowiedzi kierującej — główna zasada asystenta.
export const DOCTOR_FIRST =
  'Nie oceniam objawów ani nie udzielam porad medycznych — najlepszą drogą jest zawsze konsultacja z lekarzem.';

// Stała odpowiedź na pytania nie na temat / bez sensu (zgodnie z założeniami).
export const OFFTOPIC_REPLY = {
  text:
    'Jestem asystentem serwisu Lekarze i Terapeuci i pomagam tylko w sprawach związanych z naszymi usługami i konsultacjami. ' +
    `W innych sprawach prosimy o kontakt z infolinią: ${SITE.phone} (${SITE.hours}) lub e-mail ${SITE.email}.`,
  links: [PAGES.phone, PAGES.contact],
};

// Odpowiedź, gdy nic nie zostało dopasowane z wystarczającą pewnością.
export const FALLBACK_REPLY = {
  text:
    'Nie jestem pewien, czego dotyczy pytanie. Proszę opisać krótko, z jakim problemem zdrowotnym lub usługą jest związane ' +
    `(np. „skóra”, „recepta”, „L4”), albo skontaktować się z infolinią: ${SITE.phone}.`,
  links: [PAGES.book, PAGES.phone],
  chips: ['Jakiego specjalisty potrzebuję?', 'Cennik', 'Jak umówić wizytę?'],
};

// Odpowiedź na prośby o diagnozę, dawkowanie lub opinię — zawsze odmowa.
export const NO_OPINION_REPLY = {
  text:
    'Nie mogę ocenić objawów, postawić diagnozy ani doradzić dawkowania leków — to może zrobić wyłącznie lekarz. ' +
    'Proszę umówić konsultację online (telefon lub wideo, często tego samego dnia).',
  links: [PAGES.book, PAGES.phone],
};

// Odpowiedź w stanie nagłym (pokazuje ją shared/js/safety.js przed uruchomieniem silnika).
export const EMERGENCY_REPLY = {
  text:
    'To może być stan nagły. Proszę natychmiast zadzwonić pod numer alarmowy 112 lub 999 (pogotowie) albo udać się na najbliższy SOR. ' +
    'Konsultacja online nie zastąpi pomocy w nagłym zagrożeniu zdrowia lub życia.',
  links: [{ label: 'Zadzwoń 112', url: 'tel:112' }],
  emergency: true,
};

export const CRISIS_REPLY = {
  text:
    'Bardzo mi przykro, że tak się czujesz. Nie jesteś z tym sam(a). Jeśli grozi Ci niebezpieczeństwo, zadzwoń teraz pod 112. ' +
    'Możesz też porozmawiać z kimś od razu: Centrum Wsparcia dla Osób Dorosłych w Kryzysie Psychicznym 800 70 2222 (całą dobę, bezpłatnie) ' +
    'lub Telefon Zaufania 116 123. Dzieci i młodzież: 116 111. Gdy będziesz bezpieczny(-a), nasz psychiatra lub psycholog może pomóc w dalszym leczeniu.',
  links: [
    { label: 'Zadzwoń 112', url: 'tel:112' },
    { label: '800 70 2222', url: 'tel:800702222' },
    { label: '116 123', url: 'tel:116123' },
  ],
  emergency: true,
};

// ---------------------------------------------------------------------------
// Intencje. Każda intencja ma:
//   id        — stały identyfikator (używany przez model trained i testy)
//   keywords  — słowa kluczowe dla bota regułowego
//   answer    — { text, links, chips? } pokazywane pacjentowi
//   routing   — true, jeśli to odpowiedź "do jakiego specjalisty" (dodaje DOCTOR_FIRST)
// ---------------------------------------------------------------------------

const svc = (label, service) => ({ label, url: form(service) });

export const INTENTS = [
  // --- Kierowanie do specjalisty / usługi -----------------------------------
  {
    id: 'psychiatra',
    routing: true,
    keywords: ['depresj*', 'lek', 'leku', 'boje sie', 'strach*', 'lekam sie', 'lekowe', 'lekowy', 'lekowa', 'lekam', 'panik*', 'psychiatr*', 'antydepres*', 'nerwic*', 'adhd', 'zaburzen*', 'smutek', 'smutn*', 'apati*', 'obsesj*', 'natrectw*', 'chad', 'dwubiegunow*'],
    answer: {
      text: 'Przy objawach takich jak obniżony nastrój, lęk czy problemy z lekami psychiatrycznymi właściwym specjalistą jest psychiatra. W zakładce „Usługi” znajdziesz „Psychiatra Online” oraz „Leki psychiatryczne”.',
      links: [svc('Psychiatra online', 'Psychiatra Online'), svc('Leki psychiatryczne', 'Leki psychiatryczne'), { label: 'Depresja i lęk — informacje', url: `${B}/conditions/depresja-i-zaburzenia-lekowe` }],
    },
  },
  {
    id: 'psycholog',
    routing: true,
    keywords: ['psycholog*', 'terapeut*', 'terapi*', 'psychoterap*', 'stres*', 'wypalen*', 'rozstan*', 'zaloba', 'samotn*', 'porozmawiac z kims', 'kryzys', 'relacj*', 'zwiazek', 'zwiazku'],
    answer: {
      text: 'Jeśli potrzebujesz rozmowy, wsparcia w stresie, kryzysie lub trudnościach w relacjach, odpowiednia będzie konsultacja z psychologiem / terapeutą (zakładka „Usługi” → „Psycholog / Terapeuta”).',
      links: [svc('Psycholog / Terapeuta', 'Psycholog / Terapeuta')],
    },
  },
  {
    id: 'bezsennosc',
    routing: true,
    keywords: ['bezsenn*', 'spac', 'sen', 'snu', 'zasnac', 'zasypia*', 'budze', 'wybudza*', 'nasenn*'],
    answer: {
      text: 'Problemy ze snem warto omówić z lekarzem podczas konsultacji online — w zależności od przyczyny może to być lekarz ogólny lub psychiatra. Więcej informacji w zakładce „Choroby i stany” → „Bezsenność”.',
      links: [{ label: 'Bezsenność — informacje', url: `${B}/conditions/bezsennosc` }, svc('Konsultacja online', 'Konsultacja online')],
    },
  },
  {
    id: 'otylosc',
    routing: true,
    keywords: ['otylo*', 'nadwag*', 'schudn*', 'odchudz*', 'wag*', 'kilogram*', 'bmi', 'ozempic', 'wegovy', 'mounjaro', 'saxenda', 'apetyt'],
    answer: {
      text: 'Sprawy związane z nadwagą i otyłością prowadzi u nas lekarz w ramach usługi „Leczenie otyłości” (zakładka „Usługi”).',
      links: [svc('Leczenie otyłości', 'Leczenie otyłości'), { label: 'Otyłość — informacje', url: `${B}/conditions/otylosc` }],
    },
  },
  {
    id: 'cukrzyca',
    routing: true,
    keywords: ['cukrzyc*', 'cukier', 'cukru', 'glukoz*', 'insulin*', 'metformin*', 'glikem*'],
    answer: {
      text: 'W sprawie cukrzycy i poziomu cukru zapraszamy na wizytę lekarską online — lekarz omówi wyniki i dalsze leczenie. Informacje znajdziesz w „Choroby i stany” → „Cukrzyca”.',
      links: [svc('Wizyta lekarska', 'Konsultacja online'), { label: 'Cukrzyca — informacje', url: `${B}/conditions/cukrzyca` }],
    },
  },
  {
    id: 'serce',
    routing: true,
    keywords: ['nadcisnien*', 'cisnieni*', 'serc*', 'kardiolog*', 'kolatan*', 'arytmi*', 'tetno', 'cholesterol*'],
    answer: {
      text: 'Ciśnienie i sprawy sercowo-naczyniowe omówisz z lekarzem w usłudze „Nadciśnienie i serce” (zakładka „Usługi”). Uwaga: silny ból w klatce piersiowej lub duszność to wskazanie do pilnego kontaktu z 112.',
      links: [svc('Nadciśnienie i serce', 'Nadciśnienie i serce'), { label: 'Nadciśnienie — informacje', url: `${B}/conditions/nadcisnienie-tetnicze` }],
    },
  },
  {
    id: 'tarczyca',
    routing: true,
    keywords: ['tarczyc*', 'hashimoto', 'tsh', 'euthyrox', 'letrox', 'endokrynolog*', 'hormon*'],
    answer: {
      text: 'Tarczycę i Hashimoto omówisz z lekarzem na wizycie online (również omówienie wyników TSH). Więcej w „Choroby i stany” → „Niedoczynność tarczycy i Hashimoto”.',
      links: [svc('Omówienie wyników badań', 'Omówienie wyników badań'), { label: 'Tarczyca — informacje', url: `${B}/conditions/niedoczynnosc-tarczycy` }],
    },
  },
  {
    id: 'migrena',
    routing: true,
    keywords: ['migren*', 'glowa', 'glowy', 'glowe', 'glowie', 'neurolog*', 'aura'],
    answer: {
      text: 'Przy nawracających bólach głowy i migrenie zapraszamy na konsultację lekarską online. Informacje znajdziesz w „Choroby i stany” → „Migrena”. Nagły, bardzo silny ból głowy lub zaburzenia mowy/widzenia wymagają pilnego kontaktu z 112.',
      links: [svc('Konsultacja online', 'Konsultacja online'), { label: 'Migrena — informacje', url: `${B}/conditions/migrena` }],
    },
  },
  {
    id: 'zoladek',
    routing: true,
    keywords: ['zoladk*', 'zgag*', 'refluks*', 'brzuch*', 'jelit*', 'biegunk*', 'zapar*', 'wzdec*', 'nudnosc*', 'trawien*', 'gastrolog*'],
    answer: {
      text: 'Dolegliwości żołądkowe i trawienne skonsultujesz w usłudze „Problemy żołądkowe” (zakładka „Usługi”). Informacje o refluksie: „Choroby i stany” → „Refluks”.',
      links: [svc('Problemy żołądkowe', 'Problemy żołądkowe'), { label: 'Refluks — informacje', url: `${B}/conditions/refluks-zoladkowo-przelykowy` }],
    },
  },
  {
    id: 'uklad_moczowy',
    routing: true,
    keywords: ['pecherz*', 'mocz*', 'sikan*', 'pieczen*', 'cystit*', 'urolog*', 'nerk*'],
    answer: {
      text: 'Dolegliwości układu moczowego omówisz z lekarzem na konsultacji online. Więcej w „Choroby i stany” → „Zakażenia układu moczowego”.',
      links: [svc('Konsultacja online', 'Konsultacja online'), { label: 'Układ moczowy — informacje', url: `${B}/conditions/zakazenie-ukladu-moczowego` }],
    },
  },
  {
    id: 'skora',
    routing: true,
    keywords: ['skora', 'skory', 'skorze', 'skore', 'skorn*', 'tradzik*', 'wysypk*', 'pryszcz*', 'dermatolog*', 'luszczyc*', 'egzem*', 'atopow*', 'swedz*', 'swiad', 'swiadu', 'znamie', 'pieprzyk*', 'wlos*', 'paznok*'],
    answer: {
      text: 'Sprawy skóry, włosów i paznokci prowadzi dermatolog — zakładka „Usługi” → „Dermatologia online”. Możesz przygotować zdjęcia zmian na konsultację.',
      links: [svc('Dermatologia online', 'Dermatologia online'), { label: 'Trądzik — informacje', url: `${B}/conditions/tradzik` }],
    },
  },
  {
    id: 'alergia',
    routing: true,
    keywords: ['alergi*', 'uczulen*', 'astm*', 'katar sienny', 'pylk*', 'inhalator*', 'wziewn*', 'antyhistamin*'],
    answer: {
      text: 'Alergie i astmę skonsultujesz w usłudze „Alergie i astma” (zakładka „Usługi”), gdzie lekarz może też kontynuować leczenie wziewne.',
      links: [svc('Alergie i astma', 'Alergie i astma'), { label: 'Alergia — informacje', url: `${B}/conditions/alergia` }],
    },
  },
  {
    id: 'infekcja',
    routing: true,
    keywords: ['infekcj*', 'przezie*', 'gryp*', 'goraczk*', 'kaszel', 'kaszl*', 'katar', 'gardl*', 'zatok*', 'covid', 'antybiotyk*', 'chory', 'chora', 'temperatur*'],
    answer: {
      text: 'Przy infekcji, przeziębieniu czy grypie skorzystaj z usługi „Infekcje i przeziębienia” (zakładka „Usługi”). W razie potrzeby lekarz może też wystawić L4.',
      links: [svc('Infekcje i przeziębienia', 'Infekcje i przeziębienia'), svc('L4 online', 'L4 online')],
    },
  },
  {
    id: 'ginekologia',
    routing: true,
    keywords: ['ginekolog*', 'okres', 'miesiaczk*', 'menstruac*', 'ciaz*', 'menopauz*', 'uplaw*', 'pochw*', 'infekcja intymna'],
    answer: {
      text: 'Sprawy ginekologiczne omówisz w usłudze „Ginekologia online” (zakładki „Usługi” oraz „Dla kobiet i mężczyzn”). Badanie fizykalne, jeśli będzie potrzebne, lekarz zaleci stacjonarnie.',
      links: [svc('Ginekologia online', 'Ginekologia online'), PAGES.womenMen],
    },
  },
  {
    id: 'antykoncepcja',
    routing: true,
    keywords: ['antykoncep*', 'tabletki antykoncepcyjne', 'pigulk*', 'plastr*', 'krazek'],
    answer: {
      text: 'Dobór i kontynuację antykoncepcji znajdziesz w zakładce „Dla kobiet i mężczyzn” → „Antykoncepcja” (od 59 zł).',
      links: [svc('Antykoncepcja', 'Antykoncepcja'), PAGES.womenMen],
    },
  },
  {
    id: 'dzien_po',
    routing: true,
    keywords: ['dzien po', 'dniu po', 'antykoncepcja awaryjna', 'awaryjn*', 'ellaone', 'escapelle', 'peklo*', 'pekla'],
    answer: {
      text: 'Antykoncepcję awaryjną omówisz z lekarzem w usłudze „Tabletka dzień po” (zakładka „Dla kobiet i mężczyzn”, od 45 zł). Liczy się czas — warto zgłosić się jak najszybciej.',
      links: [svc('Tabletka „dzień po”', 'Tabletka dzień po'), PAGES.womenMen],
    },
  },
  {
    id: 'trt',
    routing: true,
    keywords: ['testosteron*', 'trt', 'androlog*', 'libido', 'potencj*', 'erekcj*'],
    answer: {
      text: 'Sprawy związane z testosteronem i zdrowiem męskim znajdziesz w zakładce „Dla kobiet i mężczyzn” → „TRT (terapia testosteronem)” (od 199 zł).',
      links: [svc('TRT — testosteron', 'TRT Testosteron'), PAGES.womenMen],
    },
  },
  {
    id: 'recepta',
    routing: true,
    keywords: ['recept*', 'erecept*', 'e recept*', 'przepisa*', 'wypisa*'],
    answer: {
      text: 'E-receptę możesz zamówić w usłudze „e-Recepta online” (od 59 zł). Lekarz wystawia receptę po konsultacji, jeśli uzna to za uzasadnione.',
      links: [svc('e-Recepta online', 'e-Recepta online'), PAGES.pricing],
    },
  },
  {
    id: 'l4',
    routing: true,
    keywords: ['l4', 'zwolnien*', 'chorobow*', 'zus'],
    answer: {
      text: 'Zwolnienie lekarskie załatwisz w usłudze „L4 online” (od 79 zł). O wystawieniu L4 decyduje lekarz po konsultacji.',
      links: [svc('L4 online', 'L4 online'), PAGES.pricing],
    },
  },
  {
    id: 'wyniki',
    routing: true,
    keywords: ['wynik*', 'morfologi*', 'badani* krwi', 'analiz*', 'interpret*'],
    answer: {
      text: 'Wyniki badań omówi lekarz w usłudze „Omówienie wyników badań” (od 79 zł). Badania możesz też wykonać w domu — zakładka „Badania w domu”.',
      links: [svc('Omówienie wyników badań', 'Omówienie wyników badań'), PAGES.homeTests],
    },
  },
  {
    id: 'skierowanie',
    routing: true,
    keywords: ['skierowan*'],
    answer: {
      text: 'Skierowanie na badania, zabiegi lub do specjalisty możesz uzyskać w usłudze „Skierowanie” (od 79 zł), jeśli lekarz uzna je za wskazane.',
      links: [svc('Skierowanie', 'Skierowanie na badania')],
    },
  },
  {
    id: 'kontynuacja',
    routing: true,
    keywords: ['kontynuac*', 'przedluz*', 'stale leki', 'leki na stale', 'skonczyly', 'koncza'],
    answer: {
      text: 'Przedłużenie dotychczasowego leczenia znajdziesz w usłudze „Kontynuacja leczenia” (od 59 zł). Przygotuj nazwy i dawki obecnych leków.',
      links: [svc('Kontynuacja leczenia', 'Kontynuacja leczenia')],
    },
  },
  {
    id: 'badania_dom',
    routing: false,
    keywords: ['badania w domu', 'badan w domu', 'pobranie krwi', 'pielegniar*', 'dojazd*'],
    answer: {
      text: 'Informacje o wykonywaniu badań w domu znajdziesz w zakładce „Badania w domu”.',
      links: [PAGES.homeTests],
    },
  },
  {
    id: 'inny_specjalista',
    routing: true,
    keywords: ['laryngolog*', 'okulist*', 'pediatr*', 'ortoped*', 'stomatolog*', 'dentyst*', 'reumatolog*', 'onkolog*', 'chirurg*', 'ucho', 'uszu', 'ucha', 'oko', 'oczy', 'oczu', 'wzrok*', 'zab', 'zeby', 'zeba', 'kregoslup*', 'kolano', 'kolana', 'staw*', 'plecy', 'plecow'],
    answer: {
      text: 'Z tym problemem najlepiej zacząć od ogólnej wizyty lekarskiej online — lekarz oceni sytuację i w razie potrzeby wystawi skierowanie do odpowiedniego specjalisty.',
      links: [svc('Wizyta lekarska', 'Konsultacja online'), svc('Skierowanie', 'Skierowanie na badania')],
    },
  },
  {
    id: 'jaki_specjalista',
    routing: true,
    keywords: ['jakiego lekarza', 'jaki lekarz', 'jaki specjalist*', 'jakiego specjalist*', 'do kogo', 'ktory lekarz', 'ktorego lekarza', 'specjalist*', 'lekarz rodzinny', 'internist*'],
    answer: {
      text: 'Chętnie wskażę właściwą zakładkę. Napisz w kilku słowach, czego dotyczy problem (np. skóra, sen, nastrój, ciśnienie, infekcja). Jeśli nie wiesz — wybierz „Wizyta lekarska”: lekarz ogólny oceni sprawę i w razie potrzeby wystawi skierowanie.',
      links: [svc('Wizyta lekarska', 'Konsultacja online'), PAGES.conditions],
      chips: ['Skóra', 'Nastrój / lęk', 'Infekcja', 'Ciśnienie / serce'],
    },
  },

  // --- Informacje o serwisie ------------------------------------------------
  {
    id: 'cennik',
    keywords: ['cena', 'ceny', 'cenie', 'cenach', 'cennik*', 'koszt*', 'kosztuj*', 'ile placi*', 'zaplac*', 'platnosc*', 'oplat*', 'zl', 'zlotych', 'nfz', 'refundac*', 'darmow*'],
    answer: {
      text: 'Przykładowe ceny: e-recepta i kontynuacja leczenia od 59 zł, L4 / wizyta lekarska / wyniki / skierowanie od 79 zł, psycholog 169 zł, psychiatra 259 zł, leczenie otyłości 129 zł. Płatność następuje przed konsultacją. Aktualne ceny zawsze w zakładce „Cennik”.',
      links: [PAGES.pricing],
    },
  },
  {
    id: 'jak_dziala',
    keywords: ['jak to dziala', 'jak dziala', 'jak wyglada', 'przebieg*', 'wideo', 'oddzwani*', 'ile trwa', 'bezpieczn*', 'legaln*'],
    answer: {
      text: 'Wybierasz usługę, specjalistę i termin, płacisz, a lekarz kontaktuje się telefonicznie lub wideo — często jeszcze tego samego dnia. Szczegóły w zakładce „Jak to działa?”.',
      links: [PAGES.how, PAGES.book],
    },
  },
  {
    id: 'umow',
    weight: 0.8, // ogólne słowa — konkretna usługa powinna wygrać
    keywords: ['umow*', 'zapis*', 'rezerw*', 'termin*', 'wizyt*', 'konsultacj*', 'zamow*', 'formularz*'],
    answer: {
      text: 'Wizytę umówisz przyciskiem „Umów wizytę”: wybierasz usługę, specjalistę oraz dzień i godzinę konsultacji telefonicznej lub wideo.',
      links: [PAGES.book, PAGES.how],
    },
  },
  {
    id: 'kontakt',
    keywords: ['kontakt*', 'telefon*', 'infolini*', 'numer', 'mail*', 'email', 'godzin*', 'otwar*', 'czynne', 'zadzwon*', 'adres'],
    answer: {
      text: `Infolinia: ${SITE.phone} (${SITE.hours}), e-mail: ${SITE.email}. Szczegóły w zakładce „Kontakt”.`,
      links: [PAGES.phone, PAGES.contact],
    },
  },
  {
    id: 'dla_lekarzy',
    keywords: ['praca', 'pracy', 'zatrudn*', 'wspolprac*', 'jestem lekarzem', 'dla lekarzy', 'rekrutac*'],
    answer: {
      text: 'Informacje o współpracy dla lekarzy i terapeutów znajdziesz w zakładce „Dla lekarzy”. Oferta dla pracodawców — „Dla firm”.',
      links: [PAGES.doctors, PAGES.companies],
    },
  },
  {
    id: 'konto',
    keywords: ['logow*', 'zaloguj*', 'konto', 'konta', 'haslo', 'hasla', 'rejestrac*', 'profil'],
    answer: {
      text: `Do konta zalogujesz się w zakładce „Zaloguj się”. Przy problemach z logowaniem pomoże infolinia: ${SITE.phone}.`,
      links: [PAGES.login, PAGES.phone],
    },
  },
  {
    id: 'prawne',
    keywords: ['regulamin*', 'rodo', 'prywatnosc*', 'cookies', 'dane osobowe', 'reklamac*', 'zwrot*', 'faktur*'],
    answer: {
      text: 'Zasady korzystania z serwisu, ochrony danych i reklamacji opisują „Regulamin” i „Polityka prywatności”. W sprawach indywidualnych (zwroty, faktury) prosimy o kontakt z infolinią.',
      links: [PAGES.terms, PAGES.privacy, PAGES.phone],
    },
  },
  {
    id: 'powitanie',
    keywords: ['dzien dobry', 'witam', 'czesc', 'hej', 'siema', 'halo', 'dobry wieczor'],
    answer: {
      text: 'Dzień dobry! Pomogę znaleźć właściwego specjalistę i zakładkę na stronie. Czego dotyczy Twoja sprawa?',
      chips: ['Jakiego specjalisty potrzebuję?', 'Cennik', 'Jak umówić wizytę?', 'Kontakt'],
    },
  },
  {
    id: 'podziekowanie',
    keywords: ['dziekuj*', 'dzieki', 'thx', 'super', 'ok dzieki'],
    answer: {
      text: 'Proszę bardzo! Gdyby coś jeszcze było niejasne — jestem tutaj. Zdrowia!',
    },
  },
  {
    id: 'opinia',
    keywords: ['dawk*', 'ile tabletek', 'ile brac', 'jak brac', 'czy to rak', 'czy to grozne', 'czy to powazne', 'diagnoz*', 'co mi jest', 'co to moze byc', 'czy moge brac', 'czy moge laczyc', 'skutki uboczne', 'co mam brac', 'jaki lek', 'jakie leki'],
    answer: NO_OPINION_REPLY,
  },
  {
    id: 'offtopic',
    keywords: ['polityk*', 'wybor*', 'rzad*', 'prezydent*', 'premier*', 'sejm*', 'partia', 'partii', 'pogod*', 'deszcz*', 'mecz*', 'pilk*', 'sport*', 'przepis na', 'film*', 'serial*', 'zart*', 'dowcip*', 'bitcoin*', 'krypto*', 'gielda', 'programowa*', 'javascript', 'python', 'wiersz*', 'piosenk*', 'gra', 'gry', 'horoskop*', 'pizza', 'wojna', 'wojn*'],
    answer: OFFTOPIC_REPLY,
  },
];

export const INTENT_BY_ID = Object.fromEntries(INTENTS.map((i) => [i.id, i]));

// Buduje końcową odpowiedź dla id intencji (dodaje zasadę „najpierw lekarz”).
export function replyFor(intentId) {
  const intent = INTENT_BY_ID[intentId];
  if (!intent) return { ...FALLBACK_REPLY, intent: 'fallback' };
  const a = intent.answer;
  const text = intent.routing ? `${a.text} ${DOCTOR_FIRST}` : a.text;
  return { text, links: a.links || [], chips: a.chips || [], intent: intentId };
}

// Zwięzły tekstowy opis strony wstawiany do promptu modelu
// (wariant ai), żeby model wskazywał tylko prawdziwe zakładki i adresy.
export function knowledgeAsText() {
  const lines = [];
  lines.push(`Serwis: ${SITE.name} (${SITE.base}) — konsultacje lekarskie i terapeutyczne online (telefon/wideo).`);
  lines.push(`Infolinia: ${SITE.phone}, ${SITE.hours}. E-mail: ${SITE.email}.`);
  lines.push('Zakładki strony:');
  for (const p of Object.values(PAGES)) if (!p.url.startsWith('tel:')) lines.push(`- ${p.label}: ${p.url}`);
  lines.push('Usługi i do kogo kierować:');
  for (const i of INTENTS) {
    if (!i.routing && !['cennik', 'jak_dziala', 'badania_dom'].includes(i.id)) continue;
    const links = (i.answer.links || []).filter((l) => !l.url.startsWith('tel:')).map((l) => `${l.label} <${l.url}>`).join('; ');
    lines.push(`- [${i.id}] ${i.answer.text} Linki: ${links}`);
  }
  return lines.join('\n');
}

// Gdy pacjent prosi o opinię/dawkowanie I wspomina temat
// (np. "jaki lek na trądzik?"), odmawiamy opinii, ale wskazujemy zakładkę.
export function replyForOpinionWithTopic(routingId) {
  const r = replyFor(routingId);
  return {
    text: `${NO_OPINION_REPLY.text} ${INTENT_BY_ID[routingId].answer.text}`,
    links: r.links,
    chips: [],
    intent: `opinia+${routingId}`,
  };
}
