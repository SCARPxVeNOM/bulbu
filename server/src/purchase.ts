// "I bought it": the user snaps a photo of something they bought, and three Meta models turn it into Bulbu's.
//   Muse Spark  works out what it is (an iPad), its colour, any engraving, and a price if it's a receipt
//   SAM 3.1     cuts the item out of the photo (a mask, so the app can show the user's own iPad as a sticker)
//   Muse Image  draws Bulbu playing with it, from a picture of Bulbu and the user's photo
// Files live next to the database in media/, under random names, and are served from /media/<file>.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { decodeMaskToRaster, parseImageStream, recordsOfKind, type ResponsesEvent } from "@meta-sam/parser";
import { ITEMS } from "@bulbu/engine";
import { ai, args, complete, type Tool } from "./ai.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.dirname(process.env.BULBU_DB ?? path.resolve(here, "../data/bulbu.db"));
export const MEDIA_DIR = path.join(dataDir, "media");
const LOG = path.join(dataDir, "meta.log");
const base = (process.env.META_API_BASE_URL ?? "").replace(/\/$/, ""), key = process.env.META_API_KEY ?? "";
const IMAGE_MODEL = process.env.MUSE_IMAGE_MODEL ?? "muse-image-1.0", SAM_MODEL = process.env.SAM_MODEL ?? "sam-3.1";
/** Bulbu as the reference for Muse Image (a render of the real 3D model) */
const BULBU_REF = path.resolve(here, "../../apps/web/public/renders/bulbu-reference.jpg");

/** errors from these calls also go to data/meta.log, so they can be read without the server's terminal */
export function note(line: string) {
  console.log(`[meta] ${line}`);
  try { fs.appendFileSync(LOG, `${new Date().toISOString()} ${line}\n`); } catch { /* best effort */ }
}

export function saveMedia(bytes: Uint8Array, ext: string, prefix: string): string {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  const name = `${prefix}-${crypto.randomBytes(9).toString("base64url")}.${ext}`;
  fs.writeFileSync(path.join(MEDIA_DIR, name), bytes);
  return name;
}
export const mediaPath = (name: string) => path.join(MEDIA_DIR, path.basename(name));
export function dropMedia(...names: (string | undefined)[]) { for (const n of names) if (n) fs.rm(mediaPath(n), { force: true }, () => {}); }

export function dataUrlBytes(url: string): { bytes: Uint8Array; mime: string } | null {
  const m = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(url);
  return m ? { mime: m[1].toLowerCase(), bytes: Buffer.from(m[2], "base64") } : null;
}

// ------------------------------------------------------------------ 1. what is it? (Muse Spark)

const REAL = ITEMS.filter(i => i.source === "real");
const IDENTIFY: Tool = { type: "function", function: {
  name: "identify_purchase",
  description: "Say which of Bulbu's real-life items this photo shows. The user bought it and wants Bulbu to have one too.",
  parameters: { type: "object", required: ["item", "name", "concept", "confidence"], properties: {
    item: { type: "string", enum: [...REAL.map(i => i.id), "other"], description: `Which item it is: ${REAL.map(i => `${i.id} (${i.name})`).join(", ")}; "other" if none fits` },
    name: { type: "string", description: "What it is, short and specific, e.g. 'iPad (10th gen) in blue', 'AirPods Pro'" },
    concept: { type: "string", description: "A short noun phrase naming the object for a segmentation model, e.g. 'tablet', 'phone', 'headphones'" },
    color: { type: "string", description: "The main body colour as a hex code, e.g. '#6F9FD8'" },
    engraving: { type: "string", description: "Any text engraved or written on it, if readable" },
    price: { type: "number", description: "The price in rupees, only if a receipt or price tag shows it" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  } } } };

export interface Identified { item: string | null; name: string; concept: string; color?: string; engraving?: string; price?: number; confidence: number }

export async function identify(image: string): Promise<Identified> {
  const msg = await complete({
    toolChoice: "identify_purchase", tools: [IDENTIFY], maxTokens: 300, effort: "low",
    messages: [
      { role: "system", content: "You look at a photo of something the user just bought: the product itself, its box, or an order confirmation/receipt. Identify it." },
      { role: "user", content: [{ type: "text", text: "I bought this. What is it?" }, { type: "image_url", image_url: { url: image } }] },
    ],
  });
  const call = msg.tool_calls?.find(c => c.function.name === "identify_purchase");
  if (!call) throw new Error("Muse Spark didn't say what it is");
  const a = args<Identified & { item: string }>(call);
  const item = REAL.some(i => i.id === a.item) ? a.item : null;
  const color = /^#[0-9a-f]{6}$/i.test(a.color ?? "") ? a.color : undefined;
  return { item, name: String(a.name ?? "").slice(0, 60), concept: String(a.concept || REAL.find(i => i.id === item)?.name || "object").slice(0, 40),
           color, engraving: a.engraving?.slice(0, 80) || undefined, price: Number(a.price) > 0 ? Number(a.price) : undefined, confidence: Number(a.confidence) || 0 };
}

// ------------------------------------------------------------------ 2. cut it out (SAM 3.1)

/** mask: a PNG (white = the item) covering `box`, in the photo's pixels */
export interface Cutout { mask: string; box: { left: number; top: number; right: number; bottom: number } }

/** Server-sent events from the Responses API, as the parser expects them (it also wants output_text.done per lane). */
async function* sseEvents(res: Response): AsyncIterable<ResponsesEvent> {
  const reader = res.body!.getReader(), dec = new TextDecoder();
  let buf = "";
  const done = new Set<string>();
  const handle = function* (raw: string): Generator<ResponsesEvent> {
    const data = raw.split("\n").filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).join("");
    if (!data || data === "[DONE]") return;
    const e = JSON.parse(data) as { type?: string; item_id?: unknown; output_index?: unknown; content_index?: unknown; part?: { type?: string; text?: string } };
    const lane = `${e.item_id}:${e.output_index}:${e.content_index}`;
    if (e.type === "response.output_text.done") { if (done.has(lane)) return; done.add(lane); }
    yield e as unknown as ResponsesEvent;
    if (e.type === "response.content_part.done" && e.part?.type === "output_text" && typeof e.part.text === "string" && !done.has(lane)) {
      done.add(lane);
      yield { type: "response.output_text.done", item_id: e.item_id, output_index: e.output_index, content_index: e.content_index, text: e.part.text } as unknown as ResponsesEvent;
    }
  };
  for (;;) {
    const { value, done: end } = await reader.read();
    if (value) buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) { const chunk = buf.slice(0, i); buf = buf.slice(i + 2); yield* handle(chunk); }
    if (end) { if (buf.trim()) yield* handle(buf); return; }
  }
}

