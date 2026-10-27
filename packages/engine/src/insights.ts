// Weekly insights, streaks, achievements, levels, Bulbu's mood and learned patterns. All plain statistics over the ledger.

import type { Activity, Category, Goal, Impact } from "./types.ts";
import { computePace, impactOf, startOfDay, forecast } from "./forecast.ts";
import { def } from "./templates.ts";
import { addDays, dayKey, fmtMoney } from "./util.ts";

export const PRODUCTIVE: Category[] = ["study", "code", "read", "workout", "focus"];
const isProductive = (a: Activity) => PRODUCTIVE.includes(a.category) || a.category === "save";

/** Every impact of every activity, using today's pace (one pace per goal). */
export function allImpacts(goals: Goal[], history: Activity[], now: Date): Impact[] {
  const paces = new Map(goals.map(g => [g.id, computePace(g, goals, history, now)]));
  return history.flatMap(a => goals.map(g => impactOf(g, goals, a, paces.get(g.id)!)).filter((i): i is Impact => !!i));
}

// ------------------------------------------------------------------ week

export interface ChoiceLine { activityId: string; label: string; at: string; goalTitle: string; days: number }
export interface Insights {
  from: string; to: string;
  productiveMinutes: number; socialMinutes: number;
  productiveChange: number | null; socialChange: number | null;   // vs the previous period, as fractions
  breakdown: { key: string; label: string; minutes: number }[];
  daily: { day: string; productive: number; social: number }[];
  good: ChoiceLine[]; distracting: ChoiceLine[];
  goodDays: number; distractingDays: number; netDays: number;      // net > 0 = later
  spend: number;
}

const BUCKETS: [string, string, Category[]][] = [
  ["study", "Study", ["study", "code", "focus"]], ["social", "Social media", ["social_media"]],
  ["workout", "Workout", ["workout"]], ["read", "Reading", ["read"]],
];

export function insights(goals: Goal[], history: Activity[], now: Date, days = 7): Insights {
  const end = addDays(startOfDay(now), 1), start = addDays(end, -days), prevStart = addDays(start, -days);
  const within = (a: Activity, f: Date, t: Date) => { const x = new Date(a.at); return x >= f && x < t; };
  const cur = history.filter(a => within(a, start, end)), prev = history.filter(a => within(a, prevStart, start));
  const mins = (list: Activity[], cats: Category[]) => list.filter(a => cats.includes(a.category)).reduce((s, a) => s + (a.minutes ?? 0), 0);
  const p = mins(cur, PRODUCTIVE), s = mins(cur, ["social_media"]), pp = mins(prev, PRODUCTIVE), ps = mins(prev, ["social_media"]);
  const change = (a: number, b: number) => b > 0 ? (a - b) / b : null;

  const breakdown = BUCKETS.map(([key, label, cats]) => ({ key, label, minutes: mins(cur, cats) }));
  const known = new Set(BUCKETS.flatMap(b => b[2]).concat(["sleep"]));
  breakdown.push({ key: "other", label: "Others", minutes: cur.filter(a => !known.has(a.category)).reduce((s, a) => s + (a.minutes ?? 0), 0) });

  const daily = Array.from({ length: days }, (_, i) => {
    const d = dayKey(addDays(start, i)), list = cur.filter(a => dayKey(a.at) === d);
    return { day: d, productive: mins(list, PRODUCTIVE), social: mins(list, ["social_media"]) };
  });

  const imp = allImpacts(goals, history, now).filter(i => cur.some(a => a.id === i.activityId));
  const byId = new Map(cur.map(a => [a.id, a]));
  const line = (i: Impact): ChoiceLine => ({ activityId: i.activityId, label: byId.get(i.activityId)!.label, at: byId.get(i.activityId)!.at, goalTitle: i.goalTitle, days: i.days });
  const good = imp.filter(i => i.days < 0).map(line).sort((a, b) => a.days - b.days);
  const distracting = imp.filter(i => i.days > 0).map(line).sort((a, b) => b.days - a.days);
  const goodDays = -good.reduce((s, l) => s + l.days, 0), distractingDays = distracting.reduce((s, l) => s + l.days, 0);
  return {
    from: dayKey(start), to: dayKey(addDays(end, -1)), productiveMinutes: p, socialMinutes: s,
    productiveChange: change(p, pp), socialChange: change(s, ps), breakdown, daily,
    good, distracting, goodDays, distractingDays, netDays: distractingDays - goodDays,
    spend: cur.filter(a => a.category === "spend" || a.category === "eat").reduce((s, a) => s + (a.amount ?? 0), 0),
  };
}

/** Goal progress (%) at the end of each of the last `days` days, for the weekly progress line. */
export function progressSeries(goal: Goal, goals: Goal[], history: Activity[], now: Date, days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const end = addDays(startOfDay(now), i - days + 1);
    const upto = history.filter(a => new Date(a.at) < end);
    return { day: dayKey(addDays(end, -1)), percent: forecast(goal, goals, upto, addDays(end, -1)).percent };
  });
}

