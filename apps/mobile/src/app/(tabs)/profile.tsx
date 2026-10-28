import { useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { fmtMinutes } from "@bulbu/engine";
import type { Emote } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { RENDERS } from "@/lib/renders";
import { Icon } from "@/components/Icon";
import { Btn, Card, CardHead, Header, IconBtn, Progress, Row, Screen, Seg, Stat, Tile, tap } from "@/components/ui";
import { C, F, T, THEMES, shadow } from "@/theme";

const EMOTES: [Emote, string][] = [["happy", "Happy"], ["drained", "Sleepy"], ["focused", "Focused"], ["thriving", "Excited"], ["celebrating", "Celebrating"], ["stressed", "Stressed"]];

export default function Profile() {
  const { state, refresh, signOut, toast } = useStore();
  const [tab, setTab] = useState<"bulbu" | "stats">("bulbu");
  const [preview, setPreview] = useState<Emote | null>(null);
  if (!state) return null;
  const s = state, u = s.user;
  const setUser = async (b: Parameters<typeof api.updateUser>[0]) => { try { await api.updateUser(b); refresh(); } catch (e) { toast((e as Error).message); } };
  const earned = s.achievements.filter(a => a.earned).length;
  const leave = async () => { await signOut(); router.replace("/welcome"); };
  const wipe = async () => { await api.deleteUser(); await leave(); };
  const confirmWipe = () => Platform.OS === "web" ? wipe() : Alert.alert("Delete your profile?", "This deletes everything Bulbu remembers. It can't be undone.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: wipe }]);

  const Thumb = ({ selected, onPress, children, label, size = 86, locked }: { selected: boolean; onPress?: () => void; children: React.ReactNode; label: string; size?: number; locked?: string }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={locked ? `${label}, unlocks with a ${locked}` : label} accessibilityState={{ selected, disabled: !!locked }} disabled={!!locked}
               onPress={() => { tap(); onPress?.(); }}
               style={[{ width: size, height: size + (size > 70 ? 6 : 0), borderRadius: 18, overflow: "hidden", borderWidth: 2, borderColor: selected ? C.primary : C.cardBorder, backgroundColor: "#EEF2FF" }, shadow]}>
      {children}
      {selected && <View style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}><Icon name="check" size={12} stroke={3} color="#fff" /></View>}
      {locked && <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(20,27,77,.55)", padding: 3, flexDirection: "row", justifyContent: "center", gap: 3 }}><Icon name="lock" size={10} color="#fff" /><Text style={{ color: "#fff", fontFamily: F.bold, fontSize: 10 }}>{locked}</Text></View>}
    </Pressable>
  );

  return (
    <Screen tabs>
      <Header large title="Me" right={<IconBtn soft name="settings" label="What Bulbu remembers" onPress={() => router.push("/memory")} />} />
      <Row gap={14}>
        <LinearGradient colors={["#FFD9B8", "#F7B58C"]} style={{ width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff" }}>
          <Text style={{ fontFamily: F.heavy, fontSize: 25, color: "#7A3E12" }}>{u.name[0]}</Text>
        </LinearGradient>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[T.b, { fontSize: 19 }]}>{u.name}</Text>
          <Text style={T.small}>Level {s.world.level} · {s.streak} day streak · {s.inventory.light} Light</Text>
          <Progress value={(s.world.into / s.world.span) * 100} height={12} label="Level progress" />
          <Text style={T.tiny}>{s.world.span - s.world.into} XP to level {s.world.level + 1}</Text>
        </View>
      </Row>
      <Seg soft value={tab} onChange={setTab} options={[["bulbu", "Bulbu"], ["stats", "Stats"]]} />

      {tab === "bulbu" && <>
        <View>
          <CardHead title="Expressions" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, padding: 2, paddingBottom: 6 }}>
            {EMOTES.map(([e, l]) => (
              <Thumb key={e} size={64} selected={(preview ?? s.emote) === e} label={l} onPress={() => setPreview(e)}>
                <Image source={RENDERS.emote[e]} style={{ width: "100%", height: "100%" }} />
              </Thumb>
            ))}
          </ScrollView>
        </View>
        <View>
          <CardHead title="Themes" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, padding: 2, paddingBottom: 6 }}>
            {Object.entries(THEMES).map(([k, t]) => (
              <Thumb key={k} selected={u.theme === k} label={t.label} onPress={() => setUser({ theme: k })}>
                <LinearGradient colors={t.swatch} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1, justifyContent: "flex-end", padding: 8 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: k === "sky" ? C.ink : "#fff" }}>{t.label}</Text>
                </LinearGradient>
              </Thumb>
            ))}
          </ScrollView>
        </View>
      </>}

      {tab === "stats" && (
        <Card style={{ gap: 10 }}>
          <Row gap={10}><Stat value={String(s.world.xp)} label="XP" /><Stat value={String(s.streak)} label="Day streak" /></Row>
          <Row gap={10}><Stat value={fmtMinutes(s.week.productiveMinutes)} label="Productive this week" /><Stat value={`${earned}/${s.achievements.length}`} label="Badges" /></Row>
          <Row style={{ marginTop: 6, alignItems: "flex-start" }}><Icon name="sparkles" size={18} color={C.primary} />
            <Text style={[T.small, { flex: 1 }]}>{s.ai.enabled ? `Muse Spark (${s.ai.models.spark}) and Muse Wonder (${s.ai.models.wonder}) connected` : "Offline mode: Bulbu understands text locally. Add a Meta Model API key on the server for screenshots, voice and coaching."}</Text></Row>
        </Card>
      )}

      <Card style={{ paddingVertical: 4 }}>
        {[
          { to: "/inventory", icon: "trophy", color: "#F5A524", title: "Inventory", sub: `${s.inventory.items.filter(i => i.owned).length} things collected · wear and level up` },
          { to: "/journal", icon: "chart", color: "#3D5BFF", title: "Journal", sub: "Your week, patterns and what Bulbu noticed" },
          { to: "/screen-time", icon: "phone", color: "#141B4D", title: "Screen time", sub: Platform.OS === "android" ? "Let Bulbu read app usage" : "Log it from a Screen Time screenshot" },
          { to: "/memory", icon: "brain", color: "#7B5CFF", title: "What Bulbu remembers", sub: "See, edit or delete everything" },
          { to: "tour", icon: "sparkles", color: "#F5A524", title: "Replay Bulbu's tour", sub: "Bulbu explains Bulbu World again" },
          { to: "/achievements", icon: "trophy", color: "#F5A524", title: "Achievements", sub: `${earned} earned` },
          { to: "/chat", icon: "sparkles", color: "#3D5BFF", title: "Chat with Bulbu" },
          { to: "/focus", icon: "clock", color: "#18B37A", title: "Focus Mode" },
        ].map((l, i, a) => (
          <Pressable key={l.to} accessibilityRole="link" onPress={async () => { tap(); if (l.to === "tour") { await api.tutorial(0); await refresh(); router.navigate("/home"); } else router.push(l.to as never); }}
                     style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: i < a.length - 1 ? 1 : 0, borderColor: C.line }}>
            <Tile icon={l.icon} color={l.color} size={36} />
            <View style={{ flex: 1 }}><Text style={T.b}>{l.title}</Text>{l.sub && <Text style={T.small}>{l.sub}</Text>}</View>
            <Icon name="right" color={C.muted} />
          </Pressable>
        ))}
      </Card>

      <Row>
        <View style={{ flex: 1 }}><Btn kind="ghost" title="Switch user" onPress={leave} /></View>
        <View style={{ flex: 1 }}>{u.demo
          ? <Btn kind="ghost" title="Reset demo" onPress={async () => { await api.resetDemo(); await refresh(); toast("Demo data reset"); }} />
          : <Btn kind="danger" title="Delete my data" onPress={confirmWipe} />}</View>
      </Row>

    </Screen>
  );
}
