# Plan wdrożenia specyfikacji czatu „Ilona” (wersja 1.0 z 14.10.2026)

Źródło: „Czat Ilona · lekarzeiterapeuci.pl · specyfikacja dla programisty”, wersja 1.0 z 14.10.2026 (PDF od klienta, celowo nie w repo).
Kolejność punktów wybrana tak, żeby każdy krok dało się od razu przetestować. Numery w nawiasach odnoszą się do sekcji 8 specyfikacji („Co zmienić”).
Status: `[x]` zrobione · `[~]` zrobione częściowo (opis niżej) · `[ ]` do zrobienia · `[?]` decyzja klienta.

Na start pracujemy na **bocie regułowym**, więc zmiany dotyczą przede wszystkim bota i części wspólnej (bezpieczeństwo, widżet, teksty). Silniki trained/AI korzystają z tych samych tekstów i przycisków.

---

## Etap 1 — fundamenty (KONIECZNE)

- [x] **1. Testy akceptacyjne (8)** — 32 testy z sekcji 10 specyfikacji w `tools/test.js`; każdy sprawdza przypadek A–M i kluczowe elementy odpowiedzi. Niezaliczony test blokuje publikację (GitHub Actions). — `tools/test.js`, sekcja „Testy akceptacyjne”: 32 testy + 4 testy normalizacji + zasady nadrzędne (przycisk w każdej odpowiedzi, maks. 4 zdania, czerwony tylko przy 112). **37/37 ✓**
- [x] **2. Normalizacja wpisu (5)** — małe litery i bez ogonków (było), zwijanie powtórzeń liter i znaków („boooli” = „boli”), literówki: odległość ≤ 1 dla słów od 5 liter („dermatolok”, „zwolninie”), rdzenie słów (było: `bol*`, `depres*`). — `shared/js/text.js`: `normalize()` zwija powtórzenia, `matchesPhrase()` toleruje 1 literówkę (słowa od 5 liter; początki słów od 6 — żeby „zapalenie” nie dawało „zawał”); fraza z `=` na początku — bez tolerancji („połknąć”).
- [x] **3. Mapa przypadków A–M i stała kolejność reguł (1)** — każda odpowiedź ma przypadek (`case`); pierwsza pasująca reguła wygrywa zamiast „najwięcej punktów”. A i B zawsze pierwsze, na każdej wiadomości. — `CASE_ORDER` w `shared/js/knowledge.js`, wybór w `bot/bot-engine.js`. Odstępstwa: J (cena) przed tematami — wymaga tego test 27; M po D — „dzień dobry, boli mnie kręgosłup” to dolegliwość.
- [x] **4. Dwa komunikaty przy A i B (2)** — czerwona karta + drugi, zwykły komunikat (teksty ze specyfikacji); wariant B „o osobie bliskiej”; B ma pierwszeństwo nad C, A nad E. — `shared/js/safety.js` + `alarmReply()`; wariant „osoba bliska” (mąż, syn, „mówi, że…”); widżet pokazuje oba komunikaty od razu, bez opóźnienia.
- [x] **5. Domyślnie konsultacja lekarska — przypadek D (3)** — każda wiadomość z treścią zdrowotną, której nie obsłużyła reguła wyżej, dostaje D (słownik zdrowia: ciało, ból, choroba, objawy). L („Nie jestem pewna…”) tylko bez treści zdrowotnej. Przyciski specjalistów tylko jako dodatek, gdy fraza pasuje. — temat `zdrowie` (słownik zdrowia: ciało, ból, choroba, objawy).
- [x] **6. Teksty odpowiedzi ze specyfikacji (A–M)** — wszystkie komunikaty dokładnie jak w kartach przypadków; „Nie oceniam objawów ani nie udzielam porad medycznych” zostaje. — `shared/js/texts.js`.
- [x] **7. Przyciski w każdej odpowiedzi + linki do formularza (4)** — przycisk główny prowadzi do formularza z `?service=`; nazwy usług zweryfikowane na stronie 14.10.2026 (lista niżej). — tabela `SERVICES`; nazwy usług zweryfikowane na stronie (tabela niżej).
- [x] **8. Teksty w jednym pliku (7)** — wszystkie komunikaty w jednym pliku konfiguracyjnym (`shared/js/texts.js`); właściciel zmienia je bez programisty w panelu („Odpowiedzi wbudowane” → teksty przypadków A–M, zapis w `panel/settings.json`, z wersjonowaniem i kopiami). — `shared/js/texts.js`; panel „Odpowiedzi wbudowane” pogrupowany A–M, teksty alarmowe zablokowane.
- [x] **9. Ukryć napisy techniczne (6)** — „Tryb offline — odpowiada asystent regułowy” tylko w logach / dla administratora; w polu wiadomości podpowiedź „Opisz własnymi słowami, w czym możemy pomóc”. — napis techniczny tylko na stronie podglądu (`showTech`) i w rejestrze; nowa podpowiedź w polu.

