# Poprawki profilu osób i ujednolicenie interfejsu

## Podsumowanie

- Naprawić profil osoby: otwieranie zdjęć, prawidłowe bboxy i usuwanie rozpoznanej osoby.
- Przejść na font **Inter** oraz monochromatyczną paletę ChatGPT: białe tło, czarne przyciski, białe etykiety, szarości pomocnicze i czerwony wyłącznie dla ostrzeżeń.
- Zastąpić różne systemowe animacje jednym współdzielonym systemem motion.
- Podnieść dolną nawigację nad home indicator iPhone’a.
- Zmiany obejmą aplikację mobilną oraz endpoint usuwania rozpoznania w backendzie `RAG`.

## Profil osoby, zdjęcia i bboxy

- Kafelki zdjęć będą klikalne i bez bboxów na kadrowanych miniaturach.
- Dotknięcie zdjęcia otworzy pełnoekranowy viewer z poziomym przewijaniem wszystkich zdjęć osoby, licznikiem, nazwą pliku i przyciskiem zamknięcia.
- Mobilny klient zacznie używać `GET /api/knowledge/entities/{id}/appearances`, aby pobierać bbox przypisany dokładnie do wybranej osoby.
- Bbox będzie liczony dla obrazu w trybie `contain`: obsłuży współrzędne pikselowe i znormalizowane, ograniczy je do wymiarów obrazu oraz uwzględni rzeczywisty rozmiar i offset renderowania.
- Obramowanie bbox będzie monochromatyczne i czytelne na każdym tle: czarna zewnętrzna ramka z białą wewnętrzną linią.
- Menu `…` profilu udostępni „Zmień nazwę” i „Usuń rozpoznanie”. Usunięcie wymaga osobnego potwierdzenia, zamyka profil po sukcesie i odświeża listę osób.

## Backend i interfejsy

- Dodać `DELETE /api/knowledge/entities/{id}`, zwracające `204 No Content`; nieistniejąca osoba zwraca `404`.
- Transakcyjna operacja usunie wyłącznie dane rozpoznania: sugestie, fakty, obserwacje twarzy, embeddingi twarzy, wzmianki, aliasy i encję osoby. Oryginalne zdjęcia, pliki, tekst i zwykłe embeddingi dokumentów pozostaną.
- Rozszerzyć repozytoria backendu o kasowanie rekordów zależnych według `mentionIds` i `entityId`, wykonywane przed usunięciem encji.
- W mobilnym API dodać `deletePerson(id)` oraz `getEntityAppearances(id)`, a w typach `EntityAppearance { mentionId, filePath, fileName, status, confidence, bbox }`.
- Zachować istniejącą, niezwiązaną zmianę w `RAG/frontend/components/chat/ChatInterface.tsx` bez modyfikacji.

## Spójny wygląd i animacje

- Dodać `@expo-google-fonts/inter` z wagami 400, 500, 600, 700 i 800; fonty będą ładowane przed ukryciem splash screena.
- Wprowadzić współdzielone komponenty tekstowe mapujące `fontWeight` na właściwy plik Inter oraz zastosować je do tekstów i pól na wszystkich aktywnych ekranach.
- Paleta: `surface/raised #FFFFFF`, `ink/accent #000000`, `muted #6B6B6B`, `border #E5E5E5`, `soft #F7F7F8`; usunąć `#2155e5` i niebieskie warianty.
- Wszystkie główne CTA otrzymają czarne tło i biały tekst; secondary pozostaną białe z czarnym tekstem i subtelną ramką.
- Zbudować wspólny `AnimatedBottomSheet`: `Modal` bez systemowej animacji, `overFullScreen`, wejście 220 ms `ease-out` z opacity i `translateY`, wyjście 160 ms, czarny backdrop o opacity 0.16.
- Zbudować wspólny pełnoekranowy `FadeModal` dla zdjęć, źródeł i podglądów: fade + scale przez 180 ms. Wszystkie obecne `fade`, `slide` i `pageSheet` zostaną zastąpione tymi dwoma wzorcami.
- Interakcje przycisków będą używać jednej animacji `scale 0.98`; przy włączonym Reduce Motion transformacje zostaną pominięte.
- Dolny pasek stanie się nieprzezroczystą białą powierzchnią. `bottom` będzie obliczany jako `max(safeArea.bottom + 8, 12)`, dzięki czemu pasek znajdzie się nad home indicatorem.

## Testy i kryteria odbioru

- Backend: test usuwania osoby z powiązaniami oraz bez powiązań; potwierdzenie, że pliki nie są kasowane; `404` dla błędnego ID.
- Profil: otwarcie każdego zdjęcia, przewijanie galerii, bbox na zdjęciach pionowych, poziomych i kwadratowych oraz po zmianie orientacji/layoutu.
- UI: otwieranie i zamykanie każdego arkusza, brak szarego systemowego podglądu, działająca klawiatura, gest zamknięcia i Reduce Motion.
- Nawigacja: pasek nie nachodzi na home indicator na iPhone’ach z i bez wycięcia oraz znika przy klawiaturze.
- Uruchomić `npm run typecheck`, `npm run lint`, eksport iOS oraz testy Maven backendu.
