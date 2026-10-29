import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { Category, LogInput, LogResult } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { fmtM } from "@/lib/format";
import { useVoiceRecorder } from "@/lib/voice";
import { CAT } from "@/components/Icon";
import { Bulbu } from "@/components/bulbu/Bulbu";
import { Btn, Card, Chip, Chips, Field, Header, Input, Round, Row, Screen, Seg, Thinking, Tile, tap } from "@/components/ui";
import { C, F, T, THEMES } from "@/theme";

// Tell Bulbu what happened: a screenshot (screen time, a receipt, a meal, a workout), a voice note, or a sentence.
// Bulbu reads it into moves (Muse Spark) and you're back on the kingdom to see what they did. No forms, no categories.
type Mode = "photo" | "voice" | "text";

export default function Tell() {
  const { setLastLog, setReaction, refresh, toast, state } = useStore();
  const [mode, setMode] = useState<Mode>("photo");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const stage = THEMES[state?.user.theme ?? "sky"]?.stage ?? C.stage;

  const done = (r: LogResult) => {
    if (r.needsText) { setMsg(r.message ?? "Tell me in a sentence instead."); setMode("text"); setBusy(false); return; }
    // back to the kingdom: the buildings it moved play their moment, and Bulbu reacts
    setLastLog(r); setReaction(r.bulbu); refresh();
    if (router.canDismiss()) router.dismissAll();
    router.navigate("/home" as never);
  };
  const submit = async (body: LogInput) => {
    setBusy(true); setMsg(null);
    try { done(await api.log(body)); } catch (e) { toast((e as Error).message); setBusy(false); }
  };

  return (
    <Screen>
      <Header title="Tell Bulbu" subtitle="Show a screenshot, say it, or type it. Bulbu turns it into moves on your kingdom." />
      <Seg value={mode} onChange={m => { setMode(m); setMsg(null); }} options={[["photo", "Screenshot"], ["voice", "Voice"], ["text", "Text"]]} />
      {mode === "text" && <TextLog busy={busy} msg={msg} text={text} setText={setText} onSubmit={() => submit({ text, source: "text" })} />}
      {mode === "voice" && <VoiceLog busy={busy} onSubmit={t => submit({ text: t, source: "voice" })} />}
      {mode === "photo" && <PhotoLog busy={busy} ai={!!state?.ai.enabled} onSubmit={(image, t) => submit({ image, text: t || undefined, source: "screenshot" })} />}

      <Bulbu emote={busy ? "focused" : "happy"} view="close" background={stage} outfit={state?.user.outfit} style={{ width: 112, height: 112, borderRadius: 56, alignSelf: "flex-end", marginTop: "auto" }} />
    </Screen>
  );
}

function TextLog({ busy, msg, text, setText, onSubmit }: { busy: boolean; msg: string | null; text: string; setText: (s: string) => void; onSubmit: () => void }) {
  const examples = ["Spent 40 min on Instagram", "Solved 2 LeetCode problems in an hour", "Long day, skipped gym, ordered biryani for ₹380", "Cooked dinner at home", "Put ₹500 aside", "Read 20 pages"];
  return (
    <View style={{ gap: 12 }}>
      {msg && <Card tight style={{ backgroundColor: C.primarySoft }}><Text style={T.body}>{msg}</Text></Card>}
      <Card style={{ padding: 6 }}><Input multiline autoFocus value={text} onChangeText={setText} placeholder="Spent 40 min on Instagram" style={{ borderWidth: 0 }} /></Card>
      <Chips>{examples.map(x => <Chip key={x} title={x} onPress={() => setText(x)} />)}</Chips>
      <Btn title="Tell Bulbu" busy={busy} disabled={!text.trim()} onPress={onSubmit} />
    </View>
  );
}

