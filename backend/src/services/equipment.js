import crypto from "node:crypto";

export const VALID_EQUIPMENT_STATUSES = new Set(["available", "in_use", "out_of_order"]);

export function listEquipment(db) {
  const equipment = Array.isArray(db?.equipment) ? db.equipment : [];
  const statuses = db?.equipmentStatuses && typeof db.equipmentStatuses === "object"
    ? db.equipmentStatuses
    : {};

  return equipment
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    .map((item) => {
      const status = statuses[item.id] || null;
      return {
        id: item.id,
        name: item.name,
        area: item.area ?? null,
        createdAt: item.createdAt,
        status: status?.status ?? "unknown",
        statusUpdatedAt: status?.updatedAt ?? null,
        statusNote: status?.note ?? null,
      };
    });
}

export function addEquipment(db, { name, area, createdAt }) {
  const equipmentItem = {
    id: crypto.randomUUID(),
    name,
    area,
    createdAt,
  };

  if (!Array.isArray(db.equipment)) db.equipment = [];
  if (!db.equipmentStatuses || typeof db.equipmentStatuses !== "object") db.equipmentStatuses = {};
  if (!Array.isArray(db.equipmentEvents)) db.equipmentEvents = [];

  db.equipment.push(equipmentItem);
  db.equipmentStatuses[equipmentItem.id] = {
    status: "available",
    updatedAt: createdAt,
    updatedByUserId: null,
    note: null,
  };
  db.equipmentEvents.push({
    id: crypto.randomUUID(),
    equipmentId: equipmentItem.id,
    status: "available",
    updatedAt: createdAt,
    updatedByUserId: null,
    note: null,
  });

  return equipmentItem;
}

export function setEquipmentStatus(db, { equipmentId, status, updatedAt, updatedByUserId, note }) {
  if (!VALID_EQUIPMENT_STATUSES.has(status)) {
    const err = new Error("INVALID_STATUS");
    err.code = "INVALID_STATUS";
    throw err;
  }

  const equipment = Array.isArray(db?.equipment) ? db.equipment : [];
  const exists = equipment.some((e) => e.id === equipmentId);
  if (!exists) {
    const err = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (!db.equipmentStatuses || typeof db.equipmentStatuses !== "object") db.equipmentStatuses = {};
  if (!Array.isArray(db.equipmentEvents)) db.equipmentEvents = [];

  db.equipmentStatuses[equipmentId] = {
    status,
    updatedAt,
    updatedByUserId,
    note,
  };

  const event = {
    id: crypto.randomUUID(),
    equipmentId,
    status,
    updatedAt,
    updatedByUserId,
    note,
  };
  db.equipmentEvents.push(event);
  return event;
}

export function getEquipmentHistory(db, equipmentId, { limit }) {
  const equipment = Array.isArray(db?.equipment) ? db.equipment : [];
  const exists = equipment.some((e) => e.id === equipmentId);
  if (!exists) {
    const err = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }

  const events = Array.isArray(db?.equipmentEvents) ? db.equipmentEvents : [];
  return events
    .filter((e) => e.equipmentId === equipmentId)
    .sort((a, b) => (a.updatedAt || "").localeCompare(b.updatedAt || ""))
    .slice(-limit);
}

