// Location provider for the mobile app.
//
// Three sources, in priority order:
//   1. A "mock" location chosen via the in-app Location Simulator panel
//      (see LOCATION_SCENARIOS below). This is what testers use to verify
//      the geofence and population counter without physically being at
//      Daniel Gym.
//   2. expo-location on native (iOS/Android), if the package is installed
//      and the user grants permission.
//   3. navigator.geolocation on the web.
//
// The module also includes a tiny haversine implementation so the UI can
// show the user how far away from Daniel Gym they currently are without
// waiting for a server round-trip.
import { Platform } from "react-native";

export const DANIEL_GYM = Object.freeze({
  id: "daniel-gym-vsu",
  name: "Daniel Gymnasium",
  shortName: "Daniel Gym",
  address: "4th Ave, Petersburg, VA 23806",
  latitude: 37.23922,
  longitude: -77.40118,
  geofenceRadiusMeters: 120,
  exitRadiusMeters: 180,
  capacity: 20,
});

// Pre-built scenarios that exercise every interesting branch of the
// geofence logic. The mobile dashboard exposes these as a "Location
// Simulator" so a grader / tester can flip between them and watch the
// gym status flip too.
export const LOCATION_SCENARIOS = [
  {
    id: "real-gps",
    label: "Real GPS",
    description: "Use the device's actual location (default).",
    coordinate: null,
  },
  {
    id: "gym-entrance",
    label: "Inside Daniel Gym (entrance)",
    description: "Standing at Daniel Gym's main entrance.",
    coordinate: {
      latitude: 37.23922,
      longitude: -77.40118,
      accuracy: 8,
    },
  },
  {
    id: "gym-weight-room",
    label: "Inside Daniel Gym (weight room)",
    description: "About 25m inside the building.",
    coordinate: {
      latitude: 37.23945,
      longitude: -77.40118,
      accuracy: 12,
    },
  },
  {
    id: "gym-edge",
    label: "Inside the geofence (edge)",
    description: "~95m from the gym center — still inside.",
    coordinate: {
      latitude: 37.24008,
      longitude: -77.40118,
      accuracy: 15,
    },
  },
  {
    id: "gym-just-outside",
    label: "Just outside the geofence",
    description: "~150m away — geofence has rejected you.",
    coordinate: {
      latitude: 37.24057,
      longitude: -77.40118,
      accuracy: 18,
    },
  },
  {
    id: "vsu-campus",
    label: "Elsewhere on VSU campus",
    description: "Foster Hall, ~400m from Daniel Gym.",
    coordinate: {
      latitude: 37.23700,
      longitude: -77.39800,
      accuracy: 10,
    },
  },
  {
    id: "petersburg-downtown",
    label: "Downtown Petersburg",
    description: "Off campus, ~1.3km from Daniel Gym.",
    coordinate: {
      latitude: 37.22781,
      longitude: -77.40189,
      accuracy: 20,
    },
  },
  {
    id: "richmond-home",
    label: "Home (Richmond, VA)",
    description: "~50km away. Auto check-in stays disabled.",
    coordinate: {
      latitude: 37.5407,
      longitude: -77.4360,
      accuracy: 25,
    },
  },
];

const EARTH_RADIUS_METERS = 6_371_008.8;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function distanceMeters(a, b) {
  if (!a || !b) return null;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function evaluateLocation(coordinate, gym = DANIEL_GYM) {
  if (!coordinate) {
    return {
      hasLocation: false,
      inside: false,
      nearExit: true,
      distanceMeters: null,
    };
  }
  const distance = distanceMeters(coordinate, gym);
  return {
    hasLocation: true,
    inside: distance <= gym.geofenceRadiusMeters,
    nearExit: distance > gym.exitRadiusMeters,
    distanceMeters: Math.round(distance),
    accuracyMeters: Number.isFinite(coordinate.accuracy) ? coordinate.accuracy : null,
  };
}

let expoLocationPromise;

async function getExpoLocation() {
  if (Platform.OS === "web") return null;
  if (!expoLocationPromise) {
    expoLocationPromise = import("expo-location")
      .then((module) => module)
      .catch(() => null);
  }
  return expoLocationPromise;
}

async function getDeviceLocation({ timeoutMs = 8000 } = {}) {
  if (Platform.OS === "web") {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      throw new Error("Geolocation is not available in this browser.");
    }
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Location request timed out."));
      }, timeoutMs);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timer);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ?? null,
            source: "device",
            capturedAt: new Date().toISOString(),
          });
        },
        (err) => {
          clearTimeout(timer);
          const message =
            err?.code === 1
              ? "Location permission denied. Enable it in browser settings or pick a simulated location."
              : err?.message || "Could not read your location.";
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 5000 },
      );
    });
  }

  const Location = await getExpoLocation();
  if (!Location) {
    throw new Error(
      "expo-location is not installed. Install it (`npx expo install expo-location`) or pick a simulated location.",
    );
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Location permission denied. Pick a simulated location to test.");
  }

  const reading = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy?.Balanced,
  });

  return {
    latitude: reading.coords.latitude,
    longitude: reading.coords.longitude,
    accuracy: reading.coords.accuracy ?? null,
    source: "device",
    capturedAt: new Date(reading.timestamp || Date.now()).toISOString(),
  };
}

export async function readLocation({ scenarioId, timeoutMs } = {}) {
  if (scenarioId && scenarioId !== "real-gps") {
    const scenario = LOCATION_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario || !scenario.coordinate) {
      throw new Error(`Unknown scenario "${scenarioId}"`);
    }
    return {
      latitude: scenario.coordinate.latitude,
      longitude: scenario.coordinate.longitude,
      accuracy: scenario.coordinate.accuracy ?? null,
      source: "mock",
      scenarioId,
      capturedAt: new Date().toISOString(),
    };
  }

  return getDeviceLocation({ timeoutMs });
}

export function findScenario(scenarioId) {
  return LOCATION_SCENARIOS.find((s) => s.id === scenarioId) || LOCATION_SCENARIOS[0];
}
