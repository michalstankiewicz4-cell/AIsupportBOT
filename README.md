# AIsupportBOT — asystent pacjenta dla lekarzeiterapeuci.pl

Czat na stronę, w którym wirtualna konsultantka **Ilona** **kieruje pacjenta do właściwego specjalisty i właściwej zakładki** serwisu, odpowiada na pytania organizacyjne (ceny, kontakt, jak umówić wizytę) i **nigdy nie udziela porad medycznych** — zawsze wskazuje, że najlepszą drogą jest konsultacja z lekarzem. Na pytania nie na temat (polityka, pogoda, żarty) prosi o opisanie problemu zdrowotnego i pokazuje przyciski. Każda odpowiedź od razu pokazuje **kolorowe kafelki usług z ceną** — czat ma prowadzić do zakupu konsultacji. Działanie opisuje specyfikacja czatu „Ilona” v1.0 (przypadki A–M) — plan wdrożenia: [docs/PLAN-ILONA.md](docs/PLAN-ILONA.md).

Projekt zawiera **trzy silniki** tego samego asystenta — z tą samą wiedzą, wyglądem i zasadami bezpieczeństwa — oraz **panel sterowania**, w którym wybierasz silnik albo ich kombinację:

| Silnik | Jak działa | Koszt | Rozumienie pytań | Wymaga serwera |
|---|---|---|---|---|
| **bot** | Słowa kluczowe wpisane ręcznie | 0 zł | tylko znane słowa | nie |
| **ai** | Model językowy Claude Haiku przez nasz serwer-pośrednik | płatne za wiadomość | najlepsze, rozumie literówki i swobodny język | tak (Cloudflare Worker, darmowy plan wystarcza) |
| **trained** | Nasz model uczony na naszych przykładach (Naive Bayes) | 0 zł | dobre w obrębie tego, czego go nauczymy | nie |

Kombinacje (wybierane w panelu), np. **„nasz model, a AI gdy nie rozpozna”** — większość pytań obsługuje darmowy model, za AI płacisz tylko przy trudnych.

Możliwy jest też **wariant 4 — własny model na serwerze z GPU** (dane pacjentów nie opuszczają serwera kliniki). Nie jest zaimplementowany; opis, koszty i ryzyka: [docs/WARIANT-4-LOKALNY.md](docs/WARIANT-4-LOKALNY.md).

## Panel sterowania

Pełny panel działa **tylko na Twoim komputerze** (`npm run panel`, adres `http://localhost:5050/panel/admin/`); na publicznej stronie jest wyłącznie **podgląd demo**. Ustawienia mogą być w **bazie** (serwer panelu, z rejestrem rozmów) albo w **pliku** `panel/settings.json` (bez serwera — wgrywasz plik na hosting). **Eksport / Import** ustawień do pliku JSON — kopia zapasowa i ręczna podmiana. Na start pracujemy na **bocie** — przełącznik **„Tylko bot”** (domyślnie włączony) przysłania napisem *SOON* opcje AI, naszego modelu i kombinacji; **„Dev reset”** czyści pamięć przeglądarki i przywraca ustawienia domyślne (do testów). Z prawej strony — **podgląd czatu** z niezapisanymi zmianami. Zakładki (w kolorowych grupach: Działanie · Odpowiedzi · Wygląd i usługi · Analiza):

- **Tryb pracy** — bot / nasz model / AI albo ich kolejność (domyślnie: bot); telefon wsparcia i tryb kryzysowy po komunikacie B (domyślnie: bez powtarzania).
- **Rejestracja rozmów** — 4 poziomy: wyłączona, statystyki, treść pytań za zgodą, pełne rozmowy za zgodą.
- **Własne odpowiedzi** — fraza → Twoja odpowiedź; z testerem „co odpowie asystentka”.
- **Odpowiedzi wbudowane** — zmiana tekstów gotowych odpowiedzi (przypadki A–M) bez programowania.
- **Usługi i przyciski** — nazwy, ceny, kolory usług i przyciski pod każdą odpowiedzią (domyślnie ze specyfikacji v1.1) oraz wygląd kafelków (wysokość, wyśrodkowanie, czcionka, marginesy, kolejność).
- **Tematy** — słowa kluczowe tematów (dodawanie, usuwanie, tester), przyciski dodatkowe przy dolegliwościach i **słowa alarmowe** A/B (112).
- **Komunikaty** — informacje z datą od–do (np. przerwa świąteczna), same się pokazują i znikają.
- **Strona i wygląd** — telefon, e-mail, godziny, imię konsultantki, napisy, kolor, logo, położenie czatu, adresy zakładek.
- **Nauka** — przypisywanie nierozpoznanych pytań do tematów (model podpowiada), test „przed / po”, trafność, „Zapisz i naucz model” z automatyczną wersją.
- **Rozmowy** — statystyki, pytania bez odpowiedzi, eksport CSV i eksport do treningu.
- **Kontrola strony** — czy linki z odpowiedzi działają, czy ceny/telefon/godziny są aktualne, co się zmieniło na stronie (także automatycznie codziennie, z e-mailem przy problemie).

