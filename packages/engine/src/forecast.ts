// The forecasting engine. Deterministic: language models call it and explain its result, never the other way round.
//
// Model:
//   pace.perDay  = goal units progressed per day, averaged over the history before today (stable during the day)
//   ETA          = today + remaining / perDay + today's cost days
//   productive   = units done              -> days sooner = units / perDay
//   distraction  = minutes x perHour       -> units missed -> days later = units missed / perDay
//   spend        = amount - alternative    -> money not saved -> days later = money / perDay
// Tomorrow, today's distractions are absorbed into the measured pace, so they are never counted twice.

import type { Activity, Forecast, Goal, Impact, Pace, Step, Swap } from "./types.ts";
import { def } from "./templates.ts";
import { addDays, dayKey, daysBetween, fmtNum, fmtMinutes, fmtMoney, plural } from "./util.ts";

const PACE_WINDOW = 14;      // days of history behind perDay
const RATE_WINDOW = 28;      // days of history behind perHour
const MIN_RATE_SHARE = 0.25; // never let perDay fall below a quarter of the template pace (no division by ~0)

// ------------------------------------------------------------------ routing

/** Goals this activity moves forward. */
export function drivenGoals(goals: Goal[], a: Activity): Goal[] {
  if (a.goalId) return goals.filter(g => g.id === a.goalId);
  if (a.category === "save") { const g = goals.find(g => g.kind === "savings"); return g ? [g] : []; }
  return goals.filter(g => def(g.template).drivers.includes(a.category));
}

/** The single goal that absorbs this activity's opportunity cost, if any. */
export function costGoal(goals: Goal[], a: Activity): Goal | undefined {
  if (a.category === "spend" || a.category === "eat") {
    if (!a.amount) return undefined;
    const savers = goals.filter(g => g.kind === "savings");
    return savers.find(g => g.primary) ?? savers[0];
  }
  const payers = goals.filter(g => def(g.template).costs.includes(a.category));
  return payers.find(g => g.primary) ?? payers[0];
}

/** Units of progress an activity adds to a goal (0 if it does not drive it). */
export function unitsFor(goal: Goal, a: Activity, pace: Pace): number {
  if (goal.kind === "savings") return a.category === "save" ? Math.max(0, a.amount ?? 0) : 0;
  if (a.units != null) return a.units;
  const m = a.minutes ?? 0;
  if (goal.kind === "habit") return Math.min(1, m / pace.sessionMinutes);
  return (m / 60) * pace.perHour;
}

// ------------------------------------------------------------------ pace

const inWindow = (a: Activity, from: Date, to: Date) => { const t = new Date(a.at); return t >= from && t < to; };

/** The user's own pace, from history before `now`'s day. Falls back to (and blends with) the template while history is short. */
export function computePace(goal: Goal, goals: Goal[], history: Activity[], now: Date): Pace {
  const d = def(goal.template);
  const base: Pace = { ...d.pace, ...goal.paceHint, basedOnDays: 0 };
  const today = startOfDay(now);
  const mine = history.filter(a => drivenGoals(goals, a).some(g => g.id === goal.id) && new Date(a.at) < today);

  // perHour: only from activities that report both units and time
  let perHour = base.perHour;
  if (goal.kind === "skill") {
    const rated = mine.filter(a => a.units != null && a.minutes && inWindow(a, addDays(today, -RATE_WINDOW), today));
    const minutes = rated.reduce((s, a) => s + a.minutes!, 0);
    if (minutes >= 120) perHour = (rated.reduce((s, a) => s + a.units!, 0) * 60) / minutes;
  }

  // perDay: units over the last PACE_WINDOW days, blended with the template while the history is short
  const firstSeen = history.length ? new Date(Math.min(...history.map(a => +new Date(a.at)), +new Date(goal.createdAt))) : new Date(goal.createdAt);
  const span = Math.max(0, Math.min(PACE_WINDOW, daysBetween(startOfDay(firstSeen), today)));
  const p0: Pace = { ...base, perHour };
  const done = mine.filter(a => inWindow(a, addDays(today, -PACE_WINDOW), today)).reduce((s, a) => s + unitsFor(goal, a, p0), 0);
  const measured = span > 0 ? done / span : 0;
  const w = Math.min(1, span / 7);
  const perDay = Math.max(measured * w + base.perDay * (1 - w), base.perDay * MIN_RATE_SHARE);
  return { perDay, perHour, sessionMinutes: base.sessionMinutes, basedOnDays: span };
}

