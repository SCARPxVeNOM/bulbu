import { test } from "node:test";
import assert from "node:assert/strict";
import type { Goal } from "@bulbu/engine";
import { parseText } from "../src/parse.ts";

const now = new Date(2026, 9, 25, 18, 0);
const goals: Goal[] = [
  { id: "dsa", title: "Crack DSA", template: "dsa", kind: "skill", unit: "problems", target: 300, baseline: 0, createdAt: now.toISOString() },
  { id: "ip", title: "iPhone", template: "iphone", kind: "savings", unit: "₹", target: 79900, baseline: 0, createdAt: now.toISOString() },
];
const pick = (text: string) => parseText(text, goals, [], now).activities.map(a => [a.category, a.minutes ?? null, a.amount ?? null, a.units ?? null]);

test("a voice check-in becomes activities; skipped things are not logged", () => {
  assert.deepEqual(pick("Long day, skipped gym, ordered biryani for ₹380, then solved 2 leetcode problems in 1 hour and read 15 pages"), [
    ["eat", null, 380, null], ["code", 60, null, 2], ["read", 20, null, 15],
  ]);
});

test("screen time is per app; 'Reels' only when the user says it", () => {
  const a = parseText("2h on Instagram", goals, [], now).activities[0];
  assert.equal(a.label, "Instagram"); assert.equal(a.minutes, 120); assert.equal(a.app, "Instagram");
  assert.equal(parseText("40 min of reels", goals, [], now).activities[0].label, "Reels");
});

test("durations: '1 hour and 20 min' stays one duration", () => {
  assert.deepEqual(pick("studied for 1 hour and 20 min"), [["study", 80, null, null]]);
});

test("asks instead of guessing", () => {
  const p = parseText("scrolled youtube, ordered pizza", goals, [], now);
  assert.equal(p.questions.length, 2);
});

test("cooking at home counts toward a savings goal", () => {
  const [a] = parseText("cooked dinner at home", goals, [], now).activities;
  assert.equal(a.category, "save"); assert.equal(a.amount, 300);
});

test("amounts without a currency sign: 'pizza for 450'", () => {
  assert.deepEqual(pick("ordered pizza for 450 and 40 min on youtube"), [["eat", null, 450, null], ["social_media", 40, null, null]]);
  assert.deepEqual(pick("studied for 45 min"), [["study", 45, null, null]]);
});
