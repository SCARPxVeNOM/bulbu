// Realistic 30-day demo histories for two users. Deterministic (seeded random), relative to today, so the demo is
// always "live": a DSA student who loses evenings to Instagram, and a young earner saving for an iPhone.
// The histories carry real patterns for the engine to find: late-night coding -> food orders, weekend food at ~2x,
// short sleep -> less focus, and scrolling that clusters around 11 PM.
import type { Activity, Category, Goal } from "@bulbu/engine";
import { addDays, forecast } from "@bulbu/engine";
import { store, type Fact } from "./db.ts";
import { makeGoal } from "./goals.ts";

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function builder(uid: string, seed: number, now: Date) {
  const r = rng(seed);
  const list: Activity[] = [];
  let n = 0;
  const between = (a: number, b: number) => Math.round(a + r() * (b - a));
  const at = (dayOffset: number, h: number, m = 0) => { const d = addDays(now, -dayOffset); d.setHours(h, m, 0, 0); return d; };
  const add = (d: Date, category: Category, label: string, extra: Partial<Activity> = {}) => {
    if (d > now) return;
    list.push({ id: `${uid}_${n++}`, at: d.toISOString(), category, label, source: "seed", ...extra });
  };
  return { r, between, at, add, list };
}

const weekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

function aryan(now: Date): { goals: Goal[]; acts: Activity[]; facts: Omit<Fact, "id" | "createdAt" | "updatedAt">[] } {
  const created = addDays(now, -31).toISOString();
  const dsa = makeGoal("dsa", { id: "aryan_dsa", primary: true, createdAt: created });
  const read = makeGoal("reading", { id: "aryan_read", createdAt: created });
  const fit = makeGoal("fitness", { id: "aryan_fit", createdAt: created });
  const { r, between, at, add, list } = builder("aryan", 7, now);
  for (let i = 30; i >= 0; i--) {
    const day = at(i, 12), we = weekend(day);
    const lateNight = i % 3 === 1;                  // codes past 1 AM tonight
    const off = i === 13 || i === 22;               // two lost days: the streak restarts after them
    const shortSleep = (i + 1) % 3 === 1 && i < 30; // last night was a late one
    add(at(i, 7, 30), "sleep", shortSleep ? "Slept 5h" : "Slept well", { minutes: shortSleep ? between(280, 340) : between(420, 490), source: "device" });
    if (!off && [1, 3, 5, 6].includes(day.getDay())) { const m = between(25, 45); add(at(i, 7, 10), "workout", m > 35 ? "Gym session" : "Morning walk", { minutes: m, units: 1, goalId: fit.id }); }
    // coding: about one problem an evening, less after a short night, and some evenings lost entirely
    const skipped = off || (i > 1 && r() < 0.1);
    const cm = shortSleep ? between(25, 40) : between(30, 50);
    const solved = shortSleep ? (r() < 0.5 ? 1 : 0) : Math.max(1, Math.round((cm / 60) * 1.5 - 0.2));
    if (!skipped && solved) add(at(i, 19, between(0, 40)), "code", `Solved ${solved} LeetCode ${solved === 1 ? "problem" : "problems"}`, { minutes: cm, units: solved, goalId: dsa.id });
    if (!off && r() < 0.6) { const m = between(15, 35); add(at(i, 22, 10), "read", `Read ${Math.round(m * 0.8)} pages`, { minutes: m, units: Math.round(m * 0.8), goalId: read.id }); }
    // scrolling clusters at 11 PM, plus a lunch-break scroll
    add(at(i, 13, 30), "social_media", "Instagram", { minutes: between(12, 30), app: "Instagram", source: "device" });
    add(at(i, 23, between(0, 25)), "social_media", "Instagram", { minutes: between(we || off ? 60 : 35, we || off ? 150 : 95), app: "Instagram", source: "device" });
    if (r() < 0.35) add(at(i, 21, 0), "social_media", "YouTube", { minutes: between(15, 40), app: "YouTube", source: "device" });
    // food: canteen on weekdays, delivery at weekends
    if (we) add(at(i, 21, 15), "eat", "Swiggy order", { amount: between(320, 520) });
    else if (r() < 0.5) add(at(i, 13, 0), "eat", "Canteen lunch", { amount: between(90, 160) });
    if (lateNight && i > 0) {
      const t = at(i - 1, 1, between(5, 30));
      add(t, "code", "Late-night coding", { minutes: between(40, 70), goalId: dsa.id });
      add(new Date(+t + 40 * 60000), "eat", "Late-night Zomato order", { amount: between(330, 480) });
    }
  }
  dsa.baseline = 0; dsa.baseline = 204 - Math.round(forecast(dsa, [dsa], list, now).progress);
  read.baseline = 520 - list.filter(a => a.goalId === read.id).reduce((s, a) => s + (a.units ?? 0), 0);
  fit.baseline = 30 - list.filter(a => a.goalId === fit.id).length;
  return {
    goals: [dsa, read, fit], acts: list,
    facts: [
      { kind: "fact", text: "Has placement interviews in December", confidence: 0.95, source: "stated" },
      { kind: "fact", text: "Works best late in the evening", confidence: 0.7, source: "inferred", detail: "Most problems get solved after 7 PM." },
      { kind: "fact", text: "Orders food when stressed", confidence: 0.55, source: "inferred" },
      { kind: "promise", text: "Keep Instagram under 1 hour on weekdays", confidence: 1, source: "stated", checkAt: addDays(now, 1).toISOString() },
      { kind: "win", text: "Solved 5 problems in one day for the first time", confidence: 1, source: "inferred" },
    ],
  };
}

