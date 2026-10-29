import { test } from "node:test";
import assert from "node:assert/strict";
import { defend, inventory, lootFor, NEW_WORLD, predictRaid, raidState, type Activity, type Goal } from "../src/index.ts";

const NOW = new Date(2026, 9, 29, 18, 0);
const created = new Date(2026, 8, 1).toISOString();
const dsa: Goal = { id: "dsa", title: "Crack DSA", template: "dsa", kind: "skill", unit: "problems", target: 300, baseline: 150, primary: true, createdAt: created };
// a month of scrolling that starts around 11 PM, and a little at lunch
const hist: Activity[] = [];
for (let d = 1; d <= 20; d++) {
  hist.push({ id: `n${d}`, at: new Date(2026, 9, 29 - d, 23, 10).toISOString(), category: "social_media", minutes: 45, app: "Instagram", label: "Instagram", source: "text" });
  if (d % 4 === 0) hist.push({ id: `l${d}`, at: new Date(2026, 9, 29 - d, 13, 0).toISOString(), category: "social_media", minutes: 15, app: "YouTube", label: "YouTube", source: "text" });
}

test("the raid comes when the scrolling usually starts, at the building it slows down", () => {
  const r = predictRaid([dsa], hist, NOW)!;
  assert.equal(new Date(r.at).getHours(), 23, "it strikes when the scrolling starts"); assert.equal(r.label, "11 PM");
  assert.equal(r.id, "2026-10-29"); assert.equal(r.building, "Castle"); assert.equal(r.minutes, 45);
  assert.ok(r.days > 0, "if it lands, the Castle finishes later");
  assert.match(r.why, /four weeks/);
  assert.equal(raidState(r, NEW_WORLD, NOW), "coming");
  assert.equal(raidState(r, NEW_WORLD, new Date(2026, 9, 29, 23, 30)), "striking");
  assert.equal(predictRaid([dsa], hist, new Date(2026, 9, 30, 0, 30))!.id, "2026-10-29", "past midnight, last night's raid is still on");
  assert.equal(predictRaid([dsa], hist, new Date(2026, 9, 30, 1, 30))!.id, "2026-10-30", "once it's over, tonight's is next");
  assert.equal(predictRaid([dsa], hist.slice(0, 2), NOW), null, "no pattern yet, no raid");
});

test("25 minutes of focus holds it off; loot is Light and a Cape piece; three pieces make the Cape", () => {
  const r = predictRaid([dsa], hist, NOW)!;
  assert.ok("error" in defend(r, NEW_WORLD, 12, NOW), "too short");
  let save = NEW_WORLD;
  for (let i = 1; i <= 3; i++) {
    const out = defend({ ...r, id: `d${i}` }, save, 25, NOW);
    assert.ok(!("error" in out));
    save = out.save;
    assert.equal(out.loot.piece?.have, i);
  }
  assert.equal(save.owned?.cape, 1, "the Cape is pieced together");
  assert.equal(lootFor(r, save).piece?.item, "crown", "then the Crown's pieces start");
  assert.equal(save.gift, 3 * (100 + 45));
  const cape = inventory([dsa], hist, save, null, NOW).items.find(i => i.id === "cape")!;
  assert.ok(cape.owned); assert.match(cape.detail, /raid loot/);
  const again = defend({ ...r, id: "d1" }, save, 25, NOW);
  assert.ok("error" in again, "the same raid can't be defended twice");
  assert.equal(raidState(r, NEW_WORLD, new Date(2026, 9, 30, 1, 30)), "passed");
});
