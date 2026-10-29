// Bulbu's inventory: everything Bulbu can wear or carry, and how each one is earned.
//   level   unlocks when your XP reaches a world level
//   streak  unlocks with a streak of N days (your best streak counts)
//   light   bought in the shop with Light
//   real    something you actually bought in real life; you add it and Bulbu gets one too
// Anything you own can be levelled up (1 → 3) with Light. Bulbu wears one outfit at a time, and can also hold one
// real-life item that has a 3D model (the iPhone, the iPad) on top of it.
import type { Activity, Goal } from "./types.ts";
import { forecast } from "./forecast.ts";
import { worldState, type RealItem, type WorldSave } from "./world.ts";

/** level: your kingdom level · play: cards played and Dim raids held off · light: the shop · real: bought in real life */
export type ItemSource = "level" | "play" | "light" | "real";

export interface ItemDef {
  id: string;
  name: string;
  tagline: string;
  source: ItemSource;
  /** level needed, streak days needed, or the Light price; 0 for real-life items */
  need: number;
  /** glossy icon used by the apps until there's artwork */
  icon: string;
  /** the 3D outfit Bulbu wears for it (null: not in the 3D model yet) */
  outfit: string | null;
  /** real-life items: words that match what the user bought */
  match?: string[];
  /** real-life items with a 3D model: Bulbu holds it in its hand */
  hold?: boolean;
}

export const MAX_ITEM_LEVEL = 3;
/** shop items that Dim raids drop pieces of, and how many make one (kept in step with raids.ts) */
export const RAID_PIECES: Record<string, number> = { cape: 3, crown: 5 };
/** Light to go from level 1→2 and 2→3 */
export const UPGRADE_COST = [200, 500];

export const ITEMS: ItemDef[] = [
  // ---- unlocked by level (XP)
  { id: "sweater", name: "Cosy Sweater", tagline: "Bulbu's first outfit. Warm, soft and always yours.", source: "level", need: 0, icon: "home", outfit: "sweater" },
  { id: "hoodie", name: "Star Hoodie", tagline: "For a Bulbu who's getting going.", source: "level", need: 2, icon: "sparkles", outfit: "hoodie" },
  { id: "grad", name: "GradBulbu", tagline: "Celebrates learning milestones and motivates you to conquer your academic goals.", source: "level", need: 4, icon: "study", outfit: "grad" },
  { id: "tech", name: "TechBulbu", tagline: "Powers your coding sessions and cheers you toward your next breakthrough.", source: "level", need: 6, icon: "code", outfit: "tech" },
  { id: "dream", name: "DreamBulbu", tagline: "Represents your biggest ambitions and reminds you to keep reaching higher.", source: "level", need: 10, icon: "target", outfit: "dream" },
  // ---- unlocked by playing: cards played and Dim raids held off
  { id: "fit", name: "FitBulbu", tagline: "Keeps you moving, one real-life move at a time.", source: "play", need: 3, icon: "workout", outfit: "fit" },
  { id: "champ", name: "ChampBulbu", tagline: "For a kingdom that keeps choosing well, and the big wins along the way.", source: "play", need: 7, icon: "trophy", outfit: "champ" },
  { id: "nature", name: "NatureBulbu", tagline: "Inspires balanced living, mindful choices, and steady personal growth.", source: "play", need: 14, icon: "sun", outfit: "nature" },
  { id: "party", name: "PartyBulbu", tagline: "Celebrates every raid held off and every step worth being proud of.", source: "play", need: 30, icon: "sparkles", outfit: "party" },
  // ---- the shop (Light)
  { id: "glasses", name: "Star Specs", tagline: "Round glasses with a little star on the side.", source: "light", need: 250, icon: "sun", outfit: null },
  { id: "cozy", name: "CozyBulbu", tagline: "Encourages reading, reflection, and peaceful, productive routines.", source: "light", need: 600, icon: "read", outfit: "cozy" },
  { id: "cape", name: "Hero Cape", tagline: "For days you were your own hero.", source: "light", need: 900, icon: "zap", outfit: null },
  { id: "crown", name: "Golden Crown", tagline: "The rarest thing in the shop.", source: "light", need: 2000, icon: "trophy", outfit: null },
  // ---- real life: you bought it, Bulbu gets one too
  { id: "iphone", name: "iPhone", tagline: "You saved up and got it. Bulbu carries a tiny one now.", source: "real", need: 0, icon: "phone", outfit: null, hold: true, match: ["iphone", "phone", "smartphone", "mobile"] },
  { id: "ipad", name: "iPad", tagline: "A big screen for big plans. Bulbu has one too.", source: "real", need: 0, icon: "phone", outfit: null, hold: true, match: ["ipad", "tablet", "galaxy tab"] },
  { id: "headphones", name: "Headphones", tagline: "Real headphones for you, tiny ones for Bulbu.", source: "real", need: 0, icon: "focus", outfit: null, match: ["headphone", "headphones", "earphones", "earbuds", "airpods", "headset"] },
  { id: "sneakers", name: "Sneakers", tagline: "New running shoes. Bulbu's ready to run too.", source: "real", need: 0, icon: "workout", outfit: null, match: ["shoes", "sneakers", "running shoes", "trainers"] },
  { id: "laptop", name: "Laptop", tagline: "A real machine for real work. Bulbu codes along.", source: "real", need: 0, icon: "code", outfit: null, match: ["laptop", "macbook", "computer", "notebook pc"] },
  { id: "books", name: "Books", tagline: "New books on your shelf, and on Bulbu's.", source: "real", need: 0, icon: "read", outfit: null, match: ["book", "books", "novel", "kindle"] },
  { id: "guitar", name: "Guitar", tagline: "You got the guitar. Bulbu's learning too.", source: "real", need: 0, icon: "sparkles", outfit: null, match: ["guitar", "ukulele", "keyboard", "piano"] },
  { id: "bike", name: "Bicycle", tagline: "Two wheels and fresh air.", source: "real", need: 0, icon: "workout", outfit: null, match: ["bike", "bicycle", "cycle"] },
  { id: "watch", name: "Watch", tagline: "Right on time, both of you.", source: "real", need: 0, icon: "focus", outfit: null, match: ["watch", "smartwatch", "fitbit"] },
];

