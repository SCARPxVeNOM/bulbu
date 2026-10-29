import { Text, View } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { fmtTime } from "@/lib/format";
import { Btn, Card, Header, LinkBtn, Row, Screen } from "@/components/ui";
import { C, T } from "@/theme";

const EMOJI: Record<string, string> = { drained: "🥱", focused: "🧐", happy: "😊", thriving: "🤩", stressed: "😵‍💫", celebrating: "🥳" };
/** web routes in nudge actions → app routes */
const route = (to: string) => to as never;

export default function Nudges() {
  const { state, refresh } = useStore();
  if (!state) return null;
  const now = Date.now();
  return (
    <Screen>
      <Header title="Nudges" subtitle="At most 3 a day, never during quiet hours, always with a swap." />
      {state.nudges.map(n => (
        <Card key={n.id} style={{ borderLeftWidth: 4, borderLeftColor: C.primary }}>
          <Row style={{ alignItems: "flex-start" }} gap={12}>
            <Text style={{ fontSize: 28 }}>{EMOJI[n.emote] ?? "💡"}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={T.tiny}>{+new Date(n.at) > now + 60_000 ? `Planned for ${fmtTime(n.at)}` : "Now"}</Text>
              <Text style={[T.body, { fontFamily: "PlusJakartaSans_600SemiBold" }]}>{n.text}</Text>
              <Row style={{ marginTop: 10 }} gap={14}>
                <Btn small title={n.action.label} onPress={() => router.push(route(n.action.to) as never)} />
                <LinkBtn title="Fewer like this" color={C.ink2} onPress={async () => { await api.dismissNudge(n.kind); refresh(); }} />
              </Row>
            </View>
          </Row>
        </Card>
      ))}
      {!state.nudges.length && <Card style={{ alignItems: "center", gap: 6 }}><Text style={{ fontSize: 30 }}>🌙</Text><Text style={[T.muted, { textAlign: "center" }]}>Nothing right now. Bulbu will step in before the usual drift, not after.</Text></Card>}
    </Screen>
  );
}