// ------------------------------------------------------------------ streaks, levels, achievements

export function streak(history: Activity[], now: Date): number {
  const days = new Set(history.filter(isProductive).map(a => dayKey(a.at)));
  let d = startOfDay(now);
  if (!days.has(dayKey(d))) d = addDays(d, -1);      // today isn't over yet
  let n = 0;
  while (days.has(dayKey(d))) { n++; d = addDays(d, -1); }
  return n;
}

export function level(history: Activity[]) {
  const xp = Math.round(history.filter(isProductive).reduce((s, a) => s + (a.minutes ?? 0) / 5 + (a.category === "save" ? (a.amount ?? 0) / 100 : 0), 0));
  const lvl = Math.floor(Math.sqrt(xp / 60)) + 1;
  const floor = 60 * (lvl - 1) ** 2, next = 60 * lvl ** 2;
  return { xp, level: lvl, into: xp - floor, span: next - floor };
}

export interface Achievement { id: string; title: string; detail: string; group: "streaks" | "goals" | "special"; earned: boolean; progress: number }

export function achievements(goals: Goal[], history: Activity[], now: Date): Achievement[] {
  const unitsOf = (t: string) => goals.filter(g => g.template === t).reduce((s, g) => s + forecast(g, goals, history, now).progress - g.baseline, 0);
  const longest = longestStreak(history);
  const workouts = history.filter(a => a.category === "workout").length;
  const pages = history.filter(a => a.category === "read").reduce((s, a) => s + (a.units ?? 0), 0);
  const early = history.some(a => isProductive(a) && a.category !== "save" && [4, 5].includes(new Date(a.at).getHours()));
  const tracked = new Set(history.map(a => dayKey(a.at)));
  const scrolled = new Set(history.filter(a => a.category === "social_media").map(a => dayKey(a.at)));
  const noScroll = [...tracked].some(d => !scrolled.has(d) && d !== dayKey(now));
  const saver = goals.find(g => g.kind === "savings");
  const saverPct = saver ? forecast(saver, goals, history, now).percent : 0;
  const A = (id: string, title: string, detail: string, group: Achievement["group"], progress: number): Achievement =>
    ({ id, title, detail, group, progress: Math.max(0, Math.min(1, progress)), earned: progress >= 1 });
  return [
    A("streak7", "7 Day Streak", "Keep going!", "streaks", longest / 7),
    A("streak30", "Consistency", "30-day streak", "streaks", longest / 30),
    A("dsa", "DSA Starter", "Solved 50 problems", "goals", unitsOf("dsa") / 50),
    A("early", "Early Bird", "5 AM club", "special", early ? 1 : 0),
    A("book", "Bookworm", "Read 300 pages", "goals", pages / 300),
    A("fit", "Fit Steps", "10 workouts", "goals", workouts / 10),
    A("noscroll", "No Scroll Day", "A day with 0 social media", "special", noScroll ? 1 : 0),
    A("iphone", saver ? `${saver.title}` : "iPhone Goal", "Reach your savings goal", "goals", saverPct / 100),
  ];
}

