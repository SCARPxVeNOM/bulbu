import { useCallback, useEffect, useState } from "react";
import { AppState, Platform, Text, View } from "react-native";
import { router } from "expo-router";
import type { AppKind, UsageResult } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { hasUsageAccess, openUsageSettings, syncToday, usageAvailable } from "@/lib/usage";
import { Btn, Card, Chip, Header, Pill, Row, Screen, Thinking } from "@/components/ui";
import { GlossyIcon } from "@/components/GlossyIcon";
import { C, F, T } from "@/theme";
import { fmtM } from "@/lib/format";

const KINDS: [AppKind, string][] = [["distracting", "Distracting"], ["productive", "Productive"], ["neutral", "Ignore"]];

export default function ScreenTime() {
  const { refresh, toast } = useStore();
  const [access, setAccess] = useState(hasUsageAccess());
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<UsageResult | null>(null);

  // coming back from Settings: check whether access was granted
  useEffect(() => {
    const sub = AppState.addEventListener("change", s => { if (s === "active") setAccess(hasUsageAccess()); });
    return () => sub.remove();
  }, []);

  const sync = useCallback(async () => {
    setBusy(true);
    try { const r = await syncToday(); setRes(r); refresh(); if (r && !r.logged.length) toast("Up to date"); }
    catch (e) { toast((e as Error).message); }
    finally { setBusy(false); }
  }, [refresh, toast]);
  useEffect(() => { if (access) void sync(); }, [access]); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async (app: string, kind: AppKind) => {
    try { await api.setAppKind(app, kind); toast(`${app}: ${kind === "neutral" ? "ignored" : kind}`); await sync(); }
    catch (e) { toast((e as Error).message); }
  };

  return (
    <Screen>
      <Header title="Screen time" subtitle="Bulbu turns minutes on your apps into days closer or further from your goals." />

      {Platform.OS !== "android" && (
        <Card style={{ gap: 10 }}>
          <Text style={T.b}>{Platform.OS === "ios" ? "iPhone keeps per-app minutes private" : "Screen time comes from the phone"}</Text>
          <Text style={T.muted}>{Platform.OS === "ios" ? "Apple doesn't let apps read Screen Time numbers. Take a screenshot of Settings › Screen Time and Bulbu will read it (only distracting and productive apps are kept)." : "Open Bulbu on your Android phone to sync app usage, or upload a screenshot."}</Text>
          <Btn icon="camera" title="Log a Screen Time screenshot" onPress={() => router.push("/log")} />
        </Card>
      )}

      {Platform.OS === "android" && !usageAvailable && (
        <Card style={{ gap: 10 }}>
          <Text style={T.b}>Needs the Bulbu app build</Text>
          <Text style={T.muted}>Reading usage access is native Android code, which Expo Go doesn't include. Install Bulbu's own build (see the README), or log a Digital Wellbeing screenshot for now.</Text>
          <Btn icon="camera" title="Log a screenshot instead" onPress={() => router.push("/log")} />
        </Card>
      )}

      {usageAvailable && !access && (
        <Card style={{ gap: 12 }}>
          <Row gap={12}><GlossyIcon name="phone" size={46} /><Text style={[T.b, { flex: 1, fontSize: 16 }]}>Let Bulbu see how long you use each app</Text></Row>
          <Text style={T.muted}>Android calls this “Usage access”. Bulbu reads minutes per app for today, keeps only distracting and productive apps, and never sees what you do inside them. Calls, messages, maps and payments are ignored.</Text>
          <Btn title="Open Usage access settings" icon="settings" onPress={openUsageSettings} />
          <Text style={T.tiny}>Find Bulbu in the list and switch it on, then come back.</Text>
        </Card>
      )}

      {usageAvailable && access && <>
        <Card style={{ gap: 10 }}>
          <Row style={{ justifyContent: "space-between" }}><Text style={T.cardTitle}>Today</Text><Pill tone="green" title="Usage access on" /></Row>
          {busy ? <Thinking text="Reading today's usage…" /> : res ? <>
            {res.logged.length === 0 && <Text style={T.small}>No new minutes since the last sync.</Text>}
            {res.logged.map(l => (
              <Row key={l.app} style={{ paddingVertical: 6 }}>
                <GlossyIcon name={l.kind === "productive" ? l.category : "social_media"} size={30} />
                <Text style={[T.body, { flex: 1 }]}>{l.app}</Text>
                <Text style={[T.b, { color: l.kind === "productive" ? C.green : C.red }]}>{fmtM(l.minutes)}</Text>
              </Row>
            ))}
            {res.netDays !== 0 && <Text style={[T.small, { fontFamily: F.semibold, color: res.netDays > 0 ? C.red : C.green }]}>This sync: {res.netDays > 0 ? `+${res.netDays}` : res.netDays} days on your goals</Text>}
            {res.ignored.length > 0 && <Text style={T.tiny}>Not counted: {res.ignored.map(i => i.app).join(", ")}</Text>}
          </> : null}
          <Btn kind="ghost" icon="refresh" title="Sync now" busy={busy} onPress={sync} />
        </Card>
        {res && res.unknown.length > 0 && (
          <Card style={{ gap: 10 }}>
            <Text style={T.cardTitle}>Which kind are these?</Text>
            <Text style={T.small}>Bulbu doesn't know these apps yet, so it isn't counting them.</Text>
            {res.unknown.map(app => (
              <View key={app} style={{ gap: 6, paddingVertical: 6, borderTopWidth: 1, borderColor: C.line }}>
                <Text style={T.b}>{app}</Text>
                <Row gap={8} style={{ flexWrap: "wrap" }}>{KINDS.map(([k, l]) => <Chip key={k} title={l} onPress={() => decide(app, k)} />)}</Row>
              </View>
            ))}
          </Card>
        )}
        <Text style={[T.tiny, { textAlign: "center" }]}>Bulbu syncs quietly whenever you open it. Syncing again updates today's numbers, it never counts twice.</Text>
      </>}
    </Screen>
  );
}
