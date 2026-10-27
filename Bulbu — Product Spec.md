# Bulbu — Product Spec

Oct 25, 2026 · @ARYAN

## Overview

Bulbu is a goal companion that shows you, in the moment, how every small choice moves your goals closer or further away. Tagline: **Small steps. A better you.**

You set goals such as cracking DSA, getting fit, reading more, or saving for an iPhone. You live your day and tell Bulbu about it by talking, typing, or snapping a screenshot or photo. Bulbu turns that into activities, converts each one into days closer to or further from your goals, and reacts through a 3D character whose look and mood reflect how your life is going.

Bulbu is being built for the Meta Global AI Developer Hackathon on Meta's models (Muse Spark, Muse Wonder, Muse Glimmer, Muse Image, SAM 3.1, and Muse Code). It has no blockchain or crypto component. It is also intended as a long-term consumer product, not only a hackathon entry.

## The problem

Small daily choices quietly decide big goals, but nobody sees the connection until it is too late.

- **Instant rewards win.** Feeds reward you within seconds with likes, new videos, and messages. Goals reward you months later. The brain picks the instant reward almost every time.
- **The cost is invisible.** One extra delivery order, one late night, or 40 minutes of reels never looks like it matters. Added up over weeks, it decides whether the goal happens.
- **Tracking is work.** Existing goal and habit apps add effort: forms, checklists, manual logging. People stop using them, so the apps describe the past instead of shaping the future.
- **Existing apps look backward.** They show what you did. None show who your habits are turning you into or what today's choice does to the goal date.

**Why now.** AI can now understand messy, unstructured daily life (screenshots, receipts, voice notes) and remember a person's patterns across weeks. Before this, seeing the long-term cost of a small choice meant months of manual tracking and spreadsheets nobody keeps. Bulbu makes it effortless and immediate.

**Framing.** Bulbu is not anti-social-media. Attention is your scarcest resource, and Bulbu helps you spend it on purpose.

## Who it's for

Bulbu is for students and young earners whose goals leak away through small daily choices, starting in India.

- **Students** preparing for placements (DSA, coding), balancing classes, exams, and scrolling.
- **Young earners** saving for something specific (a phone, a trip) while money leaks through small UPI and food-delivery spends they never notice.
- **Anyone with a goal** in fitness, learning, reading, career, or savings. Bulbu is goal-agnostic; the iPhone example is only an illustration.

**Firsthand story.** The builder is a student balancing DSA preparation, college, and the pull of Instagram. Bulbu is built by its own user, and the pitch opens with that story.

## Core idea

Every activity is converted into one shared unit: **days closer to or further from each goal.**

| Activity | Goal | Effect |
| --- | --- | --- |
| 40 min of reels | Crack DSA | About 1 problem not solved at your pace, so +1 day later |
| ₹400 delivery order instead of cooking | iPhone | +2 days later |
| 30 min walk | Get fit | 2 days closer |
| 2 hours of reels | Crack DSA | +3 days later |

- **Personal, not generic.** The impact is computed from your own history and pace, not an average.
- **Small things compound.** Bulbu makes the cumulative cost of tiny choices visible today.
- **Swaps, not guilt.** Bulbu always offers a small, specific alternative: "Solve one DSA problem now and you're 3 days closer." The tone is gentle: "It's okay, we all get distracted sometimes."
- **Both directions count.** Good choices are celebrated as much as distracting ones are flagged. Insights show good choices, distracting choices, and the net impact for the week.

## Bulbu the character

Bulbu is a 3D character that reflects you: your habits shape how Bulbu looks, moves, and evolves. Bulbu is not a selfie avatar of the user.

