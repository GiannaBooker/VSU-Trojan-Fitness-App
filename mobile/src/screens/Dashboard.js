import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import {
  alpha,
  colors,
  layout,
  radii,
  shadows,
  spacing,
  typography,
} from "../designSystem";
import { ActionButton, Notice, Pill } from "../ui";
import { useTheme } from "../theme";
import {
  DANIEL_GYM,
  LOCATION_SCENARIOS,
  evaluateLocation,
  findScenario,
  readLocation,
} from "../location";
import {
  checkInAtGym,
  checkOutOfGym,
  fetchEvents,
  fetchGymPopulation,
  fetchMyStats,
  fetchStatus,
  fetchWorkouts,
  logoutUser,
  simulateGymPopulation,
  updateWeeklyGoal,
} from "../api";
import {
  AutoCheckInToggle,
  CrowdSimulatorCard,
  EventsCard,
  StatsCard,
  ThemeToggleCard,
  WorkoutsCard,
} from "./dashboardCards";

const POPULATION_POLL_MS = 15_000;
const LOCATION_POLL_MS = 30_000;

const BUSYNESS_LABELS = {
  empty: "Empty",
  low: "Low",
  moderate: "Moderate",
  busy: "Busy",
  packed: "Packed",
};

const TABS = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "gym", label: "Gym", icon: "◎" },
  { id: "training", label: "Training", icon: "≡" },
  { id: "settings", label: "Settings", icon: "⋯" },
];

// Mirrors backend thresholds for the small Daniel Gym room.
function busynessFromOccupancy(occupancy) {
  if (!Number.isFinite(occupancy) || occupancy <= 0) return "empty";
  if (occupancy < 8) return "low";
  if (occupancy <= 12) return "moderate";
  if (occupancy < 18) return "busy";
  return "packed";
}

function formatDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) return "—";
  if (distanceMeters < 1000) return `${distanceMeters} m away`;
  return `${(distanceMeters / 1000).toFixed(1)} km away`;
}

