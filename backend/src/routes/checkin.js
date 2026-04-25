import crypto from "node:crypto";
import { Router } from "express";
import { accessDb, mutateDb } from "../storage.js";

function currentOpenSession(db, userId) {
  const sessions = db.sessions
    .filter((s) => s.userId === userId)
    .sort((a, b) => a.checkInAt.localeCompare(b.checkInAt));
  const latest = sessions.at(-1);
  if (latest && !latest.checkOutAt) return latest;
  return null;
}

export function createCheckinRouter({ requireAuth }) {
  const router = Router();

  router.post("/checkin", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const now = new Date().toISOString();

    try {
      const session = await mutateDb((db) => {
        const open = currentOpenSession(db, userId);
        if (open) {
          const err = new Error("ALREADY_CHECKED_IN");
          err.code = "ALREADY_CHECKED_IN";
          throw err;
        }

        const newSession = {
          id: crypto.randomUUID(),
          userId,
          checkInAt: now,
          checkOutAt: null,
          checkOutReason: null,
        };
        db.sessions.push(newSession);
        return newSession;
      });

      return res.json({
        message: "Checked in",
        session: { id: session.id, checkInAt: session.checkInAt },
      });
    } catch (err) {
      if (err?.code === "ALREADY_CHECKED_IN") {
        return res.status(409).json({ error: "Already checked in" });
      }
      return res.status(500).json({ error: "Check-in failed" });
    }
  });

  router.post("/checkout", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const now = new Date().toISOString();

    try {
      const session = await mutateDb((db) => {
        const open = currentOpenSession(db, userId);
        if (!open) {
          const err = new Error("NOT_CHECKED_IN");
          err.code = "NOT_CHECKED_IN";
          throw err;
        }

        open.checkOutAt = now;
        open.checkOutReason = "user";
        return open;
      });

      return res.json({
        message: "Checked out",
        session: { id: session.id, checkInAt: session.checkInAt, checkOutAt: session.checkOutAt },
      });
    } catch (err) {
      if (err?.code === "NOT_CHECKED_IN") {
        return res.status(409).json({ error: "Not currently checked in" });
      }
      return res.status(500).json({ error: "Check-out failed" });
    }
  });

  router.get("/status", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const status = await accessDb((db) => {
      const open = currentOpenSession(db, userId);
      if (open) return { status: "checked_in", checkInAt: open.checkInAt };
      return { status: "checked_out" };
    });
    return res.json(status);
  });

  return router;
}
