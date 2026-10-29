// Cards: the small real-life moves Bulbu deals each day, three at a time. Playing one (doing it in real life, then
// tapping it) is the move: it clears the Dim from its building, pulls the construction date back, and Bulbu
// celebrates. Each card's effect is the forecasting engine's number for that exact activity, never a guess.
//
// The deck comes from the goals; the deal favours buildings under the Dim, then the Castle, then whatever's furthest
// off. Muse Spark can pick the three and add a personal line (server), but the cards and their numbers come from here.
import type { Activity, Category, Goal, GoalTemplate } from "./types.ts";
import { impactsOf } from "./forecast.ts";
import { kingdom, type BuildingId } from "./kingdom.ts";
import { typicalOrder } from "./whatif.ts";
import { dayKey, fmtMoney } from "./util.ts";

export interface Card {
  /** stable for the day: `${day}:${goalId}:${kind}` */
  id: string;
  /** "Solve 1 problem" */
  title: string;
  /** what doing it looks like: "About 40 minutes" */
  blurb: string;
  /** a personal line from Bulbu (Muse Spark), when it dealt the hand */
  line?: string;
  icon: string;
  goalId: string;
  goalTitle: string;
  building: BuildingId;
  buildingName: string;
  /** the activity it becomes when played */
  activity: Omit<Activity, "id" | "at" | "source">;
  /** how much sooner construction finishes if you do it (days, positive) */
  daysCloser: number;
  /** its building is under the Dim right now, so playing it clears some */
  clears: boolean;
}

interface CardDef { kind: string; title: string; blurb: string; icon: string; category: Category; minutes?: number; units?: number; amount?: number }

/** The moves each kind of goal offers. Small on purpose: things you can do tonight. */
function deck(t: GoalTemplate, history: Activity[]): CardDef[] {
  const cook = Math.max(100, Math.round((typicalOrder(history) - 100) / 50) * 50);
  switch (t) {
    case "dsa": return [
      { kind: "solve1", title: "Solve 1 problem", blurb: "About 40 minutes", icon: "🧩", category: "code", minutes: 40, units: 1 },
      { kind: "solve2", title: "Solve 2 problems", blurb: "About an hour and a half", icon: "⚔️", category: "code", minutes: 80, units: 2 },
      { kind: "revise", title: "Redo one you got stuck on", blurb: "About 30 minutes", icon: "🔁", category: "code", minutes: 30, units: 1 },
    ];
    case "productivity": case "custom": return [
      { kind: "focus25", title: "One 25-minute focus block", blurb: "Phone in another room", icon: "⏳", category: "focus", minutes: 25, units: t === "custom" ? 1 : 25 / 60 },
      { kind: "focus50", title: "Two focus blocks", blurb: "50 minutes, a break between", icon: "🔥", category: "focus", minutes: 50, units: t === "custom" ? 2 : 50 / 60 },
    ];
    case "fitness": return [
      { kind: "walk", title: "Walk 20 minutes", blurb: "Round the block counts", icon: "🚶", category: "workout", minutes: 20, units: 1 },
      { kind: "workout", title: "A 30-minute workout", blurb: "Home or gym", icon: "💪", category: "workout", minutes: 30, units: 1 },
    ];
    case "savings": case "iphone": return [
      { kind: "cook", title: "Cook tonight", blurb: `Instead of ordering: about ${fmtMoney(cook)} kept`, icon: "🍳", category: "save", amount: cook },
      { kind: "put100", title: `Put aside ${fmtMoney(100)}`, blurb: "Straight into the pot", icon: "🪙", category: "save", amount: 100 },
      { kind: "skipcart", title: "Leave the cart for a day", blurb: `About ${fmtMoney(300)} you don't spend`, icon: "🛒", category: "save", amount: 300 },
    ];
    case "reading": return [
      { kind: "pages10", title: "Read 10 pages", blurb: "About 20 minutes", icon: "📖", category: "read", minutes: 20, units: 10 },
      { kind: "pages20", title: "Read 20 pages before bed", blurb: "About 40 minutes", icon: "🌙", category: "read", minutes: 40, units: 20 },
    ];
    case "learning": return [
      { kind: "lecture", title: "Watch 1 lecture", blurb: "About 45 minutes", icon: "🎓", category: "study", minutes: 45, units: 1 },
      { kind: "study30", title: "Study 30 minutes", blurb: "One topic, notes closed after", icon: "📝", category: "study", minutes: 30, units: 1 },
    ];
  }
}

/** Every card the goals offer right now, best first: under the Dim, then the Castle, then furthest off. */
export function candidates(goals: Goal[], history: Activity[], now: Date): Card[] {
  const k = kingdom(goals, history, now), day = dayKey(now);
  const order = [...k.buildings].filter(b => b.building)
    .sort((a, b) => (b.fog - a.fog) || (a.id === "Castle" ? -1 : b.id === "Castle" ? 1 : 0) || (b.daysLeft - a.daysLeft));
  const out: Card[][] = order.map(b => {
    const g = goals.find(x => x.id === b.goalId)!;
    const d = deck(g.template, history);
    // smallest move first (easy to start, quick to clear the Dim); Muse Spark varies the hand from day to day
    return d.map(c => {
      const activity = { category: c.category, label: c.title, minutes: c.minutes, units: c.units, amount: c.amount, goalId: g.id };
      const hit = impactsOf(goals, history, { ...activity, id: "card", at: now.toISOString(), source: "card" }, now).find(i => i.goalId === g.id);
      return {
        id: `${day}:${g.id}:${c.kind}`, title: c.title, blurb: c.blurb, icon: c.icon, goalId: g.id, goalTitle: g.title,
        building: b.id, buildingName: b.name, activity, daysCloser: Math.max(0, -(hit?.days ?? 0)), clears: b.fog > 0.05,
      };
    }).filter(c => c.daysCloser > 0);
  });
  // round-robin: one card per building first, then second picks
  const flat: Card[] = [];
  for (let r = 0; out.some(l => l[r]); r++) for (const l of out) if (l[r]) flat.push(l[r]);
  return flat;
}

/** Today's hand: three cards, one per building where it can be. */
export function deal(goals: Goal[], history: Activity[], now: Date, n = 3): Card[] {
  return candidates(goals, history, now).slice(0, n);
}

/** A dealt card with its numbers brought up to date (the fog and the pace move during the day). */
export function refreshCard(c: Card, goals: Goal[], history: Activity[], now: Date): Card | null {
  const g = goals.find(x => x.id === c.goalId);
  if (!g) return null;
  const b = kingdom(goals, history, now).buildings.find(x => x.goalId === g.id);
  if (!b) return null;
  const hit = impactsOf(goals, history, { ...c.activity, id: "card", at: now.toISOString(), source: "card" }, now).find(i => i.goalId === g.id);
  return { ...c, goalTitle: g.title, building: b.id, buildingName: b.name, daysCloser: Math.max(0, -(hit?.days ?? 0)), clears: b.fog > 0.05 };
}
