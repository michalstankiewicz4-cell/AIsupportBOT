# Historia zmian (CHANGES)

Każdy z trzech asystentów ma **własny numer wersji** (`bot`, `ai`, `trained`) w formacie `MAJOR.MINOR.PATCH`:

- **PATCH** (1.0.**1**) — poprawka bez zmiany zachowania dla pacjenta (literówka, styl, drobny błąd).
- **MINOR** (1.**1**.0) — nowa wiedza lub funkcja (nowe słowa kluczowe, przykłady treningowe, nowa zakładka).
- **MAJOR** (**2**.0.0) — zmiana zasad działania (np. nowy model AI, inny sposób odpowiadania).

Zmiana w `shared/` (wspólna wiedza, widżet, bezpieczeństwo) dotyczy wszystkich trzech — podbij wtedy wersję `all`.

Nowy wpis dodaje polecenie: `npm run bump -- <bot|ai|trained|all> <patch|minor|major> "Opis"`.
Zgodność pilnuje: `npm run check` (uruchamiane też automatycznie przy każdym pushu).

<!-- NEW ENTRIES BELOW -->

## 2026-10-14

### bot 1.4.1
- Panel: znaczki „✓ zrobione” / „⏳ do zrobienia” przy trybach pracy (AI wymaga serwera AI) z podpowiedzią, czego brakuje

### ai 1.5.1
- Panel: znaczki „✓ zrobione” / „⏳ do zrobienia” przy trybach pracy (AI wymaga serwera AI) z podpowiedzią, czego brakuje

### trained 1.4.1
- Panel: znaczki „✓ zrobione” / „⏳ do zrobienia” przy trybach pracy (AI wymaga serwera AI) z podpowiedzią, czego brakuje

### bot 1.4.0
- Źródło ustawień „plik” (panel/settings.json, zapis z lokalnego panelu z kopiami w panel/backups/), eksport i import ustawień do pliku JSON, panel na publicznej stronie jako podgląd demo + link „Panel administratora” na stronie z czatami

### ai 1.5.0
- Źródło ustawień „plik” (panel/settings.json, zapis z lokalnego panelu z kopiami w panel/backups/), eksport i import ustawień do pliku JSON, panel na publicznej stronie jako podgląd demo + link „Panel administratora” na stronie z czatami

### trained 1.4.0
- Źródło ustawień „plik” (panel/settings.json, zapis z lokalnego panelu z kopiami w panel/backups/), eksport i import ustawień do pliku JSON, panel na publicznej stronie jako podgląd demo + link „Panel administratora” na stronie z czatami

### bot 1.3.0
- Panel sterowania: tryb pracy (bot / nasz model / AI / kombinacje), rejestracja rozmów (4 poziomy, zgoda, anonimizacja), własne odpowiedzi na frazy, edycja odpowiedzi wbudowanych, kontrola strony kliniki — szczegóły w sekcji „Panel sterowania” poniżej

### ai 1.4.0
- Panel sterowania: tryb pracy (bot / nasz model / AI / kombinacje), rejestracja rozmów (4 poziomy, zgoda, anonimizacja), własne odpowiedzi na frazy, edycja odpowiedzi wbudowanych, kontrola strony kliniki — szczegóły w sekcji „Panel sterowania” poniżej

### trained 1.3.0
- Panel sterowania: tryb pracy (bot / nasz model / AI / kombinacje), rejestracja rozmów (4 poziomy, zgoda, anonimizacja), własne odpowiedzi na frazy, edycja odpowiedzi wbudowanych, kontrola strony kliniki — szczegóły w sekcji „Panel sterowania” poniżej

