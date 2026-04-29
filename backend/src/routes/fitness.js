import { Router } from "express";
import { accessDb, mutateDb } from "../storage.js";
import { computeStats, DEFAULT_WEEKLY_GOAL } from "../stats.js";
import {
  WORKOUT_PLANS,
  pickWellnessTip,
  upcomingEvents,
} from "../content.js";

export function createFitnessRouter({ requireAuth }) {
  const router = Router();

  // Per-user training stats: visits this week, minutes this week, current
  // streak, lifetime totals, and weekly goal progress.
  router.get("/me/stats", requireAuth, async (req, res) => {
    const stats = await accessDb((db) => computeStats(db, req.user.id));
    return res.json({
      stats,
      goal: {
        weeklyGoal: stats.weeklyGoal,
        progress: Math.min(1, stats.visitsThisWeek / Math.max(1, stats.weeklyGoal)),
      },
    });
  });

  // Allow the user to update their weekly visit goal.
  router.post("/me/goal", requireAuth, async (req, res) => {
    const { weeklyGoal } = req.body ?? {};
    const value = Number(weeklyGoal);
    if (!Number.isFinite(value) || value < 1 || value > 14) {
      return res.status(400).json({
        error: "weeklyGoal must be a number between 1 and 14.",
      });
    }

    const goal = await mutateDb((db) => {
      const user = db.users.find((u) => u.id === req.user.id);
      if (!user) return DEFAULT_WEEKLY_GOAL;
      user.weeklyGoal = value;
      return value;
    });

    return res.json({ weeklyGoal: goal });
  });

  // Curated workout plans. Public to authenticated users.
  router.get("/workouts", requireAuth, (_req, res) => {
    return res.json({ workouts: WORKOUT_PLANS });
  });

  // Upcoming campus events + wellness tip of the day.
  router.get("/events", requireAuth, (_req, res) => {
    return res.json({
      events: upcomingEvents(),
      wellnessTip: pickWellnessTip(),
    });
  });

  return router;
}
