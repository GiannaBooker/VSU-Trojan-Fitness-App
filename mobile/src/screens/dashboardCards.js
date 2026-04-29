import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  alpha,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../designSystem";
import { Pill } from "../ui";
import { useTheme } from "../theme";

function CardShell({ eyebrow, title, subtitle, children, style }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.surfaceBorder,
        },
        style,
      ]}
    >
      <View style={styles.cardHeader}>
        {eyebrow ? (
          <Text style={[styles.cardEyebrow, { color: theme.accent }]}>
            {eyebrow}
          </Text>
        ) : null}
        {title ? (
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function formatHoursMinutes(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function StatsCard({ stats, goal, onAdjustGoal, busy }) {
  const { theme } = useTheme();
  const visits = stats?.visitsThisWeek ?? 0;
  const weeklyGoal = goal?.weeklyGoal ?? stats?.weeklyGoal ?? 4;
  const progress = Math.min(1, visits / Math.max(1, weeklyGoal));
  const minutes = stats?.minutesThisWeek ?? 0;
  const streak = stats?.streakDays ?? 0;
  const lifetime = stats?.lifetimeVisits ?? 0;

  const tone =
    progress >= 1 ? "success" : progress >= 0.5 ? "midway" : "starting";

  return (
    <CardShell
      eyebrow="Your training"
      title="This week"
      subtitle={
        progress >= 1
          ? "Goal hit. Stack on top of it."
          : `${weeklyGoal - visits} more ${weeklyGoal - visits === 1 ? "visit" : "visits"} to hit your goal.`
      }
    >
      <View style={styles.statRow}>
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: theme.text }]}>{visits}</Text>
          <Text style={[styles.statLabel, { color: theme.textFaint }]}>Visits</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {formatHoursMinutes(minutes)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textFaint }]}>In the gym</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {streak}
            <Text style={[styles.statValueUnit, { color: theme.textMuted }]}>
              {" "}
              {streak === 1 ? "day" : "days"}
            </Text>
          </Text>
          <Text style={[styles.statLabel, { color: theme.textFaint }]}>Streak</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: theme.text }]}>{lifetime}</Text>
          <Text style={[styles.statLabel, { color: theme.textFaint }]}>Lifetime visits</Text>
        </View>
      </View>

      <View style={styles.goalRow}>
        <Text style={[styles.goalLabel, { color: theme.text }]}>
          Weekly goal: {visits} / {weeklyGoal}
        </Text>
        <View style={styles.goalControls}>
          <Pressable
            accessibilityLabel="Decrease goal"
            disabled={busy || weeklyGoal <= 1}
            onPress={() => onAdjustGoal(weeklyGoal - 1)}
            style={[
              styles.goalButton,
              {
                backgroundColor: theme.surfaceStrong,
                borderColor: theme.surfaceBorderStrong,
              },
              weeklyGoal <= 1 && styles.goalButtonDisabled,
            ]}
          >
            <Text style={[styles.goalButtonText, { color: theme.text }]}>−</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Increase goal"
            disabled={busy || weeklyGoal >= 14}
            onPress={() => onAdjustGoal(weeklyGoal + 1)}
            style={[
              styles.goalButton,
              {
                backgroundColor: theme.surfaceStrong,
                borderColor: theme.surfaceBorderStrong,
              },
              weeklyGoal >= 14 && styles.goalButtonDisabled,
            ]}
          >
            <Text style={[styles.goalButtonText, { color: theme.text }]}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.barTrack, { backgroundColor: theme.populationTrack }]}>
        <View
          style={[
            styles.barFill,
            { width: `${Math.max(2, progress * 100)}%` },
            tone === "success" && styles.barFillSuccess,
            tone === "midway" && styles.barFillMidway,
          ]}
        />
      </View>
    </CardShell>
  );
}

export function AutoCheckInToggle({ enabled, onToggle, helperText }) {
  const { theme } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={[styles.toggleTitle, { color: theme.text }]}>Auto check-in</Text>
        <Text style={[styles.toggleHelper, { color: theme.textMuted }]}>{helperText}</Text>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        onPress={() => onToggle(!enabled)}
        style={[
          styles.toggleTrack,
          { backgroundColor: theme.surfaceStrong },
          enabled && { backgroundColor: theme.accent },
        ]}
      >
        <View style={[styles.toggleThumb, enabled && styles.toggleThumbOn]} />
      </Pressable>
    </View>
  );
}

