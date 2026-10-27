// What-if simulator: a recurring change in behaviour becomes a new pace, and the new pace becomes a new goal date.

import type { Activity, Category, Goal, Step } from "./types.ts";
import { forecast, impactOf } from "./forecast.ts";
import { addDays, fmtMoney, fmtNum, plural } from "./util.ts";
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
  const daysLeft = f.remaining / perDay;
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
