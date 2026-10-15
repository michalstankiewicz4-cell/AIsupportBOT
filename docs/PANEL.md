# Panel sterowania

Panel pozwala bez programowania:

- wybrać **tryb pracy** asystentki (bot / nasz model / AI albo ich kombinację),
- ustawić **rejestrację rozmów** (4 poziomy),
- dodać **własne odpowiedzi** na frazy i zmienić **odpowiedzi wbudowane**,
- przeglądać **rozmowy** i eksportować je do nauki modelu,
- sprawdzać, czy **strona kliniki się nie zmieniła** (linki, ceny, telefon).

Prosta instrukcja „krok po kroku” dla osoby nietechnicznej: [INSTRUKCJA.md](INSTRUKCJA.md). Ten dokument opisuje szczegóły i wdrożenie.

---

## 1. Jak to działa

```
Twój komputer                         Cloudflare (internet)                   Strona kliniki
┌──────────────────────┐   hasło     ┌─────────────────────────────┐        ┌──────────────────┐
│ panel administratora │ ──────────► │ serwer panelu (Worker + D1) │ ◄───── │ czat (embed.js)  │
│ npm run panel        │  /admin/*   │  ustawienia · rejestr       │ /config│ u pacjenta       │
│ 127.0.0.1:5050       │             │  kontrola strony (codziennie)│  /log  └──────────────────┘
└──────────────────────┘             └─────────────────────────────┘
```

- **Panel administratora** (`panel/admin/`) z pełnymi możliwościami działa wyłącznie na Twoim komputerze (`npm run panel`). Na publicznej stronie jest dostępny tylko jako **podgląd demo** — bez logowania do serwera i bez zapisu pliku; zmiany zostają w przeglądarce oglądającego.
- **Serwer panelu** (`panel/server/`) przechowuje ustawienia i rejestr rozmów w bazie Cloudflare D1. Publicznie udostępnia tylko to, czego potrzebuje czat pacjenta: odczyt ustawień (`GET /config`) i zapis rozmowy (`POST /log`).
- **Czat** przy starcie pobiera ustawienia z serwera panelu. Gdy serwer panelu nie jest skonfigurowany lub nie odpowiada — działa na ustawieniach domyślnych (bot, rejestracja wyłączona).

### Źródła ustawień: serwer (baza), plik, tryb lokalny

Przy logowaniu do panelu wybierasz, gdzie są ustawienia:

| Źródło | Gdzie są ustawienia | Rejestr rozmów | Kiedy zmiana działa na stronie | Dla kogo |
|---|---|---|---|---|
| **Serwer panelu (baza)** | Cloudflare D1 | tak | po ok. minucie, automatycznie | produkcja z rejestracją rozmów |
| **Plik ustawień** | `panel/settings.json` obok skryptów czatu | nie | po wgraniu pliku na hosting | prosty hosting bez serwera i bazy |
| **Tryb lokalny (demo)** | pamięć przeglądarki | tak (w tej przeglądarce) | od razu, tylko w tej przeglądarce | testy, pokaz klientowi |

Czat bierze ustawienia z pierwszego dostępnego źródła: serwer panelu (gdy podano `data-panel` lub adres w `panel/config.js`) → tryb lokalny (jeśli wybrano go w panelu w tej samej przeglądarce) → plik `panel/settings.json` → ustawienia domyślne.

**Plik ustawień** — przy `npm run panel` panel zapisuje zmiany prosto do `panel/settings.json` na Twoim dysku; przed każdym zapisem poprzednia wersja trafia do `panel/backups/` (30 ostatnich kopii). Żeby zmiany trafiły na stronę kliniki, wgraj ten jeden plik na hosting (np. przez FTP) w miejsce starego. Na publicznym podglądzie plik jest tylko do odczytu.

### Eksport i import ustawień

- **Eksport** (górny pasek) — pobiera plik z bieżącymi ustawieniami, także niezapisanymi. Ma dokładnie ten sam format co `panel/settings.json`, więc można go **wgrać na hosting jako `panel/settings.json`** albo zaimportować później.
- **Import** — wczytuje plik z eksportu (albo `panel/settings.json`). Ustawienia są sprawdzane (błędne pola i niebezpieczne linki odrzucane) i trafiają do edycji — nic się nie zmienia, dopóki nie klikniesz **„Zapisz zmiany”**.
- Zastosowania: kopia zapasowa, przeniesienie ustawień między źródłami (np. z trybu lokalnego na serwer albo do pliku), ręczna podmiana pliku, przekazanie ustawień innej osobie.

