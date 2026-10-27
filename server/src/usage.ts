// Device usage ingestion. The phone (Android usage access, or a parsed screenshot) reports minutes per app for a day;
// Bulbu keeps one activity per app per day, so syncing again just updates the numbers instead of double-counting.
// Only distracting and productive apps are stored. Neutral apps (calls, mail, maps, payments) never leave the summary.
import { allImpacts, classifyApp, dayKey, fmtMinutes, MIN_APP_MINUTES, newlyUnlocked, type Activity, type AppKind, type Impact } from "@bulbu/engine";
import { store } from "./db.ts";

export interface UsageApp {
  /** app label as the phone shows it ("YouTube") */
  name: string;
  /** Android package name when known ("com.google.android.youtube") */
  package?: string;
  /** total foreground minutes for the day so far */
  minutes: number;
  /** when the app was last used (ISO); defaults to now */
  lastUsedAt?: string;
}
export interface UsageInput {
  /** the local day the minutes belong to (yyyy-mm-dd); defaults to today */
  day?: string;
  source?: "device" | "screenshot";
  apps: UsageApp[];
}
export interface UsageResult {
  day: string;
  logged: { app: string; kind: AppKind; category: string; minutes: number; deltaMinutes: number }[];
  ignored: { app: string; reason: "neutral" | "too short" }[];
  /** apps Bulbu has never seen; the app can ask the user which kind they are */
  unknown: string[];
  /** goal impact of what changed in this sync only */
  impacts: Impact[];
  netDays: number;
  unlocked: string[];
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "app";

export function ingestUsage(userId: string, input: UsageInput, now = new Date()): UsageResult {
  const user = store.user(userId)!, goals = store.goals(userId);
  const day = input.day && /^\d{4}-\d{2}-\d{2}$/.test(input.day) ? input.day : dayKey(now);
  const before = store.activities(userId);
  const out: UsageResult = { day, logged: [], ignored: [], unknown: [], impacts: [], netDays: 0, unlocked: [] };
  const changed: Activity[] = [];

  // the same app can be reported twice (two profiles); merge by name
  const merged = new Map<string, UsageApp>();
  for (const a of input.apps ?? []) {
    if (!a?.name || !Number.isFinite(a.minutes) || a.minutes < 0) continue;
    const k = a.name.trim().toLowerCase(), prev = merged.get(k);
    merged.set(k, prev ? { ...prev, minutes: prev.minutes + a.minutes, lastUsedAt: [prev.lastUsedAt, a.lastUsedAt].filter(Boolean).sort().pop() } : { ...a, name: a.name.trim() });
  }

  for (const a of merged.values()) {
    const info = classifyApp(a.name, a.package, user.appKinds);
    if (!info.known) out.unknown.push(info.name);
    const minutes = Math.round(Math.min(a.minutes, 24 * 60));
    if (info.kind === "neutral" || !info.category) { out.ignored.push({ app: info.name, reason: "neutral" }); continue; }
    if (minutes < MIN_APP_MINUTES) { out.ignored.push({ app: info.name, reason: "too short" }); continue; }
    const id = `u_${day}_${slug(info.name)}`;
    const old = before.find(x => x.id === id);
    const at = a.lastUsedAt && dayKey(a.lastUsedAt) === day ? a.lastUsedAt : old?.at ?? (dayKey(now) === day ? now.toISOString() : `${day}T21:00:00`);
    const act: Activity = {
      id, at, category: info.category, minutes, app: info.name, source: input.source === "screenshot" ? "screenshot" : "device",
      label: `${fmtMinutes(minutes)} on ${info.name}`,
    };
    if (old && old.minutes === minutes && old.category === act.category) continue;   // nothing new
    store.putActivity(userId, act);
    changed.push(act);
    out.logged.push({ app: info.name, kind: info.kind, category: info.category, minutes, deltaMinutes: minutes - (old?.minutes ?? 0) });
  }

  if (changed.length) {
    const after = store.activities(userId);
    // impact of this sync = impact with the new numbers minus impact with the old numbers, per goal
    const ids = new Set(changed.map(c => c.id));
    const now_ = allImpacts(goals, after, now).filter(i => ids.has(i.activityId));
    const was = allImpacts(goals, before, now).filter(i => ids.has(i.activityId));
    const byGoal = new Map<string, Impact>();
    for (const i of now_) {
      const prev = was.filter(w => w.goalId === i.goalId && w.activityId === i.activityId).reduce((s, w) => s + w.days, 0);
      const cur = byGoal.get(i.goalId);
      const days = i.days - prev;
      byGoal.set(i.goalId, cur ? { ...cur, days: cur.days + days } : { ...i, days, activityId: "sync" });
    }
    out.impacts = [...byGoal.values()].filter(i => Math.abs(i.days) >= 0.01).map(i => ({ ...i, days: Math.round(i.days * 100) / 100 }));
    out.netDays = Math.round(out.impacts.reduce((s, i) => s + i.days, 0) * 100) / 100;
    out.unlocked = newlyUnlocked(goals, before, after, now);
  }
  return out;
}
