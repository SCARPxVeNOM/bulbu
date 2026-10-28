// Bulbu's Kingdom: every goal is a building, and the forecast is its construction.
//   the main goal      the Castle (its real-life object floats on top as the Goal Treasure)
//   coding / DSA       the Library Tower       fitness   the Arena        savings   the Vault
//   reading/learning   the Observatory         anything else              the Workshop
// A building's level follows the goal's progress, it's under construction until the goal is reached, and its
// construction ETA is the forecast's date. Distraction doesn't take anything away: it rolls the Dim (fog) over the
// buildings it slowed down. Good moves make them glow.
import type { Activity, Goal, GoalTemplate } from "./types.ts";
import { forecast, impactsOf } from "./forecast.ts";

export type BuildingId = "Castle" | "Library" | "Vault" | "Arena" | "Observatory" | "Workshop";

export const BUILDINGS: Record<BuildingId, { name: string; blurb: string }> = {
  Castle: { name: "Castle", blurb: "Your main goal. Its treasure floats on top." },
  Library: { name: "Library Tower", blurb: "Grows a floor as your coding goal moves." },
  Vault: { name: "Vault", blurb: "Fills up as your savings goal moves." },
  Arena: { name: "Arena", blurb: "Raises a banner as your fitness goal moves." },
  Observatory: { name: "Observatory", blurb: "Grows as your reading and learning goal moves." },
  Workshop: { name: "Workshop", blurb: "Grows with any other goal." },
};

const BUILDING_OF: Record<GoalTemplate, BuildingId> = {
  dsa: "Library", productivity: "Library", fitness: "Arena", savings: "Vault", iphone: "Vault",
  learning: "Observatory", reading: "Observatory", custom: "Workshop",
};

export const MAX_FLOORS = 5;

export interface BuildingState {
  id: BuildingId;
  name: string;
  goalId: string;
  goalTitle: string;
  /** 1..5: floors built */
  level: number;
  /** still being built (the goal isn't reached yet) */
  building: boolean;
  /** construction ETA: the forecast's date (yyyy-mm-dd), null with no forward pace */
  eta: string | null;
  daysLeft: number;
  percent: number;
  /** 0..1: how brightly it glows (good moves in the last few days) */
  glow: number;
  /** 0..1: how much of the Dim hangs over it (distraction that slowed it down lately) */
  fog: number;
}

export interface KingdomState {
  buildings: BuildingState[];
  /** buildings with no goal yet: empty plots the user can build on */
  plots: BuildingId[];
  /** the main goal (the Castle's) */
  mainGoalId: string | null;
}

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export function kingdom(goals: Goal[], history: Activity[], now: Date): KingdomState {
  const main = goals.find(g => g.primary) ?? goals[0] ?? null;
  const taken = new Map<BuildingId, Goal>();
  if (main) taken.set("Castle", main);
  for (const g of goals) {
    if (g === main) continue;
    const want = BUILDING_OF[g.template] ?? "Workshop";
    const slot = !taken.has(want) ? want : !taken.has("Workshop") ? "Workshop" : null;
    if (slot) taken.set(slot, g);
  }
  // what moved each goal lately: the last two days decide the fog and the glow
  const since = +now - 2 * 86_400_000;
  const recent = history.filter(a => +new Date(a.at) >= since && +new Date(a.at) <= +now);
  const moved = new Map<string, { later: number; sooner: number }>();
  for (const a of recent) for (const i of impactsOf(goals, history, a, now)) {
    const m = moved.get(i.goalId) ?? { later: 0, sooner: 0 };
    if (i.days > 0) m.later += i.days; else m.sooner -= i.days;
    moved.set(i.goalId, m);
  }
  const buildings = [...taken.entries()].map(([id, g]): BuildingState => {
    const f = forecast(g, goals, history, now), m = moved.get(g.id) ?? { later: 0, sooner: 0 };
    const level = f.done ? MAX_FLOORS : 1 + Math.min(MAX_FLOORS - 1, Math.floor((f.percent / 100) * MAX_FLOORS));
    return {
      id, name: BUILDINGS[id].name, goalId: g.id, goalTitle: g.title, level, building: !f.done,
      eta: f.eta, daysLeft: f.daysLeft, percent: f.percent,
      glow: clamp(0.35 + m.sooner * 0.25 - m.later * 0.08), fog: clamp(m.later / 3),
    };
  });
  const plots = (Object.keys(BUILDINGS) as BuildingId[]).filter(id => !taken.has(id));
  return { buildings, plots, mainGoalId: main?.id ?? null };
}
