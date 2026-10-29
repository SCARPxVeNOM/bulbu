import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { fmtDays } from "@bulbu/engine";
import type { DefendResult, LogResult } from "@bulbu/api";
import { LightIcon } from "@/components/world/LightIcon";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { Bulbu } from "@/components/bulbu/Bulbu";
import { LiquidRing } from "@/components/charts";
import { Background, Btn, Card, Chip, Chips, Header, IconBtn, Row, tap } from "@/components/ui";
import { C, F, T, shadow } from "@/theme";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Mode = "focus" | "short" | "long";
const LEN: Record<Mode, number> = { focus: 25, short: 5, long: 15 };
const LABEL: Record<Mode, string> = { focus: "Focus Session", short: "Short Break", long: "Long Break" };

// keeps the phone's screen on during a session (browsers may refuse a wake lock, and expo-keep-awake throws then)
function KeepAwake() { useKeepAwake(); return null; }

export default function Focus() {
  const { state, setReaction, refresh, setLastLog } = useStore();
  const p = useLocalSearchParams<{ goal?: string; raid?: string }>();
  // opened for a Dim raid: Focus Mode becomes Defend (one 25-minute session holds the raid off)
  const raid = p.raid && state?.raid?.id === p.raid && state.raid.state !== "passed" ? state.raid : null;
  const [defended, setDefended] = useState<DefendResult["raid"] | null>(null);
  const ins = useSafeAreaInsets();
  const focusable = (state?.goals ?? []).filter(g => g.kind !== "savings");
  const [goalId, setGoalId] = useState(p.goal ?? focusable.find(g => g.primary)?.id ?? focusable[0]?.id);
  const [mode, setMode] = useState<Mode>("focus");
  const [endAt, setEndAt] = useState<number | null>(null);
  const [left, setLeft] = useState(LEN.focus * 60);
  const [result, setResult] = useState<LogResult | null>(null);
  const [cue, setCue] = useState(0);
  const started = useRef(0);

  // the timer runs on a timestamp, so it stays right if the phone sleeps
  useEffect(() => {
    if (!endAt) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((endAt - Date.now()) / 1000)); setLeft(s);
      if (s === 0) { clearInterval(t); void finish(true); }
    }, 250);
    return () => clearInterval(t);
  }, [endAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (m: Mode) => { if (endAt) return; setMode(m); setLeft(LEN[m] * 60); setResult(null); };
  const start = () => { setResult(null); setDefended(null); started.current = Date.now(); setEndAt(Date.now() + left * 1000); };
  async function finish(complete: boolean) {
    const mins = Math.round((Date.now() - started.current) / 60000);
    setEndAt(null);
    if (mode !== "focus") { setLeft(LEN.focus * 60); setMode("focus"); return; }
    setLeft(LEN.focus * 60);
    if (raid) {
      const exact = (Date.now() - started.current) / 60000;
      const r = await api.defendRaid(raid.id, exact).catch(e => ({ raid: { held: false as const, message: (e as Error).message } }) as DefendResult);
      setDefended(r.raid);
      if (r.activities) { setResult(r as LogResult); setReaction(r.bulbu!); setLastLog(r as LogResult); setCue(c => c + 1); }
      refresh();
      return;
    }
    if (mins < 5) return;   // too short to count
    const g = state?.goals.find(g => g.id === goalId);
    const r = await api.log({ quick: { category: "focus", minutes: mins, goalId, label: `${complete ? "Focus session" : "Focus session (ended early)"}${g ? ` · ${g.title}` : ""}` }, source: "focus" });
    setResult(r); setReaction(r.bulbu); setLastLog(r); setCue(c => c + 1); refresh();
  }

  const total = LEN[mode] * 60, frac = 1 - left / total, running = !!endAt;
  const emote = result ? result.bulbu.emote : running ? (mode === "focus" ? "focused" : "happy") : "happy";
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");

  return (
    <Background>
      {running && Platform.OS !== "web" && <KeepAwake />}
      <ScrollView contentContainerStyle={{ paddingTop: Math.max(14, ins.top + 6), paddingHorizontal: 18, paddingBottom: 24 + ins.bottom, gap: 14, flexGrow: 1 }}>
        {raid
          ? <Header title={`Defend the ${raid.buildingName}`} subtitle={`25 minutes of focus holds off the ${raid.label} Dim raid. Bulbu's on the wall with you.`} />
          : <Header title="Focus Mode" subtitle="Stay present. Bulbu is with you." right={<IconBtn soft name="settings" label="Profile" onPress={() => router.navigate("/profile")} />} />}
        {!raid && focusable.length > 1 && !running && <Chips>{focusable.map(g => <Chip key={g.id} title={g.title} on={g.id === goalId} onPress={() => setGoalId(g.id)} />)}</Chips>}
        <LiquidRing value={running ? (1 - frac) * 100 : 100}>
          <Text style={{ fontFamily: F.heavy, fontSize: 50, color: C.ink, fontVariant: ["tabular-nums"] }} accessibilityLabel={`${mm} minutes ${ss} seconds left`}>{mm}:{ss}</Text>
          <Text style={[T.muted, { fontFamily: F.medium }]}>{raid && mode === "focus" ? "Defending" : LABEL[mode]}</Text>
        </LiquidRing>
        <View style={{ height: 200, borderRadius: 24, overflow: "hidden" }}>
          <Bulbu emote={emote} animation={result?.bulbu.animation} cue={cue} glow={result?.bulbu.glow ?? 1} outfit={state?.user.outfit} view="hero" background="#E9E8FF"
                 line={result ? result.bulbu.line : running && mode === "focus" ? (raid ? "Shields up. I'm right here." : "I'm right here with you.") : null} style={{ flex: 1 }} />
        </View>
        {defended && (defended.held ? (
          <Card style={{ gap: 10, alignItems: "center" }}>
            <Text style={{ fontSize: 34 }}>🛡️</Text>
            <Text style={{ fontFamily: F.heavy, fontSize: 19, color: C.ink }}>Raid held off!</Text>
            <Text style={[T.small, { textAlign: "center" }]}>The {raid?.buildingName ?? "kingdom"} is safe tonight. The raid dropped:</Text>
            <Row gap={8} style={{ flexWrap: "wrap", justifyContent: "center" }}>
              <Row gap={6} style={{ backgroundColor: "#FFF4D2", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 }}>
                <LightIcon size={18} /><Text style={{ fontFamily: F.heavy, fontSize: 13, color: "#8A5A00" }}>+{defended.loot.light} Light</Text>
              </Row>
              {defended.loot.piece && (
                <View style={{ backgroundColor: "#ECE8FF", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 }}>
                  <Text style={{ fontFamily: F.heavy, fontSize: 13, color: "#5B4AA8" }}>
                    {defended.loot.piece.complete ? `🧩 ${defended.loot.piece.name} complete! It's in your inventory` : `🧩 ${defended.loot.piece.name} piece ${defended.loot.piece.have} of ${defended.loot.piece.of}`}
                  </Text>
                </View>
              )}
            </Row>
            <View style={{ alignSelf: "stretch" }}><Btn title="Back to the kingdom" icon="arrow" onPress={() => router.navigate("/home" as never)} /></View>
          </Card>
        ) : (
          <Card tight><Text style={T.body}>{defended.message}</Text></Card>
        ))}
        {!defended && result?.impacts[0] && (
          <Card tight onPress={() => router.navigate("/home" as never)}>
            <Row><Text style={{ fontSize: 24 }}>🎉</Text>
              <View style={{ flex: 1 }}><Text style={T.body}><Text style={[T.b, { color: C.green }]}>{fmtDays(result.impacts[0].days).slice(1)} closer</Text> to {result.impacts[0].goalTitle}</Text><Text style={T.tiny}>Back to the kingdom to watch it land</Text></View>
              <Icon name="right" /></Row>
          </Card>
        )}
        {running
          ? <Btn kind="ghost" icon="pause" title={mode === "focus" ? "End session" : "Skip break"} onPress={() => finish(false)} />
          : !defended?.held && <Btn icon="play" title={raid && mode === "focus" ? (defended ? "Defend again" : "Start defending") : `Start ${mode === "focus" ? "Focus" : "Break"}`} onPress={start} />}
        {!raid && <View style={[{ flexDirection: "row", justifyContent: "space-around", backgroundColor: "rgba(255,255,255,.8)", borderRadius: 24, paddingVertical: 10, marginTop: "auto" }, shadow]}>
          {(["focus", "short", "long"] as Mode[]).map(m => (
            <Pressable key={m} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} onPress={() => { tap(); pick(m); }} style={{ alignItems: "center", gap: 4, paddingHorizontal: 10, opacity: running && mode !== m ? 0.4 : 1 }}>
              <Icon name={m === "focus" ? "clock" : m === "short" ? "coffee" : "moon"} size={22} color={mode === m ? C.primary : C.muted} />
              <Text style={{ fontFamily: F.semibold, fontSize: 12, color: mode === m ? C.primary : C.muted }}>{m === "focus" ? "Focus" : m === "short" ? "Short Break" : "Long Break"}</Text>
            </Pressable>
          ))}
        </View>}
      </ScrollView>
    </Background>
  );
}
