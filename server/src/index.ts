import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { addRealItem, buyItem, classifyApp, insights, inventory, NEW_WORLD, outfitStates, upgradeItem, worldState, type AppKind, type GoalTemplate, type WorldSave } from "@bulbu/engine";

const STARTER_LIGHT = 100;
import { store, uid, type Fact, type User } from "./db.ts";
import { makeGoal } from "./goals.ts";
import { seed, seedIfEmpty, DEMO_USERS } from "./seed.ts";
import { snapshot, log, chat, whatIf, reflect, remember, type LogInput } from "./service.ts";
import { ai, transcribe } from "./ai.ts";
import { ingestUsage, type UsageInput } from "./usage.ts";

seedIfEmpty();
const app = new Hono<{ Variables: { uid: string } }>();

// Expo web (the mobile app running in a browser) calls the API from another port. Phones send no Origin and need no CORS.
// Only local and private-network pages are allowed, since profiles here are keyed by x-user-id alone.
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
app.use("/api/*", cors({ origin: o => LOCAL_ORIGIN.test(o) ? o : null, allowHeaders: ["content-type", "x-user-id"], allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"] }));
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
  if ("outfit" in b) { const why = outfitLock(u.id, b.outfit ?? null); if (why) return c.json({ error: why }, 403); }
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

// device usage: the phone (usage access / a parsed screenshot) syncs minutes per app; re-syncing replaces, never doubles
app.post("/api/usage", async c => {
  const b = await c.req.json<UsageInput>();
  if (!Array.isArray(b?.apps)) return c.json({ error: "Send { apps: [{ name, package?, minutes }] }" }, 400);
  if (b.day && !/^\d{4}-\d{2}-\d{2}$/.test(b.day)) return c.json({ error: "day must be yyyy-mm-dd" }, 400);
  return c.json(ingestUsage(c.get("uid"), b));
});
// how Bulbu sorts apps, plus the user's own corrections ("Discord is work for me")
app.post("/api/apps/classify", async c => {
  const u = store.user(c.get("uid"))!, b = await c.req.json<{ apps: { name: string; package?: string }[] }>();
  return c.json((b.apps ?? []).map(a => ({ ...classifyApp(a.name, a.package, u.appKinds), override: u.appKinds?.[normApp(a.name)] ?? null })));
});
app.get("/api/apps", c => c.json(store.user(c.get("uid"))!.appKinds ?? {}));
app.put("/api/apps/:name", async c => {
  const u = store.user(c.get("uid"))!, { kind } = await c.req.json<{ kind: AppKind }>();
  if (!["distracting", "productive", "neutral"].includes(kind)) return c.json({ error: "kind must be distracting, productive or neutral" }, 400);
  store.putUser({ ...u, appKinds: { ...u.appKinds, [normApp(c.req.param("name"))]: kind } });
  return c.json(store.user(u.id)!.appKinds);
});
app.delete("/api/apps/:name", c => {
  const u = store.user(c.get("uid"))!, { [normApp(c.req.param("name"))]: _, ...rest } = u.appKinds ?? {};
  store.putUser({ ...u, appKinds: rest });
  return c.json(rest);
});

// Bulbu World: level, XP, Light, streak, and Bulbu's inventory
const save = (id: string) => store.user(id)!.world ?? NEW_WORLD;
const invOf = (id: string) => inventory(store.goals(id), store.activities(id), save(id), store.user(id)!.outfit, new Date());
const keep = (id: string, r: { save: WorldSave } | { error: string }) => {
  if ("error" in r) return r;
  store.putUser({ ...store.user(id)!, world: r.save });
  return null;
};
app.get("/api/world", c => c.json(worldState(store.goals(c.get("uid")), store.activities(c.get("uid")), save(c.get("uid")), new Date())));
app.get("/api/inventory", c => c.json(invOf(c.get("uid"))));
app.post("/api/inventory/:id/buy", c => {
  const id = c.get("uid"), err = keep(id, buyItem(store.goals(id), store.activities(id), save(id), c.req.param("id"), new Date()));
  return err ? c.json(err, 400) : c.json(invOf(id));
});
app.post("/api/inventory/:id/upgrade", c => {
  const id = c.get("uid"), err = keep(id, upgradeItem(store.goals(id), store.activities(id), save(id), c.req.param("id"), new Date()));
  return err ? c.json(err, 400) : c.json(invOf(id));
});
app.post("/api/inventory/:id/equip", c => {
  const id = c.get("uid"), u = store.user(id)!, want = c.req.param("id");
  if (want === "none") { store.putUser({ ...u, outfit: null }); return c.json(invOf(id)); }
  const it = invOf(id).items.find(i => i.id === want);
  if (!it) return c.json({ error: `Unknown item "${want}"` }, 400);
  if (!it.owned) return c.json({ error: `${it.name} is still locked. ${it.detail}.` }, 403);
  store.putUser({ ...u, outfit: it.outfit ?? it.id });
  return c.json(invOf(id));
});
// real-life purchases: "I bought headphones" -> Bulbu gets headphones
app.post("/api/inventory/real", async c => {
  const id = c.get("uid"), b = await c.req.json<{ item: string; price?: number; note?: string }>();
  const err = keep(id, addRealItem(save(id), String(b.item ?? ""), new Date(), { price: Number(b.price) || undefined, note: b.note?.slice(0, 120) }));
  return err ? c.json(err, 400) : c.json(invOf(id));
});
app.delete("/api/inventory/real/:item", c => {
  const id = c.get("uid"), w = save(id), u = store.user(id)!, item = c.req.param("item");
  // taking it out of the inventory also takes it off Bulbu
  store.putUser({ ...u, ...(u.outfit === item && { outfit: "sweater" }), world: { ...w, real: (w.real ?? []).filter(r => r.item !== item) } });
  return c.json(invOf(id));
});
// Bulbu's tour: save the step; the starter gift is given once
app.post("/api/world/tutorial", async c => {
  const id = c.get("uid"), u = store.user(id)!, { step, gift } = await c.req.json<{ step: number; gift?: boolean }>();
  const w = save(id);
  store.putUser({ ...u, world: { ...w, tutorial: Number.isFinite(step) ? Math.max(-1, Math.floor(step)) : w.tutorial, gift: gift && w.gift === 0 ? STARTER_LIGHT : w.gift } });
  return c.json(worldState(store.goals(id), store.activities(id), save(id), new Date()));
});

// the eight Bulbus: progress toward each, and which one is worn
app.get("/api/outfits", c => {
  const id = c.get("uid");
  return c.json({ equipped: store.user(id)!.outfit, outfits: outfitStates(store.goals(id), store.activities(id), new Date()) });
});
app.post("/api/outfits/:id/equip", c => {
  const u = store.user(c.get("uid"))!, want = c.req.param("id") === "none" ? null : c.req.param("id");
  const why = outfitLock(u.id, want);
  if (why) return c.json({ error: why }, 403);
  store.putUser({ ...u, outfit: want });
  return c.json({ ok: true, equipped: want });
});

// voice check-ins: a mono 16-bit WAV (16/24 kHz) as the raw body or a multipart "audio" field. ?log=1 also logs it.
app.post("/api/voice", async c => {
  let wav: Uint8Array;
  if ((c.req.header("content-type") ?? "").startsWith("multipart/")) {
    const f = (await c.req.parseBody())["audio"];
    if (!(f instanceof File)) return c.json({ error: "Missing multipart field \"audio\"" }, 400);
    wav = new Uint8Array(await f.arrayBuffer());
  } else wav = new Uint8Array(await c.req.arrayBuffer());
  if (wav.byteLength > 32 * 1024 * 1024) return c.json({ error: "Audio must be 32 MB or smaller" }, 413);
  if (!ai.enabled) return c.json({ error: "Voice needs the Meta API key (META_API_KEY)" }, 503);
  try {
    const goals = store.goals(c.get("uid"));
    const { transcript, durationMs } = await transcribe(wav, { keywords: [...new Set([...goals.map(g => g.title), "LeetCode", "Instagram", "YouTube", "Bulbu"])].slice(0, 10) });
    if (!transcript) return c.json({ transcript, durationMs, result: null });
    const result = c.req.query("log") === "1" ? await log(c.get("uid"), { text: transcript }) : null;
    return c.json({ transcript, durationMs, result });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 400) return c.json({ error: (e as Error).message }, 400);
    throw e;
  }
});

// production: serve the built web app
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../apps/web/dist");
if (fs.existsSync(dist)) {
  const root = path.relative(process.cwd(), dist);
  app.use("/*", serveStatic({ root }));
  app.get("*", serveStatic({ path: path.join(root, "index.html") }));
}

function normApp(s: string) { return decodeURIComponent(s).trim().toLowerCase().replace(/\s+/g, " "); }
/** null when the user may wear this outfit, otherwise the reason they can't (yet). Outfits come from the inventory. */
function outfitLock(userId: string, id: string | null): string | null {
  if (id === null) return null;
  const it = invOf(userId).items.find(i => i.id === id || i.outfit === id);
  if (!it) return `Unknown outfit "${id}"`;
  return it.owned ? null : `${it.name} is still locked. ${it.detail}.`;
}

// Nightly reflection: once per user per night, between 2 and 4 AM server time, Muse Wonder reads the month and writes
// patterns, facts and a letter. Set BULBU_REFLECT=off to disable; BULBU_REFLECT_HOUR picks the start hour.
const REFLECT_HOUR = Number(process.env.BULBU_REFLECT_HOUR ?? 2);
let reflecting = false;
async function nightly(now = new Date()) {
  if (reflecting || process.env.BULBU_REFLECT === "off") return;
  const h = now.getHours();
  if (h < REFLECT_HOUR || h >= REFLECT_HOUR + 2) return;
  const today = now.toLocaleDateString("en-CA");
  reflecting = true;
  try {
    for (const u of store.users()) {
      if (u.reflectedAt && new Date(u.reflectedAt).toLocaleDateString("en-CA") === today) continue;
      if (!store.activities(u.id).length) continue;
      try { const r = await reflect(u.id, now); console.log(`[nightly] reflected for ${u.name} via ${r.via}`); }
      catch (e) { console.warn(`[nightly] ${u.name}:`, (e as Error).message); }
    }
  } finally { reflecting = false; }
}
setInterval(() => void nightly(), 10 * 60_000).unref();

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`Bulbu API on http://localhost:${port}  (models: ${ai.enabled ? `${ai.models.spark} / ${ai.models.wonder}` : "offline mode — set META_API_KEY to use Muse Spark & Wonder"})`);
