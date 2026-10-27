# Bulbu

**Small steps. A better you.** A goal companion that shows, in the moment, how every small choice moves your goals closer or further away, with a 3D character who reacts to how your life is going. See `Bulbu — Product Spec.md` for the full product; `prot1.png` / `prot2.png` are the screen designs.

## Run it

Node 22+ (uses the built-in `node:sqlite`).

```sh
npm install
npm run dev          # API on :8787 + web app on http://localhost:5173
```

Open http://localhost:5173 on your phone (same Wi-Fi, use your Mac's IP) or in a narrow browser window. Tap **Try a demo user** for Aryan (DSA student vs Instagram) or Priya (saving for an iPhone). Each has ~30 days of seeded history, so forecasts and patterns are live. `npm run seed` resets the demo data.

**The demo moment:** as Aryan, tap **+** → Text → `2h on Instagram` → **+3 days** on Crack DSA, the goal date slips, Bulbu droops and dims, one swap is offered, and tapping the card shows the math.

To use Meta's models, copy `.env.example` to `.env` and fill in the Meta Model API base URL, key and model IDs. Without a key everything still works offline (screenshots need Muse Spark).

```sh
npm test             # engine + parser tests
npm run typecheck
npm run build && npm start   # production: the API also serves apps/web/dist
```

## How it's built

```
packages/engine   Deterministic forecasting engine (TypeScript, no dependencies)
packages/api      Typed client for the server; only needs fetch, so web and React Native share it
server            Hono API + SQLite ledger, Meta Model API layer, offline parser, seed data
apps/web          Vite + React app (12 screens + memory + nudges), the 3D Bulbu
```

**Forecasting (`packages/engine`).** Every number is computed, never guessed, and comes with a tap-to-see-why breakdown.
- *Pace* comes from your own history: units per day over 14 days, units per focused hour over 28 days, blended with a template estimate during the first week.
- *Goal date* = remaining ÷ pace, plus today's opportunity cost.
- *Impact*: productive time becomes units, then days sooner. Distraction minutes become units not done at your pace, then days later (charged to your main-focus goal only). Spending becomes avoidable money, then days later on your savings goal.
- *Swap*: one small specific action for the goal that slipped, with its own days-closer.
- *What-if*: a recurring change becomes a new pace and a new date, with the math.
- *Patterns*: weekend vs weekday food spend, late-night coding → spending, short sleep → next-day focus, peak scrolling hour. Worded as tendencies, not causes.

**Models (`server/src/ai.ts`, `service.ts`).** OpenAI-compatible calls to the Meta Model API.
- *Muse Spark* reads text, voice transcripts and screenshots into activities (`log_activities` tool), and controls Bulbu's body through the `set_bulbu` tool: emote, animation, glow and line. It also coaches in chat, calling the engine through `get_goals` and `simulate_what_if`, and saves memories with `remember`.
- *Muse Wonder* runs the nightly reflection over the whole history, with the history as a cacheable prefix. The server runs it once a night per user between 2 and 4 AM (`BULBU_REFLECT=off` to disable, `BULBU_REFLECT_HOUR` to move it) and keeps the latest letter in the snapshot.
- Models never do goal math. Every model path has an offline fallback.

**Memory.** The ledger (`activities`) holds exact numbers. Facts, patterns, promises and wins are the meaning layer, and the user can see, edit and delete them on *What Bulbu remembers*. Reflection recomputes patterns, fades stale guesses and turns user corrections into stated facts.

**Nudges.** Usage threshold (30+ min on one app), predicted drift from patterns, streak at risk, and promise check-ins. At most 3 a day, quiet hours respected, and fewer of any kind the user keeps dismissing.

**Device usage (`server/src/usage.ts`, `packages/engine/src/apps.ts`).** `POST /api/usage` takes minutes per app for a day, as Android's usage access or a parsed Digital Wellbeing screenshot reports them. Apps are sorted into distracting, productive and neutral (calls, mail, maps, payments are never stored); unknown apps are neutral until the user decides, and their choices live in `/api/apps`. Each app gets one activity per day, so syncing again replaces the numbers instead of double-counting.

**The eight Bulbus (`packages/engine/src/outfits.ts`).** GradBulbu, FitBulbu, CozyBulbu, ChampBulbu, TechBulbu, NatureBulbu, DreamBulbu and PartyBulbu are earned from the ledger (5h of study, 10 workouts, 200 pages, a 7-day streak, 25 problems, 3 balanced days, a goal at 50%, 3 achievements). `GET /api/outfits` shows progress, `POST /api/outfits/:id/equip` refuses locked ones, a log that earns one returns it in `unlocked`, and the equipped Bulbu gives Spark a slightly different voice. The 3D outfits and artifacts plug in by id.

**Voice.** `POST /api/voice` takes a mono 16-bit WAV (16 or 24 kHz) and transcribes it with Muse Voice Transcribe; `?log=1` logs the transcript like typed text.

**Bulbu (`apps/web/src/bulbu`).** `engine.js` is the three.js engine from `~/Desktop/bulbu-web` (GLB, emotes, glow shaders, outfits), with small additions: `setBackground`, `paused`, `setView` and `interactive`. One WebGL canvas is shared by every screen, so the 6.5 MB model loads once, and it pauses when off-screen. If you change the model, copy the new `bulbu.glb` into `apps/web/public/` and `bulbu.js` into `engine.js` (keep the additions marked in its header).

## Not built yet

- Google / Apple sign-in. Profiles are local to the server for now.
- The React Native app: usage access (feeding `/api/usage`), voice recording (feeding `/api/voice`), push notifications. The API and client are ready for it.
- Muse Image outfits and scenes, SAM 3.1 goal objects in Bulbu's world, and the Muse Glimmer "Bulbu Home" offline tier.
- 3D models for the eight Bulbus. Until they land, wearing one shows Bulbu without an outfit.
