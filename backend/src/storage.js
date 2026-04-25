import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

function defaultDb() {
  return {
    users: [],
    sessions: [],
    revokedTokens: [],
    occupancy: { maxCapacity: null },
    equipment: [],
    equipmentStatuses: {},
    equipmentEvents: [],
  };
}

function normalizeDb(db) {
  const normalized = db && typeof db === "object" ? db : {};

  if (!Array.isArray(normalized.users)) normalized.users = [];
  if (!Array.isArray(normalized.sessions)) normalized.sessions = [];
  if (!Array.isArray(normalized.revokedTokens)) normalized.revokedTokens = [];

  if (
    !normalized.occupancy ||
    typeof normalized.occupancy !== "object" ||
    Array.isArray(normalized.occupancy)
  ) {
    normalized.occupancy = { maxCapacity: null };
  }
  if (typeof normalized.occupancy.maxCapacity !== "number") {
    normalized.occupancy.maxCapacity = null;
  }

  if (!Array.isArray(normalized.equipment)) normalized.equipment = [];
  if (
    !normalized.equipmentStatuses ||
    typeof normalized.equipmentStatuses !== "object" ||
    Array.isArray(normalized.equipmentStatuses)
  ) {
    normalized.equipmentStatuses = {};
  }
  if (!Array.isArray(normalized.equipmentEvents)) normalized.equipmentEvents = [];

  return normalized;
}

function resolveDbPath() {
  const fromEnv = process.env.DB_PATH;
  if (fromEnv) return path.resolve(process.cwd(), fromEnv);
  return path.resolve(process.cwd(), "data", "db.json");
}

async function ensureDbFile(dbPath) {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  if (!existsSync(dbPath)) {
    await fs.writeFile(dbPath, JSON.stringify(defaultDb(), null, 2) + "\n", "utf8");
  }
}

let queue = Promise.resolve();

function enqueue(task) {
  const next = queue.then(task, task);
  queue = next.catch(() => {});
  return next;
}

async function readDbFile(dbPath) {
  await ensureDbFile(dbPath);
  const raw = await fs.readFile(dbPath, "utf8");
  return normalizeDb(JSON.parse(raw));
}

async function writeDbFile(dbPath, db) {
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2) + "\n", "utf8");
}

function cleanupExpiredRevocations(db) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  db.revokedTokens = db.revokedTokens.filter(
    (item) => typeof item.exp === "number" && item.exp > nowSeconds,
  );
}

function cleanupStaleOpenSessions(db) {
  const maxHoursRaw = Number(process.env.SESSION_MAX_HOURS || 8);
  const maxHours = Number.isFinite(maxHoursRaw) && maxHoursRaw > 0 ? maxHoursRaw : 8;
  const maxMs = maxHours * 60 * 60 * 1000;
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  for (const session of db.sessions) {
    if (!session || typeof session !== "object") continue;
    if (session.checkOutAt) continue;
    const checkInMs = Date.parse(session.checkInAt);
    if (!Number.isFinite(checkInMs)) continue;
    if (now - checkInMs > maxMs) {
      session.checkOutAt = nowIso;
      session.checkOutReason = "auto_timeout";
    }
  }
}

export async function accessDb(reader) {
  const dbPath = resolveDbPath();
  return enqueue(async () => {
    const db = await readDbFile(dbPath);
    cleanupExpiredRevocations(db);
    cleanupStaleOpenSessions(db);
    await writeDbFile(dbPath, db);
    return reader(db);
  });
}

export async function mutateDb(mutator) {
  const dbPath = resolveDbPath();
  return enqueue(async () => {
    const db = await readDbFile(dbPath);
    cleanupExpiredRevocations(db);
    cleanupStaleOpenSessions(db);
    const result = await mutator(db);
    await writeDbFile(dbPath, db);
    return result;
  });
}