Instrukcja krok po kroku: **[docs/INSTRUKCJA.md](docs/INSTRUKCJA.md)**, szczegóły techniczne: [docs/PANEL.md](docs/PANEL.md).

## Podgląd

- Porównanie silników obok siebie (+ tryb z panelu): https://michalstankiewicz4-cell.github.io/AIsupportBOT/
- Czat tak, jak na stronie kliniki: https://michalstankiewicz4-cell.github.io/AIsupportBOT/demo/floating.html?variant=auto
- Panel administratora (podgląd demo): https://michalstankiewicz4-cell.github.io/AIsupportBOT/panel/admin/

## Struktura

```
AIsupportBOT/
├── embed.js                 ★ uniwersalny skrypt na stronę kliniki — tryb pracy z panelu
├── index.html               strona porównawcza (czaty obok siebie)
├── demo/                    podgląd pływającego widżetu + style strony demo
├── shared/                  WSPÓLNE dla wszystkich silników
│   ├── css/widget.css       wygląd czatu
│   ├── img/                 logo i miniatura konsultantki
│   └── js/
│       ├── texts.js         ★ WSZYSTKIE TEKSTY odpowiedzi (przypadki A–M ze specyfikacji)
│       ├── knowledge.js     ★ WIEDZA: usługi i ceny, przyciski, słowa kluczowe, kolejność przypadków, fakty do kontroli strony
│       ├── safety.js        A i B: stany nagłe (112) i kryzys psychiczny — działa przed wszystkim innym
│       ├── pipeline.js      kolejność: czyszczenie → A/B → tryb kryzysowy → własne odpowiedzi → silnik → „Napisz do nas”
│       ├── router.js        kombinacje silników (np. nasz model → AI)
│       ├── privacy.js       anonimizacja (numery, e-maile) przed zapisem rozmów
│       ├── text.js          normalizacja polskiego tekstu, dopasowanie z tolerancją literówek
│       ├── widget.js        okno czatu (Shadow DOM), zgoda na zapis rozmowy
│       └── embed-core.js    uruchamianie z tagu <script>
├── bot/                     silnik 1: bot regułowy
├── ai/                      silnik 2: AI
│   ├── ai-engine.js, config.js, turnstile.js
│   └── server/              serwer AI (Cloudflare Worker) + prompt systemowy
├── trained/                 silnik 3: nasz wyuczony model
│   ├── data/training.json   ★ PRZYKŁADY DO NAUKI
│   ├── naive-bayes.js       algorytm
│   ├── trainer.js           wspólne funkcje nauki (skrypt, panel, lokalny serwer)
│   ├── train.js             trening (npm run train)
│   └── model.json           wynik treningu (generowany)
├── panel/                   PANEL STEROWANIA
│   ├── admin/               ★ panel administratora (pełny lokalnie; publicznie tylko podgląd demo)
│   ├── settings.json        ★ plik ustawień (źródło „plik”) — ten sam format co eksport z panelu
│   ├── server/              serwer panelu (Cloudflare Worker + baza D1): ustawienia, rejestr, kontrola strony
│   ├── schema.js            format i walidacja ustawień, poziomy rejestracji, tryby pracy
│   ├── client.js            połączenie czatu z panelem (ustawienia, własne odpowiedzi, rejestr)
│   ├── site-check.js        kontrola strony kliniki
│   ├── labels.js            czytelne nazwy tematów
│   ├── ui-prefs.js          przełącznik „Tylko bot” i panele SOON
│   └── config.js            adres serwera panelu
├── tools/                   testy, wersje, lokalny serwer panelu, kontrola strony z konsoli
├── docs/                    dokumentacja
├── versions.json            wersje trzech silników
└── CHANGES.md               historia zmian
```

## Szybki start