function VoiceLog({ busy, onSubmit }: { busy: boolean; onSubmit: (t: string) => void }) {
  const rec = useVoiceRecorder();
  const { toast } = useStore();
  const [t, setT] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [hearing, setHearing] = useState(false);
  const toggle = async () => {
    setErr(null);
    try {
      if (!rec.recording) { await rec.start(); return; }
      const file = await rec.stop();
      if (!file) { setErr("I didn't catch that. Hold on a little longer."); return; }
      setHearing(true);
      const r = await api.voice({ uri: file.uri, name: "voice.wav", type: "audio/wav" });
      setT(x => (x ? x + " " : "") + r.transcript);
      if (!r.transcript) setErr("I couldn't make out any words. Try again a bit closer to the mic.");
    } catch (e) { setErr((e as Error).message); toast((e as Error).message); }
    finally { setHearing(false); }
  };
  if (!rec.supported) return <Card><Text style={[T.muted, { textAlign: "center" }]}>Voice check-ins work in the Bulbu app on your phone. Use Text here.</Text></Card>;
  return (
    <View style={{ gap: 14, alignItems: "center" }}>
      <Text style={[T.muted, { textAlign: "center" }]}>Tell Bulbu about your day, like: “Long day, skipped gym, ordered biryani.”</Text>
      <Round size={84} name={rec.recording ? "pause" : "mic"} primary live={rec.recording} label={rec.recording ? "Stop" : "Start talking"} onPress={toggle} disabled={hearing} />
      {hearing ? <Thinking text="Listening back…" /> : <Text style={T.small}>{rec.recording ? `Listening… ${Math.floor(rec.seconds)}s · tap to stop` : "Tap to talk"}</Text>}
      {err && <Text style={[T.small, { color: C.red, textAlign: "center" }]}>{err}</Text>}
      {!!t && <Card style={{ alignSelf: "stretch", padding: 6 }}><Input multiline value={t} onChangeText={setT} style={{ borderWidth: 0, minHeight: 64 }} /></Card>}
      <View style={{ alignSelf: "stretch" }}><Btn title="Tell Bulbu" busy={busy} disabled={!t.trim() || rec.recording || hearing} onPress={() => onSubmit(t)} /></View>
    </View>
  );
}

function PhotoLog({ busy, ai, onSubmit }: { busy: boolean; ai: boolean; onSubmit: (dataUrl: string, text: string) => void }) {
  const [img, setImg] = useState<{ uri: string; data: string } | null>(null);
  const [note, setNote] = useState("");
  const { toast } = useStore();
  const pick = async (camera: boolean) => {
    try {
      if (camera) { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) { toast("Camera permission was denied."); return; } }
      const r = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
      if (r.canceled || !r.assets[0]) return;
      const a = r.assets[0];
      // the model reads a 1400px image as well as the original, and uploads stay small
      const k = Math.min(1, 1400 / Math.max(a.width || 1400, a.height || 1400));
      const out = await manipulateAsync(a.uri, k < 1 ? [{ resize: { width: Math.round((a.width || 1400) * k) } }] : [], { compress: 0.86, format: SaveFormat.JPEG, base64: true });
      setImg({ uri: out.uri, data: `data:image/jpeg;base64,${out.base64}` });
    } catch (e) { toast((e as Error).message); }
  };
  return (
    <View style={{ gap: 12 }}>
      <Card style={{ alignItems: "center", gap: 8, minHeight: 170, justifyContent: "center", borderStyle: "dashed", borderWidth: 2, borderColor: "#CBD5F5" }} onPress={() => pick(false)} label="Choose a photo">
        {img ? <Image source={{ uri: img.uri }} style={{ width: "100%", height: 260, borderRadius: 12 }} resizeMode="contain" /> : <>
          <Tile icon="camera" color={C.primary} size={52} />
          <Text style={T.b}>Show Bulbu a screenshot or photo</Text>
          <Text style={[T.small, { textAlign: "center" }]}>Digital Wellbeing or Screen Time, receipts, meals, workout screens</Text>
        </>}
      </Card>
      <Btn kind="ghost" icon="camera" title="Take a photo" onPress={() => pick(true)} />
      {!ai && <Text style={[T.small, { textAlign: "center" }]}>Reading images needs Muse Spark (set META_API_KEY on the server). Offline, add a short note and Bulbu reads that instead.</Text>}
      <Input value={note} onChangeText={setNote} placeholder="Add a note (optional): “this was yesterday”" />
      <Btn title={busy ? "Bulbu is reading it…" : "Show Bulbu"} busy={busy} disabled={!img} onPress={() => img && onSubmit(img.data, note)} />
    </View>
  );
}
