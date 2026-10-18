# Historia zmian (CHANGES)

Każdy z trzech asystentów ma **własny numer wersji** (`bot`, `ai`, `trained`) w formacie `MAJOR.MINOR.PATCH`:

- **PATCH** (1.0.**1**) — poprawka bez zmiany zachowania dla pacjenta (literówka, styl, drobny błąd).
- **MINOR** (1.**1**.0) — nowa wiedza lub funkcja (nowe słowa kluczowe, przykłady treningowe, nowa zakładka).
- **MAJOR** (**2**.0.0) — zmiana zasad działania (np. nowy model AI, inny sposób odpowiadania).

Zmiana w `shared/` (wspólna wiedza, widżet, bezpieczeństwo) dotyczy wszystkich trzech — podbij wtedy wersję `all`.

Nowy wpis dodaje polecenie: `npm run bump -- <bot|ai|trained|all> <patch|minor|major> "Opis"`.
Zgodność pilnuje: `npm run check` (uruchamiane też automatycznie przy każdym pushu).

<!-- NEW ENTRIES BELOW -->

## 2026-10-18

### bot 1.10.8
- Instrukcja wgrania czatu na własny serwer (docs/WDROZENIE.md) i polecenie npm run paczka


## 2026-10-15

### bot 1.10.7
- Poprawki z audytu bezpieczeństwa: frazy alarmowe, CSV bez formuł, limit rejestru i blokada haseł w bazie, walidacja kluczy, komunikaty w czasie lokalnym, kontrola strony, serwer lokalny, linki https, frazy min. 3 znaki, widżet

### ai 1.11.7
- Poprawki z audytu bezpieczeństwa: frazy alarmowe, CSV bez formuł, limit rejestru i blokada haseł w bazie, walidacja kluczy, komunikaty w czasie lokalnym, kontrola strony, serwer lokalny, linki https, frazy min. 3 znaki, widżet

### trained 1.10.7
- Poprawki z audytu bezpieczeństwa: frazy alarmowe, CSV bez formuł, limit rejestru i blokada haseł w bazie, walidacja kluczy, komunikaty w czasie lokalnym, kontrola strony, serwer lokalny, linki https, frazy min. 3 znaki, widżet

### bot 1.10.6
- Bot: poprawki po rozmowie testowej — fałszywy alarm „nie mogę umówić”, {imie}, kontakt z człowiekiem, pytania o lekarzy

### ai 1.11.6
- Bot: poprawki po rozmowie testowej — fałszywy alarm „nie mogę umówić”, {imie}, kontakt z człowiekiem, pytania o lekarzy

### trained 1.10.6
- Bot: poprawki po rozmowie testowej — fałszywy alarm „nie mogę umówić”, {imie}, kontakt z człowiekiem, pytania o lekarzy

### bot 1.10.5
- Dokumentacja: instrukcja obsługi i README uzupełnione o nowe zakładki i ustawienia

### ai 1.11.5
- Dokumentacja: instrukcja obsługi i README uzupełnione o nowe zakładki i ustawienia

### trained 1.10.5
- Dokumentacja: instrukcja obsługi i README uzupełnione o nowe zakładki i ustawienia

### bot 1.10.4
- Bot: „dzieci” nie jest już brane za „dzięki”; „czy przyjmujecie dzieci” → konsultacja (pediatra)

### ai 1.11.4
- Bot: „dzieci” nie jest już brane za „dzięki”; „czy przyjmujecie dzieci” → konsultacja (pediatra)

### trained 1.10.4
- Bot: „dzieci” nie jest już brane za „dzięki”; „czy przyjmujecie dzieci” → konsultacja (pediatra)

### bot 1.10.3
- Import ustawień rozpoznaje wszystkie pola (także tryb kryzysowy i słowa alarmowe); test eksportu/importu każdego pola

### ai 1.11.3
- Import ustawień rozpoznaje wszystkie pola (także tryb kryzysowy i słowa alarmowe); test eksportu/importu każdego pola

### trained 1.10.3
- Import ustawień rozpoznaje wszystkie pola (także tryb kryzysowy i słowa alarmowe); test eksportu/importu każdego pola

