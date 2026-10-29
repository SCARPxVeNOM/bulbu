// Bulbu's original glossy glyphs (drawn on a 64×64 grid), shared with the web app's GlossyIcon.
import type { ReactNode } from "react";
import { Circle, Ellipse, G as Group, Path, Rect } from "react-native-svg";
const G_ = Group;
type Paint = { fill: string; accent: string; deep: string };
type Glyph = (p: Paint) => ReactNode;

/** Tile material per icon: light top, saturated bottom, accent for inner details. */
export const TONE = {
  blue: ["#7D97FF", "#3D5BFF", "#2338C9"], violet: ["#B29BFF", "#6A4DF0", "#4A2FC4"], mint: ["#6FE6BC", "#17B07A", "#0B7F57"],
  coral: ["#FF9AAE", "#F0466B", "#C22A4E"], orange: ["#FFC977", "#F5902A", "#C46810"], pink: ["#FF9BD0", "#E0458F", "#B02A6B"],
  indigo: ["#8E9BFF", "#4B4FD8", "#2E2FA6"], teal: ["#6EDCF5", "#2A9FD6", "#1A75A8"], green: ["#8FE8B4", "#2FB577", "#1C8655"],
  amber: ["#FFD47E", "#F2A51E", "#BD7A08"], gold: ["#FFE08A", "#F5A524", "#C27A0B"], red: ["#FF9B8F", "#F0465A", "#BF2638"],
  sun: ["#FFE98C", "#F7B52C", "#C98608"], slate: ["#C3CAE6", "#828DBA", "#5B6591"], navy: ["#5A68A0", "#1E2752", "#121838"],
  grey: ["#DCE1F0", "#AEB5CF", "#878FAD"],
} as const;
export type Tone = keyof typeof TONE;

