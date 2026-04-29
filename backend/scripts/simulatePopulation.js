#!/usr/bin/env node
//
// simulatePopulation.js — populate Daniel Gym with synthetic check-ins so the
// "people in the gym" counter on the mobile app has something to display.
//
// Usage:
//   node scripts/simulatePopulation.js seed --count 14
//   node scripts/simulatePopulation.js show
//   node scripts/simulatePopulation.js clear
//   node scripts/simulatePopulation.js scenario empty
//   node scripts/simulatePopulation.js scenario moderate
//   node scripts/simulatePopulation.js scenario packed
//   node scripts/simulatePopulation.js drift --steps 6 --interval 2
//
// "drift" simulates the gym filling up and emptying over time so a tester can
// watch the population number change live in the app while polling.
//
// The script writes directly to backend/data/db.json (the same file the
// running server reads). It does NOT need the server to be running to seed
// data, but if the server is running it will pick up the changes on the next
// request because the storage layer re-reads the file on every access.

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "..", "data", "db.json");
const GYM_ID = "daniel-gym-vsu";
const GYM_CAPACITY = 20;

// Thresholds are absolute (matches backend busynessLabel):
//   0 empty | 1-7 low | 8-12 moderate | 13-17 busy | 18+ packed
const SCENARIOS = {
  empty: { count: 0, label: "Daniel Gym is closed / empty" },
  low: { count: 4, label: "A handful of early lifters" },
  moderate: { count: 10, label: "Steady afternoon crowd" },
  busy: { count: 15, label: "Post-class rush" },
  packed: { count: 19, label: "Homecoming week, line for the squat rack" },
};

async function readDb() {
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeDb(db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2) + "\n", "utf8");
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

function openSessionsForGym(db) {
  return db.sessions.filter(
    (s) => !s.checkOutAt && (s.gymId || GYM_ID) === GYM_ID,
  );
}

function closeSimSessions(db) {
  const now = new Date().toISOString();
  let closed = 0;
  for (const session of db.sessions) {
    if (!session.checkOutAt && session.source === "simulated") {
      session.checkOutAt = now;
      closed += 1;
    }
  }
  return closed;
}

function checkInSimUser(db, user, minutesAgo) {
  const checkInAt = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  db.sessions.push({
    id: crypto.randomUUID(),
    userId: user.id,
    gymId: GYM_ID,
    checkInAt,
    checkOutAt: null,
    source: "simulated",
  });
}

function busynessLabel(occupancy) {
  if (!Number.isFinite(occupancy) || occupancy <= 0) return "empty";
  if (occupancy < 8) return "low";
  if (occupancy <= 12) return "moderate";
  if (occupancy < 18) return "busy";
  return "packed";
}

function reportOccupancy(db) {
  const occupancy = openSessionsForGym(db).length;
  const ratio = occupancy / GYM_CAPACITY;
  const label = busynessLabel(occupancy);
  console.log(
    `Daniel Gym: ${occupancy} / ${GYM_CAPACITY} (${label}, ${(ratio * 100).toFixed(0)}%)`,
  );
}

async function seedCount(count) {
  const db = await readDb();
  const closed = closeSimSessions(db);
  for (let i = 0; i < count; i += 1) {
    const user = ensureSimUser(db, i);
    const minutesAgo = Math.floor(5 + Math.random() * 75);
    checkInSimUser(db, user, minutesAgo);
  }
  await writeDb(db);
  console.log(`Closed ${closed} previous simulated sessions.`);
  console.log(`Checked in ${count} simulated users.`);
  reportOccupancy(db);
}

async function clearAll() {
  const db = await readDb();
  const closed = closeSimSessions(db);
  await writeDb(db);
  console.log(`Closed ${closed} simulated sessions.`);
  reportOccupancy(db);
}

async function showStatus() {
  const db = await readDb();
  reportOccupancy(db);

  const open = openSessionsForGym(db);
  if (open.length === 0) {
    console.log("(no one currently checked in)");
    return;
  }

  console.log("\nCurrently checked in:");
  for (const session of open) {
    const user = db.users.find((u) => u.id === session.userId);
    const email = user?.email || "(unknown)";
    const minutes = Math.round(
      (Date.now() - Date.parse(session.checkInAt)) / 60_000,
    );
    const tag = session.source ? ` [${session.source}]` : "";
    console.log(`  - ${email}${tag} (${minutes}m ago)`);
  }
}

async function applyScenario(name) {
  const scenario = SCENARIOS[name];
  if (!scenario) {
    console.error(`Unknown scenario: ${name}`);
    console.error(`Available: ${Object.keys(SCENARIOS).join(", ")}`);
    process.exit(1);
  }
  console.log(`Scenario "${name}": ${scenario.label}`);
  await seedCount(scenario.count);
}

async function drift({ steps, intervalSeconds }) {
  const sequence = [4, 18, 45, 90, 160, 220, 180, 110, 60, 24, 8];
  const chosen = sequence.slice(0, Math.max(1, Math.min(sequence.length, steps)));

  for (let i = 0; i < chosen.length; i += 1) {
    console.log(`\nStep ${i + 1}/${chosen.length}: target ${chosen[i]}`);
    await seedCount(chosen[i]);
    if (i < chosen.length - 1) {
      await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
    }
  }
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = true;
      }
    } else {
      out._.push(arg);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || "show";

  switch (command) {
    case "seed": {
      const count = Number(args.count ?? 14);
      if (!Number.isFinite(count) || count < 0) {
        console.error("--count must be a non-negative number");
        process.exit(1);
      }
      await seedCount(count);
      break;
    }
    case "clear":
      await clearAll();
      break;
    case "show":
      await showStatus();
      break;
    case "scenario": {
      const name = args._[1];
      if (!name) {
        console.error("Usage: scenario <name>");
        console.error(`Available: ${Object.keys(SCENARIOS).join(", ")}`);
        process.exit(1);
      }
      await applyScenario(name);
      break;
    }
    case "drift": {
      const steps = Number(args.steps ?? 6);
      const intervalSeconds = Number(args.interval ?? 2);
      await drift({ steps, intervalSeconds });
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      console.error(
        "Commands: seed --count N | scenario <name> | drift --steps N --interval S | show | clear",
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
