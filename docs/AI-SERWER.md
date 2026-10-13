# Wariant AI — uruchomienie serwera

## Po co serwer?

Model AI wymaga **klucza API**. Gdyby klucz był w JavaScripcie strony, każdy mógłby go skopiować i używać na koszt kliniki. Dlatego przeglądarka łączy się z naszym małym serwerem-pośrednikiem (Cloudflare Worker), który:

- trzyma klucz w ukryciu (jako „secret”),
- dokleja prompt systemowy z zasadami i wiedzą o serwisie (pacjent nie może go zmienić),
- przyjmuje zapytania tylko z dozwolonych domen i ogranicza ich liczbę,
- ponownie sprawdza stany nagłe i usuwa z odpowiedzi linki spoza domeny kliniki.

Bez serwera wariant AI też działa — odpowiada wtedy bot regułowy, a w czacie widać adnotację „Tryb offline”.

## Krok po kroku (Windows, terminal w VS Code)

1. **Klucz API** — załóż konto na [console.anthropic.com](https://console.anthropic.com), utwórz klucz i **ustaw limit wydatków** (Billing → Limits).
2. **Konto Cloudflare** — darmowe, [dash.cloudflare.com](https://dash.cloudflare.com).
3. W folderze projektu:

   ```bash
   cd ai/server
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY     # wklej klucz, gdy poprosi
   npx wrangler deploy
   ```

   Na końcu pojawi się adres, np. `https://lekarze-ai-assistant.twoje-konto.workers.dev`.
4. Wpisz ten adres w `ai/config.js` (`endpoint: '...'`) **albo** podaj go na stronie w atrybucie `data-endpoint` (patrz WDROZENIE.md).
5. Podbij wersję: `npm run bump -- ai patch "Podłączenie serwera AI"` i zrób push.

## Konfiguracja (`ai/server/wrangler.toml`)

- `ALLOWED_ORIGINS` — domeny, z których wolno korzystać z serwera (klinika + GitHub Pages do testów). Po zakończeniu testów można usunąć adres GitHub Pages.
- `MODEL` — domyślnie `claude-haiku-5-5` (szybki i tani). Zmiana modelu = zmiana zachowania → podbij wersję `ai` jako `major`.

Stałe w `ai/server/worker.js`: `MAX_HISTORY` (ile poprzednich wiadomości widzi model), `MAX_TOKENS` (długość odpowiedzi), `RATE_LIMIT` (zapytań na minutę z jednego IP). Na produkcji dodaj też regułę **Rate limiting** w panelu Cloudflare.

## Zmiana zachowania AI

- Wiedza (zakładki, usługi, ceny) — w `shared/js/knowledge.js`; prompt aktualizuje się sam przy następnym `wrangler deploy`.
- Zasady (ton, długość, czego nie wolno) — w `ai/server/prompt.js`.
- Po każdej zmianie: `npm test`, `npx wrangler deploy` (z folderu `ai/server`), podbicie wersji `ai`.

## Koszty

Płaci się za liczbę przetworzonych tokenów (tekst pytania + prompt + odpowiedź). Aktualne stawki: [anthropic.com/pricing](https://www.anthropic.com/pricing). Prompt systemowy jest wysyłany przy każdym pytaniu, więc im krótsza `knowledge.js`, tym taniej. Limit wydatków w konsoli Anthropic chroni przed niespodziankami.
