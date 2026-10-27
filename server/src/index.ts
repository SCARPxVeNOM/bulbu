import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { insights, type GoalTemplate } from "@bulbu/engine";
import { store, uid, type Fact, type User } from "./db.ts";
import { makeGoal } from "./goals.ts";
import { seed, seedIfEmpty, DEMO_USERS } from "./seed.ts";
import { snapshot, log, chat, whatIf, reflect, remember, type LogInput } from "./service.ts";
import { ai } from "./ai.ts";

seedIfEmpty();
const app = new Hono<{ Variables: { uid: string } }>();

app.onError((err, c) => { console.error(err); return c.json({ error: err.message }, 500); });
app.get("/api/health", c => c.json({ ok: true, ai: ai.enabled, models: ai.models }));

// ------------------------------------------------------------------ accounts (local profiles for now; Google/Apple sign-in later)
app.get("/api/users", c => c.json(store.users().map(u => ({ id: u.id, name: u.name, demo: !!u.demo }))));
app.post("/api/users", async c => {
  const b = await c.req.json<{ name: string; goals: { template: GoalTemplate; title?: string; target?: number; baseline?: number }[] }>();
  const user: User = { id: uid("u_"), name: (b.name || "Friend").trim().slice(0, 40), createdAt: new Date().toISOString(), outfit: "sweater", theme: "sky" };
  store.putUser(user);
  b.goals.forEach((g, i) => store.putGoal(user.id, makeGoal(g.template, { ...(g.title && { title: g.title }), ...(g.target && { target: g.target }), baseline: g.baseline ?? 0, primary: i === 0 })));
  return c.json(user);
});
app.post("/api/demo/reset", c => { seed(); return c.json({ ok: true, users: DEMO_USERS.map(u => u.id) }); });

// everything below needs a user
app.use("/api/*", async (c, next) => {
  const id = c.req.header("x-user-id");
  if (!id || !store.user(id)) return c.json({ error: "Unknown user" }, 401);
  c.set("uid", id);
  await next();
});

app.get("/api/state", c => c.json(snapshot(c.get("uid"))));
app.get("/api/insights", c => {
  const days = Math.max(1, Math.min(365, Number(c.req.query("days") ?? 7)));
  return c.json(insights(store.goals(c.get("uid")), store.activities(c.get("uid")), new Date(), days));
});
app.patch("/api/user", async c => {
  const u = store.user(c.get("uid"))!, b = await c.req.json<Partial<Pick<User, "name" | "outfit" | "theme">>>();
  store.putUser({ ...u, ...("name" in b && { name: b.name! }), ...("outfit" in b && { outfit: b.outfit! }), ...("theme" in b && { theme: b.theme! }) });
  return c.json(store.user(u.id));
});
app.delete("/api/user", c => { store.wipeUser(c.get("uid")); return c.json({ ok: true }); });

// goals
app.post("/api/goals", async c => {
  const b = await c.req.json<{ template: GoalTemplate; title?: string; target?: number; baseline?: number }>();
  const first = !store.goals(c.get("uid")).length;
  const g = makeGoal(b.template, { ...(b.title && { title: b.title }), ...(b.target && { target: b.target }), baseline: b.baseline ?? 0, primary: first });
  store.putGoal(c.get("uid"), g);
  return c.json(g);
});
app.patch("/api/goals/:id", async c => {
  const goals = store.goals(c.get("uid")), g = goals.find(g => g.id === c.req.param("id"));
  if (!g) return c.json({ error: "Not found" }, 404);
  const b = await c.req.json<{ title?: string; target?: number; baseline?: number; primary?: boolean }>();
  if (b.primary) goals.filter(x => x.kind === g.kind && x.id !== g.id && x.primary).forEach(x => store.putGoal(c.get("uid"), { ...x, primary: false }));
  store.putGoal(c.get("uid"), { ...g, ...b });
  return c.json({ ok: true });
});
app.delete("/api/goals/:id", c => { store.deleteGoal(c.get("uid"), c.req.param("id")); return c.json({ ok: true }); });

// the core loop
app.post("/api/log", async c => c.json(await log(c.get("uid"), await c.req.json<LogInput>())));
app.delete("/api/activities/:id", c => { store.deleteActivity(c.get("uid"), c.req.param("id")); return c.json({ ok: true }); });
app.post("/api/whatif", async c => c.json(await whatIf(c.get("uid"), (await c.req.json<{ text: string }>()).text)));
app.get("/api/chat", c => c.json(store.messages(c.get("uid"), 50)));
app.post("/api/chat", async c => c.json(await chat(c.get("uid"), (await c.req.json<{ text: string }>()).text)));

// memory: see, edit and delete everything Bulbu remembers
app.get("/api/memory", c => c.json(store.facts(c.get("uid"))));
app.post("/api/memory", async c => { const b = await c.req.json<{ kind: Fact["kind"]; text: string; checkInDays?: number }>(); remember(c.get("uid"), b.kind, b.text, b.checkInDays); return c.json({ ok: true }); });
app.patch("/api/memory/:id", async c => {
  const f = store.facts(c.get("uid")).find(f => f.id === c.req.param("id"));
  if (!f) return c.json({ error: "Not found" }, 404);
  const b = await c.req.json<Partial<Pick<Fact, "text" | "done">>>();
  // a correction from the user is a stated fact
  store.putFact(c.get("uid"), { ...f, ...b, ...(b.text && { source: "stated", confidence: 1 }), updatedAt: new Date().toISOString() });
  return c.json({ ok: true });
});
app.delete("/api/memory/:id", c => { store.deleteFact(c.get("uid"), c.req.param("id")); return c.json({ ok: true }); });
app.post("/api/reflect", async c => c.json(await reflect(c.get("uid"))));
app.post("/api/nudges/:kind/dismiss", c => {
  const u = store.user(c.get("uid"))!, k = c.req.param("kind");
  store.putUser({ ...u, ignored: { ...u.ignored, [k]: (u.ignored?.[k] ?? 0) + 1 } });
  return c.json({ ok: true });
});

// production: serve the built web app
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../apps/web/dist");
if (fs.existsSync(dist)) {
  const root = path.relative(process.cwd(), dist);
  app.use("/*", serveStatic({ root }));
  app.get("*", serveStatic({ path: path.join(root, "index.html") }));
}

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`Bulbu API on http://localhost:${port}  (models: ${ai.enabled ? `${ai.models.spark} / ${ai.models.wonder}` : "offline mode — set META_API_KEY to use Muse Spark & Wonder"})`);