function formatCheckInTime(iso) {
  if (!iso) return null;
  const time = new Date(iso);
  return time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const TROJAN_LOGO = require("../../assets/vsu-trojans-logo.png");
const TROJAN_WORDMARK = require("../../assets/vsu-trojans-wordmark.png");

export default function Dashboard({ session, onLogout }) {
  const token = session.token;
  const { width } = useWindowDimensions();
  const isWide = width >= 720;
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState("home");

  const [population, setPopulation] = useState(null);
  const [populationError, setPopulationError] = useState(null);
  const [populationLoading, setPopulationLoading] = useState(true);

  const [coordinate, setCoordinate] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [scenarioId, setScenarioId] = useState("real-gps");

  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkedInAt, setCheckedInAt] = useState(null);
  const [checkInSource, setCheckInSource] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [autoCheckInEnabled, setAutoCheckInEnabled] = useState(true);

  const [stats, setStats] = useState(null);
  const [statsGoal, setStatsGoal] = useState(null);
  const [statsBusy, setStatsBusy] = useState(false);

  const [workouts, setWorkouts] = useState(null);
  const [workoutsLoading, setWorkoutsLoading] = useState(true);
  const [workoutsError, setWorkoutsError] = useState(null);

  const [events, setEvents] = useState(null);
  const [wellnessTip, setWellnessTip] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(null);

  const [crowdSimBusy, setCrowdSimBusy] = useState(false);
  const [activeCrowdScenario, setActiveCrowdScenario] = useState(null);

  const checkInRef = useRef(false);
  checkInRef.current = isCheckedIn;
  const actionBusyRef = useRef(false);
  actionBusyRef.current = actionBusy;
  const coordinateRef = useRef(null);
  coordinateRef.current = coordinate;
  const autoEnabledRef = useRef(true);
  autoEnabledRef.current = autoCheckInEnabled;

  const evaluation = useMemo(() => evaluateLocation(coordinate), [coordinate]);

  const refreshPopulation = useCallback(async () => {
    try {
      const data = await fetchGymPopulation({ token });
      setPopulation(data);
      setPopulationError(null);
    } catch (err) {
      setPopulationError(err.message || "Could not load gym population.");
    } finally {
      setPopulationLoading(false);
    }
  }, [token]);

  const refreshStatus = useCallback(async () => {
    try {
      const data = await fetchStatus({ token });
      const open = data.status === "checked_in";
      setIsCheckedIn(open);
      setCheckedInAt(open ? data.checkInAt : null);
      setCheckInSource(open ? data.source : null);
      if (Number.isFinite(data.occupancy) && Number.isFinite(data.capacity)) {
        setPopulation((prev) => ({
          ...(prev || {}),
          gym: prev?.gym || data.gym,
          occupancy: data.occupancy,
          capacity: data.capacity,
          busyness: busynessFromOccupancy(data.occupancy),
          updatedAt: new Date().toISOString(),
        }));
      }
    } catch (err) {
      setFeedback({
        title: "Status unavailable",
        message: err.message || "Could not load your check-in status.",
        tone: "error",
      });
    }
  }, [token]);

  const refreshLocation = useCallback(
    async (overrideScenarioId) => {
      const useScenario = overrideScenarioId ?? scenarioId;
      setLocationLoading(true);
      try {
        const reading = await readLocation({ scenarioId: useScenario });
        setCoordinate(reading);
        setLocationError(null);
        return reading;
      } catch (err) {
        setLocationError(err.message || "Could not read location.");
        return null;
      } finally {
        setLocationLoading(false);
      }
    },
    [scenarioId],
  );

  const refreshStats = useCallback(async () => {
    try {
      const data = await fetchMyStats({ token });
      setStats(data.stats);
      setStatsGoal(data.goal);
    } catch (err) {
      console.warn("Stats load failed:", err.message);
    }
  }, [token]);

  // Initial load.
  useEffect(() => {
    refreshPopulation();
    refreshStatus();
    refreshLocation();
    refreshStats();

    let active = true;
    fetchWorkouts({ token })
      .then((data) => {
        if (!active) return;
        setWorkouts(data.workouts || []);
        setWorkoutsError(null);
      })
      .catch((err) => {
        if (!active) return;
        setWorkoutsError(err.message || "Could not load workouts.");
      })
      .finally(() => active && setWorkoutsLoading(false));

    fetchEvents({ token })
      .then((data) => {
        if (!active) return;
        setEvents(data.events || []);
        setWellnessTip(data.wellnessTip || null);
        setEventsError(null);
      })
      .catch((err) => {
        if (!active) return;
        setEventsError(err.message || "Could not load events.");
      })
      .finally(() => active && setEventsLoading(false));

    return () => {
      active = false;
    };
  }, [refreshPopulation, refreshStatus, refreshLocation, refreshStats, token]);

  useEffect(() => {
    const id = setInterval(refreshPopulation, POPULATION_POLL_MS);
    return () => clearInterval(id);
  }, [refreshPopulation]);

  useEffect(() => {
    if (scenarioId !== "real-gps") return undefined;
    const id = setInterval(() => {
      refreshLocation();
    }, LOCATION_POLL_MS);
    return () => clearInterval(id);
  }, [refreshLocation, scenarioId]);

  // Auto check-in / check-out loop.
  useEffect(() => {
    if (!coordinate) return;
    if (actionBusyRef.current) return;
    if (!autoEnabledRef.current) return;

    const evalNow = evaluateLocation(coordinate);
    const insideEnter = evalNow.inside;
    const beyondExit = evalNow.nearExit;

    if (insideEnter && !checkInRef.current) {
      autoCheckIn(coordinate);
    } else if (beyondExit && checkInRef.current && checkInSource === "auto") {
      autoCheckOut();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinate, autoCheckInEnabled]);

  async function autoCheckIn(reading) {
    if (actionBusyRef.current || checkInRef.current) return;
    setActionBusy(true);
    try {
      const result = await checkInAtGym({
        token,
        latitude: reading.latitude,
        longitude: reading.longitude,
        accuracy: reading.accuracy,
        source: "auto",
      });
      setIsCheckedIn(true);
      setCheckedInAt(result.session?.checkInAt || new Date().toISOString());
      setCheckInSource("auto");
      setFeedback({
        title: "Auto checked in",
        message: `You're inside Daniel Gym. ${result.alreadyOpen ? "(session resumed)" : ""}`,
        tone: "success",
      });
      refreshPopulation();
      refreshStats();
    } catch (err) {
      if (err.status !== 403) {
        setFeedback({
          title: "Check-in failed",
          message: err.message || "Could not auto check in.",
          tone: "error",
        });
      }
    } finally {
      setActionBusy(false);
    }
  }

  async function autoCheckOut() {
    if (actionBusyRef.current || !checkInRef.current) return;
    setActionBusy(true);
    try {
      await checkOutOfGym({ token });
      setIsCheckedIn(false);
      setCheckedInAt(null);
      setCheckInSource(null);
      setFeedback({
        title: "Auto checked out",
        message: "You left Daniel Gym. See you next time.",
        tone: "info",
      });
      refreshPopulation();
      refreshStats();
    } catch (err) {
      setFeedback({
        title: "Check-out failed",
        message: err.message || "Could not auto check out.",
        tone: "error",
      });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleManualCheckIn() {
    setActionBusy(true);
    setFeedback(null);
    try {
      let reading = coordinateRef.current;
      if (!reading) {
        reading = await refreshLocation();
      }
      if (!reading) {
        setFeedback({
          title: "Location needed",
          message: "Allow location access or pick a simulated location below.",
          tone: "error",
        });
        return;
      }
      const result = await checkInAtGym({
        token,
        latitude: reading.latitude,
        longitude: reading.longitude,
        accuracy: reading.accuracy,
        source: "manual",
      });
      setIsCheckedIn(true);
      setCheckedInAt(result.session?.checkInAt || new Date().toISOString());
      setCheckInSource(result.session?.source || "location");
      setFeedback({
        title: "Checked in",
        message: "You're in Daniel Gym. Have a good lift.",
        tone: "success",
      });
      refreshPopulation();
      refreshStats();
    } catch (err) {
      if (err.status === 403) {
        setFeedback({
          title: "Not at the gym",
          message: "You have to be inside Daniel Gym to check in.",
          tone: "error",
        });
      } else {
        setFeedback({
          title: "Check-in failed",
          message: err.message || "Could not check in.",
          tone: "error",
        });
      }
    } finally {
      setActionBusy(false);
    }
  }

  async function handleManualCheckOut() {
    setActionBusy(true);
    setFeedback(null);
    try {
      await checkOutOfGym({ token });
      setIsCheckedIn(false);
      setCheckedInAt(null);
      setCheckInSource(null);
      setFeedback({
        title: "Checked out",
        message: "Hope you got a good workout in.",
        tone: "info",
      });
      refreshPopulation();
      refreshStats();
    } catch (err) {
      setFeedback({
        title: "Check-out failed",
        message: err.message || "Could not check out.",
        tone: "error",
      });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser({ token });
    } catch {
      // Even if logout fails (token already revoked), drop the local
      // session — the user explicitly asked to sign out.
    }
    onLogout();
  }

  function handleScenarioChange(nextScenarioId) {
    setScenarioId(nextScenarioId);
    refreshLocation(nextScenarioId);
  }

  async function handleAdjustGoal(nextValue) {
    if (!Number.isFinite(nextValue) || nextValue < 1 || nextValue > 14) return;
    setStatsBusy(true);
    try {
      const updated = await updateWeeklyGoal({ token, weeklyGoal: nextValue });
      setStatsGoal((prev) => ({
        ...(prev || {}),
        weeklyGoal: updated.weeklyGoal,
        progress:
          stats?.visitsThisWeek != null
            ? Math.min(1, stats.visitsThisWeek / Math.max(1, updated.weeklyGoal))
            : 0,
      }));
      setStats((prev) => (prev ? { ...prev, weeklyGoal: updated.weeklyGoal } : prev));
    } catch (err) {
      setFeedback({
        title: "Goal update failed",
        message: err.message || "Could not update your weekly goal.",
        tone: "error",
      });
    } finally {
      setStatsBusy(false);
    }
  }

  function handleAutoCheckInToggle(nextValue) {
    setAutoCheckInEnabled(nextValue);
    setFeedback({
      title: nextValue ? "Auto check-in on" : "Auto check-in off",
      message: nextValue
        ? "We'll check you in automatically when you walk into Daniel Gym."
        : "Use the Check in button manually when you arrive.",
      tone: "info",
    });
  }

  async function handleSimulateCrowd(scenario) {
    setCrowdSimBusy(true);
    setFeedback(null);
    try {
      const result = await simulateGymPopulation({ token, scenario });
      setActiveCrowdScenario(scenario);
      setPopulation((prev) => ({
        ...(prev || {}),
        gym: prev?.gym || { name: DANIEL_GYM.name, id: DANIEL_GYM.id },
        occupancy: result.occupancy,
        capacity: result.capacity,
        busyness: result.busyness,
        updatedAt: result.updatedAt,
      }));
      setFeedback({
        title: `Simulated "${scenario}"`,
        message: `Crowd meter is now ${result.busyness} (${result.occupancy} / ${result.capacity}).`,
        tone: "success",
      });
      refreshPopulation();
    } catch (err) {
      setFeedback({
        title: "Simulation failed",
        message: err.message || "Could not seed simulated occupants.",
        tone: "error",
      });
    } finally {
      setCrowdSimBusy(false);
    }
  }

  const occupancy = population?.occupancy ?? 0;
  const capacity = population?.capacity ?? DANIEL_GYM.capacity;
  const busyness = population?.busyness ?? busynessFromOccupancy(occupancy);
  const ratio = capacity > 0 ? Math.min(1, occupancy / capacity) : 0;
  const updatedLabel = population?.updatedAt
    ? new Date(population.updatedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  const checkedInTimeLabel = formatCheckInTime(checkedInAt);
  const distanceLabel = formatDistance(evaluation.distanceMeters);
  const insideGym = evaluation.inside;
  const activeScenario = findScenario(scenarioId);

  function renderFeedback() {
    if (!feedback) return null;
    return (
      <Notice
        bodyStyle={styles.noticeBody}
        style={styles.notice}
        title={feedback.title}
        titleStyle={styles.noticeTitle}
        tone={feedback.tone}
      >
        {feedback.message}
      </Notice>
    );
  }

  function renderHomeTab() {
    return (
      <>
        <View style={styles.greeting}>
          <Text style={[styles.greetingEyebrow, { color: theme.textFaint }]}>
            Welcome back
          </Text>
          <Text style={[styles.greetingEmail, { color: theme.text }]}>
            {session.user.email}
          </Text>
          <Text style={[styles.greetingHint, { color: theme.textMuted }]}>
            Tap the Gym tab to see who's at Daniel Gym right now or jump into a
            workout from Training.
          </Text>
        </View>

        {renderFeedback()}

        <StatsCard
          stats={stats}
          goal={statsGoal}
          onAdjustGoal={handleAdjustGoal}
          busy={statsBusy}
        />

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.surfaceBorder,
            },
          ]}
        >
          <Text style={[styles.cardEyebrow, { color: theme.accent }]}>
            Daniel Gym • snapshot
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBlock}>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {occupancy}
                <Text style={[styles.summaryValueUnit, { color: theme.textMuted }]}>
                  {" "}/ {capacity}
                </Text>
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textFaint }]}>
                In the gym
              </Text>
            </View>
            <View style={styles.summaryBlock}>
              <Pill style={styles.busynessPill} textStyle={styles.busynessPillText}>
                {BUSYNESS_LABELS[busyness] || busyness}
              </Pill>
              <Text style={[styles.summaryLabel, { color: theme.textFaint }]}>
                Busyness
              </Text>
            </View>
            <View style={styles.summaryBlock}>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {isCheckedIn ? "In" : "Out"}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textFaint }]}>
                Your status
              </Text>
            </View>
          </View>
        </View>

        <EventsCard
          events={events}
          wellnessTip={wellnessTip}
          loading={eventsLoading}
          error={eventsError}
        />
      </>
    );
  }

  function renderGymTab() {
    return (
      <>
        {renderFeedback()}

        <View
          style={[
            styles.populationCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.surfaceBorder,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardEyebrow, { color: theme.accent }]}>
              Daniel Gym • live
            </Text>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              People in the gym
            </Text>
          </View>

          {populationLoading && !population ? (
            <Text style={[styles.populationLoading, { color: theme.textMuted }]}>
              Loading…
            </Text>
          ) : (
            <>
              <View style={styles.populationNumberRow}>
                <Text style={[styles.populationNumber, { color: theme.text }]}>
                  {occupancy}
                </Text>
                <Text style={[styles.populationCapacity, { color: theme.textMuted }]}>
                  / {capacity}
                </Text>
              </View>
              <View
                style={[
                  styles.populationBarTrack,
                  { backgroundColor: theme.populationTrack },
                ]}
              >
                <View
                  style={[
                    styles.populationBarFill,
                    { width: `${Math.max(2, ratio * 100)}%` },
                    busyness === "packed" && styles.populationBarPacked,
                    busyness === "busy" && styles.populationBarBusy,
                  ]}
                />
              </View>
              <View style={styles.populationLabels}>
                <Pill style={styles.busynessPill} textStyle={styles.busynessPillText}>
                  {BUSYNESS_LABELS[busyness] || busyness}
                </Pill>
                <Text style={[styles.populationMeta, { color: theme.textFaint }]}>
                  {updatedLabel ? `Updated ${updatedLabel}` : "Updating…"}
                </Text>
              </View>
            </>
          )}

          {populationError ? (
            <Text style={styles.populationError}>{populationError}</Text>
          ) : null}
        </View>

        <View
          style={[
            styles.locationCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.surfaceBorder,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardEyebrow, { color: theme.accent }]}>
              Your location
            </Text>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {insideGym ? "You're at Daniel Gym" : "You're not at the gym yet"}
            </Text>
          </View>

          <View style={styles.locationRow}>
            <View style={styles.locationField}>
              <Text style={[styles.locationLabel, { color: theme.textFaint }]}>
                Distance
              </Text>
              <Text style={[styles.locationValue, { color: theme.text }]}>
                {distanceLabel}
              </Text>
            </View>
            <View style={styles.locationField}>
              <Text style={[styles.locationLabel, { color: theme.textFaint }]}>
                Geofence
              </Text>
              <Text style={[styles.locationValue, { color: theme.text }]}>
                {insideGym ? "Inside" : evaluation.nearExit ? "Outside" : "Edge"}
              </Text>
            </View>
            <View style={styles.locationField}>
              <Text style={[styles.locationLabel, { color: theme.textFaint }]}>
                Source
              </Text>
              <Text style={[styles.locationValue, { color: theme.text }]}>
                {coordinate?.source === "mock" ? "Simulated" : coordinate ? "GPS" : "—"}
              </Text>
            </View>
          </View>

          <Text style={[styles.gymAddress, { color: theme.textMuted }]}>
            {DANIEL_GYM.address}
          </Text>

          {locationError ? (
            <Text style={styles.populationError}>{locationError}</Text>
          ) : null}

          <View style={styles.statusRow}>
            <Pill
              style={[
                styles.statusPill,
                isCheckedIn ? styles.statusPillIn : styles.statusPillOut,
              ]}
              textStyle={styles.statusPillText}
            >
              {isCheckedIn ? "Checked in" : "Not checked in"}
            </Pill>
            {isCheckedIn && checkedInTimeLabel ? (
              <Text style={[styles.statusMeta, { color: theme.textFaint }]}>
                Since {checkedInTimeLabel}
                {checkInSource === "auto" ? " · auto" : ""}
              </Text>
            ) : null}
          </View>

          <View style={styles.actionRow}>
            <ActionButton
              label="Refresh location"
              loading={locationLoading}
              onPress={() => refreshLocation()}
              style={styles.actionButton}
              variant="ghost"
            />
            {isCheckedIn ? (
              <ActionButton
                label="Check out"
                loading={actionBusy}
                onPress={handleManualCheckOut}
                style={styles.actionButton}
                variant="secondary"
              />
            ) : (
              <ActionButton
                disabled={!insideGym}
                label={insideGym ? "Check in" : "Move closer to check in"}
                loading={actionBusy}
                onPress={handleManualCheckIn}
                style={styles.actionButton}
                variant="primary"
              />
            )}
          </View>

          <View style={[styles.toggleDivider, { backgroundColor: theme.surfaceBorder }]} />
          <AutoCheckInToggle
            enabled={autoCheckInEnabled}
            onToggle={handleAutoCheckInToggle}
            helperText={
              autoCheckInEnabled
                ? "We'll check you in automatically when you walk into Daniel Gym."
                : "Off — use the Check in button when you arrive."
            }
          />
        </View>
      </>
    );
  }

  function renderTrainingTab() {
    return (
      <>
        {renderFeedback()}

        <View style={styles.greeting}>
          <Text style={[styles.greetingEyebrow, { color: theme.textFaint }]}>
            Train like a Trojan
          </Text>
          <Text style={[styles.greetingEmail, { color: theme.text }]}>
            Workout plans
          </Text>
          <Text style={[styles.greetingHint, { color: theme.textMuted }]}>
            Pick a session for the day. Tap any plan to see the full exercise
            list with sets and reps.
          </Text>
        </View>

        <WorkoutsCard
          workouts={workouts}
          loading={workoutsLoading}
          error={workoutsError}
        />
      </>
    );
  }

  function renderSettingsTab() {
    return (
      <>
        {renderFeedback()}

        <View
          style={[
            styles.accountCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.surfaceBorder,
            },
          ]}
        >
          <Text style={[styles.cardEyebrow, { color: theme.accent }]}>Account</Text>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {session.user.email}
          </Text>
          <Text style={[styles.greetingHint, { color: theme.textMuted }]}>
            Signed in with your VSU account.
          </Text>
          <ActionButton
            label="Sign out"
            onPress={handleLogout}
            variant="secondary"
            style={styles.signOutButton}
          />
        </View>

        <ThemeToggleCard />

        <View
          style={[
            styles.simulatorCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.surfaceBorder,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardEyebrow, { color: theme.accent }]}>Settings</Text>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Auto check-in
            </Text>
          </View>
          <AutoCheckInToggle
            enabled={autoCheckInEnabled}
            onToggle={handleAutoCheckInToggle}
            helperText={
              autoCheckInEnabled
                ? "On — we'll check you in automatically when you walk in."
                : "Off — use the Check in button when you arrive."
            }
          />
        </View>

        <CrowdSimulatorCard
          activeBusyness={activeCrowdScenario || busyness}
          busy={crowdSimBusy}
          occupancy={occupancy}
          capacity={capacity}
          onSimulate={handleSimulateCrowd}
        />

        <View
          style={[
            styles.simulatorCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.surfaceBorder,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardEyebrow, { color: theme.accent }]}>Testing</Text>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Location simulator
            </Text>
            <Text style={[styles.simulatorBlurb, { color: theme.textMuted }]}>
              Pick a scenario to test the geofence and auto check-in without
              traveling to Daniel Gym. "Real GPS" goes back to your device's
              actual location.
            </Text>
          </View>

          <View style={styles.scenarioList}>
            {LOCATION_SCENARIOS.map((scenario) => {
              const isActive = scenario.id === scenarioId;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={scenario.id}
                  onPress={() => handleScenarioChange(scenario.id)}
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
                      {scenario.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.simulatorFootnote, { color: theme.textFaint }]}>
            Active: {activeScenario.label}
            {Platform.OS === "web" ? " · running on web" : ""}
          </Text>
        </View>
      </>
    );
  }

  function renderActiveTab() {
    switch (activeTab) {
      case "gym":
        return renderGymTab();
      case "training":
        return renderTrainingTab();
      case "settings":
        return renderSettingsTab();
      case "home":
      default:
        return renderHomeTab();
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.screenBg }]}>
      <StatusBar style={theme.statusBarStyle} />
      <LinearGradient colors={theme.background} style={styles.screen}>
        <View style={styles.headerRow}>
          <View style={styles.brandLockup}>
            <Image resizeMode="contain" source={TROJAN_LOGO} style={styles.headerLogo} />
            <Image resizeMode="contain" source={TROJAN_WORDMARK} style={styles.headerWordmark} />
          </View>
          <View style={styles.headerMeta}>
            <Text style={[styles.headerMetaLabel, { color: theme.textFaint }]}>
              Active
            </Text>
            <Text style={[styles.headerMetaValue, { color: theme.text }]}>
              {TABS.find((t) => t.id === activeTab)?.label || "Home"}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
          showsVerticalScrollIndicator={false}
        >
          {renderActiveTab()}
        </ScrollView>

        <TabBar
          activeTab={activeTab}
          onChange={setActiveTab}
          theme={theme}
          isWide={isWide}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

