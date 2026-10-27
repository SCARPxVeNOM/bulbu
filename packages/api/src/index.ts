// The one client every Bulbu app uses (web today, React Native next). It only needs `fetch`, so it runs anywhere.
// Pass `getUserId` from wherever the app keeps the session (localStorage on web, AsyncStorage / SecureStore on RN).
import type {
  Achievement, Activity, AppKind, Category, Emote, Forecast, Goal, GoalTemplate, Impact, Insights, OutfitId, OutfitState,
  Pattern, Step, Swap, WhatIf,
} from "@bulbu/engine";
export type {
  Achievement, Activity, AppKind, Category, Emote, Forecast, Goal, GoalTemplate, Impact, Insights, OutfitId, OutfitState,
  Pattern, Step, Swap, WhatIf,
};

/** "sweater" and "hoodie" are the built-in outfits; the eight Bulbus are OutfitIds; null is no outfit. */
export type OutfitChoice = "sweater" | "hoodie" | OutfitId | null;
export interface User { id: string; name: string; demo?: boolean; outfit: OutfitChoice; theme: string }
export interface Fact { id: string; kind: "fact" | "pattern" | "promise" | "win"; text: string; detail?: string; confidence: number; source: "stated" | "inferred"; createdAt: string; updatedAt: string; checkAt?: string; done?: boolean }
export interface Nudge { id: string; kind: string; at: string; text: string; emote: Emote; action: { label: string; to: string } }
export interface GoalView extends Goal { subtitle: string; forecast: Forecast; swap: Swap; task: { label: string; done: boolean }; series: { day: string; percent: number }[] }
export interface BulbuDirective { emote: Emote; animation: string; glow: number; line: string; via: "spark" | "engine" }
export interface Letter { text: string; at: string }

export interface Snapshot {
  user: User;
  goals: GoalView[];
  today: (Activity & { impacts: Impact[] })[];
  streak: number;
  level: { xp: number; level: number; into: number; span: number };
  week: Insights;
  glow: number;
  emote: Emote;
  patterns: Pattern[];
  facts: Fact[];
  nudges: Nudge[];
  achievements: Achievement[];
  outfits: OutfitState[];
  /** the latest note from the nightly reflection */
  letter: Letter | null;
  ai: { enabled: boolean; models: { spark: string; wonder: string } };
  now: string;
}

export interface QuickLog { category: Category; minutes?: number; amount?: number; units?: number; label?: string; app?: string; goalId?: string }
export interface LogInput { text?: string; /** data URL of a screenshot, receipt or meal photo */ image?: string; source?: string; quick?: QuickLog }
export interface LogResult {
  activities: Activity[];
  impacts: Impact[];
  swap: Swap | null;
  questions: string[];
  forecasts: { goalId: string; before: Forecast; after: Forecast }[];
  completed: boolean;
  bulbu: BulbuDirective;
  via: "spark" | "offline" | "quick";
  /** Bulbus earned by this log */
  unlocked?: OutfitId[];
  needsText?: boolean;
  message?: string;
}
export interface ChatReply { reply: string; bulbu?: BulbuDirective; whatIf?: WhatIf; focus?: number; remembered?: string[]; via: string }

/** One app's foreground time for a day, as Android's UsageStatsManager (or a parsed screenshot) reports it. */
export interface UsageApp { name: string; package?: string; minutes: number; lastUsedAt?: string }
export interface UsageInput { /** yyyy-mm-dd, local day; defaults to today */ day?: string; source?: "device" | "screenshot"; apps: UsageApp[] }
export interface UsageResult {
  day: string;
  logged: { app: string; kind: AppKind; category: string; minutes: number; deltaMinutes: number }[];
  ignored: { app: string; reason: "neutral" | "too short" }[];
  unknown: string[];
  impacts: Impact[];
  netDays: number;
  unlocked: string[];
}
export interface AppClass { name: string; kind: AppKind; category: Category | null; known: boolean; override: AppKind | null }
export interface VoiceResult { transcript: string; durationMs: number; result: LogResult | null }
export interface Reflection { patterns: Pattern[]; facts: Fact[]; letter: string | null; via: "wonder" | "engine" }

/** A file reference React Native's fetch understands in multipart bodies. */
export interface NativeFile { uri: string; name?: string; type?: string }
type Audio = Blob | ArrayBuffer | Uint8Array | NativeFile;

export class BulbuError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body: unknown) { super(message); this.name = "BulbuError"; this.status = status; this.body = body; }
}

export interface ClientOptions {
  /** e.g. "https://bulbu.example.com" (no trailing /api). Empty string = same origin, which is what the web app uses. */
  baseUrl?: string;
  getUserId?: () => string | null | undefined | Promise<string | null | undefined>;
  fetch?: typeof fetch;
  /** per-request timeout; model calls can take a while */
  timeoutMs?: number;
}

const isNativeFile = (a: Audio): a is NativeFile => typeof a === "object" && a !== null && "uri" in a;

