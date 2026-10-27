import type { Activity, Category, Emote, Forecast, Goal, GoalTemplate, Impact, Insights, Pattern, Achievement, Swap, WhatIf, Step } from "@bulbu/engine";
export type { Activity, Category, Emote, Forecast, Goal, GoalTemplate, Impact, Insights, Pattern, Achievement, Swap, WhatIf, Step };

export interface User { id: string; name: string; demo?: boolean; outfit: "sweater" | "hoodie" | null; theme: string }
export interface Fact { id: string; kind: "fact" | "pattern" | "promise" | "win"; text: string; detail?: string; confidence: number; source: "stated" | "inferred"; createdAt: string; updatedAt: string; checkAt?: string; done?: boolean }
export interface Nudge { id: string; kind: string; at: string; text: string; emote: Emote; action: { label: string; to: string } }
export interface GoalView extends Goal { subtitle: string; forecast: Forecast; swap: Swap; task: { label: string; done: boolean }; series: { day: string; percent: number }[] }
export interface BulbuDirective { emote: Emote; animation: string; glow: number; line: string; via: "spark" | "engine" }

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
  ai: { enabled: boolean; models: { spark: string; wonder: string } };
  now: string;
}

export interface LogResult {
  activities: Activity[];
  impacts: Impact[];
  swap: Swap | null;
  questions: string[];
  forecasts: { goalId: string; before: Forecast; after: Forecast }[];
  completed: boolean;
  bulbu: BulbuDirective;
  via: "spark" | "offline" | "quick";
  needsText?: boolean;
  message?: string;
}

export interface ChatReply { reply: string; bulbu?: BulbuDirective; whatIf?: WhatIf; focus?: number; remembered?: string[]; via: string }

const KEY = "bulbu-user";
export const session = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (id: string | null) => { try { id ? localStorage.setItem(KEY, id) : localStorage.removeItem(KEY); } catch { /* private mode */ } },
};

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const uid = session.get();
  if (uid) headers["x-user-id"] = uid;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch("/api" + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? res.statusText), { status: res.status });
  return data as T;
}

export const api = {
  users: () => call<{ id: string; name: string; demo: boolean }[]>("GET", "/users"),
  createUser: (name: string, goals: { template: GoalTemplate; title?: string; target?: number; baseline?: number }[]) => call<User>("POST", "/users", { name, goals }),
  resetDemo: () => call("POST", "/demo/reset"),
  state: () => call<Snapshot>("GET", "/state"),
  updateUser: (b: Partial<Pick<User, "name" | "outfit" | "theme">>) => call<User>("PATCH", "/user", b),
  deleteUser: () => call("DELETE", "/user"),
  addGoal: (b: { template: GoalTemplate; title?: string; target?: number; baseline?: number }) => call<Goal>("POST", "/goals", b),
  updateGoal: (id: string, b: Partial<Goal>) => call("PATCH", `/goals/${id}`, b),
  deleteGoal: (id: string) => call("DELETE", `/goals/${id}`),
  log: (b: { text?: string; image?: string; source?: string; quick?: { category: Category; minutes?: number; amount?: number; units?: number; label?: string; app?: string; goalId?: string } }) => call<LogResult>("POST", "/log", b),
  undo: (id: string) => call("DELETE", `/activities/${id}`),
  whatIf: (text: string) => call<WhatIf | { error: string }>("POST", "/whatif", { text }),
  messages: () => call<{ role: string; content: string; at: string }[]>("GET", "/chat"),
  chat: (text: string) => call<ChatReply>("POST", "/chat", { text }),
  memory: () => call<Fact[]>("GET", "/memory"),
  addMemory: (kind: Fact["kind"], text: string) => call("POST", "/memory", { kind, text }),
  editMemory: (id: string, b: Partial<Pick<Fact, "text" | "done">>) => call("PATCH", `/memory/${id}`, b),
  forget: (id: string) => call("DELETE", `/memory/${id}`),
  reflect: () => call<{ letter: string | null; via: string; facts: Fact[] }>("POST", "/reflect"),
  dismissNudge: (kind: string) => call("POST", `/nudges/${kind}/dismiss`),
  insights: (days: number) => call<Insights>("GET", `/insights?days=${days}`),
};
