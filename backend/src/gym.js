// Daniel Gymnasium at Virginia State University.
// Address: 4th Ave, Petersburg, VA 23806
//
// Coordinates were captured from a public mapping service; they are intentionally
// expressed as plain numbers so they can also be used by the simulation scripts
// in `backend/scripts/` and exported to the API gateway / mobile clients.
export const DANIEL_GYM = Object.freeze({
  id: "daniel-gym-vsu",
  name: "Daniel Gymnasium",
  shortName: "Daniel Gym",
  address: "4th Ave, Petersburg, VA 23806",
  latitude: 37.23922,
  longitude: -77.40118,

  // The "in" radius is small (you have to actually be inside the building
  // footprint). The "out" radius is larger so we don't yo-yo a user between
  // checked-in and checked-out when GPS jitters around the perimeter.
  geofenceRadiusMeters: 120,
  exitRadiusMeters: 180,

  // Daniel Gym is a small campus facility — the floor + weight room
  // realistically caps at about 20 people before it feels packed.
  capacity: 20,
  hours: {
    weekday: { open: "06:00", close: "23:00" },
    saturday: { open: "08:00", close: "22:00" },
    sunday: { open: "10:00", close: "20:00" },
  },
});

const EARTH_RADIUS_METERS = 6_371_008.8;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// Haversine distance between two lat/lon points in meters.
export function distanceMeters(a, b) {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isValidCoordinate(value) {
  return (
    value &&
    typeof value === "object" &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.latitude) <= 90 &&
    Math.abs(value.longitude) <= 180
  );
}

// Returns a structured geofence evaluation: are we inside, how far away, and
// (for the mobile UI) the radius the client should compare against.
export function evaluateLocation(coordinate, gym = DANIEL_GYM) {
  if (!isValidCoordinate(coordinate)) {
    return {
      gymId: gym.id,
      hasLocation: false,
      inside: false,
      distanceMeters: null,
      enterRadiusMeters: gym.geofenceRadiusMeters,
      exitRadiusMeters: gym.exitRadiusMeters,
    };
  }

  const distance = distanceMeters(coordinate, gym);
  return {
    gymId: gym.id,
    hasLocation: true,
    inside: distance <= gym.geofenceRadiusMeters,
    nearExit: distance > gym.exitRadiusMeters,
    distanceMeters: Math.round(distance),
    enterRadiusMeters: gym.geofenceRadiusMeters,
    exitRadiusMeters: gym.exitRadiusMeters,
    accuracyMeters: Number.isFinite(coordinate.accuracy) ? coordinate.accuracy : null,
  };
}
