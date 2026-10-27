import { TEMPLATES, type Goal, type GoalTemplate } from "@bulbu/engine";
import { uid } from "./db.ts";

const DEFAULTS: Record<GoalTemplate, { title: string; target: number; subtitle: (t: number) => string }> = {
  dsa:          { title: "Crack DSA",       target: 300,   subtitle: t => `Solve ${t} problems` },
  fitness:      { title: "Get fit",         target: 48,    subtitle: () => "Workout 4× per week" },
  learning:     { title: "Learn something", target: 30,    subtitle: t => `Finish ${t} lessons` },
  savings:      { title: "Savings",         target: 50000, subtitle: t => `Save ₹${t.toLocaleString("en-IN")}` },
  iphone:       { title: "iPhone 17",       target: 79900, subtitle: t => `Save ₹${t.toLocaleString("en-IN")}` },
  reading:      { title: "Read more",       target: 1200,  subtitle: t => `Read ${t.toLocaleString("en-IN")} pages` },
  productivity: { title: "Deep work",       target: 100,   subtitle: t => `${t} focus hours` },
  custom:       { title: "My goal",         target: 30,    subtitle: t => `${t} sessions` },
};

export function makeGoal(template: GoalTemplate, o: Partial<Goal> = {}): Goal {
  const t = TEMPLATES[template], d = DEFAULTS[template];
  return { id: uid("g_"), title: d.title, template, kind: t.kind, unit: t.unit, target: d.target, baseline: 0, createdAt: new Date().toISOString(), ...o };
}

export const subtitleOf = (g: Goal) => (DEFAULTS[g.template] ?? DEFAULTS.custom).subtitle(g.target);