### bot 1.10.2
- Pojedynczy kafelek w odpowiedzi dopasowany do treści (przełącznik w panelu, domyślnie włączony)

### ai 1.11.2
- Pojedynczy kafelek w odpowiedzi dopasowany do treści (przełącznik w panelu, domyślnie włączony)

### trained 1.10.2
- Pojedynczy kafelek w odpowiedzi dopasowany do treści (przełącznik w panelu, domyślnie włączony)

### bot 1.10.1
- Panel: zakładki w kolorowych grupach (Działanie, Odpowiedzi, Wygląd i usługi, Analiza)

### ai 1.11.1
- Panel: zakładki w kolorowych grupach (Działanie, Odpowiedzi, Wygląd i usługi, Analiza)

### trained 1.10.1
- Panel: zakładki w kolorowych grupach (Działanie, Odpowiedzi, Wygląd i usługi, Analiza)

### bot 1.10.0
- Słowa alarmowe A/B edytowane w panelu; nowe frazy przedawkowania narkotyków i dopalaczy

### ai 1.11.0
- Słowa alarmowe A/B edytowane w panelu; nowe frazy przedawkowania narkotyków i dopalaczy

### trained 1.10.0
- Słowa alarmowe A/B edytowane w panelu; nowe frazy przedawkowania narkotyków i dopalaczy

### bot 1.9.12
- Tryb kryzysowy: nowe domyślne — nigdy, limit 1, konkretne pytanie kończy

### ai 1.10.12
- Tryb kryzysowy: nowe domyślne — nigdy, limit 1, konkretne pytanie kończy

### trained 1.9.12
- Tryb kryzysowy: nowe domyślne — nigdy, limit 1, konkretne pytanie kończy

### bot 1.9.11
- Panel: przycisk Dev reset — czyszczenie pamięci przeglądarki i ustawienia domyślne

### ai 1.10.11
- Panel: przycisk Dev reset — czyszczenie pamięci przeglądarki i ustawienia domyślne

### trained 1.9.11
- Panel: przycisk Dev reset — czyszczenie pamięci przeglądarki i ustawienia domyślne

### bot 1.9.10
- Panel: limit powtórzeń komunikatu B wpisywany jako liczba (0–50)

### ai 1.10.10
- Panel: limit powtórzeń komunikatu B wpisywany jako liczba (0–50)

### trained 1.9.10
- Panel: limit powtórzeń komunikatu B wpisywany jako liczba (0–50)

### bot 1.9.9
- Panel: ustawienia trybu kryzysowego po komunikacie B

### ai 1.10.9
- Panel: ustawienia trybu kryzysowego po komunikacie B

### trained 1.9.9
- Panel: ustawienia trybu kryzysowego po komunikacie B

### bot 1.9.8
- Panel: wyśrodkowanie kafelków osobno w poziomie i w pionie

### ai 1.10.8
- Panel: wyśrodkowanie kafelków osobno w poziomie i w pionie

### trained 1.9.8
- Panel: wyśrodkowanie kafelków osobno w poziomie i w pionie

### bot 1.9.7
- Panel: wyśrodkowanie zawartości kafelka i wielkość czcionki; napis nie wychodzi już poza kafelek przy małych marginesach

### ai 1.10.7
- Panel: wyśrodkowanie zawartości kafelka i wielkość czcionki; napis nie wychodzi już poza kafelek przy małych marginesach

### trained 1.9.7
- Panel: wyśrodkowanie zawartości kafelka i wielkość czcionki; napis nie wychodzi już poza kafelek przy małych marginesach

### bot 1.9.6
- Panel: podgląd czatu na żywo z prawej strony (bieżące, także niezapisane ustawienia; przełącznik „Podgląd czatu”); widżet nie przewija strony przy ustawianiu kursora

### ai 1.10.6
- Panel: podgląd czatu na żywo z prawej strony (bieżące, także niezapisane ustawienia; przełącznik „Podgląd czatu”); widżet nie przewija strony przy ustawianiu kursora

### trained 1.9.6
- Panel: podgląd czatu na żywo z prawej strony (bieżące, także niezapisane ustawienia; przełącznik „Podgląd czatu”); widżet nie przewija strony przy ustawianiu kursora

