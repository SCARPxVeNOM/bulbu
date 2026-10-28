// Home: Bulbu in its own world, with the game bar on top (level, XP, Light, streak). Bulbu's mood and glow follow
// your day; tap it and it waves. First time here, Bulbu gives you the tour.
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

export default function Home() {
  const { state, reaction, refresh, toast } = useStore();
  const ins = useSafeAreaInsets();
  if (!state) return null;
  const world = state.world, inv = state.inventory;
  const wearing = inv.items.find(i => i.equipped);
  const shopReady = inv.items.filter(i => i.affordable).length;
  // Bulbu gets sleepy when today is mostly scrolling
  const emote = reaction?.emote ?? (world.fog > 0.6 ? "drained" : state.emote);
  const step = async (n: number, gift = false) => { try { await api.tutorial(n, gift); await refresh(); } catch (e) { toast((e as Error).message); } };

  return (
    <View style={{ flex: 1, backgroundColor: "#a3b2f3" }}>
      <Bulbu world keepAlive emote={emote} glow={(reaction?.glow ?? state.glow) + (wearing ? (wearing.level - 1) * 0.15 : 0)} outfit={state.user.outfit}
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
      {wearing && (
        <View pointerEvents="none" style={{ position: "absolute", left: 16, bottom: 130 + ins.bottom, backgroundColor: "rgba(255,255,255,.85)", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1.5, borderColor: "#fff" }}>
          <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.ink }}>Wearing {wearing.name} · {"★".repeat(wearing.level)}</Text>
        </View>
      )}

      {world.tutorial >= 0 && (
        <Tour world={world} name={state.user.name} busy={false} onStep={n => step(n)} onGift={() => step(world.tutorial + 1, true)} onFinish={() => step(-1)} />
      )}
    </View>
  );
}
