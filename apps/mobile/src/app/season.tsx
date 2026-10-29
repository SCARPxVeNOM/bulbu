// This month's season: a theme (one of the eight Bulbus), ten tiers climbed with season XP (every Light you collect,
// plus extra for cards played and Dim raids held off), a free reward on every tier, and the Season Pass with a second
// one (the season's own Bulbu on tier 5, the Golden Crown on tier 10). Payments aren't connected yet, so the pass
// turns on as a demo, and the screen says so.
import { useCallback, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import type { Reward, SeasonState, SeasonTier } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { GlossyIcon } from "@/components/GlossyIcon";
import { LightIcon } from "@/components/world/LightIcon";
import { Btn, Card, Header, Progress, Row, Screen, Sheet } from "@/components/ui";
import { C, F, T } from "@/theme";

const rewardText = (r: Reward) => r.kind === "light" ? `+${r.amount} Light` : r.kind === "piece" ? `${r.name} piece` : r.name;
const rewardIcon = (r: Reward) => r.kind === "light" ? "💡" : r.kind === "piece" ? "🧩" : "🎁";

export default function Season() {
  const { refresh, toast } = useStore();
  const [s, setS] = useState<SeasonState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [buy, setBuy] = useState(false);
  const load = useCallback(() => { api.season().then(setS).catch(e => toast((e as Error).message)); }, [toast]);
  useFocusEffect(load);
  if (!s) return <Screen><Header title="Season" /><ActivityIndicator color={C.primary} /></Screen>;

  const claim = async (t: SeasonTier, track: "free" | "pass") => {
    setBusy(`${t.tier}${track}`);
    try { const r = await api.claimSeason(t.tier, track); setS(r.season); toast(`${rewardIcon(r.reward)} ${rewardText(r.reward)}!`); refresh(); }
    catch (e) { toast((e as Error).message); } finally { setBusy(null); }
  };
  const ends = new Date(s.ends).toLocaleDateString("en-IN", { day: "numeric", month: "long" });

  return (
    <Screen>
      <Header title={`Season ${s.number}`} />
      <View style={{ borderRadius: 26, overflow: "hidden" }}>
        <LinearGradient colors={["#B9A8FF", "#6C4DF0", "#3B2F8F"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18, gap: 8 }}>
          <Row gap={14}>
            <View style={{ width: 70, height: 70, borderRadius: 22, backgroundColor: "rgba(255,255,255,.25)", alignItems: "center", justifyContent: "center" }}><GlossyIcon name="sparkles" size={48} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.heavy, fontSize: 21, color: "#fff" }}>{s.name}</Text>
              <Text style={{ fontFamily: F.semibold, fontSize: 13, color: "rgba(255,255,255,.9)" }}>{s.tagline}</Text>
            </View>
          </Row>
          <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: "rgba(255,255,255,.85)" }}>Ends {ends} · {s.daysLeft} {s.daysLeft === 1 ? "day" : "days"} left · this season's Bulbu: {s.outfitName}</Text>
        </LinearGradient>
      </View>

      <Card style={{ gap: 8 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={T.cardTitle}>Tier {s.tier} of {s.tiers.length}</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.ink2 }}>{s.xp.toLocaleString("en-IN")} season XP</Text>
        </Row>
        <Progress value={(s.intoTier / 1000) * 100} label="Progress to the next tier" />
        <Text style={T.small}>{s.tier >= s.tiers.length ? "Top tier! Everything's unlocked." : `${(1000 - s.intoTier).toLocaleString("en-IN")} XP to tier ${s.tier + 1}.`} Every Light you collect counts, plus 30 for each card you play and 60 for each Dim raid you hold off.</Text>
      </Card>

      {!s.pass && (
        <Card style={{ gap: 10, backgroundColor: "#FFF7DE", borderColor: "#F7E3A6" }}>
          <Text style={T.b}>✨ Season Pass · {s.price} a month</Text>
          <Text style={T.small}>A second, bigger reward on every tier: {s.outfitName} on tier 5 and the Golden Crown on tier 10, plus extra Light and raid pieces.</Text>
          <Btn title={`Get the Season Pass · ${s.price}`} onPress={() => setBuy(true)} />
        </Card>
      )}

      <View style={{ gap: 8 }}>
        <Row style={{ paddingHorizontal: 6 }}>
          <Text style={[T.tiny, { width: 44 }]}>TIER</Text>
          <Text style={[T.tiny, { flex: 1 }]}>FREE</Text>
          <Text style={[T.tiny, { flex: 1 }]}>SEASON PASS{s.pass ? " ✓" : ""}</Text>
        </Row>
        {s.tiers.map(t => (
          <Card key={t.tier} tight style={{ flexDirection: "row", alignItems: "center", gap: 8, opacity: t.reached ? 1 : 0.62 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: t.reached ? "#6C4DF0" : "#E6E9F7" }}>
              <Text style={{ fontFamily: F.heavy, fontSize: 14, color: t.reached ? "#fff" : C.ink2 }}>{t.tier}</Text>
            </View>
            <RewardCell r={t.free} claimed={t.freeClaimed} can={t.reached} busy={busy === `${t.tier}free`} onClaim={() => claim(t, "free")} />
            <RewardCell r={t.pass} claimed={t.passClaimed} can={t.reached && s.pass} locked={!s.pass} busy={busy === `${t.tier}pass`} onClaim={() => claim(t, "pass")} gold />
          </Card>
        ))}
      </View>

      <Sheet open={buy} onClose={() => setBuy(false)} title="Season Pass">
        <View style={{ gap: 12 }}>
          <Text style={T.body}>The Season Pass is {s.price} a month. Payments aren't connected in this build yet, so this turns the pass on as a demo: nothing is charged.</Text>
          <Btn title="Turn on the demo pass" busy={busy === "pass"} onPress={async () => {
            setBusy("pass");
            try { setS(await api.seasonPass()); setBuy(false); toast("Season Pass on (demo) ✨"); refresh(); } catch (e) { toast((e as Error).message); } finally { setBusy(null); }
          }} />
        </View>
      </Sheet>
    </Screen>
  );
}

function RewardCell({ r, claimed, can, locked, busy, onClaim, gold }: { r: Reward; claimed: boolean; can: boolean; locked?: boolean; busy: boolean; onClaim: () => void; gold?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Row gap={4}>
        {r.kind === "light" ? <LightIcon size={15} /> : <Text style={{ fontSize: 13 }}>{rewardIcon(r)}</Text>}
        <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: gold ? "#8A5A00" : C.ink, flex: 1 }} numberOfLines={2}>{rewardText(r)}</Text>
      </Row>
      {claimed ? <Text style={{ fontFamily: F.heavy, fontSize: 11.5, color: C.green }}>✓ Collected</Text>
        : locked ? <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: C.muted }}>🔒 Pass</Text>
        : can ? <Btn small title="Collect" busy={busy} onPress={onClaim} />
        : null}
    </View>
  );
}