### bot 1.9.5
- Kafelki: domyślne marginesy wewnętrzne 5 px z każdej strony

### ai 1.10.5
- Kafelki: domyślne marginesy wewnętrzne 5 px z każdej strony

### trained 1.9.5
- Kafelki: domyślne marginesy wewnętrzne 5 px z każdej strony

### bot 1.9.4
- Panel: kolejność kafelków — domyślna, najpierw z ceną, od najtańszej, od najdroższej (podpowiedzi zawsze na dole)

### ai 1.10.4
- Panel: kolejność kafelków — domyślna, najpierw z ceną, od najtańszej, od najdroższej (podpowiedzi zawsze na dole)

### trained 1.9.4
- Panel: kolejność kafelków — domyślna, najpierw z ceną, od najtańszej, od najdroższej (podpowiedzi zawsze na dole)

### bot 1.9.3
- Panel: wygląd kafelków — równe odstępy w pionie (kafelki dosunięte w kolumnach) i szerokość dopasowana do tekstu (domyślnie wyłączone)

### ai 1.10.3
- Panel: wygląd kafelków — równe odstępy w pionie (kafelki dosunięte w kolumnach) i szerokość dopasowana do tekstu (domyślnie wyłączone)

### trained 1.9.3
- Panel: wygląd kafelków — równe odstępy w pionie (kafelki dosunięte w kolumnach) i szerokość dopasowana do tekstu (domyślnie wyłączone)

### bot 1.9.2
- Panel: wygląd kafelków — dopasowanie wysokości do zawartości, bez przenoszenia pojedynczych liter, marginesy góra/dół/lewo/prawo z symetrią (domyślnie bez zmian)

### ai 1.10.2
- Panel: wygląd kafelków — dopasowanie wysokości do zawartości, bez przenoszenia pojedynczych liter, marginesy góra/dół/lewo/prawo z symetrią (domyślnie bez zmian)

### trained 1.9.2
- Panel: wygląd kafelków — dopasowanie wysokości do zawartości, bez przenoszenia pojedynczych liter, marginesy góra/dół/lewo/prawo z symetrią (domyślnie bez zmian)

### bot 1.9.1
- Panel „Usługi i przyciski”: paleta kolorów kafelków oraz kolor plakietki z ceną (auto albo z palety / własny)

### ai 1.10.1
- Panel „Usługi i przyciski”: paleta kolorów kafelków oraz kolor plakietki z ceną (auto albo z palety / własny)

### trained 1.9.1
- Panel „Usługi i przyciski”: paleta kolorów kafelków oraz kolor plakietki z ceną (auto albo z palety / własny)

### bot 1.9.0
- Panel: zakładki „Tematy” (słowa kluczowe z gwiazdką na końcu każdego słowa, przyciski dodatkowe, tester), „Komunikaty” (od–do) i „Strona i wygląd” (kontakt, imię konsultantki, napisy, kolor, logo, położenie, adresy zakładek); kontrola strony sprawdza bieżący telefon, godziny i ceny

### ai 1.10.0
- Panel: zakładki „Tematy” (słowa kluczowe z gwiazdką na końcu każdego słowa, przyciski dodatkowe, tester), „Komunikaty” (od–do) i „Strona i wygląd” (kontakt, imię konsultantki, napisy, kolor, logo, położenie, adresy zakładek); kontrola strony sprawdza bieżący telefon, godziny i ceny

### trained 1.9.0
- Panel: zakładki „Tematy” (słowa kluczowe z gwiazdką na końcu każdego słowa, przyciski dodatkowe, tester), „Komunikaty” (od–do) i „Strona i wygląd” (kontakt, imię konsultantki, napisy, kolor, logo, położenie, adresy zakładek); kontrola strony sprawdza bieżący telefon, godziny i ceny

### bot 1.8.0
- Specyfikacja czatu „Ilona” v1.1: przy A/B zielona odpowiedź u góry i czerwona karta 112 na dole, każda usługa w swoim kolorze, nowe zestawy przycisków (D, E, F, H, J, K, L, M), panel „Usługi i przyciski” (nazwy, ceny, kolory, obrys, kolejność przycisków; domyślnie z dokumentu)

