import { useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { fmtDays, fmtMoney, type WhatIf } from "@bulbu/engine";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { dayLabel, fmtDate } from "@/lib/format";
import { EXTRAS, TASK_LOG, fmtUnits, isMoney, paceSteps, schemeFor } from "@/components/goals";
import { GlossyIcon } from "@/components/GlossyIcon";
import { Icon } from "@/components/Icon";
import { LiquidLine } from "@/components/charts";
import { Breakdown, Btn, Card, CardHead, Check, Chip, Chips, Header, IconBtn, Input, Progress, Round, Row, Screen, Seg, Sheet, Stat, tap } from "@/components/ui";
import { C, F, T } from "@/theme";

export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, refresh, toast } = useStore();
  const [tab, setTab] = useState<"overview" | "tasks" | "insights">("overview");
  const [why, setWhy] = useState(false);
  const [manage, setManage] = useState(false);
  const [q, setQ] = useState("");
  const [sim, setSim] = useState<WhatIf | null>(null);
  const [simWhy, setSimWhy] = useState(false);
  const g = state?.goals.find(g => g.id === id);
  if (!state || !g) return <Screen><Header title="Goal" /><Text style={[T.muted, { textAlign: "center" }]}>This goal doesn't exist anymore.</Text></Screen>;
  const f = g.forecast, money = isMoney(g);
  const lines = [...state.week.good, ...state.week.distracting].filter(l => l.goalTitle === g.title).sort((a, b) => b.at.localeCompare(a.at));
  const runSim = async (text: string) => {
    try { const r = await api.whatIf(text); if ("error" in r) { toast(r.error); setSim(null); } else setSim(r); }
    catch (e) { toast((e as Error).message); }
  };
  const ideas = money ? ["What if I cook 3 nights a week?", "Save ₹100 a day"] : g.template === "dsa" ? ["1 hour less Instagram a day", "Solve 2 problems a day"] : g.template === "fitness" ? ["Work out 5 times a week"] : g.template === "reading" ? ["Read 20 pages a day"] : ["30 min less Instagram a day"];
  const start = () => money ? router.push({ pathname: "/log", params: { cat: "save", goal: g.id } }) : g.template === "fitness" ? router.push({ pathname: "/log", params: { cat: "workout", goal: g.id } }) : router.push({ pathname: "/focus", params: { goal: g.id } });
  const doTask = () => { if (!g.task.done) router.push({ pathname: "/log", params: { cat: TASK_LOG[g.template], goal: g.id } }); };
  const del = async () => { await api.deleteGoal(g.id); setManage(false); await refresh(); router.replace("/goals"); };
  const confirmDelete = () => Platform.OS === "web" ? del() : Alert.alert(`Delete “${g.title}”?`, "Your activity history stays.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: del }]);

  const pts = g.series.map(p => (p.percent / 100) * g.target);
  const lo0 = Math.min(...pts), hi0 = Math.max(...pts), span = Math.max(hi0 - lo0, g.target * 0.02, 1);
  const step = niceStep(span * 1.6 / 3);
  const lo = Math.max(0, Math.floor((lo0 - span * 0.5) / step) * step), hi = Math.ceil((hi0 + span * 0.25) / step) * step;
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);

  const Task = ({ label, done, onPress, icon }: { label: string; done: boolean; onPress?: () => void; icon?: string }) => (
    <Pressable disabled={!onPress} onPress={() => { tap(); onPress?.(); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: C.line }}>
      {icon ? <GlossyIcon name={icon} size={28} /> : <Check on={done} />}
      <Text style={[T.body, { flex: 1, color: icon || done || onPress ? C.ink : C.ink2 }]}>{label}</Text>
      {icon && <Check on={done} />}
    </Pressable>
  );

  return (
    <Screen footer={tab !== "overview" ? <Btn icon="play" title={money ? "Put money aside" : "Start Now"} onPress={start} /> : undefined}>
      <Header right={<IconBtn name="settings" label="Manage goal" onPress={() => setManage(true)} />} />
      <Row gap={12}>
        <GlossyIcon name="target" size={50} />
        <View style={{ flex: 1 }}><Text style={T.titleL}>{g.title}</Text><Text style={T.muted}>{g.subtitle}</Text></View>
      </Row>
      <Row gap={14}><View style={{ flex: 1 }}><Progress value={f.percent} scheme={schemeFor(g)} height={18} label={`${g.title} progress`} /></View><Text style={{ fontFamily: F.heavy, fontSize: 17, color: C.ink }}>{Math.round(f.percent)}%</Text></Row>
      <Seg soft value={tab} onChange={setTab} options={[["overview", "Overview"], ["tasks", "Tasks"], ["insights", "Insights"]]} />

      {tab === "overview" && <>
        <Row gap={10}>
          <Stat icon={<GlossyIcon name="target" size={22} />} value={money ? fmtMoney(f.progress) : String(Math.round(f.progress))} label={money ? "Saved" : g.template === "dsa" ? "Solved" : "Done"} />
          <Stat icon={<GlossyIcon name={money ? "wallet" : g.template} size={22} />} value={money ? fmtMoney(f.remaining) : String(Math.round(f.remaining))} label="Remaining" />
          <Stat icon={<GlossyIcon name="flame" size={22} />} value={String(state.streak)} label="Day streak" />
        </Row>
        <Card>
          <CardHead title="Progress" right={<Text style={T.small}>This week</Text>} />
          <LiquidLine points={pts} labels={g.series.map(p => dayLabel(p.day))} min={lo} max={hi} ticks={ticks} highlight={`${Math.round(f.percent)}%`} height={170} />
          <Pressable onPress={() => setWhy(true)} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8 }}>
            <Icon name="clock" size={15} color={C.ink2} />
            <Text style={[T.small, { flex: 1 }]}>{f.done ? "Goal complete 🎉" : <>On pace for <Text style={{ fontFamily: F.bold, color: C.ink }}>{fmtDate(f.eta, { day: "numeric", month: "long", year: "numeric" })}</Text> · {fmtUnits(g, f.pace.perDay)} a day</>}</Text>
            <Icon name="info" size={15} color={C.ink2} />
          </Pressable>
        </Card>
        <Card>
          <Text style={[T.cardTitle, { marginBottom: 4 }]}>Today's Tasks</Text>
          <Task icon={TASK_LOG[g.template]} label={g.task.label} done={g.task.done} onPress={doTask} />
          {EXTRAS[g.template].map(x => <Task key={x} icon="focus" label={x} done={false} />)}
        </Card>
        <Btn icon="play" title={money ? "Put money aside" : "Start Now"} onPress={start} />
        <Card style={{ gap: 12 }}>
          <Text style={T.cardTitle}>What if…?</Text>
          <Row>
            <View style={{ flex: 1 }}><Input value={q} onChangeText={setQ} placeholder={ideas[0]} returnKeyType="send" onSubmitEditing={() => q.trim() && runSim(q)} /></View>
            <Round primary name="send" label="Simulate" onPress={() => q.trim() && runSim(q)} />
          </Row>
          <Chips>{ideas.map(i => <Chip key={i} title={i} onPress={() => { setQ(i); runSim(i); }} />)}</Chips>
          {sim && (
            <Card tight onPress={() => setSimWhy(true)} style={{ backgroundColor: sim.daysSooner > 0 ? C.greenSoft : "#fff", gap: 4 }}>
              <Text style={T.b}>{sim.change.label}</Text>
              <Text style={T.body}>{sim.goalTitle}: <Text style={T.b}>{fmtDate(sim.before.eta)}</Text> → <Text style={[T.b, { color: C.green }]}>{fmtDate(sim.after.eta)}</Text></Text>
              <Text style={{ fontFamily: F.heavy, fontSize: 20, color: C.green }}>{sim.daysSooner} days sooner</Text>
              <Text style={T.tiny}>Tap to see the math</Text>
            </Card>
          )}
        </Card>
      </>}

      {tab === "tasks" && (
        <Card>
          <Text style={[T.cardTitle, { marginBottom: 6 }]}>Today's Tasks</Text>
          <Task label={g.task.label} done={g.task.done} onPress={doTask} />
          {EXTRAS[g.template].map(x => <Task key={x} label={x} done={false} />)}
          <Card tight style={{ backgroundColor: C.primarySoft, marginTop: 14, shadowOpacity: 0 }}>
            <Text style={T.b}>Swap idea: {g.swap.title}</Text><Text style={T.small}>{g.swap.detail}</Text>
          </Card>
        </Card>
      )}

      {tab === "insights" && (
        <Card>
          <Text style={[T.cardTitle, { marginBottom: 6 }]}>This week on {g.title}</Text>
          {lines.length ? lines.map(l => (
            <Row key={l.activityId + l.goalTitle} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: C.line }}>
              <View style={{ flex: 1 }}><Text style={T.body}>{l.label}</Text><Text style={T.tiny}>{fmtDate(l.at, { weekday: "short", hour: "numeric", minute: "2-digit" })}</Text></View>
              <Text style={[T.b, { color: l.days < 0 ? C.green : C.red }]}>{l.days < 0 ? fmtDays(l.days).replace("-", "") + " closer" : fmtDays(l.days)}</Text>
            </Row>
          )) : <Text style={T.small}>Nothing logged for this goal this week yet.</Text>}
        </Card>
      )}

      <Sheet open={why} onClose={() => setWhy(false)} title="How Bulbu got this date"><Breakdown steps={paceSteps(g)} /></Sheet>
      <Sheet open={simWhy && !!sim} onClose={() => setSimWhy(false)} title={sim?.change.label ?? ""}>{sim && <Breakdown steps={sim.steps} />}</Sheet>
      <Sheet open={manage} onClose={() => setManage(false)} title="Manage goal">
        {!g.primary && <Btn kind="ghost" title="Make this my main focus" onPress={async () => { await api.updateGoal(g.id, { primary: true }); setManage(false); refresh(); toast("Main focus updated"); }} />}
        <Text style={T.small}>{g.primary ? "This is your main focus: distractions count against it." : "Distractions count against your main focus goal."}</Text>
        <Btn kind="danger" icon="trash" title="Delete goal" onPress={confirmDelete} />
      </Sheet>
    </Screen>
  );
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6)))), n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
