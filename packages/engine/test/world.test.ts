import { test } from "node:test";
import assert from "node:assert/strict";
import { NEW_WORLD, addRealItem, buyItem, inventory, levelFromXp, matchRealItem, lightOf, upgradeItem, worldState, type Activity, type Goal } from "../src/index.ts";

const NOW = new Date(2026, 9, 28, 18, 0);
const goal: Goal = { id: "dsa", title: "Crack DSA", template: "dsa", kind: "skill", unit: "problems", target: 300, baseline: 0, primary: true, createdAt: new Date(2026, 9, 1).toISOString() };
let n = 0;
const act = (a: Partial<Activity> & Pick<Activity, "category">): Activity => ({ id: `a${n++}`, at: NOW.toISOString(), label: a.category, source: "text", ...a } as Activity);
const daysAgo = (d: number) => new Date(+NOW - d * 86400_000).toISOString();

test("a new player starts at level 0 with only the Cosy Sweater", () => {
  const w = worldState([goal], [], NEW_WORLD, NOW);
  assert.equal(w.level, 0); assert.equal(w.xp, 0); assert.equal(w.light, 0); assert.equal(w.streak, 0);
  const inv = inventory([goal], [], NEW_WORLD, null, NOW);
  assert.deepEqual(inv.items.filter(i => i.owned).map(i => i.id), ["sweater"]);
});

test("good habits make Light and XP; scrolling makes none but shows as fog", () => {
  assert.equal(lightOf(act({ category: "study", minutes: 45 })), 45);
  assert.equal(lightOf(act({ category: "code", minutes: 60, units: 2 })), 80);
  assert.equal(lightOf(act({ category: "save", amount: 500 })), 50);
  assert.equal(lightOf(act({ category: "social_media", minutes: 90, app: "Instagram" })), 0);
  assert.equal(worldState([goal], [act({ category: "social_media", minutes: 150, app: "Instagram" })], NEW_WORLD, NOW).fog, 1);
});

test("level items unlock with XP, streak items with streaks", () => {
  const hist = [act({ category: "study", minutes: 300 })];                     // 300 XP -> level 2
  const inv = inventory([goal], hist, NEW_WORLD, null, NOW);
  assert.equal(inv.level, 2);
  assert.ok(inv.items.find(i => i.id === "hoodie")!.owned);
  assert.ok(!inv.items.find(i => i.id === "grad")!.owned);
  const streak = [0, 1, 2].map(d => act({ category: "read", minutes: 20, units: 10, at: daysAgo(d) }));
  const inv2 = inventory([goal], streak, NEW_WORLD, null, NOW);
  assert.ok(inv2.items.find(i => i.id === "fit")!.owned, "3-day streak unlocks FitBulbu");
  assert.ok(!inv2.items.find(i => i.id === "champ")!.owned);
  assert.match(inv2.items.find(i => i.id === "champ")!.detail, /7-day streak · best so far 3 days/);
});

test("the shop sells for Light, and anything owned levels up with Light", () => {
  const rich = { ...NEW_WORLD, gift: 1000 };
  const r = buyItem([goal], [], rich, "glasses", NOW);
  assert.ok("save" in r); if (!("save" in r)) return;
  assert.equal(worldState([goal], [], r.save, NOW).light, 750);
  assert.ok("error" in buyItem([goal], [], r.save, "glasses", NOW), "can't buy twice");
  assert.ok("error" in buyItem([goal], [], NEW_WORLD, "crown", NOW), "not enough Light");
  const up = upgradeItem([goal], [], r.save, "sweater", NOW);
  assert.ok("save" in up); if (!("save" in up)) return;
  assert.equal(inventory([goal], [], up.save, null, NOW).items.find(i => i.id === "sweater")!.level, 2);
  assert.ok("error" in upgradeItem([goal], [], up.save, "champ", NOW), "can't level up what you don't own");
});

test("real-life purchases: matched by what you bought, once each; a finished iPhone goal gives the iPhone", () => {
  const r = addRealItem(NEW_WORLD, "new AirPods", NOW, { price: 2500 });
  assert.ok("save" in r); if (!("save" in r)) return;
  assert.ok(inventory([goal], [], r.save, null, NOW).items.find(i => i.id === "headphones")!.owned);
  assert.ok("error" in addRealItem(r.save, "headphones", NOW));
  assert.ok("error" in addRealItem(NEW_WORLD, "a spaceship", NOW));
  const iphone: Goal = { id: "ip", title: "iPhone", template: "iphone", kind: "savings", unit: "₹", target: 1000, baseline: 1000, createdAt: NOW.toISOString() };
  assert.ok(inventory([iphone], [], NEW_WORLD, null, NOW).items.find(i => i.id === "iphone")!.owned);
});

test("levels follow total XP", () => {
  assert.deepEqual(levelFromXp(0), { level: 0, into: 0, span: 100 });
  assert.equal(levelFromXp(100).level, 1);
  assert.equal(levelFromXp(300).level, 2);
});

test("real-life items Bulbu can hold: the iPad matches, and the held one shows as equipped on top of the outfit", () => {
  assert.equal(matchRealItem("my new iPad Air")?.id, "ipad");
  assert.equal(matchRealItem("iphone 17")?.id, "iphone");
  const r = addRealItem(NEW_WORLD, "ipad", NOW, { extra: { name: "iPad in blue", color: "#6F9FD8" } });
  assert.ok("save" in r);
  if (!("save" in r)) return;
  const inv = inventory([], [], r.save, "sweater", NOW, "ipad");
  const ipad = inv.items.find(i => i.id === "ipad")!, sweater = inv.items.find(i => i.id === "sweater")!;
  assert.ok(ipad.owned && ipad.equipped && ipad.hold);
  assert.ok(sweater.equipped, "the outfit stays on");
  assert.equal(inv.gear, "ipad");
  assert.equal(ipad.mine?.color, "#6F9FD8");
  assert.equal(inventory([], [], NEW_WORLD, "sweater", NOW, "ipad").gear, null, "can't hold what you don't own");
});