/** Try the concept Muse Spark gave, then plainer names, until SAM finds the thing. */
export async function cutout(image: string, ...concepts: string[]): Promise<Cutout | null> {
  for (const c of [...new Set(concepts.map(x => x.trim().toLowerCase()).filter(Boolean))]) {
    const cut = await cutoutOnce(image, c);
    if (cut) return cut;
  }
  return null;
}

async function cutoutOnce(image: string, concept: string): Promise<Cutout | null> {
  const t0 = Date.now();
  const res = await fetch(`${base}/responses`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}`, accept: "text/event-stream" },
    body: JSON.stringify({ model: SAM_MODEL, stream: true, input: [{ type: "message", role: "user", content: [{ type: "input_text", text: concept }, { type: "input_image", image_url: image }] }] }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`SAM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const seen: string[] = [];
  const tee = async function* () { for await (const e of sseEvents(res)) { seen.push((e as { type?: string }).type ?? "?"); yield e; } };
  const result = await parseImageStream(tee()).finalResult;
  const masks = recordsOfKind(result.records, "mask");
  note(`sam ${SAM_MODEL} "${concept}" ${masks.length} mask(s) in ${Date.now() - t0}ms (${result.outcome.status})`);
  if (!masks.length) note(`sam: events ${[...new Set(seen)].join(",")}; records ${result.records.map(r => r.kind === "text" ? `text:${r.text.slice(0, 120)}` : r.kind).join(" | ") || "none"}; ${result.diagnostics.map(d => d.message).join("; ")}`);
  if (!masks.length) return null;
  // the biggest match is the thing the user is showing us
  const area = (b: Cutout["box"]) => (b.right - b.left) * (b.bottom - b.top);
  const m = masks.reduce((a, b) => area(b.bounds) > area(a.bounds) ? b : a);
  const raster = decodeMaskToRaster(m.mask);
  const png = maskPng(raster, m.mask.width, m.mask.height);
  return { mask: saveMedia(png, "png", "mask"), box: { ...m.bounds } };
}

/** A white-on-black PNG of the mask (0/1 per pixel), small enough to ship: at most 512 px on the long side. */
function maskPng(raster: Uint8Array, w: number, h: number): Uint8Array {
  const k = Math.max(1, Math.ceil(Math.max(w, h) / 512)), W = Math.ceil(w / k), H = Math.ceil(h / k);
  const rows = Buffer.alloc((W + 1) * H);
  for (let y = 0; y < H; y++) {
    rows[y * (W + 1)] = 0;
    for (let x = 0; x < W; x++) {
      let on = 0, n = 0;
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) { const sx = x * k + dx, sy = y * k + dy; if (sx < w && sy < h) { n++; on += raster[sy * w + sx] ? 1 : 0; } }
      rows[y * (W + 1) + 1 + x] = Math.round(255 * on / Math.max(1, n));
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(b: Buffer) { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

// ------------------------------------------------------------------ 3. Bulbu with it (Muse Image)

export async function drawBulbuWith(photo: string, what: string): Promise<string> {
  const t0 = Date.now();
  const ref = `data:image/jpeg;base64,${fs.readFileSync(BULBU_REF).toString("base64")}`;
  const prompt = `The first image is Bulbu: a cute 3D lightbulb character with a glowing pale-yellow bulb head, a glowing filament swirl inside, big glossy purple eyes, pink cheeks, a small smile, a blue knit sweater with a yellow star, round white hands and lavender feet. `
    + `The second image is the user's ${what}. Draw Bulbu happily playing with this exact ${what} (same model, colour and details), holding it up proudly. `
    + `Keep Bulbu exactly as in the first image: same proportions, colours and soft glossy 3D look. Bright, cheerful, soft pastel lavender background, gentle studio light, no text.`;
  const res = await fetch(`${base}/images/edits`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, images: [{ image_url: ref }, { image_url: photo }], n: 1, size: "1024x1024", output_format: "webp" }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Muse Image ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json() as { data?: { b64_json?: string; url?: string }[] };
  const d = j.data?.[0];
  let bytes: Uint8Array | null = null;
  if (d?.b64_json) bytes = Buffer.from(d.b64_json, "base64");
  else if (d?.url) bytes = new Uint8Array(await (await fetch(d.url, { signal: AbortSignal.timeout(60_000) })).arrayBuffer());
  if (!bytes) throw new Error("Muse Image returned no image");
  note(`image ${IMAGE_MODEL} "${what}" in ${Date.now() - t0}ms ≈ $0.01`);
  return saveMedia(bytes, "webp", "art");
}

export const photoReady = () => ai.enabled;
