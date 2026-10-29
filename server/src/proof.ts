// Proving workouts without a watch. Your gym: you set it once (the only place Bulbu keeps), check in when you get
// there and out when you leave; both fixes have to be at the gym (never a simulated location) and 25 minutes apart.
// A live photo: taken with Bulbu's camera, its own timestamp from the last 10 minutes, never used before, and Muse
// Spark has to see a workout in it. Proven workouts count in full in clan wars; reported ones count half.
import crypto from "node:crypto";
import { atGym, freshPhoto, GYM_MAX_MINUTES, GYM_MIN_MINUTES, GYM_RADIUS, type Fix } from "@bulbu/engine";
import { store } from "./db.ts";
import { ai, args, complete, type Tool } from "./ai.ts";
import { applyMoves, type BulbuDirective } from "./service.ts";

const err = (message: string, status = 400) => Object.assign(new Error(message), { status });
const fixOf = (b: Partial<Fix>): Fix => {
  if (!Number.isFinite(b.lat) || !Number.isFinite(b.lng)) throw err("Bulbu needs your location for this.");
  return { lat: Number(b.lat), lng: Number(b.lng), accuracy: Number(b.accuracy) || undefined, mocked: !!b.mocked };
};
const fitnessGoal = (userId: string) => store.goals(userId).find(g => g.template === "fitness");

export function setGym(userId: string, b: Partial<Fix> & { name?: string }, now = new Date()) {
  const f = fixOf(b);
  if (f.mocked) throw err("That location is simulated (a mock-location app is on), so Bulbu can't use it.");
  const u = store.user(userId)!, name = (b.name ?? "").trim().slice(0, 40) || "My gym";
  store.putUser({ ...u, gym: { name, lat: f.lat, lng: f.lng, radius: GYM_RADIUS, setAt: now.toISOString() }, gymVisit: undefined });
  return { gym: store.user(userId)!.gym };
}

export function gymCheckin(userId: string, b: Partial<Fix>, now = new Date()) {
  const u = store.user(userId)!;
  if (!u.gym) throw err("Set your gym first: stand in it and tap \"This is my gym\".");
  const f = fixOf(b), at = atGym(f, u.gym);
  if (!at.ok) throw err(f.mocked ? at.why! : `${at.why} Check in when you're there.`);
  store.putUser({ ...u, gymVisit: { start: now.toISOString(), metres: at.metres } });
  return { visit: store.user(userId)!.gymVisit, gym: u.gym };
}

export async function gymCheckout(userId: string, b: Partial<Fix>, now = new Date()) {
  const u = store.user(userId)!;
  if (!u.gym || !u.gymVisit) throw err("Check in at your gym first.");
  const mins = Math.floor((+now - +new Date(u.gymVisit.start)) / 60_000);
  if (mins < GYM_MIN_MINUTES) throw err(`${mins} ${mins === 1 ? "minute" : "minutes"} so far. ${GYM_MIN_MINUTES} minutes at the gym counts as a workout: keep going!`);
  const f = fixOf(b), at = atGym(f, u.gym);
  if (!at.ok) throw err(f.mocked ? at.why! : `${at.why} Check out while you're still at the gym.`);
  store.putUser({ ...u, gymVisit: undefined });
  const goal = fitnessGoal(userId), minutes = Math.min(GYM_MAX_MINUTES, mins);
  // a workout card in today's hand gets played by the session itself
  const h = store.user(userId)!.hand, card = h?.cards.find(c => c.building === "Arena" && !h.played.includes(c.id));
  if (h && card) store.putUser({ ...store.user(userId)!, hand: { ...h, played: [...h.played, card.id] } });
  const r = await applyMoves(userId, [{ at: u.gymVisit.start, category: "workout", label: `Gym session at ${u.gym.name}`, minutes, units: 1, goalId: goal?.id, proof: "location" }],
    "gym", [], "quick", now, (_i, fb): BulbuDirective => ({ ...fb, emote: "celebrating", animation: "Celebrate", glow: Math.max(fb.glow, 1), via: "engine", line: `${minutes} minutes at the gym, verified! The Arena's rising.` }));
  return { ...r, verified: "location" as const, minutes, card: card?.title ?? null };
}

// ---- live photos

const CHECK_WORKOUT: Tool = { type: "function", function: {
  name: "check_workout_photo",
  description: "Say whether this photo was taken during a workout: inside a gym, a workout at home, a run or a sports field.",
  parameters: { type: "object", required: ["is_workout", "what"], properties: {
    is_workout: { type: "boolean", description: "true only if the photo itself shows a workout setting (gym equipment, a mat with weights, a track, a court, a running route with the person exercising). A screen showing a photo, a meme, or an unrelated room is false." },
    place: { type: "string", enum: ["gym", "home", "outdoors", "other"] },
    what: { type: "string", description: "Max 8 words: what the photo shows, e.g. 'squat rack and dumbbells'" },
  } } } };

/** Check a live workout photo. `ok` means proven; without Muse Spark the photo can't be checked (it counts as reported). */
export async function verifyPhoto(userId: string, image: string, takenAt: number | null, now = new Date()): Promise<{ ok: boolean; what?: string; why?: string }> {
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > 6_000_000) throw err("Send the photo as a JPEG from Bulbu's camera.");
  const fresh = freshPhoto(takenAt, now);
  if (!fresh.ok) throw err(fresh.why!);
  const hash = crypto.createHash("sha256").update(image.slice(image.indexOf(",") + 1)).digest("hex").slice(0, 32);
  const u = store.user(userId)!;
  if (u.photoHashes?.includes(hash)) throw err("You've used this photo before. Take a new one.");
  store.putUser({ ...u, photoHashes: [...(u.photoHashes ?? []), hash].slice(-60) });
  if (!ai.enabled) return { ok: false, why: "Muse Spark isn't connected, so Bulbu can't check the photo. It counts as reported." };
  const msg = await complete({ tools: [CHECK_WORKOUT], toolChoice: "check_workout_photo", maxTokens: 200, messages: [
    { role: "system", content: "You check photos for a workout companion app. Be fair but not gullible." },
    { role: "user", content: [{ type: "text", text: "Is this photo from a workout?" }, { type: "image_url", image_url: { url: image } }] }] });
  const c = msg.tool_calls?.[0];
  if (!c) return { ok: false, why: "Bulbu couldn't check the photo just now. It counts as reported." };
  const a = args<{ is_workout: boolean; place?: string; what: string }>(c);
  if (!a.is_workout) throw err(`Bulbu doesn't see a workout in that one (${a.what || "it looks like something else"}). Try a photo of where you're training.`);
  return { ok: true, what: a.what };
}

/** A workout proven by a live photo (no card). */
export async function gymPhoto(userId: string, image: string, takenAt: number | null, minutes = 30, now = new Date()) {
  const v = await verifyPhoto(userId, image, takenAt, now), goal = fitnessGoal(userId);
  const r = await applyMoves(userId, [{ at: now.toISOString(), category: "workout", label: v.ok ? `Workout (${v.what})` : "Workout", minutes: Math.max(10, Math.min(GYM_MAX_MINUTES, minutes)), units: 1, goalId: goal?.id, ...(v.ok && { proof: "photo" as const }) }],
    "photo", [], "quick", now, v.ok ? (_i, fb): BulbuDirective => ({ ...fb, emote: "celebrating", animation: "Celebrate", glow: Math.max(fb.glow, 1), via: "engine", line: "Workout verified! The Arena's rising." }) : undefined);
  return { ...r, verified: v.ok ? "photo" as const : null, note: v.why ?? null };
}