export function progressOf(goal: Goal, goals: Goal[], history: Activity[], pace: Pace): number {
  return goal.baseline + history.filter(a => drivenGoals(goals, a).some(g => g.id === goal.id)).reduce((s, a) => s + unitsFor(goal, a, pace), 0);
}

// ------------------------------------------------------------------ impact

export function impactOf(goal: Goal, goals: Goal[], a: Activity, pace: Pace): Impact | null {
  const d = def(goal.template);
  const driven = drivenGoals(goals, a).some(g => g.id === goal.id);
  const cost = costGoal(goals, a)?.id === goal.id;
  if (!driven && !cost) return null;
  const rateLine: Step = goal.kind === "savings"
    ? { label: "You usually save", value: `${fmtMoney(pace.perDay)} a day${src(pace)}` }
    : { label: "You usually make", value: `${fmtNum(pace.perDay)} ${plural(d.unit, pace.perDay)} of progress a day${src(pace)}` };

  if (driven) {
    const units = unitsFor(goal, a, pace);
    if (units <= 0) return null;
    const days = -units / pace.perDay;
    const steps: Step[] = [];
    if (goal.kind === "savings") steps.push({ label: "Put aside", value: fmtMoney(units) });
    else if (a.units != null) steps.push({ label: "Done", value: `${fmtNum(units)} ${plural(d.unit, units)}` });
    else if (goal.kind === "habit") steps.push({ label: "Session", value: `${fmtMinutes(a.minutes ?? 0)} of ${pace.sessionMinutes} min = ${fmtNum(units)} ${plural(d.unit, units)}` });
    else steps.push({ label: "Focused time", value: `${fmtMinutes(a.minutes ?? 0)} × ${fmtNum(pace.perHour)} ${d.unit}/hour = ${fmtNum(units)} ${plural(d.unit, units)}` });
    steps.push(rateLine, { label: "Goal moves", value: `${fmtNum(units)} ÷ ${fmtNum(pace.perDay)} = ${fmtDays(days)}` });
    const equivalent = goal.kind === "savings" ? `${fmtMoney(units)} closer to your ${goal.title}` : `${fmtNum(units)} ${plural(d.noun, units)} done`;
    return { goalId: goal.id, goalTitle: goal.title, activityId: a.id, days, units, equivalent, breakdown: steps };
  }

  // opportunity cost
  if (goal.kind === "savings") {
    const avoidable = Math.max(0, (a.amount ?? 0) - (a.alternativeCost ?? 0));
    if (avoidable <= 0) return null;
    const days = avoidable / pace.perDay;
    const steps: Step[] = [{ label: "Spent", value: fmtMoney(a.amount ?? 0) }];
    if (a.alternativeCost) steps.push({ label: "The cheaper option", value: `${fmtMoney(a.alternativeCost)}, so ${fmtMoney(avoidable)} was avoidable` });
    steps.push(rateLine, { label: "Goal delay", value: `${fmtMoney(avoidable)} ÷ ${fmtMoney(pace.perDay)} = ${fmtDays(days)}` });
    return { goalId: goal.id, goalTitle: goal.title, activityId: a.id, days, units: -avoidable,
             equivalent: `That's ${fmtMoney(avoidable)} that could have gone to your ${goal.title}`, breakdown: steps };
  }
  const minutes = a.minutes ?? 0;
  if (minutes <= 0) return null;
  const hourRate = goal.kind === "skill" ? pace.perHour : 1 / (pace.sessionMinutes / 60);
  const missed = (minutes / 60) * hourRate;
  const days = missed / pace.perDay;
  const where = a.app ? `Time on ${a.app}` : "Time spent";
  const steps: Step[] = [
    { label: where, value: fmtMinutes(minutes) },
    { label: "Your pace", value: `${fmtNum(hourRate)} ${plural(d.unit, hourRate)} per focused hour${pace.basedOnDays ? " (your last 28 days)" : " (starting estimate)"}` },
    { label: `${cap(d.unit)} not done`, value: `${fmtNum(minutes / 60)} h × ${fmtNum(hourRate)} = ${fmtNum(missed)}` },
    rateLine,
    { label: "Goal delay", value: `${fmtNum(missed)} ÷ ${fmtNum(pace.perDay)} = ${fmtDays(days)}` },
  ];
  return { goalId: goal.id, goalTitle: goal.title, activityId: a.id, days, units: -missed,
           equivalent: `That's about ${approx(missed)} ${plural(d.noun, missed)} you could have ${goal.template === "reading" ? "read" : goal.kind === "habit" ? "done" : "solved"}`,
           breakdown: steps };
}

