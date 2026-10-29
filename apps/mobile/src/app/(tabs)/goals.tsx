import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { BuildingState, GoalTemplate } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BUILDING_ART } from "@/components/world/buildings";
import { GlossyIcon } from "@/components/GlossyIcon";
import { TEMPLATES } from "@/components/goals";
import { Btn, Card, Field, Header, IconBtn, Input, Row, Screen, Sheet, tap } from "@/components/ui";
import { C, F, T } from "@/theme";

export default function Goals() {
  const { state, refresh, toast } = useStore();
  const [adding, setAdding] = useState(false);
  const [t, setT] = useState<GoalTemplate>("dsa");
  const [title, setTitle] = useState(""), [target, setTarget] = useState(""), [base, setBase] = useState("");
  if (!state) return null;
  const add = async () => {
    try {
      await api.addGoal({ template: t, title: title || undefined, target: Number(target) || undefined, baseline: Number(base) || 0 });
      setAdding(false); setTitle(""); setTarget(""); setBase(""); await refresh(); toast("Construction started!");
    } catch (e) { toast((e as Error).message); }
  };
  return (
    <Screen tabs>
      <Header back={false} title="Quests" subtitle="Every goal is a building in your kingdom. Choose one to see when it's finished, and why." right={<IconBtn soft name="plus" label="Build something new" onPress={() => setAdding(true)} />} />
      {state.kingdom.buildings.map(b => <BuildingRow key={b.id} b={b} />)}
      {!state.goals.length && <Card style={{ alignItems: "center", gap: 12 }}><Text style={T.muted}>No buildings yet.</Text><Btn title="Build your first one" onPress={() => setAdding(true)} /></Card>}
      {state.kingdom.plots.length > 0 && state.goals.length > 0 && (
        <Card onPress={() => setAdding(true)} label="Build on an empty plot" style={{ flexDirection: "row", alignItems: "center", gap: 12, borderStyle: "dashed", borderWidth: 2, borderColor: "#CBD5F5" }}>
          <Text style={{ fontSize: 24 }}>🏗️</Text>
          <View style={{ flex: 1 }}><Text style={T.b}>Build on an empty plot</Text><Text style={T.small}>{state.kingdom.plots.filter(p => p !== "Castle").length} plots free. A new goal raises a new building.</Text></View>
        </Card>
      )}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Build something new">
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 12 }}>
          {TEMPLATES.map(([k, l]) => (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: t === k }} onPress={() => { tap(); setT(k); }} style={{ width: "25%", alignItems: "center", gap: 6 }}>
              <View style={{ borderRadius: 14, borderWidth: 2.5, borderColor: t === k ? C.primary : "transparent", padding: 2 }}><GlossyIcon name={k} size={40} /></View>
              <Text style={{ fontFamily: F.semibold, fontSize: 12, color: t === k ? C.primary : C.ink2 }}>{l.split(" ")[0]}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Name (optional)"><Input value={title} onChangeText={setTitle} placeholder={TEMPLATES.find(x => x[0] === t)![1]} /></Field>
        <Row style={{ alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}><Field label="Target"><Input keyboardType="number-pad" value={target} onChangeText={setTarget} placeholder="default" /></Field></View>
          <View style={{ flex: 1 }}><Field label="Done so far"><Input keyboardType="number-pad" value={base} onChangeText={setBase} placeholder="0" /></Field></View>
        </Row>
        <Btn title="Start building" onPress={add} />
      </Sheet>
    </Screen>
  );
}

const shortDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** A building in the list: its art, name and level, and when construction finishes. Opens its panel. */
function BuildingRow({ b }: { b: BuildingState }) {
  const art = BUILDING_ART[b.id];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${b.name}, ${b.goalTitle}, level ${b.level}. ${b.building ? b.eta ? `Finishes ${shortDate(b.eta)}` : "" : "Built"}`}
               onPress={() => { tap(); router.push(`/building/${b.id}` as never); }}
               style={({ pressed }) => ({ borderRadius: 22, overflow: "hidden", transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <LinearGradient colors={art.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,.4)", alignItems: "center", justifyContent: "center" }}><GlossyIcon name={art.icon} size={40} /></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: F.heavy, fontSize: 16, color: "#fff" }} numberOfLines={1}>{b.name} · Lv {b.level}</Text>
          <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: "rgba(255,255,255,.92)" }} numberOfLines={1}>{b.goalTitle}</Text>
          <Row gap={4}>
            {Array.from({ length: 5 }, (_, i) => <View key={i} style={{ flex: 1, height: 7, borderRadius: 3, backgroundColor: i < b.level ? "#fff" : "rgba(255,255,255,.3)" }} />)}
          </Row>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: "rgba(255,255,255,.85)", letterSpacing: 0.5 }}>{b.building ? "FINISHES" : "BUILT"}</Text>
          <Text style={{ fontFamily: F.heavy, fontSize: 14, color: "#fff" }}>{b.building ? b.eta ? shortDate(b.eta).replace(/ \d{4}$/, "") : "—" : "✓"}</Text>
          {b.fog > 0.2 && <Text style={{ fontSize: 12 }}>🌫️</Text>}
        </View>
      </LinearGradient>
    </Pressable>
  );
}
