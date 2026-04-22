# VSU Trojan Fitness App

VSU Trojan Fitness is a small full-stack Expo app with a branded VSU authentication experience, JWT-based login, and a simple gym check-in / check-out flow.

## What is in this repo

- `mobile/`: Expo app for iOS, Android, and web
- `api-gateway/`: frontend-facing gateway that proxies mobile requests
- `backend/`: auth + check-in API with a local JSON database
- `frontend.html`: legacy standalone prototype page

## Current features

- VSU-branded sign in and registration flow
- Shared design system for auth UI styling
- Expo web support
- JWT login and logout
- Check-in, check-out, and current status endpoints
- VSU email validation for registration and login
- Local file-based persistence in `backend/data/db.json`

## Tech stack

- Expo + React Native
- React Native Web
- Node.js + Express
- JSON file storage

## Quick start

### 1. Install dependencies

```bash
cd backend && npm install
cd ../api-gateway && npm install
cd ../mobile && npm install
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Set `JWT_SECRET` in `backend/.env`.

### 3. Start the services

Run each command in its own terminal.

Backend:

```bash
cd backend
npm start
```

API gateway:

```bash
cd api-gateway
BACKEND_BASE_URL=http://127.0.0.1:3000 npm start
```

Expo app:

```bash
cd mobile
npm start
```

For web:

```bash
cd mobile
npm run web
```

## Default local URLs

- Backend: `http://127.0.0.1:3000`
- API gateway: `http://127.0.0.1:4000`
- Expo app: opened by Expo in the simulator, device, or browser

## Environment notes

- The mobile app uses `EXPO_PUBLIC_API_BASE_URL` if you provide it.
- If that variable is not set, the app auto-resolves the Expo host for native development.
- The backend can use a custom database file path with `DB_PATH`.

## Data storage

The backend stores app data in:

- `backend/data/db.json`

To reset local data, clear that file back to:

```json
{
  "users": [],
  "sessions": [],
  "revokedTokens": []
}
```

## More docs

- [Backend README](backend/README.md)
- [API Gateway README](api-gateway/README.md)
- [Mobile README](mobile/README.md)
