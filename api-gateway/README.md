# API Gateway

Frontend-facing gateway that proxies requests to the existing backend.

## Setup

```bash
cd api-gateway
npm install
cp .env.example .env
```

## Run

```bash
npm run dev
```

Runs on `http://localhost:4000` by default.

## Routes

- `POST /gateway/auth/register` -> `/api/auth/register`
- `POST /gateway/auth/login` -> `/api/auth/login`
- `POST /gateway/auth/logout` -> `/api/auth/logout`
- `POST /gateway/checkin` -> `/api/checkin`
- `POST /gateway/checkout` -> `/api/checkout`
- `GET /gateway/status` -> `/api/status`