export interface ItemState extends ItemDef {
  owned: boolean;
  level: number;
  equipped: boolean;
  /** 0..1 toward unlocking (level/streak items) */
  progress: number;
  /** what's needed, in words ("Reach level 4 · you're level 2") */
  detail: string;
  /** shop items: can be bought now */
  affordable: boolean;
  /** Light for the next upgrade, or null at max level / not owned */
  upgradeCost: number | null;
  /** real-life items: when it was added */
  realAt?: string;
  /** real-life items added from a photo: the user's own one */
  mine?: Pick<RealItem, "name" | "color" | "engraving" | "price" | "photo" | "cutout" | "cutState" | "art" | "artState">;
}

export interface Inventory {
  items: ItemState[];
  light: number;
  level: number;
  bestStreak: number;
  /** cards played and Dim raids held off: what unlocks the "play" outfits */
  plays: number;
  equipped: string | null;
  /** the real-life item Bulbu is holding */
  gear: string | null;
}

/** Real-life item a goal unlocks when it's complete (saving for an iPhone gets you the iPhone). */
const GOAL_ITEM: Record<string, string> = { iphone: "iphone" };

/** `equipped` is the outfit Bulbu wears; `gear` the real-life item it holds. */
export function inventory(goals: Goal[], history: Activity[], save: WorldSave, equipped: string | null, now: Date, gear: string | null = null): Inventory {
  const w = worldState(goals, history, save, now);
  const owned = save.owned ?? {}, real = save.real ?? [];
  const plays = playsOf(history, save);
  const fromGoals = new Set(goals.filter(g => GOAL_ITEM[g.template] && forecast(g, goals, history, now).done).map(g => GOAL_ITEM[g.template]));
  const items = ITEMS.map((d): ItemState => {
    const r = real.find(x => x.item === d.id);
    let has = false, progress = 0, detail = "";
    if (d.source === "level") { has = w.level >= d.need || !!owned[d.id]; progress = has ? 1 : d.need ? Math.min(1, w.xp / xpAt(d.need)) : 1; detail = has ? (w.level >= d.need ? "Unlocked by your level" : "Collected in a season") : `Reach level ${d.need} · you're level ${w.level}`; }
    // anything already earned the old way (days in a row) stays yours
    if (d.source === "play") { has = plays >= d.need || w.bestStreak >= d.need || !!owned[d.id]; progress = has ? 1 : Math.min(1, plays / d.need); detail = has ? `Unlocked by playing: ${d.need} cards and raids` : `Play ${d.need} cards or hold off raids · ${plays} so far`; }
    if (d.source === "light") {
      // shop items can also be pieced together from Dim raid loot
      const got = save.pieces?.[d.id] ?? 0, of = RAID_PIECES[d.id];
      has = !!owned[d.id]; progress = Math.max(Math.min(1, w.light / d.need), of ? got / of : 0);
      detail = has ? (of && got >= of ? "Pieced together from raid loot" : "Bought in the shop")
        : got && of ? `${d.need} Light in the shop, or ${of - got} more raid ${of - got === 1 ? "piece" : "pieces"} (${got} of ${of})` : `${d.need} Light in the shop`;
    }
    if (d.source === "real") { has = !!r || fromGoals.has(d.id); progress = has ? 1 : 0; detail = has ? (r ? "You bought the real thing" : "You reached the goal for it") : "Bought it in real life? Add it and Bulbu gets one too"; }
    const level = has ? Math.max(1, Math.min(MAX_ITEM_LEVEL, owned[d.id] ?? 1)) : 0;
    return {
      ...d, owned: has, level, equipped: d.source === "real" ? has && gear === d.id : !!equipped && (equipped === d.id || equipped === d.outfit), progress, detail,
      affordable: d.source === "light" && !has && w.light >= d.need,
      upgradeCost: has && level < MAX_ITEM_LEVEL ? UPGRADE_COST[level - 1] : null,
      ...(r && { realAt: r.at }),
      ...(r && (r.photo || r.name) && { mine: { name: r.name, color: r.color, engraving: r.engraving, price: r.price, photo: r.photo, cutout: r.cutout, cutState: r.cutState, art: r.art, artState: r.artState } }),
    };
  });
  return { items, light: w.light, level: w.level, bestStreak: w.bestStreak, plays, equipped, gear: gear && items.some(i => i.id === gear && i.owned) ? gear : null };
}
const xpAt = (lvl: number) => 50 * lvl * (lvl + 1);

