# Wdrożenie na lekarzeiterapeuci.pl

## 1. Publikacja na GitHub Pages

Repozytorium ma gotowy workflow `.github/workflows/static.yml`. Po pushu na gałąź `main`:

1. GitHub Actions uruchamia `check-versions.js` i testy — **jeśli coś się nie zgadza, strona się nie opublikuje**.
2. Pliki trafiają na GitHub Pages pod adres w stylu `https://michalstankiewicz4-cell.github.io/AIsupportBOT/`.

Jednorazowo: w repozytorium **Settings → Pages → Source: GitHub Actions**.

Sprawdź dokładny adres w zakładce Actions (krok „Deploy”) — wielkość liter w nazwie repozytorium ma znaczenie w adresie.

## 2. Wstawienie czatu na stronę kliniki

Osoba, która ma dostęp do kodu strony lekarzeiterapeuci.pl, wkleja **jedną linijkę** przed `</body>` (na wszystkich podstronach — zwykle w szablonie stopki). Wybierz jeden wariant:

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
| `data-turnstile` | site key Turnstile | Tylko wariant AI — ochrona przed botami (patrz AI-SERWER.md) |

### Sterowanie z poziomu strony

Po załadowaniu dostępny jest obiekt `window.LTChat`, np. przycisk „Zapytaj asystenta”:

```html
<button onclick="LTChat.open()">Zapytaj asystenta</button>
```

Dostępne: `LTChat.open()`, `LTChat.close()`, `LTChat.ask("tekst")`, `LTChat.reset()`.

## 3. Uwaga: strona ma już czat

Na lekarzeiterapeuci.pl jest widoczny „czat na żywo”. Przed wdrożeniem ustal z klientem, czy asystent ma go zastąpić, czy działać obok (wtedy ustaw `data-position="left"`, żeby przyciski się nie nakładały).

## 4. Aktualizacja wiedzy

Gdy na stronie zmienią się zakładki, ceny lub numer infolinii — popraw `shared/js/knowledge.js`, uruchom `npm run train` i `npm test`, podbij wersję `npm run bump -- all minor "Aktualizacja cennika"`, zrób push. Czat na stronie zaktualizuje się sam (strona kliniki nie wymaga zmian).

## 5. Bezpieczeństwo i RODO — do ustalenia z klientem

- **Bot i trained** działają w całości w przeglądarce pacjenta — treść pytań **nigdzie nie jest wysyłana**.
- **AI** wysyła treść pytania do Cloudflare i do dostawcy modelu (Anthropic). Pytania o zdrowie to dane szczególnej kategorii (art. 9 RODO), więc przed uruchomieniem wariantu AI klient powinien: uwzględnić to w polityce prywatności, mieć umowy powierzenia (DPA) z dostawcami i ocenić transfer danych poza EOG. Czat i tak prosi pacjenta, by nie podawał danych osobowych.
- Asystent nie stawia diagnoz, tylko kieruje do usług — warto jednak, by klient potwierdził z prawnikiem, że taka forma nie wymaga certyfikacji jako wyrób medyczny.
- Imię pacjenta (ekran powitalny) służy tylko do wyświetlania w oknie czatu: zostaje w przeglądarce i **nie jest wysyłane** do serwera AI.
- Rozmowa jest zapamiętywana tylko w `sessionStorage` przeglądarki (znika po zamknięciu karty), żeby nie ginęła przy przejściu na inną zakładkę strony.
