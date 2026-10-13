# Wariant AI — uruchomienie serwera

## Po co serwer?

Model AI wymaga **klucza API**. Gdyby klucz był w JavaScripcie strony, każdy mógłby go skopiować i używać na koszt kliniki. Dlatego przeglądarka łączy się z naszym małym serwerem-pośrednikiem (Cloudflare Worker), który:

- trzyma klucz w ukryciu (jako „secret”),
- dokleja prompt systemowy z zasadami i wiedzą o serwisie (pacjent nie może go zmienić),
- przyjmuje zapytania tylko z dozwolonych domen i ogranicza ich liczbę,
- ponownie sprawdza stany nagłe i usuwa z odpowiedzi linki spoza domeny kliniki.

Bez serwera wariant AI też działa — odpowiada wtedy bot regułowy, a w czacie widać adnotację „Tryb offline”.

## Krok po kroku (Windows, terminal w VS Code)

Model **Claude Haiku 5.5** (`claude-haiku-5-5`) jest ustawiony domyślnie — nic nie trzeba wybierać.

1. **Klucz API** — na [console.anthropic.com](https://console.anthropic.com):
   - załóż konto i doładuj saldo (**Billing**) — API rozlicza się osobno, subskrypcja Claude Pro/Max go nie obejmuje,
   - w **Settings → Limits** ustaw miesięczny limit wydatków (np. 20 USD),
   - w **API Keys → Create Key** utwórz klucz i skopiuj go (pokazuje się tylko raz).
2. **Konto Cloudflare** — darmowe: [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
3. **Pobierz repo:**

   ```powershell
   cd C:\Users\micha\vsrepos
   git clone https://github.com/michalstankiewicz4-cell/AIsupportBOT
   cd AIsupportBOT\ai\server
   ```

4. **Wdróż Workera:**

   ```powershell
   npx wrangler login                          # otworzy przeglądarkę — zaloguj się do Cloudflare
   npx wrangler secret put ANTHROPIC_API_KEY   # wklej klucz z kroku 1, Enter
   npx wrangler deploy
   ```

   Na końcu pojawi się adres, np. `https://lekarze-ai-assistant.twoja-nazwa.workers.dev`.
5. **Test:**

   ```powershell
   Invoke-RestMethod -Method Post -Uri "https://lekarze-ai-assistant.twoja-nazwa.workers.dev" `
     -Headers @{ Origin = "https://lekarzeiterapeuci.pl" } -ContentType "application/json" `
     -Body '{"message":"mam wysypkę na rękach"}' | ConvertTo-Json -Depth 5
   ```

   W odpowiedzi powinien być tekst od modelu z linkiem do „Dermatologia online”. Błąd `forbidden_origin` = brak nagłówka `Origin` lub domeny w `ALLOWED_ORIGINS`.
6. **Podłącz do czatu** — wpisz adres w `ai/config.js` (`endpoint: '...'`) **albo** podaj go na stronie w atrybucie `data-endpoint` (patrz WDROZENIE.md).
7. **Podbij wersję i wypchnij:** `npm run bump -- ai patch "Podłączenie serwera AI"`, potem `git push`.

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
