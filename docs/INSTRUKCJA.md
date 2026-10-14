# Instrukcja obsługi — asystentka Ilona

Instrukcja dla osoby, która opiekuje się asystentką na co dzień — bez programowania. Szczegóły techniczne są w [PANEL.md](PANEL.md), [WDROZENIE.md](WDROZENIE.md) i [AI-SERWER.md](AI-SERWER.md).

## Spis treści

1. [Pierwsze uruchomienie panelu](#1-pierwsze-uruchomienie-panelu)
2. [Codzienna praca](#2-codzienna-praca)
3. [Typowe zadania krok po kroku](#3-typowe-zadania-krok-po-kroku)
4. [Czego asystentka nigdy nie robi](#4-czego-asystentka-nigdy-nie-robi)
5. [Słowniczek](#5-słowniczek)
6. [Pytania i odpowiedzi](#6-pytania-i-odpowiedzi)
7. [Lista kontrolna przed uruchomieniem u klienta](#7-lista-kontrolna-przed-uruchomieniem-u-klienta)

---

## 1. Pierwsze uruchomienie panelu

**Jednorazowo:**

1. Zainstaluj [Node.js](https://nodejs.org) w wersji **LTS** (22 lub nowszej) — instalator „Dalej, Dalej, Zakończ”.
2. Pobierz projekt (terminal w VS Code):

   ```powershell
   cd C:\Users\micha\vsrepos
   git clone https://github.com/michalstankiewicz4-cell/AIsupportBOT
   ```

**Za każdym razem:**

1. Terminal w VS Code:

   ```powershell
   cd C:\Users\micha\vsrepos\AIsupportBOT
   git pull
   npm run panel
   ```

2. Otwórz w przeglądarce **http://localhost:5050/panel/admin/**
3. Wybierz, gdzie są ustawienia:
   - **Serwer panelu** — adres i hasło od administratora; zmiany trafiają na stronę kliniki po ok. minucie, działa rejestr rozmów,
   - **Plik ustawień** — zmiany zapisują się w pliku `panel/settings.json`; na stronę trafiają po wgraniu tego pliku na hosting (rozmowy nie są wtedy zapisywane),
   - **Tryb lokalny** — do testów; zmiany widać tylko w czatach na `http://localhost:5050` w tej przeglądarce.
4. Po pracy: **Wyloguj**, a w terminalu `Ctrl+C`.

Pełny panel działa tylko na Twoim komputerze. Na stronie z czatami (przycisk **„Panel administratora”**) jest jego **podgląd demo** — można go przeklikać, ale zmiany zostają tylko w przeglądarce oglądającego.

> **Wskazówki:** przy większości pól jest ikonka **?** — najedź na nią myszą (albo stuknij na telefonie), żeby zobaczyć krótkie wyjaśnienie.

---

## 2. Codzienna praca

Zakładki panelu, od najczęściej używanych:

| Zakładka | Do czego |
|---|---|
| **Rozmowy** | Zobacz, o co pytają pacjenci i na co asystentka nie umiała odpowiedzieć |
| **Nauka** | Naucz nasz model nowych sformułowań — przypisz pytania do tematów |
| **Własne odpowiedzi** | Dodaj odpowiedź na pytanie, które się powtarza |
| **Kontrola strony** | Sprawdź, czy linki i ceny w odpowiedziach są aktualne |
| **Odpowiedzi wbudowane** | Popraw tekst gotowej odpowiedzi |
| **Tryb pracy** | Wybierz: bot / nasz model / AI / kombinacja |
| **Rejestracja rozmów** | Ustal, co zapisujemy z rozmów |

**Zmiany zapisuje przycisk „Zapisz zmiany”** (u góry, po prawej). Dopóki go nie klikniesz, widać napis „Niezapisane zmiany”, a przycisk „Cofnij” przywraca poprzednie ustawienia.

**Rytm pracy (zalecany):**

- **co tydzień:** Rozmowy → filtr „Bez odpowiedzi” → dla powtarzających się pytań dodaj własne odpowiedzi,
- **po e-mailu z GitHuba „Kontrola strony kliniki — failed”:** Kontrola strony → popraw wskazane linki lub ceny,
- **co tydzień / miesiąc:** Nauka → „Wczytaj z rozmów” → przypisz pytania do tematów → „Zapisz i naucz model”.

---

## 3. Typowe zadania krok po kroku

### Asystentka nie umie odpowiedzieć na pytanie (np. „czy macie parking?”)

1. **Własne odpowiedzi** → **+ Nowa**.
2. **Frazy** — po jednej w wierszu, krótko: `parking`, `gdzie zaparkować`.
3. **Odpowiedź asystentki** — np. „Konsultacje odbywają się online (telefon lub wideo), więc nie trzeba przyjeżdżać do placówki.”
4. (Opcjonalnie) **Przyciski z linkami**: `Jak to działa? | https://lekarzeiterapeuci.pl/jak-to-dziala`
5. W polu **Sprawdź odpowiedź** wpisz pytanie tak, jak napisałby pacjent → **Sprawdź**. Powinna pojawić się Twoja odpowiedź z etykietą „Własna odpowiedź”.
6. **Zapisz zmiany**.

Wskazówka: gwiazdka na końcu frazy łapie odmiany — `parking*` → „parkingu”, „parkingiem”.

### Zmieniła się cena albo tekst odpowiedzi

1. **Odpowiedzi wbudowane** → wyszukaj temat (np. „L4”).
2. Kliknij, żeby rozwinąć → w polu **Twoja wersja** wpisz nowy tekst.
3. Jeśli zmienił się też link — zaznacz **Zmień też linki pod odpowiedzią** i popraw adres.
4. **Zapisz zmiany**. „Przywróć domyślną” cofa zmianę.

Na stałe (dla wszystkich silników, także AI) ceny zmienia programista w `shared/js/knowledge.js`.

### Kontrola strony pokazuje błąd

1. **Kontrola strony** → sekcja **Do sprawdzenia**.
2. Każda karta pokazuje: który link, co jest nie tak, **gdzie jest używany** i **jak poprawić**.
3. Popraw link we wskazanym miejscu → **Zapisz zmiany** → **Sprawdź teraz**.
4. Brakujący fakt (np. „Cena: psycholog 169 zł”) oznacza, że na stronie jest inna cena — popraw odpowiedź (patrz wyżej) i daj znać programiście, żeby zaktualizował listę faktów.

### Zmiana trybu pracy (np. włączenie AI)

1. **Tryb pracy** → kliknij kartę, np. **Nasz model, a AI gdy nie rozpozna** (zalecane z AI).
2. **Zapisz zmiany**.
3. Upewnij się, że serwer AI działa i ma ustawiony limit wydatków ([ZABEZPIECZENIA.md](ZABEZPIECZENIA.md)).

### Włączenie rejestracji rozmów

1. **Rejestracja rozmów** → na start **1. Statystyki** (bez treści rozmów).
2. Poziom **2** lub **3** — dopiero po zgodzie klienta i jego prawnika (RODO).
3. Ustaw **czas przechowywania** (zalecane 30–90 dni) → **Zapisz zmiany**.

### Kopia zapasowa / przeniesienie ustawień (Eksport i Import)

1. **Eksport** (górny pasek) — pobiera plik `ustawienia-asystentki-RRRR-MM-DD.json`. Zachowaj go jako kopię.
2. Żeby przywrócić lub przenieść: **Import** → wybierz plik → sprawdź ustawienia w zakładkach → **Zapisz zmiany**.
3. Wyeksportowany plik możesz też wgrać na hosting jako `panel/settings.json` — czat od razu zacznie go używać (przy źródle „plik”).

### Zmiana w źródle „plik” — jak wysłać na stronę

1. Zaloguj się: **Plik ustawień** → wprowadź zmiany → **Zapisz zmiany** (poprzednia wersja trafia do `panel/backups/`).
2. Wgraj plik `panel/settings.json` na hosting w miejsce starego (np. przez FTP / menedżer plików hostingu).
3. Odśwież stronę kliniki i sprawdź w czacie.

Pomyłka? W `panel/backups/` są poprzednie wersje — zaimportuj wybraną i zapisz.

### Nauka modelu (zakładka „Nauka”)

1. **Nauka** → **Wczytaj z rozmów** (pytania, których model nie rozpoznał; wymaga rejestracji na poziomie 2 lub 3) albo wklej własne pytania i kliknij **Dodaj do listy**.
2. Przy każdym pytaniu sprawdź podpowiedź modelu i wybierz właściwy temat → **✓ Dodaj** (pytanie bez sensu → **✕ Pomiń**).
3. W **Teście na żywo** wpisz podobne pytanie i porównaj „Zapisany model” z „Po Twoich zmianach”.
4. **Sprawdź trafność** (opcjonalnie) — im wyższa, tym lepiej.
5. **Zapisz i naucz model** — dane, model i wersja zapiszą się same (z kopią zapasową).
6. Wgraj `trained/model.json` na hosting (albo `git push`).

Zasada: temat wybieraj tak, jak skierowałby pacjenta człowiek z rejestracji. Gdy nie wiesz — pomiń pytanie.

---

## 4. Czego asystentka nigdy nie robi

Tego nie da się zmienić w panelu — to celowe zabezpieczenia:

- **nie stawia diagnoz, nie dobiera leków ani dawek**, nie interpretuje wyników badań,
- przy objawach **stanu nagłego** (ból w klatce piersiowej, duszność, objawy udaru, myśli samobójcze…) zawsze kieruje pod **112** i do telefonów kryzysowych — przed jakąkolwiek inną odpowiedzią, także własną,
- **nie udaje człowieka** — przedstawia się jako wirtualna konsultantka,
- **nie wysyła imienia pacjenta** poza jego przeglądarkę,
- nie pokazuje linków innych niż `https://`, `tel:`, `mailto:`.

Własne odpowiedzi też powinny tego przestrzegać: pisz „do jakiego specjalisty / do której zakładki”, a nie „co to może być”.

---

## 5. Słowniczek

| Pojęcie | Znaczenie |
|---|---|
| **Bot** | Asystentka działająca na słowach kluczowych. Darmowa, przewidywalna |
| **Nasz model (trained)** | Mały program uczony na przykładowych pytaniach. Darmowy, działa w przeglądarce pacjenta |
| **AI** | Duży model językowy (Claude Haiku). Najlepiej rozumie pytania, płatny za każdą wiadomość |
| **Tryb pracy / łańcuch** | Kolejność silników: następny dostaje pytanie, gdy poprzedni go nie rozpozna |
| **Fraza** | Słowo lub kilka słów, po których asystentka rozpoznaje pytanie we własnych odpowiedziach |
| **Temat (intencja)** | Kategoria pytania, np. „Dermatologia”, „L4”, „Cennik” |
| **Odpowiedź wbudowana** | Gotowa odpowiedź zapisana w kodzie; można ją nadpisać w panelu |
| **Nie rozpoznano** | Pytanie, do którego asystentka nie dobrała tematu — kandydat na własną odpowiedź |
| **Rejestr rozmów** | Zapis pytań/odpowiedzi według poziomu rejestracji |
| **Anonimizacja** | Automatyczne wycinanie numerów i e-maili przed zapisem |
| **Serwer panelu** | Program w Cloudflare, który przechowuje ustawienia i rozmowy |
| **Tryb lokalny** | Praca w panelu bez serwera — tylko na Twoim komputerze |
| **Kontrola strony** | Sprawdzenie, czy linki, ceny i telefon w odpowiedziach zgadzają się ze stroną kliniki |
| **Wersja** | Numer typu 1.2.0 przy każdym silniku; każda zmiana jest opisana w `CHANGES.md` |

---

## 6. Pytania i odpowiedzi

**Czy zmiana w panelu od razu działa na stronie?**
Po kliknięciu „Zapisz zmiany” — w ciągu ok. minuty (czat pamięta ustawienia do 60 sekund). W trybie lokalnym — po odświeżeniu strony z czatem.

**Czy mogę coś zepsuć?**
Panel sprawdza każde pole przed zapisem (np. odrzuca złe linki). Stanów nagłych nie da się wyłączyć. W najgorszym razie: „Przywróć domyślną” przy odpowiedzi albo usuń własną odpowiedź.

**Asystentka odpowiada źle na konkretne pytanie — co zrobić najszybciej?**
Dodaj własną odpowiedź z frazą z tego pytania — działa od razu, we wszystkich trybach.

**Ile kosztuje AI?**
Zależy od liczby pytań; ustaw limit wydatków w konsoli Anthropic. Najtańszy tryb z AI to „Nasz model, a AI gdy nie rozpozna”. Szczegóły: [ZABEZPIECZENIA.md](ZABEZPIECZENIA.md).

**Czy widzę, kto pisał?**
Nie. Imię pacjenta nie jest zapisywane, adresy IP też nie. Rozmowy są oznaczone tylko losowym numerem.

**Nie przychodzą e-maile z kontroli strony.**
GitHub → Settings → Notifications → Actions → włącz powiadomienia. GitHub wysyła e-mail tylko przy problemie. Jeśli repozytorium było nieaktywne 60 dni, GitHub wstrzymuje zaplanowane kontrole — włącz je w zakładce Actions.

**Zapomniałem hasła do panelu.**
Ustaw nowe: `npx wrangler secret put ADMIN_PASSWORD` w folderze `panel/server`.

**Baza czy plik — co wybrać?**
Plik jest prostszy (bez serwera i bazy, wystarczy hosting), ale zmiany trzeba wgrywać ręcznie i rozmowy nie są zapisywane. Baza (serwer panelu) zmienia stronę automatycznie i zapisuje rozmowy. Ustawienia między nimi przeniesiesz przez Eksport → Import.

**Czy panel jest w internecie?**
Tylko jako podgląd demo — bez dostępu do serwera i pliku. Prawdziwe zmiany robisz wyłącznie z panelu uruchomionego na swoim komputerze.

**Jak przetestować coś, nie zmieniając strony kliniki?**
Zaloguj się w **trybie lokalnym** i testuj na http://localhost:5050 (porównanie czatów, kolumna „4. Z panelu”).

---

## 7. Lista kontrolna przed uruchomieniem u klienta

- [ ] Klient wybrał tryb pracy (domyślnie bot)
- [ ] Ktoś z kliniki sprawdził odpowiedzi (Odpowiedzi wbudowane) — czy kierują do właściwych zakładek
- [ ] Kontrola strony: 0 błędów, wszystkie fakty ✓
- [ ] Ustalony poziom rejestracji; przy 2/3 — zgoda prawnika i zapis w polityce prywatności
- [ ] Wybrane źródło ustawień: serwer panelu (baza) albo plik `panel/settings.json`
- [ ] Serwer panelu wdrożony, mocne hasło, (zalecane) `ADMIN_IPS` lub Cloudflare Access — albo plik ustawień wgrany na hosting
- [ ] Eksport ustawień zachowany jako kopia zapasowa
- [ ] Jeśli AI: serwer AI, limit wydatków, Turnstile ([ZABEZPIECZENIA.md](ZABEZPIECZENIA.md))
- [ ] Włączone powiadomienia e-mail z GitHub Actions
- [ ] Na stronie kliniki wklejony uniwersalny `embed.js` z `data-panel` ([WDROZENIE.md](WDROZENIE.md))
- [ ] Decyzja: asystentka zamiast obecnego czatu na żywo czy obok niego
