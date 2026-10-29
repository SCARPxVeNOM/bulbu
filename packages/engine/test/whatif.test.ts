import { test } from "node:test";
import assert from "node:assert/strict";
import { kingdomWhatIf, knobFor, lateScroll, simulate, turn, forecast, type Activity, type Goal } from "../src/index.ts";

const NOW = new Date(2026, 9, 29, 18, 0);
const created = new Date(2026, 8, 1).toISOString();
const iphone: Goal = { id: "ip", title: "iPhone 17", template: "iphone", kind: "savings", unit: "₹", target: 80000, baseline: 20000, primary: true, createdAt: created };
const dsa: Goal = { id: "dsa", title: "Crack DSA", template: "dsa", kind: "skill", unit: "problems", target: 300, baseline: 150, createdAt: created };
const goals = [iphone, dsa];

test("the dial: turning it changes the number in the plan, and how much time it takes", () => {
  const cook = { label: "Cook 3 nights a week instead of ordering", perWeek: 3, category: "save" as const, amount: 300 };
  const k = knobFor(cook);
  assert.equal(k.field, "perWeek"); assert.deepEqual(k.values, [1, 2, 3, 4, 5, 6, 7]); assert.equal(k.index, 2);
  assert.equal(turn(cook, "perWeek", 1).label, "Cook 1 night a week instead of ordering");
  assert.equal(turn(cook, "perWeek", 5).label, "Cook 5 nights a week instead of ordering");
  const solve = { label: "Solve 2 more problems a day", perWeek: 7, category: "code" as const, units: 2, minutes: 80 };
  assert.equal(knobFor(solve).field, "units");
  assert.deepEqual(turn(solve, "units", 3), { ...solve, units: 3, minutes: 120, label: "Solve 3 more problems a day" });
  const less = { label: "1h less Instagram a day", perWeek: 7, category: "social_media" as const, minutes: 60, reduce: true };
  assert.equal(knobFor(less).field, "minutes");
  assert.equal(turn(less, "minutes", 30).label, "30 min less Instagram a day");
});

test("the kingdom what-if: more of a good thing finishes sooner, and only the goals it touches move", () => {
  const w = kingdomWhatIf(goals, [], NOW, { label: "Cook 3 nights a week", perWeek: 3, category: "save", amount: 300 })!;
  assert.ok(w);
  const at = (n: number) => w.stops.find(s => s.value === n)!.goals;
  assert.deepEqual(at(3).map(g => g.goalId), ["ip"], "cooking moves the savings goal only");
  assert.ok(at(5)[0].daysSooner > at(3)[0].daysSooner && at(3)[0].daysSooner > at(1)[0].daysSooner);
  assert.equal(at(3)[0].etaBefore, forecast(iphone, goals, [], NOW).eta);
  assert.equal(kingdomWhatIf(goals, [], NOW, { label: "Sleep 8 hours", perWeek: 7, category: "sleep", minutes: 480 }), null, "a change that moves nothing");
});

test("before and after agree on today: a scroll today slips both, so the what-if only shows the plan's effect", () => {
  const ig: Activity = { id: "ig", at: new Date(+NOW - 3600_000).toISOString(), category: "social_media", minutes: 120, app: "Instagram", label: "2h on Instagram", source: "text" };
  const w = simulate(dsa, goals, [ig], NOW, { label: "Solve 1 more problem a day", perWeek: 7, category: "code", units: 1, minutes: 40 })!;
  const f = forecast(dsa, goals, [ig], NOW);
  assert.equal(w.before.eta, f.eta);
  assert.ok(w.after.daysLeft > f.remaining / w.after.perDay, "today's slip stays in the new date");
});

test("sleep by 12: the scrolling that happens after midnight, a night on average", () => {
  const h: Activity[] = [];
  for (let d = 1; d <= 14; d++) {
    h.push({ id: `a${d}`, at: new Date(2026, 9, 29 - d, 23, 30).toISOString(), category: "social_media", minutes: 30, app: "Instagram", label: "Instagram", source: "text" });
    h.push({ id: `b${d}`, at: new Date(2026, 9, 29 - d + 1, 0, 40).toISOString(), category: "social_media", minutes: 56, app: "Instagram", label: "Instagram", source: "text" });
  }
  assert.equal(lateScroll(h, 0, NOW), (14 * 56) / 28, "only after midnight, averaged over four weeks");
  assert.equal(lateScroll(h, 23, NOW), (14 * 86) / 28);
  // one long scroll from 11:10 PM for 2 hours: 1h10m of it is after midnight
  const long: Activity = { id: "L", at: new Date(2026, 9, 27, 23, 10).toISOString(), category: "social_media", minutes: 120, label: "Instagram", source: "device" };
  assert.ok(Math.abs(lateScroll([long], 0, NOW) * 28 - 70) < 1e-6);
});