function priya(now: Date): ReturnType<typeof aryan> {
  const created = addDays(now, -31).toISOString();
  const phone = makeGoal("iphone", { id: "priya_iphone", primary: true, createdAt: created });
  const fit = makeGoal("fitness", { id: "priya_fit", createdAt: created });
  const { r, between, at, add, list } = builder("priya", 11, now);
  for (let i = 30; i >= 0; i--) {
    const day = at(i, 12), we = weekend(day);
    const lateNight = i % 4 === 2;
    add(at(i, 7, 0), "sleep", "Sleep", { minutes: between(390, 470), source: "device" });
    if ([2, 4, 6].includes(day.getDay())) add(at(i, 18, 30), "workout", "Yoga class", { minutes: between(40, 55), units: 1, goalId: fit.id });
    if (!we || r() < 0.4) add(at(i, 21, 0), "save", "Auto-save to iPhone fund", { amount: between(6, 12) * 25, goalId: phone.id });
    if (!we && r() < 0.55) add(at(i, 13, 15), "eat", "Office lunch", { amount: between(120, 200) });
    if (we) { add(at(i, 13, 30), "eat", "Zomato lunch", { amount: between(280, 420) }); add(at(i, 20, 45), "eat", "Swiggy dinner", { amount: between(350, 600) }); }
    if (r() < 0.3) add(at(i, 17, 0), "spend", "Coffee", { amount: between(180, 300) });
    add(at(i, 22, 30), "social_media", "Instagram", { minutes: between(20, 70), app: "Instagram", source: "device" });
    if (lateNight && i > 0) {
      const t = at(i - 1, 1, between(0, 20));
      add(t, "code", "Side project, late night", { minutes: between(60, 100) });
      add(new Date(+t + 35 * 60000), "eat", "Late-night delivery", { amount: between(320, 460) });
    }
  }
  phone.baseline = 52400 - list.filter(a => a.goalId === phone.id).reduce((s, a) => s + (a.amount ?? 0), 0);
  fit.baseline = 18 - list.filter(a => a.goalId === fit.id).length;
  return {
    goals: [phone, fit], acts: list,
    facts: [
      { kind: "fact", text: "Saving for an iPhone 17 before a birthday in January", confidence: 0.95, source: "stated" },
      { kind: "fact", text: "Gets paid on the 1st of the month", confidence: 0.9, source: "stated" },
      { kind: "fact", text: "Orders food when working late", confidence: 0.6, source: "inferred" },
      { kind: "promise", text: "Skip delivery this weekend", confidence: 1, source: "stated", checkAt: addDays(now, 2).toISOString() },
    ],
  };
}

export const DEMO_USERS = [
  { id: "aryan", name: "Aryan", build: aryan, outfit: "sweater" as const },
  { id: "priya", name: "Priya", build: priya, outfit: "hoodie" as const },
];

export function seed(now = new Date()) {
  for (const u of DEMO_USERS) {
    store.wipeUser(u.id);
    const { goals, acts, facts } = u.build(now);
    store.putUser({ id: u.id, name: u.name, createdAt: addDays(now, -31).toISOString(), demo: true, outfit: u.outfit, theme: "sky" });
    goals.forEach(g => store.putGoal(u.id, g));
    acts.forEach(a => store.putActivity(u.id, a));
    facts.forEach((f, i) => store.putFact(u.id, { ...f, id: `${u.id}_f${i}`, createdAt: addDays(now, -10 + i).toISOString(), updatedAt: now.toISOString() }));
  }
}

export function seedIfEmpty() { if (!store.users().length) seed(); }

if (process.argv.includes("--reset")) { seed(); console.log("Seeded demo users:", DEMO_USERS.map(u => u.name).join(", ")); }
