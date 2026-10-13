# AIsupportBOT — asystent pacjenta dla lekarzeiterapeuci.pl

Czat na stronę, który **kieruje pacjenta do właściwego specjalisty i właściwej zakładki** serwisu, odpowiada na pytania organizacyjne (ceny, kontakt, jak umówić wizytę) i **nigdy nie udziela porad medycznych** — zawsze wskazuje, że najlepszą drogą jest konsultacja z lekarzem. Na pytania nie na temat (polityka, pogoda, żarty) odpowiada stałą regułką z numerem infolinii.

Projekt zawiera **trzy warianty** tego samego asystenta — z tą samą wiedzą, wyglądem i zasadami bezpieczeństwa:

| Wariant | Jak działa | Koszt | Rozumienie pytań | Wymaga serwera |
|---|---|---|---|---|
| **bot** | Słowa kluczowe wpisane ręcznie | 0 zł | tylko znane słowa | nie |
| **ai** | Model językowy Claude przez nasz serwer-pośrednik | płatne za wiadomość | najlepsze, rozumie literówki i swobodny język | tak (Cloudflare Worker, darmowy plan wystarcza) |
| **trained** | Nasz model uczony na naszych przykładach (Naive Bayes) | 0 zł | dobre w obrębie tego, czego go nauczymy | nie |

Możliwy jest też **wariant 4 — własny model na serwerze z GPU** (dane pacjentów nie opuszczają serwera kliniki). Nie jest zaimplementowany; opis, koszty i ryzyka: [docs/WARIANT-4-LOKALNY.md](docs/WARIANT-4-LOKALNY.md).

Podgląd: otwórz `index.html` (porównanie trzech wariantów obok siebie) lub `demo/floating.html` (tak będzie wyglądał na stronie).

## Struktura

```
AIsupportBOT/
├── index.html               strona porównawcza (3 czaty obok siebie)
├── demo/                    podgląd pływającego widżetu + style strony demo
├── shared/                  WSPÓLNE dla wszystkich wariantów
│   ├── css/widget.css       wygląd czatu
│   └── js/
│       ├── knowledge.js     ★ WIEDZA: zakładki, usługi, ceny, odpowiedzi, słowa kluczowe
│       ├── safety.js        stany nagłe (112) i kryzys psychiczny — działa przed każdym silnikiem
│       ├── pipeline.js      kolejność: czyszczenie → bezpieczeństwo → silnik
│       ├── text.js          normalizacja polskiego tekstu
│       ├── widget.js        okno czatu (Shadow DOM)
│       └── embed-core.js    uruchamianie wariantu z tagu <script>
├── bot/                     wariant 1: bot regułowy
├── ai/                      wariant 2: AI
│   ├── ai-engine.js, config.js
│   └── server/              serwer-pośrednik (Cloudflare Worker) + prompt systemowy
├── trained/                 wariant 3: nasz wyuczony model
│   ├── data/training.json   ★ PRZYKŁADY DO NAUKI
│   ├── naive-bayes.js       algorytm
│   ├── train.js             trening (npm run train)
│   └── model.json           wynik treningu (generowany)
├── tools/                   testy, kontrola i podbijanie wersji
├── docs/                    dokumentacja
├── versions.json            wersje trzech wariantów
└── CHANGES.md               historia zmian
```

Każdy wariant ma w swoim folderze: `embed.js` (do wklejenia na stronę), silnik `*-engine.js` i `version.js`.

## Szybki start

Wymagany tylko [Node.js](https://nodejs.org) 20+ (do testów i treningu; sam czat działa bez Node).

```bash
npm test           # testy wszystkich trzech wariantów
npm run check      # kontrola wersji, CHANGES.md i aktualności modelu
npm run train      # trening wariantu "trained" po zmianie przykładów
npm run serve      # lokalny podgląd: http://localhost:8080
```

## Dokumentacja

- [docs/WDROZENIE.md](docs/WDROZENIE.md) — jak wstawić czat na lekarzeiterapeuci.pl, konfiguracja, RODO.
- [docs/AI-SERWER.md](docs/AI-SERWER.md) — uruchomienie serwera dla wariantu AI (klucz API, model Claude Haiku).
- [docs/ZABEZPIECZENIA.md](docs/ZABEZPIECZENIA.md) — ochrona przed kosztami: limity, Turnstile, rate limiting, prompt caching.
- [docs/WARIANT-4-LOKALNY.md](docs/WARIANT-4-LOKALNY.md) — informacyjnie: wariant z własnym modelem na serwerze z GPU.
- [docs/TRENOWANIE.md](docs/TRENOWANIE.md) — jak uczyć asystenta (także: czy da się „wytrenować własny model”).
- [CHANGES.md](CHANGES.md) — historia zmian i zasady wersjonowania.

## Zasady, których pilnujemy

1. **Bezpieczeństwo ponad wszystko.** Objawy stanu nagłego (ból w klatce, duszność, udar, utrata przytomności, myśli samobójcze) wykrywa `shared/js/safety.js` — regułami, nigdy modelem — i od razu podaje 112 (oraz 800 70 2222 / 116 123 przy kryzysie psychicznym).
2. **Żadnych opinii medycznych.** Bez diagnoz, dawkowania, interpretacji wyników. Tylko: jaki specjalista + która zakładka + „najlepiej skonsultować się z lekarzem”.
3. **Jedno źródło wiedzy.** Zakładki, ceny i odpowiedzi są tylko w `shared/js/knowledge.js`. Bot, model i prompt AI biorą je stamtąd.
4. **Wersjonowanie trzech typów.** Każdy wariant ma własną wersję; `npm run check` i GitHub Actions blokują publikację, jeśli wersje, CHANGES.md lub model się rozjadą.

## Konwencje

- Komentarze w kodzie, dokumentacja i teksty dla pacjenta — po polsku. Nazwy w kodzie (zmienne, funkcje) — po angielsku.
- Czysty JavaScript (moduły ES), bez frameworków i bez bibliotek zewnętrznych.
