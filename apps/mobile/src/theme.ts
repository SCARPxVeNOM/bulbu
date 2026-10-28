// Bulbu's look, carried over from the web app: ice-blue + lavender, frosted white cards, navy type, light-green pills.
import { Platform, type TextStyle, type ViewStyle } from "react-native";

export const C = {
  primary: "#3D5BFF",
  primary2: "#2F45E8",
  violet: "#7B5CFF",
  cyan: "#2FD3F5",
  primarySoft: "#E6EBFF",
  grad: ["#A8F0C8", "#88E6B4", "#6FDBA0"] as const,
  onGrad: "#0F4D33",
  ink: "#141B4D",
  ink2: "#5B6487",
  muted: "#98A0BE",
  line: "#EEF1F9",
  card: "rgba(255,255,255,0.82)",
  cardBorder: "rgba(255,255,255,0.95)",
  red: "#F0465A",
  redSoft: "#FFE9EE",
  green: "#18B37A",
  greenSoft: "#E2F7EE",
  amber: "#F5A524",
  pink: "#EC4F8A",
  stage: "#E9F0FF",
  bg1: "#EEF3FF",
  bg2: "#E4EAFF",
};

/** Themes from the Profile screen; `stage` is the colour behind Bulbu. */
export const THEMES: Record<string, { label: string; stage: string; bg: [string, string]; swatch: [string, string, string] }> = {
  sky: { label: "Sky", stage: "#E9F0FF", bg: ["#EEF3FF", "#E4EAFF"], swatch: ["#BFD3FF", "#E8E2FF", "#FFE4F2"] },
  night: { label: "Starry", stage: "#DCE1FF", bg: ["#E7E7FF", "#D9DCFF"], swatch: ["#2B2F8F", "#5A3FB8", "#B15FD0"] },
  sunset: { label: "Sunset", stage: "#FFEDEA", bg: ["#FFF1EF", "#FBE4F0"], swatch: ["#8E7BFF", "#F59AB6", "#FFC9A8"] },
  aurora: { label: "Aurora", stage: "#E6F7F5", bg: ["#EAFBF7", "#E2ECFF"], swatch: ["#3B49C9", "#7A5BE6", "#B9A4FF"] },
};

export const F = {
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  heavy: "PlusJakartaSans_800ExtraBold",
  regular: "PlusJakartaSans_400Regular",
  wordmark: "Fredoka_700Bold",
};

export const shadow: ViewStyle = Platform.select({
  web: { boxShadow: "0 10px 28px rgba(52,72,190,0.08), 0 1px 2px rgba(52,72,190,0.05)" } as ViewStyle,
  default: { shadowColor: "#3448BE", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
})!;
export const glow: ViewStyle = Platform.select({
  web: { boxShadow: "0 10px 22px rgba(46,180,110,0.28)" } as ViewStyle,
  default: { shadowColor: "#2EB46E", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
})!;

export const T = {
  body: { fontFamily: F.medium, fontSize: 15, lineHeight: 21, color: C.ink } as TextStyle,
  muted: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink2 } as TextStyle,
  small: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 17, color: C.ink2 } as TextStyle,
  tiny: { fontFamily: F.medium, fontSize: 11.5, lineHeight: 15, color: C.muted } as TextStyle,
  b: { fontFamily: F.bold, color: C.ink } as TextStyle,
  title: { fontFamily: F.heavy, fontSize: 21, color: C.ink, letterSpacing: -0.3 } as TextStyle,
  titleL: { fontFamily: F.heavy, fontSize: 25, lineHeight: 30, color: C.ink, letterSpacing: -0.4 } as TextStyle,
  titleXL: { fontFamily: F.heavy, fontSize: 30, lineHeight: 34, color: C.ink, letterSpacing: -0.5 } as TextStyle,
  cardTitle: { fontFamily: F.heavy, fontSize: 16.5, color: C.ink } as TextStyle,
};

export const RADIUS = 20;
