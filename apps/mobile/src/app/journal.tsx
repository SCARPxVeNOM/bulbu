import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { fmtDays, fmtMinutes, fmtMoney } from "@bulbu/engine";
import type { Insights } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { dayLabel, fmtDate } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { Bars, GlowDonut } from "@/components/charts";
import { Card, CardHead, Header, IconBtn, LinkBtn, Row, Screen, Seg } from "@/components/ui";
import { C, F, T } from "@/theme";

const COLORS: Record<string, string> = { study: "#3D5BFF", social: "#EC4F8A", workout: "#F5B324", read: "#2FC7E0", other: "#9B7BFF" };
const GRAD: Record<string, [string, string]> = { study: ["#6C8BFF", "#3D5BFF"], social: ["#FF9AC6", "#EC4F8A"], workout: ["#FFD66B", "#F5A524"], read: ["#7EE6F5", "#2FC7E0"], other: ["#C6B2FF", "#8B63FF"] };
const hrs = (m: number) => `${(m / 60).toFixed(1)}h`;
const chunk = <X,>(xs: X[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);

export default function InsightsScreen() {
  const { state } = useStore();
  const [range, setRange] = useState<"7" | "30" | "90">("7");
  const [data, setData] = useState<Insights | null>(state?.week ?? null);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { api.insights(Number(range)).then(setData).catch(() => {}); }, [range, state?.now]);
  if (!state || !data) return null;
  const w = data;
  const total = w.breakdown.reduce((s, b) => s + b.minutes, 0);
  const pct = (v: number | null) => v == null ? "—" : `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`;
  const bars = range === "7" ? w.daily.map(d => ({ label: dayLabel(d.day), a: d.productive, b: d.social }))
    : chunk(w.daily, range === "30" ? 5 : 15).map(c => ({ label: fmtDate(c[0].day), a: avg(c.map(d => d.productive)), b: avg(c.map(d => d.social)) }));
  const lines = showAll ? [w.good, w.distracting] : [w.good.slice(0, 3), w.distracting.slice(0, 3)];

  const Change = ({ v, good, label }: { v: number | null; good: boolean; label: string }) => (
    <Card tight style={{ flex: 1 }}>
      <Row>
        <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: good ? C.greenSoft : C.redSoft }}>
          <Icon name={(v ?? 0) >= 0 ? "up" : "down"} size={19} stroke={2.6} color={good ? C.green : C.red} />
        </View>
        <View style={{ flex: 1 }}><Text style={{ fontFamily: F.heavy, fontSize: 18, color: good ? C.green : C.red }}>{pct(v)}</Text><Text style={T.tiny}>{label}</Text></View>
      </Row>
    </Card>
  );
  const Line = ({ l }: { l: Insights["good"][number] }) => (
    <Row style={{ justifyContent: "space-between", paddingVertical: 5 }}>
      <Text style={[T.small, { flex: 1, color: C.ink }]} numberOfLines={1}>{l.label} <Text style={{ color: C.ink2 }}>· {l.goalTitle}</Text></Text>
      <Text style={[T.b, { fontSize: 13, color: l.days < 0 ? C.green : C.red }]}>{l.days < 0 ? fmtDays(l.days).replace("-", "−") : fmtDays(l.days)}</Text>
    </Row>
  );
  const Sum = ({ icon, bg, fg, label, value }: { icon: string; bg: string; fg: string; label: string; value: string }) => (
    <Row style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: C.line }}>
      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={16} stroke={2.6} color={fg} /></View>
      <Text style={[T.body, { flex: 1, fontFamily: F.semibold }]}>{label}</Text><Text style={[T.b, { color: fg }]}>{value}</Text>
    </Row>
  );

  return (
    <Screen>
      <Header title="Journal" subtitle="What Bulbu noticed about your days" right={<IconBtn soft name="brain" label="What Bulbu noticed" onPress={() => router.push("/memory")} />} />
      <Seg soft value={range} onChange={setRange} options={[["7", "This Week"], ["30", "This Month"], ["90", "All Time"]]} />
      <Row gap={12}>
        <Change v={w.productiveChange} good={(w.productiveChange ?? 0) >= 0} label={`Productive time vs last ${range === "7" ? "week" : "period"}`} />
        <Change v={w.socialChange} good={(w.socialChange ?? 0) <= 0} label="Social media time" />
      </Row>
      <Card>
        <Text style={[T.cardTitle, { marginBottom: 10 }]}>Time Breakdown</Text>
        <Row gap={16}>
          <GlowDonut parts={w.breakdown.filter(b => b.minutes > 0).map(b => ({ value: b.minutes, color: GRAD[b.key] ?? GRAD.other }))} center={hrs(total)} sub="Total" />
          <View style={{ flex: 1, gap: 9 }}>
            {w.breakdown.map(b => (
              <Row key={b.key} gap={8}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS[b.key] ?? COLORS.other }} />
                <Text style={[T.small, { color: C.ink, flex: 1 }]}>{b.label}</Text><Text style={[T.b, { fontSize: 13 }]}>{hrs(b.minutes)}</Text></Row>
            ))}
          </View>
        </Row>
      </Card>
      <Card>
        <CardHead title="Activity Impact" right={<LinkBtn title={showAll ? "Less" : "See all"} onPress={() => setShowAll(v => !v)} />} />
        <Sum icon="up" bg={C.greenSoft} fg={C.green} label="Good choices" value={fmtDays(-w.goodDays).replace("-", "+")} />
        <Sum icon="down" bg={C.redSoft} fg={C.red} label="Distracting choices" value={fmtDays(w.distractingDays)} />
        <Sum icon="right" bg={C.primarySoft} fg={C.primary} label="Net impact" value={Math.abs(w.netDays) < 0.05 ? "no change" : fmtDays(w.netDays)} />
        {lines[0].length > 0 && <><Text style={[T.b, { fontSize: 12.5, marginTop: 14 }]}>Good choices</Text>{lines[0].map(l => <Line key={l.activityId + l.goalTitle} l={l} />)}</>}
        {lines[1].length > 0 && <><Text style={[T.b, { fontSize: 12.5, marginTop: 14 }]}>Distracting choices</Text>{lines[1].map(l => <Line key={l.activityId + l.goalTitle} l={l} />)}</>}
        {w.spend > 0 && <Text style={[T.small, { marginTop: 14 }]}>Spent {fmtMoney(w.spend)} on food and shopping in this period.</Text>}
      </Card>
      <Card>
        <CardHead title={range === "7" ? "Daily" : "Average day"} right={
          <Row gap={10}><Row gap={4}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary }} /><Text style={T.tiny}>Productive</Text></Row>
            <Row gap={4}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F2A6BE" }} /><Text style={T.tiny}>Social</Text></Row></Row>} />
        <Bars data={bars} />
      </Card>
      {state.patterns.length > 0 && (
        <Card>
          <CardHead title="Bulbu noticed" right={<LinkBtn title="Memory" onPress={() => router.push("/memory")} />} />
          {state.patterns.map(p => (
            <Row key={p.id} style={{ alignItems: "flex-start", paddingVertical: 10, borderBottomWidth: 1, borderColor: C.line }}>
              <Text style={{ fontSize: 20 }}>🔎</Text>
              <View style={{ flex: 1 }}><Text style={T.b}>{p.text}</Text><Text style={T.small}>{p.detail}</Text></View>
            </Row>
          ))}
          <Text style={[T.tiny, { marginTop: 10 }]}>Patterns are tendencies in your own history, not proven causes.</Text>
        </Card>
      )}
      <Card><Row><Icon name="clock" /><Text style={[T.small, { flex: 1 }]}>Productive {fmtMinutes(w.productiveMinutes)} · Social media {fmtMinutes(w.socialMinutes)}</Text></Row></Card>
    </Screen>
  );
}
