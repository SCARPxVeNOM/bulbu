// Clans, clan wars, Light donations and seasons: the social and monthly layer over the kingdom. The rules live in the
// engine (packages/engine/src/clans.ts, seasons.ts); this file loads the members and saves the results.
import {
  addDays, buyPass, claimTier, claimWar, dayKey, donate, kingdom, NEW_WORLD, pairClans, seasonState, warEnds, warId, warResult,
  weekPlay, weekStart, worldState, type WeekPlay,
} from "@bulbu/engine";
import { store, uid, type Clan, type User } from "./db.ts";

const err = (message: string, status = 400) => Object.assign(new Error(message), { status });
const saveOf = (u: User) => u.world ?? NEW_WORLD;

/** What clanmates can see of each other: buildings, levels and finish dates. Never anyone's scrolling or raw numbers. */
function memberCard(id: string, me: string, now: Date, week = weekStart(now)) {
  const u = store.user(id);
  if (!u) return null;
  const goals = store.goals(id), acts = store.activities(id), save = saveOf(u);
  const k = kingdom(goals, acts, now), w = worldState(goals, acts, save, now);
  const castle = k.buildings.find(b => b.id === "Castle");
  return {
    id, name: u.name, me: id === me, outfit: u.outfit, level: w.level,
    castle: castle ? { goalTitle: castle.goalTitle, level: castle.level, eta: castle.eta, building: castle.building } : null,
    buildings: k.buildings.map(b => ({ id: b.id, name: b.name, level: b.level, eta: b.eta, building: b.building })),
    week: weekPlay(goals, acts, save, now, week),
  };
}

const clanTotal = (c: Clan, now: Date, week = weekStart(now)) =>
  c.members.reduce((s, m) => s + (memberCard(m, "", now, week)?.week.points ?? 0), 0);
const clanBrief = (c: Clan) => ({ id: c.id, name: c.name, college: c.college, emblem: c.emblem, color: c.color, motto: c.motto, members: c.members.length });

/** This week's war (and last week's, if its Light is waiting to be collected). */
function warsFor(c: Clan, me: User, now: Date) {
  const ids = store.clans().filter(x => x.members.length).map(x => x.id);
  const id = warId(now), rivalId = pairClans(ids, id).get(c.id), rival = rivalId && store.clan(rivalId);
  const war = rival ? {
    id, endsAt: warEnds(id).toISOString(), daysLeft: Math.max(0, Math.ceil((+warEnds(id) - +now) / 86_400_000)),
    rival: clanBrief(rival), us: clanTotal(c, now), them: clanTotal(rival, now),
  } : null;
  // last week's war: scored to the end of that week
  const lastId = warId(addDays(now, -7)), lastStart = new Date(lastId + "T00:00:00"), lastEnd = new Date(+warEnds(lastId) - 1);
  const lastRivalId = pairClans(ids, lastId).get(c.id), lastRival = lastRivalId && store.clan(lastRivalId);
  let last = null;
  if (lastRival && +new Date(me.clanJoinedAt ?? c.createdAt) < +warEnds(lastId)) {
    const us = c.members.reduce((s, m) => s + (memberCard(m, "", lastEnd, lastStart)?.week.points ?? 0), 0);
    const them = lastRival.members.reduce((s, m) => s + (memberCard(m, "", lastEnd, lastStart)?.week.points ?? 0), 0);
    const result = warResult(us, them), got = saveOf(me).wars?.[lastId];
    last = { id: lastId, rival: clanBrief(lastRival), us, them, result, collected: !!got, light: got?.light ?? (result === "won" ? 150 : result === "draw" ? 100 : 50) };
  }
  return { war, last };
}

export function clanView(userId: string, now = new Date()) {
  const me = store.user(userId)!;
  const c = me.clanId ? store.clan(me.clanId) : undefined;
  if (!c) return { clan: null, clans: store.clans().map(clanBrief) };
  const members = c.members.map(m => memberCard(m, userId, now)).filter(Boolean) as NonNullable<ReturnType<typeof memberCard>>[];
  members.sort((a, b) => b.week.points - a.week.points);
  const names = new Map(members.map(m => [m.id, m.name]));
  const today = dayKey(now);
  const sentToday = c.donations.filter(d => d.from === userId && dayKey(d.at) === today).reduce((s, d) => s + d.light, 0);
  const { war, last } = warsFor(c, me, now);
  return {
    clan: { ...clanBrief(c), members, war, lastWar: last, sentToday,
      donations: c.donations.slice(-12).reverse().map(d => ({ ...d, fromName: names.get(d.from) ?? "A clanmate", toName: names.get(d.to) ?? "a clanmate" })) },
    clans: store.clans().filter(x => x.id !== c.id).map(clanBrief),
  };
}

/** The bits of the clan the kingdom shows: the war score, and Light clanmates sent since you last looked. */
export function clanBits(u: User, now: Date) {
  const c = u.clanId ? store.clan(u.clanId) : undefined;
  if (!c) return null;
  const { war, last } = warsFor(c, u, now);
  const seen = +new Date(u.giftsSeenAt ?? 0);
  const gifts = c.donations.filter(d => d.to === u.id && +new Date(d.at) > seen)
    .map(d => ({ from: store.user(d.from)?.name ?? "A clanmate", light: d.light, at: d.at }));
  return { id: c.id, name: c.name, emblem: c.emblem, color: c.color, war: war && { us: war.us, them: war.them, rival: war.rival.name, daysLeft: war.daysLeft },
           warToCollect: !!last && !last.collected, gifts };
}

