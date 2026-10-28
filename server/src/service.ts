// What the app does: snapshot, log, chat, what-if, reflect, nudges. Engine for numbers, models for words and Bulbu's body.
import {
  achievements, addDays, allImpacts, inventory, lightOf, NEW_WORLD, worldState, classifyApp, costGoal, newlyUnlocked, outfitById, outfitStates, dayKey, fmtDays, fmtMinutes, fmtMoney, forecast, glowFor, impactsOf, insights,
  level, patterns, progressSeries, reactionFor, simulate, streak, swapFor, typicalOrder,
  type Activity, type Category, type Change, type Emote, type Forecast, type Goal, type Impact, type WhatIf,
} from "@bulbu/engine";
import { store, uid, type Fact, type User } from "./db.ts";
import { subtitleOf } from "./goals.ts";
import { parseText, quickActivity } from "./parse.ts";
import { ai, args, complete, CHAT_TOOLS, LOG_ACTIVITIES, PERSONA, SET_BULBU, type Msg, type Part, type ToolCall } from "./ai.ts";

export interface BulbuDirective { emote: Emote; animation: string; glow: number; line: string; via: "spark" | "engine" }

// ------------------------------------------------------------------ snapshot

function todayTask(g: Goal, f: Forecast, acts: Activity[], now: Date) {
  const today = acts.filter(a => dayKey(a.at) === dayKey(now));
  const sum = (cats: Category[], key: "units" | "amount" | "minutes") => today.filter(a => cats.includes(a.category) && (!a.goalId || a.goalId === g.id)).reduce((s, a) => s + (a[key] ?? 0), 0);
  switch (g.template) {
    case "dsa": { const n = Math.max(1, Math.round(f.pace.perDay)); return { label: `Solve ${n} DSA ${n === 1 ? "problem" : "problems"}`, done: sum(["code", "study", "focus"], "units") >= n }; }
    case "reading": return { label: "Read 10 pages", done: sum(["read"], "units") >= 10 };
    case "fitness": return { label: "30 min workout", done: sum(["workout"], "minutes") >= 30 };
    case "savings": case "iphone": { const x = Math.max(50, Math.round(f.pace.perDay / 50) * 50); return { label: `Put aside ${fmtMoney(x)}`, done: sum(["save"], "amount") >= x }; }
    case "learning": return { label: "Watch 1 lecture", done: sum(["study"], "minutes") >= 30 };
    default: return { label: "One 25-min focus session", done: sum(["focus", "study", "code"], "minutes") >= 25 };
  }
}

export function snapshot(userId: string, now = new Date()) {
  const user = store.user(userId);
  if (!user) return null;
  const goals = store.goals(userId), acts = store.activities(userId), facts = store.facts(userId);
  const imps = allImpacts(goals, acts, now);
  const week = insights(goals, acts, now);
  const goalViews = goals.map(g => {
    const f = forecast(g, goals, acts, now);
    return { ...g, subtitle: subtitleOf(g), forecast: f, swap: swapFor(g, f.pace), task: todayTask(g, f, acts, now), series: progressSeries(g, goals, acts, now) };
  });
  const todayActs = acts.filter(a => dayKey(a.at) === dayKey(now)).reverse()
    .map(a => ({ ...a, impacts: imps.filter(i => i.activityId === a.id) }));
  const glow = glowFor(week.netDays);
  const fresh = user.mood && +now - +new Date(user.mood.at) < 6 * 3600_000;
  const emote = (fresh ? user.mood!.emote : week.netDays > 4 ? "drained" : week.netDays < -2 ? "thriving" : "happy") as Emote;
  return {
    user, goals: goalViews, today: todayActs, streak: streak(acts, now), level: level(acts),
    week, glow, emote, patterns: patterns(acts, now), facts,
    nudges: nudges(user, goals, acts, facts, now), achievements: achievements(goals, acts, now),
    outfits: outfitStates(goals, acts, now), letter: user.letter ?? null,
    world: worldState(goals, acts, user.world ?? NEW_WORLD, now),
    inventory: inventory(goals, acts, user.world ?? NEW_WORLD, user.outfit, now),
    ai: { enabled: ai.enabled, models: ai.models }, now: now.toISOString(),
  };
}