Wymagany [Node.js](https://nodejs.org) **22.13 lub nowszy** (do panelu, testów i treningu; sam czat na stronie działa bez Node). Bez dodatkowych bibliotek — nie trzeba `npm install`.

```bash
npm run panel       # panel sterowania i podgląd czatów na Twoim komputerze: http://localhost:5050/panel/admin/
npm test            # testy: silniki, panel, serwer panelu, kontrola strony
npm run check       # kontrola wersji, CHANGES.md i aktualności modelu
npm run train       # trening silnika "trained" po zmianie przykładów
npm run check-site  # kontrola strony kliniki z konsoli (linki, ceny, telefon)
npm run bump -- <bot|ai|trained|all> <patch|minor|major> "Opis zmiany"
```

## Dokumentacja

- [docs/INSTRUKCJA.md](docs/INSTRUKCJA.md) — **instrukcja obsługi krok po kroku** (dla osoby nietechnicznej), słowniczek, FAQ.
- [docs/PANEL.md](docs/PANEL.md) — panel sterowania: uruchomienie, serwer panelu, bezpieczeństwo, rejestracja i RODO, kontrola strony.
- [docs/WDROZENIE.md](docs/WDROZENIE.md) — jak wstawić czat na lekarzeiterapeuci.pl, konfiguracja, RODO.
- [docs/AI-SERWER.md](docs/AI-SERWER.md) — uruchomienie serwera AI (klucz API, model Claude Haiku).
- [docs/ZABEZPIECZENIA.md](docs/ZABEZPIECZENIA.md) — ochrona przed kosztami AI: limity, Turnstile, rate limiting, prompt caching.
- [docs/TRENOWANIE.md](docs/TRENOWANIE.md) — jak uczyć asystentkę (także: czy da się „wytrenować własny model”).
- [docs/PLAN-ILONA.md](docs/PLAN-ILONA.md) — plan wdrożenia specyfikacji czatu „Ilona” (odhaczane punkty, decyzje klienta).
- [docs/POMYSLY.md](docs/POMYSLY.md) — pomysły na rozwój (bot, AI, panel) do zrobienia.
- [docs/SOON.md](docs/SOON.md) — spis wszystkich przysłonięć „SOON” (przełącznik „Tylko bot”): gdzie są i jak je odsłonić.
- [docs/WARIANT-4-LOKALNY.md](docs/WARIANT-4-LOKALNY.md) — informacyjnie: wariant z własnym modelem na serwerze z GPU.
- [CHANGES.md](CHANGES.md) — historia zmian i zasady wersjonowania.

## Zasady, których pilnujemy

1. **Bezpieczeństwo ponad wszystko.** Objawy stanu nagłego (ból w klatce, duszność, udar, utrata przytomności, zatrucie) i myśli samobójcze wykrywa `shared/js/safety.js` — regułami, nigdy modelem — i od razu pokazuje czerwoną kartę z przyciskiem 112 oraz drugi komunikat (przy kryzysie: krótki i ciepły, z psychiatrą i psychologiem). Samego alarmu nie da się wyłączyć ani nadpisać z panelu — w zakładce „Tematy” można tylko dopisać albo wyłączyć pojedyncze słowa alarmowe (za zgodą lekarza).
2. **Żadnych opinii medycznych.** Bez diagnoz, dawkowania, interpretacji wyników. Każda dolegliwość → konsultacja lekarska (kafelki: konsultacja lekarska, recepta, konsultacja ogólna).
3. **Jedno źródło wiedzy.** Teksty — `shared/js/texts.js`, usługi, ceny i słowa kluczowe — `shared/js/knowledge.js`; zmiany tekstów bez programowania — w panelu sterowania.
4. **Prywatność.** Imię pacjenta nie opuszcza przeglądarki. Rejestracja rozmów jest domyślnie wyłączona; treść pytań zapisujemy tylko za zgodą i po anonimizacji.
5. **Panel niedostępny z zewnątrz.** Pełny panel działa tylko lokalnie (publicznie wyłącznie podgląd demo); część administracyjna serwera wymaga hasła i może być ograniczona do Twojego adresu IP; plik ustawień zapisuje tylko lokalny panel.
6. **Wersjonowanie trzech typów.** Każdy silnik ma własną wersję; `npm run check` i GitHub Actions blokują publikację, jeśli wersje, CHANGES.md lub model się rozjadą.

## Konwencje

- Komentarze w kodzie, dokumentacja i teksty dla pacjenta — po polsku. Nazwy w kodzie (zmienne, funkcje) — po angielsku.
- Czysty JavaScript (moduły ES), bez frameworków i bez bibliotek zewnętrznych.
