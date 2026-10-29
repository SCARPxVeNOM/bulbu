// A letter from your future self. Muse Wonder reads your month every night and writes it: a story, not charts. Below
// it, what Bulbu has noticed (in words) and how the week moved your kingdom. The maths stays behind "see why" on the
// buildings.
import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { fmtDays } from "@bulbu/engine";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Btn, Card, CardHead, Header, IconBtn, LinkBtn, Row, Screen } from "@/components/ui";
import { C, F, T } from "@/theme";

const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

export default function Letter() {
  const { state, refresh, toast } = useStore();
  const [busy, setBusy] = useState(false);
  if (!state) return null;
  const s = state, letter = s.letter, net = s.week.netDays;
  const main = s.kingdom.buildings.find(b => b.goalId === s.kingdom.mainGoalId);
  const write = async () => {
    setBusy(true);
    try { await api.reflect(); await refresh(); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  // the week, told as a sentence or two about the kingdom
  const week = [
    Math.abs(net) < 0.05 ? "This week your choices kept the kingdom steady." :
      net < 0 ? `This week your choices brought your buildings ${fmtDays(net).slice(1)} closer${main ? `, with the ${main.name} leading the way` : ""}.`
              : `This week the Dim slowed your buildings by ${fmtDays(net).slice(1)}. It clears quickly: one card tonight starts pulling it back.`,
    s.play.cardsPlayed || s.play.raidsHeld ? `So far you've played ${s.play.cardsPlayed} ${s.play.cardsPlayed === 1 ? "card" : "cards"} and held off ${s.play.raidsHeld} Dim ${s.play.raidsHeld === 1 ? "raid" : "raids"}.` : null,
  ].filter(Boolean).join(" ");

  return (
    <Screen>
      <Header title="A letter from your future self" subtitle="Muse Wonder reads your month at night and writes back from where you're heading."
              right={<IconBtn soft name="brain" label="What Bulbu remembers" onPress={() => router.push("/memory")} />} />

      <Card style={{ gap: 12, backgroundColor: "#FFFDF6", borderColor: "#F3E7C9" }}>
        {letter ? <>
          <Text style={{ fontFamily: F.bold, fontSize: 12, color: "#A0814A", letterSpacing: 0.6 }}>{longDate(letter.at).toUpperCase()}</Text>
          <Text style={{ fontFamily: F.semibold, fontSize: 16, lineHeight: 25, color: "#3B2F1E" }}>{letter.text}</Text>
          <Text style={{ fontFamily: F.heavy, fontSize: 14, color: "#A0814A", textAlign: "right" }}>— you, a little later</Text>
        </> : <>
          <Text style={{ fontSize: 30 }}>✉️</Text>
          <Text style={T.b}>Your first letter is on its way</Text>
          <Text style={T.small}>It arrives after tonight's reflection, once Bulbu has a few days of your choices to read.</Text>
          {s.ai.enabled && <Btn kind="ghost" title="Ask for it now" busy={busy} onPress={write} />}
        </>}
      </Card>

      <Card style={{ gap: 6 }}>
        <CardHead title="This week in your kingdom" />
        <Text style={T.body}>{week}</Text>
      </Card>

      {s.patterns.length > 0 && (
        <Card>
          <CardHead title="What Bulbu has noticed" right={<LinkBtn title="Memory" onPress={() => router.push("/memory")} />} />
          {s.patterns.map((p, i) => (
            <Row key={p.id} style={{ alignItems: "flex-start", paddingVertical: 10, borderBottomWidth: i < s.patterns.length - 1 ? 1 : 0, borderColor: C.line }}>
              <Text style={{ fontSize: 20 }}>🔎</Text>
              <View style={{ flex: 1 }}><Text style={T.b}>{p.text}</Text><Text style={T.small}>{p.detail}</Text></View>
            </Row>
          ))}
          <Text style={[T.tiny, { marginTop: 10 }]}>These are tendencies in your own history, not proven causes. Bulbu uses them to predict Dim raids and deal your cards.</Text>
        </Card>
      )}
    </Screen>
  );
}
