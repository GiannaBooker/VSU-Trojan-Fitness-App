import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

function defaultDb() {
  return {
    users: [],
    sessions: [],
    revokedTokens: [],
  };
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
  return JSON.parse(raw);
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

export async function accessDb(reader) {
  const dbPath = resolveDbPath();
  return enqueue(async () => {
    const db = await readDbFile(dbPath);
    cleanupExpiredRevocations(db);
    await writeDbFile(dbPath, db);
    return reader(db);
  });
}

export async function mutateDb(mutator) {
  const dbPath = resolveDbPath();
  return enqueue(async () => {
    const db = await readDbFile(dbPath);
    cleanupExpiredRevocations(db);
    const result = await mutator(db);
    await writeDbFile(dbPath, db);
    return result;
  });
}

