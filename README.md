# VSU Trojan Fitness App

VSU Trojan Fitness is a small full-stack Expo app with a branded VSU
authentication experience, JWT-based login, a simple gym check-in flow, and a
**Planet Fitness-style live "people in the gym" counter** that uses the
device's location to auto check users in when they arrive at Daniel
Gymnasium.

## What is in this repo

- `mobile/`: Expo app for iOS, Android, and web (Trojan-branded auth +
  post-login Dashboard with the live gym population)
- `api-gateway/`: frontend-facing gateway that proxies mobile requests
- `backend/`: auth + check-in + gym population API with a local JSON database
- `backend/scripts/`: utilities for seeding the simulated gym population
- `frontend.html`: legacy standalone prototype page

## Current features

- VSU-branded sign in and registration flow with VSU email validation
- Shared design system for auth + dashboard styling
- Expo web support, JWT login / logout, file-based persistence in
  `backend/data/db.json`
- Live **Daniel Gym population counter** (capacity 20, with `empty / low /
  moderate / busy / packed` busyness labels)
- **Manual check-in** button + **auto check-in** when the device crosses into
  the geofence — both flows go through the same location-validated backend
  endpoint
- **Auto check-in toggle** on the dashboard so students can opt out of the
  automatic flow but still use the manual button
- Geofence centered on Daniel Gymnasium (4th Ave, Petersburg, VA 23806) with
  hysteresis (120 m enter / 180 m exit) so GPS jitter doesn't yo-yo a user
  between checked-in and checked-out
- **My Stats card**: visits this week, minutes in the gym, current streak,
  lifetime visits, and an adjustable weekly visit goal (1–14)
- **Workout plans card**: 6 curated VSU plans (push / pull / legs, freshman
  15 buster, game-day cardio, study-break mobility) with expandable exercise
  lists
- **Campus events card**: upcoming intramurals, wellness walks, yoga, and
  workshops on VSU's campus
- **Wellness tip of the day** rotating from a curated list
- In-app **Location Simulator** for testing the geofence and counter without
  travelling to Petersburg
- A `simulatePopulation.js` script for stress-testing the population counter

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

## Gym population & location features

### How it works

1. The backend tracks open check-in sessions in `db.json`. The
   `GET /api/gym/population` endpoint returns the count of currently
   checked-in users (max 20) along with a `busyness` label.

   | Occupants | Label |
   | --- | --- |
   | 0 | `empty` |
   | 1–7 | `low` |
   | 8–12 | `moderate` |
   | 13–17 | `busy` |
   | 18–20 | `packed` |
2. The mobile app polls that endpoint every 15 seconds and shows the live
   number on the post-login Dashboard.
3. The mobile app also reads the device's location every 30 seconds. When the
   user is inside the geofence around Daniel Gym (120 m radius), the app
   POSTs `/api/gym/checkin` with the lat/lon so the server can validate
   the user really is there before incrementing the counter.
4. When the user moves outside a larger 180 m radius, the app POSTs
   `/api/gym/checkout` and the server decrements the counter — but only if
   the session was opened by the auto loop in the first place. Manual check-ins
   stay open until the user explicitly checks out.
5. Sessions older than 4 hours without a checkout are auto-closed when the
   server reads them, so phones that died in the gym don't permanently inflate
   the count.
6. Students can turn off auto check-in from the Dashboard if they prefer to
   only use the manual button.

### Testable scenarios (no trip to Daniel Gym needed)

There are two ways to test the geofence + counter without driving to
Petersburg.

#### 1. In-app Location Simulator

After signing in, scroll to the **Location simulator** card on the Dashboard
and pick a scenario. Each scenario sets the app's reported location to a
specific lat/lon pair so you can see the geofence flip between inside and
outside:

| Scenario | Distance from gym | Expected behavior |
| --- | --- | --- |
| **Real GPS** | varies | Uses the device's actual location (default). |
| **Inside Daniel Gym (entrance)** | 0 m | Auto check-in succeeds, counter +1. |
| **Inside Daniel Gym (weight room)** | ~25 m | Auto check-in succeeds, counter +1. |
| **Inside the geofence (edge)** | ~95 m | Still inside enter radius (120 m). |
| **Just outside the geofence** | ~150 m | Inside exit radius but outside enter radius — no auto-action; manual check-in is rejected with `403`. |
| **Elsewhere on VSU campus** | ~400 m | Outside both radii. Auto check-out fires if you were checked in. |
| **Downtown Petersburg** | ~1.3 km | Outside. Manual check-in rejected. |
| **Home (Richmond)** | ~50 km | Outside. Manual check-in rejected with the distance shown. |

The "Geofence" field on the Dashboard tells you whether the simulated
location is currently `Inside`, on the `Edge` (between enter and exit
radii), or fully `Outside`.

#### 2. `simulatePopulation.js` script

To make the live counter actually have something to display while testing,
run the seed script:

```bash
cd backend
node scripts/simulatePopulation.js scenario empty       # 0
node scripts/simulatePopulation.js scenario low         # 4
node scripts/simulatePopulation.js scenario moderate    # 10
node scripts/simulatePopulation.js scenario busy        # 15
node scripts/simulatePopulation.js scenario packed      # 19
node scripts/simulatePopulation.js show                 # current state
node scripts/simulatePopulation.js clear                # wipe simulated sessions
```

You can also drift the count up and down to watch the mobile app's poller
react in real time:

```bash
node scripts/simulatePopulation.js drift --steps 8 --interval 5
```

Or seed a specific number:

```bash
node scripts/simulatePopulation.js seed --count 42
```

The simulated users are tagged `simulated: true` in `db.json`, so
`clear` only removes those — your real test account's sessions are left
alone.

### Daniel Gym geofence config

Defined in `backend/src/gym.js` and mirrored in
`mobile/src/location.js`:

- Center: `37.23922, -77.40118` (Daniel Gymnasium, 4th Ave, Petersburg, VA 23806)
- Enter radius: 120 m (you must be inside this to check in)
- Exit radius: 180 m (you have to leave this before auto check-out fires)
- Capacity: 20

## Beyond the gym counter

The post-login Dashboard pulls together the rest of the Trojan Fitness
companion experience:

- **My Stats** (`GET /api/me/stats`) — visits this week, total minutes in the
  gym this week, current streak (consecutive days with at least one check-in,
  evaluated in `America/New_York`), lifetime visits, and weekly goal progress.
  Adjust the goal with the +/− buttons (calls `POST /api/me/goal`).
- **Workout plans** (`GET /api/workouts`) — six curated plans defined in
  `backend/src/content.js`. Tap a plan to expand and see every exercise with
  sets and reps.
- **Campus events** (`GET /api/events`) — upcoming wellness events at VSU
  along with a daily wellness tip.

To extend the workout plans or events, just edit `backend/src/content.js` —
the mobile app picks up the changes on next refresh, no rebuild needed.

## More docs

- [Backend README](backend/README.md)
- [API Gateway README](api-gateway/README.md)
- [Mobile README](mobile/README.md)