// ------------------------------------------------------------------ logging

export interface LogInput {
  text?: string;
  /** data URL of a screenshot, receipt or meal photo */
  image?: string;
  quick?: { category: Category; minutes?: number; amount?: number; units?: number; label?: string; app?: string; goalId?: string };
  source?: Activity["source"];
}

const LINES: Record<Emote, string[]> = {
  drained: ["It's okay, we all get distracted sometimes. One small step now?", "I'm running a little low… want to win the next hour back?"],
  stressed: ["Okay, breathe. One small swap and we're right back on track.", "No stress. Next time, a cheaper swap gets us there sooner."],
  thriving: ["That's {days} closer! I'm so proud of you.", "Look at you go. {days} closer already!"],
  happy: ["Nice! Every small step counts.", "Consistency beats intensity. Nicely done."],
  focused: ["Locked in. Let's keep this going.", "Deep focus mode. I'm right here with you."],
  celebrating: ["WE DID IT! Goal complete!", "You actually did it! Celebration time!"],
};
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
/** When Bulbu wears one of the eight outfits, Spark gets a hint so it sounds a little like that Bulbu. */
const outfitVoice = (user: User) => { const o = outfitById(user.outfit); return o ? `\nToday you are ${o.name}: still Bulbu, but sound like ${o.voice}.` : ""; };

async function parseWithSpark(input: LogInput, goals: Goal[], now: Date, overrides?: User["appKinds"]) {
  const content: Part[] = [];
  if (input.text) content.push({ type: "text", text: input.text });
  if (input.image) content.push({ type: "text", text: "Read this image (screen-time screenshot, receipt, meal, or workout screen) into activities." }, { type: "image_url", image_url: { url: input.image } });
  const msg = await complete({
    messages: [
      { role: "system", content: `Turn the user's day into activities. Now: ${now.toString()}. Goals: ${goals.map(g => `${g.title} (${g.template})`).join(", ")}.
Rules: screen time is per app (label "2h on Instagram", never "Reels" unless the user said Reels). "Skipped X" is not an activity: list it in skipped. Don't guess durations or prices you cannot see or infer; ask instead. Put money in rupees.
Screen time: only distracting apps (social media, video, games) are social_media. Study, coding, reading and fitness apps use study, code, read or workout. Do NOT log phone, messaging, email, calendar, clock, maps, files, payment, banking, crypto, shopping or delivery apps at all. Always set "app" for screen time. Never log screen time without minutes you can actually see: if the screenshot shows only a total, log nothing for those apps and ask for the per-app minutes (e.g. "Open App activity details and share that screen").` },
      { role: "user", content },
    ],
    tools: [LOG_ACTIVITIES], toolChoice: "log_activities",
  });
  const call = msg.tool_calls?.[0];
  if (!call) throw new Error("Spark did not return activities");
  const a = args<{ activities: (Partial<Activity> & { alternative_cost?: number; hours_ago?: number })[]; questions?: string[] }>(call);
  const questions = [...(a.questions ?? [])];
  // screen time is checked against the app list: neutral apps are dropped, study/code/read apps re-filed,
  // and screen time without minutes is never stored (we ask instead)
  const kept: typeof a.activities = [];
  let missingMinutes = false;
  for (const x of a.activities ?? []) {
    if (x.app) {
      const info = classifyApp(x.app, undefined, overrides);
      if (info.kind === "neutral" || !info.category) continue;
      if (!x.minutes || x.minutes <= 0) { missingMinutes = true; continue; }
      kept.push({ ...x, category: info.category, label: `${fmtMinutes(x.minutes)} on ${info.name}` });
    } else kept.push(x);
  }
  if (missingMinutes && !questions.some(q => /minute|how long|activity details/i.test(q)))
    questions.push("How many minutes did you spend on each app? The App activity details screen shows the minutes per app.");
  return {
    activities: kept.map(x => ({
      category: x.category ?? "other", label: x.label ?? "Activity", minutes: x.minutes, amount: x.amount, units: x.units, app: x.app,
      alternativeCost: x.alternative_cost, at: new Date(+now - (x.hours_ago ?? 0) * 3600_000).toISOString(),
    })) as Omit<Activity, "id" | "source">[],
    questions: questions.slice(0, 2),
  };
}

