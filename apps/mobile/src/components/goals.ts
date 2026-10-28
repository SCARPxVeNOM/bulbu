import type { GoalTemplate, GoalView } from "@bulbu/api";
import { fmtDays, fmtMoney, fmtNum, type Step } from "@bulbu/engine";
import type { LiquidScheme } from "./LiquidProgressBar";
import { fmtDate } from "@/lib/format";

export const TEMPLATES: [GoalTemplate, string][] = [
  ["dsa", "DSA / Coding"], ["fitness", "Fitness"], ["learning", "Learning"], ["savings", "Savings"],
  ["iphone", "iPhone"], ["reading", "Reading"], ["productivity", "Productivity"], ["custom", "Custom"],
];
export const DETAILS: Record<GoalTemplate, { title: string; target: number; targetLabel: string; baseLabel: string }> = {
  dsa: { title: "Crack DSA", target: 300, targetLabel: "Problems to solve", baseLabel: "Already solved" },
  fitness: { title: "Get fit", target: 48, targetLabel: "Workouts (4× a week for 12 weeks)", baseLabel: "Done so far" },
  learning: { title: "Learn something new", target: 30, targetLabel: "Lessons", baseLabel: "Already done" },
  savings: { title: "Savings", target: 50000, targetLabel: "Amount to save (₹)", baseLabel: "Saved so far (₹)" },
  iphone: { title: "iPhone 17", target: 79900, targetLabel: "Price (₹)", baseLabel: "Saved so far (₹)" },
  reading: { title: "Read more", target: 1200, targetLabel: "Pages", baseLabel: "Already read" },
  productivity: { title: "Deep work", target: 100, targetLabel: "Focus hours", baseLabel: "Done so far" },
  custom: { title: "", target: 30, targetLabel: "Sessions", baseLabel: "Done so far" },
};
/** Where a goal's daily task takes you on the Log screen. */
export const TASK_LOG: Record<string, string> = {
  dsa: "code", reading: "read", fitness: "workout", savings: "save", iphone: "save", learning: "study", productivity: "focus", custom: "focus",
};
export const EXTRAS: Record<string, string[]> = {
  dsa: ["Revise a previous problem", "Watch 1 lecture (optional)"], reading: ["Note one idea you liked"], fitness: ["Stretch for 5 min"],
  savings: ["Skip one delivery order"], iphone: ["Skip one delivery order"], learning: ["Review yesterday's notes"], productivity: ["Plan tomorrow's first task"], custom: [],
};
export const schemeFor = (g: GoalView): LiquidScheme => g.template === "reading" ? "reading" : g.template === "fitness" ? "fitness" : "dsa";
const money = (g: GoalView) => g.kind === "savings";
export const isMoney = money;
export const fmtUnits = (g: GoalView, n: number) => money(g) ? fmtMoney(n) : `${fmtNum(n)} ${g.unit}`;

export function paceSteps(g: GoalView): Step[] {
  const f = g.forecast, p = f.pace;
  const s: Step[] = [
    { label: "Progress", value: `${fmtUnits(g, f.progress)} of ${fmtUnits(g, g.target)}` },
    { label: "Remaining", value: fmtUnits(g, f.remaining) },
    { label: "Your pace", value: `${fmtUnits(g, p.perDay)} a day${p.basedOnDays >= 7 ? ` (your last ${p.basedOnDays} days)` : " (starting estimate, blends in your history over the first week)"}` },
  ];
  if (g.kind === "skill") s.push({ label: "Per focused hour", value: fmtUnits(g, p.perHour) });
  const todayCost = f.daysLeft - f.remaining / p.perDay;
  if (Math.abs(todayCost) > 0.05) s.push({ label: "Today's choices", value: fmtDays(todayCost) });
  s.push({ label: "Goal date", value: `${fmtUnits(g, f.remaining)} ÷ ${fmtUnits(g, p.perDay)}${Math.abs(todayCost) > 0.05 ? ` ${fmtDays(todayCost).replace(/^([+-])/, "$1 ")}` : ""} ≈ ${Math.ceil(f.daysLeft)} days → ${fmtDate(f.eta)}` });
  return s;
}
