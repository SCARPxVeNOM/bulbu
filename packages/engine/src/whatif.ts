// What-if simulator: a recurring change in behaviour becomes a new pace, and the new pace becomes a new goal date.

import type { Activity, Category, Goal, Step } from "./types.ts";
import { forecast, impactOf } from "./forecast.ts";
import { addDays, fmtMinutes, fmtMoney, fmtNum, plural } from "./util.ts";
import { def } from "./templates.ts";
import { startOfDay } from "./forecast.ts";

export interface Change {
  /** "Cook dinner 3 nights a week" */
  label: string;
  /** how often per week the action happens */
  perWeek: number;
  /** the action itself; a negative-time change (less scrolling) is expressed as a social_media activity with reduce=true */
  category: Category;
  minutes?: number;
  units?: number;
  amount?: number;
  alternativeCost?: number;
  /** true when the change removes this activity instead of adding it */
  reduce?: boolean;
  /** which number the what-if dial turns (default: picked from the change) */
  knob?: KnobField;
}

export interface WhatIf {
  goalId: string;
  goalTitle: string;
  change: Change;
  before: { eta: string | null; daysLeft: number; perDay: number };
  after: { eta: string | null; daysLeft: number; perDay: number };
  daysSooner: number;
  steps: Step[];
}

export function simulate(goal: Goal, goals: Goal[], history: Activity[], now: Date, change: Change): WhatIf | null {
  const f = forecast(goal, goals, history, now);
  const probe: Activity = { id: "whatif", at: now.toISOString(), category: change.category, label: change.label, minutes: change.minutes,
                            units: change.units, amount: change.amount, alternativeCost: change.alternativeCost, source: "text" };
  const imp = impactOf(goal, goals, probe, f.pace);
  if (!imp) return null;
  // units gained per occurrence: productive actions add units; removing a cost recovers the units it was costing
  const gain = change.reduce ? -imp.units : imp.units;
  if (gain <= 0) return null;
  const extraPerDay = (gain * change.perWeek) / 7;
  const perDay = f.pace.perDay + extraPerDay;
  // today's moves still count (the forecast includes what today already cost), so before and after compare like for like
  const todayCost = f.remaining > 0 ? f.daysLeft - f.remaining / f.pace.perDay : 0;
  const daysLeft = f.remaining / perDay + todayCost;
  const eta = addDays(startOfDay(now), Math.ceil(daysLeft)).toISOString().slice(0, 10);
  const d = def(goal.template);
  const money = goal.kind === "savings";
  const u = (n: number) => money ? fmtMoney(n) : `${fmtNum(n)} ${plural(d.unit, n)}`;
  const steps: Step[] = [
    { label: "Each time", value: `${u(gain)} ${change.reduce ? "recovered" : "gained"}` },
    { label: "Per week", value: `${u(gain)} × ${fmtNum(change.perWeek)} = ${u(gain * change.perWeek)}` },
    { label: "Your pace", value: `${u(f.pace.perDay)} → ${u(perDay)} a day` },
    { label: "Remaining", value: u(f.remaining) },
    { label: "New time to goal", value: `${u(f.remaining)} ÷ ${u(perDay)} = ${Math.ceil(daysLeft)} days (was ${Math.ceil(f.daysLeft)})` },
  ];
  return {
    goalId: goal.id, goalTitle: goal.title, change,
    before: { eta: f.eta, daysLeft: f.daysLeft, perDay: f.pace.perDay },
    after: { eta, daysLeft, perDay },
    daysSooner: Math.ceil(f.daysLeft) - Math.ceil(daysLeft), steps,
  };
}

/** Average delivery spend in the history, for "cook instead of ordering" plans. */
export function typicalOrder(history: Activity[], fallback = 400) {
  const orders = history.filter(a => a.category === "eat" && (a.amount ?? 0) > 0);
  return orders.length ? orders.reduce((s, a) => s + a.amount!, 0) / orders.length : fallback;
}

// ------------------------------------------------------------------ the kingdom what-if: every building, with a dial

export type KnobField = "perWeek" | "minutes" | "units" | "amount";
/** The number the what-if dial turns, the values it stops at, and where it starts. */
export interface Knob { field: KnobField; values: number[]; index: number; unit: string }

