import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// a throwaway database, set before the store is imported
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bulbu-test-"));
process.env.BULBU_DB = path.join(dir, "test.db");
const { store } = await import("../src/db.ts");
const { makeGoal } = await import("../src/goals.ts");
const { ingestUsage } = await import("../src/usage.ts");

const NOW = new Date(2026, 9, 25, 18, 0);
before(() => {
  store.putUser({ id: "t", name: "Test", createdAt: NOW.toISOString(), outfit: null, theme: "sky" });
  store.putGoal("t", makeGoal("dsa", { baseline: 0, primary: true }));
});

const wellbeing = [
  { name: "Instagram", minutes: 72 }, { name: "YouTube", minutes: 41 }, { name: "Phone", minutes: 33 },
  { name: "Gmail", minutes: 12 }, { name: "LeetCode", minutes: 25 }, { name: "Binance", minutes: 9 },
  { name: "Netflix", minutes: 3 }, { name: "Mystery App", minutes: 20 },
];

test("a usage sync logs distracting and productive apps, ignores neutral and tiny ones", () => {
  const r = ingestUsage("t", { day: "2026-10-25", source: "device", apps: wellbeing }, NOW);
  assert.deepEqual(r.logged.map(l => [l.app, l.kind, l.minutes]).sort(), [["Instagram", "distracting", 72], ["LeetCode", "productive", 25], ["YouTube", "distracting", 41]]);
  assert.deepEqual(r.ignored.find(i => i.app === "Netflix"), { app: "Netflix", reason: "too short" });
  assert.ok(r.ignored.some(i => i.app === "Phone" && i.reason === "neutral"));
  assert.deepEqual(r.unknown, ["Mystery App"]);
  assert.equal(store.activities("t").length, 3);
  assert.ok(r.netDays > 0, "an hour of reels pushes the goal back");
});

test("syncing the same day again replaces the numbers instead of double-counting", () => {
  const r = ingestUsage("t", { day: "2026-10-25", apps: [{ name: "Instagram", minutes: 90 }, { name: "YouTube", minutes: 41 }] }, NOW);
  assert.deepEqual(r.logged.map(l => [l.app, l.deltaMinutes]), [["Instagram", 18]], "YouTube unchanged, only the extra 18 min count");
  const insta = store.activities("t").filter(a => a.app === "Instagram");
  assert.equal(insta.length, 1);
  assert.equal(insta[0].minutes, 90);
});

test("the user's own app kinds are respected", () => {
  const u = store.user("t")!;
  store.putUser({ ...u, appKinds: { "mystery app": "productive" } });
  const r = ingestUsage("t", { day: "2026-10-25", apps: [{ name: "Mystery App", minutes: 20 }] }, NOW);
  assert.deepEqual(r.logged.map(l => [l.app, l.kind, l.category]), [["Mystery App", "productive", "focus"]]);
  assert.deepEqual(r.unknown, []);
});
