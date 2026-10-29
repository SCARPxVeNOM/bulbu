// A building in Bulbu's Kingdom. Its level is how far the goal has come; it's under construction until the goal is
// reached, and the forecast says when construction finishes. Today's moves shift that date, and every number opens
// its maths (the forecasting engine's, never a model's guess).
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { fmtDays, type WhatIf } from "@bulbu/engine";
import type { BuildingId, BuildingMove, BuildingReport, GoalTemplate, Step } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { GlossyIcon } from "@/components/GlossyIcon";
import { Icon } from "@/components/Icon";
import { Breakdown, Btn, Card, CardHead, Chip, Chips, Header, Progress, Row, Screen, Sheet, tap } from "@/components/ui";
import { C, F, T } from "@/theme";
import { BUILDING_ART } from "@/components/world/buildings";
import { GymProof } from "@/components/world/GymProof";

// what-if ideas follow the goal, not the building (the Castle holds whichever goal is the main one)
const IDEAS: Partial<Record<GoalTemplate, string[]>> = {
  dsa: ["1 hour less Instagram a day", "Solve 2 problems a day"], productivity: ["1 hour less Instagram a day"],
  savings: ["Cook 3 nights a week", "Save ₹100 a day"], iphone: ["Cook 3 nights a week", "Save ₹100 a day"],
  fitness: ["Work out 5 times a week"], reading: ["Read 20 pages a day"], learning: ["Study 30 minutes a day"],
};
const longDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const shortDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function BuildingPanel() {
  const { id } = useLocalSearchParams<{ id: BuildingId }>();
  const { state, toast, hand, playCard, refresh } = useStore();
  const [manage, setManage] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [r, setR] = useState<BuildingReport | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [why, setWhy] = useState<{ title: string; steps: Step[]; note?: string } | null>(null);
  const [sim, setSim] = useState<WhatIf | null>(null);
  const [simBusy, setSimBusy] = useState(false);

  const load = useCallback(async () => {
    try { setR(await api.building(id)); setMissing(null); }
    catch (e) { setMissing((e as Error).message); }
  }, [id]);
  useEffect(() => { void load(); }, [load, state?.now]);

  if (missing) return <Screen><Header title="Building" /><Text style={[T.muted, { textAlign: "center" }]}>{missing}</Text>
    <Btn title="Add a goal to build it" onPress={() => router.replace("/goals" as never)} /></Screen>;
  if (!r) return <Screen><Header title="Building" /><ActivityIndicator color={C.primary} /></Screen>;

  const art = BUILDING_ART[r.id];
  const card = hand?.cards.find(c => c.building === r.id);
  const shift = r.todayShift, moved = Math.abs(shift) >= 0.05;
  const later = shift > 0;
  const tryIdea = async (text: string) => {
    setSimBusy(true);
    try { const w = await api.whatIf(text); if ("error" in w) { toast(w.error); setSim(null); } else setSim(w); }
    catch (e) { toast((e as Error).message); }
    finally { setSimBusy(false); }
  };

  return (
    <Screen>
      <Header title={r.name} subtitle={r.goalTitle} />

      {/* the building: its art, level and floors */}
      <View style={{ borderRadius: 26, overflow: "hidden" }}>
        <LinearGradient colors={art.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View style={{ width: 84, height: 84, borderRadius: 26, backgroundColor: "rgba(255,255,255,.35)", alignItems: "center", justifyContent: "center" }}>
            <GlossyIcon name={art.icon} size={62} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontFamily: F.heavy, fontSize: 13, color: "rgba(255,255,255,.9)", letterSpacing: 0.8 }}>LEVEL {r.level} OF 5</Text>
            <Row gap={5}>
              {Array.from({ length: 5 }, (_, i) => (
                <View key={i} style={{ flex: 1, height: 12, borderRadius: 4, backgroundColor: i < r.level ? "#fff" : "rgba(255,255,255,.3)",
                  borderWidth: i === r.level && r.building ? 1.5 : 0, borderColor: "#fff", borderStyle: "dashed" }} />
              ))}
            </Row>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: "#fff" }}>
              {r.building ? (r.nextFloorAt != null ? `Next floor at ${Math.round(r.nextFloorAt)}% · you're at ${Math.floor(r.percent)}%` : "Top floor: the finishing touches") : "Fully built"}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* construction: when it finishes, and how today moved it */}
      <Card style={{ gap: 10 }} onPress={() => setWhy({ title: "Construction maths", steps: r.steps })} label="Construction finishes. See the maths">
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={T.cardTitle}>{r.building ? "Construction finishes" : "Built"}</Text>
          <Row gap={4}><Text style={{ fontFamily: F.bold, fontSize: 13, color: C.primary }}>See why</Text><Icon name="right" size={14} color={C.primary} /></Row>
        </Row>
        <Text style={{ fontFamily: F.heavy, fontSize: 28, color: C.ink, letterSpacing: -0.4 }}>{r.eta ? longDate(r.eta) : "Waiting for a first move"}</Text>
        {r.building && r.eta && <Text style={T.muted}>In {Math.ceil(r.daysLeft)} days, at your pace of {fmtPace(r)}.</Text>}
        {r.building && (
          <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999,
                         backgroundColor: !moved ? "#EEF1FB" : later ? "#EFEAFF" : "#E3F8EE" }}>
            <Text style={{ fontFamily: F.heavy, fontSize: 13, color: !moved ? C.ink2 : later ? "#5B4AA8" : "#138A5A" }}>
              {!moved ? "No change today" : later ? `${fmtDays(shift).slice(1)} later today` : `${fmtDays(-shift).slice(1)} sooner today`}
            </Text>
            {moved && r.etaBefore && r.eta !== r.etaBefore && <Text style={{ fontFamily: F.semibold, fontSize: 12, color: C.ink2 }}>was {shortDate(r.etaBefore)}</Text>}
          </View>
        )}
        {r.fog > 0.2 && <Row gap={8}><Text style={{ fontSize: 16 }}>🌫️</Text><Text style={[T.small, { flex: 1 }]}>The Dim is hanging over the {r.name}: time that would have built it went elsewhere.</Text></Row>}
      </Card>

      {/* today's moves, each with its own maths */}
      {r.moves.length > 0 && <View>
        <CardHead title="Today's moves" />
        <Card style={{ paddingVertical: 4 }}>
          {r.moves.map((m, i) => <MoveRow key={m.activityId} m={m} last={i === r.moves.length - 1} onPress={() => setWhy({ title: m.label, steps: m.breakdown, note: m.equivalent })} />)}
        </Card>
      </View>}

      {/* today's card for this building (play it when you've done it), or the engine's swap */}
      {r.building && <View>
        <CardHead title={card ? "Your card for it today" : "A move that helps"} />
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#FFF4D6", alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 22 }}>{card?.icon ?? "🃏"}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={T.b}>{card ? card.title : r.swap.title}</Text>
            <Text style={T.small}>{card ? `${fmtDays(-card.daysCloser).slice(1)} sooner${card.clears ? " · clears the Dim" : ""}` : r.swap.detail}</Text>
          </View>
          {card && <Btn small title="I did it" busy={playing} onPress={async () => {
            setPlaying(true);
            const done = await playCard(card.id);
            setPlaying(false);
            if (done) router.navigate("/home" as never);       // watch it land on the kingdom
          }} />}
        </Card>
      </View>}

      {/* workouts can be proven: your gym (check in, check out) or a live photo */}
      {r.template === "fitness" && r.building && <GymProof />}

      {/* what if: try a change and see the new finish date */}
      {r.building && <View style={{ gap: 8 }}>
        <CardHead title="What if…" />
        <Chips>{(IDEAS[r.template] ?? ["30 min less Instagram a day"]).map(t => <Chip key={t} title={t} onPress={() => tryIdea(t)} />)}</Chips>
        {simBusy && <ActivityIndicator color={C.primary} />}
        {sim && !simBusy && (
          <Card style={{ gap: 6 }} onPress={() => setWhy({ title: sim.change.label, steps: sim.steps })} label="What-if result. See the maths">
            <Text style={T.b}>{sim.change.label}</Text>
            <Text style={T.muted}>Finishes {sim.after.eta ? longDate(sim.after.eta) : "—"}{sim.daysSooner > 0 ? `, ${sim.daysSooner} days sooner` : ""}.</Text>
            <Text style={[T.small, { color: C.primary }]}>See why</Text>
          </Card>
        )}
      </View>}

      <Row gap={10}>
        <View style={{ flex: 1 }}><Btn kind="ghost" icon="sparkles" title="Ask Bulbu" onPress={() => router.push("/chat")} /></View>
        <View style={{ flex: 1 }}><Btn kind="ghost" title="Goal settings" onPress={() => setManage(true)} /></View>
      </Row>

      {/* the goal behind the building: make it the Castle (the main goal), or take the building down */}
      <Sheet open={manage} onClose={() => setManage(false)} title={`${r.name} · ${r.goalTitle}`}>
        <View style={{ gap: 12 }}>
          {r.id !== "Castle" && <Btn kind="ghost" icon="trophy" title="Make this my main goal (the Castle)" onPress={async () => {
            try { await api.updateGoal(r.goalId, { primary: true }); setManage(false); await refresh(); toast(`${r.goalTitle} is your Castle now`); router.navigate("/home" as never); }
            catch (e) { toast((e as Error).message); }
          }} />}
          <Text style={T.small}>{r.id === "Castle" ? "This is your main goal: the Castle, with its treasure on top. Time lost to the Dim counts against it." : "Your main goal is the Castle in the middle of the kingdom. Time lost to the Dim counts against it."}</Text>
          <Btn kind="danger" icon="trash" title="Take this building down" onPress={() => {
            const del = async () => { await api.deleteGoal(r.goalId); setManage(false); await refresh(); router.navigate("/home" as never); };
            if (Platform.OS === "web") void del();
            else Alert.alert(`Take down the ${r.name}?`, `This deletes the goal “${r.goalTitle}”. Everything you did stays in your history.`, [{ text: "Cancel", style: "cancel" }, { text: "Take it down", style: "destructive", onPress: () => void del() }]);
          }} />
        </View>
      </Sheet>
      <Sheet open={!!why} onClose={() => setWhy(null)} title={why?.title ?? ""}>
        {why && <Breakdown steps={why.steps} note={why.note} />}
      </Sheet>
    </Screen>
  );
}

function fmtPace(r: BuildingReport) {
  const n = r.pace.perDay;
  return r.money ? `₹${Math.round(n).toLocaleString("en-IN")} a day` : `${n >= 10 ? Math.round(n) : n.toFixed(1)} ${r.unit} a day`;
}

function MoveRow({ m, last, onPress }: { m: BuildingMove; last: boolean; onPress: () => void }) {
  const later = m.days > 0;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${m.label}, ${fmtDays(m.days)}. See the maths`} onPress={() => { tap(); onPress(); }}
               style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderColor: C.line }}>
      <Text style={{ fontSize: 18 }}>{later ? "🌫️" : "✨"}</Text>
      <View style={{ flex: 1 }}>
        <Text style={T.b}>{m.label}</Text>
        <Text style={T.small}>{m.proof ? `✓ verified ${m.proof === "location" ? "at the gym" : "by photo"} · ` : ""}{m.equivalent}</Text>
      </View>
      <Text style={{ fontFamily: F.heavy, fontSize: 13.5, color: later ? "#5B4AA8" : "#138A5A" }}>{later ? `${fmtDays(m.days).slice(1)} later` : `${fmtDays(-m.days).slice(1)} sooner`}</Text>
    </Pressable>
  );
}