async function reactWithSpark(user: User, impacts: Impact[], acts: Activity[], fallback: BulbuDirective): Promise<BulbuDirective> {
  if (!ai.enabled) return fallback;
  try {
    const msg = await complete({
      maxTokens: 200, tools: [SET_BULBU], toolChoice: "set_bulbu",
      messages: [
        { role: "system", content: PERSONA + outfitVoice(user) },
        { role: "user", content: `${user.name} just logged: ${acts.map(a => a.label).join("; ")}.
Engine results (exact, do not change the numbers): ${impacts.map(i => `${i.goalTitle}: ${fmtDays(i.days)} (${i.equivalent})`).join("; ") || "no goal impact"}.
Suggested reaction: ${fallback.emote}. React through Bulbu's body with set_bulbu.` },
      ],
    });
    const c = msg.tool_calls?.[0];
    if (!c) return fallback;
    const a = args<Partial<BulbuDirective>>(c);
    return { emote: (a.emote as Emote) ?? fallback.emote, animation: a.animation ?? fallback.animation, glow: a.glow ?? fallback.glow, line: a.line ?? fallback.line, via: "spark" };
  } catch (e) { console.warn("[spark] reaction failed:", (e as Error).message); return fallback; }
}

export async function log(userId: string, input: LogInput, now = new Date()) {
  const user = store.user(userId)!, goals = store.goals(userId), history = store.activities(userId);
  let parsed: { activities: Omit<Activity, "id" | "source">[]; questions: string[] }, via: "spark" | "offline" | "quick" = "quick";
  if (input.quick) {
    parsed = { activities: [{ ...quickActivity(input.quick.category, input.quick, now), goalId: input.quick.goalId }], questions: [] };
  } else if (ai.enabled) {
    try { parsed = await parseWithSpark(input, goals, now, user.appKinds); via = "spark"; }
    catch (e) { console.warn("[spark] parse failed:", (e as Error).message); if (!input.text) throw e; parsed = parseText(input.text, goals, history, now); via = "offline"; }
  } else if (input.text) {
    parsed = parseText(input.text, goals, history, now); via = "offline";
  } else {
    return { needsText: true, message: "I can read screenshots once Muse Spark is connected. For now, tell me in a sentence, like “2h on Instagram”." };
  }
  if (!parsed.activities.length)
    return { needsText: true, questions: parsed.questions, message: "I couldn't find an activity in that. Try something like “40 min on Instagram” or “solved 2 problems”." };

  const source = input.source ?? (input.quick ? "quick" : input.image ? "screenshot" : "text");
  const added: Activity[] = parsed.activities.map(a => ({ ...a, id: uid("a_"), source }));
  added.forEach(a => store.putActivity(userId, a));
  const after = [...history, ...added];
  const before = new Map(goals.map(g => [g.id, forecast(g, goals, history, now)]));
  const impacts = added.flatMap(a => impactsOf(goals, after, a, now));
  const forecasts = goals.map(g => ({ goalId: g.id, before: before.get(g.id)!, after: forecast(g, goals, after, now) }));
  const completed = forecasts.some(f => !f.before.done && f.after.done);
  // the swap: for the goal that lost the most today
  const worst = impacts.filter(i => i.days > 0).sort((a, b) => b.days - a.days)[0];
  const wg = worst && goals.find(g => g.id === worst.goalId);
  const swap = wg ? swapFor(wg, forecasts.find(f => f.goalId === wg.id)!.after.pace) : null;

  const r = reactionFor(impacts, added, completed);
  const net = impacts.reduce((s, i) => s + i.days, 0);
  const glow = glowFor(insights(goals, after, now).netDays);
  const fallback: BulbuDirective = { ...r, glow, via: "engine", line: pick(LINES[r.emote]).replace("{days}", fmtDays(net).replace("-", "")) };
  const bulbu = await reactWithSpark(user, impacts, added, fallback);
  store.putUser({ ...user, mood: { emote: bulbu.emote, at: now.toISOString() } });
  const unlocked = newlyUnlocked(goals, history, after, now);
  // Light this log made for Bulbu World, and the world level before/after (for the level-up moment)
  const light = added.reduce((s, a) => s + lightOf(a), 0);
  const save = store.user(userId)?.world ?? NEW_WORLD;
  const lv = { before: worldState(goals, history, save, now).level, after: worldState(goals, after, save, now).level };
  // things this log unlocked in the inventory (a new level or a streak)
  const had = new Set(inventory(goals, history, save, null, now).items.filter(i => i.owned).map(i => i.id));
  const items = inventory(goals, after, save, null, now).items.filter(i => i.owned && !had.has(i.id)).map(i => ({ id: i.id, name: i.name }));
  return { activities: added, impacts, swap, questions: parsed.questions, forecasts, completed, bulbu, via, unlocked, light, worldLevel: lv, items };
}

