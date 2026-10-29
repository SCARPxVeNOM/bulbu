// Home: Bulbu's Kingdom. Every goal is a building round Bulbu: its level is how far the goal has come, it's under
// construction until the goal is reached, and the label over it says when construction finishes (the forecast).
// Distraction rolls the Dim (fog) over the buildings it slowed; good moves make them glow. The main goal is the
// Castle, with its treasure floating on top. Drag to look round; tap a label to open the building; tap Bulbu and it
// waves (or shows off what you gave it). First time here, Bulbu gives you the tour.
// After a new move (a screen-time screenshot, say) the kingdom plays the moment: the Dim rolls over the buildings it
// slowed, their finish dates slip on the labels, Bulbu droops, and a card says what happened and how to clear it.
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { fmtDays } from "@bulbu/engine";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Bulbu } from "@/components/bulbu/Bulbu";
import { Hud } from "@/components/world/Hud";
import { Tour } from "@/components/world/Tour";
import { MomentCard } from "@/components/world/MomentCard";
import { HandButton, HandSheet } from "@/components/world/Hand";
import { RaidChip, RaidSheet } from "@/components/world/Raid";
import { WhatIfBar, WhatIfPanel } from "@/components/world/WhatIf";
import { GlossyIcon } from "@/components/GlossyIcon";
import { tap } from "@/components/ui";
import { C, F } from "@/theme";
import type { KingdomLabel } from "@/components/bulbu/BulbuDom";
import type { BuildingId, KingdomMoment, KingdomWhatIfView, Snapshot } from "@bulbu/api";

const PLOT_NAME: Record<BuildingId, string> = { Castle: "Castle", Library: "Library Tower", Vault: "Vault", Arena: "Arena", Observatory: "Observatory", Workshop: "Workshop" };
const shortDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** What the 3D kingdom shows, and the labels over it. */
type SimStop = KingdomWhatIfView["stops"][number];
function kingdomView(s: Snapshot, moments: KingdomMoment[] = [], sim: SimStop | null = null) {
  const k = s.kingdom, mo = new Map(moments.map(m => [m.id, m]));
  // a what-if on the dial: the buildings it moves light up, and their labels show the new date
  const simAt = new Map((sim?.buildings ?? []).map(b => [b.id as string, b]));
  const view = {
    buildings: k.buildings.map(b => ({ id: b.id, level: b.level, building: b.building, glow: simAt.has(b.id) ? 1 : b.glow, fog: b.fog })),
    plots: k.plots,
    treasure: treasureOf(s),
    // the next Dim raid's storm over its target, thicker as it nears (six hours out to the hour it strikes)
    raid: s.raid && s.raid.state !== "passed"
      ? { id: s.raid.building, state: s.raid.state, near: Math.round(Math.max(0, 1 - (+new Date(s.raid.at) - +new Date(s.now)) / (6 * 3600_000)) * 20) / 20 }
      : null,
  };
  const labels: KingdomLabel[] = [
    ...k.buildings.map(b => {
      const m = sim ? undefined : mo.get(b.id), w = simAt.get(b.id);
      if (w && w.eta) return {
        id: b.id, title: `${b.name} · Lv ${b.level}`, kind: "building" as const, dim: false, sub: `Ready ${shortDate(w.eta)}`,
        was: w.etaBefore && w.etaBefore !== w.eta ? shortDate(w.etaBefore) : undefined, shift: `${w.daysSooner} ${w.daysSooner === 1 ? "day" : "days"} sooner`, tone: "light" as const,
      };
      return {
        id: b.id, title: `${b.name} · Lv ${b.level}`, kind: b.building ? "building" as const : "built" as const, dim: b.fog > 0.35,
        sub: !b.building ? "Built!" : b.eta ? `Ready ${shortDate(b.eta)}` : "Waiting for a first move",
        // during a moment the label shows the date it was, struck through, and how far it moved
        ...(m && Math.abs(m.days) >= 0.05 && {
          was: m.etaBefore && m.etaBefore !== b.eta ? shortDate(m.etaBefore) : undefined,
          shift: m.days > 0 ? fmtDays(m.days) : `${fmtDays(m.days).slice(1)} sooner`, tone: m.kind,
        }),
      };
    }),
    // empty plots in front get a label; the Workshop's (behind the castle) stays quiet until it's built
    ...k.plots.filter(id => id !== "Castle" && id !== "Workshop").map(id => ({ id, title: PLOT_NAME[id], sub: "Empty plot", kind: "plot" as const, dim: false })),
  ];
  return { view, labels };
}

