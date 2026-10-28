import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { fmtDays, fmtMinutes, fmtMoney, type Impact } from "@bulbu/engine";
import type { Activity } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { fmtDate, whenLabel } from "@/lib/format";
import { CAT, Icon } from "@/components/Icon";
import { Bulbu } from "@/components/bulbu/Bulbu";
import { Breakdown, Btn, Card, Header, LinkBtn, Row, Screen, Sheet, Tile, daysText } from "@/components/ui";
import { C, F, T, THEMES } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { LightIcon } from "@/components/world/LightIcon";

/** "2h on Instagram", never "2h Reels" unless the user said Reels: usage data is per app. */
export function activityTitle(a: Activity) {
  if (a.category === "social_media") return a.label === "Reels" ? `${fmtMinutes(a.minutes ?? 0)} of Reels` : `${fmtMinutes(a.minutes ?? 0)} on ${a.app ?? a.label}`;
  if ((a.category === "eat" || a.category === "spend") && a.amount && !a.label.includes("₹")) return `${a.label} · ${fmtMoney(a.amount)}`;
  return a.label;
}
const sourceLabel: Record<string, string> = { quick: "Quick log", text: "Typed", voice: "Voice", screenshot: "Screenshot", photo: "Photo", device: "Usage access", focus: "Focus Mode", seed: "History" };

