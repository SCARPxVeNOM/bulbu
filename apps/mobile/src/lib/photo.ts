// Take or pick a photo and shrink it for the models (they read ~1000 px as well as the original, and uploads stay small).
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export interface Photo { uri: string; data: string; width: number; height: number }

export async function pickPhoto(camera: boolean, maxSide = 1024): Promise<Photo | null> {
  if (camera) {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw new Error("Camera permission was denied. You can choose a photo instead.");
  }
  const r = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 })
                   : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0], w = a.width || maxSide, h = a.height || maxSide;
  const k = Math.min(1, maxSide / Math.max(w, h));
  const out = await manipulateAsync(a.uri, k < 1 ? [{ resize: { width: Math.round(w * k) } }] : [], { compress: 0.86, format: SaveFormat.JPEG, base64: true });
  return { uri: out.uri, data: `data:image/jpeg;base64,${out.base64}`, width: out.width, height: out.height };
}
