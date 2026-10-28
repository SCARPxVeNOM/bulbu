import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import type { GoalTemplate } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { DETAILS, TEMPLATES } from "@/components/goals";
import { GlossyIcon } from "@/components/GlossyIcon";
import { Btn, Card, Check, Field, Header, Input, LinkBtn, Row, Screen, tap } from "@/components/ui";
import { C, F, T, shadow } from "@/theme";

export default function Setup() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const { signIn, toast } = useStore();
  const [sel, setSel] = useState<GoalTemplate[]>([]);
  const [step, setStep] = useState<"pick" | "detail">("pick");
  const [form, setForm] = useState<Record<string, { title: string; target: string; baseline: string }>>({});
  const [busy, setBusy] = useState(false);
  if (!name) return <Redirect href="/signup" />;

  const toggle = (t: GoalTemplate) => setSel(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t]);
  const toDetail = () => {
    setForm(Object.fromEntries(sel.map(t => [t, form[t] ?? { title: DETAILS[t].title, target: String(DETAILS[t].target), baseline: "0" }])));
    setStep("detail");
  };
  const finish = async () => {
    setBusy(true);
    try {
      const u = await api.createUser(name, sel.map(t => ({ template: t, title: form[t].title || "My goal", target: Math.max(1, Number(form[t].target) || DETAILS[t].target), baseline: Math.max(0, Number(form[t].baseline) || 0) })));
      await signIn(u.id);
    } catch (e) { toast((e as Error).message); setBusy(false); }
  };
  const set = (t: string, k: "title" | "target" | "baseline", v: string) => setForm(f => ({ ...f, [t]: { ...f[t], [k]: v } }));

  if (step === "pick") return (
    <Screen footer={<Btn title="Continue" icon="arrow" disabled={!sel.length} onPress={toDetail} />}>
      <Header back="/signup" />
      <Text style={T.titleL}>What do you want to grow?</Text>
      <Text style={T.muted}>Pick a few. Each one becomes part of your Bulbu World. You can add more later.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {TEMPLATES.map(([t, label]) => {
          const on = sel.includes(t);
          return (
            <Pressable key={t} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => { tap(); toggle(t); }}
                       style={[{ width: "47.5%", padding: 16, paddingVertical: 18, gap: 14, borderRadius: 20, borderWidth: 1.5, borderColor: on ? C.primary : C.cardBorder, backgroundColor: on ? "#F4F6FF" : C.card }, shadow]}>
              <GlossyIcon name={t} size={46} />
              <Text style={{ fontFamily: F.semibold, fontSize: 15, color: on ? C.primary : C.ink2 }}>{label}</Text>
              {on && <View style={{ position: "absolute", top: 10, right: 10 }}><Check on /></View>}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );

  return (
    <Screen footer={<Btn title="Enter Bulbu World" icon="arrow" busy={busy} onPress={finish} />}>
      <Header back={false} title="Your goals" right={<LinkBtn title="Edit" onPress={() => setStep("pick")} />} />
      <Text style={[T.muted, { textAlign: "center" }]}>Bulbu turns every activity into days closer or further from these. The first one is your main focus.</Text>
      {sel.map(t => (
        <Card key={t} style={{ gap: 12 }}>
          <Row><GlossyIcon name={t} size={36} /><Text style={[T.b, { fontSize: 16 }]}>{TEMPLATES.find(o => o[0] === t)![1]}</Text></Row>
          <Field label="Name"><Input value={form[t].title} placeholder="e.g. Learn guitar" onChangeText={v => set(t, "title", v)} /></Field>
          <Row style={{ alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}><Field label={DETAILS[t].targetLabel}><Input keyboardType="number-pad" value={form[t].target} onChangeText={v => set(t, "target", v)} /></Field></View>
            <View style={{ flex: 1 }}><Field label={DETAILS[t].baseLabel}><Input keyboardType="number-pad" value={form[t].baseline} onChangeText={v => set(t, "baseline", v)} /></Field></View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
