import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { GoalTemplate } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { GoalRow } from "@/components/GoalRow";
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
      setAdding(false); setTitle(""); setTarget(""); setBase(""); await refresh(); toast("Goal added");
    } catch (e) { toast((e as Error).message); }
  };
  return (
    <Screen tabs>
      <Header back={false} title="Quests" subtitle="Your goals. Every step on them makes Light and XP for Bulbu." right={<IconBtn soft name="plus" label="Add goal" onPress={() => setAdding(true)} />} />
      {state.goals.map(g => <Card key={g.id}><GoalRow g={g} /></Card>)}
      {!state.goals.length && <Card style={{ alignItems: "center", gap: 12 }}><Text style={T.muted}>No goals yet.</Text><Btn title="Add a goal" onPress={() => setAdding(true)} /></Card>}
      <Sheet open={adding} onClose={() => setAdding(false)} title="New goal">
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
        <Btn title="Add goal" onPress={add} />
      </Sheet>
    </Screen>
  );
}
