// Offline parser: a sentence of daily life -> structured activities. Used when no model key is set, and as a
// safety net if the model call fails. Muse Spark does this far better (and reads screenshots); this keeps Bulbu
// working with the Wi-Fi off.
import type { Activity, Category, Goal } from "@bulbu/engine";
import { typicalOrder } from "@bulbu/engine";

export interface Parsed { activities: Omit<Activity, "id" | "source">[]; questions: string[] }

const APPS: [RegExp, string][] = [
  [/\b(insta(gram)?|reels?)\b/i, "Instagram"], [/\b(youtube|yt|shorts)\b/i, "YouTube"], [/\b(twitter|x\.com)\b/i, "X"],
  [/\bsnap(chat)?\b/i, "Snapchat"], [/\bfacebook|\bfb\b/i, "Facebook"], [/\bwhatsapp\b/i, "WhatsApp"], [/\bnetflix\b/i, "Netflix"],
];
const KEYWORDS: [Category, RegExp][] = [
  ["save", /\b(saved|put aside|put away|deposited|transferred .* (fund|savings))\b/i],
  ["focus", /\b(focus(ed)? session|deep work|pomodoro)\b/i],
  ["code", /\b(leetcode|dsa|cod(ed|ing)|solved|problems?|programm(ed|ing)|codeforces|questions?)\b/i],
  ["study", /\b(stud(y|ied|ying)|lectures?|class(es)?|revis(ed|ion)|notes|course|lesson)\b/i],
  ["read", /\b(read|reading|book|pages?|chapter)\b/i],
  ["workout", /\b(gym|work(ed)? ?out|walk(ed)?|ran|run|jog(ged)?|yoga|exercis(e|ed)|cycl(ed|ing)|push-?ups|swim|steps)\b/i],
  ["sleep", /\b(slept|sleep|nap(ped)?)\b/i],
  ["eat", /\b(ordered|order|swiggy|zomato|delivery|biryani|pizza|burger|momos|ate out|takeaway|food|dinner|lunch|snacks?)\b/i],
  ["spend", /\b(bought|spent|shopping|amazon|flipkart|myntra|coffee|movie|uber|ola)\b/i],
];
const DEFAULT_MIN: Partial<Record<Category, number>> = { code: 45, study: 45, read: 20, workout: 30, focus: 25, sleep: 420 };

const num = (s: string) => Number(s.replace(/,/g, ""));
const WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5 };

function duration(s: string): number | undefined {
  let m = 0, hit = false;
  const h = s.match(/(\d+(?:\.\d+)?|an?|one|two|three|four|five|six|half an?)\s*(h|hrs?|hours?)\b/i);
  if (h) { const k = h[1].toLowerCase(); m += 60 * (k.startsWith("half") ? 0.5 : WORDS[k] ?? Number(k)); hit = true; }
  const mm = s.match(/(\d+)\s*(m|mins?|minutes?)\b/i);
  if (mm) { m += Number(mm[1]); hit = true; }
  if (/\bhalf an hour\b/i.test(s) && !hit) { m = 30; hit = true; }
  return hit ? Math.round(m) : undefined;
}

function amount(s: string): number | undefined {
  const a = s.match(/(?:₹|rs\.?|inr)\s*(\d[\d,]*)/i) ?? s.match(/(\d[\d,]*)\s*(?:rs\b|rupees|₹|bucks)/i)
    // "pizza for 450": a bare number after for/of, as long as it isn't a duration or a count
    ?? s.match(/\b(?:for|of|cost|costs|paid)\s+(\d[\d,]*)\b(?!\s*(?:h|hrs?|hours?|m|mins?|minutes?|pages?|problems?|questions?|times?|km|steps)\b)/i);
  return a ? num(a[1]) : undefined;
}

