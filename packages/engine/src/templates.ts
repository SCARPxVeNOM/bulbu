import type { Category, GoalKind, GoalTemplate, Pace } from "./types.ts";

export interface TemplateDef {
  kind: GoalKind;
  label: string;
  unit: string;
  /** singular noun for equivalents: "DSA problem", "workout", "page" */
  noun: string;
  /** categories that move the goal forward */
  drivers: Category[];
  /** categories whose time or money is an opportunity cost for this goal */
  costs: Category[];
  /** starting pace before there is history */
  pace: Pace;
  /** the small, specific action Bulbu offers as a swap */
  swap: { title: string; category: Category; minutes?: number; units?: number; amount?: number };
}

const P = (perDay: number, perHour = 0, sessionMinutes = 30): Pace => ({ perDay, perHour, sessionMinutes, basedOnDays: 0 });

export const TEMPLATES: Record<GoalTemplate, TemplateDef> = {
  dsa: {
    kind: "skill", label: "DSA / Coding", unit: "problems", noun: "DSA problem",
    drivers: ["code", "study", "focus"], costs: ["social_media"],
    pace: P(1, 1.5), swap: { title: "Solve 1 DSA problem now", category: "code", minutes: 40, units: 1 },
  },
  learning: {
    kind: "skill", label: "Learning", unit: "lessons", noun: "lesson",
    drivers: ["study", "focus"], costs: ["social_media"],
    pace: P(1, 1), swap: { title: "Watch 1 lecture now", category: "study", minutes: 45, units: 1 },
  },
  reading: {
    kind: "skill", label: "Reading", unit: "pages", noun: "page",
    drivers: ["read"], costs: ["social_media"],
    pace: P(15, 30), swap: { title: "Read 10 pages now", category: "read", minutes: 20, units: 10 },
  },
  productivity: {
    kind: "skill", label: "Productivity", unit: "focus hours", noun: "focus hour",
    drivers: ["focus", "study", "code"], costs: ["social_media"],
    pace: P(2, 1), swap: { title: "Start a 25-min focus session", category: "focus", minutes: 25, units: 25 / 60 },
  },
  fitness: {
    kind: "habit", label: "Fitness", unit: "workouts", noun: "workout",
    drivers: ["workout"], costs: [],
    pace: P(4 / 7, 0, 30), swap: { title: "Take a 30-min walk", category: "workout", minutes: 30, units: 1 },
  },
  savings: {
    kind: "savings", label: "Savings", unit: "₹", noun: "rupee",
    drivers: ["save"], costs: ["spend", "eat"],
    pace: P(200), swap: { title: "Cook tonight instead of ordering", category: "save", amount: 300 },
  },
  iphone: {
    kind: "savings", label: "iPhone", unit: "₹", noun: "rupee",
    drivers: ["save"], costs: ["spend", "eat"],
    pace: P(200), swap: { title: "Cook tonight instead of ordering", category: "save", amount: 300 },
  },
  custom: {
    kind: "habit", label: "Custom", unit: "sessions", noun: "session",
    drivers: ["focus", "study"], costs: ["social_media"],
    pace: P(0.5, 1, 30), swap: { title: "Do one 25-min session", category: "focus", minutes: 25, units: 1 },
  },
};

export const def = (t: GoalTemplate) => TEMPLATES[t] ?? TEMPLATES.custom;
