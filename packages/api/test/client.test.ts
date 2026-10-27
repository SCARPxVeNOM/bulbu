import { test } from "node:test";
import assert from "node:assert/strict";
import { createBulbuClient, BulbuError } from "../src/index.ts";

function fake(status = 200, body: unknown = { ok: true }) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify(body), { status }); }) as unknown as typeof globalThis.fetch;
  return { calls, fetch };
}

test("sends the user id, JSON body and base URL", async () => {
  const { calls, fetch } = fake();
  const api = createBulbuClient({ baseUrl: "https://x.test/", getUserId: async () => "priya", fetch });
  await api.syncUsage({ apps: [{ name: "YouTube", minutes: 42 }] });
  assert.equal(calls[0].url, "https://x.test/api/usage");
  assert.equal(calls[0].init.method, "POST");
  const h = calls[0].init.headers as Record<string, string>;
  assert.equal(h["x-user-id"], "priya");
  assert.equal(h["content-type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].init.body as string), { apps: [{ name: "YouTube", minutes: 42 }] });
});

test("encodes app names and maps a null outfit to 'none'", async () => {
  const { calls, fetch } = fake();
  const api = createBulbuClient({ fetch });
  await api.setAppKind("Prime Video", "distracting");
  await api.equip(null);
  assert.equal(calls[0].url, "/api/apps/Prime%20Video");
  assert.equal(calls[1].url, "/api/outfits/none/equip");
});

test("voice sends raw WAV, or multipart for a React Native file uri", async () => {
  const { calls, fetch } = fake();
  const api = createBulbuClient({ fetch });
  await api.voice(new Uint8Array([1, 2, 3]), { log: true });
  assert.equal(calls[0].url, "/api/voice?log=1");
  assert.equal((calls[0].init.headers as Record<string, string>)["content-type"], "audio/wav");
  await api.voice({ uri: "file:///rec.wav" });
  assert.ok(calls[1].init.body instanceof FormData);
  assert.equal((calls[1].init.headers as Record<string, string>)["content-type"], undefined, "fetch sets the multipart boundary itself");
});

test("errors carry the server message and status", async () => {
  const { fetch } = fake(403, { error: "GradBulbu is still locked" });
  const api = createBulbuClient({ fetch });
  await assert.rejects(api.equip("grad"), (e: unknown) => e instanceof BulbuError && e.status === 403 && e.message === "GradBulbu is still locked");
});