// ------------------------------------------------------------------ what-if

const N: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, once: 1, twice: 2 };
const n = (s?: string) => s == null ? NaN : N[s.toLowerCase()] ?? Number(s.replace(/[,₹]/g, ""));

/** Offline what-if parser for the common plans. */
export function parseWhatIf(text: string, goals: Goal[], history: Activity[]): { goal: Goal; change: Change } | null {
  const t = text.toLowerCase();
  const saver = goals.find(g => g.kind === "savings" && g.primary) ?? goals.find(g => g.kind === "savings");
  const timeGoal = costGoal(goals, { id: "", at: "", category: "social_media", label: "", source: "text" });
  const per = (m: RegExpMatchArray | null, i: number) => m ? n(m[i]) : NaN;
  let m: RegExpMatchArray | null;
  if (saver && (m = t.match(/cook\w*(?:\s+\w+)*?\s+(\d+|one|two|three|four|five|six|seven)\s*(?:nights?|days?|times?)/))) {
    const save = Math.max(50, Math.round(typicalOrder(history) - 100));
    return { goal: saver, change: { label: `Cook ${m[1]} nights a week instead of ordering`, perWeek: per(m, 1), category: "save", amount: save } };
  }
  if (saver && (m = t.match(/(?:skip|no|stop)\s+(?:ordering|delivery|swiggy|zomato|food delivery)/))) {
    const orders = history.filter(a => a.category === "eat" && +new Date(a.at) > Date.now() - 28 * 86400_000 && (a.amount ?? 0) > 250).length / 4;
    return { goal: saver, change: { label: "Skip delivery orders", perWeek: Math.max(1, Math.round(orders)), category: "save", amount: Math.round(typicalOrder(history) - 100) } };
  }
  if (timeGoal && (m = t.match(/(\d+(?:\.\d+)?|an?|half an?)\s*(h|hours?|hrs?|min(?:utes?)?|m)\s+less\s+(?:time\s+)?(?:on\s+)?(insta\w*|social\s*media|scroll\w*|youtube|reels|phone)/))) {
    const q = m[1].startsWith("half") ? 0.5 : m[1].startsWith("a") ? 1 : Number(m[1]);
    const minutes = m[2].startsWith("h") ? q * 60 : q;
    return { goal: timeGoal, change: { label: `${fmtMinutes(minutes)} less ${m[3].startsWith("insta") ? "Instagram" : m[3]} a day`, perWeek: 7, category: "social_media", minutes, reduce: true } };
  }
  const dsa = goals.find(g => g.template === "dsa");
  if (dsa && (m = t.match(/(?:solve|do)\s+(\d+|one|two|three|four|five)\s+(?:more\s+)?(?:dsa\s+|leetcode\s+)?(?:problems?|questions?)\s+(?:a|per|every)\s+(day|week)/)))
    return { goal: dsa, change: { label: `Solve ${m[1]} more ${n(m[1]) === 1 ? "problem" : "problems"} a ${m[2]}`, perWeek: m[2] === "day" ? 7 : 1, category: "code", units: n(m[1]), minutes: 40 * n(m[1]) } };
  const fit = goals.find(g => g.template === "fitness");
  if (fit && (m = t.match(/(?:work\s?out|gym|walk|run|exercise|yoga)\w*\s+(\d+|one|two|three|four|five|six|seven|once|twice)\s*(?:times?|days?)?\s*(?:a|per|every)?\s*week/)))
    return { goal: fit, change: { label: `Work out ${m[1]}× a week`, perWeek: n(m[1]), category: "workout", units: 1, minutes: 30 } };
  const reading = goals.find(g => g.template === "reading");
  if (reading && (m = t.match(/read\s+(\d+)\s+pages?\s+(?:a|per|every)\s+day/)))
    return { goal: reading, change: { label: `Read ${m[1]} pages a day`, perWeek: 7, category: "read", units: n(m[1]), minutes: n(m[1]) * 2 } };
  if (saver && (m = t.match(/save\s+(?:₹|rs\.?\s*)?([\d,]+)\s*(?:rs|rupees)?\s+(?:a|per|every)\s+(day|week|month)/)))
    return { goal: saver, change: { label: `Save ₹${m[1]} a ${m[2]}`, perWeek: m[2] === "day" ? 7 : m[2] === "week" ? 1 : 7 / 30, category: "save", amount: n(m[1]) } };
  return null;
}

