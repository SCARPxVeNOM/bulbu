// Demo clans, so clans and clan wars are live from the first run: NODE · BMSITM (with the two demo users and three
// fictional clanmates) against Night Owls (a fictional rival clan). Each fictional member has three weeks of play, a
// few cards played and raids held off this week, so the war score moves. Seeding only adds what's missing: it never
// touches a real user's data, and a demo user only joins NODE if they aren't in a clan already.
import { addDays, dayKey, type Activity, type Goal, type GoalTemplate } from "@bulbu/engine";
import { store, type Clan, type User } from "./db.ts";
import { makeGoal } from "./goals.ts";
import { builder } from "./seed.ts";

interface Npc { id: string; name: string; goals: GoalTemplate[]; outfit: string; seed: number; drive: number }

const NODE: Omit<Clan, "members" | "donations" | "createdAt"> = { id: "clan_node", name: "NODE", college: "BMSITM", emblem: "⚡", color: "#7C6CFF", motto: "Build in public. Ship together.", demo: true };
const OWLS: Omit<Clan, "members" | "donations" | "createdAt"> = { id: "clan_owls", name: "Night Owls", college: "Demo College", emblem: "🦉", color: "#F2635F", motto: "We code after dark.", demo: true };

const NODE_NPCS: Npc[] = [
  { id: "npc_meera", name: "Meera", goals: ["reading", "learning"], outfit: "cozy", seed: 21, drive: 0.8 },
  { id: "npc_kabir", name: "Kabir", goals: ["fitness", "dsa"], outfit: "fit", seed: 22, drive: 0.65 },
  { id: "npc_ishaan", name: "Ishaan", goals: ["productivity"], outfit: "tech", seed: 23, drive: 0.5 },
];
const OWL_NPCS: Npc[] = [
  { id: "npc_rohan", name: "Rohan", goals: ["dsa", "fitness"], outfit: "champ", seed: 31, drive: 0.95 },
  { id: "npc_ananya", name: "Ananya", goals: ["savings", "reading"], outfit: "dream", seed: 32, drive: 0.9 },
  { id: "npc_dev", name: "Dev", goals: ["dsa", "productivity"], outfit: "tech", seed: 33, drive: 0.9 },
  { id: "npc_sneha", name: "Sneha", goals: ["learning", "fitness"], outfit: "grad", seed: 34, drive: 0.9 },
  { id: "npc_tara", name: "Tara", goals: ["dsa", "reading"], outfit: "nature", seed: 35, drive: 0.85 },
];

/** Three weeks of play for a fictional clanmate: good moves most days, some scrolling, a few cards this week. */
function npcHistory(n: Npc, now: Date): { goals: Goal[]; acts: Activity[]; raids: Record<string, { at: string; light: number }> } {
  const created = addDays(now, -22).toISOString();
  const goals = n.goals.map((t, i) => makeGoal(t, { id: `${n.id}_${t}`, primary: i === 0, createdAt: created }));
  const { r, between, at, add, list } = builder(n.id, n.seed, now);
  const week = (now.getDay() + 6) % 7;                       // days since Monday
  for (let i = 21; i >= 0; i--) {
    const go = r() < n.drive, thisWeek = i <= week;
    for (const g of goals) {
      if (!go) continue;
      const card = thisWeek && r() < 0.35 ? { source: "card" as const } : {};
      switch (g.template) {
        case "dsa": add(at(i, 20, between(0, 40)), "code", "Solved problems", { minutes: between(40, 100), units: between(1, 3), goalId: g.id, ...card }); break;
        case "productivity": add(at(i, 10, 0), "focus", "Focus block", { minutes: between(25, 75), goalId: g.id, ...card }); break;
        case "reading": add(at(i, 22, 0), "read", "Reading", { minutes: between(20, 45), units: between(10, 25), goalId: g.id, ...card }); break;
        case "learning": add(at(i, 18, 0), "study", "Lecture", { minutes: between(30, 60), units: 1, goalId: g.id, ...card }); break;
        case "fitness": if (r() < 0.6) add(at(i, 7, 0), "workout", "Workout", { minutes: between(25, 50), units: 1, goalId: g.id, ...card }); break;
        case "savings": case "iphone": add(at(i, 21, 0), "save", "Put aside", { amount: between(4, 12) * 25, goalId: g.id, ...card }); break;
        default: add(at(i, 17, 0), "focus", "Session", { minutes: between(25, 50), units: 1, goalId: g.id, ...card });
      }
    }
    add(at(i, 23, between(0, 20)), "social_media", "Instagram", { minutes: between(15, 80), app: "Instagram", source: "device" });
  }
  // raids held off this week (and one last week)
  const raids: Record<string, { at: string; light: number }> = {};
  for (let i = 1; i <= Math.min(week + 7, 9); i++) if (r() < n.drive * 0.45) { const d = at(i, 23, 30); raids[dayKey(d)] = { at: d.toISOString(), light: 150 }; }
  // a starting point for each goal: somewhere between a quarter and two thirds of the way
  for (const g of goals) g.baseline = Math.round(g.target * (0.25 + r() * 0.4));
  return { goals, acts: list, raids };
}

function ensureNpc(n: Npc, clanId: string, now: Date) {
  if (store.user(n.id)) return;
  const { goals, acts, raids } = npcHistory(n, now);
  const u: User = { id: n.id, name: n.name, createdAt: addDays(now, -22).toISOString(), demo: true, npc: true, clanId, outfit: n.outfit, theme: "sky",
                    world: { spent: 0, gift: 100, tutorial: -1, owned: {}, real: [], raids } };
  store.putUser(u);
  goals.forEach(g => store.putGoal(n.id, g));
  acts.forEach(a => store.putActivity(n.id, a));
}

function ensureClan(def: typeof NODE, members: string[], now: Date) {
  const c = store.clan(def.id) ?? { ...def, members: [], donations: [], createdAt: addDays(now, -30).toISOString() };
  for (const m of members) if (store.user(m) && !c.members.includes(m)) c.members.push(m);
  store.putClan(c);
  return c;
}

/** Add the demo clans and anything they're missing. `reset` re-creates the fictional members (with the demo reset). */
export function seedClans(now = new Date(), reset = false) {
  if (reset) for (const n of [...NODE_NPCS, ...OWL_NPCS]) store.wipeUser(n.id);
  for (const n of NODE_NPCS) ensureNpc(n, NODE.id, now);
  for (const n of OWL_NPCS) ensureNpc(n, OWLS.id, now);
  // the demo users build with NODE, unless they've joined (or left for) another clan
  const demo = ["aryan", "priya"].map(id => store.user(id)).filter((u): u is User => !!u && u.clanId === undefined);
  for (const u of demo) store.putUser({ ...u, clanId: NODE.id });
  const node = ensureClan(NODE, [...demo.map(u => u.id), ...NODE_NPCS.map(n => n.id)], now);
  ensureClan(OWLS, OWL_NPCS.map(n => n.id), now);
  // a little Light already sent round NODE, so the clan feels alive
  if (!node.donations.length) {
    node.donations.push({ from: "npc_meera", to: "npc_kabir", light: 50, at: addDays(now, -1).toISOString() });
    if (node.members.includes("aryan")) node.donations.push({ from: "npc_kabir", to: "aryan", light: 25, at: addDays(now, -2).toISOString() });
    store.putClan(node);
  }
}
