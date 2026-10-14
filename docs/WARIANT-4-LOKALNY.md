# Wariant 4 (opcjonalny): własny model językowy na serwerze z GPU

> **Dokument informacyjny.** Ten wariant nie jest zaimplementowany. Opisuje, jak można go dodać, kiedy ma to sens, ile to kosztuje i jakie niesie ryzyka — żeby klient mógł świadomie zdecydować.

## Czym różni się od pozostałych

| | bot | ai | trained | **local (wariant 4)** |
|---|---|---|---|---|
| Rozumienie swobodnych pytań | słabe | bardzo dobre | dobre w zakresie danych | dobre (zależy od modelu) |
| Gdzie trafia treść pytania | nigdzie | Cloudflare + Anthropic | nigdzie | **tylko nasz serwer** |
| Koszt | 0 | za każde pytanie | 0 | **stały, miesięczny** (serwer) |
| Serwer | nie | Worker (darmowy) | nie | **serwer z GPU 24/7** |
| Pilnowanie zasad („nie diagnozuj”) | pewne (gotowe odpowiedzi) | bardzo dobre | pewne (gotowe odpowiedzi) | **słabsze — wymaga testów** |
| Utrzymanie | minimalne | minimalne | minimalne | **duże** (aktualizacje, bezpieczeństwo, awarie) |

## Kiedy to ma sens

- Klient **nie może** wysyłać pytań pacjentów do zewnętrznych dostawców (wymogi RODO, polityka wewnętrzna, umowy) — a wariant **trained** rozumie pytania za słabo.
- Ruch jest **duży i stały** — stały koszt serwera staje się niższy niż płacenie za każde pytanie w API.
- Klient ma lub chce mieć własną infrastrukturę i osobę, która się nią zajmie.

Przy małym i średnim ruchu wariant 4 jest zwykle **droższy i bardziej pracochłonny** niż `ai` z dobrze ustawionymi zabezpieczeniami ([ZABEZPIECZENIA.md](ZABEZPIECZENIA.md)) albo `trained` z dobrze rozbudowanymi danymi.

## Architektura

Widżet, wiedza i warstwa bezpieczeństwa zostają **te same**. Zmienia się tylko to, kto generuje odpowiedź:

```
przeglądarka pacjenta
   │  (ten sam widżet, ten sam embed.js)
   ▼
nasz serwer-pośrednik (Node.js)         ← odpowiednik Workera z wariantu ai
   │  - CORS, Turnstile, limity, safety.js (112)
   │  - prompt z ai/server/prompt.js (ta sama wiedza z knowledge.js)
   │  - filtr linków spoza domeny kliniki
   ▼
serwer modelu na GPU (Ollama lub vLLM)  ← model działa lokalnie, dane nie wychodzą
```

Planowana struktura w repozytorium (gdyby wariant powstał):

```
local/
├── embed.js, version.js, local-engine.js   — jak w ai/, inny adres serwera
└── server/
    ├── server.js        — pośrednik: te same zabezpieczenia co ai/server/worker.js
    ├── docker-compose.yml — pośrednik + Ollama/vLLM jednym poleceniem
    └── README.md
```

Wersjonowanie: czwarty typ `local` dopisany do `VARIANTS` w `tools/versioning.js`, `versions.json` i `CHANGES.md` — te same zasady co dla pozostałych trzech.

Panel sterowania jest na to przygotowany: wystarczy dopisać `local` do listy silników (`ENGINES` w `panel/schema.js` i `shared/js/embed-core.js`), a tryby pracy pozwolą np. na kolejność „nasz model → model lokalny → AI”.

## Oprogramowanie do uruchomienia modelu

| Narzędzie | Dla kogo | Uwagi |
|---|---|---|
| **Ollama** | start, pilotaż, mały ruch | instalacja jednym poleceniem, działa też na Windows; proste API |
| **vLLM** | produkcja, wielu użytkowników naraz | znacznie wyższa przepustowość; API zgodne z formatem OpenAI; Linux + GPU NVIDIA |
| **llama.cpp / LM Studio** | testy na własnym komputerze | dobre do porównania modeli przed zakupem serwera |

## Modele do rozważenia

Modele otwarte (open-weights) zmieniają się co kilka miesięcy — przed decyzją sprawdź aktualne wersje i licencje (czy dopuszczają użycie komercyjne).

- **Bielik** (SpeakLeash / ACK Cyfronet AGH) — polski model, trenowany na polskich tekstach; naturalny pierwszy kandydat dla polskojęzycznych pacjentów.
- **Llama** (Meta), **Qwen** (Alibaba), **Mistral**, **Gemma** (Google) — rodziny modeli wielojęzycznych; jakość polskiego różni się między wersjami, trzeba testować.

Na nasze zadanie (kierowanie do zakładki, krótkie odpowiedzi) wystarczy model rzędu **7–12 mld parametrów**. Większe modele lepiej pilnują zasad, ale wymagają droższego GPU.

