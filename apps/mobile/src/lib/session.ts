// Which profile is signed in on this device. SecureStore on phones, localStorage on web.
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "bulbu-user";
let cached: string | null | undefined;

export const session = {
  async load(): Promise<string | null> {
    if (cached !== undefined) return cached;
    try {
      cached = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) ?? null : await SecureStore.getItemAsync(KEY);
    } catch { cached = null; }
    return cached;
  },
  get: () => cached ?? null,
  async set(id: string | null) {
    cached = id;
    try {
      if (Platform.OS === "web") id ? globalThis.localStorage?.setItem(KEY, id) : globalThis.localStorage?.removeItem(KEY);
      else id ? await SecureStore.setItemAsync(KEY, id) : await SecureStore.deleteItemAsync(KEY);
    } catch { /* storage unavailable: the session lasts until the app closes */ }
  },
};