function longestStreak(history: Activity[]) {
  const days = [...new Set(history.filter(isProductive).map(a => dayKey(a.at)))].sort();
  let best = 0, run = 0, prev = "";
  for (const d of days) { run = prev && dayKey(addDays(new Date(prev + "T12:00"), 1)) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}

// ------------------------------------------------------------------ Bulbu's mood

export type Emote = "happy" | "focused" | "drained" | "stressed" | "thriving" | "celebrating";

/** Glow follows the week: bright and iridescent on track, dimmer when drifting. */
export function glowFor(weekNetDays: number) { return Math.max(0.35, Math.min(1.15, 0.9 - weekNetDays * 0.05)); }

/** Deterministic reaction used when no model is available (and as the model's default). */
export function reactionFor(impacts: Impact[], activities: Activity[], completedGoal = false): { emote: Emote; animation: string } {
  if (completedGoal) return { emote: "celebrating", animation: "Celebrate" };
  const net = impacts.reduce((s, i) => s + i.days, 0);
  if (net <= -1) return { emote: "thriving", animation: "Wave" };
  if (net < 0) return { emote: activities.some(a => a.category === "focus") ? "focused" : "happy", animation: "Idle" };
  if (net > 0 && activities.some(a => a.category === "spend" || a.category === "eat")) return { emote: "stressed", animation: "Jitter" };
  if (net >= 0.5) return { emote: "drained", animation: "Sleepy" };
  if (activities.some(a => a.category === "sleep" && (a.minutes ?? 0) < 360)) return { emote: "drained", animation: "Sleepy" };
  return { emote: "happy", animation: "Idle" };
}

// ------------------------------------------------------------------ patterns

export interface Pattern { id: string; text: string; detail: string; samples: number; nudgeAt?: string }

/** Simple correlations over the last 4 weeks. Worded as tendencies, never causes. */
export function patterns(history: Activity[], now: Date): Pattern[] {
  const from = addDays(startOfDay(now), -28);
  const h = history.filter(a => new Date(a.at) >= from);
  const out: Pattern[] = [];
  const spendOf = (list: Activity[]) => list.filter(a => a.category === "eat" || a.category === "spend").reduce((s, a) => s + (a.amount ?? 0), 0);
  const days = [...new Set(h.map(a => dayKey(a.at)))];

  // 1. weekend vs weekday food spending
  const food = (keys: string[]) => keys.length ? spendOf(h.filter(a => a.category === "eat" && keys.includes(dayKey(a.at)))) / keys.length : 0;
  const isWeekend = (k: string) => [0, 6].includes(new Date(k + "T12:00").getDay());
  const we = days.filter(isWeekend), wd = days.filter(k => !isWeekend(k));
  const weAvg = food(we), wdAvg = food(wd);
  if (we.length >= 4 && wdAvg > 0 && weAvg / wdAvg >= 1.5)
    out.push({ id: "weekend-food", text: `Weekend food spending is ${(weAvg / wdAvg).toFixed(1)}× weekdays`,
               detail: `${fmtMoney(weAvg)} a weekend day vs ${fmtMoney(wdAvg)} a weekday, over ${days.length} days.`, samples: we.length });

  // 2. late-night coding and spending: a "night" runs 9 PM to 5 AM, keyed by the evening it started
  const nightOf = (a: Activity) => { const t = new Date(a.at), hr = t.getHours(); return hr >= 21 ? dayKey(t) : hr < 5 ? dayKey(addDays(t, -1)) : null; };
  const lateCode = new Set(h.filter(a => ["code", "study", "focus"].includes(a.category) && (() => { const hr = new Date(a.at).getHours(); return hr >= 1 && hr < 5; })()).map(nightOf).filter(Boolean) as string[]);
  const nightSpend = new Map<string, number>();
  h.filter(a => (a.category === "eat" || a.category === "spend") && nightOf(a)).forEach(a => nightSpend.set(nightOf(a)!, (nightSpend.get(nightOf(a)!) ?? 0) + (a.amount ?? 0)));
  const evenings = days.filter(d => d !== dayKey(now));
  const late = evenings.filter(d => lateCode.has(d)), other = evenings.filter(d => !lateCode.has(d));
  const avg = (ks: string[]) => ks.length ? ks.reduce((s, k) => s + (nightSpend.get(k) ?? 0), 0) / ks.length : 0;
  if (late.length >= 3 && avg(late) >= Math.max(150, 1.8 * avg(other)))
    out.push({ id: "late-code-spend", text: "You tend to overspend on nights you code past 1 AM",
               detail: `${fmtMoney(avg(late))} a night on those ${late.length} nights vs ${fmtMoney(avg(other))} on other nights.`, samples: late.length, nudgeAt: "23:30" });

  // 3. short sleep and next-day focus
  const sleepBy = new Map(h.filter(a => a.category === "sleep" && a.minutes).map(a => [dayKey(a.at), a.minutes!]));
  const focusOn = (k: string) => h.filter(a => dayKey(a.at) === k && ["code", "study", "focus", "read"].includes(a.category)).reduce((s, a) => s + (a.minutes ?? 0), 0);
  const shortDays = [...sleepBy].filter(([, m]) => m < 360).map(([k]) => k), okDays = [...sleepBy].filter(([, m]) => m >= 420).map(([k]) => k);
  const fAvg = (ks: string[]) => ks.length ? ks.reduce((s, k) => s + focusOn(k), 0) / ks.length : 0;
  if (shortDays.length >= 3 && okDays.length >= 3 && fAvg(okDays) > 0) {
    const drop = 1 - fAvg(shortDays) / fAvg(okDays);
    if (drop >= 0.25) out.push({ id: "short-sleep", text: `After under 6 hours of sleep, your focus time drops about ${Math.round(drop * 100)}%`,
                                  detail: `${Math.round(fAvg(shortDays))} min of focus on ${shortDays.length} short-sleep days vs ${Math.round(fAvg(okDays))} min after 7+ hours.`, samples: shortDays.length });
  }

  // 4. when the scrolling usually starts
  const byHour = new Array(24).fill(0);
  h.filter(a => a.category === "social_media").forEach(a => { byHour[new Date(a.at).getHours()] += a.minutes ?? 0; });
  const total = byHour.reduce((s, v) => s + v, 0), peak = byHour.indexOf(Math.max(...byHour));
  const share = total ? (byHour[peak] + byHour[(peak + 1) % 24]) / total : 0;
  if (total >= 300 && share >= 0.3) {
    const label = new Date(2000, 0, 1, peak).toLocaleTimeString("en-IN", { hour: "numeric", hour12: true });
    out.push({ id: "scroll-hour", text: `Most of your scrolling happens around ${label}`,
               detail: `${Math.round(share * 100)}% of your social media time falls in that two-hour window.`, samples: Math.round(total / 30),
               nudgeAt: `${String((peak + 23) % 24).padStart(2, "0")}:45` });
  }
  return out;
}

export { def };
