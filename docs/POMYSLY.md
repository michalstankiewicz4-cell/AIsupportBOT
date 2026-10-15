# Pomysły na rozwój (backlog)

Lista pomysłów do dalszej pracy — zrobione są oznaczone `[x]` (z wersją). Na start pracujemy na bocie regułowym (patrz przełącznik „Tylko bot”, [SOON.md](SOON.md)), więc sekcja „Bot” i część panelu to najbliższe kandydatki.

Gdy pomysł zostanie zrobiony: zmień `[ ]` na `[x]`, dopisz wersję (np. „bot 1.7.0”) i opisz zmianę w `CHANGES.md`.

## Bot

- [x] **Tolerancja literówek** — „dermatolok”, „zwolninie” też zadziałają (dziś bot ich nie łapie).
- [ ] **Pytanie doprecyzowujące zamiast „nie wiem”** — przy „boli mnie” przyciski: „Głowa / Brzuch / Gardło”. Kandydatów już mamy, tylko ich nie pokazujemy.
- [ ] **Pamięć tematu** — pacjent pisze o L4, potem „a ile to kosztuje?” → cena L4, a nie cały cennik.
- [x] **Słowa kluczowe edytowane w panelu** — dopisujesz synonim do tematu bez programowania; nasz model może się wtedy douczyć w przeglądarce (trening trwa ułamek sekundy). *Zrobione (bot 1.9.0): zakładka „Tematy”; nasz model uczy się w zakładce „Nauka”.*
- [ ] **„Czy infolinia jest teraz czynna?”** — odpowiedź zależna od godziny, po godzinach formularz „oddzwonimy”.
- [ ] **Przekazanie do człowieka** — przycisk „Porozmawiaj z konsultantem” (obecny czat na żywo albo telefon).
- [ ] **👍/👎 pod odpowiedzią** — w panelu najgorzej oceniane odpowiedzi.
- [ ] **Podpowiedzi zależne od podstrony** — np. na „Dla kobiet i mężczyzn” od razu przyciski „Antykoncepcja”, „Tabletka dzień po”.
- [ ] **Język ukraiński i angielski** — wielu pacjentów w Polsce mówi po ukraińsku; AI radzi sobie od razu, bot potrzebowałby tłumaczeń.

## AI i kombinacje

- [ ] **AI jako „tłumacz pytań”** (faworyt) — AI tylko rozpoznaje temat, odpowiedź pochodzi z naszych sprawdzonych tekstów. Pacjent pisze jak chce, a nigdy nie dostanie niezatwierdzonej odpowiedzi; taniej (AI zwraca jedno słowo zamiast akapitu). Przy medycynie najbezpieczniejsze połączenie.
- [ ] **Strażnik odpowiedzi AI** — kontrola wyłapuje dawki, nazwy leków, sformułowania typu „to może być…” i podmienia odpowiedź na standardową.
- [ ] **Dzienny budżet AI w panelu** — np. maks. 500 wiadomości dziennie, potem automatycznie nasz model.
- [ ] **Generowanie przykładów treningowych przez AI** — w panelu „wygeneruj 20 sformułowań dla tematu Dermatologia” → przeglądasz, zatwierdzasz, model się douczy.
- [ ] **Cotygodniowe propozycje z rozmów** — AI grupuje pytania bez odpowiedzi i proponuje nowe własne odpowiedzi; Ty tylko zatwierdzasz.
- [ ] **Kontrola strony z AI** — gdy strona się zmieni, AI streszcza zmianę (np. „psycholog 169 → 189 zł”) i proponuje poprawkę odpowiedzi.
- [ ] **Test A/B trybów** — połowa pacjentów bot, połowa „nasz model → AI”; po miesiącu widać, który ma mniej pytań bez odpowiedzi i lepsze oceny.

## Panel administracyjny

### Codzienna praca

- [x] **„Wygląd i teksty” bez kodu** — telefon, godziny, e-mail, imię konsultantki, powitanie, przyciski szybkich pytań, kolory, ceny do kontroli strony. *Zrobione (bot 1.9.0): zakładki „Strona i wygląd”, „Usługi i przyciski”, „Odpowiedzi wbudowane”.*
- [x] **Komunikat w czacie z datą od–do** — np. „24–26.12 infolinia nieczynna”; pojawia się i znika sam. *Zrobione (bot 1.9.0): zakładka „Komunikaty”.*
- [ ] **Odpowiedzi czasowe** — własna odpowiedź ważna tylko w danym okresie (święta, promocja).
- [x] **Podgląd czatu na żywo w panelu** — okno czatu obok edycji, od razu z niezapisanymi zmianami. *Zrobione (bot 1.9.x): podgląd z prawej strony panelu, przycisk „Podgląd czatu”.*
- [x] **Słowa kluczowe bota i przykłady modelu edytowane w panelu** — z treningiem modelu w przeglądarce. *Zrobione: „Tematy” i „Nauka”.*

### Kontrola jakości

- [ ] **Pytania kontrolne (test regresji)** — np. 50 pytań z oczekiwanym tematem; przed zapisem: „po Twojej zmianie 3 pytania odpowiadają inaczej”. Chroni przed tym, że nowa reguła po cichu zepsuje inną.
- [ ] **Wykrywanie problemów w regułach** — fraza zbyt ogólna („lek” łapie „lekarz”), duplikaty, reguły, które od miesięcy nic nie złapały.
- [ ] **Historia zmian z przywracaniem** — kto, kiedy, co zmienił; porównanie wersji i „przywróć tę wersję” (kopie już mamy, brakuje widoku).

### Analityka dla klienta

- [ ] **Kliknięcia linków z czatu**, zwłaszcza „Umów wizytę” — „czat przyprowadził 120 umówień w miesiącu” (najmocniejszy argument sprzedażowy).
- [ ] **Wykresy w czasie** — pytania dziennie, godziny szczytu, trend pytań bez odpowiedzi.
- [ ] **Raport tygodniowy e-mailem** — rozmowy, najczęstsze tematy, pytania bez odpowiedzi, wynik kontroli strony.
- [ ] **Koszty AI** — liczba wywołań, szacowany koszt miesięczny, dzienny limit ustawiany w panelu.

### Bezpieczeństwo i RODO

- [ ] **Role** — administrator (wszystko), redaktor (tylko odpowiedzi), klient (tylko statystyki) + dziennik dostępu (kto przeglądał rozmowy).
- [ ] **Usunięcie rozmowy na prośbę pacjenta** — pacjent widzi w czacie krótki kod rozmowy, Ty usuwasz ją w panelu po tym kodzie.

### Awarie

- [ ] **Tablica stanu systemu** — czy serwer AI działa, ile zostało z limitu, wynik ostatniej kontroli strony, wersje silników.
- [ ] **Wyłącznik awaryjny jednym kliknięciem** — „wyłącz AI” albo „pokaż tylko komunikat z infolinią” (awaria, wyciek klucza).
