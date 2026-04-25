import { Router } from "express";
import { accessDb, mutateDb } from "../storage.js";
import { getOccupancySnapshot, setMaxCapacity } from "../services/occupancy.js";

export function createOccupancyRouter({ requireAuth, requireAdmin }) {
  const router = Router();

  router.get("/occupancy", requireAuth, async (_req, res) => {
    const result = await accessDb((db) => {
      const { count, maxCapacity } = getOccupancySnapshot(db);
      return {
        count,
        maxCapacity,
        asOf: new Date().toISOString(),
      };
    });
    return res.json(result);
  });

  router.post("/occupancy/settings", requireAuth, requireAdmin, async (req, res) => {
    const { maxCapacity } = req.body ?? {};

    const nextMax =
      maxCapacity === null
        ? null
        : Number.isFinite(Number(maxCapacity))
          ? Math.max(0, Math.floor(Number(maxCapacity)))
          : NaN;

    if (Number.isNaN(nextMax)) {
      return res.status(400).json({ error: "maxCapacity must be a number or null" });
    }

    await mutateDb((db) => {
      setMaxCapacity(db, nextMax);
    });

    return res.json({ ok: true, maxCapacity: nextMax });
  });

  return router;
}