export const G: Record<string, { tone: Tone; accent?: string; draw: Glyph }> = {
  study: { tone: "blue", accent: "#FFD66B", draw: ({ fill, accent }) => <>
    <Path d="M32 15 54 25.5 32 36 10 25.5Z" fill={fill} />
    <Path d="M20 31v8.5c0 4.2 5.6 7.5 12 7.5s12-3.3 12-7.5V31l-12 5.7Z" fill={fill} />
    <Rect x="48.6" y="26" width="2.6" height="12" rx="1.3" fill={accent} /><Circle cx="49.9" cy="40.2" r="2.9" fill={accent} />
  </> },
  read: { tone: "mint", draw: ({ fill, deep }) => <>
    <Path d="M31 21.5c-5.6-3.6-12.6-4.4-19-3.6v27.4c6.4-.8 13.4 0 19 3.6Z" fill={fill} />
    <Path d="M33 21.5c5.6-3.6 12.6-4.4 19-3.6v27.4c-6.4-.8-13.4 0-19 3.6Z" fill={fill} />
    <Path d="M16.5 25.5c3.6-.2 7.4.4 10.6 1.9M16.5 31c3.6-.2 7.4.4 10.6 1.9M37 27.4c3.2-1.5 7-2.1 10.6-1.9M37 32.9c3.2-1.5 7-2.1 10.6-1.9" stroke={deep} strokeOpacity=".3" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </> },
  workout: { tone: "coral", draw: ({ fill }) => <>
    <Rect x="21" y="29.3" width="22" height="5.4" rx="2.7" fill={fill} />
    <Rect x="15.5" y="19.5" width="8" height="25" rx="3.6" fill={fill} /><Rect x="40.5" y="19.5" width="8" height="25" rx="3.6" fill={fill} />
    <Rect x="9.5" y="24" width="6.5" height="16" rx="3" fill={fill} /><Rect x="48" y="24" width="6.5" height="16" rx="3" fill={fill} />
  </> },
  code: { tone: "violet", draw: ({ fill }) => <>
    <Path d="M24 20.5 12.5 32 24 43.5M40 20.5 51.5 32 40 43.5" stroke={fill} strokeWidth="6.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Path d="M35.6 17.5 28.4 46.5" stroke={fill} strokeWidth="5" strokeLinecap="round" />
  </> },
  sleep: { tone: "indigo", accent: "#FFE8A3", draw: ({ fill, accent }) => <>
    <Path d="M36.5 14.2A18 18 0 1 0 49.8 40.6 14.6 14.6 0 0 1 36.5 14.2Z" fill={fill} />
    <Path d="M46 15.5c.5 3 1.8 4.3 4.8 4.8-3 .5-4.3 1.8-4.8 4.8-.5-3-1.8-4.3-4.8-4.8 3-.5 4.3-1.8 4.8-4.8Z" fill={accent} />
    <Circle cx="53" cy="28.5" r="1.6" fill={accent} />
  </> },
  eat: { tone: "orange", draw: ({ fill }) => <>
    <Path d="M24.5 23.5c-2.6-3 2.6-4.6 0-8.5M32 23.5c-2.6-3 2.6-4.6 0-8.5M39.5 23.5c-2.6-3 2.6-4.6 0-8.5" stroke={fill} strokeWidth="3" strokeLinecap="round" fill="none" opacity=".9" />
    <Rect x="9.5" y="28.5" width="45" height="5.2" rx="2.6" fill={fill} />
    <Path d="M12.5 33.7h39C50.4 42.6 42.2 49 32 49s-18.4-6.4-19.5-15.3Z" fill={fill} />
    <Rect x="24.5" y="48.2" width="15" height="3.4" rx="1.7" fill={fill} />
  </> },
  social_media: { tone: "pink", draw: ({ fill, deep }) => <>
    <Path d="M15 16.5h34a6.5 6.5 0 0 1 6.5 6.5v16a6.5 6.5 0 0 1-6.5 6.5H31l-10.5 7.5v-7.5H15A6.5 6.5 0 0 1 8.5 39V23a6.5 6.5 0 0 1 6.5-6.5Z" fill={fill} />
    <Path d="M32 39c-6.2-3.8-9.7-7-9.7-10.9 0-2.7 2.1-4.8 4.7-4.8 2.1 0 3.9 1.2 5 3 1.1-1.8 2.9-3 5-3 2.6 0 4.7 2.1 4.7 4.8 0 3.9-3.5 7.1-9.7 10.9Z" fill={deep} />
  </> },
  other: { tone: "slate", draw: ({ fill }) => <><Circle cx="19" cy="32" r="4.6" fill={fill} /><Circle cx="32" cy="32" r="4.6" fill={fill} /><Circle cx="45" cy="32" r="4.6" fill={fill} /></> },
  focus: { tone: "teal", draw: ({ fill, deep }) => <>
    <Rect x="27.5" y="11.5" width="9" height="5.5" rx="2.4" fill={fill} /><Rect x="44.5" y="18.5" width="5" height="5" rx="2" transform="rotate(45 47 21)" fill={fill} />
    <Circle cx="32" cy="35" r="16" fill={fill} />
    <Path d="M32 35V25.5" stroke={deep} strokeWidth="3.6" strokeLinecap="round" /><Path d="M32 35l6 3.5" stroke={deep} strokeWidth="3.2" strokeLinecap="round" /><Circle cx="32" cy="35" r="2.6" fill={deep} />
  </> },
  save: { tone: "green", draw: ({ fill, deep }) => <>
    {[38, 30.5, 23].map(y => <G_ key={y}><Path d={`M17 ${y}v6c0 3 6.7 5.4 15 5.4s15-2.4 15-5.4v-6`} fill={fill} /><Ellipse cx="32" cy={y} rx="15" ry="5.4" fill={fill} /><Ellipse cx="32" cy={y} rx="15" ry="5.4" fill="none" stroke={deep} strokeOpacity=".25" strokeWidth="1.4" /></G_>)}
    <Path d="M28.5 21.2h7M28.5 23.4h7M30 21.2c2.8 0 2.8 4.4 0 4.4l4.4 3" stroke={deep} strokeOpacity=".55" strokeWidth="1.3" strokeLinecap="round" fill="none" />
  </> },
  spend: { tone: "amber", draw: ({ fill, deep }) => <>
    <Path d="M14 19.5 40 13c2.5-.6 4.6 1.2 4.6 3.6V20" fill={fill} opacity=".85" />
    <Rect x="10.5" y="19.5" width="43" height="29" rx="7" fill={fill} />
    <Rect x="36.5" y="28.5" width="19" height="11" rx="5.5" fill={deep} opacity=".35" /><Circle cx="43" cy="34" r="2.6" fill={fill} />
  </> },
  target: { tone: "red", draw: ({ fill, deep }) => <>
    <Circle cx="30" cy="34" r="17.5" fill={fill} /><Circle cx="30" cy="34" r="11.5" fill={deep} opacity=".55" /><Circle cx="30" cy="34" r="6.8" fill={fill} /><Circle cx="30" cy="34" r="2.8" fill={deep} />
    <Path d="M30.5 33.5 47 17" stroke={fill} strokeWidth="3.6" strokeLinecap="round" />
    <Path d="M45 14.5v6.5h6.5M48.5 11.5v6.5H55" stroke={fill} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </> },
  trophy: { tone: "gold", draw: ({ fill, deep }) => <>
    <Path d="M21 19.5h-5.5c0 7.5 3 11 8 11.5M43 19.5h5.5c0 7.5-3 11-8 11.5" stroke={fill} strokeWidth="3.6" strokeLinecap="round" fill="none" />
    <Path d="M20.5 14.5h23v12c0 6.8-5.1 12.3-11.5 12.3s-11.5-5.5-11.5-12.3Z" fill={fill} />
    <Rect x="29.3" y="37.5" width="5.4" height="6.5" fill={fill} /><Rect x="21.5" y="43.5" width="21" height="6" rx="2.6" fill={fill} />
    <Path d="m32 19.6 1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6Z" fill={deep} opacity=".7" />
  </> },
  flame: { tone: "orange", accent: "#FFE07A", draw: ({ fill, accent }) => <>
    <Path d="M32 11c2.2 7.6 13 12.4 13 25.2C45 44.4 39.2 51 32 51s-13-6.6-13-14.8c0-7.4 4.4-10.6 6.5-15.6 1.2 4.2 3 6.4 5.4 6.6.2-5.4-.9-10.6 1.1-16.2Z" fill={fill} />
    <Path d="M32 32.5c2.4 4.2 6.6 5.6 6.6 10.6 0 3.9-3 6.9-6.6 6.9s-6.6-3-6.6-6.9c0-4.6 4.4-6.4 6.6-10.6Z" fill={accent} />
  </> },
  sun: { tone: "sun", draw: ({ fill }) => <>
    <Circle cx="32" cy="32" r="9.5" fill={fill} />
    {Array.from({ length: 8 }, (_, i) => <Rect key={i} x="30" y="11.5" width="4" height="8" rx="2" fill={fill} transform={`rotate(${i * 45} 32 32)`} />)}
  </> },
  shield: { tone: "indigo", draw: ({ fill, deep }) => <>
    <Path d="M32 10.5 49.5 17v13.5c0 11.4-7.4 19.6-17.5 23.5-10.1-3.9-17.5-12.1-17.5-23.5V17Z" fill={fill} />
    <Path d="M32 18.5 42.5 22.4v8.4c0 6.9-4.4 12-10.5 14.6Z" fill={deep} opacity=".35" />
    <Path d="m32 22.5 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8Z" fill={deep} opacity=".6" />
  </> },
  ban: { tone: "red", draw: ({ fill }) => <><Circle cx="32" cy="32" r="15.5" stroke={fill} strokeWidth="6" fill="none" /><Path d="M21.5 21.5l21 21" stroke={fill} strokeWidth="6" strokeLinecap="round" /></> },
  lock: { tone: "grey", draw: ({ fill, deep }) => <>
    <Path d="M24 30v-6a8 8 0 0 1 16 0v6" stroke={fill} strokeWidth="5" fill="none" />
    <Rect x="17.5" y="28.5" width="29" height="22" rx="6" fill={fill} /><Circle cx="32" cy="37.8" r="3.2" fill={deep} /><Rect x="30.6" y="38.5" width="2.8" height="6" rx="1.4" fill={deep} />
  </> },
  phone: { tone: "navy", accent: "#8FA2FF", draw: ({ fill, accent }) => <>
    <Rect x="20.5" y="10.5" width="23" height="43" rx="6.5" fill={fill} /><Rect x="23.5" y="16.5" width="17" height="29" rx="3" fill={accent} opacity=".55" />
    <Rect x="28.5" y="13" width="7" height="1.8" rx=".9" fill={accent} opacity=".7" /><Circle cx="32" cy="49.4" r="1.8" fill={accent} opacity=".7" />
  </> },
  zap: { tone: "coral", draw: ({ fill }) => <Path d="M36.5 10 17.5 36.5h12.5L26.5 54l20-27.5H34Z" fill={fill} strokeLinejoin="round" /> },
  plus: { tone: "blue", draw: ({ fill }) => <><Rect x="28.8" y="15" width="6.4" height="34" rx="3.2" fill={fill} /><Rect x="15" y="28.8" width="34" height="6.4" rx="3.2" fill={fill} /></> },
  home: { tone: "blue", draw: ({ fill, deep }) => <>
    <Path d="M11.5 30.5 30 14.6a3 3 0 0 1 4 0l18.5 15.9" stroke={fill} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Path d="M17 31.5 32 18.8l15 12.7V48a3.5 3.5 0 0 1-3.5 3.5H37V40.5a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v11H20.5A3.5 3.5 0 0 1 17 48Z" fill={fill} />
    <Rect x="27" y="40" width="10" height="11.5" rx="2" fill={deep} opacity=".18" />
  </> },
  chart: { tone: "violet", draw: ({ fill }) => <>
    <Rect x="13" y="33" width="10" height="18" rx="3.5" fill={fill} /><Rect x="27" y="17" width="10" height="34" rx="3.5" fill={fill} /><Rect x="41" y="25" width="10" height="26" rx="3.5" fill={fill} />
  </> },
  user: { tone: "blue", draw: ({ fill }) => <><Circle cx="32" cy="22.5" r="9.5" fill={fill} /><Path d="M13.5 51c0-10.4 8.3-17.5 18.5-17.5S50.5 40.6 50.5 51a2 2 0 0 1-2 2h-33a2 2 0 0 1-2-2Z" fill={fill} /></> },
  brain: { tone: "violet", draw: ({ fill, deep }) => <>
    <Path d="M30.5 15c-4.5-2-9.5 1-9.6 5.6-4.5.6-7.3 5.4-5 9.6-3.2 3-2.5 8.6 1.5 10.6.2 5 5.4 8 9.8 5.8 1.2 1.6 2.4 2.4 3.3 2.4Z" fill={fill} />
    <Path d="M33.5 15c4.5-2 9.5 1 9.6 5.6 4.5.6 7.3 5.4 5 9.6 3.2 3 2.5 8.6-1.5 10.6-.2 5-5.4 8-9.8 5.8-1.2 1.6-2.4 2.4-3.3 2.4Z" fill={fill} />
    <Path d="M24 27c2.4-.2 4 1.2 4.4 3.4M40 27c-2.4-.2-4 1.2-4.4 3.4M23.5 38c2.4.8 4.4.2 5.5-1.6M40.5 38c-2.4.8-4.4.2-5.5-1.6" stroke={deep} strokeOpacity=".35" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </> },
  sparkles: { tone: "amber", draw: ({ fill }) => <>
    <Path d="M27 13c1.4 8 4.8 11.4 12.8 12.8C31.8 27.2 28.4 30.6 27 38.6c-1.4-8-4.8-11.4-12.8-12.8C22.2 24.4 25.6 21 27 13Z" fill={fill} />
    <Path d="M44 34c.8 4.6 2.8 6.6 7.4 7.4-4.6.8-6.6 2.8-7.4 7.4-.8-4.6-2.8-6.6-7.4-7.4 4.6-.8 6.6-2.8 7.4-7.4Z" fill={fill} />
  </> },
  refresh: { tone: "violet", draw: ({ fill }) => <>
    <Rect x="13" y="16" width="38" height="34" rx="7" fill={fill} /><Rect x="13" y="16" width="38" height="9" rx="4.5" fill={fill} />
    <Rect x="21" y="10.5" width="4.4" height="10" rx="2.2" fill={fill} /><Rect x="38.6" y="10.5" width="4.4" height="10" rx="2.2" fill={fill} />
  </> },
};
// aliases (category / template names used in the app)
export const ALIAS: Record<string, string> = {
  cap: "study", learning: "study", book: "read", reading: "read", dumbbell: "workout", fitness: "workout", dsa: "code", moon: "sleep",
  food: "eat", social: "social_media", dots: "other", clock: "focus", productivity: "zap", piggy: "save", savings: "save", wallet: "spend",
  iphone: "phone", custom: "plus", goals: "target", calendar: "refresh",
};

export const hasGlossy = (name: string) => !!G[ALIAS[name] ?? name];