- **The model.** A glassy, iridescent, bulb-shaped 3D character built in Blender, delivered as a GLB with a full set of emotions, emotes, and outfits, and shown through the bulbu-web viewer.
- **Emotes.** Bulbu reacts live: happy, celebrating, proud, focused, droopy, sleepy, and more. A long scroll makes Bulbu droop; a focus session makes Bulbu proud.
- **Glow and tint.** Bulbu's glass body glows bright and iridescent when your week is on track and dims when you drift. It is a quiet signal you see every time you open the app.
- **Outfits.** Earned through milestones, and unique per user, so no two users' Bulbus look the same.
- **Evolution.** Bulbu evolves only on sustained patterns, not on a single good day.
- **Bulbu's world.** Personalized scenes and backdrops around each goal (exam hall, gym, savings), and your real goal object placed in the scene so Bulbu moves closer to it as you progress.
- **Personality.** Warm, encouraging, never shaming. Bulbu says things like "Consistency beats intensity" and "Progress isn't linear, and that's okay."
- **Customization.** Users choose outfits, expressions, and themes from their profile.

An earlier concept was a Tamagotchi-style creature; Bulbu replaces it and keeps the emotional reaction to your life's direction, not just to attention.

## Product experience

The app has twelve screens, designed in a soft, light-blue style with Bulbu present throughout.

| Screen | What it does |
| --- | --- |
| Onboarding | "Small steps. A better you." with Bulbu waving |
| Sign up | Google, Apple, or email |
| Select goals | DSA/Coding, Fitness, Learning, Savings, iPhone, Reading, Productivity, Custom |
| Home | Greeting, Bulbu, today's focus checklist, streak, weekly count, encouragement |
| Goal detail | Progress (for example Crack DSA, 204 of 300 solved, 68%), weekly progress, today's tasks, Start Now |
| Log activity | Quick categories (Study, Workout, Read, Code, Sleep, Eat, Social Media, Other) or Photo, Voice, Text |
| Activity impact | The core moment: what you did, the estimated goal delay (+3 days), what it equals, and a swap to try instead |
| Insights | Productive vs social media time, time breakdown, good choices, distracting choices, net impact |
| Chat with Bulbu | An AI coach for honest, gentle advice (for example the 25-5 focus rule) |
| Focus mode | A 25-minute focus timer with short and long breaks, Bulbu staying with you |
| Profile | Level, streak, Bulbu's outfits, expressions, and themes |
| Achievements | Badges such as 7-day streak, DSA Starter, Early Bird, Bookworm, Fit Steps, No Scroll Day, iPhone Goal |

**The core loop.** Log something (or let Bulbu detect it) → see its impact in days → get one swap → act → Bulbu celebrates and the goal moves.

**Copy note.** The Activity Impact card should say "2h on Instagram" rather than "2h Reels" unless the user tells Bulbu it was Reels, because usage data reports time per app, not per feature.

## Capturing life with zero effort

Bulbu removes the work of tracking: you live and talk, and Bulbu understands.

**Inputs**

- **Voice check-ins:** "Long day, skipped gym, ordered biryani" becomes structured activities.
- **Typing:** a quick sentence in the log screen.
- **Photos and screenshots:** receipts, meals, workout screens, screen-time screenshots, Instagram's "Your activity" page.
- **Device data with permission:** per-app usage time where the platform allows it.
- **Asking when needed:** Bulbu asks the user to say or type what it cannot access.

**Where screen-time data comes from**

| Source | What it gives | Status |
| --- | --- | --- |
| Android usage access | Exact per-app time and when it happened (for example Instagram minutes) | Primary source |
| Screenshot reading | Screen Time or Instagram activity screenshots read by Muse Spark | Works on every platform, no special permission |
| iOS Screen Time | Limits and alerts when a threshold is crossed; raw minutes are restricted | Later; needs Apple's Family Controls approval |
| Instagram data export | Deeper history if a user opts in | Optional; contents to be verified |
| Bank and UPI SMS | Automatic spending, parsed privately | Android, processed locally |

**The Instagram API reality.** The official Instagram API cannot monitor how someone uses Instagram. Personal accounts can no longer connect since the Basic Display API was retired in December 2024; only Business or Creator accounts can. It returns post performance and profile insights, not time spent or Reels watched. Standard permissions also take 2 to 4 weeks of Meta app review. Bulbu therefore does not depend on it.

