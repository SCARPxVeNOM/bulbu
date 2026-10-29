// Your clan: a study group that builds together. This week's clan war (clan against clan, often college against
// college), the clanmates and their kingdoms (levels and finish dates, never anyone's scrolling), Light sent between
// you, and last week's war Light to collect. Not in a clan yet: join one or start your own.
import { useCallback, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { fmtDays } from "@bulbu/engine";
import type { ClanBrief, ClanMember, ClanView } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Btn, Card, CardHead, Chip, Chips, Field, Header, Input, LinkBtn, Row, Screen, Sheet, tap } from "@/components/ui";
import { LightIcon } from "@/components/world/LightIcon";
import { C, F, T } from "@/theme";

const shortDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const ago = (iso: string) => { const d = Math.floor((Date.now() - +new Date(iso)) / 86_400_000); return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`; };
const EMBLEMS = ["🏰", "⚡", "🦉", "🐉", "🚀", "🌙", "🔥", "🌿"];

export default function ClanScreen() {
  const { state, refresh, toast } = useStore();
  const [v, setV] = useState<ClanView | null>(null);
  const [give, setGive] = useState<ClanMember | null>(null);
  const [making, setMaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api.clan().then(setV).catch(e => toast((e as Error).message)); }, [toast]);
  useFocusEffect(load);

  if (!v || !state) return <Screen tabs><Header back={false} title="Clan" /><ActivityIndicator color={C.primary} /></Screen>;
  const c = v.clan;
  const act = async (f: () => Promise<ClanView>, ok?: string) => {
    setBusy(true);
    try { setV(await f()); if (ok) toast(ok); refresh(); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  if (!c) return (
    <Screen tabs>
      <Header back={false} title="Clan" subtitle="Clans are study groups. Send each other Light, visit each other's kingdoms, and fight weekly clan wars, college against college." />
      {v.clans.map(x => <ClanRow key={x.id} c={x} action={<Btn small title="Join" busy={busy} onPress={() => act(() => api.joinClan(x.id), `Welcome to ${x.name}!`)} />} />)}
      <Btn icon="plus" title="Start a clan" onPress={() => setMaking(true)} />
      <MakeClan open={making} onClose={() => setMaking(false)} onMake={b => act(() => api.createClan(b), `${b.name} is up! Invite your friends.`).then(() => setMaking(false))} />
    </Screen>
  );

  const w = c.war, me = c.members.find(m => m.me);
  const share = w ? (w.us + w.them ? w.us / (w.us + w.them) : 0.5) : 0.5;
  return (
    <Screen tabs>
      {/* the clan's banner */}
      <View style={{ borderRadius: 26, overflow: "hidden" }}>
        <LinearGradient colors={[c.color, "#3B2F8F"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18, gap: 6 }}>
          <Row gap={12}>
            <View style={{ width: 62, height: 62, borderRadius: 20, backgroundColor: "rgba(255,255,255,.22)", alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 34 }}>{c.emblem}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.heavy, fontSize: 24, color: "#fff" }}>{c.name}</Text>
              <Text style={{ fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,.88)" }}>{c.college} · {c.members.length} {c.members.length === 1 ? "member" : "members"}</Text>
            </View>
          </Row>
          {!!c.motto && <Text style={{ fontFamily: F.semibold, fontSize: 13, color: "rgba(255,255,255,.9)", fontStyle: "italic" }}>“{c.motto}”</Text>}
        </LinearGradient>
      </View>

      {/* last week's war: its Light waits to be collected */}
      {c.lastWar && !c.lastWar.collected && (
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.lastWar.result === "won" ? "#FFF7DE" : "#F6F7FD" }}>
          <Text style={{ fontSize: 28 }}>{c.lastWar.result === "won" ? "🏆" : c.lastWar.result === "draw" ? "🤝" : "⚔️"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={T.b}>{c.lastWar.result === "won" ? `You won last week's war!` : c.lastWar.result === "draw" ? "Last week's war was a draw" : `${c.lastWar.rival.name} took last week's war`}</Text>
            <Text style={T.small}>{c.name} {c.lastWar.us} · {c.lastWar.rival.name} {c.lastWar.them}. {c.lastWar.result === "lost" ? "Everyone who played still collects Light." : ""}</Text>
          </View>
          <Btn small title={`+${c.lastWar.light}`} busy={busy} onPress={async () => {
            setBusy(true);
            try { const r = await api.collectWar(); setV(r.view); toast(`+${r.light} Light from the clan war!`); refresh(); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
          }} />
        </Card>
      )}

      {/* this week's war */}
      {w ? (
        <Card style={{ gap: 10 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={T.cardTitle}>⚔️ Clan war</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: C.ink2 }}>{w.daysLeft} {w.daysLeft === 1 ? "day" : "days"} left</Text>
          </Row>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ alignItems: "flex-start" }}>
              <Text style={{ fontFamily: F.heavy, fontSize: 13, color: C.ink2 }}>{c.emblem} {c.name}</Text>
              <Text style={{ fontFamily: F.heavy, fontSize: 30, color: c.color }}>{w.us}</Text>
            </View>
            <Text style={{ fontFamily: F.heavy, fontSize: 15, color: C.muted }}>vs</Text>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontFamily: F.heavy, fontSize: 13, color: C.ink2 }}>{w.rival.name} {w.rival.emblem}</Text>
              <Text style={{ fontFamily: F.heavy, fontSize: 30, color: w.rival.color }}>{w.them}</Text>
            </View>
          </Row>
          {/* the tug of war */}
          <View style={{ height: 14, borderRadius: 7, overflow: "hidden", flexDirection: "row", backgroundColor: w.rival.color }}>
            <View style={{ width: `${Math.round(share * 100)}%`, backgroundColor: c.color }} />
          </View>
          <Text style={T.small}>{w.rival.college} · {w.us >= w.them ? `${c.name} is ahead by ${w.us - w.them}.` : `${w.them - w.us} to catch up. One card each would do it.`}</Text>
          <Text style={T.tiny}>Points come from good moves only: 10 a day pulled sooner, 15 a raid held off, 5 a card played. A bad day takes nothing away. The winners collect 150 Light each; everyone who played, 50.</Text>
          {me && <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.ink }}>You: {me.week.points} points this week</Text>}
        </Card>
      ) : <Card><Text style={T.small}>No rival clan this week. Clan wars start when there's another clan to fight.</Text></Card>}

      {/* the clanmates */}
      <View>
        <CardHead title="Clanmates" right={<Text style={T.small}>this week</Text>} />
        <Card style={{ paddingVertical: 4 }}>
          {c.members.map((m, i) => (
            <View key={m.id} style={{ paddingVertical: 11, gap: 6, borderBottomWidth: i < c.members.length - 1 ? 1 : 0, borderColor: C.line }}>
              <Row gap={10}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: m.me ? C.primary : "#ECE8FF", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: F.heavy, fontSize: 16, color: m.me ? "#fff" : "#5B4AA8" }}>{m.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={T.b}>{m.name}{m.me ? " (you)" : ""} <Text style={T.small}>· kingdom Lv {m.level}</Text></Text>
                  <Text style={T.small} numberOfLines={1}>{m.castle ? `Castle Lv ${m.castle.level} · ${m.castle.goalTitle}${m.castle.building && m.castle.eta ? ` · ready ${shortDate(m.castle.eta)}` : ""}` : "Just getting started"}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontFamily: F.heavy, fontSize: 16, color: c.color }}>{m.week.points}</Text>
                  <Text style={T.tiny}>points</Text>
                </View>
              </Row>
              <Row gap={6} style={{ flexWrap: "wrap" }}>
                {m.week.daysSooner > 0 && <Tag text={`✨ ${fmtDays(-m.week.daysSooner).slice(1)} sooner`} />}
                {m.week.cardsPlayed > 0 && <Tag text={`🃏 ${m.week.cardsPlayed} ${m.week.cardsPlayed === 1 ? "card" : "cards"}`} />}
                {m.week.raidsHeld > 0 && <Tag text={`🛡️ ${m.week.raidsHeld} ${m.week.raidsHeld === 1 ? "raid" : "raids"}`} />}
                <View style={{ flex: 1 }} />
                {!m.me && <LinkBtn title="Visit" onPress={() => router.push(`/visit/${m.id}` as never)} />}
                {!m.me && <LinkBtn title="Send Light" onPress={() => setGive(m)} />}
              </Row>
            </View>
          ))}
        </Card>
      </View>

      {/* Light sent round the clan */}
      {c.donations.length > 0 && (
        <View>
          <CardHead title="Light sent" />
          <Card style={{ gap: 8 }}>
            {c.donations.slice(0, 6).map((d, i) => (
              <Row key={i} gap={8}><LightIcon size={16} /><Text style={[T.small, { flex: 1, color: C.ink }]}><Text style={T.b}>{d.fromName}</Text> sent {d.toName} {d.light} Light</Text><Text style={T.tiny}>{ago(d.at)}</Text></Row>
            ))}
          </Card>
        </View>
      )}

      {v.clans.length > 0 && (
        <View>
          <CardHead title="Other clans" />
          {v.clans.map(x => <ClanRow key={x.id} c={x} />)}
        </View>
      )}
      <View style={{ alignItems: "center" }}><LinkBtn title={`Leave ${c.name}`} color={C.ink2} onPress={() => act(() => api.leaveClan(), `You left ${c.name}.`)} /></View>

      <Sheet open={!!give} onClose={() => setGive(null)} title={`Send Light to ${give?.name ?? ""}`}>
        <View style={{ gap: 12 }}>
          <Text style={T.small}>It comes out of your Light and lands on their kingdom. Up to 100 at a time, 300 a day{c.sentToday ? ` (you've sent ${c.sentToday} today)` : ""}. You have {state.world.light} Light.</Text>
          <Row gap={8}>
            {[25, 50, 100].map(n => (
              <View key={n} style={{ flex: 1 }}>
                <Btn kind={n === 50 ? "primary" : "ghost"} title={`${n}`} busy={busy} disabled={n > state.world.light}
                     onPress={() => give && act(() => api.donate(give.id, n), `Sent ${n} Light to ${give.name} ✨`).then(() => setGive(null))} />
              </View>
            ))}
          </Row>
        </View>
      </Sheet>
    </Screen>
  );
}