## Etap 2 — POWINNO BYĆ

- [x] **10. Kolory i wygląd przycisków (sekcja 4)** — czerwony tylko alarm/112, zielony konsultacja lekarska, fioletowy psychiatra, morski psycholog/terapeuta, niebieski usługi „papierowe”, szary informacje. Przycisk główny pełny, pozostałe obrysowane. — klasy `k-doctor`, `k-psych`, `k-therapy`, `k-paper`, `k-info`, `k-alarm` w `shared/css/widget.css`.
- [x] **11. Karta alarmowa i przycisk 112 (10)** — `role="alert"`, `aria-live="assertive"`, `tel:112`, min. 44 px, kontrast WCAG AA, karta zawsze rozwinięta i pierwsza.
- [x] **12. Stały dopisek pod polem (9)** — „W nagłym zagrożeniu życia dzwoń 112 lub 999.” — widoczny zawsze, także na ekranie startowym.
- [x] **13. Tryb kryzysowy sesji (11)** — po B kolejne wiadomości bez konkretnej intencji („nie wiem”, „nic”) dostają ponownie komunikat 2 + 112, nie „Nie jestem pewna…”. — `session.crisis` w `shared/js/pipeline.js` (test 12 ✓).
- [x] **14. Szybkie przyciski na starcie (17, przypadek M)** — powitanie ze specyfikacji + 6 przycisków (Konsultacja lekarska, Recepta, L4, Wyniki badań, Psychiatra / Psycholog, Cennik) zanim pacjent coś napisze. — kafelki na starcie z cenami.
- [x] **15. Przekazanie do człowieka (19)** — po dwóch niezrozumiałych wiadomościach z rzędu przycisk „Napisz do nas” → Kontakt. — test 8.19 ✓.
- [~] **16. Ceny w jednym miejscu (12)** — ceny w jednej tabeli usług (nie w tekstach); cena w odpowiedzi J dobierana do pytania („ile kosztuje psychiatra” → 259 zł), bez rozpoznanej usługi — 4 najczęstsze + cennik. *Częściowo:* ceny są w jednym miejscu (`SERVICES`) i codzienna kontrola strony sprawdza, czy zgadzają się ze stroną; pobieranie cen „na żywo” wymaga API / CMS po stronie serwisu (strona blokuje automatyczne pobieranie).
- [x] **17. Podpowiedzi pod polem (15)** — przykładowe pytania zgodne z usługami: „boli mnie kręgosłup”, „potrzebuję recepty”, „potrzebuję L4”, „ile kosztuje psychiatra”. — strona podglądu; w widżecie podpowiedź w polu wiadomości.
- [x] **18. Anonimowe logi z przypadkiem (13)** — rejestr zapisuje przypadek A–M (obok tematu) i kliknięty przycisk; bez danych identyfikujących. — kolumny `case_id` i `button` w serwerze panelu (migracja automatyczna); treści wiadomości kryzysowych (B) nie zapisujemy wcale; panel → „Rozmowy” pokazuje przypadek i kliknięty przycisk.
- [x] **19. Jedno okno czatu (14)** — sprawdzić, skąd dwa okna na zdjęciach. Wyjaśnione: zdjęcia pochodzą ze strony porównawczej (kilka czatów obok siebie celowo, do testów). Na stronie kliniki wstawiamy jeden skrypt → jedno okno.

## Etap 3 — UNOWOCZEŚNIENIE (kolejny etap)

- [ ] **20. Warstwa AI tylko do rozpoznawania (16)** — AI przypisuje wpis do A–M, odpowiedzi nadal z szablonów; regułowy detektor A/B zawsze pierwszy.
- [~] **21. Wstępne wypełnienie formularza (18)** — usługa wybrana w czacie przekazywana do formularza. Czat przekazuje usługę w adresie (`?service=`); zapamiętanie wyboru w formularzu — po stronie formularza serwisu.
- [ ] **22. Statystyki (20)** — kliknięcia z czatu → rozpoczęte formularze (które przypadki najlepiej konwertują).

## Wytyczne klienta (14.10.2026, po specyfikacji)

