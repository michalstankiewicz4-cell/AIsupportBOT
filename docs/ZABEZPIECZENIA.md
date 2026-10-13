# Zabezpieczenia przed kosztami — instrukcja krok po kroku

Dotyczy tylko wariantu **ai**. Warianty **bot** i **trained** nic nie kosztują.

Zabezpieczenia działają warstwami. Każda kolejna łapie to, co przepuściła poprzednia:

| Warstwa | Przed czym chroni | Gdzie | Czas |
|---|---|---|---|
| 1. Limit wydatków | każdym scenariuszem — twardy sufit kosztów | konsola Anthropic | 2 min |
| 2. Osobny workspace i klucz | wyciekiem klucza, mieszaniem kosztów projektów | konsola Anthropic | 2 min |
| 3. Turnstile | botami i skryptami spamującymi Workera | Cloudflare + czat | 10 min |
| 4. Rate limiting | jedną osobą wysyłającą setki pytań | Cloudflare | 3 min |
| 5. Prompt caching | zwykłym kosztem każdego pytania (~90% taniej za prompt) | działa samo | 0 min |
| 6. Limity w kodzie | długimi pytaniami i odpowiedziami | `ai/server/worker.js` | już ustawione |

Gdy którakolwiek warstwa zablokuje AI, czat **nie przestaje działać** — odpowiada bot regułowy z adnotacją w okienku.

> Nazwy przycisków w panelach Anthropic i Cloudflare mogą się z czasem nieco zmieniać — szukaj podobnie nazwanych opcji.

---

## 1. Limit wydatków (najważniejsze)

