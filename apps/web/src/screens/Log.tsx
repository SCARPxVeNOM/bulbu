import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, type Category, type LogResult } from "../api";
import { Bulbu } from "../bulbu/Bulbu";
import { CAT, Icon, Tile } from "../components/Icon";
import { Header, Screen, Seg } from "../components/ui";
import { Shimmer } from "../components/fx";
import { useStore } from "../store";
import { useStage } from "../theme";

type Mode = "quick" | "photo" | "voice" | "text";
const QUICK: Category[] = ["study", "workout", "read", "code", "sleep", "eat", "social_media", "other"];
const TIMED = new Set<Category>(["study", "workout", "read", "code", "sleep", "social_media", "other", "focus"]);
const APPS = ["Instagram", "YouTube", "X", "Snapchat", "Facebook", "Other"];
const MIN_CHIPS: Partial<Record<Category, number[]>> = { sleep: [300, 360, 420, 480, 540], social_media: [15, 30, 40, 60, 120] };

export function Log() {
  const [params] = useSearchParams();
  const preset = params.get("cat") as Category | null;
  const goalId = params.get("goal") ?? undefined;
  const nav = useNavigate();
  const { setLastLog, setReaction, refresh, toast, state } = useStore();
  const stage = useStage();
  const [mode, setMode] = useState<Mode>("quick");
  const [cat, setCat] = useState<Category | null>(preset);
  const [minutes, setMinutes] = useState(preset === "code" ? 40 : 30);
  const [units, setUnits] = useState(preset === "code" ? 1 : preset === "read" ? 10 : 0);
  const [amount, setAmount] = useState(preset === "save" ? 200 : 0);
  const [app, setApp] = useState("Instagram");
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { if (cat === "sleep") setMinutes(420); }, [cat]);

  const done = (r: LogResult) => {
    if (r.needsText) { setMsg(r.message ?? "Tell me in a sentence instead."); setMode("text"); setBusy(false); return; }
    setLastLog(r); setReaction(r.bulbu); refresh(); nav("/impact");
  };
  const submit = async (body: Parameters<typeof api.log>[0]) => {
    setBusy(true); setMsg(null);
    try { done(await api.log(body)); } catch (e) { toast((e as Error).message); setBusy(false); }
  };
  const submitQuick = () => {
    if (!cat) return;
    const money = cat === "eat" || cat === "spend" || cat === "save";
    if (money && amount <= 0 && cat !== "eat") { toast("Add an amount"); return; }
    submit({ quick: {
      category: cat, goalId,
      minutes: TIMED.has(cat) ? minutes : undefined,
      units: (cat === "code" || cat === "read") && units > 0 ? units : cat === "workout" ? 1 : undefined,
      amount: money && amount > 0 ? amount : undefined,
      label: label.trim() || (cat === "social_media" ? app : cat === "code" && units ? `Solved ${units} ${units === 1 ? "problem" : "problems"}` : cat === "read" && units ? `Read ${units} pages` : undefined),
      app: cat === "social_media" ? app : undefined,
    } });
  };

  return (
    <Screen>
      <Header title="Log an Activity" subtitle="Add anything you did. Bulbu will understand and track it." />
      <Seg value={mode} onChange={m => { setMode(m); setMsg(null); }} options={[["quick", "Quick"], ["photo", "Photo"], ["voice", "Voice"], ["text", "Text"]]} />

      {mode === "quick" && <>
        <div className="cat-grid">
          {(preset === "save" ? [...QUICK.slice(0, 7), "save" as Category] : QUICK).map(c => (
            <button key={c} className="cat" aria-pressed={cat === c} onClick={() => setCat(cat === c ? null : c)}><Tile icon={CAT[c].icon} color={CAT[c].color} size={58} />{CAT[c].label}</button>
          ))}
        </div>
        {cat && (
          <div className="card stack">
            {cat === "social_media" && (
              <div className="chips">{APPS.map(a => <button key={a} className="chip" style={a === app ? { borderColor: "var(--primary)", color: "var(--primary)" } : {}} onClick={() => setApp(a)}>{a}</button>)}</div>
            )}
            {TIMED.has(cat) && (
              <label className="field">
                <span className="row between">{cat === "sleep" ? "How long did you sleep?" : "How long?"}<b style={{ color: "var(--ink)" }}>{fmtM(minutes)}</b></span>
                <input type="range" min={5} max={cat === "sleep" ? 660 : 240} step={5} value={minutes} onChange={e => setMinutes(Number(e.target.value))} />
                <div className="chips">{(MIN_CHIPS[cat] ?? [15, 25, 30, 45, 60, 90]).map(m => <button key={m} className="chip" onClick={() => setMinutes(m)}>{fmtM(m)}</button>)}</div>
              </label>
            )}
            {(cat === "code" || cat === "read") && (
              <label className="field"><span className="row between">{cat === "code" ? "Problems solved" : "Pages read"}<span className="row">
                <button className="round" aria-label="Less" onClick={() => setUnits(u => Math.max(0, u - (cat === "read" ? 5 : 1)))}>−</button>
                <b style={{ minWidth: 28, textAlign: "center", color: "var(--ink)" }}>{units}</b>
                <button className="round" aria-label="More" onClick={() => setUnits(u => u + (cat === "read" ? 5 : 1))}>+</button></span></span></label>
            )}
            {(cat === "eat" || cat === "save" || cat === "other") && (
              <label className="field">{cat === "save" ? "Amount put aside (₹)" : cat === "eat" ? "How much was it? (₹, optional)" : "Money spent (₹, optional)"}
                <input className="input" type="number" inputMode="numeric" value={amount || ""} onChange={e => setAmount(Number(e.target.value))} placeholder="0" />
              </label>
            )}
            <label className="field">Note (optional)<input className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder={cat === "eat" ? "Biryani from Swiggy" : "What was it?"} /></label>
          </div>
        )}
        {!cat && (
          <div className="entry">
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Spent 40 min on Instagram" aria-label="Describe what you did" rows={3} />
            {text && <button className="clear" aria-label="Clear" onClick={() => setText("")}><Icon name="x" size={16} /></button>}
          </div>
        )}
        <button className="btn" disabled={(!cat && !text.trim()) || busy} onClick={() => cat ? submitQuick() : submit({ text, source: "text" })}>{busy ? <Shimmer>Bulbu is thinking…</Shimmer> : "Add Activity"}</button>
      </>}

      {mode === "text" && <TextLog busy={busy} msg={msg} text={text} setText={setText} onSubmit={() => submit({ text, source: "text" })} />}
      {mode === "voice" && <VoiceLog busy={busy} onSubmit={t => submit({ text: t, source: "voice" })} />}
      {mode === "photo" && <PhotoLog busy={busy} ai={!!state?.ai.enabled} onSubmit={(image, t) => submit({ image, text: t || undefined, source: "screenshot" })} />}

      <Bulbu emote={busy ? "focused" : "happy"} view="close" background={stage} className="log-bulbu" />
      <style>{`.log-bulbu { width: 120px; height: 120px; border-radius: 50%; align-self: flex-end; margin-top: auto; }`}</style>
    </Screen>
  );
}

