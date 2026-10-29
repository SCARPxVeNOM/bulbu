// Clans: study groups that build together. Clanmates see each other's buildings (levels and finish dates, never
// anyone's scrolling), send each other Light, and fight weekly clan wars, clan against clan (college vs college).
// A war week runs Monday to Sunday. A member's points come only from good moves: days pulled sooner, Dim raids held
// off, cards played. Nothing is ever taken away for a bad day, and only the clan's total counts, so a war is about
// helping each other, not ranking people.
import type { Activity, Goal } from "./types.ts";
import { impactsOf, startOfDay } from "./forecast.ts";
import { addDays, dayKey } from "./util.ts";
import type { WorldSave } from "./world.ts";

export interface WeekPlay {
  /** days pulled sooner across all buildings this war week (good moves only) */
  daysSooner: number;
  raidsHeld: number;
  cardsPlayed: number;
  points: number;
}

export const WAR_POINTS = { perDaySooner: 10, perRaid: 15, perCard: 5 };
/** Light each member collects when the war is over: more for the winners, something for everyone who played */
export const WAR_LOOT = { win: 150, draw: 100, played: 50 };
/** Light donations: the most in one go, and in a day */
export const DONATE = { max: 100, perDay: 300 };

/** The Monday a war week starts on (local time). */
export function weekStart(now: Date): Date {
  const d = startOfDay(now), back = (d.getDay() + 6) % 7;
  return addDays(d, -back);
}
export const warId = (now: Date) => dayKey(weekStart(now));
export const warEnds = (id: string) => addDays(new Date(id + "T00:00:00"), 7);

/** One member's play in the war week that contains `now` (up to `now`). */
export function weekPlay(goals: Goal[], history: Activity[], save: WorldSave, now: Date, week = weekStart(now)): WeekPlay {
  const from = +week, to = Math.min(+now, +addDays(week, 7));
  const acts = history.filter(a => +new Date(a.at) >= from && +new Date(a.at) < to);
  let daysSooner = 0;
  for (const a of acts) for (const i of impactsOf(goals, history, a, now)) if (i.days < 0) daysSooner -= i.days;
  const raidsHeld = Object.values(save.raids ?? {}).filter(r => +new Date(r.at) >= from && +new Date(r.at) < to).length;
  const cardsPlayed = acts.filter(a => a.source === "card").length;
  daysSooner = Math.round(daysSooner * 10) / 10;
  const points = Math.round(daysSooner * WAR_POINTS.perDaySooner + raidsHeld * WAR_POINTS.perRaid + cardsPlayed * WAR_POINTS.perCard);
  return { daysSooner, raidsHeld, cardsPlayed, points };
}

export type WarResult = "won" | "lost" | "draw";
export const warResult = (us: number, them: number): WarResult => us > them ? "won" : us < them ? "lost" : "draw";
export const warLoot = (r: WarResult) => r === "won" ? WAR_LOOT.win : r === "draw" ? WAR_LOOT.draw : WAR_LOOT.played;

/** Who fights whom this week: clans in a fixed order, the pairing rotating weekly so rivals change. An odd one out
 *  sits the week out. */
export function pairClans(ids: string[], id: string): Map<string, string> {
  const list = [...ids].sort(), n = list.length, out = new Map<string, string>();
  if (n < 2) return out;
  const week = Math.round(+new Date(id + "T00:00:00") / (7 * 86_400_000));
  // rotate everyone but the first (a round-robin), then pair neighbours
  const rest = list.slice(1), k = week % Math.max(1, rest.length);
  const order = [list[0], ...rest.slice(k), ...rest.slice(0, k)];
  for (let i = 0; i + 1 < order.length; i += 2) { out.set(order[i], order[i + 1]); out.set(order[i + 1], order[i]); }
  return out;
}

/** Collect a finished war's Light (once per war). */
export function claimWar(save: WorldSave, id: string, result: WarResult): { save: WorldSave; light: number } | { error: string } {
  if (save.wars?.[id]) return { error: "You've already collected this war's Light." };
  const light = warLoot(result);
  return { light, save: { ...save, gift: save.gift + light, wars: { ...(save.wars ?? {}), [id]: { light, result } } } };
}

/** Send Light to a clanmate: it leaves your Light (like spending) and lands as a gift on theirs. */
export function donate(from: WorldSave, to: WorldSave, light: number, fromLight: number, sentToday: number): { from: WorldSave; to: WorldSave } | { error: string } {
  const n = Math.round(light);
  if (!(n > 0)) return { error: "Send at least 1 Light." };
  if (n > DONATE.max) return { error: `You can send up to ${DONATE.max} Light at a time.` };
  if (sentToday + n > DONATE.perDay) return { error: `That's the most you can send today (${DONATE.perDay} Light). More tomorrow!` };
  if (n > fromLight) return { error: `You have ${fromLight} Light to give.` };
  return { from: { ...from, spent: from.spent + n }, to: { ...to, gift: to.gift + n } };
}