### ai 1.9.0
- Specyfikacja czatu „Ilona” v1.1: przy A/B zielona odpowiedź u góry i czerwona karta 112 na dole, każda usługa w swoim kolorze, nowe zestawy przycisków (D, E, F, H, J, K, L, M), panel „Usługi i przyciski” (nazwy, ceny, kolory, obrys, kolejność przycisków; domyślnie z dokumentu)

### trained 1.8.0
- Specyfikacja czatu „Ilona” v1.1: przy A/B zielona odpowiedź u góry i czerwona karta 112 na dole, każda usługa w swoim kolorze, nowe zestawy przycisków (D, E, F, H, J, K, L, M), panel „Usługi i przyciski” (nazwy, ceny, kolory, obrys, kolejność przycisków; domyślnie z dokumentu)


## 2026-10-14

### bot 1.7.0
- Specyfikacja czatu „Ilona” v1.0: przypadki A–M ze stałą kolejnością, dwa komunikaty przy A/B, tryb kryzysowy, domyślnie konsultacja lekarska, tolerancja literówek, teksty w shared/js/texts.js, kolorowe kafelki zakupu z ceną w każdej odpowiedzi, dopisek 112/999, „Napisz do nas”, rejestr przypadków i kliknięć, 37 testów akceptacyjnych

### ai 1.8.0
- Specyfikacja czatu „Ilona” v1.0: przypadki A–M ze stałą kolejnością, dwa komunikaty przy A/B, tryb kryzysowy, domyślnie konsultacja lekarska, tolerancja literówek, teksty w shared/js/texts.js, kolorowe kafelki zakupu z ceną w każdej odpowiedzi, dopisek 112/999, „Napisz do nas”, rejestr przypadków i kliknięć, 37 testów akceptacyjnych

### trained 1.7.0
- Specyfikacja czatu „Ilona” v1.0: przypadki A–M ze stałą kolejnością, dwa komunikaty przy A/B, tryb kryzysowy, domyślnie konsultacja lekarska, tolerancja literówek, teksty w shared/js/texts.js, kolorowe kafelki zakupu z ceną w każdej odpowiedzi, dopisek 112/999, „Napisz do nas”, rejestr przypadków i kliknięć, 37 testów akceptacyjnych

### bot 1.6.4
- Dokumentacja: docs/SOON.md — spis wszystkich przysłonięć SOON; znaczniki „SOON:” w kodzie

### ai 1.7.4
- Dokumentacja: docs/SOON.md — spis wszystkich przysłonięć SOON; znaczniki „SOON:” w kodzie

### trained 1.6.4
- Dokumentacja: docs/SOON.md — spis wszystkich przysłonięć SOON; znaczniki „SOON:” w kodzie

### bot 1.6.3
- Podgląd pływający: warianty ai, trained i „z panelu” przysłonięte SOON przy „Tylko bot” (podgląd pokazuje bota); mały znaczek SOON w rogu przycisków

### ai 1.7.3
- Podgląd pływający: warianty ai, trained i „z panelu” przysłonięte SOON przy „Tylko bot” (podgląd pokazuje bota); mały znaczek SOON w rogu przycisków

### trained 1.6.3
- Podgląd pływający: warianty ai, trained i „z panelu” przysłonięte SOON przy „Tylko bot” (podgląd pokazuje bota); mały znaczek SOON w rogu przycisków

### bot 1.6.2
- Zakładka „Nauka” w kolorze paneli SOON (nadal klikalna)

### ai 1.7.2
- Zakładka „Nauka” w kolorze paneli SOON (nadal klikalna)

### trained 1.6.2
- Zakładka „Nauka” w kolorze paneli SOON (nadal klikalna)

### bot 1.6.1
- Panele SOON: półprzezroczysty niebieski kolor; na stronie głównej przysłonięta także kolumna 4

### ai 1.7.1
- Panele SOON: półprzezroczysty niebieski kolor; na stronie głównej przysłonięta także kolumna 4

### trained 1.6.1
- Panele SOON: półprzezroczysty niebieski kolor; na stronie głównej przysłonięta także kolumna 4

