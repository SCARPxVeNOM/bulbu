// SQLite storage. Activities are the exact ledger; facts are the meaning layer ("What Bulbu remembers").
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ITEMS, type Activity, type AppKind, type Card, type Goal, type WorldSave } from "@bulbu/engine";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.env.BULBU_DB ?? path.resolve(here, "../data/bulbu.db");
fs.mkdirSync(path.dirname(file), { recursive: true });
export const db = new DatabaseSync(file);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users      (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS goals      (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, at TEXT NOT NULL, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS facts      (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS messages   (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS activities_user ON activities(user_id, at);
`);

export interface User {
  id: string; name: string; createdAt: string; demo?: boolean;
  /** "sweater" | "hoodie" (built-in), one of the eight Bulbu outfit ids, or null */
  outfit: string | null; theme: string;
  /** the real-life item Bulbu is holding (on top of the outfit) */
  gear?: string | null;
  /** the user's own app classifications, keyed by lower-case app name */
  appKinds?: Record<string, AppKind>;
  /** last nightly reflection, and the note from it */
  reflectedAt?: string;
  letter?: { text: string; at: string };
  /** Bulbu World: what was built and spent (everything else is computed from the ledger) */
  world?: WorldSave;
  /** the last reaction, so Bulbu looks the same when the app reopens */
  mood?: { emote: string; at: string };
  /** Muse Wonder's warning for the next Dim raid (written in the nightly reflection) */
  raidLine?: { id: string; text: string };
  /** today's hand of cards (dealt once a day), and the ones already played */
  hand?: { day: string; cards: Card[]; played: string[]; via: "spark" | "engine" };
  /** nudge kinds the user dismissed, so Bulbu sends fewer of them */
  ignored?: Record<string, number>;
}

/** A memory fact: who you are, how you behave, and what you promised. */
export interface Fact {
  id: string;
  kind: "fact" | "pattern" | "promise" | "win";
  text: string;
  detail?: string;
  confidence: number;            // 0..1
  source: "stated" | "inferred";
  createdAt: string;
  updatedAt: string;
  /** promises: when Bulbu should check back */
  checkAt?: string;
  done?: boolean;
}

const rows = <T>(sql: string, ...p: (string | number)[]) => (db.prepare(sql).all(...p) as { data: string }[]).map(r => JSON.parse(r.data) as T);

export const store = {
  users: () => rows<User>("SELECT data FROM users"),
  user: (id: string) => wearing(rows<User>("SELECT data FROM users WHERE id = ?", id)[0]),
  putUser: (u: User) => db.prepare("INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)").run(u.id, JSON.stringify(u)),

  goals: (uid: string) => rows<Goal>("SELECT data FROM goals WHERE user_id = ? ORDER BY rowid", uid),
  putGoal: (uid: string, g: Goal) => db.prepare("INSERT OR REPLACE INTO goals (id, user_id, data) VALUES (?, ?, ?)").run(g.id, uid, JSON.stringify(g)),
  deleteGoal: (uid: string, id: string) => db.prepare("DELETE FROM goals WHERE id = ? AND user_id = ?").run(id, uid),

  activities: (uid: string) => rows<Activity>("SELECT data FROM activities WHERE user_id = ? ORDER BY at", uid),
  putActivity: (uid: string, a: Activity) => db.prepare("INSERT OR REPLACE INTO activities (id, user_id, at, data) VALUES (?, ?, ?, ?)").run(a.id, uid, a.at, JSON.stringify(a)),
  deleteActivity: (uid: string, id: string) => db.prepare("DELETE FROM activities WHERE id = ? AND user_id = ?").run(id, uid),

  facts: (uid: string) => rows<Fact>("SELECT data FROM facts WHERE user_id = ? ORDER BY rowid", uid),
  putFact: (uid: string, f: Fact) => db.prepare("INSERT OR REPLACE INTO facts (id, user_id, data) VALUES (?, ?, ?)").run(f.id, uid, JSON.stringify(f)),
  deleteFact: (uid: string, id: string) => db.prepare("DELETE FROM facts WHERE id = ? AND user_id = ?").run(id, uid),

  messages: (uid: string, limit = 30) => (db.prepare("SELECT role, content, at FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT ?").all(uid, limit) as { role: string; content: string; at: string }[]).reverse(),
  addMessage: (uid: string, role: string, content: string) => db.prepare("INSERT INTO messages (user_id, role, content, at) VALUES (?, ?, ?, ?)").run(uid, role, content, new Date().toISOString()),

  wipeUser: (uid: string) => { for (const t of ["goals", "activities", "facts", "messages"]) db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(uid); db.prepare("DELETE FROM users WHERE id = ?").run(uid); },
};

export const uid = (p = "") => p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// Before Bulbu could hold things, a real-life item was "worn" as the outfit. It's held now, with the outfit on.
const REAL_IDS = new Set(ITEMS.filter(i => i.source === "real").map(i => i.id));
function wearing(u: User | undefined): User | undefined {
  if (!u || !u.outfit || !REAL_IDS.has(u.outfit)) return u;
  return { ...u, gear: u.gear ?? u.outfit, outfit: "sweater" };
}