export async function whatIf(userId: string, text: string, now = new Date()): Promise<WhatIf | { error: string }> {
  const goals = store.goals(userId), history = store.activities(userId);
  let plan = parseWhatIf(text, goals, history);
  if (!plan && ai.enabled) {
    try {
      const msg = await complete({ messages: [
        { role: "system", content: `Turn the user's what-if into one simulate_what_if call. Goals: ${goals.map(g => `${g.id}=${g.title} (${g.template}, ${g.unit})`).join("; ")}. Typical delivery order ≈ ₹${Math.round(typicalOrder(history))}.` },
        { role: "user", content: text }], tools: [CHAT_TOOLS[2]], toolChoice: "simulate_what_if" });
      const c = msg.tool_calls?.[0];
      if (c) { const a = args<WhatIfArgs>(c); const g = goals.find(g => g.id === a.goal_id); if (g) plan = { goal: g, change: changeFrom(a) }; }
    } catch (e) { console.warn("[spark] what-if failed:", (e as Error).message); }
  }
  if (!plan) return { error: "Try a plan like “What if I cook 3 nights a week?”, “1 hour less Instagram”, or “solve 2 problems a day”." };
  return simulate(plan.goal, goals, history, now, plan.change) ?? { error: `That change doesn't move ${plan.goal.title}.` };
}

interface WhatIfArgs { goal_id: string; label: string; per_week: number; category: Category; minutes?: number; amount?: number; units?: number; reduce?: boolean }
const changeFrom = (a: WhatIfArgs): Change => ({ label: a.label, perWeek: a.per_week, category: a.category, minutes: a.minutes, amount: a.amount, units: a.units, reduce: a.reduce });

// ------------------------------------------------------------------ chat

function goalsSummary(userId: string, now: Date) {
  const goals = store.goals(userId), acts = store.activities(userId), week = insights(goals, acts, now);
  return {
    goals: goals.map(g => { const f = forecast(g, goals, acts, now); return { id: g.id, title: g.title, progress: `${Math.round(f.progress)} of ${g.target} ${g.unit}`, percent: Math.round(f.percent), pace_per_day: +f.pace.perDay.toFixed(2), goal_date: f.eta, days_left: Math.ceil(f.daysLeft) }; }),
    this_week: { productive: fmtMinutes(week.productiveMinutes), social_media: fmtMinutes(week.socialMinutes), net_impact: week.netDays < 0 ? `${fmtDays(week.netDays).slice(1)} closer` : `${fmtDays(week.netDays).replace("+", "")} later` },
    streak_days: streak(acts, now),
  };
}

export interface ChatOut { reply: string; bulbu?: BulbuDirective; whatIf?: WhatIf; focus?: number; remembered?: string[]; via: "spark" | "offline" }

