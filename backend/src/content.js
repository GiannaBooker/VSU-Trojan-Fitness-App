// Curated VSU-flavored fitness content. Lives on the server (rather than
// hardcoded in the mobile app) so an admin can update plans, events, and
// wellness tips without shipping a new build.

export const WORKOUT_PLANS = [
  {
    id: "trojan-strength",
    title: "Trojan Strength — Push Day",
    summary: "Chest, shoulders, and triceps. About 45 minutes.",
    durationMinutes: 45,
    difficulty: "Intermediate",
    equipment: "Daniel Gym free weights + bench",
    exercises: [
      { name: "Barbell bench press", sets: 4, reps: "6-8" },
      { name: "Incline dumbbell press", sets: 3, reps: "8-10" },
      { name: "Standing overhead press", sets: 3, reps: "6-8" },
      { name: "Lateral raises", sets: 3, reps: "12-15" },
      { name: "Tricep rope pushdown", sets: 3, reps: "10-12" },
      { name: "Cable crunch", sets: 3, reps: "15" },
    ],
  },
  {
    id: "trojan-pull",
    title: "Trojan Strength — Pull Day",
    summary: "Back, biceps, and rear delts. About 45 minutes.",
    durationMinutes: 45,
    difficulty: "Intermediate",
    equipment: "Daniel Gym pull-up bar, dumbbells, cables",
    exercises: [
      { name: "Pull-ups (or lat pulldown)", sets: 4, reps: "6-8" },
      { name: "Barbell row", sets: 4, reps: "6-8" },
      { name: "Seated cable row", sets: 3, reps: "10-12" },
      { name: "Face pulls", sets: 3, reps: "12-15" },
      { name: "Hammer curls", sets: 3, reps: "10-12" },
      { name: "Plank", sets: 3, reps: "45 sec" },
    ],
  },
  {
    id: "trojan-legs",
    title: "Trojan Strength — Leg Day",
    summary: "Quads, hamstrings, glutes. Don't skip it.",
    durationMinutes: 50,
    difficulty: "Intermediate",
    equipment: "Squat rack + leg machines",
    exercises: [
      { name: "Back squat", sets: 4, reps: "5-8" },
      { name: "Romanian deadlift", sets: 3, reps: "8-10" },
      { name: "Walking lunges", sets: 3, reps: "20 steps" },
      { name: "Leg press", sets: 3, reps: "10-12" },
      { name: "Hamstring curl", sets: 3, reps: "12" },
      { name: "Standing calf raise", sets: 4, reps: "15" },
    ],
  },
  {
    id: "freshman-15-buster",
    title: "Freshman 15 Buster",
    summary: "30-minute full-body circuit, beginner friendly.",
    durationMinutes: 30,
    difficulty: "Beginner",
    equipment: "Bodyweight + light dumbbells",
    exercises: [
      { name: "Goblet squats", sets: 3, reps: "12" },
      { name: "Push-ups (knees ok)", sets: 3, reps: "10-12" },
      { name: "Dumbbell rows", sets: 3, reps: "10 each side" },
      { name: "Glute bridges", sets: 3, reps: "15" },
      { name: "Plank", sets: 3, reps: "30 sec" },
      { name: "Treadmill walk/jog", sets: 1, reps: "10 min" },
    ],
  },
  {
    id: "game-day-cardio",
    title: "Game Day Cardio",
    summary: "20-minute interval session for stamina.",
    durationMinutes: 20,
    difficulty: "All levels",
    equipment: "Treadmill or open floor",
    exercises: [
      { name: "Warm-up jog", sets: 1, reps: "5 min" },
      { name: "Sprint intervals (30s on / 60s off)", sets: 8, reps: "30s" },
      { name: "Cool-down walk", sets: 1, reps: "5 min" },
      { name: "Stretch (hips + hamstrings)", sets: 1, reps: "5 min" },
    ],
  },
  {
    id: "study-break-mobility",
    title: "Study-Break Mobility",
    summary: "15-minute mobility flow for long study days.",
    durationMinutes: 15,
    difficulty: "Beginner",
    equipment: "Just a mat",
    exercises: [
      { name: "Cat / cow", sets: 2, reps: "10 each" },
      { name: "World's greatest stretch", sets: 2, reps: "5 each side" },
      { name: "Hip 90/90 rotations", sets: 2, reps: "8 each side" },
      { name: "Thoracic openers", sets: 2, reps: "10" },
      { name: "Child's pose hold", sets: 1, reps: "60 sec" },
    ],
  },
];

// Upcoming campus wellness events. Dates are ISO so the mobile app can
// format them in the user's locale + filter past entries.
//
// In a real deployment these would come from an admin dashboard or be
// imported from VSU's events feed. Hardcoding them is fine for now.
export const CAMPUS_EVENTS = [
  {
    id: "intramural-3v3",
    title: "Intramural 3-on-3 Basketball",
    location: "Daniel Gymnasium",
    startsAt: "2026-05-02T22:00:00.000Z",
    endsAt: "2026-05-02T23:30:00.000Z",
    summary: "Sign up at the front desk. Free for all VSU students.",
    tag: "intramurals",
  },
  {
    id: "wellness-walk",
    title: "Trojan Wellness Walk",
    location: "Around the VSU Quad",
    startsAt: "2026-05-04T11:00:00.000Z",
    endsAt: "2026-05-04T12:00:00.000Z",
    summary: "Easy 2-mile group walk. Coffee + fruit at the finish line.",
    tag: "wellness",
  },
  {
    id: "yoga-on-the-lawn",
    title: "Yoga on the Lawn",
    location: "Foster Hall lawn",
    startsAt: "2026-05-06T20:00:00.000Z",
    endsAt: "2026-05-06T21:00:00.000Z",
    summary: "Bring a towel. All levels welcome.",
    tag: "wellness",
  },
  {
    id: "powerlifting-meet",
    title: "VSU Powerlifting Meet",
    location: "Daniel Gymnasium weight room",
    startsAt: "2026-05-09T14:00:00.000Z",
    endsAt: "2026-05-09T18:00:00.000Z",
    summary: "Watch or compete in squat, bench, deadlift.",
    tag: "competition",
  },
  {
    id: "nutrition-workshop",
    title: "Eat Like an Athlete (Workshop)",
    location: "Foster Hall room 210",
    startsAt: "2026-05-11T20:00:00.000Z",
    endsAt: "2026-05-11T21:00:00.000Z",
    summary: "Free workshop with VSU's campus dietitian.",
    tag: "nutrition",
  },
];

export const WELLNESS_TIPS = [
  "Drink at least 64 oz of water on workout days.",
  "Sleep is when your muscles actually grow — aim for 7–9 hours.",
  "Walk between classes. 10,000 steps adds up faster than you think.",
  "Warm up with 5 minutes of cardio before lifting.",
  "Pair every workout with a protein source within an hour.",
  "Take one full rest day every week — recovery is part of the program.",
  "Trojan Health Services offers free wellness check-ins. Use them.",
  "Stretch your hip flexors after long study sessions to ease low back pain.",
];

export function pickWellnessTip(now = new Date()) {
  const dayOfYear = Math.floor(
    (now - new Date(Date.UTC(now.getUTCFullYear(), 0, 0))) / 86_400_000,
  );
  return WELLNESS_TIPS[dayOfYear % WELLNESS_TIPS.length];
}

export function upcomingEvents(now = new Date(), limit = 5) {
  const cutoff = now.getTime() - 60 * 60 * 1000; // include events in progress
  return CAMPUS_EVENTS.filter(
    (event) => Date.parse(event.startsAt) >= cutoff,
  )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, limit);
}
