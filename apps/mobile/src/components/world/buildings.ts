// How each building in Bulbu's Kingdom looks in the app's 2D UI (its panel, its cards): an icon and two colours.
import type { BuildingId } from "@bulbu/api";

export const BUILDING_ART: Record<BuildingId, { icon: string; colors: [string, string] }> = {
  Castle: { icon: "trophy", colors: ["#FFD27A", "#F59E6B"] },
  Library: { icon: "code", colors: ["#9DB4FF", "#7B5CFF"] },
  Vault: { icon: "save", colors: ["#9BE7C4", "#2EB48A"] },
  Arena: { icon: "workout", colors: ["#FFB3B3", "#F2635F"] },
  Observatory: { icon: "read", colors: ["#B9E3FF", "#4F9DF0"] },
  Workshop: { icon: "other", colors: ["#E7D3B5", "#B98955"] },
};
