// Proving a workout without a watch: checking in and out at your gym (the phone's location, both times), or a live
// photo taken in the app (fresh, never reused, checked by Muse Spark). Only the gym's own spot is ever kept.
export interface Spot { lat: number; lng: number }
export interface Fix extends Spot { accuracy?: number; mocked?: boolean }
export interface Gym extends Spot { name: string; radius: number }

/** a gym is about this big: you count as "there" within this many metres of the spot you set */
export const GYM_RADIUS = 150;
/** a gym session counts as a workout after this long */
export const GYM_MIN_MINUTES = 25;
/** the longest a session counts for (someone who forgot to check out) */
export const GYM_MAX_MINUTES = 180;
/** a live photo must have been taken this recently */
export const PHOTO_MAX_AGE_MIN = 10;

/** Distance in metres between two points (haversine). */
export function distanceM(a: Spot, b: Spot): number {
  const R = 6_371_000, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Is this fix at the gym? A little slack for a fuzzy GPS fix (up to 80 m), none for a simulated location. */
export function atGym(f: Fix, g: Gym): { ok: boolean; metres: number; why?: string } {
  const metres = Math.round(distanceM(f, g));
  if (f.mocked) return { ok: false, metres, why: "That location is simulated (a mock-location app is on), so Bulbu can't use it." };
  const slack = Math.min(80, Math.max(0, f.accuracy ?? 0));
  return metres <= g.radius + slack ? { ok: true, metres } : { ok: false, metres, why: `You're about ${metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`} from ${g.name}.` };
}

/** Was the photo taken just now (by its own timestamp)? */
export function freshPhoto(takenAt: number | null, now: Date): { ok: boolean; why?: string } {
  if (!takenAt || !Number.isFinite(takenAt)) return { ok: false, why: "The photo has no time on it. Take it with Bulbu's camera." };
  const age = (+now - takenAt) / 60_000;
  if (age > PHOTO_MAX_AGE_MIN) return { ok: false, why: `That photo is ${Math.round(age)} minutes old. Take a new one at the gym.` };
  if (age < -2) return { ok: false, why: "That photo's time is in the future. Check your phone's clock." };
  return { ok: true };
}