### Panel sterowania (wspólne — dotyczy bot 1.3.0, ai 1.4.0, trained 1.3.0)
- Nowy panel administratora `panel/admin/` — działa tylko lokalnie (`npm run panel`, 127.0.0.1), nie jest publikowany na GitHub Pages.
- Serwer panelu `panel/server/` (Cloudflare Worker + D1): publicznie tylko `GET /config` i `POST /log`; część `/admin/*` z hasłem, blokadą po 10 błędnych próbach, opcjonalnie tylko z wybranych IP (`ADMIN_IPS`, dla innych 404).
- Tryb pracy z panelu: bot, nasz model, AI lub kombinacje (np. nasz model → AI, gdy nie rozpozna). Domyślnie bot. Nowy uniwersalny skrypt `embed.js` (atrybut `data-panel`).
- Rejestracja rozmów: 0 wyłączona (domyślnie), 1 statystyki, 2 treść pytań za zgodą, 3 pełne rozmowy za zgodą. Pole zgody na ekranie powitalnym, anonimizacja numerów i e-maili, automatyczne usuwanie po ustalonym czasie, imię i IP nigdy nie są zapisywane.
- Własne odpowiedzi na frazy (z `*` jako dowolna końcówka) — działają przed każdym silnikiem, po kontroli stanów nagłych; tester odpowiedzi w panelu.
- Edycja tekstów i linków odpowiedzi wbudowanych (bez stanów nagłych).
- Zakładka „Rozmowy”: statystyki, najczęstsze tematy, pytania bez odpowiedzi, eksport CSV i eksport do treningu.
- Kontrola strony kliniki (`panel/site-check.js`): linki z odpowiedzi (404, przekierowania, brakujące sekcje), fakty ze strony (`SITE_FACTS`: ceny, telefon, godziny), zmiany treści. Uruchamiana z panelu, codziennie przez serwer panelu i przez GitHub Actions (`site-check.yml`, e-mail przy problemie) oraz `npm run check-site`. W GitHub Actions wynik widać jako adnotacje i tabelę w zakładce Summary.
- Wskazówki „?” przy polach panelu. Linki w czacie tylko `https://`, `tel:`, `mailto:`.
- Dokumentacja: nowe `docs/INSTRUKCJA.md` (instrukcja obsługi, słowniczek, FAQ, lista kontrolna) i `docs/PANEL.md`; uzupełnione README, WDROZENIE, TRENOWANIE, ZABEZPIECZENIA, WARIANT-4.
- Wymagany Node.js 22.13+ (testy serwera panelu na wbudowanym SQLite).

## 2026-10-13

### bot 1.2.0
- Konsultantka „Ilona” (imię w SITE.assistant) z miniaturą logo przy podpisie jak zdjęcie profilowe; AI przedstawia się jako Ilona, wirtualna konsultantka (nie udaje człowieka); formy żeńskie w odpowiedziach

### ai 1.3.0
- Konsultantka „Ilona” (imię w SITE.assistant) z miniaturą logo przy podpisie jak zdjęcie profilowe; AI przedstawia się jako Ilona, wirtualna konsultantka (nie udaje człowieka); formy żeńskie w odpowiedziach

### trained 1.2.0
- Konsultantka „Ilona” (imię w SITE.assistant) z miniaturą logo przy podpisie jak zdjęcie profilowe; AI przedstawia się jako Ilona, wirtualna konsultantka (nie udaje człowieka); formy żeńskie w odpowiedziach

### bot 1.1.2
- Nazwa „Lekarze i Terapeuci” wszędzie z wielkimi literami L i T

### ai 1.2.2
- Nazwa „Lekarze i Terapeuci” wszędzie z wielkimi literami L i T

### trained 1.1.2
- Nazwa „Lekarze i Terapeuci” wszędzie z wielkimi literami L i T

### bot 1.1.1
- Logo kliniki na ekranie powitalnym (shared/img/logo.png, przezroczyste tło, skaluje się do wysokości ekranu)

### ai 1.2.1
- Logo kliniki na ekranie powitalnym (shared/img/logo.png, przezroczyste tło, skaluje się do wysokości ekranu)

### trained 1.1.1
- Logo kliniki na ekranie powitalnym (shared/img/logo.png, przezroczyste tło, skaluje się do wysokości ekranu)

### bot 1.1.0
- Nowy wygląd czatu: ekran powitalny z imieniem pacjenta, nagłówek „Lekarze i Terapeuci · Wirtualny konsultant · online”, podpisy Konsultant/imię nad dymkami, data rozmowy, okrągłe pole i przycisk wysyłania; imię zostaje w przeglądarce (nie trafia do AI). Trained: przykłady „wizyta u terapeuty”.

