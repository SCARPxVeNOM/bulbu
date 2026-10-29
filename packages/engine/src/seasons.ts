// Seasons: a month in the kingdom, themed by one of the eight Bulbus. Everything good you do this month earns season
// XP (the Light you collect, plus extra for cards played and Dim raids held off), and season XP climbs ten tiers.
// Every tier has a free reward; the Season Pass (₹149 a month) adds a second, bigger one, and its fifth tier is the
// season's own Bulbu. Rewards are collected by tapping, once each.
import type { Activity } from "./types.ts";
import { lightOf, type WorldSave } from "./world.ts";
import { ITEMS, RAID_PIECES } from "./inventory.ts";

export const PASS_PRICE = "₹149";
export const TIERS = 10;
export const XP_PER_TIER = 1000;
export const SEASON_XP = { perCard: 30, perRaid: 60 };

/** The eight Bulbus take turns as the season's theme, one a month. */
const THEMES: { outfit: string; name: string; tagline: string }[] = [
  { outfit: "grad", name: "Season of the Scholar", tagline: "Learning milestones, exams and the next big chapter." },
  { outfit: "fit", name: "Season of the Arena", tagline: "Moving more, one workout at a time." },
  { outfit: "cozy", name: "Season of Quiet Evenings", tagline: "Pages, tea and peaceful, productive nights." },
  { outfit: "champ", name: "Season of Champions", tagline: "Big wins, and a kingdom that keeps choosing well." },
  { outfit: "tech", name: "Season of Builders", tagline: "Code, ship, debug, repeat." },
  { outfit: "nature", name: "Season of Balance", tagline: "Breathing room and steady growth." },
  { outfit: "dream", name: "Season of Dreams", tagline: "The big goal, and reaching higher." },
  { outfit: "party", name: "Season of Celebration", tagline: "Every raid held off, every step worth a party." },
];
/** Season 1 began in August 2026 */
const FIRST = { year: 2026, month: 7 };

export interface Season { id: string; number: number; name: string; tagline: string; outfit: string; outfitName: string; starts: string; ends: string }

export function seasonFor(now: Date): Season {
  const y = now.getFullYear(), m = now.getMonth();
  const number = Math.max(1, (y - FIRST.year) * 12 + (m - FIRST.month) + 1);
  const t = THEMES[(number - 1) % THEMES.length];
  const starts = new Date(y, m, 1), ends = new Date(y, m + 1, 1);
  return { id: `${y}-${String(m + 1).padStart(2, "0")}`, number, name: t.name, tagline: t.tagline, outfit: t.outfit,
           outfitName: ITEMS.find(i => i.id === t.outfit)?.name ?? t.outfit, starts: starts.toISOString(), ends: ends.toISOString() };
}

export type Reward = { kind: "light"; amount: number } | { kind: "piece"; item: string; name: string } | { kind: "item"; item: string; name: string };
const light = (amount: number): Reward => ({ kind: "light", amount });
const piece = (item: string): Reward => ({ kind: "piece", item, name: ITEMS.find(i => i.id === item)?.name ?? item });

/** The ten tiers: a free reward on each, and the pass reward (the season's Bulbu on tier 5, the Golden Crown on 10). */
export function tierRewards(s: Season): { free: Reward; pass: Reward }[] {
  const bulbu: Reward = { kind: "item", item: s.outfit, name: ITEMS.find(i => i.id === s.outfit)?.name ?? s.outfit };
  return [
    { free: light(50), pass: light(150) },
    { free: light(75), pass: piece("cape") },
    { free: piece("cape"), pass: light(200) },
    { free: light(100), pass: piece("cape") },
    { free: light(100), pass: bulbu },
    { free: piece("crown"), pass: light(250) },
    { free: light(125), pass: piece("crown") },
    { free: light(150), pass: piece("crown") },
    { free: piece("crown"), pass: light(300) },
    { free: light(200), pass: { kind: "item", item: "crown", name: ITEMS.find(i => i.id === "crown")!.name } },
  ];
}

