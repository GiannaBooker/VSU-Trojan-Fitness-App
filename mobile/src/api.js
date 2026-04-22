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

async function post(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload;
}

export async function registerUser({ email, password }) {
  return post("/gateway/auth/register", { email, password });
}

export async function loginUser({ email, password }) {
  return post("/gateway/auth/login", { email, password });
}