### ai 1.2.0
- Nowy wygląd czatu: ekran powitalny z imieniem pacjenta, nagłówek „Lekarze i Terapeuci · Wirtualny konsultant · online”, podpisy Konsultant/imię nad dymkami, data rozmowy, okrągłe pole i przycisk wysyłania; imię zostaje w przeglądarce (nie trafia do AI). Trained: przykłady „wizyta u terapeuty”.

### trained 1.1.0
- Nowy wygląd czatu: ekran powitalny z imieniem pacjenta, nagłówek „Lekarze i Terapeuci · Wirtualny konsultant · online”, podpisy Konsultant/imię nad dymkami, data rozmowy, okrągłe pole i przycisk wysyłania; imię zostaje w przeglądarce (nie trafia do AI). Trained: przykłady „wizyta u terapeuty”.

### bot 1.0.1
- Komentarze w kodzie przetłumaczone na polski (na prośbę klienta); bez zmian w działaniu

### ai 1.1.2
- Komentarze w kodzie przetłumaczone na polski (na prośbę klienta); bez zmian w działaniu

### trained 1.0.1
- Komentarze w kodzie przetłumaczone na polski (na prośbę klienta); bez zmian w działaniu

### Dokumentacja (bez zmiany wersji wariantów)
- Dodano `docs/WARIANT-4-LOKALNY.md` — informacyjny opis opcjonalnego wariantu 4: własny model językowy na serwerze z GPU (architektura, modele, sprzęt, koszty, ryzyka, ścieżka wdrożenia).

### ai 1.1.1
- Dokumentacja: docs/ZABEZPIECZENIA.md — instrukcja krok po kroku ochrony przed kosztami

### ai 1.1.0
- Prompt caching promptu systemowego (odczyt ~10% ceny), Cloudflare Turnstile + sesja 30 min przeciw botom, sekcja „Ochrona przed kosztami” w dokumentacji

### ai 1.0.1
- Dokumentacja: szczegółowa konfiguracja Claude Haiku (klucz API, limity, wdrożenie i test Workera)

### bot 1.0.0
- Pierwsza wersja asystenta regułowego: dopasowanie słów kluczowych do 36 intencji (specjaliści, usługi, cennik, kontakt).
- Odmowa opinii medycznych i dawkowania; przy pytaniu „lek + temat” odmowa połączona ze wskazaniem zakładki.
- Pytania nie na temat (polityka, pogoda, żarty) → regułka z numerem infolinii.

### ai 1.0.0
- Pierwsza wersja asystenta AI: model Claude przez serwer-pośrednik (Cloudflare Worker) — klucz API nie trafia do przeglądarki.
- Prompt systemowy budowany automatycznie z `shared/js/knowledge.js` (tylko prawdziwe zakładki i linki).
- Serwer usuwa z odpowiedzi linki spoza domeny kliniki, ogranicza liczbę zapytań i powtarza kontrolę stanów nagłych.
- Bez skonfigurowanego serwera lub przy awarii odpowiada bot regułowy (z adnotacją w czacie).

### trained 1.0.0
- Pierwsza wersja naszego modelu: klasyfikator Naive Bayes uczony na `trained/data/training.json` (287 przykładów) + słowach kluczowych.
- Trafność leave-one-out: 83%. Model wybiera tylko gotowe odpowiedzi — nie generuje treści medycznych.
- Skrypt `npm run train` z raportem pomyłek.

### Wspólne (shared) — dotyczy wszystkich trzech
- Widżet czatu w Shadow DOM (nie koliduje ze stylami strony), zapamiętywanie rozmowy przy przejściu między zakładkami.
- Warstwa bezpieczeństwa przed każdym silnikiem: stany nagłe → 112, myśli samobójcze → 112, 800 70 2222, 116 123.
- Strona porównawcza (`index.html`) i podgląd na stronie (`demo/floating.html`).
