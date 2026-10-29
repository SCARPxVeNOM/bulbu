# Bulbu's Kingdom

**Bulbu shows you your future before you choose it. Your real choices build your kingdom.**

Most apps tell you what you did. Bulbu tells you what your next choice will do, before you make it, and helps you pick the better one. It's a base-building game where real life is the controller: you never fill in a form, you play, and your real choices are the moves. The kingdom is a floating island ruled by Bulbu, a glassy, glowing lightbulb, so **Light** is what good choices collect.

## How the game works

| In the game | In real life | Under the hood |
|---|---|---|
| **Buildings.** Every goal is one: coding raises the Library Tower, saving fills the Vault, workouts build the Arena, reading and learning grow the Observatory, anything else is the Workshop. Your main goal is the **Castle**, with the real thing you're working toward (cut out of your photo by SAM 3.1) floating on top as the Goal Treasure. | Your goals | `packages/engine/src/kingdom.ts` |
| **Construction dates.** The label over each building says when it finishes, at your pace. Tap it for the building panel and the exact maths (pace, time or money, the calculation). | The forecast | The deterministic forecasting engine. Models never do the maths. |
| **The Dim.** Scrolling and impulse spending don't take anything away: a fog rolls over the buildings they slowed, dims them, and the finish date slips. It never destroys anything and clears quickly. No guilt. | Distraction | `kingdomMoments`, `kingdom.js` |
| **Cards.** Every day Bulbu deals three: "Solve 1 problem", "Cook tonight", "Walk 20 minutes". Do one in real life, play it, and the Dim clears, the date pulls back, Bulbu celebrates. | Swaps | `cards.ts`; Muse Spark picks the three and writes a line for each |
| **Dim raids.** Bulbu predicts when you usually drift ("A Dim raid is coming at 11 PM") and a storm gathers over the building it'll hit. Defend with a 25-minute focus session; a held raid drops loot (Light, Hero Cape and Golden Crown pieces). | Predicted drift | `raids.ts`; Muse Wonder writes the warning; a phone notification half an hour before |
| **What if…** "What if I sleep by 12?" Turn the dial (nights a week, minutes a day…) and watch the finish dates move on the buildings, live. | Choosing | `kingdomWhatIf`: every stop on the dial worked out at once |
| **Bulbu.** Evolves with you, wears outfits earned by levels and play, and shows how the week is going in its glow and face. | You | three.js engine, emotes, outfits, held real-life items |
| **Clans.** Study groups that build together: see each other's buildings (never anyone's scrolling), visit a clanmate's kingdom, send each other Light. | Friends, classmates | `packages/engine/src/clans.ts`, `server/src/clans.ts` |
| **Clan wars.** Clan against clan, often college against college, Monday to Sunday. Points come only from good moves (days pulled sooner, raids held off, cards played) and only the clan total counts. Winners collect 150 Light each, everyone who played 50. | Helping each other | `weekPlay`, `pairClans` |
| **Seasons.** A month themed by one of the eight Bulbus, ten tiers climbed with season XP, a free reward on each, and the **Season Pass** (₹149 a month) with a second one: the season's Bulbu on tier 5, the Golden Crown on tier 10. | A month of choices | `packages/engine/src/seasons.ts` (payments aren't connected yet: the pass turns on as a demo) |
| **The letter from your future self.** Muse Wonder reads your month every night and writes back. A story, not charts. | Reflection | `reflect()` |

You tell Bulbu what happened by talking to it, showing it a screenshot (screen time, a receipt, a meal), or with Android's usage access. "Ask Bulbu before you choose" works the other way round: "about to order biryani?" comes back with what it does to your kingdom and one better swap.

## The demo

1. Open the kingdom: the 3D island, the Castle with its treasure, the finish dates over the buildings.
2. Tap **+** and show Bulbu a screen-time screenshot with 2h on Instagram (or type it). The Dim rolls in, the Castle's date slips with the old one struck through, Bulbu droops. Tap **See why** for the maths.
3. Open **Cards** and play "Solve 1 problem". The fog clears, the date pulls back, Bulbu celebrates.
4. Tap the **Dim raid at 11 PM** chip → **Defend now** → 25 minutes later the raid's held and the loot drops.
5. **What if I…** → "Sleep by 12" and drag the dial: the Castle's date moves live. As Priya, whose Castle is her iPhone 17, "Cook 3 nights a week" brings it about 7 weeks sooner.
6. **Ask Bulbu** → "About to order biryani?": what it would do to the kingdom before you order, and one better swap.
7. **Clan** → the war score against Night Owls, send Kabir 50 Light, visit his kingdom. **Season** → collect tier rewards, turn on the (demo) Season Pass.