export async function chat(userId: string, text: string, now = new Date()): Promise<ChatOut> {
  const user = store.user(userId)!;
  store.addMessage(userId, "user", text);
  const out: ChatOut = { reply: "", via: ai.enabled ? "spark" : "offline" };
  if (ai.enabled) {
    try { await chatWithSpark(user, text, now, out); }
    catch (e) { console.warn("[spark] chat failed:", (e as Error).message); out.via = "offline"; await chatOffline(user, text, now, out); }
  } else await chatOffline(user, text, now, out);
  store.addMessage(userId, "assistant", out.reply);
  return out;
}

async function chatWithSpark(user: User, text: string, now: Date, out: ChatOut) {
  const facts = store.facts(user.id).filter(f => f.confidence >= 0.5).map(f => `- [${f.kind}] ${f.text}`).join("\n");
  const history = store.messages(user.id, 13).slice(0, -1).map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
  const messages: Msg[] = [
    { role: "system", content: `${PERSONA}${outfitVoice(user)}\n\nUser: ${user.name}. Now: ${now.toString()}.\nWhat you remember:\n${facts}\nEngine snapshot: ${JSON.stringify(goalsSummary(user.id, now))}` },
    ...history, { role: "user", content: text },
  ];
  for (let round = 0; round < 4; round++) {
    const msg = await complete({ messages, tools: CHAT_TOOLS, maxTokens: 500 });
    if (!msg.tool_calls?.length) { out.reply = msg.content?.trim() || out.bulbu?.line || "I'm here."; return; }
    messages.push({ role: "assistant", content: msg.content, tool_calls: msg.tool_calls });
    for (const c of msg.tool_calls) messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(await runTool(user, c, now, out)) });
  }
  out.reply = out.bulbu?.line ?? "Let's take it one small step at a time.";
}

async function runTool(user: User, c: ToolCall, now: Date, out: ChatOut) {
  switch (c.function.name) {
    case "set_bulbu": {
      const a = args<Partial<BulbuDirective>>(c);
      out.bulbu = { emote: (a.emote ?? "happy") as Emote, animation: a.animation ?? "Idle", glow: a.glow ?? 0.9, line: a.line ?? "", via: "spark" };
      return { ok: true };
    }
    case "get_goals": return goalsSummary(user.id, now);
    case "simulate_what_if": {
      const a = args<WhatIfArgs>(c), goals = store.goals(user.id), g = goals.find(g => g.id === a.goal_id);
      if (!g) return { error: "unknown goal_id" };
      const w = simulate(g, goals, store.activities(user.id), now, changeFrom(a));
      if (w) out.whatIf = w;
      return w ?? { error: "That change does not move this goal." };
    }
    case "remember": {
      const a = args<{ kind: "fact" | "promise"; text: string; check_in_days?: number }>(c);
      remember(user.id, a.kind, a.text, a.check_in_days, now);
      (out.remembered ??= []).push(a.text);
      return { ok: true };
    }
    case "start_focus": out.focus = args<{ minutes?: number }>(c).minutes ?? 25; return { ok: true };
    default: return { error: "unknown tool" };
  }
}

export function remember(userId: string, kind: Fact["kind"], text: string, checkInDays: number | undefined, now = new Date()) {
  const iso = now.toISOString();
  store.putFact(userId, { id: uid("f_"), kind, text, confidence: 1, source: "stated", createdAt: iso, updatedAt: iso,
                          checkAt: kind === "promise" ? addDays(now, checkInDays ?? 3).toISOString() : undefined });
}

