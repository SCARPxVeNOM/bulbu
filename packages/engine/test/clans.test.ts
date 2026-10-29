import { test } from "node:test";
import assert from "node:assert/strict";
import { claimTier, claimWar, buyPass, donate, inventory, NEW_WORLD, pairClans, seasonFor, seasonState, warId, warResult, weekPlay, weekStart, type Activity, type Goal } from "../src/index.ts";

const NOW = new Date(2026, 9, 29, 18, 0);                    // a Thursday
const created = new Date(2026, 8, 1).toISOString();
const dsa: Goal = { id: "dsa", title: "Crack DSA", template: "dsa", kind: "skill", unit: "problems", target: 300, baseline: 150, primary: true, createdAt: created };
let n = 0;
const act = (a: Partial<Activity> & Pick<Activity, "category">, daysAgo = 0): Activity =>
  ({ id: `a${n++}`, at: new Date(+NOW - daysAgo * 86_400_000 - 3600_000).toISOString(), label: a.category, source: "text", ...a } as Activity);

test("a war week runs Monday to Sunday, and only good moves score", () => {
  assert.equal(weekStart(NOW).getDay(), 1); assert.equal(warId(NOW), "2026-10-26");
  const good = [act({ category: "code", minutes: 80, units: 2 }, 1), act({ category: "code", minutes: 40, units: 1, source: "card" }, 0)];
  const bad = [act({ category: "social_media", minutes: 180, app: "Instagram" }, 0)];
  const old = [act({ category: "code", minutes: 400, units: 10 }, 6)];         // last Friday: last week's war
  const save = { ...NEW_WORLD, raids: { "2026-10-28": { at: new Date(2026, 9, 28, 23, 30).toISOString(), light: 150 } } };
  const p = weekPlay([dsa], [...good, ...bad, ...old], save, NOW);
  assert.equal(p.cardsPlayed, 1); assert.equal(p.raidsHeld, 1);
  assert.ok(p.daysSooner > 0);
  assert.equal(p.points, Math.round(p.daysSooner * 10 + 15 + 5));
  assert.equal(weekPlay([dsa], [...good, ...old], save, NOW).points, p.points, "a bad day takes nothing away");
});

test("rivals rotate each week; an odd clan sits out", () => {
  const a = pairClans(["c1", "c2", "c3", "c4"], "2026-10-26"), b = pairClans(["c1", "c2", "c3", "c4"], "2026-11-02");
  assert.equal(a.size, 4); assert.notEqual(a.get("c1"), b.get("c1"));
  assert.equal(a.get(a.get("c1")!), "c1");
  assert.equal(pairClans(["c1", "c2", "c3"], "2026-10-26").size, 2);
  assert.equal(warResult(120, 90), "won"); assert.equal(warResult(10, 10), "draw");
});

test("war loot once per war; donations move Light, with limits", () => {
  const w = claimWar(NEW_WORLD, "2026-10-19", "won");
  assert.ok(!("error" in w)); if ("error" in w) return;
  assert.equal(w.light, 150); assert.equal(w.save.gift, 150);
  assert.ok("error" in claimWar(w.save, "2026-10-19", "won"));
  const d = donate(NEW_WORLD, NEW_WORLD, 50, 300, 0);
  assert.ok(!("error" in d)); if ("error" in d) return;
  assert.equal(d.from.spent, 50); assert.equal(d.to.gift, 50);
  assert.ok("error" in donate(NEW_WORLD, NEW_WORLD, 150, 300, 0), "too much at once");
  assert.ok("error" in donate(NEW_WORLD, NEW_WORLD, 80, 300, 250), "too much today");
  assert.ok("error" in donate(NEW_WORLD, NEW_WORLD, 80, 40, 0), "not enough Light");
});

test("seasons: a theme a month, XP climbs tiers, the pass adds the season's Bulbu", () => {
  const s = seasonFor(NOW);
  assert.equal(s.id, "2026-10"); assert.equal(s.number, 3); assert.equal(s.outfit, "cozy");
  const hist = Array.from({ length: 10 }, (_, i) => act({ category: "study", minutes: 500 }, i));      // 5000 Light this month
  let save = NEW_WORLD;
  const st = seasonState(hist, save, NOW);
  assert.equal(st.xp, 5000); assert.equal(st.tier, 5); assert.equal(st.claimable, 5);
  assert.ok("error" in claimTier(hist, save, NOW, 6, "free"), "tier 6 not reached");
  assert.ok("error" in claimTier(hist, save, NOW, 5, "pass"), "needs the pass");
  let r = claimTier(hist, save, NOW, 1, "free"); assert.ok(!("error" in r)); if ("error" in r) return;
  assert.equal(r.save.gift, 50); save = r.save;
  assert.ok("error" in claimTier(hist, save, NOW, 1, "free"), "once");
  save = buyPass(save, NOW);
  r = claimTier(hist, save, NOW, 5, "pass"); assert.ok(!("error" in r)); if ("error" in r) return;
  assert.deepEqual(r.reward, { kind: "item", item: "cozy", name: "CozyBulbu" });
  assert.ok(inventory([dsa], hist, r.save, null, NOW).items.find(i => i.id === "cozy")!.owned, "the season's Bulbu is yours");
  assert.equal(seasonState(hist, r.save, new Date(2026, 10, 3)).pass, false, "a new season, a new pass");
});