Demo users: **Aryan** (DSA student losing evenings to Instagram) and **Priya** (young earner saving for an iPhone 17), each with about 30 days of history so the forecasts, patterns and raids are live. Both are in the demo clan **NODE · BMSITM** with three fictional clanmates, at war with the fictional **Night Owls · Demo College**. `npm run seed` resets them.

## Fair play: proving a workout

Most moves are told to Bulbu, and on your own kingdom that's fine: faking only fools yourself. Clan wars are shared, so workouts can be proven:

- **Your gym.** Set it once by standing in it (Bulbu keeps only that spot, never where you go). Check in when you get there and out when you leave: both locations have to be at the gym, 25 minutes or more apart, and a simulated location (a mock-location app) never counts. It becomes a verified workout and plays your Arena card.
- **A live photo.** Taken with Bulbu's camera (not the gallery), its own timestamp from the last 10 minutes, never used before, and Muse Spark has to see a workout in it.

In clan wars a proven workout counts in full and a reported one counts half. Android's usage access is device-reported already; linking LeetCode / Codeforces and Health Connect are next.

## Run it

Node 22+ (uses the built-in `node:sqlite`).

```sh
npm install
npm run dev          # API on :8787 (+ the older web client on :5173)
```

To use Meta's models, copy `.env.example` to `.env` and fill in the Meta Model API base URL, key and model IDs. Without a key everything still works offline (reading screenshots needs Muse Spark).

```sh
npm test             # engine + parser tests
npm run typecheck
```

### The phone app (`apps/mobile`): this is Bulbu's Kingdom

Expo SDK 58 + Expo Router, with the 3D kingdom and Bulbu (three.js) running in a DOM component. It has its own `node_modules`, so install it separately:

```sh
npm run dev                      # keep the API running (port 8787)
cd apps/mobile && npm install
npx expo start                   # Expo Go on your phone (same Wi-Fi), or press w for the browser
```

The app finds the API on the computer that serves the bundle (port 8787); set `EXPO_PUBLIC_API_URL` to use another server.

Everything works in **Expo Go** except reading app usage, which is native Android code (`modules/bulbu-usage`, Kotlin, `UsageStatsManager`) and needs Bulbu's own build: `npx expo run:android`, or `npx eas-cli build -p android --profile development`. On iPhone, Apple doesn't share per-app minutes, so Screen Time comes in as a screenshot. Raid warnings are local notifications (expo-notifications).

## How it's built

```
packages/engine   Deterministic forecasting engine and the game rules (TypeScript, no dependencies):
                  forecasts, the kingdom, moments, cards, raids, the what-if dial, the inventory
packages/api      Typed client for the server; only needs fetch, so every app shares it
server            Hono API + SQLite, Meta Model API layer, offline parser, demo data
apps/mobile       Bulbu's Kingdom: the Expo / React Native app
apps/web          The three.js engine and kingdom scene the phone app runs (src/bulbu), the kingdom
                  build script, and the earlier web client
```

**Forecasting.** Every number is computed, never guessed, and comes with a tap-to-see-why breakdown. Pace comes from your own history (units per day over 14 days, per focused hour over 28 days, blended with a starting estimate in the first week). The finish date is what's left ÷ your pace, plus what today's moves cost. Productive time becomes units and days sooner; distraction becomes units not done at your pace and days later (on your main goal); spending becomes days later on your savings goal.

**Models.** OpenAI-compatible calls to the Meta Model API. *Muse Spark* is the game master: it reads text, voice and screenshots into moves, deals the cards, drives Bulbu's body (emote, animation, glow, line) through tool calls, and answers "before you choose" questions by calling the engine. *Muse Wonder* runs the nightly reflection: the letter from your future self, what Bulbu noticed, and the raid warning. *SAM 3.1* cuts your real goal object out of a photo for the Castle; *Muse Image* draws Bulbu with the real things you bought. Every model path has an offline fallback.

**Memory.** Exact numbers live in the history of moves; meaning (facts, patterns, promises) lives in *What Bulbu remembers*, where you can see, correct or delete anything.

**The kingdom scene.** `apps/web/scripts/build-kingdom.mjs` assembles `kingdom.glb` from Kenney's Fantasy Town Kit (CC0) and the Low Poly Arena (free for commercial use): named floors, roofs, scaffolding and plots that the app drives from the engine. Credits in `apps/web/assets/kingdom/CREDITS.md`.

## Not built yet

- Google / Apple sign-in. Profiles are local to the server for now.
- Bosses (exam deadlines with a health bar, learned patterns as named villains like "The 1 AM Spender").
- UPI SMS as an input, and a background usage sync on Android (today it syncs when the app opens).
- Real payments for the Season Pass (it turns on as a demo), and clans across servers (today everyone in a clan shares one Bulbu server).
