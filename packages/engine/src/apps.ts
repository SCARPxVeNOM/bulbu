// Which apps count as distraction, which move a goal, and which are just life (calls, mail, maps, payments).
// Usage access (Android) and screenshots both report minutes per app; only distracting and productive apps become
// activities. Neutral apps are never logged, so a phone call or an email never pushes a goal date back.
import type { Category } from "./types.ts";

export type AppKind = "distracting" | "productive" | "neutral";
export interface AppInfo { kind: AppKind; /** the activity category when the app is logged */ category: Category | null; name: string }

type Rule = { kind: AppKind; category: Category | null; names: string[]; packages?: string[] };

/** Matched case-insensitively against the app label, or exactly against the Android package name. */
const RULES: Rule[] = [
  { kind: "distracting", category: "social_media", names: [
      "instagram", "youtube", "facebook", "snapchat", "x", "twitter", "reddit", "threads", "pinterest", "tiktok", "moj", "josh",
      "sharechat", "netflix", "hotstar", "jiohotstar", "disney+ hotstar", "prime video", "mx player", "jiocinema", "sonyliv", "zee5",
      "twitch", "discord", "tumblr", "9gag", "bgmi", "free fire", "candy crush", "ludo king", "clash of clans", "clash royale", "pubg",
      "call of duty", "roblox", "minecraft", "subway surfers", "dream11", "mpl", "winzo"],
    packages: [
      "com.instagram.android", "com.google.android.youtube", "com.facebook.katana", "com.facebook.lite", "com.snapchat.android",
      "com.twitter.android", "com.reddit.frontpage", "com.instagram.barcelona", "com.pinterest", "com.netflix.mediaclient",
      "in.startv.hotstar", "com.amazon.avod.thirdpartyclient", "com.mxtech.videoplayer.ad", "com.discord", "tv.twitch.android.app",
      "com.pubg.imobile", "com.dts.freefireth", "com.king.candycrushsaga"] },
  { kind: "productive", category: "code", names: ["leetcode", "github", "hackerrank", "codechef", "codeforces", "geeksforgeeks", "termux", "replit", "vs code", "visual studio code"],
    packages: ["com.leetcode.android", "com.github.android", "com.termux"] },
  { kind: "productive", category: "read", names: ["kindle", "google play books", "play books", "libby", "pocketbook", "goodreads", "audible", "medium"],
    packages: ["com.amazon.kindle", "com.google.android.apps.books", "com.audible.application"] },
  { kind: "productive", category: "study", names: ["coursera", "udemy", "khan academy", "duolingo", "anki", "ankidroid", "unacademy", "byju's", "byjus",
      "physics wallah", "pw", "nptel", "edx", "brilliant", "quizlet", "notion", "obsidian"],
    packages: ["org.coursera.android", "com.udemy.android", "org.khanacademy.android", "com.duolingo", "com.ichi2.anki", "com.notion.id"] },
  { kind: "productive", category: "workout", names: ["strava", "nike training club", "google fit", "fitbit", "cult.fit", "cultfit", "healthifyme"],
    packages: ["com.strava", "com.google.android.apps.fitness"] },
  { kind: "neutral", category: null, names: [
      "phone", "dialer", "contacts", "messages", "gmail", "outlook", "mail", "whatsapp", "telegram", "signal", "clock", "alarm",
      "calendar", "drive", "google drive", "docs", "sheets", "files", "camera", "gallery", "photos", "maps", "google maps", "uber", "ola",
      "rapido", "settings", "chrome", "google", "calculator", "gpay", "google pay", "phonepe", "paytm", "bhim", "binance", "coinswitch",
      "wazirx", "zerodha", "kite", "groww", "upstox", "cred", "amazon", "flipkart", "myntra", "zepto", "blinkit", "instamart", "swiggy",
      "zomato", "bigbasket", "spotify", "youtube music", "jiosaavn", "gaana", "digital wellbeing", "authenticator", "truecaller", "slack",
      "zoom", "google meet", "teams", "microsoft teams", "linkedin", "other"],
    packages: ["com.google.android.dialer", "com.google.android.gm", "com.whatsapp", "org.telegram.messenger", "com.google.android.deskclock",
      "com.google.android.apps.docs", "com.google.android.apps.maps", "com.google.android.apps.nbu.paisa.user", "com.phonepe.app",
      "net.one97.paytm", "com.binance.dev", "com.spotify.music"] },
];

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const BY_NAME = new Map<string, Rule>(); const BY_PKG = new Map<string, Rule>();
for (const r of RULES) { r.names.forEach(n => BY_NAME.set(n, r)); r.packages?.forEach(p => BY_PKG.set(p, r)); }

/**
 * Classify an app by its label (and Android package name when known). `overrides` are the user's own choices
 * ("Discord is work for me") keyed by lower-case app name. Unknown apps are neutral: never charge a goal for a guess.
 */
export function classifyApp(name: string, pkg?: string, overrides?: Record<string, AppKind>): AppInfo & { known: boolean } {
  const key = norm(name);
  const own = overrides?.[key];
  const rule = (pkg && BY_PKG.get(pkg)) || BY_NAME.get(key) || BY_NAME.get(key.replace(/ (app|lite)$/, ""));
  if (own) return { name: name.trim(), kind: own, category: own === "distracting" ? "social_media" : own === "productive" ? (rule?.kind === "productive" ? rule.category : "focus") : null, known: true };
  if (!rule) return { name: name.trim(), kind: "neutral", category: null, known: false };
  return { name: name.trim(), kind: rule.kind, category: rule.category, known: true };
}

/** Minutes below this are noise (opening an app for a second) and are not logged. */
export const MIN_APP_MINUTES = 5;