/** One small, specific alternative. Swaps, never guilt. */
export function swapFor(goal: Goal, pace: Pace): Swap {
  const s = def(goal.template).swap;
  const act = { category: s.category, label: s.title, minutes: s.minutes, units: s.units, amount: s.amount, goalId: goal.id };
  const gain = goal.kind === "savings" ? (s.amount ?? 0) : (s.units ?? 0);
  const daysCloser = gain / pace.perDay;
  return { goalId: goal.id, title: s.title, detail: `You'll be ${fmtDays(-daysCloser).replace("-", "")} closer to ${goal.title}`, daysCloser, activity: act };
}

// ------------------------------------------------------------------ forecast

export function forecast(goal: Goal, goals: Goal[], history: Activity[], now: Date): Forecast {
  const pace = computePace(goal, goals, history, now);
  const progress = progressOf(goal, goals, history, pace);
  const remaining = Math.max(0, goal.target - progress);
  const today = startOfDay(now);
  const todayCost = history.filter(a => dayKey(a.at) === dayKey(now))
    .map(a => costGoal(goals, a)?.id === goal.id ? impactOf(goal, goals, a, pace) : null)
    .reduce((s, i) => s + (i ? i.days : 0), 0);
  const daysLeft = remaining <= 0 ? 0 : remaining / pace.perDay + todayCost;
  return {
    goalId: goal.id, progress, remaining, percent: Math.min(100, (progress / goal.target) * 100), pace,
    daysLeft, eta: dayKey(addDays(today, Math.ceil(daysLeft)).toISOString()), done: remaining <= 0,
  };
}

/** Impacts of one activity on every goal it touches. */
export function impactsOf(goals: Goal[], history: Activity[], a: Activity, now: Date): Impact[] {
  return goals.map(g => impactOf(g, goals, a, computePace(g, goals, history, now))).filter((i): i is Impact => !!i);
}

// ------------------------------------------------------------------ helpers

export function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
const src = (p: Pace) => p.basedOnDays >= 7 ? ` (last ${p.basedOnDays} days)` : p.basedOnDays > 0 ? ` (${p.basedOnDays} days of history + starting estimate)` : " (starting estimate)";
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const approx = (n: number) => n < 0.75 ? "half a" : n < 1.5 ? "1" : String(Math.round(n));

/** "+3 days", "−0.5 days", "no change". Positive = later. */
export function fmtDays(d: number): string {
  const a = Math.abs(d);
  if (a < 0.05) return "no change";
  const v = a >= 1 ? String(Math.round(a)) : a.toFixed(1);
  return `${d > 0 ? "+" : "-"}${v} ${v === "1" ? "day" : "days"}`;
}