type Result = { save: WorldSave } | { error: string };

export function buyItem(goals: Goal[], history: Activity[], save: WorldSave, id: string, now: Date): Result {
  const inv = inventory(goals, history, save, null, now), it = inv.items.find(i => i.id === id);
  if (!it) return { error: `Unknown item "${id}"` };
  if (it.source !== "light") return { error: `${it.name} isn't sold in the shop. ${it.detail}.` };
  if (it.owned) return { error: `You already have ${it.name}.` };
  if (inv.light < it.need) return { error: `You need ${it.need - inv.light} more Light. Every good choice collects Light.` };
  return { save: { ...save, spent: save.spent + it.need, owned: { ...save.owned, [id]: 1 } } };
}

export function upgradeItem(goals: Goal[], history: Activity[], save: WorldSave, id: string, now: Date): Result {
  const inv = inventory(goals, history, save, null, now), it = inv.items.find(i => i.id === id);
  if (!it) return { error: `Unknown item "${id}"` };
  if (!it.owned) return { error: `Unlock ${it.name} first. ${it.detail}.` };
  if (it.upgradeCost == null) return { error: `${it.name} is already at the top level.` };
  if (inv.light < it.upgradeCost) return { error: `You need ${it.upgradeCost - inv.light} more Light to level up ${it.name}.` };
  return { save: { ...save, spent: save.spent + it.upgradeCost, owned: { ...save.owned, [id]: it.level + 1 } } };
}

/** Match what the user says they bought ("new AirPods") to a real-life item. */
export function matchRealItem(text: string): ItemDef | undefined {
  const t = text.toLowerCase();
  return ITEMS.filter(i => i.source === "real").find(i => i.id === t || i.match?.some(m => t.includes(m)));
}

export function addRealItem(save: WorldSave, item: string, now: Date, o: { price?: number; note?: string; id?: string; extra?: Partial<RealItem> } = {}): Result {
  const def = ITEMS.find(i => i.id === item && i.source === "real") ?? matchRealItem(item);
  if (!def) return { error: `Bulbu doesn't have a "${item}" yet. Try: ${ITEMS.filter(i => i.source === "real").map(i => i.name).join(", ")}.` };
  if ((save.real ?? []).some(r => r.item === def.id)) return { error: `${def.name} is already in Bulbu's inventory.` };
  const r: RealItem = { id: o.id ?? `r_${def.id}_${+now}`, item: def.id, at: now.toISOString(), ...o.extra, ...(o.price && { price: o.price }), ...(o.note && { note: o.note }) };
  return { save: { ...save, real: [...(save.real ?? []), r] } };
}

export const itemById = (id: string | null | undefined) => ITEMS.find(i => i.id === id || (i.outfit && i.outfit === id));

/** Update a real-life item's saved details (e.g. when Muse Image finishes drawing). */
export function updateRealItem(save: WorldSave, item: string, patch: Partial<RealItem>): WorldSave {
  return { ...save, real: (save.real ?? []).map(r => r.item === item ? { ...r, ...patch } : r) };
}

/** Moves played in the kingdom: cards played (each one a move) and Dim raids held off. */
export function playsOf(history: Activity[], save: WorldSave): number {
  return history.filter(a => a.source === "card").length + Object.keys(save.raids ?? {}).length;
}
