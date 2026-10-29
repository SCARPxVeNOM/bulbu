// Proving a workout from the phone: where you are (only when you check in or out at your gym) and a live photo from
// Bulbu's camera (never the gallery), with the time from the photo's own EXIF data.
import { Platform } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { Fix, LivePhoto } from "@bulbu/api";

/** The phone's location right now, with Android's "this is simulated" flag. Throws a friendly message if it can't. */
export async function hereNow(): Promise<Fix> {
  const p = await Location.requestForegroundPermissionsAsync();
  if (!p.granted) throw new Error("Bulbu needs location permission to check you in at your gym. It only looks when you tap.");
  const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { lat: l.coords.latitude, lng: l.coords.longitude, accuracy: l.coords.accuracy ?? undefined, mocked: !!l.mocked };
}

/** "2026:10:29 18:42:07" (EXIF, local time) → ms */
function exifTime(exif: Record<string, unknown> | null | undefined): number | null {
  const nested = exif?.["{Exif}"] as Record<string, unknown> | undefined;          // iOS keeps it one level down
  const raw = (exif?.DateTimeOriginal ?? exif?.DateTime ?? nested?.DateTimeOriginal) as string | undefined;
  const m = typeof raw === "string" && raw.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  return m ? +new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
}

/** Take a photo with the camera (no gallery), shrink it for upload, keep the time it was taken. Null if cancelled. */
export async function livePhoto(): Promise<LivePhoto | null> {
  const p = await ImagePicker.requestCameraPermissionsAsync();
  if (!p.granted) throw new Error("Bulbu needs the camera for a live photo.");
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85, exif: true });
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  // a browser has no EXIF from its camera; there the time it was taken is now (the server still checks freshness)
  const takenAt = exifTime(a.exif as Record<string, unknown> | null) ?? (Platform.OS === "web" ? Date.now() : null);
  const k = Math.min(1, 1024 / Math.max(a.width || 1024, a.height || 1024));
  const out = await manipulateAsync(a.uri, k < 1 ? [{ resize: { width: Math.round((a.width || 1024) * k) } }] : [], { compress: 0.8, format: SaveFormat.JPEG, base64: true });
  return { image: `data:image/jpeg;base64,${out.base64}`, takenAt };
}