export function seenGifts(userId: string, now = new Date()) {
  const u = store.user(userId)!; store.putUser({ ...u, giftsSeenAt: now.toISOString() });
}

function leaveClan(u: User) {
  const c = u.clanId ? store.clan(u.clanId) : undefined;
  if (c) store.putClan({ ...c, members: c.members.filter(m => m !== u.id) });
}

export function joinClan(userId: string, clanId: string, now = new Date()) {
  const u = store.user(userId)!, c = store.clan(clanId);
  if (!c) throw err("That clan doesn't exist any more.", 404);
  if (u.clanId === clanId) return clanView(userId, now);
  leaveClan(u);
  store.putClan({ ...c, members: [...c.members.filter(m => m !== userId), userId] });
  store.putUser({ ...store.user(userId)!, clanId, clanJoinedAt: now.toISOString() });
  return clanView(userId, now);
}

export function createClan(userId: string, b: { name?: string; college?: string; emblem?: string; color?: string }, now = new Date()) {
  const name = (b.name ?? "").trim().slice(0, 28), college = (b.college ?? "").trim().slice(0, 40);
  if (name.length < 2) throw err("Give the clan a name (2 letters or more).");
  const c: Clan = { id: uid("clan_"), name, college: college || "Independent", emblem: (b.emblem ?? "🏰").slice(0, 4), color: b.color ?? "#3D5BFF",
                    createdAt: now.toISOString(), members: [], donations: [] };
  store.putClan(c);
  return joinClan(userId, c.id, now);
}

export function leave(userId: string, now = new Date()) {
  const u = store.user(userId)!;
  leaveClan(u);
  store.putUser({ ...store.user(userId)!, clanId: null });
  return clanView(userId, now);
}

export function donateLight(userId: string, to: string, light: number, now = new Date()) {
  const me = store.user(userId)!, c = me.clanId ? store.clan(me.clanId) : undefined;
  if (!c) throw err("Join a clan to send Light.");
  if (to === userId) throw err("Send it to a clanmate.");
  if (!c.members.includes(to)) throw err("They're not in your clan.");
  const them = store.user(to)!;
  const myLight = worldState(store.goals(userId), store.activities(userId), saveOf(me), now).light;
  const sentToday = c.donations.filter(d => d.from === userId && dayKey(d.at) === dayKey(now)).reduce((s, d) => s + d.light, 0);
  const out = donate(saveOf(me), saveOf(them), light, myLight, sentToday);
  if ("error" in out) throw err(out.error);
  store.putUser({ ...me, world: out.from });
  store.putUser({ ...them, world: out.to });
  store.putClan({ ...c, donations: [...c.donations, { from: userId, to, light: Math.round(light), at: now.toISOString() }].slice(-200) });
  return clanView(userId, now);
}

export function collectWar(userId: string, now = new Date()) {
  const me = store.user(userId)!, c = me.clanId ? store.clan(me.clanId) : undefined;
  if (!c) throw err("Join a clan to fight clan wars.");
  const { last } = warsFor(c, me, now);
  if (!last) throw err("There's no finished war to collect yet.");
  const out = claimWar(saveOf(me), last.id, last.result);
  if ("error" in out) throw err(out.error);
  store.putUser({ ...me, world: out.save });
  return { light: out.light, result: last.result, view: clanView(userId, now) };
}

/** A clanmate's kingdom, to visit: their buildings, levels and finish dates (and nothing about their scrolling). */
export function visit(userId: string, memberId: string, now = new Date()) {
  const me = store.user(userId)!, them = store.user(memberId);
  if (!them || !me.clanId || them.clanId !== me.clanId) throw err("You can visit clanmates' kingdoms.", 404);
  const goals = store.goals(memberId), acts = store.activities(memberId), k = kingdom(goals, acts, now);
  return {
    id: memberId, name: them.name, outfit: them.outfit, level: worldState(goals, acts, saveOf(them), now).level,
    kingdom: { buildings: k.buildings.map(b => ({ id: b.id, name: b.name, goalTitle: b.goalTitle, level: b.level, building: b.building, eta: b.eta, glow: b.glow, fog: 0 })), plots: k.plots },
    week: weekPlay(goals, acts, saveOf(them), now),
  };
}

// ------------------------------------------------------------------ seasons

export function season(userId: string, now = new Date()) {
  const u = store.user(userId)!;
  return seasonState(store.activities(userId), saveOf(u), now);
}

export function claimSeason(userId: string, tier: number, track: "free" | "pass", now = new Date()) {
  const u = store.user(userId)!;
  const out = claimTier(store.activities(userId), saveOf(u), now, tier, track);
  if ("error" in out) throw err(out.error);
  store.putUser({ ...u, world: out.save });
  return { reward: out.reward, season: season(userId, now) };
}

/** The Season Pass. Payments aren't connected yet, so this turns the pass on as a demo (the app says so). */
export function demoPass(userId: string, now = new Date()) {
  const u = store.user(userId)!;
  store.putUser({ ...u, world: buyPass(saveOf(u), now) });
  return season(userId, now);
}

export type { WeekPlay };
