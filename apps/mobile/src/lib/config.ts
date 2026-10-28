// Where the Bulbu server is. In development the phone talks to the same computer that serves the JS bundle
// (the Expo dev server's host) on the API port; set EXPO_PUBLIC_API_URL to point anywhere else.
import Constants from "expo-constants";
import { Platform } from "react-native";

const PORT = process.env.EXPO_PUBLIC_API_PORT ?? "8787";

function devHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;
  if (!hostUri) return null;
  return hostUri.split(":")[0] ?? null;
}

export function apiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, "");
  if (Platform.OS === "web") {
    const h = typeof location !== "undefined" ? location.hostname : "localhost";
    return `http://${h}:${PORT}`;
  }
  const h = devHost();
  // Android emulators reach the host machine at 10.0.2.2
  return `http://${h ?? (Platform.OS === "android" ? "10.0.2.2" : "localhost")}:${PORT}`;
}
