import { test } from "node:test";
import assert from "node:assert/strict";
import { deal, kingdomMoments, refreshCard, type Activity, type Goal } from "../src/index.ts";

const NOW = new Date(2026, 9, 29, 18, 0);
const created = new Date(2026, 9, 1).toISOString();
const iphone: Goal = { id: "ip", title: "iPhone 17", template: "iphone", kind: "savings", unit: "₹", target: 80000, baseline: 20000, primary: true, createdAt: created };
const dsa: Goal = { id: "dsa", title: "Crack DSA", template: "dsa", kind: "skill", unit: "problems", target: 300, baseline: 150, createdAt: created };
const gym: Goal = { id: "gym", title: "Get fit", template: "fitness", kind: "habit", unit: "workouts", target: 60, baseline: 0, createdAt: created };
const ig: Activity = { id: "ig", at: new Date(+NOW - 3600_000).toISOString(), category: "social_media", minutes: 120, app: "Instagram", label: "2h on Instagram", source: "text" };

test("three cards, one per building, each with the engine's number", () => {
  const hand = deal([iphone, dsa, gym], [], NOW);
  assert.equal(hand.length, 3);
  assert.equal(new Set(hand.map(c => c.building)).size, 3, "one per building");
  for (const c of hand) assert.ok(c.daysCloser > 0, `${c.title} brings its building closer`);
  assert.equal(hand[0].building, "Castle", "with no Dim anywhere, the Castle leads");
});

test("the building under the Dim gets the first card, and playing it clears the fog and pulls the date back", () => {
  const hand = deal([iphone, dsa], [ig], NOW);
  assert.equal(hand[0].building, "Library"); assert.ok(hand[0].clears);
  const played: Activity = { ...hand[0].activity, id: "p", at: NOW.toISOString(), source: "card" };
  const [m] = kingdomMoments([iphone, dsa], [ig], [played], NOW);
  assert.equal(m.kind, "light"); assert.ok(m.fogAfter < m.fogBefore); assert.ok((m.eta ?? "") <= (m.etaBefore ?? ""));
  assert.ok(Math.abs(-m.days - hand[0].daysCloser) < 1e-9, "the card said exactly what it does");
});

test("one goal still fills a hand; a dealt card keeps up with the day", () => {
  const hand = deal([dsa], [], NOW);
  assert.equal(hand.length, 3); assert.ok(hand.every(c => c.goalId === "dsa"));
  assert.equal(new Set(hand.map(c => c.id)).size, 3);
  const fresh = refreshCard(hand[0], [dsa], [ig], NOW)!;
  assert.ok(fresh.clears, "after a scroll its building is under the Dim");
  assert.equal(refreshCard(hand[0], [iphone], [], NOW), null, "a card for a deleted goal drops out");
});
