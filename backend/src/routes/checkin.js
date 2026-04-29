import crypto from "node:crypto";
import { Router } from "express";
import { accessDb, mutateDb } from "../storage.js";
import {
  DANIEL_GYM,
  evaluateLocation,
  isValidCoordinate,
} from "../gym.js";

// Sessions older than this without a checkout are auto-closed when we read
// them. Prevents "ghost" gym occupants if a phone dies or the user forgets to
// check out.
const STALE_SESSION_MS = 4 * 60 * 60 * 1000;

function ensureGymId(session) {
  // Older sessions in db.json predate the multi-gym schema; treat them as
  // belonging to Daniel Gym so the population counter still works.
  return session.gymId || DANIEL_GYM.id;
}

function reapStaleSessions(db) {
  const cutoff = Date.now() - STALE_SESSION_MS;
  let mutated = false;
  for (const session of db.sessions) {
    if (!session.checkOutAt) {
      const checkInTime = Date.parse(session.checkInAt);
      if (Number.isFinite(checkInTime) && checkInTime < cutoff) {
        session.checkOutAt = new Date(checkInTime + STALE_SESSION_MS).toISOString();
        session.autoClosed = true;
        mutated = true;
      }
    }
  }
  return mutated;
}

function currentOpenSessionForUser(db, userId, gymId = DANIEL_GYM.id) {
  const open = db.sessions.find(
    (s) => s.userId === userId && !s.checkOutAt && ensureGymId(s) === gymId,
  );
  return open || null;
}

function countOccupants(db, gymId = DANIEL_GYM.id) {
  return db.sessions.filter(
    (s) => !s.checkOutAt && ensureGymId(s) === gymId,
  ).length;
}

// Daniel Gym is small (capacity ~20). Use absolute thresholds rather than
// ratios so the labels match how a student actually experiences the room:
//   0           → empty
//   1–7         → low
//   8–12        → moderate
//   13–17       → busy
//   18+         → packed
function busynessLabel(occupancy, _capacity) {
  if (!Number.isFinite(occupancy) || occupancy <= 0) return "empty";
  if (occupancy < 8) return "low";
  if (occupancy <= 12) return "moderate";
  if (occupancy < 18) return "busy";
  return "packed";
}

// Same scenario presets as scripts/simulatePopulation.js so the in-app
// crowd-meter simulator on the Settings tab matches the CLI tool.
const SIM_SCENARIOS = {
  empty: 0,
  low: 4,
  moderate: 10,
  busy: 15,
  packed: 19,
};

function closeSimulatedSessions(db) {
  const now = new Date().toISOString();
  let closed = 0;
  for (const s of db.sessions) {
    if (!s.checkOutAt && s.source === "simulated") {
      s.checkOutAt = now;
      closed += 1;
    }
  }
  return closed;
}

function ensureSimUser(db, index) {
  const email = `sim.user${String(index).padStart(3, "0")}@students.vsu.edu`;
  const existing = db.users.find((u) => u.email === email);
  if (existing) return existing;

  const user = {
    id: crypto.randomUUID(),
    email,
    password: { salt: "sim-only", hash: "sim-only" },
    createdAt: new Date().toISOString(),
    simulated: true,
  };
  db.users.push(user);
  return user;
}

function gymPayload() {
  return {
    id: DANIEL_GYM.id,
    name: DANIEL_GYM.name,
    shortName: DANIEL_GYM.shortName,
    address: DANIEL_GYM.address,
    latitude: DANIEL_GYM.latitude,
    longitude: DANIEL_GYM.longitude,
    enterRadiusMeters: DANIEL_GYM.geofenceRadiusMeters,
    exitRadiusMeters: DANIEL_GYM.exitRadiusMeters,
    capacity: DANIEL_GYM.capacity,
    hours: DANIEL_GYM.hours,
  };
}

