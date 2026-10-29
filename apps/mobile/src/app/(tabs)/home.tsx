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
import { GlossyIcon } from "@/components/GlossyIcon";
import { tap } from "@/components/ui";
import { C, F } from "@/theme";
import type { KingdomLabel } from "@/components/bulbu/BulbuDom";
import type { BuildingId, KingdomMoment, Snapshot } from "@bulbu/api";

const PLOT_NAME: Record<BuildingId, string> = { Castle: "Castle", Library: "Library Tower", Vault: "Vault", Arena: "Arena", Observatory: "Observatory", Workshop: "Workshop" };
const shortDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** What the 3D kingdom shows, and the labels over it. */
function kingdomView(s: Snapshot, moments: KingdomMoment[] = []) {
  const k = s.kingdom, mo = new Map(moments.map(m => [m.id, m]));
  const view = {
    buildings: k.buildings.map(b => ({ id: b.id, level: b.level, building: b.building, glow: b.glow, fog: b.fog })),
    plots: k.plots,
    treasure: treasureOf(s),
  };
  const labels: KingdomLabel[] = [
    ...k.buildings.map(b => {
      const m = mo.get(b.id);
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
  const emote = dimming ? "drained" : reaction?.emote ?? (world.fog > 0.6 ? "drained" : state.emote);
  const kv = kingdomView(state, moment?.items);
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
             line={world.tutorial >= 0 || top ? null : reaction?.line} animation={dimming ? "Sleepy" : reaction?.animation} cue={moment?.key ?? (reaction ? 1 : 0)} style={{ position: "absolute", inset: 0 }} />
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, paddingTop: Math.max(12, ins.top + 4), paddingHorizontal: 14 }}>
        <Hud world={world} name={state.user.name} nudges={state.nudges.length} />
      </View>

      {/* the inventory, like a game's bag button (out of the way while a moment's card is up) */}
      {!top && <Pressable accessibilityRole="button" accessibilityLabel={`Inventory${shopReady ? `, ${shopReady} things you can buy` : ""}`} onPress={() => { tap(); router.navigate("/inventory" as never); }}
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
      {!top && (
        <View style={{ position: "absolute", right: 16, bottom: 212 + ins.bottom }}>
          <HandButton cards={cards} onPress={() => setCardsFor(null)} />
        </View>
      )}
      <HandSheet open={cardsFor !== false} focus={cardsFor || null} cards={cards} onClose={() => setCardsFor(false)}
                 onPlay={async c => { const r = await playCard(c.id); if (r) setCardsFor(false); }} />
      {top && (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 14, right: 14, bottom: 98 + ins.bottom }}>
          <MomentCard m={top} clear={clear} onClose={closeMoment}
                      onOpen={() => { if (clearCard) setCardsFor(top.id); else { closeMoment(); openBuilding(top.id); } }} />
        </View>
      )}
      {!top && (wearing || held) && (
        <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 100, bottom: 130 + ins.bottom, alignItems: "flex-start" }}>
          <View style={{ backgroundColor: "rgba(255,255,255,.85)", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1.5, borderColor: "#fff" }}>
            <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 12, color: C.ink }}>{[wearing && `Wearing ${wearing.name} · ${"★".repeat(wearing.level)}`, held && `· tap Bulbu to see your ${held.name}`].filter(Boolean).join(" ")}</Text>
          </View>
        </View>
      )}

      {world.tutorial >= 0 && (
        <Tour world={world} name={state.user.name} busy={false} onStep={n => step(n)} onGift={() => step(world.tutorial + 1, true)} onFinish={() => step(-1)} />
      )}
    </View>
  );
}
