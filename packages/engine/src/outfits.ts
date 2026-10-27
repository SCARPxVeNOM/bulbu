// The eight Bulbus. Each one is earned by real progress in the ledger (never bought), so wearing one means something.
// Assets (3D outfit, artifact, icon) live in the apps and are looked up by `id`; this file is the logic only.
import type { Activity, Goal } from "./types.ts";
import { forecast } from "./forecast.ts";
import { achievements, streak } from "./insights.ts";
import { dayKey, addDays } from "./util.ts";

export type OutfitId = "grad" | "fit" | "cozy" | "champ" | "tech" | "nature" | "dream" | "party";

export interface OutfitDef {
  id: OutfitId;
  name: string;
  tagline: string;
  /** goal templates this Bulbu belongs to, so the app can suggest the right one */
  templates: Goal["template"][];
  /** how it is earned, in plain words */
  unlock: string;
  /** a hint for Spark so Bulbu sounds a little different in each outfit (still Bulbu's voice) */
  voice: string;
}

export const OUTFITS: OutfitDef[] = [
  { id: "grad", name: "GradBulbu", tagline: "Celebrates learning milestones and motivates you to conquer your academic goals.",
    templates: ["learning", "dsa"], unlock: "Study for 5 hours in total", voice: "a proud study buddy: talks about chapters, revision and the next lecture" },
  { id: "fit", name: "FitBulbu", tagline: "Keeps you moving, building healthy habits one workout at a time.",
    templates: ["fitness"], unlock: "Finish 10 workouts", voice: "an upbeat training partner: short, energetic, counts reps and rest days" },
  { id: "cozy", name: "CozyBulbu", tagline: "Encourages reading, reflection, and peaceful, productive routines.",
    templates: ["reading"], unlock: "Read 200 pages", voice: "calm and warm: talks about pages, tea and quiet evenings" },
  { id: "champ", name: "ChampBulbu", tagline: "Rewards consistency and celebrates the big wins along your journey.",
    templates: [], unlock: "Keep a 7-day streak", voice: "a coach in your corner: celebrates streaks and consistency" },
  { id: "tech", name: "TechBulbu", tagline: "Powers your coding sessions and cheers you toward your next breakthrough.",
    templates: ["dsa", "productivity"], unlock: "Solve 25 coding problems", voice: "a pair-programming buddy: one more test case, ship it, debug together" },
  { id: "nature", name: "NatureBulbu", tagline: "Inspires balanced living, mindful choices, and steady personal growth.",
    templates: ["custom"], unlock: "Have 3 balanced days: something productive and under 30 minutes of social media", voice: "gentle and grounded: balance, breathing room, steady growth" },
  { id: "dream", name: "DreamBulbu", tagline: "Represents your biggest ambitions and reminds you to keep reaching higher.",
    templates: ["savings", "iphone"], unlock: "Get any goal halfway there", voice: "a big-picture dreamer: talks about where the goal leads and reaching higher" },
  { id: "party", name: "PartyBulbu", tagline: "Celebrates achievements, streaks, and every step worth being proud of.",
    templates: [], unlock: "Earn 3 achievements", voice: "pure celebration: confetti energy, but still brief" },
];

export interface OutfitState extends OutfitDef { progress: number; detail: string; unlocked: boolean }

const PRODUCTIVE = new Set(["study", "code", "read", "workout", "focus", "save"]);

/** Progress (0..1) toward every outfit, computed from the ledger. */
export function outfitStates(goals: Goal[], history: Activity[], now: Date): OutfitState[] {
  const sum = (pred: (a: Activity) => boolean, key: "minutes" | "units") => history.filter(pred).reduce((s, a) => s + (a[key] ?? 0), 0);
  const studyMin = sum(a => a.category === "study" || (a.category === "focus" && !a.app), "minutes");
  const workouts = history.filter(a => a.category === "workout").length;
  const pages = sum(a => a.category === "read", "units");
  const problems = sum(a => a.category === "code", "units");
  const best = Math.max(0, ...goals.map(g => forecast(g, goals, history, now).percent));
  const earned = achievements(goals, history, now).filter(a => a.earned).length;
  // balanced days: something productive and under 30 min of distraction, in the last 30 days
  const byDay = new Map<string, { prod: boolean; social: number }>();
  for (const a of history) {
    if (+new Date(a.at) < +addDays(now, -30)) continue;
    const d = byDay.get(dayKey(a.at)) ?? { prod: false, social: 0 };
    if (PRODUCTIVE.has(a.category)) d.prod = true;
    if (a.category === "social_media") d.social += a.minutes ?? 0;
    byDay.set(dayKey(a.at), d);
  }
  const balanced = [...byDay.values()].filter(d => d.prod && d.social < 30).length;
  const longest = Math.max(streak(history, now), longestRun(history));
  const p: Record<OutfitId, [number, string]> = {
    grad: [studyMin / 300, `${Math.floor(studyMin / 60)}h ${Math.round(studyMin % 60)}m of 5h`],
    fit: [workouts / 10, `${workouts} of 10 workouts`],
    cozy: [pages / 200, `${Math.round(pages)} of 200 pages`],
    champ: [longest / 7, `${longest}-day best streak of 7`],
    tech: [problems / 25, `${Math.round(problems)} of 25 problems`],
    nature: [balanced / 3, `${balanced} of 3 balanced days`],
    dream: [best / 50, `best goal ${Math.round(best)}% of 50%`],
    party: [earned / 3, `${earned} of 3 achievements`],
  };
  return OUTFITS.map(o => { const [raw, detail] = p[o.id]; const progress = Math.max(0, Math.min(1, raw)); return { ...o, progress, detail, unlocked: progress >= 1 }; });
}

/** Outfits that became unlocked between two ledgers (for the "new Bulbu unlocked!" moment). */
export function newlyUnlocked(goals: Goal[], before: Activity[], after: Activity[], now: Date): OutfitId[] {
  const was = new Set(outfitStates(goals, before, now).filter(o => o.unlocked).map(o => o.id));
  return outfitStates(goals, after, now).filter(o => o.unlocked && !was.has(o.id)).map(o => o.id);
}

export const outfitById = (id: string | null | undefined) => OUTFITS.find(o => o.id === id);

function longestRun(history: Activity[]) {
  const days = [...new Set(history.filter(a => PRODUCTIVE.has(a.category)).map(a => dayKey(a.at)))].sort();
  let best = 0, run = 0, prev = "";
  for (const d of days) { run = prev && dayKey(addDays(new Date(prev + "T12:00"), 1)) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}
