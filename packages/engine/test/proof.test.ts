import { test } from "node:test";
import assert from "node:assert/strict";
import { atGym, distanceM, freshPhoto, trust, weekPlay, NEW_WORLD, type Activity, type Goal } from "../src/index.ts";

const gym = { name: "Cult Koramangala", lat: 12.9352, lng: 77.6245, radius: 150 };

test("at the gym: within the radius (and a little GPS slack), never a simulated location", () => {
  assert.ok(Math.abs(distanceM({ lat: 12.9352, lng: 77.6245 }, { lat: 12.9361, lng: 77.6245 }) - 100) < 2);
  assert.ok(atGym({ lat: 12.9361, lng: 77.6245, accuracy: 20 }, gym).ok, "100 m away");
  assert.ok(!atGym({ lat: 12.9380, lng: 77.6245, accuracy: 10 }, gym).ok, "310 m away");
  assert.ok(atGym({ lat: 12.9370, lng: 77.6245, accuracy: 60 }, gym).ok, "200 m, but a fuzzy fix");
  const fake = atGym({ lat: 12.9352, lng: 77.6245, mocked: true }, gym);
  assert.ok(!fake.ok); assert.match(fake.why!, /simulated/);
  assert.match(atGym({ lat: 12.9716, lng: 77.5946 }, gym).why!, /km from Cult Koramangala/);
});

test("a live photo has to be fresh", () => {
  const now = new Date(2026, 9, 29, 19, 0);
  assert.ok(freshPhoto(+now - 3 * 60_000, now).ok);
  assert.ok(!freshPhoto(+now - 40 * 60_000, now).ok);
  assert.ok(!freshPhoto(null, now).ok);
});

test("in clan wars a proven workout counts in full, a reported one at half", () => {
  const NOW = new Date(2026, 9, 29, 18, 0), created = new Date(2026, 8, 1).toISOString();
  const fit: Goal = { id: "fit", title: "Get fit", template: "fitness", kind: "habit", unit: "workouts", target: 60, baseline: 10, primary: true, createdAt: created };
  const w = (x: Partial<Activity>): Activity => ({ id: Math.random().toString(), at: new Date(+NOW - 3600_000).toISOString(), category: "workout", minutes: 45, units: 1, goalId: "fit", label: "Gym", source: "text", ...x } as Activity);
  assert.equal(trust(w({})), 0.5); assert.equal(trust(w({ proof: "location", source: "gym" })), 1); assert.equal(trust(w({ category: "code" })), 1);
  const told = weekPlay([fit], [w({})], NEW_WORLD, NOW).daysSooner, proven = weekPlay([fit], [w({ proof: "location", source: "gym" })], NEW_WORLD, NOW).daysSooner;
  assert.ok(Math.abs(proven - 2 * told) < 0.11, `${proven} vs ${told}`);
});
