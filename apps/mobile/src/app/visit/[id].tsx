// Visiting a clanmate's kingdom: their island in 3D, their buildings' levels and finish dates, and their Bulbu in
// its outfit. Read-only, and nothing about their scrolling. Send them Light from here.
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fmtDays } from "@bulbu/engine";
import type { Visit } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Bulbu } from "@/components/bulbu/Bulbu";
import type { KingdomLabel } from "@/components/bulbu/BulbuDom";
import { Icon } from "@/components/Icon";
import { Btn, Row, Sheet, tap } from "@/components/ui";
import { C, F, T } from "@/theme";

const shortDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function VisitKingdom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, toast, refresh } = useStore();
  const ins = useSafeAreaInsets();
  const [v, setV] = useState<Visit | null>(null);
  const [give, setGive] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.visit(id).then(setV).catch(e => toast((e as Error).message)); }, [id, toast]);

  if (!v) return <View style={{ flex: 1, backgroundColor: "#B9B8FF", alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#fff" /></View>;
  const view = { buildings: v.kingdom.buildings.map(b => ({ id: b.id, level: b.level, building: b.building, glow: b.glow, fog: 0 })), plots: v.kingdom.plots, treasure: null, raid: null };
  const labels: KingdomLabel[] = v.kingdom.buildings.map(b => ({
    id: b.id, title: `${b.name} · Lv ${b.level}`, kind: b.building ? "building" : "built", dim: false,
    sub: !b.building ? "Built!" : b.eta ? `Ready ${shortDate(b.eta)}` : "Getting started",
  }));
  const w = v.week;
  const send = async (n: number) => {
    setBusy(true);
    try { await api.donate(v.id, n); toast(`Sent ${n} Light to ${v.name} ✨`); setGive(false); refresh(); }
    catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#B9B8FF" }}>
      <Bulbu kingdom={view} labels={labels} emote="happy" glow={0.95} outfit={v.outfit} style={{ position: "absolute", inset: 0 }} />
      <View pointerEvents="box-none" style={{ position: "absolute", left: 14, right: 14, top: Math.max(12, ins.top + 4), flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to your clan" onPress={() => { tap(); if (router.canGoBack()) router.back(); else router.replace("/clan" as never); }}
                   style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,.92)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="back" size={20} />
        </Pressable>
        <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,.92)", borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14 }}>
          <Text style={{ fontFamily: F.heavy, fontSize: 15, color: C.ink }}>{v.name}'s kingdom</Text>
          <Text style={{ fontFamily: F.semibold, fontSize: 12, color: C.ink2 }}>Kingdom level {v.level} · visiting</Text>
        </View>
      </View>

      <View style={{ position: "absolute", left: 14, right: 14, bottom: 20 + ins.bottom, backgroundColor: "rgba(255,255,255,.96)", borderRadius: 20, padding: 14, gap: 10 }}>
        <Text style={T.b}>{v.name} this week</Text>
        <Row gap={6} style={{ flexWrap: "wrap" }}>
          <Tag text={`${w.points} war points`} strong />
          {w.daysSooner > 0 && <Tag text={`✨ ${fmtDays(-w.daysSooner).slice(1)} sooner`} />}
          {w.cardsPlayed > 0 && <Tag text={`🃏 ${w.cardsPlayed} ${w.cardsPlayed === 1 ? "card" : "cards"}`} />}
          {w.raidsHeld > 0 && <Tag text={`🛡️ ${w.raidsHeld} ${w.raidsHeld === 1 ? "raid" : "raids"} held`} />}
        </Row>
        <Btn icon="sparkles" title={`Send ${v.name} Light`} onPress={() => setGive(true)} />
      </View>

      <Sheet open={give} onClose={() => setGive(false)} title={`Send Light to ${v.name}`}>
        <View style={{ gap: 12 }}>
          <Text style={T.small}>It comes out of your Light and lands on their kingdom. Up to 100 at a time, 300 a day. You have {state?.world.light ?? 0} Light.</Text>
          <Row gap={8}>
            {[25, 50, 100].map(n => <View key={n} style={{ flex: 1 }}><Btn kind={n === 50 ? "primary" : "ghost"} title={`${n}`} busy={busy} disabled={n > (state?.world.light ?? 0)} onPress={() => send(n)} /></View>)}
          </Row>
        </View>
      </Sheet>
    </View>
  );
}

const Tag = ({ text, strong }: { text: string; strong?: boolean }) => (
  <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: strong ? "#ECE8FF" : "#F1F3FB" }}>
    <Text style={{ fontFamily: F.bold, fontSize: 12, color: strong ? "#5B4AA8" : C.ink2 }}>{text}</Text>
  </View>
);
