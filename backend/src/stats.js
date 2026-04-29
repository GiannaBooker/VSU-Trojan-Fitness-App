// Per-user fitness stats: visits this week, minutes this week, streak, goal
// progress. All times are evaluated in America/New_York (VSU's timezone) so
// "today" and "this week" line up with what a Petersburg student expects,
// even if the server clock happens to be UTC.

const VSU_TIMEZONE = "America/New_York";

// Default weekly visit goal — stored on the user record (`weeklyGoal`) but
// falls back to this when missing. Easy to lift to a setting later.
export const DEFAULT_WEEKLY_GOAL = 4;

// Returns YYYY-MM-DD for the given Date in VSU's timezone.
function vsuDateKey(date) {
  // en-CA gives ISO-style YYYY-MM-DD dates.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VSU_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Day-of-week (0=Sun..6=Sat) in VSU's timezone.
function vsuDayIndex(date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: VSU_TIMEZONE,
    weekday: "short",
  }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

// Start of "this week" (Monday at 00:00 local) in VSU's timezone, expressed
// as an ISO Date object. We approximate by stepping back day-keys until we
// reach Monday — good enough; we don't need millisecond precision.
function startOfVsuWeek(now = new Date()) {
  let cursor = new Date(now);
  for (let i = 0; i < 7; i += 1) {
    if (vsuDayIndex(cursor) === 1) break; // Monday
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }
  // Floor to local midnight by converting to date key, then re-parsing as
  // a Date in VSU's timezone (we use noon-UTC of the same date to dodge
  // DST edge cases).
  const key = vsuDateKey(cursor); // YYYY-MM-DD
  return new Date(`${key}T05:00:00.000Z`); // ~midnight VSU (DST varies ±1h)
}

function durationMinutes(session, fallbackEnd) {
  const start = Date.parse(session.checkInAt);
  const end = session.checkOutAt ? Date.parse(session.checkOutAt) : fallbackEnd;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 60_000);
}

export function computeStats(db, userId, now = new Date()) {
  const weekStart = startOfVsuWeek(now).getTime();
  const sessions = db.sessions.filter((s) => s.userId === userId);

  // Weekly aggregates.
  const weekSessions = sessions.filter(
    (s) => Date.parse(s.checkInAt) >= weekStart,
  );
  const visitsThisWeek = weekSessions.length;
  const minutesThisWeek = weekSessions.reduce(
    (total, s) => total + durationMinutes(s, now.getTime()),
    0,
  );

  // Streak: count back from today, requiring at least one check-in per day.
  // Today only "breaks" the streak if it's not the first day we look at and
  // had zero sessions; if we haven't worked out yet today but did yesterday
  // the streak is still alive.
  const dayKeysWithVisit = new Set(
    sessions.map((s) => vsuDateKey(new Date(s.checkInAt))),
  );

  let streakDays = 0;
  let cursor = new Date(now);
  const todayKey = vsuDateKey(cursor);
  if (!dayKeysWithVisit.has(todayKey)) {
    // Don't penalize a missing today — start counting from yesterday.
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }
  for (let i = 0; i < 365; i += 1) {
    const key = vsuDateKey(cursor);
    if (dayKeysWithVisit.has(key)) {
      streakDays += 1;
      cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }

  // Lifetime
  const lifetimeVisits = sessions.length;
  const lifetimeMinutes = sessions.reduce(
    (total, s) => total + durationMinutes(s, now.getTime()),
    0,
  );

  // Last visit
  let lastVisitAt = null;
  for (const s of sessions) {
    if (!lastVisitAt || s.checkInAt > lastVisitAt) lastVisitAt = s.checkInAt;
  }

  const user = db.users.find((u) => u.id === userId);
  const weeklyGoal = Number.isFinite(user?.weeklyGoal) ? user.weeklyGoal : DEFAULT_WEEKLY_GOAL;

  return {
    weekStart: new Date(weekStart).toISOString(),
    weeklyGoal,
    visitsThisWeek,
    minutesThisWeek,
    streakDays,
    lifetimeVisits,
    lifetimeMinutes,
    lastVisitAt,
    timezone: VSU_TIMEZONE,
  };
}
