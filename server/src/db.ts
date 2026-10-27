// SQLite storage. Activities are the exact ledger; facts are the meaning layer ("What Bulbu remembers").
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Activity, Goal } from "@bulbu/engine";

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
  outfit: "sweater" | "hoodie" | null; theme: string;
  /** the last reaction, so Bulbu looks the same when the app reopens */
  mood?: { emote: string; at: string };
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
  user: (id: string) => rows<User>("SELECT data FROM users WHERE id = ?", id)[0],
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
