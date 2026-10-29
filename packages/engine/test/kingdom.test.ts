import { test } from "node:test";
import assert from "node:assert/strict";
import { buildingReport, kingdom, niceDate, MAX_FLOORS, type Activity, type Goal } from "../src/index.ts";

const NOW = new Date(2026, 9, 29, 18, 0);
const created = new Date(2026, 9, 1).toISOString();
const iphone: Goal = { id: "ip", title: "iPhone 17", template: "iphone", kind: "savings", unit: "₹", target: 80000, baseline: 20000, primary: true, createdAt: created };
const dsa: Goal = { id: "dsa", title: "Crack DSA", template: "dsa", kind: "skill", unit: "problems", target: 300, baseline: 150, createdAt: created };
const gym: Goal = { id: "gym", title: "Get fit", template: "fitness", kind: "habit", unit: "workouts", target: 60, baseline: 0, createdAt: created };
const code2: Goal = { ...dsa, id: "web", title: "Ship a web app" };
let n = 0;
const act = (a: Partial<Activity> & Pick<Activity, "category">, hoursAgo = 2): Activity =>
  ({ id: `a${n++}`, at: new Date(+NOW - hoursAgo * 3600_000).toISOString(), label: a.category, source: "text", ...a } as Activity);

test("the main goal is the Castle; the others get their own building; a second coding goal takes the Workshop", () => {
  const k = kingdom([iphone, dsa, gym, code2], [], NOW);
  const by = Object.fromEntries(k.buildings.map(b => [b.id, b.goalId]));
  assert.deepEqual(by, { Castle: "ip", Library: "dsa", Arena: "gym", Workshop: "web" });
  assert.deepEqual(k.plots.sort(), ["Observatory", "Vault"]);
  assert.equal(k.mainGoalId, "ip");
});

test("level follows progress, construction lasts until the goal is reached, the ETA is the forecast's", () => {
  const k = kingdom([iphone, dsa], [], NOW);
  const lib = k.buildings.find(b => b.id === "Library")!;
  assert.equal(lib.level, 3);                    // 150 of 300 problems: half way, floor 3 of 5
  assert.ok(lib.building);
  assert.match(lib.eta ?? "", /^\d{4}-\d{2}-\d{2}$/);
  const done = kingdom([{ ...dsa, baseline: 300 }], [], NOW).buildings[0];
  assert.equal(done.level, MAX_FLOORS); assert.equal(done.building, false);
});

test("scrolling rolls the Dim over the buildings it slowed; good moves make them glow", () => {
  const calm = kingdom([iphone, dsa], [], NOW).buildings.find(b => b.id === "Library")!;
  const scroll = kingdom([iphone, dsa], [act({ category: "social_media", minutes: 180, app: "Instagram" })], NOW).buildings.find(b => b.id === "Library")!;
  assert.equal(calm.fog, 0);
  assert.ok(scroll.fog > 0.5, "3 hours of scrolling fogs the Library (the time would have gone to DSA)");
  const study = kingdom([iphone, dsa], [act({ category: "code", minutes: 120, units: 4 })], NOW).buildings.find(b => b.id === "Library")!;
  assert.ok(study.glow > calm.glow, "solving problems makes the Library glow");
  const old = kingdom([iphone, dsa], [act({ category: "social_media", minutes: 180, app: "Instagram" }, 72)], NOW).buildings.find(b => b.id === "Library")!;
  assert.equal(old.fog, 0, "the Dim clears after a couple of days");
});

test("the building report: the construction maths adds up, and today's moves show how they shifted the finish", () => {
  const scroll = act({ category: "social_media", minutes: 120, app: "Instagram" }, 1);
  const solve = act({ category: "code", minutes: 60, units: 3 }, 3);
  const r = buildingReport("Library", [iphone, dsa], [scroll, solve], NOW)!;
  assert.equal(r.goalId, "dsa");
  assert.equal(r.moves.length, 2);
  assert.ok(r.moves.find(m => m.activityId === scroll.id)!.days > 0, "scrolling pushes the finish later");
  assert.ok(r.moves.find(m => m.activityId === solve.id)!.days < 0, "solving brings it closer");
  assert.ok(Math.abs(r.todayShift - r.moves.reduce((s, m) => s + m.days, 0)) < 1e-9);
  assert.equal(r.steps.at(-1)!.value.endsWith(niceDate(r.eta!)), true);
  assert.ok(r.steps.some(s => s.label === "Slowed today"));
  assert.equal(r.nextFloorAt, r.level * 20);
  assert.equal(buildingReport("Vault", [iphone, dsa], [], NOW), null, "no goal, no building");
});

test("a new move becomes a moment: scrolling rolls the Dim in and the finish slips; a good move lights it up", async () => {
  const { kingdomMoments } = await import("../src/index.ts");
  const ig = act({ category: "social_media", minutes: 120, app: "Instagram", label: "2h on Instagram" }, 0.5);
  const [m] = kingdomMoments([iphone, dsa], [], [ig], NOW);
  assert.equal(m.id, "Library"); assert.equal(m.kind, "dim");
  assert.ok(m.days > 0 && m.fogAfter > m.fogBefore, "the Dim rolls in");
  assert.ok((m.eta ?? "") > (m.etaBefore ?? ""), "the finish date slips");
  assert.deepEqual(m.moves, ["2h on Instagram"]);
  assert.ok(m.breakdown.length > 0);
  const code = act({ category: "code", minutes: 90, units: 3, label: "Solved 3 problems" }, 0.2);
  const [l] = kingdomMoments([iphone, dsa], [ig], [code], NOW);
  assert.equal(l.kind, "light"); assert.ok(l.days < 0 && l.fogAfter < l.fogBefore && l.glowAfter > l.glowBefore);
  assert.equal(kingdomMoments([iphone, dsa], [], [act({ category: "sleep", minutes: 480 })], NOW).length, 0, "a night's sleep moves nothing");
  // good moves made before the scroll don't cancel it in advance: the Dim still rolls in
  const yday = act({ category: "code", minutes: 180, units: 6, label: "Solved 6 problems" }, 20);
  const [late] = kingdomMoments([iphone, dsa], [yday], [ig], NOW);
  assert.ok(late.fogAfter > 0.2, "today's scroll still brings the Dim, after a good yesterday");
});