### bot 1.6.0
- Przełącznik „Tylko bot” (domyślnie włączony) w panelu i na stronie głównej: opcje AI, naszego modelu i kombinacji przysłonięte półprzezroczystym panelem SOON

### ai 1.7.0
- Przełącznik „Tylko bot” (domyślnie włączony) w panelu i na stronie głównej: opcje AI, naszego modelu i kombinacji przysłonięte półprzezroczystym panelem SOON

### trained 1.6.0
- Przełącznik „Tylko bot” (domyślnie włączony) w panelu i na stronie głównej: opcje AI, naszego modelu i kombinacji przysłonięte półprzezroczystym panelem SOON

### bot 1.5.0
- Panel: zakładka „Nauka” (pytania do nauczenia z podpowiedzią tematu, test przed/po, trafność, „Zapisz i naucz model” z automatyczną wersją i kopią danych); znaczki „zrobione / do zrobienia” przy kolumnach 1–4 na stronie głównej

### ai 1.6.0
- Panel: zakładka „Nauka” (pytania do nauczenia z podpowiedzią tematu, test przed/po, trafność, „Zapisz i naucz model” z automatyczną wersją i kopią danych); znaczki „zrobione / do zrobienia” przy kolumnach 1–4 na stronie głównej

### trained 1.5.0
- Panel: zakładka „Nauka” (pytania do nauczenia z podpowiedzią tematu, test przed/po, trafność, „Zapisz i naucz model” z automatyczną wersją i kopią danych); znaczki „zrobione / do zrobienia” przy kolumnach 1–4 na stronie głównej

### bot 1.4.1
- Panel: znaczki „✓ zrobione” / „⏳ do zrobienia” przy trybach pracy (AI wymaga serwera AI) z podpowiedzią, czego brakuje

### ai 1.5.1
- Panel: znaczki „✓ zrobione” / „⏳ do zrobienia” przy trybach pracy (AI wymaga serwera AI) z podpowiedzią, czego brakuje

### trained 1.4.1
- Panel: znaczki „✓ zrobione” / „⏳ do zrobienia” przy trybach pracy (AI wymaga serwera AI) z podpowiedzią, czego brakuje

### bot 1.4.0
- Źródło ustawień „plik” (panel/settings.json, zapis z lokalnego panelu z kopiami w panel/backups/), eksport i import ustawień do pliku JSON, panel na publicznej stronie jako podgląd demo + link „Panel administratora” na stronie z czatami

### ai 1.5.0
- Źródło ustawień „plik” (panel/settings.json, zapis z lokalnego panelu z kopiami w panel/backups/), eksport i import ustawień do pliku JSON, panel na publicznej stronie jako podgląd demo + link „Panel administratora” na stronie z czatami

### trained 1.4.0
- Źródło ustawień „plik” (panel/settings.json, zapis z lokalnego panelu z kopiami w panel/backups/), eksport i import ustawień do pliku JSON, panel na publicznej stronie jako podgląd demo + link „Panel administratora” na stronie z czatami

### bot 1.3.0
- Panel sterowania: tryb pracy (bot / nasz model / AI / kombinacje), rejestracja rozmów (4 poziomy, zgoda, anonimizacja), własne odpowiedzi na frazy, edycja odpowiedzi wbudowanych, kontrola strony kliniki — szczegóły w sekcji „Panel sterowania” poniżej

### ai 1.4.0
- Panel sterowania: tryb pracy (bot / nasz model / AI / kombinacje), rejestracja rozmów (4 poziomy, zgoda, anonimizacja), własne odpowiedzi na frazy, edycja odpowiedzi wbudowanych, kontrola strony kliniki — szczegóły w sekcji „Panel sterowania” poniżej

### trained 1.3.0
- Panel sterowania: tryb pracy (bot / nasz model / AI / kombinacje), rejestracja rozmów (4 poziomy, zgoda, anonimizacja), własne odpowiedzi na frazy, edycja odpowiedzi wbudowanych, kontrola strony kliniki — szczegóły w sekcji „Panel sterowania” poniżej

