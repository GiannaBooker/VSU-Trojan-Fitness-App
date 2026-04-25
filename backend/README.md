# Backend (Auth + Check-in/Check-out)

Minimal Node.js backend that provides:

- Email/password login + logout (JWT)
- Check-in / check-out endpoints with timestamps
- VSU-only registration/login emails (`@vsu.edu` domains only)

## Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and set `JWT_SECRET`.

## Run

```bash
# dev (auto-reload)
npm run dev

# or
npm start
```

Server starts on `http://localhost:3000` by default.

## API

All protected routes require:

`Authorization: Bearer <token>`

Admin-only routes also require:

`x-admin-key: <ADMIN_KEY>`

### Register

`POST /api/auth/register`

Body:
```json
{ "email": "user@students.vsu.edu", "password": "password123" }
```

### Login

`POST /api/auth/login`

Returns:
```json
{ "token": "JWT...", "user": { "id": "...", "email": "user@example.com" } }
```

Example:
```bash
curl -sS -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"user@students.vsu.edu","password":"password123"}'
```

### Logout

`POST /api/auth/logout` (requires `Authorization: Bearer <token>`)

### Check-in

`POST /api/checkin` (auth required)

Example:
```bash
curl -sS -X POST http://localhost:3000/api/checkin \
  -H "authorization: Bearer $TOKEN"
```

### Check-out

`POST /api/checkout` (auth required)

### Status

`GET /api/status` (auth required)

Returns:
```json
{ "status": "checked_in", "checkInAt": "2026-04-21T18:00:00.000Z" }
```

### Occupancy

`GET /api/occupancy` (auth required)

Returns:
```json
{ "count": 12, "maxCapacity": 50, "asOf": "2026-04-25T21:12:00.000Z" }
```

Set capacity (admin required):

`POST /api/occupancy/settings`

Body:
```json
{ "maxCapacity": 50 }
```

### Equipment availability

List equipment (auth required):

`GET /api/equipment`

Create equipment (admin required):

`POST /api/equipment`

Body:
```json
{ "name": "Treadmill #1", "area": "Cardio" }
```

Update equipment status (auth required):

`POST /api/equipment/:id/status`

Body:
```json
{ "status": "in_use", "note": "Peak hours" }
```

History (auth required):

`GET /api/equipment/:id/history?limit=50`