function TabBar({ activeTab, onChange, theme, isWide }) {
  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.tabBarBg,
          borderTopColor: theme.tabBarBorder,
        },
        isWide && styles.tabBarWide,
      ]}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={({ pressed }) => [
              styles.tabItem,
              pressed && styles.tabItemPressed,
            ]}
          >
            <View
              style={[
                styles.tabIndicator,
                isActive && { backgroundColor: theme.tabActive },
              ]}
            />
            <Text
              style={[
                styles.tabIcon,
                { color: isActive ? theme.tabActive : theme.tabInactive },
              ]}
            >
              {tab.icon}
            </Text>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? theme.tabActive : theme.tabInactive },
                isActive && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  scroll: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  scrollWide: {
    alignSelf: "center",
    maxWidth: layout.contentMaxWidth,
    width: "100%",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  brandLockup: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  headerLogo: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  headerWordmark: {
    height: 22,
    width: 110,
  },
  headerMeta: {
    alignItems: "flex-end",
    gap: 2,
  },
  headerMetaLabel: {
    fontFamily: typography.fontFamilySans,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerMetaValue: {
    fontFamily: typography.fontFamilyBrand,
    fontSize: 18,
    fontWeight: "700",
  },
  greeting: {
    gap: 4,
  },
  greetingEyebrow: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  greetingEmail: {
    fontFamily: typography.fontFamilyBrand,
    fontSize: typography.heading,
    fontWeight: "700",
  },
  greetingHint: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: 2,
  },
  notice: {
    backgroundColor: alpha(colors.white, 0.96),
  },
  noticeTitle: {},
  noticeBody: {},
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
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 32,
  },

  // Home: snapshot card
  summaryCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
    ...shadows.soft,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    rowGap: spacing.md,
  },
  summaryBlock: {
    flexBasis: "30%",
    flexGrow: 1,
    gap: 6,
    minWidth: 100,
  },
  summaryValue: {
    fontFamily: typography.fontFamilyBrand,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 34,
  },
  summaryValueUnit: {
    fontFamily: typography.fontFamilySans,
    fontSize: 16,
    fontWeight: "600",
  },
  summaryLabel: {
    fontFamily: typography.fontFamilySans,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },

  populationCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
    ...shadows.soft,
  },
  populationLoading: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
  },
  populationNumberRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.sm,
  },
  populationNumber: {
    fontFamily: typography.fontFamilyBrand,
    fontSize: 64,
    fontWeight: "700",
    lineHeight: 68,
  },
  populationCapacity: {
    fontFamily: typography.fontFamilySans,
    fontSize: 22,
    fontWeight: "600",
  },
  populationBarTrack: {
    borderRadius: radii.pill,
    height: 10,
    overflow: "hidden",
    width: "100%",
  },
  populationBarFill: {
    backgroundColor: colors.cobalt,
    borderRadius: radii.pill,
    height: "100%",
  },
  populationBarBusy: {
    backgroundColor: colors.orange,
  },
  populationBarPacked: {
    backgroundColor: colors.error,
  },
  populationLabels: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  busynessPill: {
    backgroundColor: alpha(colors.orange, 0.18),
    borderColor: alpha(colors.orange, 0.4),
  },
  busynessPillText: {
    color: colors.white,
  },
  populationMeta: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
  },
  populationError: {
    color: colors.errorSoft,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
  },
  locationCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
    ...shadows.soft,
  },
  locationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    rowGap: spacing.sm,
  },
  locationField: {
    flexBasis: "30%",
    flexGrow: 1,
    gap: 2,
    minWidth: 110,
  },
  locationLabel: {
    fontFamily: typography.fontFamilySans,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  locationValue: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
    fontWeight: "600",
  },
  gymAddress: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  statusPill: {
    borderWidth: 1,
  },
  statusPillIn: {
    backgroundColor: alpha("#1d7a52", 0.4),
    borderColor: alpha("#1d7a52", 0.6),
  },
  statusPillOut: {
    backgroundColor: alpha(colors.white, 0.06),
    borderColor: alpha(colors.white, 0.18),
  },
  statusPillText: {
    color: colors.white,
  },
  statusMeta: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  toggleDivider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  actionButton: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 140,
  },

  // Settings
  accountCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
    ...shadows.soft,
  },
  signOutButton: {
    marginTop: spacing.sm,
  },
  simulatorCard: {
    borderRadius: radii.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  simulatorBlurb: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    lineHeight: 18,
  },
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

  // Tab bar
  tabBar: {
    borderTopWidth: 1,
    flexDirection: "row",
    paddingBottom: Platform.select({ ios: spacing.lg, default: spacing.sm }),
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  tabBarWide: {
    alignSelf: "center",
    maxWidth: layout.contentMaxWidth,
    width: "100%",
  },
  tabItem: {
    alignItems: "center",
    flex: 1,
    gap: 4,
    paddingTop: spacing.xs,
  },
  tabItemPressed: {
    opacity: 0.6,
  },
  tabIndicator: {
    backgroundColor: "transparent",
    borderRadius: radii.pill,
    height: 3,
    width: 28,
  },
  tabIcon: {
    fontSize: 22,
    lineHeight: 26,
  },
  tabLabel: {
    fontFamily: typography.fontFamilySans,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
  },
  tabLabelActive: {
    fontWeight: "700",
  },
});
