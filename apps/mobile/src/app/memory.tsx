import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Fact } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { fmtDate } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { Btn, Card, Header, Input, Pill, Row, Screen, Sheet, tap } from "@/components/ui";
import { C, T } from "@/theme";

const GROUPS: [Fact["kind"], string, string][] = [
  ["fact", "Who you are", "Things you told Bulbu, or that Bulbu inferred"],
  ["pattern", "How you behave", "Recomputed every night from your history"],
  ["promise", "Promises", "Bulbu checks back on these"],
  ["win", "Wins", "Moments worth remembering"],
];

export default function Memory() {
  const { state, refresh, toast } = useStore();
  const [edit, setEdit] = useState<Fact | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!state) return null;
  const letter = state.letter;

  const save = async () => { if (!edit) return; await api.editMemory(edit.id, { text }); setEdit(null); refresh(); toast("Corrected. Bulbu will use this from now on."); };
  const forget = async (f: Fact) => { await api.forget(f.id); setEdit(null); refresh(); toast("Forgotten"); };
  const reflect = async () => {
    setBusy(true);
    try { const r = await api.reflect(); await refresh(); toast(r.via === "wonder" ? "Muse Wonder reflected on your month" : "Patterns recomputed"); }
    catch (e) { toast((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <Header title="What Bulbu remembers" subtitle="Numbers live in your ledger. Meaning lives here. See, correct or delete anything." />
      {letter && <Card style={{ backgroundColor: "#F4F1FF", gap: 6 }}><Text style={T.b}>A letter from future you</Text><Text style={[T.body, { fontStyle: "italic" }]}>{letter.text}</Text><Text style={T.tiny}>{fmtDate(letter.at, { weekday: "long", day: "numeric", month: "short" })}</Text></Card>}
      {GROUPS.map(([kind, title, sub]) => {
        const list = state.facts.filter(f => f.kind === kind);
        if (!list.length && kind !== "fact") return null;
        return (
          <Card key={kind}>
            <Text style={T.cardTitle}>{title}</Text>
            <Text style={[T.tiny, { marginBottom: 6 }]}>{sub}</Text>
            {list.map((f, i) => (
              <Pressable key={f.id} accessibilityRole="button" accessibilityLabel={`Edit: ${f.text}`} onPress={() => { tap(); setEdit(f); setText(f.text); }}
                         style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 10, borderBottomWidth: i < list.length - 1 ? 1 : 0, borderColor: C.line }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[T.body, { textDecorationLine: f.done ? "line-through" : "none" }]}>{f.text}</Text>
                  {f.detail && <Text style={T.small}>{f.detail}</Text>}
                  <Row gap={6} style={{ flexWrap: "wrap" }}>
                    <Pill tone={f.source === "stated" ? "green" : "grey"} title={f.source === "stated" ? "You said" : "Inferred"} />
                    {f.source === "inferred" && <Pill tone="grey" title={`${Math.round(f.confidence * 100)}% sure`} />}
                    {f.checkAt && !f.done && <Pill title={`Check-in ${fmtDate(f.checkAt)}`} />}
                  </Row>
                </View>
                <Icon name="edit" size={16} color={C.muted} />
              </Pressable>
            ))}
            {!list.length && <Text style={T.small}>Nothing yet. Tell Bulbu about yourself in chat.</Text>}
          </Card>
        );
      })}
      <Btn kind="ghost" icon="refresh" title={busy ? "Reflecting…" : "Run tonight's reflection now"} busy={busy} onPress={reflect} />
      <Text style={[T.tiny, { textAlign: "center" }]}>Every night Bulbu merges duplicates, updates confidence, recomputes patterns and lets stale guesses fade.</Text>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Edit memory">
        {edit && <>
          <Input multiline value={text} onChangeText={setText} style={{ minHeight: 90 }} />
          {edit.kind === "pattern" && <Text style={T.small}>Correcting a pattern turns it into something you said, e.g. “No, I wasn't stressed, that was a party.”</Text>}
          <Btn title="Save correction" disabled={!text.trim()} onPress={save} />
          {edit.kind === "promise" && !edit.done && <Btn kind="ghost" title="I kept this promise" onPress={async () => { await api.editMemory(edit.id, { done: true }); setEdit(null); refresh(); toast("Promise kept! 🎉"); }} />}
          <Btn kind="danger" icon="trash" title="Forget this" onPress={() => forget(edit)} />
        </>}
      </Sheet>
    </Screen>
  );
}