---

## 2. Uruchomienie panelu na komputerze

Wymagany Node.js **22.13+** ([nodejs.org](https://nodejs.org), wersja LTS).

```powershell
cd C:\Users\micha\vsrepos\AIsupportBOT
git pull
npm run panel
```

Otwórz w przeglądarce: **http://localhost:5050/panel/admin/**. Zatrzymanie: `Ctrl+C` w terminalu.

Serwer nasłuchuje tylko na `127.0.0.1` — nikt z sieci domowej ani z internetu nie ma do niego dostępu.

---

## 3. Wdrożenie serwera panelu (Cloudflare)

Potrzebne darmowe konto Cloudflare (to samo, co dla serwera AI).

```powershell
cd C:\Users\micha\vsrepos\AIsupportBOT\panel\server
npx wrangler login                                # jeśli jeszcze nie zalogowany
npx wrangler d1 create lekarze-panel              # tworzy bazę; skopiuj "database_id"
```

Wklej `database_id` do `panel/server/wrangler.toml` (linia `database_id = "..."`), potem:

```powershell
npx wrangler secret put ADMIN_PASSWORD            # wymyśl długie hasło (min. 16 znaków) i wklej
npx wrangler deploy
```

Na końcu pojawi się adres, np. `https://lekarze-panel.twoja-nazwa.workers.dev`. Tabele w bazie tworzą się same przy pierwszym zapytaniu.

### Podłączenie czatu do serwera panelu

Wybierz **jeden** sposób:

- w `panel/config.js`: `endpoint: 'https://lekarze-panel.twoja-nazwa.workers.dev'` (potem `npm run bump -- all patch "Podłączenie panelu"` i `git push`), **albo**
- na stronie kliniki w tagu skryptu: `data-panel="https://lekarze-panel.twoja-nazwa.workers.dev"`.

Na stronie kliniki zalecamy **uniwersalny skrypt** — tryb pracy zmieniasz wtedy w panelu, bez dotykania strony:

```html
<script src="https://michalstankiewicz4-cell.github.io/AIsupportBOT/embed.js"
        data-panel="https://lekarze-panel.twoja-nazwa.workers.dev"
        data-endpoint="https://lekarze-ai-assistant.twoja-nazwa.workers.dev" defer></script>
```

(`data-endpoint` = serwer AI, potrzebny tylko gdy tryb pracy używa AI.)

### Logowanie do panelu

W panelu: **Serwer panelu** → adres Workera + hasło → **Połącz**. Hasło jest pamiętane tylko do zamknięcia karty.

---

## 4. Bezpieczeństwo — panel niedostępny z zewnątrz

| Zabezpieczenie | Co daje |
|---|---|
| Pełny panel tylko lokalnie (`127.0.0.1`); publicznie wyłącznie podgląd demo | Nikt z internetu nie zaloguje się do serwera ani nie zapisze ustawień |
| Zapis pliku ustawień tylko z lokalnego panelu (sprawdzany Host i Origin) | Żadna inna strona otwarta w przeglądarce nie zmieni `panel/settings.json` |
| Hasło (`ADMIN_PASSWORD`), porównywane w stałym czasie | Bez hasła nie da się odczytać ani zmienić ustawień czy rozmów |
| Blokada po 10 błędnych hasłach (15 min) | Chroni przed zgadywaniem hasła |
| `ADMIN_ORIGINS` (domyślnie tylko `localhost:5050`) | Przeglądarka pozwoli wywołać część administracyjną tylko z lokalnego panelu |
| **`ADMIN_IPS`** (opcjonalne) | Część administracyjna istnieje tylko dla Twojego adresu IP — dla innych zwraca 404, jakby jej nie było |
| Cloudflare Access (opcjonalne, zalecane) | Logowanie e-mailem / Google przed dostępem do `/admin/*` |

### Ograniczenie do Twojego adresu IP

1. Sprawdź swój adres: https://ifconfig.me
2. W `panel/server/wrangler.toml` odkomentuj i wpisz: `ADMIN_IPS = "TWÓJ.ADRES.IP"` (kilka po przecinku).
3. `npx wrangler deploy`.

Uwaga: domowe IP potrafi się zmieniać — wtedy panel pokaże „Serwer nie odpowiada…”. Zaktualizuj adres i wdróż ponownie.

### Cloudflare Access (dodatkowa warstwa)

Panel Cloudflare → **Zero Trust → Access → Applications → Add application → Self-hosted**: domena Workera, ścieżka `/admin/*`, polityka „Allow” dla Twojego e-maila. Darmowe do 50 użytkowników.

---

## 5. Tryb pracy

| Tryb | Działanie |
|---|---|
| Tylko bot (domyślny) | Słowa kluczowe, 0 zł, nic nie wysyła poza przeglądarkę |
| Tylko nasz model | Klasyfikator uczony na przykładach, 0 zł |
| Tylko AI | Claude Haiku, płatny; gdy AI niedostępne — bot |
| **Nasz model → AI** (zalecane z AI) | AI tylko dla pytań, których model nie rozpozna — najniższe koszty AI |
| Bot → AI | Jak wyżej, pierwszy bot |
| AI → nasz model | AI, a przy awarii/limicie nasz model |
| Nasz model → bot | Darmowe, bot łapie niepewne pytania |
| Własna kolejność | Do 3 silników w dowolnej kolejności |

Łańcuch przekazuje pytanie dalej, gdy silnik **nie rozpoznał pytania** albo jest **niedostępny** (np. AI offline, limit). Ostatni silnik zawsze odpowiada.

Kolejność obsługi każdego pytania (niezależnie od trybu):

1. **Stany nagłe** (112, telefony kryzysowe) — zawsze pierwsze, nie da się wyłączyć.
2. **Własne odpowiedzi** z panelu.
3. **Silnik / łańcuch silników** z trybu pracy.

### Przełącznik „Tylko bot” (na start)

Decyzja na start: **pracujemy na bocie regułowym**. Przełącznik **„Tylko bot”** w górnym pasku panelu (i na stronie z czatami) jest **domyślnie włączony** i przysłania półprzezroczystym niebieskim panelem z napisem **SOON** wszystko, co nie dotyczy bota:

- w panelu: karty trybów z AI / naszym modelem / kombinacjami, „Własna kolejność”, zakładkę **Nauka** (sama zakładka jest w kolorze paneli SOON, ale nadal klikalna — pokazuje przysłoniętą treść) i przycisk „Eksport do treningu” w Rozmowach,
- na stronie z czatami: kolumny **2. AI**, **3. Trained** i **4. Z panelu** (bota widać w kolumnie 1),
- na podglądzie pływającym (`demo/floating.html`): przyciski wariantów **ai**, **trained** i **z panelu** — podgląd zawsze pokazuje bota (nawet przy `?variant=ai` w adresie); po wyłączeniu przełącznika ładuje się wariant z adresu.

Elementy nie są usunięte ani wyszarzone — widać je pod spodem, ale nie da się w nie kliknąć. Po wyłączeniu przełącznika wszystko wraca. Ustawienie jest zapamiętane **w tej przeglądarce** (`localStorage`, klucz `lt-ui:bot-only`) i dotyczy tylko wyglądu: nie zmienia zapisanych ustawień ani tego, co widzi pacjent. Jeśli zapisany tryb pracy używa czegoś przysłoniętego, panel pokazuje ostrzeżenie nad kartami.

Pełny spis przysłoniętych miejsc (z plikami i znacznikami `SOON:` w kodzie): [SOON.md](SOON.md).

Tryb dotyczy uniwersalnego `embed.js`. Skrypty `bot/embed.js`, `ai/embed.js`, `trained/embed.js` zawsze używają swojego silnika (ale też stosują własne odpowiedzi i rejestrację z panelu).

---

## 6. Rejestracja rozmów i RODO

| Poziom | Co zapisujemy | Czego wymaga |
|---|---|---|
| 0. Wyłączona (domyślnie) | nic | — |
| 1. Statystyki | temat pytania, silnik, wersję, godzinę, losowy identyfikator rozmowy | wzmianka w polityce prywatności |
| 2. Treść pytań za zgodą | + treść pytań pacjentów, którzy zaznaczyli zgodę | zgoda (pole na ekranie powitalnym), zapis w polityce prywatności, umowa powierzenia z Cloudflare |
| 3. Pełne rozmowy za zgodą | + odpowiedzi asystentki | jak wyżej |

Zawsze, na każdym poziomie:

- **imię pacjenta nie jest wysyłane ani zapisywane**,
- numery (PESEL, telefony, konta — każdy ciąg min. 7 cyfr) i adresy e-mail są **wycinane** przed zapisem, w przeglądarce i ponownie na serwerze,
- **nie zapisujemy adresów IP**,
- pacjent bez zgody trafia do rejestru najwyżej jako statystyka (temat, bez treści),
- wpisy starsze niż ustawiony **czas przechowywania** (1–365 dni, domyślnie 90) są usuwane automatycznie codziennie, a po skróceniu czasu — od razu,
- serwer sam przycina wpis według **swoich** ustawień — nie ufa temu, co przyśle przeglądarka.

Pole zgody pojawia się na ekranie powitalnym tylko przy poziomie 2 lub 3 i jest domyślnie niezaznaczone. Czat działa także bez zgody.

> Pytania o zdrowie to dane szczególnej kategorii (art. 9 RODO). Przed włączeniem poziomu 2 lub 3 klient powinien skonsultować z prawnikiem: zapis w polityce prywatności, podstawę prawną (zgoda), umowę powierzenia przetwarzania z Cloudflare, czas przechowywania i krąg osób z dostępem do panelu.

---

## 7. Własne odpowiedzi

- Fraza pasuje, gdy pytanie pacjenta ją **zawiera**. Wielkość liter i polskie znaki nie mają znaczenia.
- `*` na końcu frazy = dowolna końcówka: `sobot*` → „sobota”, „sobotę”, „sobotach”.
- Gdy pasuje kilka reguł, wygrywa **najdłuższa** fraza.
- Linki pod odpowiedzią: wiersze `Etykieta | adres`; dozwolone `https://`, `tel:`, `mailto:` (inne są odrzucane).
- Reguła wyłączona („Aktywna” odznaczone) jest zapisana, ale nie działa.
- **Tester** („Sprawdź odpowiedź”) pokazuje, co odpowie asystentka na wpisane pytanie — z bieżącymi, jeszcze niezapisanymi zmianami.

Limity: 200 reguł, 40 fraz na regułę, 1200 znaków odpowiedzi, 4 linki.

## 8. Odpowiedzi wbudowane

Wszystkie teksty asystentki są w jednym pliku — `shared/js/texts.js` — i odpowiadają przypadkom A–M ze specyfikacji czatu „Ilona” (np. `D` — dolegliwości, `F` — L4, `L` — niejasne pytanie). Zakładka pokazuje je pogrupowane według przypadków, w kolejności sprawdzania. Zmieniony tekst zapisuje się w ustawieniach (`overrides`, klucz = klucz tekstu) — w bazie albo w `panel/settings.json`, z kopią zapasową.

- Pola w nawiasach klamrowych (`{cena}`, `{telefon}`, `{imie}`…) asystentka uzupełnia sama — zostaw je w tekście.
- Jeden tekst może obsługiwać kilka tematów (np. `D` — skóra, alergie, kręgosłup…); kafelki pod odpowiedzią zależą od tematu.
- **Teksty alarmowe (A, B) są zablokowane** — zmienia je programista w `texts.js` po zatwierdzeniu przez lekarza kierującego serwisem.
- Opcjonalna linia z telefonem wsparcia (116 123 / 116 111) w komunikacie B — przełącznik w zakładce „Tryb pracy” (domyślnie wyłączony, decyzja właściciela).

### Usługi i przyciski (osobna zakładka)

Kolorowe kafelki usług (z ceną) prowadzą prosto do formularza wybranej usługi. W zakładce **„Usługi i przyciski”** zmieniasz bez programisty:

- **usługi** — nazwę na przycisku, cenę, kolor kafelka (z palety albo dowolny własny; ostrzeżenie, gdy kontrast z białym napisem jest słaby albo kolor jest czerwony — zarezerwowany dla 112), **kolor plakietki z ceną** („Auto” = odcień koloru kafelka, albo z palety / własny — napis na plakietce sam dobiera się biały lub ciemny), „sam obrys” (wariant tej samej grupy, np. Kontynuacja leczenia przy recepcie) i nazwę usługi w formularzu (`?service=`);
- **przyciski pod każdą odpowiedzią** — które, w jakiej kolejności i z jaką etykietą; panel ostrzega, gdy sąsiednie kafelki mają ten sam kolor.
- **wygląd kafelków** (dla wszystkich naraz, z podglądem w szerokości okna czatu):
  - *Dopasuj wysokość do zawartości* — kafelek bez ceny albo z krótkim tekstem jest niższy (czat zajmuje mniej miejsca w pionie);
  - *Wyśrodkuj w poziomie* i *Wyśrodkuj w pionie* — dwa niezależne przełączniki: nazwa usługi i cena na środku szerokości i/lub wysokości kafelka;
  - *Wielkość czcionki* — 10–20 px (domyślnie 13,5 px), cena proporcjonalnie mniejsza;
  - *Równe odstępy w pionie* — kafelki dosunięte do siebie w kolumnach, bez pustych miejsc pod niższymi (najlepiej razem z „Dopasuj wysokość”);
  - *Szerokość dopasowana do tekstu* — kafelek tak szeroki jak napis, w rzędach zamiast 3 równych kolumn (odstępy w pionie są wtedy równe same z siebie);
  - *Bez przenoszenia pojedynczych liter* — wyraz nie jest łamany w środku, przechodzi w całości do nowej linii; gdy się nie mieści, napis jest odrobinę mniejszy;
  - *kolejność kafelków* — domyślna (jak w ustawieniach przycisków), najpierw kafelki z ceną, od najtańszej albo od najdroższej usługi; kafelki bez ceny (np. „Umów wizytę”) przy sortowaniu są na końcu, a szare podpowiedzi („Jaki specjalista?”, „Cennik”) zawsze na samym dole;
  - *marginesy wewnętrzne* góra / dół / lewo / prawo (0–24 px) z symetrią: brak, pionowa (góra = dół), pozioma (lewo = prawo) albo pełna.
  Domyślnie wygląd jak dotąd: wszystkie przełączniki wyłączone, marginesy 5 px z każdej strony.

Wartości domyślne pochodzą ze specyfikacji czatu v1.1 (`shared/js/knowledge.js`: `SERVICES`, `BUTTONS`, `CASE_BUTTONS`); w ustawieniach (`services`, `buttons`) zapisywane są tylko zmiany, więc „Przywróć domyślne” zawsze wraca do dokumentu. Bez edycji zostają: przyciski alarmowe (A, B — zielona odpowiedź u góry, czerwona karta z 112 zawsze na dole) i odpowiedź z ceną rozpoznanej usługi (J — budowana z cen usług).

> Kontrola strony sprawdza ceny wpisane w `SITE_FACTS` (domyślne). Po zmianie ceny w panelu sprawdź, czy zgadza się ze stroną.

### Podgląd czatu na żywo

Z prawej strony panelu jest **podgląd czatu** — to samo okno, które widzi pacjent (jak na stronie z czatami), z bieżącymi **także niezapisanymi** ustawieniami: teksty, usługi, kolory, wygląd kafelków, kontakt, komunikaty. Odświeża się sam po każdej zmianie; można w nim pisać i klikać (rozmowa nie jest nigdzie zapisywana), a „Od nowa” zaczyna od powitania. Przycisk **„Podgląd czatu”** w górnym pasku chowa i pokazuje podgląd (zapamiętane w przeglądarce). Na wąskim ekranie podgląd jest pod zakładkami.

### Tematy i słowa kluczowe

Zakładka **„Tematy”** pokazuje każdy temat (np. „Inny specjalista”, „L4”) z jego słowami kluczowymi:

- kliknięcie słowa je **usuwa** (przekreślone — kliknij ponownie, żeby przywrócić), pole „Dodaj słowa” **dopisuje** nowe (po przecinku);
- słowa wpisuj z polskimi znakami albo bez — asystentka je ujednolica; **gwiazdka na końcu słowa** oznacza dowolną końcówkę: `rw* kulszow*` rozpozna „rwa kulszowa”, „rwę kulszową”, „rwy kulszowej”;
- „Sprawdź pytanie” pokazuje odpowiedź bota z niezapisanymi zmianami;
- przy dolegliwościach (D) i zdrowiu psychicznym (C) można zmienić **przyciski dodatkowe** tematu (np. „wysypka” → Dermatologia online).

Zmiany słów działają w bocie od razu po zapisaniu; nasz model (trained) uczy się ich dopiero po „Zapisz i naucz model” w zakładce „Nauka”. **Słowa alarmowe (112, kryzys) są celowo poza panelem** — zmienia je programista w `shared/js/safety.js` po zatwierdzeniu przez lekarza.

### Komunikaty

Zakładka **„Komunikaty”**: krótka informacja z datą od–do (np. „24–26.12 infolinia nieczynna”), pokazywana na górze rozmowy tylko w swoim terminie (puste daty = bez ograniczeń). Status przy komunikacie: „widoczny teraz”, „zaplanowany”, „wygasł”, „wyłączony”.

### Strona i wygląd

Zakładka **„Strona i wygląd”**:

- **Kontakt** — telefon, e-mail, godziny infolinii: trafiają do odpowiedzi (np. „Kontakt”), do przycisku „Zadzwoń” i do **kontroli strony** (sprawdza nowe wartości; ceny — z „Usługi i przyciski”).
- **Konsultantka i napisy** — nazwa w nagłówku, imię konsultantki (także w narzędniku), tytuł i tekst ekranu powitalnego, podpowiedź w polu wiadomości.
- **Wygląd okna czatu** — kolor przewodni, strona ekranu, automatyczne otwieranie, własne **logo** i **miniatura** konsultantki (PNG/JPG/WebP do ok. 150 KB, zapisywane w ustawieniach).
- **Adresy zakładek strony** — gdy na stronie kliniki zmieni się adres podstrony (np. cennik), wpisz nowy (tylko `https://`).

Puste pole = wartość domyślna. Atrybuty `data-title`, `data-accent`, `data-position`, `data-open` w skrypcie na stronie kliniki mają pierwszeństwo przed tymi ustawieniami.

## 9. Nauka naszego modelu

Zakładka **„Nauka”** zastępuje ręczną edycję `trained/data/training.json` i polecenie `npm run train`.

- **Pytania do nauczenia** — „Wczytaj z rozmów” pobiera pytania, których model nie rozpoznał (oraz te, na które musiało odpowiedzieć AI — przy trybie „nasz model → AI” to najlepszy materiał). Można też wkleić własne pytania (jedno w wierszu). Przy każdym model podpowiada 3 najbardziej prawdopodobne tematy; temat jest zaznaczony z góry tylko przy pewności ≥ 50% — inaczej wybierasz ręcznie, żeby model nie uczył się własnych pomyłek. ✓ Dodaj / ✕ Pomiń albo „Dodaj wszystkie”.
- **Test na żywo** — porównanie: jak pytanie rozumie zapisany model, a jak model po Twoich zmianach (model uczy się w przeglądarce w ułamku sekundy).
- **Przykłady według tematu** — przegląd, dodawanie i usuwanie przykładów; nowe są podświetlone.
- **Sprawdź trafność** — metoda „zostaw jeden” (jak w `npm run train`) + lista pomyłek modelu.
- **Zapisz i naucz model** (tylko w panelu uruchomionym lokalnie — `npm run panel`):
  1. poprzednia wersja danych trafia do `panel/backups/training-….json`,
  2. zapisywany jest `trained/data/training.json` (sprawdzony: znane tematy, bez duplikatów, w limitach),
  3. wersja `trained` podnosi się automatycznie (patch) z wpisem w `CHANGES.md` (np. „Nauka w panelu: dodano 12 przykł. (skora +5, l4 +7)”),
  4. model jest uczony od nowa → `trained/model.json`.
  Potem wgraj `trained/model.json` na hosting (albo `git push`). Na publicznym podglądzie zapis jest wyłączony — „Pobierz pliki” daje `training.json` i `model.json` do ręcznej podmiany.

## 10. Rozmowy

- Kafelki: liczba rozmów, pytań, pytań bez odpowiedzi, stanów nagłych, zgód.
- „Najczęstsze tematy” — o co pacjenci pytają najczęściej.
- Kolumna „Temat” pokazuje też **przypadek A–M** i **kliknięty przycisk / kafelek** (np. `D · Inna dolegliwość → „e-Recepta online · od 59 zł”`) — widać, które przypadki prowadzą do zakupu. Treści wiadomości kryzysowych (B) nie zapisujemy wcale.
- Filtr **„Bez odpowiedzi”** — pytania, których asystentka nie rozpoznała. Przycisk **„+ Odpowiedź”** tworzy z pytania nową własną odpowiedź.
- **Eksport CSV** — do Excela.
- **Eksport do treningu** — pytania pogrupowane według tematu w formacie `trained/data/training.json`. Pytania nierozpoznane trafiają do `_do_przypisania` — przenieś je ręcznie do właściwego tematu, potem `npm run train` (albo przypisz je w zakładce „Nauka” — punkt 9).
- **Usuń wszystkie** — trwale, wymaga dwóch kliknięć.

---

## 11. Kontrola strony kliniki

Asystentka podaje linki, ceny, telefon i godziny ze strony lekarzeiterapeuci.pl. Gdy klinika coś zmieni, kontrola to wyłapie.

**Co sprawdza:**

1. **Linki** ze wszystkich odpowiedzi (wbudowanych, zmienionych w panelu i własnych): błąd 404/500, brak odpowiedzi, przekierowanie na inną stronę, brak sekcji z linku (np. `#cennik`).
2. **Fakty** z listy `SITE_FACTS` w `shared/js/knowledge.js`: numer infolinii, e-mail, godziny, ceny usług. Brak na stronie = prawdopodobnie zmiana do naniesienia w odpowiedziach.
3. **Zmiany treści** stron kliniki od poprzedniego sprawdzenia (informacyjnie — zmiana nie musi oznaczać problemu).

**Jak uruchomić:**

| Sposób | Kiedy |
|---|---|
| Panel → „Kontrola strony” → **Sprawdź teraz** | na żądanie (tryb lokalny: przez `npm run panel`; tryb serwera: przez serwer panelu) |
| Serwer panelu | **automatycznie codziennie** rano; wynik widać w panelu |
| GitHub Actions (`.github/workflows/site-check.yml`) | **automatycznie codziennie** ok. 7:23; przy problemie GitHub wysyła **e-mail** |
| `npm run check-site` | z konsoli; `--save` zapamiętuje wynik do wykrywania zmian, `--config plik.json` dołącza linki z ustawień panelu |

**E-mail z GitHuba:** GitHub → (Twój awatar) → **Settings → Notifications → Actions** → zaznacz powiadomienia o nieudanych uruchomieniach. Kontrolę można też uruchomić ręcznie: repozytorium → **Actions → Kontrola strony kliniki → Run workflow**. Uwaga: GitHub wstrzymuje zaplanowane uruchomienia w repozytoriach bez aktywności przez 60 dni — wystarczy wtedy kliknąć „Enable workflow”.

**Gdy coś się zmieniło:** link — popraw w panelu (Odpowiedzi wbudowane → „Zmień też linki” albo Własne odpowiedzi) lub na stałe w `shared/js/knowledge.js`; cena/telefon — popraw tekst odpowiedzi i wzorzec w `SITE_FACTS`.

**Ograniczenia:** strony generowane w całości w przeglądarce (bez treści w HTML) oznaczane są jako „nie da się sprawdzić automatycznie”; jedno sprawdzenie pobiera maks. 45 różnych stron (limit Cloudflare); parametry w linkach formularza (`?service=…`) nie są weryfikowane.

---

## 12. Najczęstsze problemy

| Objaw | Przyczyna / rozwiązanie |
|---|---|
| Panel: „Nieprawidłowe hasło” | Hasło z `wrangler secret put ADMIN_PASSWORD`; po 10 próbach blokada na 15 min |
| Panel: „Serwer nie odpowiada na tym adresie (albo Twój adres IP nie ma dostępu)” | Zły adres Workera albo zmienił się Twój IP przy włączonym `ADMIN_IPS` |
| Czat nie widzi zmian z panelu | Ustawienia są pamiętane do 60 s; sprawdź `data-panel` / `panel/config.js` i czy kliknąłeś „Zapisz zmiany” |
| Tryb lokalny: czat nie widzi zmian | Czat musi być otwarty z `http://localhost:5050` w tej samej przeglądarce |
| Brak pola zgody na ekranie powitalnym | Pojawia się tylko przy poziomie rejestracji 2 lub 3 (po odświeżeniu strony) |
| Rozmowy się nie zapisują | Poziom 0, brak serwera panelu, domena strony spoza `ALLOWED_ORIGINS` |
| Kontrola strony: „Nie udało się połączyć” | Brak internetu albo strona kliniki nie działa — spróbuj później |
| `npm run panel` nie startuje albo `npm test` pisze „pominięto testy serwera panelu” | Za stary Node — zainstaluj 22.13+ |
| `npm run panel`: „EADDRINUSE” | Port 5050 zajęty — panel już działa w innym oknie albo użyj `node tools/serve-local.js 5051` (przy serwerze panelu dopisz wtedy `http://localhost:5051` do `ADMIN_ORIGINS`) |
