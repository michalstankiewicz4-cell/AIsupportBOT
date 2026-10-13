# Historia zmian (CHANGES)

Każdy z trzech asystentów ma **własny numer wersji** (`bot`, `ai`, `trained`) w formacie `MAJOR.MINOR.PATCH`:

- **PATCH** (1.0.**1**) — poprawka bez zmiany zachowania dla pacjenta (literówka, styl, drobny błąd).
- **MINOR** (1.**1**.0) — nowa wiedza lub funkcja (nowe słowa kluczowe, przykłady treningowe, nowa zakładka).
- **MAJOR** (**2**.0.0) — zmiana zasad działania (np. nowy model AI, inny sposób odpowiadania).

Zmiana w `shared/` (wspólna wiedza, widżet, bezpieczeństwo) dotyczy wszystkich trzech — podbij wtedy wersję `all`.

Nowy wpis dodaje polecenie: `npm run bump -- <bot|ai|trained|all> <patch|minor|major> "Opis"`.
Zgodność pilnuje: `npm run check` (uruchamiane też automatycznie przy każdym pushu).

<!-- NEW ENTRIES BELOW -->

## 2026-10-13

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
