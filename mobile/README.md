# React Native Frontend (Expo)

VSU-themed Expo frontend connected through the API gateway.
The auth flow now supports:

- Trojan-branded login and registration UI
- Expo web builds via `npm run web`
- Shared design tokens in `src/designSystem.js`

## Setup

```bash
cd mobile
npm install
```

## Run

```bash
npm start
npm run web
```

This app sends requests to `http://127.0.0.1:4000` by default.
Override that with `EXPO_PUBLIC_API_BASE_URL` when needed.

Native builds still show the welcome notification after login.
On web, notification code is skipped safely.
