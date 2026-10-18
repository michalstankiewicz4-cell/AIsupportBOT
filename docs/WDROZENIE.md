# Wdrożenie na lekarzeiterapeuci.pl

## 1. Publikacja na GitHub Pages

Repozytorium ma gotowy workflow `.github/workflows/static.yml`. Po pushu na gałąź `main`:

1. GitHub Actions uruchamia `check-versions.js` i testy — **jeśli coś się nie zgadza, strona się nie opublikuje**.
2. Przed publikacją usuwany jest kod serwerów i narzędzia (`panel/server`, `panel/backups`, `ai/server`, `tools`). Panel administratora jest publikowany **tylko jako podgląd demo** — bez logowania do serwera i bez zapisu pliku (to działa wyłącznie lokalnie, `npm run panel`).
3. Pliki trafiają na GitHub Pages pod adres w stylu `https://michalstankiewicz4-cell.github.io/AIsupportBOT/`.

Osobny workflow `site-check.yml` codziennie sprawdza stronę kliniki (linki, ceny, telefon) i przy problemie wysyła e-mail — patrz [PANEL.md](PANEL.md#11-kontrola-strony-kliniki).

Jednorazowo: w repozytorium **Settings → Pages → Source: GitHub Actions**.

Sprawdź dokładny adres w zakładce Actions (krok „Deploy”) — wielkość liter w nazwie repozytorium ma znaczenie w adresie.

### Własny serwer (np. hosting strony kliniki)

Czat to zwykłe pliki statyczne (ok. 230 KB, wszystkie trzy warianty) — działa z dowolnego folderu na dowolnym serwerze, bez PHP, bazy i konfiguracji. Pliki ładują się względem adresu skryptu `embed.js`, więc w kodzie nic nie trzeba zmieniać.

**Zalety:** czat ładuje się z tej samej domeny co strona (bez GitHub Pages, bez CORS, prostsze RODO i CSP). **Wada:** aktualizacje nie są automatyczne — każdą zmianę wgrywa się ręcznie. Serwery (panelu i AI) to osobne Workery w Cloudflare — na hosting strony **nie** trafiają.

#### Krok 1. Przygotuj paczkę

```
npm test          # testy muszą przejść
npm run paczka    # tworzy folder paczka/aisupportbot/
```

W `paczka/aisupportbot/` są tylko pliki, które ładuje przeglądarka pacjenta:

```
embed.js                 uniwersalny skrypt (tryb wybierany w panelu)
shared/                  wspólne: widżet, style, wiedza, bezpieczeństwo, obrazki
bot/                     wariant bot
ai/                      wariant ai — tylko część przeglądarkowa (bez ai/server)
trained/                 wariant trained — silnik i model.json (bez danych i skryptów uczenia)
panel/client.js, panel/config.js, panel/schema.js   wczytywanie ustawień
panel/settings.json      ustawienia (źródło „plik”)
WGRAJ.txt                krótka instrukcja — na serwer nie jest potrzebny
```

**Nie kopiuj** reszty projektu: `panel/admin/`, `panel/server/`, `panel/backups/`, `ai/server/`, `trained/data/`, `tools/`, `docs/`, `demo/`, `.git/`, `.github/` — to panel, kod serwerów, dane treningowe i narzędzia, niepotrzebne (a część niepożądana) na publicznym serwerze.

#### Krok 2. Wgraj na serwer

Utwórz na serwerze folder, np. `/czat/`, i wgraj do niego **całą zawartość** `paczka/aisupportbot/` z zachowaniem struktury folderów:

- **FTP / SFTP** (FileZilla, WinSCP): katalog główny strony (zwykle `public_html/`, `www/` lub `htdocs/`) → nowy folder `czat/` → przeciągnij pliki.
- **Panel hostingu** (cPanel, DirectAdmin, home.pl, nazwa.pl itp.): Menedżer plików → katalog strony → folder `czat` → wgraj ZIP z zawartością paczki → „Rozpakuj”.
- **WordPress:** przez FTP lub menedżer plików hostingu (np. `public_html/czat/`), nie przez „Media” — biblioteka mediów nie przyjmie plików `.js`.

Sprawdzenie: `https://twoja-domena.pl/czat/embed.js` musi otwierać kod skryptu (a nie błąd 404), a `https://twoja-domena.pl/czat/panel/settings.json` — ustawienia.

#### Krok 3. Wstaw znacznik na stronę

Przed `</body>` (w WordPressie: motyw → stopka albo wtyczka typu „WPCode” / „Insert Headers and Footers”) — jeden z wariantów (opis w rozdziale 2):

```html
<!-- uniwersalny, sterowany z panelu -->
<script src="/czat/embed.js" data-panel="https://lekarze-panel.TWOJE-KONTO.workers.dev" defer></script>
<!-- albo stały silnik: -->
<script src="/czat/bot/embed.js" defer></script>
<script src="/czat/trained/embed.js" defer></script>
<script src="/czat/ai/embed.js" data-endpoint="https://lekarze-ai-assistant.TWOJE-KONTO.workers.dev" defer></script>
```

Tylko **jeden** znacznik na stronie. Jeśli był już znacznik z `github.io` — **zamień** go (dwa = dwa okna czatu). Atrybuty `data-*` działają tak samo.

#### Krok 4. Sprawdź

1. Otwórz stronę w oknie prywatnym.
2. Podaj imię, wpisz „cześć” — pojawią się kafelki usług z cenami.
3. Wpisz „nie mogę oddychać” — musi pojawić się czerwona karta z przyciskiem „Zadzwoń 112”.
4. W konsoli przeglądarki (F12) nie może być błędów `[LTChat]`.

#### Aktualizacje

| Co się zmieniło | Co wgrać ponownie |
|---|---|
| ustawienia w panelu (źródło „plik”) | tylko `panel/settings.json` |
| model `trained` nauczony na nowo | tylko `trained/model.json` |
| nowa wersja kodu | `npm run paczka` i całą zawartość paczki (nadpisz pliki) |
| ustawienia przy serwerze panelu (Cloudflare) | nic — czat pobiera je na żywo z bazy |

Po wgraniu przeglądarki pacjentów mogą przez chwilę używać starych plików z pamięci podręcznej (zależnie od ustawień serwera). Wersje wariantów są w `*/version.js` i w pliku `WGRAJ.txt` paczki.

#### Najczęstsze problemy

- **Czat się nie pojawia, w konsoli 404** — zły adres w `src` albo pliki w złym folderze (np. `czat/aisupportbot/embed.js`).
- **Błąd „MIME type” przy plikach `.js`** — serwer musi wysyłać `.js` jako `text/javascript` (w razie problemu w `.htaccess`: `AddType text/javascript .js`).
- **Brak logo/miniatury** — nie wgrał się folder `shared/img/`.
- **Czat na innej domenie niż strona** — ustaw dla plików czatu nagłówek `Access-Control-Allow-Origin`.
- **Strona ma CSP** — `script-src`/`style-src`/`img-src`: domena strony (`'self'`) i `data:`; `connect-src`: dodatkowo adresy serwera panelu i AI (`*.workers.dev`), jeśli używane.

## 2. Wstawienie czatu na stronę kliniki

Osoba, która ma dostęp do kodu strony lekarzeiterapeuci.pl, wkleja **jedną linijkę** przed `</body>` (na wszystkich podstronach — zwykle w szablonie stopki).

### Zalecane: uniwersalny skrypt sterowany z panelu

Tryb pracy (bot / nasz model / AI / kombinacja), własne odpowiedzi i rejestrację zmieniasz potem w panelu — bez ponownego dotykania strony kliniki:

```html
<script src="https://michalstankiewicz4-cell.github.io/AIsupportBOT/embed.js"
        data-panel="https://lekarze-panel.TWOJE-KONTO.workers.dev"
        data-endpoint="https://lekarze-ai-assistant.TWOJE-KONTO.workers.dev" defer></script>
```

- `data-panel` — serwer panelu ([PANEL.md](PANEL.md)). Bez niego czat czyta ustawienia z pliku `panel/settings.json` (źródło „plik”), a gdy go nie ma — bot regułowy z ustawieniami domyślnymi.
- `data-endpoint` — serwer AI ([AI-SERWER.md](AI-SERWER.md)); potrzebny tylko, gdy tryb pracy używa AI.

### Alternatywnie: stały silnik

Skrypt konkretnego silnika — tryb pracy z panelu go nie zmienia (własne odpowiedzi i rejestracja z panelu działają, jeśli podasz `data-panel`):

```html
<!-- Wariant 1: bot regułowy -->
<script src="https://michalstankiewicz4-cell.github.io/AIsupportBOT/bot/embed.js" defer></script>

<!-- Wariant 2: AI (wymaga serwera, patrz AI-SERWER.md) -->
<script src="https://michalstankiewicz4-cell.github.io/AIsupportBOT/ai/embed.js"
        data-endpoint="https://lekarze-ai-assistant.TWOJE-KONTO.workers.dev"
        data-turnstile="0x4AAAAAAA...TWÓJ-SITE-KEY" defer></script>

<!-- Wariant 3: nasz wyuczony model -->
<script src="https://michalstankiewicz4-cell.github.io/AIsupportBOT/trained/embed.js" defer></script>
```

### Opcje (atrybuty `data-*`)

| Atrybut | Przykład | Działanie |
|---|---|---|
| `data-title` | `"Lekarze i Terapeuci"` | Nazwa w nagłówku i na ekranie powitalnym (domyślnie „Lekarze i Terapeuci”) |
| `data-accent` | `"#2e2787"` | Kolor przycisków i dymków pacjenta (domyślnie granat) |
| `data-position` | `"left"` | Przycisk po lewej (domyślnie prawa strona) |
| `data-open` | `"true"` | Czat otwarty od razu |
| `data-endpoint` | URL Workera | Tylko wariant AI |
| `data-turnstile` | site key Turnstile | Tylko gdy używane AI — ochrona przed botami (patrz ZABEZPIECZENIA.md) |
| `data-panel` | URL serwera panelu | Ustawienia z panelu sterowania: tryb pracy, własne odpowiedzi, rejestracja |

### Imię konsultantki i logo

- Imię wirtualnej konsultantki („Ilona”), napisy, kolor, logo i miniaturę zmienisz w panelu: **„Strona i wygląd”** (wartości domyślne: `shared/js/knowledge.js` → `DEFAULT_SITE`). Prompt AI używa wartości domyślnych.
- Konsultantka zawsze przedstawia się jako **wirtualna** — nie udaje człowieka (ważne także prawnie: pacjent musi wiedzieć, że rozmawia z AI).
- Domyślne logo: `shared/img/logo.png`; domyślna miniatura: `shared/img/avatar.png` (własne wgrasz w panelu).

### Sterowanie z poziomu strony

Po załadowaniu dostępny jest obiekt `window.LTChat`, np. przycisk „Zapytaj asystenta”:

```html
<button onclick="LTChat.open()">Zapytaj asystenta</button>
```

Dostępne: `LTChat.open()`, `LTChat.close()`, `LTChat.ask("tekst")`, `LTChat.reset()`.

## 3. Uwaga: strona ma już czat

Na lekarzeiterapeuci.pl jest widoczny „czat na żywo”. Przed wdrożeniem ustal z klientem, czy asystent ma go zastąpić, czy działać obok (wtedy ustaw `data-position="left"`, żeby przyciski się nie nakładały).

## 4. Aktualizacja wiedzy

**Szybko, bez programowania:** w panelu sterowania („Odpowiedzi wbudowane”, „Własne odpowiedzi”) — zmiana działa na stronie po ok. minucie. Co się zmieniło na stronie kliniki, pokazuje zakładka **„Kontrola strony”**.

**Na stałe:** gdy na stronie zmienią się zakładki, ceny lub numer infolinii — popraw `shared/js/knowledge.js` (także listę `SITE_FACTS` do kontroli strony), uruchom `npm run train` i `npm test`, podbij wersję `npm run bump -- all minor "Aktualizacja cennika"`, zrób push. Czat na stronie zaktualizuje się sam (strona kliniki nie wymaga zmian).

## 5. Bezpieczeństwo i RODO — do ustalenia z klientem

- **Bot i trained** działają w całości w przeglądarce pacjenta — treść pytań **nigdzie nie jest wysyłana**.
- **AI** wysyła treść pytania do Cloudflare i do dostawcy modelu (Anthropic). Pytania o zdrowie to dane szczególnej kategorii (art. 9 RODO), więc przed uruchomieniem wariantu AI klient powinien: uwzględnić to w polityce prywatności, mieć umowy powierzenia (DPA) z dostawcami i ocenić transfer danych poza EOG. Czat i tak prosi pacjenta, by nie podawał danych osobowych.
- Asystent nie stawia diagnoz, tylko kieruje do usług — warto jednak, by klient potwierdził z prawnikiem, że taka forma nie wymaga certyfikacji jako wyrób medyczny.
- Imię pacjenta (ekran powitalny) służy tylko do wyświetlania w oknie czatu: zostaje w przeglądarce i **nie jest wysyłane** do serwera AI.
- **Rejestracja rozmów** jest domyślnie wyłączona. Poziomy, zgoda pacjenta, anonimizacja i czas przechowywania — [PANEL.md](PANEL.md#6-rejestracja-rozmów-i-rodo). Poziom 2 i 3 (treść pytań) wymagają zgody pacjenta i zapisu w polityce prywatności.
- Rozmowa jest zapamiętywana tylko w `sessionStorage` przeglądarki (znika po zamknięciu karty), żeby nie ginęła przy przejściu na inną zakładkę strony.