function when(s: string, now: Date): Date {
  const d = new Date(now);
  if (/\blast night\b/i.test(s)) { d.setDate(d.getDate() - 1); d.setHours(23, 0, 0, 0); return d; }
  if (/\byesterday\b/i.test(s)) { d.setDate(d.getDate() - 1); d.setHours(18, 0, 0, 0); }
  if (/\bthis morning\b/i.test(s)) d.setHours(8, 0, 0, 0);
  const t = s.match(/\bat (\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (t) {
    let h = Number(t[1]) % 12; if ((t[3] ?? "").toLowerCase() === "pm" || (!t[3] && h < 7)) h += 12;
    d.setHours(h % 24, Number(t[2] ?? 0), 0, 0);
  }
  return d > now ? now : d;
}

/** Split "Long day, skipped gym and ordered biryani for ₹350" into clauses. */
// "and" splits clauses; "1 hour and 20 min" is first joined into one duration.
const clauses = (text: string) => text
  .replace(/(\d+(?:\.\d+)?\s*(?:h|hrs?|hours?))\s+and\s+(\d+\s*(?:m|mins?|minutes?)\b)/gi, "$1 $2")
  .split(/[,;\n]+|\.(?!\d)|\band then\b|\bthen\b|\band\b/i).map(s => s.trim()).filter(Boolean);

export function parseText(text: string, goals: Goal[], history: Activity[], now = new Date()): Parsed {
  const out: Parsed = { activities: [], questions: [] };
  const hasSavings = goals.some(g => g.kind === "savings");
  for (const c of clauses(text)) {
    if (/^(skipped|didn'?t|did not|no |missed|couldn'?t)/i.test(c)) continue;   // nothing happened; nothing to log
    const at = when(c, now).toISOString();
    const mins = duration(c), money = amount(c);
    const app = APPS.find(([re]) => re.test(c));
    if (app) {
      // usage data is per app: say "Reels" only if the user did
      const label = /\breels?\b/i.test(c) ? "Reels" : app[1];
      if (!mins) out.questions.push(`How long were you on ${app[1]}?`);
      out.activities.push({ at, category: "social_media", app: app[1], label, minutes: mins ?? 30 });
      continue;
    }
    if (/\bcook(ed)?\b/i.test(c) && hasSavings) {
      const saved = Math.max(0, Math.round(typicalOrder(history) - 100));
      out.activities.push({ at, category: "save", label: `Cooked instead of ordering (≈₹${saved} not spent)`, amount: saved });
      continue;
    }
    const cat = KEYWORDS.find(([, re]) => re.test(c))?.[0];
    if (!cat) continue;
    const a: Omit<Activity, "id" | "source"> = { at, category: cat, label: c[0].toUpperCase() + c.slice(1) };
    if (cat === "eat" || cat === "spend" || cat === "save") {
      a.amount = money;
      if (money == null && cat !== "save") out.questions.push(`Roughly how much was “${c}”?`);
      if (money == null && cat === "save") continue;
      if (mins) a.minutes = mins;
    } else {
      a.minutes = mins ?? DEFAULT_MIN[cat];
      const solved = c.match(/(\d+|one|two|three|four|five|a)\s+(?:leetcode\s+|dsa\s+)?(problems?|questions?)/i);
      if (solved) { a.units = WORDS[solved[1].toLowerCase()] ?? Number(solved[1]); a.category = "code"; }
      const pages = c.match(/(\d+)\s*pages?/i);
      if (pages) { a.units = Number(pages[1]); a.category = "read"; }
      if (cat === "workout" && !/\d/.test(c)) a.units = 1;
    }
    out.activities.push(a);
  }
  return out;
}

/** Quick category buttons on the Log screen. */
export function quickActivity(category: Category, o: { minutes?: number; amount?: number; units?: number; label?: string; app?: string }, now = new Date()): Omit<Activity, "id" | "source"> {
  const labels: Partial<Record<Category, string>> = { study: "Study session", code: "Coding", read: "Reading", workout: "Workout", sleep: "Sleep", eat: "Food", social_media: o.app ?? "Social media", spend: "Spent", save: "Put aside", focus: "Focus session", other: "Other" };
  return { at: now.toISOString(), category, label: o.label ?? labels[category]!, minutes: o.minutes ?? DEFAULT_MIN[category], amount: o.amount, units: o.units, app: o.app };
}
