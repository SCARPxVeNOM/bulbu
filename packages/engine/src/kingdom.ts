// Bulbu's Kingdom: every goal is a building, and the forecast is its construction.
//   the main goal      the Castle (its real-life object floats on top as the Goal Treasure)
//   coding / DSA       the Library Tower       fitness   the Arena        savings   the Vault
//   reading/learning   the Observatory         anything else              the Workshop
// A building's level follows the goal's progress, it's under construction until the goal is reached, and its
// construction ETA is the forecast's date. Distraction doesn't take anything away: it rolls the Dim (fog) over the
// buildings it slowed down. Good moves make them glow.
import type { Activity, Goal, GoalTemplate, Pace, Step, Swap } from "./types.ts";
import { fmtDays, forecast, impactsOf, startOfDay, swapFor } from "./forecast.ts";
import { addDays, dayKey, fmtMoney, fmtNum, plural } from "./util.ts";
import { def } from "./templates.ts";

export type BuildingId = "Castle" | "Library" | "Vault" | "Arena" | "Observatory" | "Workshop";

export const BUILDINGS: Record<BuildingId, { name: string; blurb: string }> = {
  Castle: { name: "Castle", blurb: "Your main goal. Its treasure floats on top." },
  Library: { name: "Library Tower", blurb: "Grows a floor as your coding goal moves." },
  Vault: { name: "Vault", blurb: "Fills up as your savings goal moves." },
  Arena: { name: "Arena", blurb: "Raises a banner as your fitness goal moves." },
  Observatory: { name: "Observatory", blurb: "Grows as your reading and learning goal moves." },
  Workshop: { name: "Workshop", blurb: "Grows with any other goal." },
};

export const KINGDOM_BUILDINGS = Object.keys(BUILDINGS) as BuildingId[];

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
      // good moves push the Dim back as well as lighting the building up: clearing it is quick
      glow: clamp(0.35 + m.sooner * 0.25 - m.later * 0.08), fog: clamp((m.later - m.sooner) / 3),
    };
  });
  const plots = (Object.keys(BUILDINGS) as BuildingId[]).filter(id => !taken.has(id));
  return { buildings, plots, mainGoalId: main?.id ?? null };
}

// ------------------------------------------------------------------ one building, in detail

export interface BuildingMove {
  activityId: string;
  label: string;
  at: string;
  /** signed: positive = construction finishes later, negative = sooner */
  days: number;
  equivalent: string;
  breakdown: Step[];
}

export interface BuildingReport extends BuildingState {
  /** the goal's template (what kind of goal the building holds) */
  template: GoalTemplate;
  unit: string;
  money: boolean;
  progress: number;
  target: number;
  remaining: number;
  pace: Pace;
  /** how today's moves shifted the finish (signed days, + later) */
  todayShift: number;
  /** when it would finish without today's moves */
  etaBefore: string | null;
  /** today's moves on this building, biggest first */
  moves: BuildingMove[];
  /** the construction maths, step by step (tap to see why) */
  steps: Step[];
  /** the progress (%) where the next floor goes up; null on the top floor */
  nextFloorAt: number | null;
  /** one small move that would bring the finish closer (the card for this building) */
  swap: Swap;
}