const fmtM = (m: number) => m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;

function TextLog({ busy, msg, text, setText, onSubmit }: { busy: boolean; msg: string | null; text: string; setText: (s: string) => void; onSubmit: () => void }) {
  const examples = ["Spent 40 min on Instagram", "Solved 2 LeetCode problems in an hour", "Long day, skipped gym, ordered biryani for ₹380", "Cooked dinner at home", "Read 20 pages"];
  return (
    <form className="stack" onSubmit={e => { e.preventDefault(); if (text.trim()) onSubmit(); }}>
      {msg && <div className="card tight" style={{ background: "var(--primary-soft)", boxShadow: "none" }}>{msg}</div>}
      <div className="card" style={{ padding: 6 }}><textarea className="input" style={{ border: 0, boxShadow: "none" }} autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="Spent 40 min on Instagram" /></div>
      <div className="chips">{examples.map(x => <button type="button" key={x} className="chip" onClick={() => setText(x)}>{x}</button>)}</div>
      <button className="btn" disabled={!text.trim() || busy}>{busy ? <Shimmer>Bulbu is thinking…</Shimmer> : "Add Activity"}</button>
    </form>
  );
}

type Rec = { start(): void; stop(): void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: (e: { error: string }) => void; lang: string; interimResults: boolean; continuous: boolean };

