import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyApp, outfitStates, newlyUnlocked, type Activity, type Goal } from "../src/index.ts";

const NOW = new Date(2026, 9, 25, 18, 0);

test("apps from a Digital Wellbeing screen are sorted, not all called social media", () => {
  const k = (n: string, p?: string) => [classifyApp(n, p).kind, classifyApp(n, p).category];
  assert.deepEqual(k("Instagram"), ["distracting", "social_media"]);
  assert.deepEqual(k("YouTube"), ["distracting", "social_media"]);
  assert.deepEqual(k("LeetCode"), ["productive", "code"]);
  assert.deepEqual(k("Kindle"), ["productive", "read"]);
  assert.deepEqual(k("Phone"), ["neutral", null]);
  assert.deepEqual(k("Gmail"), ["neutral", null]);
  assert.deepEqual(k("Binance"), ["neutral", null]);
  assert.deepEqual(k("Some Game Studio X", "com.google.android.youtube"), ["distracting", "social_media"], "package name wins");
});

test("unknown apps are neutral and flagged; the user's override wins", () => {
  const u = classifyApp("Obscure Notes Pro");
  assert.equal(u.kind, "neutral"); assert.equal(u.known, false);
  const d = classifyApp("Discord", undefined, { discord: "productive" });
  assert.equal(d.kind, "productive"); assert.equal(d.category, "focus");
  assert.equal(classifyApp("Instagram", undefined, { instagram: "neutral" }).kind, "neutral");
});

const goal: Goal = { id: "dsa", title: "Crack DSA", template: "dsa", kind: "skill", unit: "problems", target: 300, baseline: 0, createdAt: new Date(2026, 8, 1).toISOString() };
const at = (daysAgo: number) => new Date(+NOW - daysAgo * 86400_000).toISOString();
let n = 0;
const act = (a: Partial<Activity> & Pick<Activity, "category">): Activity => ({ id: `a${n++}`, at: at(0), label: a.category, source: "text", ...a } as Activity);

test("the eight Bulbus: all present, nothing unlocked on an empty ledger", () => {
  const s = outfitStates([goal], [], NOW);
  assert.deepEqual(s.map(o => o.id), ["grad", "fit", "cozy", "champ", "tech", "nature", "dream", "party"]);
  assert.ok(s.every(o => !o.unlocked && o.progress === 0));
});

test("TechBulbu unlocks at 25 problems, and newlyUnlocked reports the moment it happens", () => {
  const before = [act({ category: "code", units: 20, minutes: 300, at: at(3) })];
  const after = [...before, act({ category: "code", units: 5, minutes: 60 })];
  assert.equal(outfitStates([goal], before, NOW).find(o => o.id === "tech")!.unlocked, false);
  assert.equal(outfitStates([goal], after, NOW).find(o => o.id === "tech")!.unlocked, true);
  assert.ok(newlyUnlocked([goal], before, after, NOW).includes("tech"));
  assert.deepEqual(newlyUnlocked([goal], after, after, NOW), []);
});

test("NatureBulbu counts balanced days only (productive and under 30 min of social media)", () => {
  const h = [0, 1, 2].flatMap(d => [act({ category: "read", units: 10, minutes: 20, at: at(d) }), act({ category: "social_media", minutes: d === 2 ? 45 : 10, app: "Instagram", at: at(d) })]);
  const nature = outfitStates([goal], h, NOW).find(o => o.id === "nature")!;
  assert.equal(nature.detail, "2 of 3 balanced days");
  assert.equal(nature.unlocked, false);
});