## Sprzęt (orientacyjnie)

Przybliżone zapotrzebowanie na pamięć karty graficznej (VRAM) przy kwantyzacji 4-bitowej, typowej dla takich wdrożeń:

| Wielkość modelu | VRAM | Przykładowa karta |
|---|---|---|
| 7–8 mld | ~6–8 GB | RTX 4060 Ti 16 GB, L4 |
| 11–14 mld | ~10–12 GB | RTX 4070 Ti / 4080, L4 |
| ~30 mld | ~20–24 GB | RTX 4090, L40S |
| ~70 mld | ~40–48 GB | A100, H100, 2× RTX 4090 |

Do tego: zapas VRAM na równoległe rozmowy, 32+ GB RAM, dysk SSD. Wartości są szacunkowe — zawsze sprawdź na konkretnym modelu.

## Gdzie postawić serwer

- **Chmura GPU w UE** (np. OVHcloud, Scaleway, Hetzner, Google Cloud / AWS / Azure w regionach europejskich) — płatność godzinowa lub miesięczna, dane w UE. Ceny zmieniają się często; serwer z kartą klasy L4 to zwykle wydatek rzędu kilkuset do ponad tysiąca złotych miesięcznie przy pracy 24/7 — sprawdź aktualne cenniki.
- **Własny serwer** w siedzibie klienta lub kolokacji — jednorazowy zakup sprzętu, potem prąd, łącze i administracja.
- **Pilotaż na własnym komputerze** — jeśli masz kartę NVIDIA z ≥ 8 GB VRAM, można przetestować cały wariant lokalnie przez Ollamę, zanim ktokolwiek wyda pieniądze na serwer.

## Bezpieczeństwo i jakość — na co uważać

1. **Słabsze trzymanie się zasad.** Mniejsze modele otwarte łatwiej „namówić” na diagnozę lub poradę. Dlatego:
   - warstwa `shared/js/safety.js` (112, kryzys) **zawsze** działa przed modelem,
   - filtr linków spoza domeny kliniki — obowiązkowy,
   - przed wdrożeniem: zestaw testowy kilkuset trudnych pytań (próby wyciągnięcia diagnozy, dawkowania, „zapomnij instrukcje”) i ręczna ocena odpowiedzi.
2. **Serwer jest nasz — bezpieczeństwo też.** Aktualizacje systemu, firewall, HTTPS, model niedostępny bezpośrednio z internetu (tylko przez pośrednika), kopie konfiguracji, monitoring.
3. **Dostępność.** Gdy serwer padnie, widżet przechodzi na bota regułowego (ten sam mechanizm co w wariancie `ai`), ale ktoś musi go podnieść.
4. **RODO.** Dane nie wychodzą poza nasz serwer, co upraszcza sprawę — ale nadal trzeba opisać przetwarzanie w polityce prywatności, nie logować treści pytań bez potrzeby i zadbać o umowę z dostawcą chmury.
5. **Wyrób medyczny.** Jak przy pozostałych wariantach — asystent tylko kieruje, nie diagnozuje; warto potwierdzić to z prawnikiem.

## Fine-tuning (douczanie) — kiedy już jest GPU

Mając serwer z GPU, można dodatkowo douczyć model metodą **LoRA** na naszych przykładach (np. pary pytanie → właściwa zakładka z `trained/data/training.json`, rozbudowane do kilkuset–kilku tysięcy). Daje to model lepiej dopasowany do stylu i zakresu kliniki.

Zastrzeżenia:
- potrzebny programista ML i dobrze przygotowane, zanonimizowane dane,
- każda wersja douczonego modelu wymaga ponownych testów bezpieczeństwa,
- przy naszym zadaniu (kierowanie, nie wiedza medyczna) zysk bywa mniejszy niż z dobrego promptu i wiedzy w `knowledge.js`.

Rekomendacja: zacząć **bez** fine-tuningu (sam model + prompt + wiedza), a douczać dopiero, gdy testy pokażą konkretne braki.

## Proponowana ścieżka, gdyby klient się zdecydował

1. **Pilotaż (1–2 dni):** Ollama na komputerze z GPU, 2–3 modele (np. Bielik + jeden wielojęzyczny), ten sam prompt co w `ai`. Porównanie odpowiedzi na zestawie testowym z wariantem `ai`.
2. **Decyzja:** czy jakość wystarcza i czy koszt serwera ma sens przy przewidywanym ruchu.
3. **Implementacja (kilka dni):** folder `local/`, pośrednik w Node.js z tymi samymi zabezpieczeniami, `docker-compose`, wersjonowanie `local 1.0.0`, dokumentacja wdrożenia.
4. **Serwer produkcyjny:** chmura GPU w UE, HTTPS, monitoring, test obciążeniowy.
5. **Uruchomienie:** podmiana jednej linijki `<script>` na stronie kliniki na `local/embed.js`.