/** Everything the building panel shows. Null when no building holds that goal. */
export function buildingReport(id: BuildingId, goals: Goal[], history: Activity[], now: Date): BuildingReport | null {
  const b = kingdom(goals, history, now).buildings.find(x => x.id === id);
  const goal = b && goals.find(g => g.id === b.goalId);
  if (!b || !goal) return null;
  const f = forecast(goal, goals, history, now), d = def(goal.template), money = goal.kind === "savings";
  const u = (n: number) => money ? fmtMoney(n) : `${fmtNum(n)} ${plural(d.unit, n)}`;
  const of = (a: number, b: number) => money ? `${fmtMoney(a)} of ${fmtMoney(b)}` : `${fmtNum(a)} of ${u(b)}`;
  const today = dayKey(now);
  const moves: BuildingMove[] = history.filter(a => dayKey(a.at) === today && +new Date(a.at) <= +now)
    .flatMap(a => impactsOf(goals, history, a, now).filter(i => i.goalId === goal.id)
      .map(i => ({ activityId: a.id, label: a.label, at: a.at, days: i.days, equivalent: i.equivalent, breakdown: i.breakdown })))
    .sort((x, y) => Math.abs(y.days) - Math.abs(x.days));
  const todayShift = moves.reduce((s, m) => s + m.days, 0), slowed = moves.reduce((s, m) => s + Math.max(0, m.days), 0);
  const etaBefore = f.done ? f.eta : dayKey(addDays(startOfDay(now), Math.ceil(Math.max(0, f.daysLeft - todayShift))).toISOString());
  const src = f.pace.basedOnDays >= 7 ? `your last ${f.pace.basedOnDays} days` : f.pace.basedOnDays > 0 ? `${f.pace.basedOnDays} days of yours + a starting estimate` : "a starting estimate";
  const steps: Step[] = f.done
    ? [{ label: "Built", value: `${of(f.progress, goal.target)}` }, { label: "Finished", value: "Nothing left to build" }]
    : [
        { label: "Built so far", value: `${of(f.progress, goal.target)} (${Math.floor(f.percent)}%)` },
        { label: "Left to build", value: u(f.remaining) },
        { label: "Your pace", value: `${u(f.pace.perDay)} a day (${src})` },
        { label: "Time to finish", value: `${u(f.remaining)} ÷ ${u(f.pace.perDay)} a day = ${fmtNum(f.remaining / f.pace.perDay)} days` },
        // today's progress is already in "built so far"; time lost today (the Dim) is added on top
        ...(slowed >= 0.05 ? [{ label: "Slowed today", value: fmtDays(slowed) }] : []),
        { label: "Finishes", value: `today + ${Math.ceil(f.daysLeft)} days = ${f.eta ? niceDate(f.eta) : "—"}` },
      ];
  const nextFloorAt = b.level >= MAX_FLOORS ? null : b.level * (100 / MAX_FLOORS);
  return {
    ...b, template: goal.template, unit: d.unit, money, progress: f.progress, target: goal.target, remaining: f.remaining, pace: f.pace,
    todayShift, etaBefore, moves, steps, nextFloorAt, swap: swapFor(goal, f.pace),
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2027-01-17" -> "17 Jan 2027" */
export const niceDate = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

// ------------------------------------------------------------------ the event moment

/** What one new move did to a building: the Dim rolled in (later) or it lit up (sooner). The app plays it on the
 *  kingdom: the fog rolls in or clears, the ETA label slips or pulls back, and Bulbu reacts. */
export interface KingdomMoment {
  id: BuildingId;
  name: string;
  goalId: string;
  goalTitle: string;
  kind: "dim" | "light";
  /** signed: + later, − sooner */
  days: number;
  eta: string | null;
  etaBefore: string | null;
  fogBefore: number;
  fogAfter: number;
  glowBefore: number;
  glowAfter: number;
  levelBefore: number;
  level: number;
  /** the moves that did it ("2h on Instagram") */
  moves: string[];
  /** the maths, step by step (tap to see why) */
  breakdown: Step[];
  /** plain words: "about 3 DSA problems you could have solved" */
  equivalent: string;
}

/** The buildings a set of new activities moved, biggest shift first. `history` excludes them; `added` are the new ones. */
export function kingdomMoments(goals: Goal[], history: Activity[], added: Activity[], now: Date): KingdomMoment[] {
  const after = [...history, ...added];
  const k0 = kingdom(goals, history, now), k1 = kingdom(goals, after, now);
  const out: KingdomMoment[] = [];
  for (const b of k1.buildings) {
    const was = k0.buildings.find(x => x.id === b.id && x.goalId === b.goalId);
    const hits = added.flatMap(a => impactsOf(goals, after, a, now).filter(i => i.goalId === b.goalId).map(i => ({ a, i })));
    const days = hits.reduce((s, h) => s + h.i.days, 0);
    if (Math.abs(days) < 0.05 && (!was || was.level === b.level)) continue;
    const top = [...hits].sort((x, y) => Math.abs(y.i.days) - Math.abs(x.i.days))[0];
    out.push({
      id: b.id, name: b.name, goalId: b.goalId, goalTitle: b.goalTitle, kind: days > 0 ? "dim" : "light", days,
      eta: b.eta, etaBefore: was?.eta ?? null, fogBefore: was?.fog ?? 0, fogAfter: b.fog, glowBefore: was?.glow ?? 0, glowAfter: b.glow,
      levelBefore: was?.level ?? 0, level: b.level, moves: hits.map(h => h.a.label),
      breakdown: top?.i.breakdown ?? [], equivalent: top?.i.equivalent ?? "",
    });
  }
  return out.sort((x, y) => Math.abs(y.days) - Math.abs(x.days));
}
