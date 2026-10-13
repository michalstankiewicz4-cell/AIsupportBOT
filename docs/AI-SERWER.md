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

## Ochrona przed kosztami

### 1. Po stronie konta (obowiązkowo)

- **Limit wydatków** w console.anthropic.com → Settings → Limits. Po przekroczeniu API przestaje odpowiadać, a czat sam przechodzi na bota regułowego.
- **Wyłącz auto-reload** w Billing — płacisz najwyżej tyle, ile doładujesz.
- **Osobny workspace** dla tego projektu, z własnym kluczem i limitem.
- **Reguła Rate limiting** w Cloudflare (Security → WAF), np. 30 zapytań / 10 min z jednego IP.

### 2. Prompt caching (włączone automatycznie)

Prompt systemowy (zasady + wiedza o stronie, ok. 3 tys. tokenów) jest taki sam dla każdego pacjenta, więc Worker oznacza go jako cache'owalny. Pierwsze zapytanie zapisuje go w cache (koszt ×1,25), kolejne czytają go za ok. **10% ceny**. Cache żyje 5 minut i odnawia się przy każdym użyciu.

- Mały ruch (rzadziej niż co 5 minut)? Ustaw w `wrangler.toml` `CACHE_TTL = "1h"` (zapis droższy ×2, ale cache żyje godzinę).
- Sprawdzenie: `npx wrangler tail` (w folderze `ai/server`) i zadaj pytanie w czacie. W logu `usage` pole `cache_read_input_tokens` > 0 oznacza, że cache działa.
- Szczegóły: [dokumentacja prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).

### 3. Cloudflare Turnstile — niewidoczna captcha (zalecane)

Bez Turnstile ktoś może wysyłać zapytania do Workera skryptem, podszywając się pod stronę kliniki. Z Turnstile Worker przyjmuje tylko zapytania z prawdziwej przeglądarki. Pacjent zwykle niczego nie widzi; tylko przy podejrzanym ruchu Cloudflare pokaże pole „Potwierdź, że jesteś człowiekiem”. Po jednym sprawdzeniu przeglądarka dostaje sesję ważną 30 minut.

1. W panelu Cloudflare: **Turnstile → Add widget**.
   - Hostnames: `lekarzeiterapeuci.pl`, `michalstankiewicz4-cell.github.io`
   - Widget mode: **Invisible** (lub Managed).
   - Skopiuj **Site Key** (publiczny) i **Secret Key** (tajny).
2. Sekret do Workera:

   ```powershell
   cd ai\server
   npx wrangler secret put TURNSTILE_SECRET_KEY    # wklej Secret Key
   npx wrangler deploy
   ```

3. Site Key do czatu: w `ai/config.js` (`turnstileSiteKey: '...'`) albo na stronie w atrybucie `data-turnstile`.

Kolejność ma znaczenie: dopóki Worker nie ma sekretu, Turnstile jest wyłączony; gdy sekret jest, a czat nie ma Site Key — AI odmówi, a czat przejdzie na bota. Ustaw oba naraz.

Do testów lokalnych Cloudflare udostępnia klucze, które zawsze przechodzą: Site Key `1x00000000000000000000AA`, Secret Key `1x0000000000000000000000000000000AA`.

## Konfiguracja (`ai/server/wrangler.toml`)

- `ALLOWED_ORIGINS` — domeny, z których wolno korzystać z serwera (klinika + GitHub Pages do testów). Po zakończeniu testów można usunąć adres GitHub Pages.
- `MODEL` — domyślnie `claude-haiku-5-5` (szybki i tani). Zmiana modelu = zmiana zachowania → podbij wersję `ai` jako `major`.

Stałe w `ai/server/worker.js`: `MAX_HISTORY` (ile poprzednich wiadomości widzi model), `MAX_TOKENS` (długość odpowiedzi), `RATE_LIMIT` (zapytań na minutę z jednego IP). Na produkcji dodaj też regułę **Rate limiting** w panelu Cloudflare.

## Zmiana zachowania AI

- Wiedza (zakładki, usługi, ceny) — w `shared/js/knowledge.js`; prompt aktualizuje się sam przy następnym `wrangler deploy`.
- Zasady (ton, długość, czego nie wolno) — w `ai/server/prompt.js`.
- Po każdej zmianie: `npm test`, `npx wrangler deploy` (z folderu `ai/server`), podbicie wersji `ai`.

## Koszty

Płaci się za liczbę przetworzonych tokenów (tekst pytania + prompt + odpowiedź). Aktualne stawki: [anthropic.com/pricing](https://www.anthropic.com/pricing). Największą część stanowi prompt systemowy — dzięki prompt caching kolejne pytania płacą za niego ok. 10% stawki. Zabezpieczenia przed nadmiernymi kosztami — sekcja „Ochrona przed kosztami” wyżej.