export default function ImpactScreen() {
  const { lastLog: r, state, setLastLog, refresh, toast, setReaction } = useStore();
  const [why, setWhy] = useState<Impact | null>(null);
  if (!r || !state) return <Redirect href="/home" />;
  const stage = THEMES[state.user.theme]?.stage ?? C.stage;
  const main = [...r.impacts].sort((a, b) => Math.abs(b.days) - Math.abs(a.days))[0];
  const rest = r.impacts.filter(i => i !== main);
  const moved = main && r.forecasts.find(f => f.goalId === main.goalId);
  const late = !!main && main.days > 0.04;
  const a0 = r.activities[0];

  const doSwap = async () => {
    const s = r.swap!; const c = s.activity.category;
    if (["code", "study", "focus", "read"].includes(c)) { router.push({ pathname: "/focus", params: { goal: s.goalId } }); return; }
    const res = await api.log({ quick: { category: c, minutes: s.activity.minutes, units: s.activity.units, amount: s.activity.amount, label: s.title, goalId: s.goalId } });
    setLastLog(res); setReaction(res.bulbu); refresh();
  };
  const undo = async () => {
    await Promise.all(r.activities.map(a => api.undo(a.id)));
    setLastLog(null); setReaction(null); await refresh(); toast("Removed"); router.replace("/home");
  };

  return (
    <Screen footer={<Row><View style={{ flex: 1 }}><Btn kind="ghost" title="Undo" onPress={undo} /></View><View style={{ flex: 1 }}><Btn title="To my world" onPress={() => router.replace("/home")} /></View></Row>}>
      <Header back="/home" title="Activity Impact" subtitle="See how your choices move you towards or away from your goals." />

      {r.activities.map(a => (
        <Card key={a.id} tight style={late && a === a0 ? { backgroundColor: "#FFF5F7" } : undefined}>
          <Row gap={12}>
            <Tile icon={CAT[a.category]?.icon ?? "dots"} color={CAT[a.category]?.color ?? "#7C8CFF"} size={46} />
            <View style={{ flex: 1 }}><Text style={[T.b, { fontSize: 17 }]}>{activityTitle(a)}</Text><Text style={T.small}>{a.app ?? CAT[a.category]?.label} · {whenLabel(a.at)}</Text></View>
          </Row>
        </Card>
      ))}

      {main ? (
        <Pressable accessibilityRole="button" onPress={() => setWhy(main)} style={{ borderRadius: 20, overflow: "hidden" }}>
          <LinearGradient colors={late ? ["#FFEDF1", "#FFE1E8"] : ["#E8FAF2", "#DAF4E8"]} style={{ padding: 16, gap: 4 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Row gap={6}><Icon name="clock" color={late ? C.red : C.green} /><Text style={{ fontFamily: F.bold, color: late ? C.red : C.green }}>{late ? "Estimated goal delay" : "Goal moved closer"}</Text></Row>
              <Icon name="info" color={C.ink2} />
            </Row>
            <Text style={{ fontFamily: F.heavy, fontSize: 36, letterSpacing: -0.5, color: late ? C.red : C.green }}>{daysText(main.days, !late)}</Text>
            <Text style={T.muted}>{`${main.equivalent}${late ? "." : ` for ${main.goalTitle}.`}`}</Text>
            {moved && moved.before.eta !== moved.after.eta && <Text style={[T.small, { fontFamily: F.semibold, color: C.ink }]}>{main.goalTitle}: {fmtDate(moved.before.eta)} → {fmtDate(moved.after.eta)}</Text>}
            <Text style={T.tiny}>Tap to see the math</Text>
          </LinearGradient>
        </Pressable>
      ) : (
        <Card><Text style={T.b}>Logged!</Text><Text style={T.small}>This doesn't move any of your goals directly{r.activities.some(a => a.category === "eat" && !a.amount) ? ". Add how much it cost and Bulbu can tell you what it means for your savings." : ", but Bulbu will use it to spot patterns (like sleep and focus)."}</Text></Card>
      )}

      {!!r.light && (
        <Card tight onPress={() => router.replace("/home")} label="See your world" style={{ backgroundColor: "#FFFAEB" }}>
          <Row gap={12}>
            <LightIcon size={34} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.heavy, fontSize: 17, color: "#8A5A00" }}>+{r.light} Light for Bulbu</Text>
              <Text style={T.small}>{r.worldLevel && r.worldLevel.after > r.worldLevel.before ? `Level up! Bulbu World is now level ${r.worldLevel.after} 🎉` : "Spend it on your buildings in Bulbu World."}</Text>
            </View>
            <Icon name="right" />
          </Row>
        </Card>
      )}

      {rest.map(i => (
        <Card key={i.goalId + i.activityId} tight onPress={() => setWhy(i)}>
          <Row><View style={{ flex: 1 }}><Text style={T.b}>{i.goalTitle}</Text><Text style={T.small}>{i.equivalent}</Text></View>
            <Text style={[T.b, { color: i.days > 0 ? C.red : C.green }]}>{daysText(i.days, i.days < 0)}</Text></Row>
        </Card>
      ))}

      {r.swap && late && (
        <Card onPress={doSwap} label="Try the swap">
          <Row gap={12}><Text style={{ fontSize: 30 }}>💡</Text>
            <View style={{ flex: 1 }}><Text style={T.b}>Try this instead?</Text><Text style={[T.b, { color: C.primary }]}>{r.swap.title}</Text><Text style={T.small}>{r.swap.detail}</Text></View>
            <Icon name="right" /></Row>
        </Card>
      )}

      {r.questions.length > 0 && (
        <Card tight style={{ backgroundColor: C.primarySoft, gap: 4 }}>
          <Text style={[T.b, { fontSize: 13 }]}>Bulbu wants to know</Text>
          {r.questions.map(q => <Text key={q} style={T.small}>• {q}</Text>)}
          <View style={{ marginTop: 8 }}><LinkBtn title="Answer in the log" onPress={() => router.replace("/log")} /></View>
        </Card>
      )}

      <View style={{ height: 250, borderRadius: 24, overflow: "hidden", backgroundColor: stage }}>
        <Bulbu emote={r.bulbu.emote} animation={r.bulbu.animation} cue={r.activities.length} glow={r.bulbu.glow} outfit={state.user.outfit} view="hero" background={stage} line={r.bulbu.line} style={{ flex: 1 }} />
      </View>
      <Text style={[T.tiny, { textAlign: "center" }]}>{r.via === "spark" ? "Read by Muse Spark" : r.via === "offline" ? "Understood offline" : sourceLabel[a0?.source ?? ""] ?? ""}{r.bulbu.via === "spark" ? " · Bulbu's reaction by Muse Spark" : ""} · numbers by Bulbu's forecasting engine</Text>

      <Sheet open={!!why} onClose={() => setWhy(null)} title={why ? `${why.goalTitle}: ${why.days > 0 ? fmtDays(why.days) : fmtDays(why.days).slice(1) + " closer"}` : ""}>
        {why && <Breakdown steps={why.breakdown} />}
      </Sheet>
    </Screen>
  );
}
