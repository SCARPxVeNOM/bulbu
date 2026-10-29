import { useEffect, useRef, useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ChatReply, Step, WhatIf } from "@bulbu/api";
import { fmtDays } from "@bulbu/engine";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { fmtDate } from "@/lib/format";
import { RENDERS } from "@/lib/renders";
import { useVoiceRecorder } from "@/lib/voice";
import { Background, Breakdown, Btn, Card, Chip, Chips, Header, Pill, Round, Sheet, Thinking } from "@/components/ui";
import { C, F, T, shadow } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";

interface Msg { role: "user" | "assistant"; text: string; extra?: ChatReply }

export default function Chat() {
  const { state, setReaction, refresh, toast } = useStore();
  const ins = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState<WhatIf | null>(null);
  const [pwhy, setPwhy] = useState<{ title: string; steps: Step[]; note?: string } | null>(null);
  const list = useRef<FlatList<Msg>>(null);
  const rec = useVoiceRecorder();

  useEffect(() => { api.messages().then(m => setMsgs(m.map(x => ({ role: x.role as Msg["role"], text: x.content })))).catch(() => {}); }, []);
  useEffect(() => { setTimeout(() => list.current?.scrollToEnd({ animated: true }), 60); }, [msgs.length, busy]);

  const send = async (t: string) => {
    if (!t.trim() || busy) return;
    setMsgs(m => [...m, { role: "user", text: t }]); setText(""); setBusy(true);
    try {
      const r = await api.chat(t);
      setMsgs(m => [...m, { role: "assistant", text: r.reply, extra: r }]);
      if (r.bulbu) setReaction(r.bulbu);
      if (r.remembered?.length) refresh();
    } catch (e) { setMsgs(m => [...m, { role: "assistant", text: `I couldn't reach my brain just now (${(e as Error).message}).` }]); }
    finally { setBusy(false); }
  };
  const dictate = async () => {
    try {
      if (!rec.recording) { await rec.start(); return; }
      const f = await rec.stop(); if (!f) return;
      const r = await api.voice({ uri: f.uri, name: "voice.wav", type: "audio/wav" });
      if (r.transcript) setText(x => (x ? x + " " : "") + r.transcript);
    } catch (e) { toast((e as Error).message); }
  };
  // "ask Bulbu before you act": what a choice will do, before you make it
  const ideas: [string, string][] = [["About to order biryani?", "I'm about to order biryani for ₹380. What does that do to my kingdom?"], ["One more hour of reels?", "Should I scroll Instagram for another hour tonight?"],
    ["Plan my evening", "Plan my evening so my buildings finish sooner"], ["Be my study buddy", "Be my study buddy for the next session"]];

  const Av = () => <Image source={RENDERS.avatar} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#EEF2FF" }} />;
  const Bot = ({ children }: { children: React.ReactNode }) => (
    <View style={[{ backgroundColor: "#fff", borderRadius: 20, borderBottomLeftRadius: 6, paddingVertical: 12, paddingHorizontal: 15 }, shadow]}>{children}</View>
  );
  const render = ({ item: m }: { item: Msg }) => m.role === "user" ? (
    <View style={{ alignSelf: "flex-end", maxWidth: "84%", borderRadius: 20, borderBottomRightRadius: 6, overflow: "hidden" }}>
      <LinearGradient colors={["#DCE4FF", "#E6E2FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 12, paddingHorizontal: 15 }}>
        <Text style={[T.body, { fontSize: 14.5 }]}>{m.text}</Text>
      </LinearGradient>
    </View>
  ) : (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <Av />
      <View style={{ flex: 1, gap: 8, maxWidth: "84%" }}>
        <Bot><Text style={[T.body, { fontSize: 14.5, lineHeight: 21 }]}>{m.text}</Text></Bot>
        {m.extra?.whatIf && (
          <Card tight onPress={() => setWhy(m.extra!.whatIf!)} style={{ backgroundColor: C.greenSoft, shadowOpacity: 0 }}>
            <Text style={T.b}>{m.extra.whatIf.goalTitle}</Text>
            <Text style={T.body}>{fmtDate(m.extra.whatIf.before.eta)} → <Text style={[T.b, { color: C.green }]}>{fmtDate(m.extra.whatIf.after.eta)}</Text> · <Text style={[T.b, { color: C.green }]}>{m.extra.whatIf.daysSooner} days sooner</Text></Text>
            <Text style={T.tiny}>Tap to see the math</Text>
          </Card>
        )}
        {m.extra?.preview && m.extra.preview.buildings.length > 0 && (
          <Card tight style={{ gap: 6, shadowOpacity: 0, backgroundColor: m.extra.preview.buildings.some(b => b.days > 0) ? "#F3F0FF" : C.greenSoft }}>
            <Text style={T.b}>Before you choose: {m.extra.preview.choice}</Text>
            {m.extra.preview.buildings.map(b => (
              <Text key={b.id} style={T.body} onPress={() => setPwhy({ title: `${b.name}: ${m.extra!.preview!.choice}`, steps: b.breakdown, note: b.equivalent })}>
                {b.days > 0 ? "🌫️" : "✨"} {b.name}: <Text style={[T.b, { color: b.days > 0 ? "#5B4AA8" : C.green }]}>{fmtDays(Math.abs(b.days)).slice(1)} {b.days > 0 ? "later" : "sooner"}</Text>  <Text style={[T.tiny, { color: C.primary }]}>See why</Text>
              </Text>
            ))}
            {m.extra.preview.swap && <Text style={T.small}>🃏 Swap: <Text style={T.b}>{m.extra.preview.swap.title}</Text>. {m.extra.preview.swap.detail}</Text>}
          </Card>
        )}
        {!!m.extra?.focus && <Btn small icon="play" title={`Start ${m.extra.focus}-min focus`} onPress={() => router.push("/focus")} />}
        {m.extra?.remembered?.map(r => <Pill key={r} tone="green" title="Saved to memory" />)}
      </View>
    </View>
  );

  return (
    <Background>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ paddingTop: Math.max(14, ins.top + 6), paddingHorizontal: 18 }}>
          <Header title="Ask Bulbu" subtitle="Before you choose, ask. Bulbu shows what it does to your kingdom, and one better swap." />
        </View>
        <FlatList ref={list} data={msgs} keyExtractor={(_, i) => String(i)} renderItem={render} contentContainerStyle={{ padding: 18, gap: 14, flexGrow: 1 }}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={<View style={{ flexDirection: "row", gap: 10 }}><Av /><View style={{ flex: 1 }}><Bot><Text style={T.body}>Hi{state ? ` ${state.user.name}` : ""}! Tell me how it's going, or ask “what if…” and I'll run the numbers for you.</Text></Bot></View></View>}
                  ListFooterComponent={busy ? <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}><Av /><Bot><Thinking /></Bot></View> : undefined} />
        <View style={{ paddingHorizontal: 18, paddingBottom: Math.max(12, ins.bottom + 6), gap: 10 }}>
          {msgs.length < 2 && <Chips wrap>{ideas.map(([l, q]) => <Chip key={l} title={l} onPress={() => send(q)} />)}</Chips>}
          <View style={[{ flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: "#fff", borderRadius: 999, padding: 6, paddingLeft: 8 }, shadow]}>
            <Round name="clock" label="Focus timer" onPress={() => router.push("/focus")} />
            <TextInput value={text} onChangeText={setText} placeholder={rec.recording ? "Listening…" : "About to… ? Ask Bulbu first"} placeholderTextColor={C.muted} accessibilityLabel="Message"
                       onSubmitEditing={() => send(text)} returnKeyType="send" style={{ flex: 1, fontFamily: F.medium, fontSize: 15, color: C.ink, paddingVertical: 8 }} />
            {rec.supported && <Round name="mic" live={rec.recording} label={rec.recording ? "Stop dictation" : "Dictate"} onPress={dictate} />}
            <Round primary name="send" label="Send" disabled={busy} onPress={() => send(text)} />
          </View>
        </View>
      </KeyboardAvoidingView>
      <Sheet open={!!why} onClose={() => setWhy(null)} title={why?.change.label ?? ""}>{why && <Breakdown steps={why.steps} />}</Sheet>
      <Sheet open={!!pwhy} onClose={() => setPwhy(null)} title={pwhy?.title ?? ""}>{pwhy && <Breakdown steps={pwhy.steps} note={pwhy.note} />}</Sheet>
    </Background>
  );
}