export function createBulbuClient(o: ClientOptions = {}) {
  const base = (o.baseUrl ?? "").replace(/\/+$/, "") + "/api";
  const f = o.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const timeout = o.timeoutMs ?? 90_000;

  async function call<T>(method: string, path: string, body?: unknown, raw?: { body: BodyInit; type?: string }): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    const uid = await o.getUserId?.();
    if (uid) headers["x-user-id"] = uid;
    let payload: BodyInit | undefined;
    if (raw) { payload = raw.body; if (raw.type) headers["content-type"] = raw.type; }
    else if (body !== undefined) { payload = JSON.stringify(body); headers["content-type"] = "application/json"; }
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctl && setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await f(base + path, { method, headers, body: payload, signal: ctl?.signal });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new BulbuError(data.error ?? `HTTP ${res.status}`, res.status, data);
      return data as T;
    } finally { if (timer) clearTimeout(timer); }
  }
  const q = (s: string) => encodeURIComponent(s);

  return {
    health: () => call<{ ok: boolean; ai: boolean; models: { spark: string; wonder: string } }>("GET", "/health"),

    // accounts
    users: () => call<{ id: string; name: string; demo: boolean }[]>("GET", "/users"),
    createUser: (name: string, goals: { template: GoalTemplate; title?: string; target?: number; baseline?: number }[]) => call<User>("POST", "/users", { name, goals }),
    resetDemo: () => call<{ ok: boolean; users: string[] }>("POST", "/demo/reset"),
    state: () => call<Snapshot>("GET", "/state"),
    updateUser: (b: Partial<Pick<User, "name" | "outfit" | "theme">>) => call<User>("PATCH", "/user", b),
    deleteUser: () => call<{ ok: boolean }>("DELETE", "/user"),

    // goals
    addGoal: (b: { template: GoalTemplate; title?: string; target?: number; baseline?: number }) => call<Goal>("POST", "/goals", b),
    updateGoal: (id: string, b: Partial<Goal>) => call<{ ok: boolean }>("PATCH", `/goals/${q(id)}`, b),
    deleteGoal: (id: string) => call<{ ok: boolean }>("DELETE", `/goals/${q(id)}`),

    // the core loop
    log: (b: LogInput) => call<LogResult>("POST", "/log", b),
    undo: (activityId: string) => call<{ ok: boolean }>("DELETE", `/activities/${q(activityId)}`),
    whatIf: (text: string) => call<WhatIf | { error: string }>("POST", "/whatif", { text }),
    messages: () => call<{ role: string; content: string; at: string }[]>("GET", "/chat"),
    chat: (text: string) => call<ChatReply>("POST", "/chat", { text }),
    insights: (days: number) => call<Insights>("GET", `/insights?days=${days}`),
    dismissNudge: (kind: string) => call<{ ok: boolean }>("POST", `/nudges/${q(kind)}/dismiss`),

    // memory
    memory: () => call<Fact[]>("GET", "/memory"),
    addMemory: (kind: Fact["kind"], text: string, checkInDays?: number) => call<{ ok: boolean }>("POST", "/memory", { kind, text, checkInDays }),
    editMemory: (id: string, b: Partial<Pick<Fact, "text" | "done">>) => call<{ ok: boolean }>("PATCH", `/memory/${q(id)}`, b),
    forget: (id: string) => call<{ ok: boolean }>("DELETE", `/memory/${q(id)}`),
    reflect: () => call<Reflection>("POST", "/reflect"),

    // device usage (Android usage access → minutes per app; re-syncing the same day replaces, never double-counts)
    syncUsage: (b: UsageInput) => call<UsageResult>("POST", "/usage", b),
    classifyApps: (apps: { name: string; package?: string }[]) => call<AppClass[]>("POST", "/apps/classify", { apps }),
    appOverrides: () => call<Record<string, AppKind>>("GET", "/apps"),
    setAppKind: (name: string, kind: AppKind) => call<Record<string, AppKind>>("PUT", `/apps/${q(name)}`, { kind }),
    clearAppKind: (name: string) => call<Record<string, AppKind>>("DELETE", `/apps/${q(name)}`),

    // the eight Bulbus
    outfits: () => call<{ equipped: OutfitChoice; outfits: OutfitState[] }>("GET", "/outfits"),
    equip: (id: OutfitChoice) => call<{ ok: boolean; equipped: OutfitChoice }>("POST", `/outfits/${id ?? "none"}/equip`),

    /** Voice check-in: mono 16-bit PCM WAV at 16 or 24 kHz. With `log: true` the transcript is logged like typed text. */
    voice: (audio: Audio, opts: { log?: boolean } = {}) => {
      const path = `/voice${opts.log ? "?log=1" : ""}`;
      if (isNativeFile(audio)) {
        const form = new FormData();
        // React Native's FormData takes { uri, name, type } for files
        form.append("audio", { uri: audio.uri, name: audio.name ?? "voice.wav", type: audio.type ?? "audio/wav" } as unknown as Blob);
        return call<VoiceResult>("POST", path, undefined, { body: form });
      }
      return call<VoiceResult>("POST", path, undefined, { body: audio as BodyInit, type: "audio/wav" });
    },
  };
}

export type BulbuClient = ReturnType<typeof createBulbuClient>;
