# RAG Mobile

Mobilny klient RAG na iPhone’a (Expo + React Native). Aplikacja korzysta z tego samego backendu Spring Boot co web i pokazuje foldery, osoby, bboxy twarzy oraz rozmowy.

## Uruchomienie w LAN

1. Uruchom backend i face-service w repozytorium `rag`.
2. Sprawdź adres IP komputera w sieci Wi‑Fi (`ipconfig`).
3. Skopiuj `.env.example` do `.env` i ustaw `EXPO_PUBLIC_API_URL=http://ADRES_IP:8080`.
4. Wykonaj `npm install`, a następnie `npx expo start`.
5. Otwórz projekt w Expo Go na iPhonie. Telefon i komputer muszą być w tej samej sieci.

Adres backendu można też zmienić w aplikacji: Foldery → ikona ustawień.

## Weryfikacja

- `npm run typecheck`
- `npx expo-doctor`
- `npx expo export --platform ios`

W trybie LAN backend nie ma logowania ani HTTPS. Nie wystawiaj go publicznie bez dodania uwierzytelniania i TLS.