async function chatOffline(user: User, text: string, now: Date, out: ChatOut) {
  const t = text.toLowerCase(), s = goalsSummary(user.id, now);
  if (/what if|what happens if|if i /.test(t)) {
    const w = await whatIf(user.id, text, now);
    if ("error" in w) { out.reply = w.error; return; }
    out.whatIf = w;
    out.reply = w.daysSooner > 0 ? `${w.change.label}: you'd reach ${w.goalTitle} ${w.daysSooner} days sooner, around ${fmtDate(w.after.eta)}. Tap the card to see the math.` : `That barely moves ${w.goalTitle}. Want to try a bigger change?`;
    out.bulbu = { emote: w.daysSooner > 0 ? "thriving" : "happy", animation: w.daysSooner > 0 ? "Wave" : "Idle", glow: 1, line: out.reply, via: "engine" };
    return;
  }
  if (/distract|focus|procrastinat|can'?t study|lazy|scroll/.test(t)) {
    out.reply = "It's okay, it happens! Try the 25-5 rule: study for 25 minutes, then take a 5 minute break. Want me to start a focus timer? I'll stay with you.";
    out.focus = 25; out.bulbu = { emote: "focused", animation: "Idle", glow: 0.95, line: "25 minutes. I'll stay with you!", via: "engine" };
    return;
  }
  if (/i('| wi)ll|promise|i want to stop|remind me/.test(t)) {
    remember(user.id, "promise", text.replace(/^i('| wi)ll\s*/i, "").replace(/^./, c => c.toUpperCase()), 3, now);
    out.remembered = [text];
    out.reply = "Got it, I'll remember that and check back in a few days. Small steps!";
    out.bulbu = { emote: "happy", animation: "Wave", glow: 1, line: "Promise saved!", via: "engine" };
    return;
  }
  const best = [...s.goals].sort((a, b) => b.percent - a.percent)[0];
  out.reply = best
    ? `You're ${best.percent}% of the way to ${best.title}, on pace for ${fmtDate(best.goal_date)}. This week's net impact is ${s.this_week.net_impact}. Consistency beats intensity!`
    : "Tell me about your day, or ask “what if I…” and I'll run the numbers.";
  out.bulbu = { emote: "happy", animation: "Idle", glow: 0.9, line: "Consistency beats intensity!", via: "engine" };
}

const fmtDate = (iso: string | null) => iso ? new Date(iso + "T12:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";

// ------------------------------------------------------------------ nightly reflection (memory consolidation)

export async function reflect(userId: string, now = new Date()) {
  const acts = store.activities(userId), facts = store.facts(userId), iso = now.toISOString();
  const found = patterns(acts, now);
  // patterns are recomputed every night; ones that no longer hold fade away
  const live = new Set(found.map(p => `${userId}_p_${p.id}`));
  for (const p of found) {
    const old = facts.find(f => f.id === `${userId}_p_${p.id}`);
    store.putFact(userId, { id: `${userId}_p_${p.id}`, kind: "pattern", text: p.text, detail: p.detail, source: "inferred",
                            confidence: Math.min(0.95, 0.4 + p.samples * 0.08), createdAt: old?.createdAt ?? iso, updatedAt: iso });
  }
  for (const f of facts) {
    if (f.kind === "pattern" && !live.has(f.id)) { const c = f.confidence * 0.7; c < 0.25 ? store.deleteFact(userId, f.id) : store.putFact(userId, { ...f, confidence: c, updatedAt: iso }); }
    if (f.source === "inferred" && f.kind === "fact" && +now - +new Date(f.updatedAt) > 21 * 86400_000) store.putFact(userId, { ...f, confidence: f.confidence * 0.8, updatedAt: iso });
  }
  let letter: string | null = null, via: "wonder" | "engine" = "engine";
  if (ai.enabled) {
    // Muse Wonder reads the whole month in one pass. The history goes first so it stays a cacheable prefix.
    try {
      const csv = acts.map(a => [a.at.slice(0, 16), a.category, a.minutes ?? "", a.amount ?? "", a.units ?? "", a.app ?? "", a.label].join(",")).join("\n");
      const msg = await complete({ model: "wonder", json: true, maxTokens: 1200, messages: [
        { role: "system", content: `${PERSONA}\nYou are doing Bulbu's nightly reflection. Full activity history (at,category,minutes,amount,units,app,label):\n${csv}` },
        { role: "user", content: `Known memory:\n${store.facts(userId).map(f => `- [${f.kind}, ${f.source}, ${f.confidence.toFixed(2)}] ${f.text}`).join("\n")}
Engine-detected patterns: ${found.map(p => p.text + " — " + p.detail).join("; ") || "none"}.
Return JSON: {"facts":[{"text":"...","confidence":0-1}] (new things about the user you are fairly sure of and that are not already known; tendencies, not causes), "letter":"a 3-sentence warm note from the user's future self about this week"}` }] });
      const j = JSON.parse(msg.content ?? "{}") as { facts?: { text: string; confidence: number }[]; letter?: string };
      for (const f of j.facts ?? []) store.putFact(userId, { id: uid("f_"), kind: "fact", text: f.text, confidence: Math.min(0.9, f.confidence), source: "inferred", createdAt: iso, updatedAt: iso });
      letter = j.letter ?? null; via = "wonder";
    } catch (e) { console.warn("[wonder] reflection failed:", (e as Error).message); }
  }
  const u = store.user(userId);
  if (u) store.putUser({ ...u, reflectedAt: iso, ...(letter && { letter: { text: letter, at: iso } }) });
  return { patterns: found, facts: store.facts(userId), letter, via };
}

// ------------------------------------------------------------------ nudges

export interface Nudge { id: string; kind: "usage" | "drift" | "streak" | "promise" | "milestone"; at: string; text: string; emote: Emote; action: { label: string; to: string } }

const QUIET = (d: Date) => { const m = d.getHours() * 60 + d.getMinutes(); return m >= 23 * 60 + 30 || m < 7 * 60; };

/** At most 3 a day, quiet hours respected, fewer of the kinds the user keeps ignoring. Swaps, never guilt. */
export function nudges(user: User, goals: Goal[], acts: Activity[], facts: Fact[], now: Date): Nudge[] {
  const out: Nudge[] = [];
  const today = acts.filter(a => dayKey(a.at) === dayKey(now));
  const iso = now.toISOString();
  const primary = costGoal(goals, { id: "", at: "", category: "social_media", label: "", source: "text" });
  const pf = primary && forecast(primary, goals, acts, now);
  const swap = primary && pf ? swapFor(primary, pf.pace) : null;

  const byApp = new Map<string, number>();
  today.filter(a => a.category === "social_media").forEach(a => byApp.set(a.app ?? "social media", (byApp.get(a.app ?? "social media") ?? 0) + (a.minutes ?? 0)));
  const [app, mins] = [...byApp].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (mins && mins >= 30 && swap)
    out.push({ id: "usage", kind: "usage", at: iso, emote: "drained", text: `${fmtMinutes(mins)} on ${app} today. ${swap.title}: ${swap.detail[0].toLowerCase()}${swap.detail.slice(1)}.`, action: { label: "Start 25-min focus", to: "/focus" } });

  for (const p of patterns(acts, now).filter(p => p.nudgeAt)) {
    const [h, m] = p.nudgeAt!.split(":").map(Number); const at = new Date(now); at.setHours(h, m, 0, 0);
    if (at < now) continue;
    const saver = goals.find(g => g.kind === "savings");
    const text = p.id === "late-code-spend" ? `Coding late tonight? Grab a snack now so the 1 AM order doesn't happen${saver ? `. Your ${saver.title} fund says thanks` : ""}.` : `It's almost ${at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}, when the scrolling usually starts. ${swap ? swap.title + " first?" : "One small step first?"}`;
    out.push({ id: "drift-" + p.id, kind: "drift", at: at.toISOString(), emote: "focused", text, action: { label: "Start 25-min focus", to: "/focus" } });
  }

  const s = streak(acts, now);
  const doneToday = today.some(a => ["study", "code", "read", "workout", "focus", "save"].includes(a.category));
  if (s >= 3 && !doneToday && now.getHours() >= 19)
    out.push({ id: "streak", kind: "streak", at: iso, emote: "happy", text: `Your ${s}-day streak is waiting for one small step today.`, action: { label: "Log something", to: "/log" } });

  for (const f of facts.filter(f => f.kind === "promise" && !f.done && f.checkAt && +new Date(f.checkAt) <= +now + 86400_000))
    out.push({ id: "promise-" + f.id, kind: "promise", at: f.checkAt!, emote: "happy", text: `Checking in: you said you'd “${f.text.toLowerCase()}”. How's it going?`, action: { label: "Chat with Bulbu", to: "/chat" } });

  return out
    .filter(x => !QUIET(new Date(x.at)) || x.kind === "drift")
    .filter(x => (user.ignored?.[x.kind] ?? 0) < 3)
    .slice(0, 3);
}
