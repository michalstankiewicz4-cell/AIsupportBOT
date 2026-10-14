# Wdrożenie na lekarzeiterapeuci.pl

## 1. Publikacja na GitHub Pages

Repozytorium ma gotowy workflow `.github/workflows/static.yml`. Po pushu na gałąź `main`:

1. GitHub Actions uruchamia `check-versions.js` i testy — **jeśli coś się nie zgadza, strona się nie opublikuje**.
2. Przed publikacją usuwany jest kod serwerów i narzędzia (`panel/server`, `panel/backups`, `ai/server`, `tools`). Panel administratora jest publikowany **tylko jako podgląd demo** — bez logowania do serwera i bez zapisu pliku (to działa wyłącznie lokalnie, `npm run panel`).
3. Pliki trafiają na GitHub Pages pod adres w stylu `https://michalstankiewicz4-cell.github.io/AIsupportBOT/`.

Osobny workflow `site-check.yml` codziennie sprawdza stronę kliniki (linki, ceny, telefon) i przy problemie wysyła e-mail — patrz [PANEL.md](PANEL.md#10-kontrola-strony-kliniki).

Jednorazowo: w repozytorium **Settings → Pages → Source: GitHub Actions**.

Sprawdź dokładny adres w zakładce Actions (krok „Deploy”) — wielkość liter w nazwie repozytorium ma znaczenie w adresie.

### Inny hosting niż GitHub

Czat to zwykłe pliki — można je wgrać na dowolny hosting (np. ten sam, na którym jest strona kliniki). Wgraj cały folder projektu **bez**: `panel/server`, `panel/backups`, `ai/server`, `tools`, `.git`, `.github`. W skryptach na stronie zamień adres `https://michalstankiewicz4-cell.github.io/AIsupportBOT/` na swój. Przy źródle ustawień „plik” po każdej zmianie w panelu wgrywasz ponownie tylko `panel/settings.json`.

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

- Imię wirtualnej konsultantki („Ilona”) ustawia się w `shared/js/knowledge.js` → `SITE.assistant` (oraz `SITE.assistantWith` — forma „z Iloną”). Zmienia się wtedy wszędzie: w czacie i w prompcie AI.
- Konsultantka zawsze przedstawia się jako **wirtualna** — nie udaje człowieka (ważne także prawnie: pacjent musi wiedzieć, że rozmawia z AI).
- Logo na ekranie powitalnym: `shared/img/logo.png`; miniatura przy imieniu konsultantki: `shared/img/avatar.png`.

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
