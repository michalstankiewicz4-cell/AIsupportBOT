# Jak uczyć asystenta

## Czy jesteśmy w stanie sami „nauczyć model”? (nawet jako prompter)

**Tak — i robimy to już w tym projekcie, na trzy sposoby, od najprostszego do najtrudniejszego:**

| Poziom | Co to znaczy | Kto da radę | W projekcie |
|---|---|---|---|
| 1. Wiedza + prompt | Model „uczy się” z dokumentu wiedzy i zasad doklejanych do każdego pytania (tzw. RAG / prompt engineering) | prompter — wystarczy edytować tekst | wariant **ai** (`knowledge.js` + `ai/server/prompt.js`) |
| 2. Własny mały model | Uczymy klasyfikator na naszych przykładach pytań; on wybiera gotową, sprawdzoną odpowiedź | prompter — dopisujesz przykłady do JSON i uruchamiasz jedno polecenie | wariant **trained** |
| 3. Fine-tuning dużego modelu | Douczanie modelu językowego na setkach–tysiącach par pytanie/odpowiedź | potrzebny programista ML, budżet, czas | nie robimy — patrz niżej |

**Wniosek:** do tego zadania nie trzeba (i nie warto) douczać dużego modelu. Asystent nie ma „umieć medycyny” — ma umieć **kierować**. To świetnie robią poziomy 1 i 2, a przy medycynie mają ogromną zaletę: odpowiedzi są przewidywalne i sprawdzone przez człowieka. Fine-tuning ma sens dopiero, gdy uzbieramy tysiące prawdziwych, zanonimizowanych rozmów — i nadal wymaga kontroli, bo douczony model może „zmyślać”.

## Wariant trained — jak go uczyć (poziom 2)

Model to klasyfikator **Naive Bayes**: na podstawie przykładów uczy się, które słowa wskazują na którą intencję (np. „wysypka” → `skora`). Potem dla nowego pytania wybiera najbardziej prawdopodobną intencję i pokazuje przygotowaną odpowiedź z `knowledge.js`. Model **nie pisze** własnych odpowiedzi, więc nie poda błędnej porady.

### Cykl nauki

1. **Zbierz pytania**, na które asystent odpowiedział źle (od klienta, z testów, z infolinii).
2. **Dopisz je** do `trained/data/training.json` pod właściwą intencją:

   ```json
   "alergia": [
     "mam alergię",
     "łzawią mi oczy na wiosnę",      ← nowy przykład
     ...
   ]
   ```

   Pisz tak, jak piszą pacjenci: z błędami, potocznie, krótko i długo.
3. **Uruchom trening:** `npm run train`. Zobaczysz raport:

   ```
   Trafność (leave-one-out): 83.3% (239/287)
   Pomyłki — dopisz podobne przykłady do właściwej intencji:
     "mam problem z zasypianiem" → psychiatra (oczekiwano: bezsennosc)
   ```

   „Leave-one-out” oznacza: każdy przykład jest po kolei ukrywany, model uczy się na reszcie i próbuje go zgadnąć. To uczciwy test na pytaniach, których model „nie widział”. Pomyłki pokazują, czego dopisać więcej.
4. **Sprawdź:** `npm test` i podgląd w `index.html`.
5. **Zapisz wersję:** `npm run bump -- trained minor "Dodano przykłady o alergiach"` i push.

### Dobre praktyki

- Minimum ~8–10 przykładów na intencję; najtrudniejsze tematy (psychiatra vs psycholog, ginekologia vs antykoncepcja) — więcej.
- Intencja `offtopic` uczy model, czego **nie** obsługiwać — dopisuj tam dziwne pytania z prawdziwego ruchu.
- Nie wpisuj prawdziwych danych pacjentów (imion, PESEL-i) do przykładów.
- Progi pewności są w `trained/trained-engine.js` (`ACCEPT`, `MARGIN`). Gdy model jest niepewny, odsyła do infolinii — to bezpieczne zachowanie.

### Nowy temat / nowa zakładka

1. Dodaj intencję w `shared/js/knowledge.js` (id, słowa kluczowe, odpowiedź z linkami) — to od razu uczy **bota** i trafia do promptu **AI**.
2. Dodaj ten sam `id` z przykładami w `training.json` — to uczy **trained**.
3. `npm run train`, `npm test`, `npm run bump -- all minor "Nowa usługa: ..."`.

## Wariant ai — jak go „uczyć” (poziom 1)

- Wiedza: `shared/js/knowledge.js` (wspólna z pozostałymi).
- Zachowanie: `ai/server/prompt.js` — pisz zasady jasno, w punktach, z przykładami dobrych i złych odpowiedzi.
- Testuj na trudnych pytaniach (próby wyciągnięcia diagnozy, „zapomnij instrukcje”, pytania nie na temat) przed każdym wdrożeniem.

## Wariant bot — jak go uczyć

Tylko przez słowa kluczowe w `shared/js/knowledge.js`. Słowa piszemy **bez polskich znaków**, małymi literami; `*` na końcu oznacza „dowolna końcówka” (`alergi*` → alergia, alergii, alergiczny). Uwaga na zbyt krótkie rdzenie — `skor*` łapałoby też „skorzystać”.