### Panel sterowania (wspólne — dotyczy bot 1.3.0, ai 1.4.0, trained 1.3.0)
- Nowy panel administratora `panel/admin/` — działa tylko lokalnie (`npm run panel`, 127.0.0.1), nie jest publikowany na GitHub Pages.
- Serwer panelu `panel/server/` (Cloudflare Worker + D1): publicznie tylko `GET /config` i `POST /log`; część `/admin/*` z hasłem, blokadą po 10 błędnych próbach, opcjonalnie tylko z wybranych IP (`ADMIN_IPS`, dla innych 404).
- Tryb pracy z panelu: bot, nasz model, AI lub kombinacje (np. nasz model → AI, gdy nie rozpozna). Domyślnie bot. Nowy uniwersalny skrypt `embed.js` (atrybut `data-panel`).
- Rejestracja rozmów: 0 wyłączona (domyślnie), 1 statystyki, 2 treść pytań za zgodą, 3 pełne rozmowy za zgodą. Pole zgody na ekranie powitalnym, anonimizacja numerów i e-maili, automatyczne usuwanie po ustalonym czasie, imię i IP nigdy nie są zapisywane.
- Własne odpowiedzi na frazy (z `*` jako dowolna końcówka) — działają przed każdym silnikiem, po kontroli stanów nagłych; tester odpowiedzi w panelu.
- Edycja tekstów i linków odpowiedzi wbudowanych (bez stanów nagłych).
- Zakładka „Rozmowy”: statystyki, najczęstsze tematy, pytania bez odpowiedzi, eksport CSV i eksport do treningu.
- Kontrola strony kliniki (`panel/site-check.js`): linki z odpowiedzi (404, przekierowania, brakujące sekcje), fakty ze strony (`SITE_FACTS`: ceny, telefon, godziny), zmiany treści. Uruchamiana z panelu, codziennie przez serwer panelu i przez GitHub Actions (`site-check.yml`, e-mail przy problemie) oraz `npm run check-site`. W GitHub Actions wynik widać jako adnotacje i tabelę w zakładce Summary.
- Wskazówki „?” przy polach panelu. Linki w czacie tylko `https://`, `tel:`, `mailto:`.
- Dokumentacja: nowe `docs/INSTRUKCJA.md` (instrukcja obsługi, słowniczek, FAQ, lista kontrolna) i `docs/PANEL.md`; uzupełnione README, WDROZENIE, TRENOWANIE, ZABEZPIECZENIA, WARIANT-4.
- Wymagany Node.js 22.13+ (testy serwera panelu na wbudowanym SQLite).

## 2026-10-13

### bot 1.2.0
- Konsultantka „Ilona” (imię w SITE.assistant) z miniaturą logo przy podpisie jak zdjęcie profilowe; AI przedstawia się jako Ilona, wirtualna konsultantka (nie udaje człowieka); formy żeńskie w odpowiedziach

### ai 1.3.0
- Konsultantka „Ilona” (imię w SITE.assistant) z miniaturą logo przy podpisie jak zdjęcie profilowe; AI przedstawia się jako Ilona, wirtualna konsultantka (nie udaje człowieka); formy żeńskie w odpowiedziach

### trained 1.2.0
- Konsultantka „Ilona” (imię w SITE.assistant) z miniaturą logo przy podpisie jak zdjęcie profilowe; AI przedstawia się jako Ilona, wirtualna konsultantka (nie udaje człowieka); formy żeńskie w odpowiedziach

### bot 1.1.2
- Nazwa „Lekarze i Terapeuci” wszędzie z wielkimi literami L i T

### ai 1.2.2
- Nazwa „Lekarze i Terapeuci” wszędzie z wielkimi literami L i T

### trained 1.1.2
- Nazwa „Lekarze i Terapeuci” wszędzie z wielkimi literami L i T

### bot 1.1.1
- Logo kliniki na ekranie powitalnym (shared/img/logo.png, przezroczyste tło, skaluje się do wysokości ekranu)

### ai 1.2.1
- Logo kliniki na ekranie powitalnym (shared/img/logo.png, przezroczyste tło, skaluje się do wysokości ekranu)

### trained 1.1.1
- Logo kliniki na ekranie powitalnym (shared/img/logo.png, przezroczyste tło, skaluje się do wysokości ekranu)