1. Wejdź na [console.anthropic.com](https://console.anthropic.com) i zaloguj się.
2. **Settings → Limits** → ustaw **miesięczny limit wydatków** (spend limit), np. 20 USD.
3. **Settings → Billing**:
   - doładuj saldo kwotą, którą akceptujesz jako maksymalną stratę,
   - **wyłącz auto-reload** (automatyczne doładowanie).

Efekt: po wyczerpaniu limitu lub salda API odrzuca zapytania, a czat sam przełącza się na bota. Więcej niż ustawiony limit nie zapłacisz.

Ustaw też powiadomienia e-mail o zbliżaniu się do limitu, jeśli konsola je oferuje.

## 2. Osobny workspace i klucz

1. W konsoli: **Settings → Workspaces → Create workspace**, nazwa np. `lekarzeiterapeuci-czat`.
2. Ustaw limit wydatków **dla tego workspace'u** (może być niższy niż limit całego konta).
3. W tym workspace utwórz klucz: **API Keys → Create Key**.
4. Ten klucz (i tylko ten) wgraj do Workera:

   ```powershell
   cd C:\Users\micha\vsrepos\AIsupportBOT\ai\server
   npx wrangler secret put ANTHROPIC_API_KEY
   ```

Jeśli klucz kiedykolwiek wycieknie: usuń go w konsoli, utwórz nowy i powtórz polecenie wyżej. Klucz **nigdy** nie trafia do repozytorium ani na stronę — siedzi tylko w Cloudflare.

## 3. Cloudflare Turnstile (niewidoczna captcha)

Bez Turnstile każdy może wysyłać zapytania do Workera skryptem, podając fałszywy nagłówek `Origin`. Z Turnstile Worker przyjmuje tylko zapytania z prawdziwej przeglądarki.

Jak to działa dla pacjenta: przy pierwszym pytaniu przeglądarka w tle (ok. 1 s) potwierdza w Cloudflare, że jest człowiekiem. Worker daje jej podpisaną **sesję ważną 30 minut**, przypiętą do adresu IP — kolejne pytania nie wymagają już sprawdzenia. Okienko „potwierdź, że jesteś człowiekiem” pojawia się tylko przy podejrzanym ruchu.

### 3.1. Utwórz widżet

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Turnstile** → **Add widget**.
2. Wypełnij:
   - **Widget name:** `Asystent lekarzeiterapeuci`
   - **Hostnames:** `lekarzeiterapeuci.pl`, `www.lekarzeiterapeuci.pl`, `michalstankiewicz4-cell.github.io`
   - **Widget mode:** `Invisible` (albo `Managed`)
3. Po zapisaniu skopiuj dwa klucze:
   - **Site Key** — publiczny, idzie do czatu,
   - **Secret Key** — tajny, idzie tylko do Workera.

### 3.2. Sekret do Workera

```powershell
cd C:\Users\micha\vsrepos\AIsupportBOT\ai\server
npx wrangler secret put TURNSTILE_SECRET_KEY    # wklej Secret Key, Enter
npx wrangler deploy
```

### 3.3. Site Key do czatu

Wybierz **jeden** sposób:

- **W repozytorium** — w `ai/config.js`:

  ```js
  export const AI_CONFIG = {
    endpoint: 'https://lekarze-ai-assistant.TWOJA-NAZWA.workers.dev',
    turnstileSiteKey: '0x4AAAAAAA...',
    timeoutMs: 20000,
  };
  ```

  potem `npm run bump -- ai patch "Włączenie Turnstile"` i `git push`.

- **Na stronie kliniki** — w tagu skryptu:

  ```html
  <script src="https://michalstankiewicz4-cell.github.io/AIsupportBOT/ai/embed.js"
          data-endpoint="https://lekarze-ai-assistant.TWOJA-NAZWA.workers.dev"
          data-turnstile="0x4AAAAAAA..." defer></script>
  ```

> **Ustaw oba klucze w tym samym czasie.** Sekret w Workerze bez Site Key w czacie = AI odrzuca wszystkie pytania (czat odpowiada wtedy botem). Site Key w czacie bez sekretu w Workerze = Turnstile nic nie sprawdza.

### 3.4. Test

1. Otwórz https://michalstankiewicz4-cell.github.io/AIsupportBOT/demo/floating.html?variant=ai
2. Zadaj pytanie, np. „mam wysypkę”.
3. Odpowiedź **bez** dopisku „odpowiada asystent regułowy” = Turnstile i AI działają.
4. Test, że blokada działa — w PowerShell (bez tokena Turnstile):

   ```powershell
   Invoke-RestMethod -Method Post -Uri "https://lekarze-ai-assistant.TWOJA-NAZWA.workers.dev" `
     -Headers @{ Origin = "https://lekarzeiterapeuci.pl" } -ContentType "application/json" `
     -Body '{"message":"test"}'
   ```

   Oczekiwany wynik: błąd **401** `turnstile_required`.

**Klucze testowe** (do testów lokalnych, zawsze przechodzą — nie używaj na produkcji):
Site Key `1x00000000000000000000AA`, Secret Key `1x0000000000000000000000000000000AA`.

## 4. Rate limiting w Cloudflare

Ogranicza liczbę zapytań z jednego adresu IP — chroni przed jedną osobą, która „bawi się” czatem setki razy.

Wariant prosty (bez własnej domeny w Cloudflare): limit jest już w kodzie Workera — **20 zapytań na minutę z IP** (`RATE_LIMIT` w `ai/server/worker.js`). Działa „best effort” (osobno na każdej instancji Workera), więc razem z Turnstile i limitem wydatków jest wystarczający na start.

Wariant mocniejszy (gdy Worker działa pod domeną dodaną do Cloudflare, np. `czat.lekarzeiterapeuci.pl`):

1. Panel domeny → **Security → WAF → Rate limiting rules → Create rule**.
2. Ustaw:
   - **If incoming requests match:** `Hostname equals czat.lekarzeiterapeuci.pl`
   - **Rate:** 30 requests / 10 minutes, **counting by IP**
   - **Then:** Block, na 10 minut
3. **Deploy**.

## 5. Prompt caching (działa automatycznie)

Prompt systemowy (zasady + wiedza o stronie, ok. 3 tys. tokenów) jest taki sam dla każdego pytania. Worker oznacza go do cache'owania, więc:

- pierwsze pytanie zapisuje go w cache (koszt ×1,25),
- kolejne pytania w ciągu 5 minut czytają go za ok. **10% normalnej ceny**; każde użycie odnawia 5 minut.

**Mały ruch** (pytania rzadziej niż co 5 minut)? W `ai/server/wrangler.toml` odkomentuj:

```toml
CACHE_TTL = "1h"
```

i zrób `npx wrangler deploy`. Zapis kosztuje wtedy ×2, ale cache żyje godzinę.

**Sprawdzenie, że działa:**

```powershell
cd C:\Users\micha\vsrepos\AIsupportBOT\ai\server
npx wrangler tail
```

Zadaj w czacie 2 pytania pod rząd. W logu przy drugim pytaniu wpis `usage` powinien mieć `cache_read_input_tokens` większe od 0. Jeśli oba pola cache są 0 — prompt jest za krótki albo cache wygasł.

Szczegóły: [dokumentacja prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).

## 6. Limity w kodzie (już ustawione)

W `ai/server/worker.js`:

| Stała | Wartość | Znaczenie |
|---|---|---|
| `MAX_TOKENS` | 400 | maksymalna długość odpowiedzi modelu |
| `MAX_HISTORY` | 6 | ile poprzednich wiadomości widzi model |
| `RATE_LIMIT` | 20 / min | zapytań z jednego IP |
| `SESSION_TTL_MS` | 30 min | ważność sesji po sprawdzeniu Turnstile |

Pytanie pacjenta jest obcinane do 500 znaków (`shared/js/safety.js`). Po zmianie którejkolwiek wartości: `npx wrangler deploy` i `npm run bump -- ai patch "..."`.

---

## Lista kontrolna przed uruchomieniem

- [ ] Limit wydatków ustawiony, auto-reload wyłączony
- [ ] Osobny workspace i klucz tylko dla czatu
- [ ] `ANTHROPIC_API_KEY` w Workerze (`wrangler secret put`)
- [ ] Widżet Turnstile z właściwymi hostnames
- [ ] `TURNSTILE_SECRET_KEY` w Workerze **i** Site Key w czacie
- [ ] Test: pytanie w czacie działa, zapytanie z PowerShell bez tokena → 401
- [ ] `wrangler tail`: `cache_read_input_tokens` > 0 przy drugim pytaniu
- [ ] (opcjonalnie) reguła Rate limiting w Cloudflare

## Najczęstsze problemy

| Objaw | Przyczyna | Rozwiązanie |
|---|---|---|
| Czat zawsze pokazuje „odpowiada asystent regułowy” | brak `endpoint`, Worker nie działa lub brak środków | sprawdź `ai/config.js`, `npx wrangler tail`, saldo w konsoli |
| 401 `turnstile_required` w czacie | sekret w Workerze, brak Site Key w czacie | dodaj Site Key (krok 3.3) |
| Okienko Turnstile się nie pojawia, błąd w konsoli przeglądarki | domena nie jest na liście hostnames widżetu | dodaj domenę w panelu Turnstile |
| 403 `forbidden_origin` | domena strony nie jest w `ALLOWED_ORIGINS` | dopisz ją w `wrangler.toml`, `npx wrangler deploy` |
| 429 / „zbyt wiele pytań” | zadziałał limit zapytań z IP | to zamierzone; w razie potrzeby zwiększ `RATE_LIMIT` |
| `cache_read_input_tokens` zawsze 0 | pytania rzadziej niż co 5 minut | ustaw `CACHE_TTL = "1h"` |