export interface SeasonTier { tier: number; xpAt: number; reached: boolean; free: Reward; pass: Reward; freeClaimed: boolean; passClaimed: boolean }
export interface SeasonState extends Season {
  xp: number; tier: number; intoTier: number; daysLeft: number; pass: boolean; price: string;
  tiers: SeasonTier[]; claimable: number;
}

/** Season XP: Light collected this month, plus extra for cards played and Dim raids held off. */
export function seasonXp(history: Activity[], save: WorldSave, s: Season): number {
  const from = +new Date(s.starts), to = +new Date(s.ends), inSeason = (t: string) => +new Date(t) >= from && +new Date(t) < to;
  const acts = history.filter(a => inSeason(a.at));
  return Math.round(acts.reduce((n, a) => n + lightOf(a), 0)
    + acts.filter(a => a.source === "card").length * SEASON_XP.perCard
    + Object.values(save.raids ?? {}).filter(r => inSeason(r.at)).length * SEASON_XP.perRaid);
}

const mine = (save: WorldSave, s: Season) => save.season?.id === s.id ? save.season : { id: s.id, pass: false, free: [] as number[], paid: [] as number[] };

export function seasonState(history: Activity[], save: WorldSave, now: Date): SeasonState {
  const s = seasonFor(now), xp = seasonXp(history, save, s), me = mine(save, s);
  const tier = Math.min(TIERS, Math.floor(xp / XP_PER_TIER));
  const tiers = tierRewards(s).map((r, i): SeasonTier => ({
    tier: i + 1, xpAt: (i + 1) * XP_PER_TIER, reached: tier >= i + 1, ...r,
    freeClaimed: me.free.includes(i + 1), passClaimed: me.paid.includes(i + 1),
  }));
  const claimable = tiers.filter(t => t.reached && (!t.freeClaimed || (me.pass && !t.passClaimed))).length;
  return { ...s, xp, tier, intoTier: tier >= TIERS ? XP_PER_TIER : xp % XP_PER_TIER, daysLeft: Math.max(0, Math.ceil((+new Date(s.ends) - +now) / 86_400_000)),
           pass: me.pass, price: PASS_PRICE, tiers, claimable };
}

/** Turn on the Season Pass for this season. */
export function buyPass(save: WorldSave, now: Date): WorldSave {
  const s = seasonFor(now), me = mine(save, s);
  return { ...save, season: { ...me, pass: true } };
}

/** Collect a tier's reward. */
export function claimTier(history: Activity[], save: WorldSave, now: Date, tier: number, track: "free" | "pass"): { save: WorldSave; reward: Reward } | { error: string } {
  const st = seasonState(history, save, now), t = st.tiers.find(x => x.tier === tier);
  if (!t) return { error: "There's no such tier." };
  if (!t.reached) return { error: `Tier ${tier} needs ${t.xpAt} season XP. You have ${st.xp}.` };
  if (track === "pass" && !st.pass) return { error: "That reward comes with the Season Pass." };
  if (track === "free" ? t.freeClaimed : t.passClaimed) return { error: "Already collected." };
  const reward = track === "free" ? t.free : t.pass, me = mine(save, st);
  let next: WorldSave = { ...save, season: { ...me, free: track === "free" ? [...me.free, tier] : me.free, paid: track === "pass" ? [...me.paid, tier] : me.paid } };
  if (reward.kind === "light") next = { ...next, gift: next.gift + reward.amount };
  if (reward.kind === "item") next = { ...next, owned: { ...(next.owned ?? {}), [reward.item]: Math.max(1, next.owned?.[reward.item] ?? 0) } };
  if (reward.kind === "piece") {
    const have = (next.pieces?.[reward.item] ?? 0) + 1, of = RAID_PIECES[reward.item] ?? 3;
    next = { ...next, pieces: { ...(next.pieces ?? {}), [reward.item]: have }, ...(have >= of && { owned: { ...(next.owned ?? {}), [reward.item]: Math.max(1, next.owned?.[reward.item] ?? 0) } }) };
  }
  return { save: next, reward };
}