export function createCheckinRouter({ requireAuth }) {
  const router = Router();

  // Public-ish gym info (still requires auth to prevent random scraping).
  router.get("/gym", requireAuth, (_req, res) => {
    return res.json({ gym: gymPayload() });
  });

  // Current population + capacity. Available to any authenticated user.
  router.get("/gym/population", requireAuth, async (_req, res) => {
    const result = await mutateDb((db) => {
      const mutated = reapStaleSessions(db);
      const occupancy = countOccupants(db);
      return {
        mutated,
        occupancy,
        capacity: DANIEL_GYM.capacity,
        busyness: busynessLabel(occupancy, DANIEL_GYM.capacity),
        updatedAt: new Date().toISOString(),
      };
    });
    return res.json({
      gym: gymPayload(),
      occupancy: result.occupancy,
      capacity: result.capacity,
      busyness: result.busyness,
      updatedAt: result.updatedAt,
    });
  });

  // Manual (legacy) check-in. No location required.
  router.post("/checkin", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const now = new Date().toISOString();

    try {
      const session = await mutateDb((db) => {
        reapStaleSessions(db);
        const open = currentOpenSessionForUser(db, userId);
        if (open) {
          const err = new Error("ALREADY_CHECKED_IN");
          err.code = "ALREADY_CHECKED_IN";
          throw err;
        }

        const newSession = {
          id: crypto.randomUUID(),
          userId,
          gymId: DANIEL_GYM.id,
          checkInAt: now,
          checkOutAt: null,
          source: "manual",
        };
        db.sessions.push(newSession);
        return newSession;
      });

      return res.json({
        message: "Checked in",
        session: {
          id: session.id,
          gymId: session.gymId,
          checkInAt: session.checkInAt,
          source: session.source,
        },
      });
    } catch (err) {
      if (err?.code === "ALREADY_CHECKED_IN") {
        return res.status(409).json({ error: "Already checked in" });
      }
      return res.status(500).json({ error: "Check-in failed" });
    }
  });

  // Location-aware check-in. The mobile app posts the user's current GPS
  // coords; the server confirms they are physically inside the geofence
  // before allowing the check-in. This is what powers the "Planet Fitness
  // style" auto check-in.
  router.post("/gym/checkin", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const { latitude, longitude, accuracy, source } = req.body ?? {};
    const coordinate = { latitude, longitude, accuracy };

    if (!isValidCoordinate(coordinate)) {
      return res.status(400).json({
        error: "Valid latitude/longitude required",
      });
    }

    const evaluation = evaluateLocation(coordinate);
    if (!evaluation.inside) {
      return res.status(403).json({
        error: "You are not inside Daniel Gym",
        evaluation,
      });
    }

    const now = new Date().toISOString();

    try {
      const result = await mutateDb((db) => {
        reapStaleSessions(db);
        const existing = currentOpenSessionForUser(db, userId);
        if (existing) {
          // Idempotent: if you're already checked in, just return that
          // session instead of erroring. The mobile app can poll location
          // every few seconds, and we don't want to keep 409-ing it.
          return { session: existing, alreadyOpen: true };
        }

        const newSession = {
          id: crypto.randomUUID(),
          userId,
          gymId: DANIEL_GYM.id,
          checkInAt: now,
          checkOutAt: null,
          source: source === "auto" ? "auto" : "location",
          checkInLocation: { latitude, longitude, accuracy: accuracy ?? null },
        };
        db.sessions.push(newSession);
        return { session: newSession, alreadyOpen: false };
      });

      const occupancy = await accessDb((db) => countOccupants(db));

      return res.json({
        message: result.alreadyOpen ? "Already checked in" : "Checked in",
        alreadyOpen: result.alreadyOpen,
        evaluation,
        session: {
          id: result.session.id,
          gymId: result.session.gymId,
          checkInAt: result.session.checkInAt,
          source: result.session.source,
        },
        occupancy,
        capacity: DANIEL_GYM.capacity,
      });
    } catch (err) {
      console.error("Gym check-in failed:", err);
      return res.status(500).json({ error: "Check-in failed" });
    }
  });

  router.post("/checkout", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const now = new Date().toISOString();

    try {
      const session = await mutateDb((db) => {
        reapStaleSessions(db);
        const open = currentOpenSessionForUser(db, userId);
        if (!open) {
          const err = new Error("NOT_CHECKED_IN");
          err.code = "NOT_CHECKED_IN";
          throw err;
        }

        open.checkOutAt = now;
        return open;
      });

      return res.json({
        message: "Checked out",
        session: {
          id: session.id,
          gymId: ensureGymId(session),
          checkInAt: session.checkInAt,
          checkOutAt: session.checkOutAt,
        },
      });
    } catch (err) {
      if (err?.code === "NOT_CHECKED_IN") {
        return res.status(409).json({ error: "Not currently checked in" });
      }
      return res.status(500).json({ error: "Check-out failed" });
    }
  });

  // Alias of /checkout, named so the mobile geofence loop is symmetric with
  // /gym/checkin. Same semantics; no location required to check out (you can
  // already have left the building).
  router.post("/gym/checkout", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const now = new Date().toISOString();

    try {
      const session = await mutateDb((db) => {
        reapStaleSessions(db);
        const open = currentOpenSessionForUser(db, userId);
        if (!open) return null;
        open.checkOutAt = now;
        return open;
      });

      const occupancy = await accessDb((db) => countOccupants(db));

      if (!session) {
        return res.json({
          message: "Not currently checked in",
          alreadyClosed: true,
          occupancy,
          capacity: DANIEL_GYM.capacity,
        });
      }

      return res.json({
        message: "Checked out",
        session: {
          id: session.id,
          gymId: ensureGymId(session),
          checkInAt: session.checkInAt,
          checkOutAt: session.checkOutAt,
        },
        occupancy,
        capacity: DANIEL_GYM.capacity,
      });
    } catch (err) {
      console.error("Gym check-out failed:", err);
      return res.status(500).json({ error: "Check-out failed" });
    }
  });

  // Simulate the crowd meter from the app. Accepts either a named scenario
  // (empty / low / moderate / busy / packed) or a raw `count`. Replaces any
  // previously simulated sessions and leaves real user sessions alone so a
  // grader's actual check-in isn't disturbed.
  router.post("/gym/population/simulate", requireAuth, async (req, res) => {
    const body = req.body ?? {};
    const capacity = DANIEL_GYM.capacity;

    let target;
    if (typeof body.scenario === "string") {
      if (!(body.scenario in SIM_SCENARIOS)) {
        return res.status(400).json({
          error: `Unknown scenario "${body.scenario}". Choose from: ${Object.keys(SIM_SCENARIOS).join(", ")}`,
        });
      }
      target = SIM_SCENARIOS[body.scenario];
    } else if (body.count != null && Number.isFinite(Number(body.count))) {
      target = Math.max(0, Math.min(capacity, Math.floor(Number(body.count))));
    } else {
      return res.status(400).json({
        error: "Provide a scenario or count.",
      });
    }

    const result = await mutateDb((db) => {
      reapStaleSessions(db);
      const closed = closeSimulatedSessions(db);

      for (let i = 0; i < target; i += 1) {
        const user = ensureSimUser(db, i);
        const minutesAgo = Math.floor(5 + Math.random() * 75);
        db.sessions.push({
          id: crypto.randomUUID(),
          userId: user.id,
          gymId: DANIEL_GYM.id,
          checkInAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
          checkOutAt: null,
          source: "simulated",
        });
      }

      return { closed, target, occupancy: countOccupants(db) };
    });

    return res.json({
      message: `Simulated ${result.target} occupants.`,
      closed: result.closed,
      occupancy: result.occupancy,
      capacity,
      busyness: busynessLabel(result.occupancy, capacity),
      updatedAt: new Date().toISOString(),
    });
  });

  router.get("/status", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const status = await mutateDb((db) => {
      reapStaleSessions(db);
      const open = currentOpenSessionForUser(db, userId);
      const occupancy = countOccupants(db);
      if (open) {
        return {
          status: "checked_in",
          checkInAt: open.checkInAt,
          source: open.source || "manual",
          gym: gymPayload(),
          occupancy,
          capacity: DANIEL_GYM.capacity,
        };
      }
      return {
        status: "checked_out",
        gym: gymPayload(),
        occupancy,
        capacity: DANIEL_GYM.capacity,
      };
    });
    return res.json(status);
  });

  return router;
}
