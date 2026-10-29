// Bulbu World: the game layer. Real habits make Light (to spend) and XP (which never goes down and raises your
// level). Streaks, levels, Light and real-life purchases unlock things for Bulbu in the inventory (inventory.ts).
// Everything is computed from the ledger plus a small save (what was spent, what was bought).
import type { Activity, Goal } from "./types.ts";
import { streak } from "./insights.ts";
import { longestRun } from "./outfits.ts";
import { dayKey } from "./util.ts";

/** A real-life purchase the user added (Bulbu gets one too). */
/** Something the user bought in real life. From a photo, it also keeps what Muse Spark saw, SAM's cut-out of it and the
 *  picture Muse Image drew of Bulbu with it (files are names under the server's /media). */
export interface RealItem {
  id: string; item: string; at: string; price?: number; note?: string;
  /** what it is, e.g. "iPad (10th gen) in blue" */
  name?: string; color?: string; engraving?: string;
  photo?: { file: string; width: number; height: number };
  cutout?: { mask: string; box: { left: number; top: number; right: number; bottom: number } };
  cutState?: "cutting" | "failed";
  art?: string; artState?: "drawing" | "failed";
}

/** The part of the world that is saved per user (the rest is computed from the ledger). */
export interface WorldSave {
  /** Light spent in the shop and on upgrades */
  spent: number;
  /** Light given as gifts (the tour's starter Light) */
  gift: number;
  /** tour step; -1 once Bulbu's tour is done */
  tutorial: number;
  /** item id -> its level (bought shop items, and upgrades of anything owned) */
  owned?: Record<string, number>;
  /** things bought in real life */
  real?: RealItem[];
  /** Dim raids held off, by raid id (the day), with the Light they dropped */
  raids?: Record<string, { at: string; light: number }>;
  /** loot pieces collected toward an item (three Cape pieces make the Hero Cape) */
  pieces?: Record<string, number>;
  /** clan wars whose Light was collected, by war id (the Monday it started) */
  wars?: Record<string, { light: number; result: "won" | "lost" | "draw" }>;
  /** this season's pass and the tiers collected (free and pass track) */
  season?: { id: string; pass: boolean; free: number[]; paid: number[] };
}
export const NEW_WORLD: WorldSave = { spent: 0, gift: 0, tutorial: 0, owned: {}, real: [] };

export interface WorldState {
  level: number;
  xp: number;
  /** XP into the current level and the size of the level */
  into: number;
  span: number;
  /** Light you can spend */
  light: number;
  earnedToday: number;
  /** current streak and best streak (days) */
  streak: number;
  bestStreak: number;
  /** 0..1: how much of today went to scrolling rather than good habits */
  fog: number;
  tutorial: number;
}

const FOCUS_LIKE = new Set(["study", "code", "read", "workout", "focus"]);

/** Light (and XP) from one activity. Time spent well is 1 Light a minute; distractions make none. */
export function lightOf(a: Activity): number {
  if (FOCUS_LIKE.has(a.category)) {
    const mins = a.minutes ?? (a.category === "workout" ? 30 : a.category === "read" ? (a.units ?? 0) * 2 : a.category === "code" ? (a.units ?? 0) * 20 : 0);
    const bonus = a.category === "code" ? (a.units ?? 0) * 10 : a.category === "read" ? (a.units ?? 0) : 0;
    return Math.round(Math.min(600, mins) + bonus);
  }
  if (a.category === "save") return Math.round(Math.min(300, (a.amount ?? 0) / 10));
  if (a.category === "sleep") return a.minutes && a.minutes >= 420 && a.minutes <= 570 ? 40 : 10;
  return 0;
}

/** XP needed to reach a level: 100, 300, 600, 1000, 1500 … (50·n·(n+1)) */
export const xpForLevel = (n: number) => 50 * n * (n + 1);
export function levelFromXp(xp: number) {
  let n = 0;
  while (xp >= xpForLevel(n + 1)) n++;
  return { level: n, into: xp - xpForLevel(n), span: xpForLevel(n + 1) - xpForLevel(n) };
}

export function worldState(goals: Goal[], history: Activity[], save: WorldSave, now: Date): WorldState {
  const earned = history.reduce((s, a) => s + lightOf(a), 0);
  const today = dayKey(now);
  const todays = history.filter(a => dayKey(a.at) === today);
  const earnedToday = todays.reduce((s, a) => s + lightOf(a), 0);
  const social = todays.filter(a => a.category === "social_media").reduce((s, a) => s + (a.minutes ?? 0), 0);
  const good = todays.filter(a => FOCUS_LIKE.has(a.category)).reduce((s, a) => s + (a.minutes ?? 30), 0);
  const xp = earned + save.gift;
  const lv = levelFromXp(xp);
  const cur = streak(history, now);
  return {
    level: lv.level, xp, into: lv.into, span: lv.span,
    light: Math.max(0, Math.round(earned + save.gift - save.spent)), earnedToday,
    streak: cur, bestStreak: Math.max(cur, longestRun(history)),
    fog: Math.max(0, Math.min(1, (social - good * 0.5) / 120)),
    tutorial: save.tutorial,
  };
}
