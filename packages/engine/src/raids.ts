// Dim raids: predicted drift. The engine finds the hour your scrolling usually starts (last four weeks) and expects
// the Dim to strike then, at the building that scrolling slows down. You defend with a 25-minute focus session any
// time before the raid's hour is over. A defended raid drops loot: Light, and now and then a piece of something to
// wear (three Cape pieces make the Hero Cape). A raid that gets through costs nothing extra: only what the scrolling
// itself does. Swaps, never guilt.
import type { Activity, Goal } from "./types.ts";
import { costGoal, impactsOf, startOfDay } from "./forecast.ts";
import { kingdom, type BuildingId } from "./kingdom.ts";
import { ITEMS, RAID_PIECES } from "./inventory.ts";
import type { WorldSave } from "./world.ts";
import { addDays, dayKey, fmtMinutes } from "./util.ts";

export interface Raid {
  /** the day it's for (yyyy-mm-dd, local) */
  id: string;
  /** when it strikes (ISO): the start of the risky hour */
  at: string;
  /** when it's over (ISO): two hours later */
  until: string;
  /** "11 PM" */
  label: string;
  building: BuildingId;
  buildingName: string;
  goalId: string;
  goalTitle: string;
  /** typical scrolling in that window, on nights it happens */
  minutes: number;
  /** how much later construction would finish if it lands (the engine's number for that much scrolling) */
  days: number;
  /** why the engine expects it */
  why: string;
}

export type RaidState = "coming" | "striking" | "defended" | "passed";

export interface Loot {
  light: number;
  /** a piece of something to wear, when this raid drops one */
  piece?: { item: string; name: string; have: number; of: number; complete: boolean };
}

/** What a defended raid gives, in order: three Hero Cape pieces, then five for the Golden Crown. */
export const PIECES: { item: string; of: number }[] = Object.entries(RAID_PIECES).map(([item, of]) => ({ item, of }));
export const DEFEND_MINUTES = 25;
/** a session at least this long holds a raid off (a little slack for an early stop) */
export const HOLD_MINUTES = 20;

const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString("en-IN", { hour: "numeric", hour12: true }).replace(/\s?([ap])m/i, (_, x) => ` ${x.toUpperCase()}M`);

/** The next raid: today's, or tomorrow's once today's is over. Null until there's a pattern to predict from. */
export function predictRaid(goals: Goal[], history: Activity[], now: Date): Raid | null {
  const from = addDays(startOfDay(now), -28);
  const scroll = history.filter(a => a.category === "social_media" && (a.minutes ?? 0) > 0 && new Date(a.at) >= from && new Date(a.at) <= now);
  if (!scroll.length) return null;
  // minutes and nights per starting hour, over a two-hour window
  const mins = new Array(24).fill(0), nights: Set<string>[] = Array.from({ length: 24 }, () => new Set());
  for (const a of scroll) { const t = new Date(a.at), h = t.getHours(); mins[h] += a.minutes!; nights[h].add(dayKey(t)); }
  let best = -1, bestMin = 0;
  // on a tie, the window that starts with the scrolling (the raid comes when it begins)
  for (let h = 0; h < 24; h++) { const m = mins[h] + mins[(h + 1) % 24]; if (m > bestMin || (m === bestMin && best >= 0 && mins[h] > mins[best])) { bestMin = m; best = h; } }
  const n = new Set([...nights[best], ...nights[(best + 1) % 24]]).size;
  if (best < 0 || n < 3 || bestMin < 60) return null;
  const typical = Math.round(bestMin / n);
  // the goal scrolling slows down, and its building
  const probe: Activity = { id: "raid", at: now.toISOString(), category: "social_media", minutes: typical, label: "Scrolling", app: "Instagram", source: "text" };
  const target = costGoal(goals, probe);
  if (!target) return null;
  const b = kingdom(goals, history, now).buildings.find(x => x.goalId === target.id);
  if (!b || !b.building) return null;
  const days = Math.max(0, impactsOf(goals, history, probe, now).find(i => i.goalId === target.id)?.days ?? 0);
  // the first raid whose window isn't over yet: last night's (an 11 PM raid runs past midnight), today's, or tomorrow's
  const base = new Date(startOfDay(now)); base.setHours(best, 0, 0, 0);
  const at = [-1, 0, 1].map(k => addDays(base, k)).find(t => +t + 2 * 3600_000 > +now)!;
  const total = scroll.reduce((s, a) => s + a.minutes!, 0);
  return {
    id: dayKey(at), at: at.toISOString(), until: new Date(+at + 2 * 3600_000).toISOString(), label: hourLabel(best),
    building: b.id, buildingName: b.name, goalId: target.id, goalTitle: target.title, minutes: typical, days,
    why: `Most of your scrolling starts around ${hourLabel(best)}: about ${fmtMinutes(typical)} on ${n} nights in the last four weeks (${Math.round((bestMin / total) * 100)}% of it).`,
  };
}

export function raidState(r: Raid, save: WorldSave, now: Date): RaidState {
  if (save.raids?.[r.id]) return "defended";
  if (+now >= +new Date(r.until)) return "passed";
  return +now >= +new Date(r.at) ? "striking" : "coming";
}

/** The loot this raid would drop if defended now. */
export function lootFor(r: Raid, save: WorldSave): Loot {
  const light = 100 + Math.round(Math.min(120, r.minutes));
  const owned = save.owned ?? {}, pieces = save.pieces ?? {};
  const next = PIECES.find(p => !owned[p.item]);
  if (!next) return { light: light + 50 };
  const have = (pieces[next.item] ?? 0) + 1, name = ITEMS.find(i => i.id === next.item)?.name ?? next.item;
  return { light, piece: { item: next.item, name, have, of: next.of, complete: have >= next.of } };
}

/** Defend a raid: a focus session long enough, before the raid's over. Returns the new save and the loot, or why not. */
export function defend(r: Raid, save: WorldSave, minutes: number, now: Date): { save: WorldSave; loot: Loot } | { error: string } {
  const st = raidState(r, save, now);
  if (st === "defended") return { error: "You've already held this raid off." };
  if (st === "passed") return { error: "That raid's over. The next one comes tomorrow." };
  if (minutes < HOLD_MINUTES) return { error: `${HOLD_MINUTES} minutes of focus holds a raid off. You can go again any time before it's over.` };
  const loot = lootFor(r, save);
  const pieces = { ...(save.pieces ?? {}) }, owned = { ...(save.owned ?? {}) };
  if (loot.piece) {
    pieces[loot.piece.item] = loot.piece.have;
    if (loot.piece.complete) owned[loot.piece.item] = Math.max(1, owned[loot.piece.item] ?? 0);
  }
  return { loot, save: { ...save, gift: save.gift + loot.light, pieces, owned, raids: { ...(save.raids ?? {}), [r.id]: { at: now.toISOString(), light: loot.light } } } };
}