/** The Castle's Goal Treasure: the real thing you're working toward, cut out of your photo (SAM 3.1), if you've
 *  added one; until then, a golden orb. */
function treasureOf(s: Snapshot) {
  const main = s.goals.find(g => g.id === s.kingdom.mainGoalId);
  const want = main?.template === "iphone" ? "iphone" : null;
  const mine = s.inventory.items.find(i => i.id === want)?.mine;
  if (!mine?.photo) return null;
  return {
    photo: api.mediaUrl(mine.photo.file),
    ...(mine.cutout && { mask: api.mediaUrl(mine.cutout.mask), box: mine.cutout.box }),
  };
}

export default function Home() {
  const { state, reaction, setReaction, refresh, toast, moment, setMoment, hand, playCard } = useStore();
  const ins = useSafeAreaInsets();
  // the hand sheet: false when closed, otherwise the building whose card goes first (or null)
  const [cardsFor, setCardsFor] = useState<string | null | false>(false);
  const [raidOpen, setRaidOpen] = useState(false);
  // the what-if: open, the result (every stop on the dial), and where the dial is
  const [wi, setWi] = useState<{ open: boolean; result: KingdomWhatIfView | null; stop: number; busy: boolean; error: string | null }>({ open: false, result: null, stop: 0, busy: false, error: null });
  const askWhatIf = async (text: string) => {
    setWi(w => ({ ...w, busy: true, error: null }));
    try {
      const r = await api.kingdomWhatIf(text);
      if ("error" in r) setWi(w => ({ ...w, busy: false, result: null, error: r.error }));
      else setWi(w => ({ ...w, busy: false, result: r, stop: r.knob.index }));
    } catch (e) { setWi(w => ({ ...w, busy: false, error: (e as Error).message })); }
  };
  const top = moment?.items[0] ?? null;
  // the 3D side of the moment: the biggest shift plays on its building
  const play = useMemo(() => top && moment ? {
    key: moment.key, id: top.id, kind: top.kind, fogFrom: top.fogBefore, fogTo: top.fogAfter, glowFrom: top.glowBefore, glowTo: top.glowAfter,
  } : null, [moment, top]);
  if (!state) return null;
  const world = state.world, inv = state.inventory;
  const wearing = inv.items.find(i => i.equipped && i.source !== "real");
  const held = inv.items.find(i => i.id === inv.gear && i.owned);
  const shopReady = inv.items.filter(i => i.affordable).length;
  // Bulbu gets sleepy when today is mostly scrolling
  // ...and droops while the Dim rolls in
  const dimming = top?.kind === "dim";
  const sim = wi.open && wi.result ? wi.result.stops[wi.stop] : null;
  const emote = sim?.buildings.length ? "thriving" : dimming ? "drained" : reaction?.emote ?? (world.fog > 0.6 ? "drained" : state.emote);
  const kv = kingdomView(state, moment?.items, sim);
  const ideas = whatIfIdeas(state);
  const closeMoment = () => { setMoment(null); setReaction(null); };
  const openBuilding = (id: string) => {
    const b = state.kingdom.buildings.find(x => x.id === id);
    if (b) router.push(`/building/${id}` as never);
    else router.navigate("/goals" as never);              // an empty plot: add a goal to build there
  };
  const cards = hand?.cards ?? [];
  // "Clear it" plays today's card for that building when there is one, else the engine's swap (opens the building)
  const clearCard = top ? cards.find(c => c.building === top.id) : undefined;
  const clear = clearCard ? { title: clearCard.title, detail: `${fmtDays(-clearCard.daysCloser).slice(1)} sooner` } : moment?.swap ?? null;
  const step = async (n: number, gift = false) => { try { await api.tutorial(n, gift); await refresh(); } catch (e) { toast((e as Error).message); } };

  return (
    <View style={{ flex: 1, backgroundColor: "#B9B8FF" }}>
      <Bulbu kingdom={kv.view} labels={kv.labels} onBuilding={openBuilding} moment={play} keepAlive emote={emote}
             glow={(dimming ? Math.min(0.3, reaction?.glow ?? state.glow) : reaction?.glow ?? state.glow) + (wearing ? (wearing.level - 1) * 0.15 : 0)} outfit={state.user.outfit}
             gear={held?.hold ? held.id : null} gearColor={held?.mine?.color}
             line={world.tutorial >= 0 || top || wi.open ? null : reaction?.line} animation={dimming ? "Sleepy" : reaction?.animation} cue={moment?.key ?? (reaction ? 1 : 0)} style={{ position: "absolute", inset: 0 }} />
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, paddingTop: Math.max(12, ins.top + 4), paddingHorizontal: 14 }}>
        <Hud world={world} name={state.user.name} nudges={state.nudges.length}
             extra={state.raid && <RaidChip raid={state.raid} onPress={() => setRaidOpen(true)} />} />
      </View>

      {/* the inventory, like a game's bag button (out of the way while a moment's card or the what-if is up) */}
      {!top && !wi.open && <Pressable accessibilityRole="button" accessibilityLabel={`Inventory${shopReady ? `, ${shopReady} things you can buy` : ""}`} onPress={() => { tap(); router.navigate("/inventory" as never); }}
                 style={({ pressed }) => ({ position: "absolute", right: 16, bottom: 118 + ins.bottom, alignItems: "center", transform: [{ scale: pressed ? 0.94 : 1 }] })}>
        <View style={{ width: 66, height: 66, borderRadius: 22, overflow: "hidden", borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center",
                       shadowColor: "#5B4FD0", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
          <LinearGradient colors={["#FFE7A3", "#F5A524"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ position: "absolute", inset: 0 }} />
          <GlossyIcon name="trophy" size={42} />
        </View>
        <Text style={{ marginTop: 4, fontFamily: F.heavy, fontSize: 12, color: "#fff", textShadowColor: "rgba(40,30,120,.55)", textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } }}>Inventory</Text>
        {shopReady > 0 && <View style={{ position: "absolute", top: -6, right: -6, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.red, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
          <Text style={{ color: "#fff", fontFamily: F.heavy, fontSize: 11 }}>{shopReady}</Text></View>}
      </Pressable>}
      {/* the hand of cards, above the inventory */}
      {!top && !wi.open && (
        <View style={{ position: "absolute", right: 16, bottom: 212 + ins.bottom }}>
          <HandButton cards={cards} onPress={() => setCardsFor(null)} />
        </View>
      )}
      {state.raid && <RaidSheet raid={state.raid} open={raidOpen} onClose={() => setRaidOpen(false)} />}
      <HandSheet open={cardsFor !== false} focus={cardsFor || null} cards={cards} onClose={() => setCardsFor(false)}
                 onPlay={async c => { const r = await playCard(c.id); if (r) setCardsFor(false); }} />
      {top && (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 14, right: 14, bottom: 98 + ins.bottom }}>
          <MomentCard m={top} clear={clear} onClose={closeMoment}
                      onOpen={() => { if (clearCard) setCardsFor(top.id); else { closeMoment(); openBuilding(top.id); } }} />
        </View>
      )}
      {/* the what-if: the main way to play with the future. The bar, and the panel with its dial */}
      {!top && !wi.open && (
        <View style={{ position: "absolute", left: 16, right: 100, bottom: 126 + ins.bottom }}>
          <WhatIfBar onPress={() => setWi(w => ({ ...w, open: true }))} />
        </View>
      )}
      {wi.open && (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 14, right: 14, bottom: 98 + ins.bottom }}>
          <WhatIfPanel ideas={ideas} result={wi.result} stop={wi.stop} busy={wi.busy} error={wi.error}
                       onAsk={askWhatIf} onStop={i => setWi(w => ({ ...w, stop: i }))}
                       onClose={() => setWi({ open: false, result: null, stop: 0, busy: false, error: null })} />
        </View>
      )}

      {world.tutorial >= 0 && (
        <Tour world={world} name={state.user.name} busy={false} onStep={n => step(n)} onGift={() => step(world.tutorial + 1, true)} onFinish={() => step(-1)} />
      )}
    </View>
  );
}

/** Plans to try, from the goals you have (and your late-night scrolling, if there is a raid to predict). */
function whatIfIdeas(s: Snapshot): string[] {
  const t = new Set(s.goals.map(g => g.template));
  return [
    ...(s.raid ? ["Sleep by 12"] : []),
    ...(t.has("savings") || t.has("iphone") ? ["Cook 3 nights a week"] : []),
    ...(t.has("dsa") ? ["Solve 2 problems a day"] : []),
    "1 hour less Instagram a day",
    ...(t.has("reading") ? ["Read 20 pages a day"] : []),
    ...(t.has("fitness") ? ["Work out 4 times a week"] : []),
  ];
}
