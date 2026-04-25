export function computeOccupancyCount(db) {
  const sessions = Array.isArray(db?.sessions) ? db.sessions : [];
  return sessions.filter((s) => s && !s.checkOutAt).length;
}

export function getOccupancySnapshot(db) {
  const count = computeOccupancyCount(db);
  const maxCapacity =
    db?.occupancy && typeof db.occupancy === "object" ? db.occupancy.maxCapacity ?? null : null;
  return { count, maxCapacity };
}

export function setMaxCapacity(db, maxCapacity) {
  if (!db.occupancy || typeof db.occupancy !== "object") db.occupancy = { maxCapacity: null };
  db.occupancy.maxCapacity = maxCapacity;
}

