import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, forecast, impactsOf, insights, patterns, simulate, streak, fmtDays, type Activity, type Goal } from "../src/index.ts";

const NOW = new Date(2026, 9, 25, 18, 0);
const today = (h: number, m = 0) => new Date(2026, 9, 25, h, m).toISOString();
const daysAgo = (n: number, h = 12) => { const d = addDays(NOW, -n); d.setHours(h, 0, 0, 0); return d.toISOString(); };

const dsa: Goal = { id: "dsa", title: "Crack DSA", template: "dsa", kind: "skill", unit: "problems", target: 300, baseline: 204, primary: true, createdAt: today(9) };
const iphone: Goal = { id: "iphone", title: "iPhone", template: "iphone", kind: "savings", unit: "₹", target: 79900, baseline: 52400, createdAt: today(9) };
const fit: Goal = { id: "fit", title: "Get fit", template: "fitness", kind: "habit", unit: "workouts", target: 40, baseline: 10, createdAt: today(9) };
const goals = [dsa, iphone, fit];
let n = 0;
const act = (p: Partial<Activity>): Activity => ({ id: "a" + n++, at: today(16), category: "other", label: "x", source: "text", ...p });
const days = (goals: Goal[], h: Activity[], a: Activity, id: string) => impactsOf(goals, h, a, NOW).find(i => i.goalId === id)?.days;

test("spec table, starting pace: 40 min of reels ≈ +1 day on Crack DSA", () => {
  const a = act({ category: "social_media", minutes: 40, app: "Instagram" });
  assert.equal(days(goals, [a], a, "dsa"), 1);
  assert.equal(days(goals, [a], a, "iphone"), undefined, "screen time never hits the savings goal");
});

test("spec table: 2 hours on Instagram ≈ +3 days, and says 'about 3 DSA problems'", () => {
  const a = act({ category: "social_media", minutes: 120, app: "Instagram" });
  const i = impactsOf(goals, [a], a, NOW)[0];
  assert.equal(i.days, 3);
  assert.equal(fmtDays(i.days), "+3 days");
  assert.match(i.equivalent, /about 3 DSA problems you could have solved/);
  assert.ok(i.breakdown.some(s => s.value.includes("2 h × 1.5 = 3")), JSON.stringify(i.breakdown));
});

test("spec table: ₹400 delivery order ≈ +2 days on the iPhone", () => {
  const a = act({ category: "eat", amount: 400, label: "Biryani delivery" });
  assert.equal(days(goals, [a], a, "iphone"), 2);
  const b = act({ category: "eat", amount: 400, alternativeCost: 100 });
  assert.equal(days(goals, [b], b, "iphone"), 1.5, "only the avoidable part counts");
});

test("spec table: a 30 min walk ≈ 2 days closer to Get fit", () => {
  const a = act({ category: "workout", minutes: 30 });
  const d = days(goals, [a], a, "fit")!;
  assert.ok(d < 0);
  assert.equal(fmtDays(d), "-2 days");
});

test("personal pace replaces the template once there is history", () => {
  const hist: Activity[] = [];
  for (let i = 1; i <= 14; i++) hist.push(act({ at: daysAgo(i), category: "code", minutes: 80, units: 2 }));
  const g = { ...dsa, createdAt: daysAgo(20) };
  const f = forecast(g, [g], hist, NOW);
  assert.equal(f.pace.perHour, 1.5);
  assert.equal(f.pace.perDay, 2);
  assert.equal(f.pace.basedOnDays, 14);
  const a = act({ category: "social_media", minutes: 120 });
  assert.equal(days([g], [...hist, a], a, "dsa"), 1.5);
});

test("forecast: today's distraction moves the goal date, a solved problem moves it back", () => {
  const base = forecast(dsa, goals, [], NOW);
  assert.equal(base.remaining, 96);
  assert.equal(base.daysLeft, 96);
  const scroll = act({ category: "social_media", minutes: 120 });
  assert.equal(forecast(dsa, goals, [scroll], NOW).daysLeft, 99);
  const solve = act({ category: "code", minutes: 40, units: 1 });
  assert.equal(forecast(dsa, goals, [scroll, solve], NOW).daysLeft, 98);
});

test("savings: money put aside goes to one savings goal only", () => {
  const second: Goal = { ...iphone, id: "trip", title: "Goa trip" };
  const a = act({ category: "save", amount: 500 });
  const imp = impactsOf([iphone, second], [a], a, NOW);
  assert.deepEqual(imp.map(i => i.goalId), ["iphone"]);
});

test("what-if: cooking 3 nights a week brings the iPhone closer, with the math", () => {
  const w = simulate(iphone, goals, [], NOW, { label: "Cook 3 nights a week", perWeek: 3, category: "save", amount: 300 })!;
  assert.equal(w.after.perDay, 200 + 900 / 7);
  assert.ok(w.daysSooner > 40, String(w.daysSooner));
  const less = simulate(dsa, goals, [], NOW, { label: "30 min less Instagram a day", perWeek: 7, category: "social_media", minutes: 30, reduce: true })!;
  assert.equal(less.after.perDay, 1.75);
});

test("streak counts back from yesterday when today has nothing yet", () => {
  const h = [1, 2, 3, 5].map(i => act({ at: daysAgo(i), category: "code", minutes: 30 }));
  assert.equal(streak(h, NOW), 3);
  assert.equal(streak([...h, act({ category: "read", minutes: 10 })], NOW), 4);
});

test("insights: good vs distracting choices and net impact", () => {
  const h = [act({ category: "social_media", minutes: 120 }), act({ category: "code", minutes: 40, units: 1 })];
  const w = insights(goals, h, NOW);
  assert.equal(w.distractingDays, 3);
  assert.equal(w.goodDays, 1);
  assert.equal(w.netDays, 2);
  assert.equal(w.socialMinutes, 120);
});

test("patterns: late-night coding and spending, worded as a tendency", () => {
  const h: Activity[] = [];
  for (let i = 1; i <= 20; i++) {
    const late = i % 3 === 0;
    h.push(act({ at: daysAgo(i, 20), category: "eat", amount: 150 }));
    if (late) {
      const t = addDays(NOW, -i + 1); t.setHours(1, 30, 0, 0);
      h.push(act({ at: t.toISOString(), category: "code", minutes: 60 }));
      t.setHours(2, 10); h.push(act({ at: t.toISOString(), category: "eat", amount: 420 }));
    }
  }
  const p = patterns(h, NOW).find(p => p.id === "late-code-spend");
  assert.ok(p, "pattern found");
  assert.match(p!.text, /tend to/);
});