const Tag = ({ text }: { text: string }) => (
  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: "#F1F3FB" }}><Text style={{ fontFamily: F.bold, fontSize: 11.5, color: C.ink2 }}>{text}</Text></View>
);

function ClanRow({ c, action }: { c: ClanBrief; action?: React.ReactNode }) {
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: c.color, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 24 }}>{c.emblem}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={T.b}>{c.name}</Text>
        <Text style={T.small}>{c.college} · {c.members} {c.members === 1 ? "member" : "members"}</Text>
      </View>
      {action}
    </Card>
  );
}

function MakeClan({ open, onClose, onMake }: { open: boolean; onClose: () => void; onMake: (b: { name: string; college: string; emblem: string }) => void }) {
  const [name, setName] = useState(""), [college, setCollege] = useState(""), [emblem, setEmblem] = useState("🏰");
  return (
    <Sheet open={open} onClose={onClose} title="Start a clan">
      <View style={{ gap: 12 }}>
        <Field label="Clan name"><Input value={name} onChangeText={setName} placeholder="NODE" maxLength={28} /></Field>
        <Field label="College or group"><Input value={college} onChangeText={setCollege} placeholder="BMSITM" maxLength={40} /></Field>
        <Field label="Emblem"><Chips>{EMBLEMS.map(e => <Chip key={e} title={e} on={e === emblem} onPress={() => { tap(); setEmblem(e); }} />)}</Chips></Field>
        <Btn title="Start the clan" disabled={name.trim().length < 2} onPress={() => onMake({ name: name.trim(), college: college.trim(), emblem })} />
      </View>
    </Sheet>
  );
}
