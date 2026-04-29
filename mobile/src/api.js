import Constants from "expo-constants";
import { Platform } from "react-native";

function resolveApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoClient?.hostUri;
  if (!hostUri) return "http://127.0.0.1:4000";

  const host = hostUri.split(":")[0];
  return `http://${host}:4000`;
}

const API_BASE_URL = resolveApiBaseUrl();

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const error = new Error(payload.error || "Request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function registerUser({ email, password }) {
  return request("/gateway/auth/register", { method: "POST", body: { email, password } });
}

export async function loginUser({ email, password }) {
  return request("/gateway/auth/login", { method: "POST", body: { email, password } });
}

export async function logoutUser({ token }) {
  return request("/gateway/auth/logout", { method: "POST", token });
}

export async function fetchGym({ token }) {
  return request("/gateway/gym", { token });
}

export async function fetchGymPopulation({ token }) {
  return request("/gateway/gym/population", { token });
}

export async function fetchStatus({ token }) {
  return request("/gateway/status", { token });
}

export async function checkInAtGym({ token, latitude, longitude, accuracy, source }) {
  return request("/gateway/gym/checkin", {
    method: "POST",
    token,
    body: { latitude, longitude, accuracy, source },
  });
}

export async function checkOutOfGym({ token }) {
  return request("/gateway/gym/checkout", { method: "POST", token });
}

export async function simulateGymPopulation({ token, scenario, count }) {
  const body = scenario != null ? { scenario } : { count };
  return request("/gateway/gym/population/simulate", {
    method: "POST",
    token,
    body,
  });
}

export async function fetchMyStats({ token }) {
  return request("/gateway/me/stats", { token });
}

export async function updateWeeklyGoal({ token, weeklyGoal }) {
  return request("/gateway/me/goal", {
    method: "POST",
    token,
    body: { weeklyGoal },
  });
}

export async function fetchWorkouts({ token }) {
  return request("/gateway/workouts", { token });
}

export async function fetchEvents({ token }) {
  return request("/gateway/events", { token });
}