- [x] **W1. Czat zawsze prowadzi do zakupu usługi** — każda odpowiedź pokazuje od razu kolorowe **kafelki usług z ceną** (sprawdza to test „każdy temat ma kafelek zakupu”).
- [x] **W2. Dolegliwość (np. „kręgosłup mnie boli”) → od razu kafelki:** 1) Konsultacja lekarska (usługa specjalisty, gdy pasuje, np. wysypka → Dermatologia online), 2) Recepta, 3) Konsultacja ogólna; „i tak z każdą usługą” — L4, recepta, wyniki, psychika, kobiety/mężczyźni, cennik, jak umówić: każda z 3 kafelkami zakupu.
- [?] **W3. „Konsultacja ogólna” a „Konsultacja lekarska”** — na stronie jest jedna ogólna „Wizyta lekarska” (formularz bez usługi). Przyjęte: „Konsultacja ogólna” → Wizyta lekarska; do potwierdzenia, czy ma prowadzić gdzie indziej.

## Etap 4 — przeniesienie bota do repo klienta

- [ ] **23. Czysta paczka bota pod [github.com/lekarzeiterapeuci](https://github.com/lekarzeiterapeuci)** — tylko bot, część wspólna (bezpieczeństwo, widżet, teksty, testy) i dokumentacja; bez SOON, list „do zrobienia” i pomysłów; struktura plików pozwalająca dokładać kolejne silniki. Integracja ze stroną przez GitHub opisana w dokumentacji. Wymaga podłączenia konektora GitHub do organizacji `lekarzeiterapeuci`.
- [ ] **24. Usunięcie bota z AIsupportBOT** — dopiero **na sygnał właściciela**, po sprawdzeniu, że bot działa w nowym repo. Historia gita i warianty AI / trained zostają w AIsupportBOT (dalszy rozwój).

## Decyzje właściciela (sekcja 11) — do potwierdzenia

- [?] **D1. Telefon wsparcia w komunikacie B** — domyślnie (decyzja właściciela) bez numerów pomocowych. Rekomendacja ze specyfikacji: jedna linia „Możesz też zadzwonić na bezpłatny telefon wsparcia: 116 123 (dorośli) lub 116 111 (dzieci i młodzież).”
- [?] **D2. „Nie jesteś z tym sam(a)”** — przyjęte w tekście B; prosimy o potwierdzenie.
- [?] **D3. Przegląd medyczny** — listę objawów alarmowych (A), frazy kryzysowe (B) i teksty komunikatów zatwierdza lekarz kierujący serwisem (zapisać datę i wersję zatwierdzenia).
- [?] **D4. Czat nie diagnozuje** — przed dodaniem funkcji oceniających objawy (w tym warstwy AI, pkt 20) konsultacja z prawnikiem (wyroby medyczne).
- [?] **D5. RODO** — logi bez danych identyfikujących, treści kryzysowe nie dłużej niż konieczne; opis w polityce prywatności.

---

## Ustalenia techniczne

### Kolejność sprawdzania (pseudokod ze specyfikacji, sekcja 9)

`A/B` (każda wiadomość) → `I` dawki → tryb kryzysowy → `C` psychika → `F` L4 → `E` recepta → `G` wyniki/skierowanie → `H` kobiety/mężczyźni → `J` cennik → `K` jak umówić/specjalista/kontakt → `M` powitanie → `D` zdrowie (domyślnie) → `L` niejasne.

### Linki do formularza — nazwy usług sprawdzone na stronie (14.10.2026)

| Usługa | `?service=` | Cena |
|---|---|---|
| Konsultacja lekarska (Wizyta lekarska) | brak osobnej usługi na stronie → formularz bez parametru | od 79 zł |
| e-Recepta online | `e-Recepta+online` | od 59 zł |
| L4 online | `L4+online` | od 79 zł |
| Omówienie wyników badań | `Omówienie+wyników+badań` | od 79 zł |
| Kontynuacja leczenia | `Kontynuacja+leczenia` | od 59 zł |
| Skierowanie | `Skierowanie+na+badania` (na stronie inaczej niż w specyfikacji) | od 79 zł |
| Tabletka „dzień po” | `Tabletka+dzień+po` | od 45 zł |
| Antykoncepcja | `Antykoncepcja` | od 59 zł |
| TRT | `TRT+Testosteron` (na stronie inaczej niż w specyfikacji) | od 199 zł |
| Psychiatra online | `Psychiatra+Online` | 259 zł |
| Psycholog / Terapeuta | `Psycholog+/+Terapeuta` | 169 zł |
| Leki psychiatryczne | `Leki+psychiatryczne` | — |
| Leczenie otyłości | `Leczenie+otyłości` | 129 zł |
| Dermatologia online, Ginekologia online, Alergie i astma, Problemy żołądkowe, Nadciśnienie i serce, Infekcje i przeziębienia | nazwy jak na stronie | — |

---

## Dziennik zmian planu

- 14.10.2026 — plan utworzony.
- 14.10.2026 — etap 1 i 2 zrobione (bot 1.7.0); dodane wytyczne klienta W1–W3 (kafelki zakupu) i etap 4 (repo klienta).