export function WorkoutsCard({ workouts, loading, error }) {
  const { theme } = useTheme();
  const [openId, setOpenId] = useState(null);

  return (
    <CardShell
      eyebrow="Workout plans"
      title="Train like a Trojan"
      subtitle="Tap a plan to see the full session."
    >
      {loading ? (
        <Text style={[styles.bodyText, { color: theme.textMuted }]}>Loading plans…</Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.workoutList}>
        {(workouts || []).map((workout) => {
          const isOpen = openId === workout.id;
          return (
            <Pressable
              accessibilityRole="button"
              key={workout.id}
              onPress={() => setOpenId(isOpen ? null : workout.id)}
              style={[
                styles.workoutRow,
                {
                  backgroundColor: theme.surfaceStrong,
                  borderColor: theme.surfaceBorder,
                },
                isOpen && {
                  backgroundColor: theme.accentSoft,
                  borderColor: alpha(colors.orange, 0.5),
                },
              ]}
            >
              <View style={styles.workoutHeader}>
                <View style={styles.workoutHeaderText}>
                  <Text style={[styles.workoutTitle, { color: theme.text }]}>
                    {workout.title}
                  </Text>
                  <Text style={[styles.workoutSummary, { color: theme.textMuted }]}>
                    {workout.summary}
                  </Text>
                </View>
                <Pill
                  style={[
                    styles.workoutPill,
                    {
                      backgroundColor: theme.surfaceStrong,
                      borderColor: theme.surfaceBorderStrong,
                    },
                  ]}
                  textStyle={[styles.workoutPillText, { color: theme.text }]}
                >
                  {workout.difficulty || "All"}
                </Pill>
              </View>

              <Text style={[styles.workoutMeta, { color: theme.textFaint }]}>
                {workout.durationMinutes} min · {workout.equipment}
              </Text>

              {isOpen ? (
                <View
                  style={[
                    styles.exerciseList,
                    { borderTopColor: theme.surfaceBorderStrong },
                  ]}
                >
                  {workout.exercises.map((ex, idx) => (
                    <View key={`${workout.id}-${idx}`} style={styles.exerciseRow}>
                      <Text style={[styles.exerciseIndex, { color: theme.textFaint }]}>
                        {idx + 1}.
                      </Text>
                      <Text style={[styles.exerciseName, { color: theme.text }]}>
                        {ex.name}
                      </Text>
                      <Text style={[styles.exerciseSets, { color: theme.textMuted }]}>
                        {ex.sets} × {ex.reps}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.workoutHint, { color: theme.textFaint }]}>
                  {workout.exercises.length} exercises · tap to expand
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </CardShell>
  );
}

function formatEventDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

function eventTagStyle(tag) {
  switch (tag) {
    case "intramurals":
      return { backgroundColor: alpha(colors.orange, 0.22), borderColor: alpha(colors.orange, 0.5) };
    case "wellness":
      return { backgroundColor: alpha("#1d7a52", 0.22), borderColor: alpha("#1d7a52", 0.5) };
    case "competition":
      return { backgroundColor: alpha(colors.error, 0.22), borderColor: alpha(colors.error, 0.5) };
    case "nutrition":
      return { backgroundColor: alpha(colors.cobalt, 0.22), borderColor: alpha(colors.cobalt, 0.5) };
    default:
      return null;
  }
}

export function EventsCard({ events, wellnessTip, loading, error }) {
  const { theme } = useTheme();
  return (
    <CardShell
      eyebrow="Campus & wellness"
      title="Around VSU"
      subtitle={wellnessTip ? `Tip of the day: ${wellnessTip}` : undefined}
    >
      {loading ? (
        <Text style={[styles.bodyText, { color: theme.textMuted }]}>Loading events…</Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!loading && (events?.length ?? 0) === 0 ? (
        <Text style={[styles.bodyText, { color: theme.textMuted }]}>
          No upcoming events. Check back soon.
        </Text>
      ) : null}

      <View style={styles.eventList}>
        {(events || []).map((event) => (
          <View
            key={event.id}
            style={[
              styles.eventRow,
              {
                backgroundColor: theme.surfaceStrong,
                borderColor: theme.surfaceBorder,
              },
            ]}
          >
            <View style={styles.eventHeader}>
              <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
              {event.tag ? (
                <Pill
                  style={[styles.eventPill, eventTagStyle(event.tag)]}
                  textStyle={styles.eventPillText}
                >
                  {event.tag}
                </Pill>
              ) : null}
            </View>
            <Text style={[styles.eventMeta, { color: theme.textMuted }]}>
              {formatEventDate(event.startsAt)} · {event.location}
            </Text>
            <Text style={[styles.eventSummary, { color: theme.textMuted }]}>
              {event.summary}
            </Text>
          </View>
        ))}
      </View>
    </CardShell>
  );
}

const CROWD_SCENARIOS = [
  { id: "empty", label: "Empty", caption: "0 / 20 — gym closed or just opened" },
  { id: "low", label: "Low", caption: "4 / 20 — early lifters" },
  { id: "moderate", label: "Moderate", caption: "10 / 20 — steady afternoon" },
  { id: "busy", label: "Busy", caption: "15 / 20 — post-class rush" },
  { id: "packed", label: "Packed", caption: "19 / 20 — homecoming week" },
];

export function CrowdSimulatorCard({
  activeBusyness,
  busy,
  onSimulate,
  occupancy,
  capacity,
}) {
  const { theme } = useTheme();
  return (
    <CardShell
      eyebrow="Testing"
      title="Crowd meter simulator"
      subtitle="Force the live counter into a specific busyness level. Affects the number everyone sees on the Gym tab."
    >
      <View style={styles.scenarioList}>
        {CROWD_SCENARIOS.map((scenario) => {
          const isActive = scenario.id === activeBusyness;
          return (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              key={scenario.id}
              onPress={() => onSimulate(scenario.id)}
              style={[
                styles.scenarioRow,
                {
                  backgroundColor: theme.surfaceStrong,
                  borderColor: theme.surfaceBorder,
                },
                isActive && {
                  backgroundColor: theme.accentSoft,
                  borderColor: alpha(colors.orange, 0.5),
                },
                busy && styles.scenarioRowDisabled,
              ]}
            >
              <View
                style={[
                  styles.scenarioRadioOuter,
                  { borderColor: theme.textFaint },
                ]}
              >
                {isActive ? (
                  <View
                    style={[
                      styles.scenarioRadioInner,
                      { backgroundColor: theme.accent },
                    ]}
                  />
                ) : null}
              </View>
              <View style={styles.scenarioTextWrap}>
                <Text style={[styles.scenarioLabel, { color: theme.text }]}>
                  {scenario.label}
                </Text>
                <Text style={[styles.scenarioDescription, { color: theme.textMuted }]}>
                  {scenario.caption}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.simulatorFootnote, { color: theme.textFaint }]}>
        Live count: {Number.isFinite(occupancy) ? occupancy : "—"} / {capacity ?? 20}
        {busy ? " · updating…" : ""}
      </Text>
    </CardShell>
  );
}

export function ThemeToggleCard() {
  const { theme, themeName, setThemeName } = useTheme();
  return (
    <CardShell
      eyebrow="Appearance"
      title="Theme"
      subtitle="Pick the look that's easiest on your eyes."
    >
      <View style={styles.themeRow}>
        {[
          { id: "dark", label: "Dark", caption: "Deep navy — default Trojan look" },
          { id: "light", label: "Light", caption: "Soft cream + sky for daytime" },
        ].map((option) => {
          const isActive = themeName === option.id;
          return (
            <Pressable
              accessibilityRole="button"
              key={option.id}
              onPress={() => setThemeName(option.id)}
              style={[
                styles.themeOption,
                {
                  backgroundColor: theme.surfaceStrong,
                  borderColor: theme.surfaceBorder,
                },
                isActive && {
                  backgroundColor: theme.accentSoft,
                  borderColor: alpha(colors.orange, 0.5),
                },
              ]}
            >
              <View
                style={[
                  styles.themeSwatch,
                  option.id === "dark" ? styles.themeSwatchDark : styles.themeSwatchLight,
                ]}
              />
              <View style={styles.themeOptionText}>
                <Text style={[styles.themeOptionLabel, { color: theme.text }]}>
                  {option.label}
                </Text>
                <Text style={[styles.themeOptionCaption, { color: theme.textMuted }]}>
                  {option.caption}
                </Text>
              </View>
              <View
                style={[
                  styles.themeRadio,
                  { borderColor: theme.textFaint },
                ]}
              >
                {isActive ? (
                  <View
                    style={[
                      styles.themeRadioInner,
                      { backgroundColor: theme.accent },
                    ]}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </CardShell>
  );
}

// Hook helper: used by Dashboard to load the workouts + events lazily.
export function useFetchedList(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loader()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Could not load.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
    ...shadows.soft,
  },
  cardHeader: {
    gap: spacing.xs,
  },
  cardEyebrow: {
    fontFamily: typography.fontFamilySans,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  cardTitle: {
    fontFamily: typography.fontFamilyBrand,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 30,
  },
  cardSubtitle: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
    lineHeight: 22,
  },
  bodyText: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
  },
  errorText: {
    color: colors.error,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
  },

  // Stats
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    rowGap: spacing.md,
  },
  statBlock: {
    flexBasis: "22%",
    flexGrow: 1,
    gap: 4,
    minWidth: 110,
  },
  statValue: {
    fontFamily: typography.fontFamilyBrand,
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 32,
  },
  statValueUnit: {
    fontFamily: typography.fontFamilySans,
    fontSize: 14,
    fontWeight: "600",
  },
  statLabel: {
    fontFamily: typography.fontFamilySans,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  goalRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  goalLabel: {
    flexShrink: 1,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
    fontWeight: "600",
  },
  goalControls: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  goalButton: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  goalButtonDisabled: {
    opacity: 0.4,
  },
  goalButtonText: {
    fontSize: 18,
    fontWeight: "700",
  },
  barTrack: {
    borderRadius: radii.pill,
    height: 8,
    overflow: "hidden",
  },
  barFill: {
    backgroundColor: colors.cobalt,
    height: "100%",
  },
  barFillMidway: {
    backgroundColor: colors.orange,
  },
  barFillSuccess: {
    backgroundColor: "#1d7a52",
  },

  // Auto check-in toggle
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  toggleText: {
    flexShrink: 1,
    gap: 2,
  },
  toggleTitle: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
    fontWeight: "700",
  },
  toggleHelper: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  toggleTrack: {
    borderRadius: radii.pill,
    height: 30,
    justifyContent: "center",
    paddingHorizontal: 3,
    width: 56,
  },
  toggleThumb: {
    backgroundColor: colors.white,
    borderRadius: 12,
    height: 24,
    width: 24,
  },
  toggleThumbOn: {
    transform: [{ translateX: 26 }],
  },

  // Workouts
  workoutList: {
    gap: spacing.sm,
  },
  workoutRow: {
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  workoutHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  workoutHeaderText: {
    flexShrink: 1,
    gap: 2,
  },
  workoutTitle: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
    fontWeight: "700",
  },
  workoutSummary: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  workoutMeta: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
  },
  workoutHint: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    fontStyle: "italic",
  },
  workoutPill: {
    borderRadius: radii.pill,
  },
  workoutPillText: {
    fontWeight: "700",
  },
  exerciseList: {
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  exerciseRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  exerciseIndex: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    fontWeight: "700",
    width: 22,
  },
  exerciseName: {
    flex: 1,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
  },
  exerciseSets: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    fontWeight: "600",
  },

  // Events
  eventList: {
    gap: spacing.sm,
  },
  eventRow: {
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  eventHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  eventTitle: {
    flexShrink: 1,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
    fontWeight: "700",
  },
  eventMeta: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
  },
  eventSummary: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  eventPill: {
    borderRadius: radii.pill,
  },
  eventPillText: {
    color: colors.white,
    fontSize: 10,
    letterSpacing: 0.8,
  },

  // Crowd simulator scenarios
  scenarioList: {
    gap: spacing.xs,
  },
  scenarioRow: {
    alignItems: "flex-start",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  scenarioRowDisabled: {
    opacity: 0.6,
  },
  scenarioRadioOuter: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    marginTop: 2,
    width: 22,
  },
  scenarioRadioInner: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  scenarioTextWrap: {
    flex: 1,
    gap: 2,
  },
  scenarioLabel: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
    fontWeight: "700",
  },
  scenarioDescription: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  simulatorFootnote: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
  },

  // Theme toggle
  themeRow: {
    gap: spacing.sm,
  },
  themeOption: {
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  themeSwatch: {
    borderRadius: radii.sm,
    height: 36,
    width: 36,
  },
  themeSwatchDark: {
    backgroundColor: colors.navy,
    borderColor: alpha(colors.white, 0.18),
    borderWidth: 1,
  },
  themeSwatchLight: {
    backgroundColor: "#fff7ef",
    borderColor: alpha(colors.ink, 0.18),
    borderWidth: 1,
  },
  themeOptionText: {
    flex: 1,
    gap: 2,
  },
  themeOptionLabel: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
    fontWeight: "700",
  },
  themeOptionCaption: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  themeRadio: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  themeRadioInner: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
});
