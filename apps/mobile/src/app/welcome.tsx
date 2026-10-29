import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Bulbu } from "@/components/bulbu/Bulbu";
import { Btn, Card, LinkBtn, Row, Screen, Sheet, Tile } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { C, F, T } from "@/theme";
import { GelWordmark } from "@/components/HomeHeader";

const DEMOS = [
  { id: "aryan", name: "Aryan", line: "DSA student losing evenings to Instagram", icon: "code", color: "#3D5BFF" },
  { id: "priya", name: "Priya", line: "Young earner saving for an iPhone 17", icon: "phone", color: "#141B4D" },
];

export default function Welcome() {
  const { signIn, toast } = useStore();
  const [demo, setDemo] = useState(false);
  const [cue, setCue] = useState(0);
  const pick = async (id: string, reset = false) => {
    try { if (reset) await api.resetDemo(); else await api.users(); setDemo(false); await signIn(id); }
    catch { toast("Can't reach Bulbu's server. Is it running?"); }
  };
  return (
    <Screen scroll={false}>
      <View style={{ alignItems: "center", marginTop: 26 }}>
        <GelWordmark width={230} />
        <Text style={{ fontFamily: F.heavy, fontSize: 22, color: C.ink, marginTop: 2, letterSpacing: 2 }}>KINGDOM</Text>
        <Text style={{ fontFamily: F.medium, fontSize: 18, color: C.ink2, textAlign: "center", lineHeight: 25, marginTop: 6 }}>See your future before you choose it.{"\n"}Your real choices build the kingdom.</Text>
      </View>
      <View style={{ flex: 1, minHeight: 300, borderRadius: 28, overflow: "hidden" }}>
        <Bulbu emote="focused" outfit={null} animation="Wave" cue={cue} view="full" background="#E7EEFF" onPoke={() => setCue(c => c + 1)} style={{ flex: 1 }} />
        <Text pointerEvents="none" style={{ position: "absolute", right: 10, top: 16, fontFamily: F.bold, fontSize: 19, lineHeight: 20, color: C.ink, textAlign: "center", transform: [{ rotate: "-14deg" }] }}>
          Better{"\n"}Choices{"\n"}Brighter{"\n"}You ♡
        </Text>
      </View>
      <Row gap={7} style={{ justifyContent: "center" }}>
        {[0, 1, 2, 3].map(i => <View key={i} style={{ width: i ? 7 : 20, height: 7, borderRadius: 9, backgroundColor: i ? "#C9D2F2" : C.primary }} />)}
      </Row>
      <Btn title="Start my kingdom" icon="arrow" onPress={() => router.push("/signup")} />
      <View style={{ alignItems: "center" }}><LinkBtn title="Try a demo user" color={C.ink2} onPress={() => setDemo(true)} /></View>

      <Sheet open={demo} onClose={() => setDemo(false)} title="Demo users">
        <Text style={T.small}>Each has about 30 days of realistic history, so forecasts and patterns are live.</Text>
        {DEMOS.map(d => (
          <Card key={d.id} onPress={() => pick(d.id)} label={`Sign in as ${d.name}`}>
            <Row gap={12}>
              <Tile icon={d.icon} color={d.color} size={44} />
              <View style={{ flex: 1 }}><Text style={[T.b, { fontSize: 16 }]}>{d.name}</Text><Text style={T.small}>{d.line}</Text></View>
              <Icon name="right" />
            </Row>
          </Card>
        ))}
        <View style={{ alignItems: "center", paddingVertical: 6 }}><LinkBtn title="Reset demo data and start as Aryan" onPress={() => pick("aryan", true)} /></View>
      </Sheet>
    </Screen>
  );
}