export interface BuildingWhatIf {
  goalId: string; goalTitle: string;
  etaBefore: string | null; eta: string | null; daysSooner: number; steps: Step[];
}
export interface WhatIfStop { value: number; label: string; change: Change; goals: BuildingWhatIf[] }
export interface KingdomWhatIf { knob: Knob; stops: WhatIfStop[] }

const STOPS: Record<KnobField, number[]> = {
  perWeek: [1, 2, 3, 4, 5, 6, 7], minutes: [15, 30, 45, 60, 90, 120], units: [1, 2, 3, 4, 5], amount: [50, 100, 200, 300, 500, 1000],
};

export function knobFor(c: Change): Knob {
  const field: KnobField = c.knob ?? (c.perWeek < 7 ? "perWeek" : c.reduce && c.minutes ? "minutes" : c.units && c.units >= 1 ? "units" : c.amount ? "amount" : "perWeek");
  const cur = field === "perWeek" ? c.perWeek : c[field] ?? 1;
  let values = STOPS[field];
  if (field === "units" && cur >= 5) values = [5, 10, 15, 20, 30, 40];          // pages, not problems
  if (!values.includes(cur)) values = [...values, cur].sort((a, b) => a - b);
  const unit = field === "perWeek" ? "a week" : field === "minutes" ? "minutes a day" : field === "amount" ? "₹" : "each time";
  return { field, values, index: values.indexOf(cur), unit };
}

/** The same change with the dial turned to `v`: the number in the label follows, and time scales with the amount done. */
export function turn(c: Change, field: KnobField, v: number): Change {
  const cur = field === "perWeek" ? c.perWeek : c[field] ?? 1;
  const out: Change = { ...c, [field]: v };
  if (field === "units" && c.minutes && cur) out.minutes = Math.round((c.minutes / cur) * v);
  const show = (n: number) => field === "minutes" ? fmtMinutes(n) : field === "amount" ? fmtMoney(n) : String(n);
  // the dial's number in the label: for how often, the one before "nights", "times", "days" or "×"
  let label = field === "perWeek"
    ? c.label.replace(new RegExp(`\\b${cur}(?=\\s*(?:nights?|times?|days?|×))`), String(v))
    : c.label.replace(show(cur), show(v));
  if (label === c.label && field === "amount") label = label.replace(String(cur), String(v));
  // "1 nights" → "1 night"
  out.label = label.replace(/\b1 (night|problem|time|page|day|lecture|session)s\b/g, "1 $1");
  return out;
}

/** A what-if across the whole kingdom: for each stop on the dial, every goal it moves and its new finish date. */
export function kingdomWhatIf(goals: Goal[], history: Activity[], now: Date, change: Change): KingdomWhatIf | null {
  const knob = knobFor(change);
  const stops = knob.values.map(v => {
    const c = turn(change, knob.field, v);
    const moved = goals.map(g => simulate(g, goals, history, now, c)).filter((w): w is WhatIf => !!w && !forecast(goals.find(g => g.id === w.goalId)!, goals, history, now).done)
      .map(w => ({ goalId: w.goalId, goalTitle: w.goalTitle, etaBefore: w.before.eta, eta: w.after.eta, daysSooner: w.daysSooner, steps: w.steps }));
    return { value: v, label: c.label, change: c, goals: moved };
  });
  return stops[knob.index].goals.length ? { knob, stops } : null;
}

/** Average scrolling a night after `hour` (until 5 AM), over the last four weeks: what "sleep by 12" would save. A
 *  session counts from when it started for as long as it ran, so the part of an 11 PM scroll that runs past midnight
 *  counts for "sleep by 12". */
export function lateScroll(history: Activity[], hour: number, now: Date): number {
  const from = addDays(startOfDay(now), -28), H = 3600_000;
  let total = 0;
  for (const a of history) {
    if (a.category !== "social_media" || !a.minutes) continue;
    const s = +new Date(a.at), e = s + a.minutes * 60_000;
    if (s < +from || s > +now) continue;
    // the night that started the evening before, and the one that starts this evening
    for (const k of [-1, 0]) {
      const noon = +startOfDay(addDays(new Date(s), k)) + 12 * H;
      const ws = noon + ((hour - 12 + 24) % 24) * H, we = noon + 17 * H;     // bedtime → 5 AM
      total += Math.max(0, Math.min(e, we) - Math.max(s, ws)) / 60_000;
    }
  }
  return total / 28;
}
