// Meta Model API client. The API is OpenAI-compatible, so every model is called the same way.
// Muse Spark: live chat, logging from text/voice/screenshots, Bulbu's body (tool calls), nudges. Muse Wonder: nightly reflection.
// Models never do goal math: they call the engine (tools) and explain its result.

const cfg = {
  base: (process.env.META_API_BASE_URL ?? "").replace(/\/$/, ""),
  key: process.env.META_API_KEY ?? "",
  spark: process.env.MUSE_SPARK_MODEL ?? "muse-spark",
  wonder: process.env.MUSE_WONDER_MODEL ?? "muse-wonder",
};
export const ai = { enabled: !!(cfg.base && cfg.key), models: { spark: cfg.spark, wonder: cfg.wonder } };

export type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
export type Msg =
  | { role: "system" | "user"; content: string | Part[] }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };
export interface ToolCall { id: string; type: "function"; function: { name: string; arguments: string } }
export interface Tool { type: "function"; function: { name: string; description: string; parameters: object } }

export async function complete(o: { model?: "spark" | "wonder"; messages: Msg[]; tools?: Tool[]; toolChoice?: string; maxTokens?: number; json?: boolean }) {
  if (!ai.enabled) throw new Error("No model configured (set META_API_BASE_URL and META_API_KEY)");
  const body: Record<string, unknown> = { model: cfg[o.model ?? "spark"], messages: o.messages, max_tokens: o.maxTokens ?? 800, temperature: 0.6 };
  if (o.tools) { body.tools = o.tools; body.tool_choice = o.toolChoice ? { type: "function", function: { name: o.toolChoice } } : "auto"; }
  if (o.json) body.response_format = { type: "json_object" };
  const res = await fetch(`${cfg.base}/chat/completions`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify(body), signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`Model API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json() as { choices: { message: { content: string | null; tool_calls?: ToolCall[] } }[] };
  return data.choices[0].message;
}

export const args = <T>(c: ToolCall): T => { try { return JSON.parse(c.function.arguments || "{}") as T; } catch { return {} as T; } };

// ------------------------------------------------------------------ prompts & tools

export const PERSONA = `You are Bulbu, a small glowing lightbulb companion who helps the user reach their goals.
Voice: warm, encouraging, brief, never shaming. Swaps, not guilt: always offer one small, specific action ("One DSA problem now = 3 days closer"), never "you wasted 2 hours".
Phrases you like: "Consistency beats intensity." "Progress isn't linear, and that's okay." "It's okay, we all get distracted sometimes."
Never invent numbers. Goal dates and "days closer/later" come only from the engine (tool results or numbers given to you). If you don't have a number, don't make one up.
Usage data is per app: say "2h on Instagram", not "2h of Reels", unless the user said Reels.
Nutrition and sleep feedback are trends, never medical advice. Patterns are tendencies, not proven causes.
Keep replies short: 1-3 sentences in chat unless the user asks for more.`;

const EMOTES = ["happy", "focused", "drained", "stressed", "thriving", "celebrating"];
export const SET_BULBU: Tool = { type: "function", function: {
  name: "set_bulbu",
  description: "Control Bulbu's 3D body: expression, animation, glow and the line Bulbu says. Call this once per reply so Bulbu reacts to the moment.",
  parameters: { type: "object", required: ["emote", "line"], properties: {
    emote: { type: "string", enum: EMOTES, description: "happy=content, focused=locked in, drained=droopy/low (long scroll, late night), stressed=frazzled (overspend, deadline), thriving=proud (good choice), celebrating=milestone" },
    animation: { type: "string", enum: ["Idle", "Wave", "Walk", "Celebrate", "Sleepy", "Jitter"] },
    glow: { type: "number", minimum: 0.3, maximum: 1.2, description: "How brightly the bulb glows: bright when the week is on track, dim when drifting." },
    line: { type: "string", description: "What Bulbu says, max ~15 words, in Bulbu's voice." },
  } } } };

export const LOG_ACTIVITIES: Tool = { type: "function", function: {
  name: "log_activities",
  description: "Record what the user did as structured activities. Read text, voice transcripts, receipts, meal photos, workout screens and screen-time screenshots.",
  parameters: { type: "object", required: ["activities"], properties: {
    activities: { type: "array", items: { type: "object", required: ["category", "label"], properties: {
      category: { type: "string", enum: ["study", "code", "read", "workout", "sleep", "eat", "social_media", "spend", "save", "focus", "other"] },
      label: { type: "string", description: "Short, e.g. '2h on Instagram', 'Biryani from Swiggy', 'Solved 2 LeetCode problems'" },
      minutes: { type: "number" }, amount: { type: "number", description: "Money in rupees" },
      alternative_cost: { type: "number", description: "Cost of the cheaper alternative if the user mentioned one" },
      units: { type: "number", description: "Problems solved, pages read, workouts done" },
      app: { type: "string", description: "App name for screen time (Instagram, YouTube)" },
      hours_ago: { type: "number", description: "How long ago it happened, if stated" },
    } } },
    questions: { type: "array", items: { type: "string" }, description: "Ask for anything you could not read or the user did not say (e.g. how long, how much). Max 2." },
    skipped: { type: "array", items: { type: "string" }, description: "Things the user said they skipped" },
  } } } };

export const CHAT_TOOLS: Tool[] = [
  SET_BULBU,
  { type: "function", function: { name: "get_goals", description: "Current goals with exact progress, pace, goal date and this week's net impact, from the forecasting engine.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: {
    name: "simulate_what_if", description: "Run a recurring change through the forecasting engine and get the new goal date with the math. Use for any 'what if I...' question.",
    parameters: { type: "object", required: ["goal_id", "label", "per_week", "category"], properties: {
      goal_id: { type: "string" }, label: { type: "string" }, per_week: { type: "number" },
      category: { type: "string", enum: ["study", "code", "read", "workout", "save", "focus", "social_media", "eat", "spend"] },
      minutes: { type: "number" }, amount: { type: "number" }, units: { type: "number" },
      reduce: { type: "boolean", description: "true when the change removes an activity (less scrolling, fewer orders)" },
    } } } },
  { type: "function", function: {
    name: "remember", description: "Save something about the user to memory: a fact they stated, or a promise Bulbu should check back on.",
    parameters: { type: "object", required: ["kind", "text"], properties: {
      kind: { type: "string", enum: ["fact", "promise"] }, text: { type: "string" }, check_in_days: { type: "number" },
    } } } },
  { type: "function", function: { name: "start_focus", description: "Offer to start a focus session in Focus Mode.", parameters: { type: "object", properties: { minutes: { type: "number" } } } } },
];
