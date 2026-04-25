import { Router } from "express";
import { accessDb, mutateDb } from "../storage.js";
import {
  addEquipment,
  getEquipmentHistory,
  listEquipment,
  setEquipmentStatus,
  VALID_EQUIPMENT_STATUSES,
} from "../services/equipment.js";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeNote(note) {
  if (note == null) return null;
  if (typeof note !== "string") return null;
  const trimmed = note.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 200);
}

export function createEquipmentRouter({ requireAuth, requireAdmin }) {
  const router = Router();

  router.get("/equipment", requireAuth, async (_req, res) => {
    const data = await accessDb((db) => {
      return { equipment: listEquipment(db) };
    });

    return res.json(data);
  });

  router.post("/equipment", requireAuth, requireAdmin, async (req, res) => {
    const { name, area } = req.body ?? {};
    if (!isNonEmptyString(name)) {
      return res.status(400).json({ error: "name is required" });
    }

    const createdAt = new Date().toISOString();
    const equipmentItemName = name.trim();
    const equipmentItemArea =
      typeof area === "string" && area.trim() ? area.trim().slice(0, 80) : null;

    const equipmentItem = await mutateDb((db) =>
      addEquipment(db, { name: equipmentItemName, area: equipmentItemArea, createdAt }),
    );

    return res.status(201).json({ equipment: equipmentItem });
  });

  router.post("/equipment/:id/status", requireAuth, async (req, res) => {
    const equipmentId = req.params.id;
    const { status, note } = req.body ?? {};

    if (!VALID_EQUIPMENT_STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const normalizedNote = normalizeNote(note);
    const now = new Date().toISOString();

    try {
      const updated = await mutateDb((db) => {
        return setEquipmentStatus(db, {
          equipmentId,
          status,
          updatedAt: now,
          updatedByUserId: req.user.id,
          note: normalizedNote,
        });
      });

      return res.json({ ok: true, event: updated });
    } catch (err) {
      if (err?.code === "NOT_FOUND") {
        return res.status(404).json({ error: "Equipment not found" });
      }
      return res.status(500).json({ error: "Failed to update status" });
    }
  });

  router.get("/equipment/:id/history", requireAuth, async (req, res) => {
    const equipmentId = req.params.id;
    const limitRaw = Number(req.query.limit || 50);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50;

    const data = await accessDb((db) => {
      try {
        const events = getEquipmentHistory(db, equipmentId, { limit });
        return { exists: true, events };
      } catch (err) {
        if (err?.code === "NOT_FOUND") return { exists: false, events: [] };
        throw err;
      }
    });

    if (!data.exists) return res.status(404).json({ error: "Equipment not found" });
    return res.json({ events: data.events });
  });

  return router;
}
