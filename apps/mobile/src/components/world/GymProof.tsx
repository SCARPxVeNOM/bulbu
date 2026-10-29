// Proving a workout, in the Arena's panel: set your gym once (Bulbu keeps only that spot), check in when you get there
// and out when you leave (25 minutes or more counts as a verified workout), or take a live photo. Proven workouts
// count in full in clan wars.
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import type { LogResult } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { hereNow, livePhoto } from "@/lib/proof";
import { Btn, Card, CardHead, Input, LinkBtn, Row } from "@/components/ui";
import { C, F, T } from "@/theme";

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export function GymProof() {
  const { state, refresh, toast, setLastLog, setReaction } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [, tick] = useState(0);
  const gym = state?.user.gym, visit = state?.user.gymVisit;
  useEffect(() => { if (!visit) return; const t = setInterval(() => tick(n => n + 1), 30_000); return () => clearInterval(t); }, [visit]);
  const mins = visit ? Math.floor((Date.now() - +new Date(visit.start)) / 60_000) : 0;

  const run = async (key: string, f: () => Promise<unknown>) => {
    setBusy(key);
    try { await f(); } catch (e) { toast((e as Error).message); } finally { setBusy(null); }
  };
  // a proven workout: back to the kingdom to watch the Arena rise
  const landed = (r: LogResult, msg: string) => { setLastLog(r); setReaction(r.bulbu); refresh(); toast(msg); router.navigate("/home" as never); };

  return (
    <View>
      <CardHead title="Prove it" right={<Text style={T.small}>counts in full in clan wars</Text>} />
      <Card style={{ gap: 10 }}>
        {!gym ? <>
          <Text style={T.small}>Stand in your gym and set it once. Bulbu keeps only that spot, never where you go, and checks your location only when you tap.</Text>
          <Input value={name} onChangeText={setName} placeholder="Gym name (optional)" maxLength={40} />
          <Btn title="📍 This is my gym" busy={busy === "set"} onPress={() => run("set", async () => {
            const r = await api.setGym({ ...(await hereNow()), name }); setName(""); refresh(); toast(`${r.gym.name} is set. Check in when you're there.`);
          })} />
        </> : visit ? <>
          <Row gap={10}>
            <Text style={{ fontSize: 26 }}>🏋️</Text>
            <View style={{ flex: 1 }}>
              <Text style={T.b}>At {gym.name} since {clock(visit.start)}</Text>
              <Text style={T.small}>{mins} {mins === 1 ? "minute" : "minutes"} so far · 25 minutes counts as a verified workout</Text>
            </View>
          </Row>
          <Btn title={mins >= 25 ? "Done: check out" : `Check out (${25 - mins} min to go)`} busy={busy === "out"} onPress={() => run("out", async () => {
            const r = await api.gymCheckout(await hereNow());
            landed(r, `${r.minutes} minutes at ${gym.name}, verified ✓${r.card ? ` · played "${r.card}"` : ""}`);
          })} />
        </> : <>
          <Text style={T.small}>Your gym: <Text style={T.b}>{gym.name}</Text>. Check in when you get there and out when you leave, or take a live photo.</Text>
          <Row gap={8}>
            <View style={{ flex: 1 }}><Btn title="📍 Check in" busy={busy === "in"} onPress={() => run("in", async () => {
              await api.gymCheckin(await hereNow()); refresh(); toast(`Checked in at ${gym.name}. Have a good one!`);
            })} /></View>
            <View style={{ flex: 1 }}><Btn kind="ghost" title="📸 Live photo" busy={busy === "photo"} onPress={() => run("photo", async () => {
              const p = await livePhoto(); if (!p) return;
              const r = await api.gymPhoto(p);
              landed(r, r.verified ? "Workout verified by photo ✓" : r.note ?? "Workout added");
            })} /></View>
          </Row>
          <LinkBtn title="I'm somewhere else: set my gym here" color={C.ink2} onPress={() => run("set", async () => {
            const r = await api.setGym({ ...(await hereNow()), name: gym.name }); refresh(); toast(`${r.gym.name} moved to where you are.`);
          })} />
        </>}
        <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: C.muted }}>Fake-location apps are spotted and don't count. A photo has to be taken just now, with Bulbu's camera, and can't be used twice.</Text>
      </Card>
    </View>
  );
}