### bot 1.1.0
- Nowy wygląd czatu: ekran powitalny z imieniem pacjenta, nagłówek „Lekarze i Terapeuci · Wirtualny konsultant · online”, podpisy Konsultant/imię nad dymkami, data rozmowy, okrągłe pole i przycisk wysyłania; imię zostaje w przeglądarce (nie trafia do AI). Trained: przykłady „wizyta u terapeuty”.

### ai 1.2.0
- Nowy wygląd czatu: ekran powitalny z imieniem pacjenta, nagłówek „Lekarze i Terapeuci · Wirtualny konsultant · online”, podpisy Konsultant/imię nad dymkami, data rozmowy, okrągłe pole i przycisk wysyłania; imię zostaje w przeglądarce (nie trafia do AI). Trained: przykłady „wizyta u terapeuty”.

### trained 1.1.0
- Nowy wygląd czatu: ekran powitalny z imieniem pacjenta, nagłówek „Lekarze i Terapeuci · Wirtualny konsultant · online”, podpisy Konsultant/imię nad dymkami, data rozmowy, okrągłe pole i przycisk wysyłania; imię zostaje w przeglądarce (nie trafia do AI). Trained: przykłady „wizyta u terapeuty”.

### bot 1.0.1
- Komentarze w kodzie przetłumaczone na polski (na prośbę klienta); bez zmian w działaniu

### ai 1.1.2
- Komentarze w kodzie przetłumaczone na polski (na prośbę klienta); bez zmian w działaniu

### trained 1.0.1
- Komentarze w kodzie przetłumaczone na polski (na prośbę klienta); bez zmian w działaniu

### Dokumentacja (bez zmiany wersji wariantów)
- Dodano `docs/WARIANT-4-LOKALNY.md` — informacyjny opis opcjonalnego wariantu 4: własny model językowy na serwerze z GPU (architektura, modele, sprzęt, koszty, ryzyka, ścieżka wdrożenia).

### ai 1.1.1
- Dokumentacja: docs/ZABEZPIECZENIA.md — instrukcja krok po kroku ochrony przed kosztami

### ai 1.1.0
- Prompt caching promptu systemowego (odczyt ~10% ceny), Cloudflare Turnstile + sesja 30 min przeciw botom, sekcja „Ochrona przed kosztami” w dokumentacji

### ai 1.0.1
- Dokumentacja: szczegółowa konfiguracja Claude Haiku (klucz API, limity, wdrożenie i test Workera)

### bot 1.0.0
- Pierwsza wersja asystenta regułowego: dopasowanie słów kluczowych do 36 intencji (specjaliści, usługi, cennik, kontakt).
- Odmowa opinii medycznych i dawkowania; przy pytaniu „lek + temat” odmowa połączona ze wskazaniem zakładki.
- Pytania nie na temat (polityka, pogoda, żarty) → regułka z numerem infolinii.

### ai 1.0.0
- Pierwsza wersja asystenta AI: model Claude przez serwer-pośrednik (Cloudflare Worker) — klucz API nie trafia do przeglądarki.
- Prompt systemowy budowany automatycznie z `shared/js/knowledge.js` (tylko prawdziwe zakładki i linki).
- Serwer usuwa z odpowiedzi linki spoza domeny kliniki, ogranicza liczbę zapytań i powtarza kontrolę stanów nagłych.
- Bez skonfigurowanego serwera lub przy awarii odpowiada bot regułowy (z adnotacją w czacie).

### trained 1.0.0
- Pierwsza wersja naszego modelu: klasyfikator Naive Bayes uczony na `trained/data/training.json` (287 przykładów) + słowach kluczowych.
- Trafność leave-one-out: 83%. Model wybiera tylko gotowe odpowiedzi — nie generuje treści medycznych.
- Skrypt `npm run train` z raportem pomyłek.

### Wspólne (shared) — dotyczy wszystkich trzech
- Widżet czatu w Shadow DOM (nie koliduje ze stylami strony), zapamiętywanie rozmowy przy przejściu między zakładkami.
- Warstwa bezpieczeństwa przed każdym silnikiem: stany nagłe → 112, myśli samobójcze → 112, 800 70 2222, 116 123.
- Strona porównawcza (`index.html`) i podgląd na stronie (`demo/floating.html`).