function VoiceLog({ busy, onSubmit }: { busy: boolean; onSubmit: (t: string) => void }) {
  const [listening, setListening] = useState(false);
  const [t, setT] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const rec = useRef<Rec | null>(null);
  const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
  const toggle = () => {
    if (!SR) return;
    if (listening) { rec.current?.stop(); return; }
    const r = new SR(); r.lang = "en-IN"; r.interimResults = true; r.continuous = true;
    r.onresult = e => setT(Array.from(e.results).map(x => x[0].transcript).join(" "));
    r.onend = () => setListening(false);
    r.onerror = e => { setErr(e.error === "not-allowed" ? "Microphone permission was denied." : `Voice error: ${e.error}`); setListening(false); };
    rec.current = r; setErr(null); r.start(); setListening(true);
  };
  if (!SR) return <div className="card center muted">Voice check-ins need a browser with speech recognition (Chrome, Edge, Safari). Use Text for now.</div>;
  return (
    <div className="stack" style={{ justifyItems: "center" }}>
      <p className="muted center">Tell Bulbu about your day, like: “Long day, skipped gym, ordered biryani.”</p>
      <button className={`round ${listening ? "live" : "primary"}`} style={{ width: 84, height: 84 }} onClick={toggle} aria-label={listening ? "Stop" : "Start talking"}><Icon name={listening ? "pause" : "mic"} size={34} /></button>
      <span className="muted small">{listening ? "Listening… tap to stop" : "Tap to talk"}</span>
      {err && <p className="red small">{err}</p>}
      {t && <div className="card" style={{ width: "100%" }}>{t}</div>}
      <button className="btn" disabled={!t.trim() || busy || listening} onClick={() => onSubmit(t)}>{busy ? <Shimmer>Bulbu is thinking…</Shimmer> : "Add Activity"}</button>
    </div>
  );
}

function PhotoLog({ busy, ai, onSubmit }: { busy: boolean; ai: boolean; onSubmit: (dataUrl: string, text: string) => void }) {
  const [img, setImg] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const pick = async (f: File | undefined) => { if (f) setImg(await downscale(f, 1400)); };
  return (
    <div className="stack">
      <label className="card center" style={{ display: "grid", gap: 8, placeItems: "center", minHeight: 170, cursor: "pointer", border: "2px dashed #CBD5F5" }}>
        {img ? <img src={img} alt="Selected" style={{ maxHeight: 260, maxWidth: "100%", borderRadius: 12 }} /> : <>
          <Tile icon="camera" color="#3D5BFF" size={52} />
          <b>Snap or upload</b>
          <span className="muted small">Screen Time or Instagram activity screenshots, receipts, meals, workout screens</span>
        </>}
        <input type="file" accept="image/*" className="sr" onChange={e => pick(e.target.files?.[0])} />
      </label>
      {!ai && <p className="muted small center">Reading images needs Muse Spark (set META_API_KEY on the server). Offline, add a short note and Bulbu will log that.</p>}
      <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional): “this was yesterday”" />
      <button className="btn" disabled={!img || busy} onClick={() => img && onSubmit(img, note)}>{busy ? "Bulbu is reading it…" : "Add Activity"}</button>
    </div>
  );
}

/** Keep uploads small: the model reads a 1400px image as well as the 4K original. */
function downscale(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.86)); URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