## Forecasting

Every forecast is computed, not guessed, and every number can be explained.

- **Deterministic math.** A forecasting engine calculates goal impact from the user's goals, activities, and personal pace (rolling averages, savings rate, problems per hour). Language models never do goal math in their heads; they call the engine and explain its result.
- **Tap to see why.** Every "+3 days" opens a breakdown: your pace, the time or money involved, and the calculation. This separates Bulbu from "a cute app with made-up numbers."
- **Goal-agnostic.** The same engine handles savings goals, skill goals (problems solved, pages read), and habit goals (workouts per week).
- **Patterns improve it.** Learned patterns ("after under 6 hours of sleep, focus drops about 40% the next day") make forecasts personal. Patterns use simple statistics over the activity history, explained in words by the model.
- **What-if simulator.** Ask "What if I cook dinner 3 nights a week?" Bulbu builds the plan, runs it through the engine, and shows the new goal date with the math.
- **Graphs.** Daily activities and weekly progress are shown as charts alongside the forecasts.

## Memory

Bulbu builds and manages its own memory for each user: numbers live in a ledger, meaning lives in memory.

**Two layers**

- **Ledger (exact):** money, dates, streaks, activity times, goal progress. Auditable and never "remembered" approximately.
- **Meaning (Muse Wonder's Active Memory):** preferences, context, promises, and emotional history, carried across days, weeks, and months.

**Four kinds of memory**

| Kind | Example |
| --- | --- |
| Events: what happened | Meals, spends, focus sessions, sleep, check-ins, with timestamps |
| Facts: who you are | "Works best late at night," "has exams in November," "orders food when stressed," each with a confidence level and source (stated or inferred) |
| Patterns: how you behave | "Weekend food spending is 2× weekdays," "you overspend on nights you code past 1 AM" |
| Relationship: you and Bulbu | Past wins, streaks, promises ("I'll skip delivery this week"), Bulbu's evolution path |

**How it lives**

- After each check-in, new events and candidate facts are captured.
- Every night, memory is consolidated: duplicates merged, confidence updated, patterns recomputed, stale facts allowed to fade.
- Promises carry a check-back, so Bulbu follows up on its own.
- Bulbu notices things the user never said and raises them gently: "You tend to overspend on nights you code past 1 AM. Want a nudge at 11:30 tonight?"

**Visible memory.** A "What Bulbu remembers" screen lets users see, edit, and delete every fact and pattern. It builds trust, lets corrections improve Bulbu ("No, I wasn't stressed, that was a party"), and shows judges real personalization.

## Nudges and notifications

Bulbu steps in before the usual drift, not after it, and never nags.

**What triggers a nudge**

- **Usage threshold:** for example 30 or more minutes on Instagram, detected through Android usage access (or iOS Screen Time alerts later).
- **Predicted drift:** patterns in memory ("11 PM after stressful classes") schedule a nudge just before the risky moment: "It's 11 PM, this is usually when the scrolling starts. One problem first?"
- **Goal events:** a streak at risk, a milestone reached, a goal date slipping or moving closer.
- **Promise follow-ups:** checking back on commitments the user made.

**Who does what.** Muse Wonder plans the timing each night. Muse Spark writes each message in Bulbu's voice using today's context. The notification shows Bulbu's matching emote.

**Rules**

- At most about 3 nudges a day, plus quiet hours.
- Every notification has an action, such as "Start 25-min focus" (opens Focus Mode) or "Snooze."
- Swaps, never guilt: "One DSA problem now = 3 days closer," never "You wasted 2 hours."
- If a user often ignores a kind of nudge, Bulbu sends fewer of them.
- Usage-based nudges are generated on the phone for speed and privacy; nudges planned overnight arrive as push notifications.

## Feed optimisation

Bulbu helps users make Instagram work for their goals; no API can change someone's feed, so Bulbu coaches the user to tune it themselves.

- **Follow goal-aligned creators:** Bulbu suggests DSA, fitness, or finance accounts that match the user's goals, turning the feed into a learning feed.
- **Use Instagram's own controls:** "Not interested," mute, and resetting suggested content, with Bulbu explaining why.
- **Use Instagram's wellbeing tools:** daily time limits and Quiet Mode, set up with Bulbu's guidance.

**Pitch framing for Meta judges:** "Bulbu helps you make Instagram work for your goals," never "Bulbu fights Instagram."

## Privacy and trust

Bulbu sees spending, screen time, and habits, so it is private by default and transparent about what it knows.

- **Local first for sensitive data.** Raw bank SMS, calendar, and screen-time data can be processed locally by Muse Glimmer ("Bulbu Home"), and only abstracted summaries such as "food spend ₹1,200, evening" reach the cloud.
- **Visible, editable memory.** Users can see, correct, and delete everything Bulbu remembers.
- **Permission-based.** Usage access and every data source are opt-in, and Bulbu works with manual input if a user grants nothing.
- **Honest data claims.** Bulbu never claims to know Reels time it cannot see; labels reflect the real source.
- **Health framing.** Nutrition and sleep feedback is presented as trends, never as medical advice.
- **Kind by design.** No shaming, no body-image pressure, gentle language throughout.

## Meta models

Each Meta model does the job it is built for, and the models hand work to each other; that is what "beyond a basic integration" means for Bulbu.

| Model | What it is | Bulbu's job | Runs |
| --- | --- | --- | --- |
| Muse Spark | Fast, natively multimodal reasoning model with tool use, visual chain of thought, and multi-agent orchestration ([Meta](https://about.fb.com/ja/news/2026/04/introducing-muse-spark-meta-superintelligence-labs-first-model-built-to-prioritize-people/embed/)) | Live chat, logging from screenshots and voice, driving Bulbu's emotes and outfits, writing nudges | All day |
| Muse Wonder | Meta's frontier model with Active Memory, Active Focus, 1M-token context; text, image, video, audio, PDF input; $4 / $20 per million input / output tokens, cached input $0.20 ([YourStory](https://yourstory.com/ai-story/muse-wonder-meta-ai-race-frontier-models), [DEV](https://dev.to/hassann/what-is-muse-wonder-5f08)) | Memory, nightly reflection, patterns, what-if, nudge planning | Nightly + on demand |
| Muse Glimmer | 30B open-weight model (Apache 2.0) for local, always-on agents; under 20GB quantized; text and image ([Campus Technology](https://campustechnology.com/articles/2026/08/26/meta-releases-muse-glimmer-an-open-weight-ai-model-designed-to-run-on-consumer-hardware.aspx?p=1)) | "Bulbu Home": private local processing, offline fallback | User's laptop, optional |
| Muse Image | Agentic image generation and editing; edits up to ten reference images and changes only what you specify; $0.01 per image ([RuntimeWire](https://runtimewire.com/article/meta-ships-muse-image-api-at-one-cent-per-image), [OrcaRouter](https://www.orcarouter.ai/blog/muse-image)) | Goal scenes and earned outfits, keeping Bulbu consistent | Milestones |
| SAM 3.1 | Detects, segments, and tracks objects in images and video from a short phrase; one API call returns masks and tracks ([Hugging Face](https://huggingface.co/facebook/sam3.1), [Digg](https://digg.com/ai/icmesfai)) | Goal objects, meal portions, workout reps | Per upload |
| Muse Code | Terminal coding agent on Muse Spark 1.2 with persistent background subagents ([Decrypt](https://decrypt.co/375001/muse-code-meta-ai-coding-agent-claude-codex)) | Building Bulbu; credited in the submission | Development |

### Muse Spark: the live companion

- *Basic use:* chatbot replies.
- *Bulbu's use:* Spark **controls the 3D character through tool calls**, choosing emote, animation, outfit, glow, and line, so the AI acts through Bulbu's body.
- Reads screenshots, receipts, meals, and voice notes into structured activities with no forms.
- Writes every notification in Bulbu's voice, and powers Chat with Bulbu.

### Muse Wonder: memory and judgment

- *Basic use:* answering hard questions.
- *Bulbu's use:*
  - **Nightly reflection** over the user's entire history in one pass, using the 1M-token context instead of retrieval snippets.
  - **Active Memory** for the meaning layer: preferences, context, promises.
  - **Forecasting as a tool:** calls the engine for exact numbers and never guesses.
  - **What-if simulator** and the weekly "letter from your future self."
  - **Plans tomorrow's nudges** for the moments the user usually drifts, and decides when Bulbu evolves.
- Used sparingly because it costs more; prompts are tested on Spark first.

### Muse Glimmer: Bulbu Home

- *Basic use:* running a local model.
- *Bulbu's use:* processes bank SMS, calendar, and screen-time data locally so raw data never leaves the user's computer; keeps answering offline.
- Too large for phones, so it is an optional tier on a laptop or Mac; the app works fully without it.
- Stretch: a fine-tuned "Bulbu Lite" version of Glimmer that classifies activities offline, trained on labels produced by Wonder.

### Muse Image: Bulbu's world

- *Basic use:* generating a picture.
- *Bulbu's use:* personalized backdrops for each goal and **earned outfit textures** unique to each user.
- Renders of Bulbu are passed as reference images to the edit endpoint, so the scene or outfit changes while Bulbu stays himself.

### SAM 3.1: Bulbu's eyes

- *Basic use:* image segmentation.
- *Bulbu's use:* **your real goal enters Bulbu's world.** Photograph the thing you want (the actual iPhone), SAM cuts it out, and it appears in Bulbu's 3D scene; Bulbu moves closer to it as you progress.
- Segments meal photos for portion estimates.
- Stretch: tracks a person in a short workout video to count reps, so exercise logs itself.

### Muse Code: the builder

- Used to build the forecasting engine, the layer that lets models control Bulbu, and the tests; this is stated in the submission.
- The only route to Muse Wonder Full, which is not available through the API.

**Model routing and cost.** Free local work first (Glimmer), cheap fast calls during the day (Spark), and the expensive model once a night (Wonder). This keeps serving costs compatible with Indian consumer pricing. The Meta Model API is documented as compatible with the OpenAI and Anthropic SDKs, so every model is called the same way.

## Unexpected capabilities we surface

These are the uses most teams will not think of, and they carry the "surfaced unexpected capabilities" part of the tooling score.

1. **An AI that acts through a 3D body.** Muse Spark drives a real character's emotes, outfits, and glow through tool calls instead of only writing text.
2. **Whole-history reflection.** Muse Wonder reads a user's entire month in one pass with its 1M-token context and Active Memory, finding patterns the user never stated.
3. **Your real goal inside the character's world.** SAM 3.1 cuts the actual object out of a photo and places it in Bulbu's 3D scene.
4. **Consistent character editing.** Muse Image's reference-based editing keeps Bulbu unchanged while generating new outfits and scenes per user.
5. **Model-to-model handoff.** Glimmer keeps raw data private locally, Spark handles the day, Wonder thinks overnight, each feeding the next.
6. **Offline private tier.** Bulbu keeps working with the Wi-Fi off, through Glimmer.
7. **Frontier-to-local distillation (stretch).** Wonder labels activities, and a fine-tuned Glimmer learns to classify them offline.
8. **Self-logging exercise (stretch).** SAM 3.1 video tracking counts reps from a short clip.

## Inference partners and credits

The core product must run on the $150 Meta Model API credits alone; partner credits go to select participants and are treated as a bonus.

| Source | Amount | Bulbu's use |
| --- | --- | --- |
| Meta Model API | $150 | Spark, Wonder, Image, SAM 3.1: the product itself |
| Baseten | $100 + 2M TPM | Muse Glimmer endpoint for development and cloud fallback; synthetic demo history |
| Modal | $100 | Fine-tuning Glimmer into "Bulbu Lite" (stretch); running SAM 3.1 open weights for video if needed |
| Fireworks | $25 + workshop with Sinan Ozdemir | Attend the workshop; backup open-weights endpoint |

**Spending principles**

- Muse Wonder is the largest cost. Keep the long history as a stable prefix so nightly runs use cached input, which is 20× cheaper.
- Test prompts on Spark, then switch to Wonder once they work.
- Muse Image at $0.01 per image is a minor cost.
- Keep a reserve for demo day and the final recording, and check spend daily.
- The privacy demo runs Glimmer locally on a capable Mac or laptop, because cloud-hosted Glimmer does not prove that data stays on the device.

**Open item:** the Credit Terms PDF still needs a careful read (what the $150 covers, and whether unused credits expire).

## Hackathon fit and judging criteria

Bulbu answers every line of the theme "Build for Your World," and targets the indie developer track.

| Theme line | How Bulbu answers it |
| --- | --- |
| Bring Meta's models into your domain | Personal growth and goal-setting, using six Meta products in their natural roles |
| Solve a problem you know firsthand | Built by a student living the DSA-versus-scrolling problem |
| Free up time and mental space | No manual tracking: talk, snap a screenshot, and Bulbu understands |
| Make something possible that wasn't before | Seeing, in the moment, what a small choice does to a goal months away |

**"Wasn't possible before" claim.** Before, seeing the long-term cost of a small choice meant months of tracking and spreadsheets nobody keeps. Now Bulbu reads your messy day from a screenshot or a sentence, remembers your patterns for weeks, and shows you in the moment what this scroll or this order does to your goal.

**Judging criteria**

- **Impact (30%):** who benefits (students and young earners), how much it matters (goals decided by small daily choices), whether people would use it (designed as a real consumer product), and fit with the problem statements. The pitch should reuse the event's exact problem-statement wording.
- **Use of Meta AI tooling (25%):** six products, each doing a real job, beyond basic integration, plus the unexpected capabilities listed above.

**What decides whether Bulbu wins**

1. A sharp "wasn't possible before" claim.
2. Forecasts that are real and explainable, with a tap-to-see breakdown.
3. A demo that opens on the moment, not the menu.

**Application answers** have been drafted: what we want to build (Bulbu), and a past AI project (0G Flow, a verifiable AI-agent marketplace on 0G that won a $220 grant in the 0G WaveHack on AKINDO).

## Demo story

The demo shows the whole idea in about a minute: small actions, visible consequences, instant reaction.

1. **The firsthand hook.** A student who wants to crack DSA but loses evenings to scrolling.
2. **The moment.** Upload a real screen-time screenshot showing 2 hours on Instagram. Bulbu droops and dims, and the DSA goal slips 3 days, with the math shown on tap.
3. **The swap.** Bulbu offers one: solve one problem now. The user logs it, Bulbu celebrates, and the goal moves back.
4. **The notification.** Cross 30 minutes on Instagram on an Android phone; Bulbu's nudge arrives with a drooping emote and a "Start focus" button that opens Focus Mode.
5. **What-if.** Ask "What if I cook 3 nights a week?" and watch the iPhone goal move closer.
6. **Memory.** Bulbu surfaces a pattern the user never stated: "You overspend on nights you code past 1 AM. Want a nudge at 11:30?"
7. **The goal in Bulbu's world.** The real iPhone, cut out by SAM 3.1, sits in Bulbu's scene, now a step closer.
8. **Privacy.** Cut the Wi-Fi, and Bulbu Home keeps answering.
9. **Then the models.** Only after judges care, show which Meta model does what.

The demo runs on realistic seeded history (about 30 days) for two or three demo users, such as a DSA student and someone saving for an iPhone, recorded on a real Android phone.

## Risks, open questions, honest limitations

The biggest risk is looking like another habit tracker; the rest are data access and model details to confirm.

**Risks**

- **"Another habit tracker."** Judges will have seen many. The pitch must lead with the forecast moment and Bulbu, not dashboards and checklists.
- **Pretty but thin.** Polished design with shallow AI is caught fast. Forecasts must be real and explainable.
- **Over-claiming data.** Bulbu cannot see Reels time through any API; claims must match real sources.
- **Strong competition.** A worldwide event with a $1M prize pool across indie and startup tracks.
- **Scope.** Too many features spread thin; the forecasting engine and core loop come before extras.
- **Cost.** Overusing Muse Wonder would burn credits and make the ₹149/month price hard to sustain.
- **Annoying nudges.** Too many or guilt-based notifications would drive users away; caps and swaps prevent this.

**Open questions to confirm**

- [ ] Is Muse Wonder's Active Memory available through the API, or only in Meta's apps? Fallback: Bulbu's own meaning store plus whole-history nightly reflection.
- [ ] Does Muse Image's reference editing keep Bulbu consistent enough for outfits and scenes? Fallback: generated backdrops only.
- [ ] Is Meta Model API access available to selected participants in India? Fallback: open-weight models through partners.
- [ ] What do the Credit Terms say about coverage and expiry?
- [ ] What are the event's exact problem statements?
- [ ] What does Instagram's data export actually include?

**Honest limitations**

- Usage data is per app, not per feature (Instagram time, not Reels time).
- iOS screen-time access needs Apple's special approval, so Android comes first.
- Muse Glimmer needs a laptop or Mac; most users will rely on the cloud tier.
- Patterns are statistical correlations, not proven causes, and Bulbu words them that way.

## Business and long-term vision

Bulbu is meant to become a large-scale consumer product over the coming years, not only a hackathon entry.

- **Pricing:** about ₹149/month, in line with Indian subscription norms such as Netflix and Spotify.
- **Serving costs:** most usage runs on cheaper and local models, with the frontier model reserved for nightly reflection and premium features.
- **Market:** India first, where UPI and food-delivery micro-spending and placement preparation make the problem acute.
- **Platforms:** Android first, with a web version so anyone can try Bulbu from a link; iOS once Screen Time access is approved.
- **Earlier competition:** Shipaton 2026 Next Gen Award (RevenueCat's student category).
- **Ambition:** a companion people open every day because it shows them who their habits are building, and helps them change course while it still matters.

## Sources

- [Muse Spark announcement (Meta)](https://about.fb.com/ja/news/2026/04/introducing-muse-spark-meta-superintelligence-labs-first-model-built-to-prioritize-people/embed/)
- [Muse Wonder (YourStory)](https://yourstory.com/ai-story/muse-wonder-meta-ai-race-frontier-models)
- [What is Muse Wonder (DEV)](https://dev.to/hassann/what-is-muse-wonder-5f08)
- [Muse Glimmer (Campus Technology)](https://campustechnology.com/articles/2026/08/26/meta-releases-muse-glimmer-an-open-weight-ai-model-designed-to-run-on-consumer-hardware.aspx?p=1)
- [Muse Image API pricing (RuntimeWire)](https://runtimewire.com/article/meta-ships-muse-image-api-at-one-cent-per-image)
- [Muse Image editing (OrcaRouter)](https://www.orcarouter.ai/blog/muse-image)
- [SAM 3.1 (Hugging Face)](https://huggingface.co/facebook/sam3.1)
- [SAM 3.1 on Meta Model API (Digg)](https://digg.com/ai/icmesfai)
- [Muse Code (Decrypt)](https://decrypt.co/375001/muse-code-meta-ai-coding-agent-claude-codex)
- [Instagram API in 2026 (Storrito)](https://storrito.com/resources/Instagram-API-2026)
- [Instagram API permission scopes (Phyllo)](https://www.getphyllo.com/post/instagram-api-permissions-scopes)
