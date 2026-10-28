// Screen time from Android's usage access → the server's /api/usage. Each sync sends today's totals so far; the server
// keeps one activity per app per day, so syncing again just updates the numbers.
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { usage } from "../../modules/bulbu-usage";
import type { UsageResult } from "@bulbu/api";
import { api } from "./api";

export const usageAvailable = Platform.OS === "android" && !!usage;
export const hasUsageAccess = () => { try { return !!usage?.hasAccess(); } catch { return false; } };
export const openUsageSettings = () => usage?.openSettings();

const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function readToday() {
  if (!usage) return [];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return usage.getUsage(+start, Date.now());
}

export async function syncToday(): Promise<UsageResult | null> {
  if (!usageAvailable || !hasUsageAccess()) return null;
  const apps = await readToday();
  return api.syncUsage({ day: localDay(), source: "device", apps: apps.map(a => ({ name: a.name, package: a.package, minutes: a.minutes, lastUsedAt: new Date(a.lastUsedAt).toISOString() })) });
}

/** Quietly syncs when the app opens or comes back, at most every 15 minutes. */
export function useAutoUsageSync(enabled: boolean, onSynced?: (r: UsageResult) => void) {
  const last = useRef(0);
  const cb = useRef(onSynced); cb.current = onSynced;
  useEffect(() => {
    if (!enabled || !usageAvailable) return;
    const run = () => {
      if (Date.now() - last.current < 15 * 60_000) return;
      last.current = Date.now();
      syncToday().then(r => { if (r && r.logged.length) cb.current?.(r); }).catch(() => {});
    };
    run();
    const sub = AppState.addEventListener("change", s => { if (s === "active") run(); });
    return () => sub.remove();
  }, [enabled]);
}
