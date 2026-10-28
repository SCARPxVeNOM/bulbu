// Home: Bulbu's Kingdom. Every goal is a building round Bulbu: its level is how far the goal has come, it's under
// construction until the goal is reached, and the label over it says when construction finishes (the forecast).
// Distraction rolls the Dim (fog) over the buildings it slowed; good moves make them glow. The main goal is the
// Castle, with its treasure floating on top. Drag to look round; tap a label to open the building; tap Bulbu and it
// waves (or shows off what you gave it). First time here, Bulbu gives you the tour.
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Bulbu } from "@/components/bulbu/Bulbu";
import { Hud } from "@/components/world/Hud";
import { Tour } from "@/components/world/Tour";
import { GlossyIcon } from "@/components/GlossyIcon";
import { tap } from "@/components/ui";
import { C, F } from "@/theme";
import type { KingdomLabel } from "@/components/bulbu/BulbuDom";
import type { BuildingId, Snapshot } from "@bulbu/api";

const PLOT_NAME: Record<BuildingId, string> = { Castle: "Castle", Library: "Library Tower", Vault: "Vault", Arena: "Arena", Observatory: "Observatory", Workshop: "Workshop" };
const shortDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** What the 3D kingdom shows, and the labels over it. */
function kingdomView(s: Snapshot) {
  const k = s.kingdom;
  const view = {
    buildings: k.buildings.map(b => ({ id: b.id, level: b.level, building: b.building, glow: b.glow, fog: b.fog })),
    plots: k.plots,
    treasure: treasureOf(s),
  };
  const labels: KingdomLabel[] = [
    ...k.buildings.map(b => ({
      id: b.id, title: `${b.name} · Lv ${b.level}`, kind: b.building ? "building" as const : "built" as const, dim: b.fog > 0.35,
      sub: !b.building ? "Built!" : b.eta ? `Ready ${shortDate(b.eta)}` : "Waiting for a first move",
    })),
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
  const { state, reaction, refresh, toast } = useStore();
  const ins = useSafeAreaInsets();
  if (!state) return null;
  const world = state.world, inv = state.inventory;
  const wearing = inv.items.find(i => i.equipped && i.source !== "real");
  const held = inv.items.find(i => i.id === inv.gear && i.owned);
  const shopReady = inv.items.filter(i => i.affordable).length;
  // Bulbu gets sleepy when today is mostly scrolling
  const emote = reaction?.emote ?? (world.fog > 0.6 ? "drained" : state.emote);
  const kv = kingdomView(state);
  const openBuilding = (id: string) => {
    const b = state.kingdom.buildings.find(x => x.id === id);
    if (b) router.push(`/goal/${b.goalId}` as never);
    else router.navigate("/goals" as never);              // an empty plot: add a goal to build there
  };
  const step = async (n: number, gift = false) => { try { await api.tutorial(n, gift); await refresh(); } catch (e) { toast((e as Error).message); } };

  return (
    <View style={{ flex: 1, backgroundColor: "#B9B8FF" }}>
      <Bulbu kingdom={kv.view} labels={kv.labels} onBuilding={openBuilding} keepAlive emote={emote} glow={(reaction?.glow ?? state.glow) + (wearing ? (wearing.level - 1) * 0.15 : 0)} outfit={state.user.outfit}
             gear={held?.hold ? held.id : null} gearColor={held?.mine?.color}
             line={world.tutorial >= 0 ? null : reaction?.line} animation={reaction?.animation} cue={reaction ? 1 : 0} style={{ position: "absolute", inset: 0 }} />
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, paddingTop: Math.max(12, ins.top + 4), paddingHorizontal: 14 }}>
        <Hud world={world} name={state.user.name} nudges={state.nudges.length} />
      </View>

      {/* the inventory, like a game's bag button */}
      <Pressable accessibilityRole="button" accessibilityLabel={`Inventory${shopReady ? `, ${shopReady} things you can buy` : ""}`} onPress={() => { tap(); router.navigate("/inventory" as never); }}
                 style={({ pressed }) => ({ position: "absolute", right: 16, bottom: 118 + ins.bottom, alignItems: "center", transform: [{ scale: pressed ? 0.94 : 1 }] })}>
        <View style={{ width: 66, height: 66, borderRadius: 22, overflow: "hidden", borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center",
                       shadowColor: "#5B4FD0", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
          <LinearGradient colors={["#FFE7A3", "#F5A524"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ position: "absolute", inset: 0 }} />
          <GlossyIcon name="trophy" size={42} />
        </View>
        <Text style={{ marginTop: 4, fontFamily: F.heavy, fontSize: 12, color: "#fff", textShadowColor: "rgba(40,30,120,.55)", textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } }}>Inventory</Text>
        {shopReady > 0 && <View style={{ position: "absolute", top: -6, right: -6, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.red, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
          <Text style={{ color: "#fff", fontFamily: F.heavy, fontSize: 11 }}>{shopReady}</Text></View>}
      </Pressable>
      {(wearing || held) && (
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
