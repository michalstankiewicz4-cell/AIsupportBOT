# Przysłonięcia „SOON” — spis wszystkich miejsc

Na start pracujemy na **bocie regułowym**. Przełącznik **„Tylko bot”** (domyślnie włączony) przysłania półprzezroczystym niebieskim panelem z napisem **SOON** wszystko, co dotyczy AI, naszego modelu (trained) i kombinacji. Elementy **nie są usunięte ani wyłączone** w kodzie — tylko zakryte (pod spodem widać treść, ale nie da się w nią kliknąć).

Ten plik to spis wszystkich takich miejsc, żeby łatwo je było znaleźć, zmienić albo usunąć.

## Jak szybko znaleźć wszystkie w kodzie

Każde miejsce ma w kodzie znacznik `SOON:` z identyfikatorem z tabel poniżej (np. `SOON: P3`):

```bash
git grep -n "SOON: "
```

W VS Code: **Ctrl+Shift+F** → `SOON: `.

## Wspólny mechanizm

| Co | Gdzie |
|---|---|
| Przełącznik „Tylko bot”, zapamiętanie w przeglądarce, funkcja `setSoon()` rysująca panel | `panel/ui-prefs.js` |
| Klucz w `localStorage` (wspólny dla wszystkich stron) | `lt-ui:bot-only` — brak wpisu = włączony |
| Domyślny napis pod SOON | `panel/ui-prefs.js` → `setSoon(…, text = 'Wkrótce — na start pracujemy na bocie regułowym')` |
| Wygląd panelu i znaczka (kolor, przezroczystość, rozmycie) | `panel/admin/admin.css` i `demo/demo.css` — sekcja „Przełącznik „Tylko bot” i panele SOON” (`.soon-cover`, `.soon-badge`, `.soon-text`, `.soon-cover.compact`) |
| Mały znaczek w rogu (dla przycisków) | klasa `compact` na `.soon-cover` |

Przełącznik dotyczy tylko wyglądu panelu i stron podglądu. **Nie zmienia zapisanych ustawień i nie ma go na stronie kliniki** — pacjent widzi czat zgodnie z trybem pracy z panelu.

## Panel administratora (`panel/admin/`)

Logika w `admin.js` → funkcja `applyBotOnly()` (wywoływana po każdym `renderMode()` i po zmianie przełącznika).

| ID | Co jest przysłonięte | Element | Pliki |
|---|---|---|---|
| — | Przełącznik „Tylko bot” w górnym pasku | `#bot-only-slot` | `index.html`, `admin.js` |
| **P1** | Karty trybów w „Tryb pracy” — wszystkie poza „Tylko bot regułowy” (nasz model, AI, 4 kombinacje) | karty w `#mode-presets` | `admin.js` |
| **P2** | Ramka „Własna kolejność” (Tryb pracy) | `#chain-box` | `index.html`, `admin.js` |
| **P3** | Cała treść zakładki „Nauka” | `#tab-learn` | `admin.js` (+ `admin.css`: `#tab-learn.soon-host`) |
| **P4** | Przycisk zakładki „Nauka” — w kolorze SOON, ale **klikalny** | `[data-tab="learn"]`, klasa `soon-tab` | `admin.js`, `admin.css` |
| **P5** | Przycisk „Eksport do treningu” w zakładce „Rozmowy” (mały znaczek w rogu) | `#logs-train-slot` | `index.html`, `admin.js` |
| **P6** | Ostrzeżenie nad kartami, gdy zapisany tryb używa czegoś przysłoniętego | `#bot-only-note` | `index.html`, `admin.js` |

Nieprzysłonięte (dotyczą bota): karta „Tylko bot regułowy”, Rejestracja rozmów, Własne odpowiedzi, Odpowiedzi wbudowane, Rozmowy (poza P5), Kontrola strony, Eksport/Import.

## Strona porównania (`index.html`)

Logika w skrypcie na dole strony → `applyBotOnly()`.

| ID | Co jest przysłonięte | Element |
|---|---|---|
| — | Przełącznik „Tylko bot” w nagłówku | `#bot-only-slot` |
| **S1** | Kolumna „2. AI” | `.col` z `#ai` |
| **S2** | Kolumna „3. Trained” | `.col` z `#trained` |
| **S3** | Kolumna „4. Z panelu” | `.col` z `#auto` |

Odkryta zostaje kolumna „1. Bot”. Styl kolumn: `demo/demo.css` → `.col.soon-host`, `.col > .soon-cover`.

## Podgląd pływający (`demo/floating.html`)

| ID | Co jest przysłonięte / zmienione | Element |
|---|---|---|
| — | Przełącznik „Tylko bot” w pasku wariantów | `#bot-only-slot` |
| **F1** | Przycisk wariantu „ai” (mały znaczek w rogu) | `.soon-slot` z `data-v="ai"` |
| **F2** | Przycisk wariantu „trained” | `.soon-slot` z `data-v="trained"` |
| **F3** | Przycisk wariantu „z panelu” | `.soon-slot` z `data-v="auto"` |
| **F4** | Przy „Tylko bot” zawsze ładuje się bot (nawet z `?variant=ai` w adresie); po wyłączeniu — wariant z adresu | `const v = getBotOnly() ? 'bot' : requested` |

## Jak odsłonić

- **Na chwilę (tylko w tej przeglądarce):** wyłącz przełącznik „Tylko bot”.
- **Domyślnie wyłączony dla wszystkich:** w `panel/ui-prefs.js` w `getBotOnly()` zmień `!== 'false'` na `=== 'true'`.
- **Odsłonić jeden element na stałe:** usuń odpowiednią linię `SOON: …` (wywołanie `setSoon` / klasę) według tabel powyżej.
- **Usunąć mechanizm całkowicie:** usuń wszystkie miejsca z `git grep -n "SOON: "`, import i przełącznik (`createBotOnlyToggle`, `#bot-only-slot`) w trzech plikach HTML/JS, plik `panel/ui-prefs.js` oraz sekcję CSS „panele SOON” w `admin.css` i `demo.css`. Uruchom `npm test`.

## Dodanie nowego przysłonięcia

1. Element musi mieć rodzica, który da się zakryć (np. owiń go w `<span class="soon-slot">`).
2. Wywołaj `setSoon(element, botOnly)` w funkcji `applyBotOnly()` danej strony (opcjonalnie trzeci parametr — własny napis; dla małych przycisków dodaj klasę `compact` do `.soon-cover`).
3. Dodaj komentarz `SOON: <ID> — opis` i wiersz w tym pliku.
