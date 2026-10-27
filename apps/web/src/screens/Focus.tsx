import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fmtDays } from "@bulbu/engine";
import { api, type LogResult } from "../api";
import { Bulbu } from "../bulbu/Bulbu";
import { Icon } from "../components/Icon";
import { Screen } from "../components/ui";
import { LiquidRing } from "../components/liquid";
import { useStore } from "../store";

type Mode = "focus" | "short" | "long";
const LEN: Record<Mode, number> = { focus: 25, short: 5, long: 15 };
const LABEL: Record<Mode, string> = { focus: "Focus Session", short: "Short Break", long: "Long Break" };

export function Focus() {
  const { state, setReaction, refresh, setLastLog } = useStore();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const focusable = (state?.goals ?? []).filter(g => g.kind !== "savings");
  const [goalId, setGoalId] = useState(params.get("goal") ?? focusable.find(g => g.primary)?.id ?? focusable[0]?.id);
  const [mode, setMode] = useState<Mode>("focus");
  const [endAt, setEndAt] = useState<number | null>(null);
  const [left, setLeft] = useState(LEN.focus * 60);
  const [result, setResult] = useState<LogResult | null>(null);
  const [cue, setCue] = useState(0);
  const started = useRef<number>(0);

  // the timer runs on a timestamp, so it stays right if the tab sleeps
  useEffect(() => {
    if (!endAt) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((endAt - Date.now()) / 1000)); setLeft(s);
      if (s === 0) { clearInterval(t); finish(true); }
    }, 250);
    return () => clearInterval(t);
  }, [endAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (m: Mode) => { if (endAt) return; setMode(m); setLeft(LEN[m] * 60); setResult(null); };
  const start = () => {
    setResult(null); started.current = Date.now(); setEndAt(Date.now() + left * 1000);
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
  };
  async function finish(complete: boolean) {
    const mins = Math.round((Date.now() - started.current) / 60000);
    setEndAt(null);
    if (mode !== "focus") { setLeft(LEN.focus * 60); setMode("focus"); notify("Break's over. Ready for another round?"); return; }
    setLeft(LEN.focus * 60);
    if (mins < 5) return;   // too short to count
    const g = state?.goals.find(g => g.id === goalId);
    const r = await api.log({ quick: { category: "focus", minutes: mins, goalId, label: `${complete ? "Focus session" : "Focus session (ended early)"}${g ? ` · ${g.title}` : ""}` }, source: "focus" });
    setResult(r); setReaction(r.bulbu); setLastLog(r); setCue(c => c + 1); refresh();
    if (complete) notify(`25 minutes done! ${r.impacts[0] ? `${fmtDays(r.impacts[0].days).slice(1)} closer to ${r.impacts[0].goalTitle}.` : ""}`);
  }

  const total = LEN[mode] * 60, frac = 1 - left / total;
  const running = !!endAt;
  const emote = result ? result.bulbu.emote : running ? (mode === "focus" ? "focused" : "happy") : "happy";

  return (
    <Screen className="focus-screen">
      <div className="hdr">
        <div className="hdr-row">
          <button className="icon-btn soft" aria-label="Back" onClick={() => nav(-1)} style={{ color: "var(--primary)" }}><Icon name="music" size={19} /></button>
          <h1 className="hdr-title">Focus Mode</h1>
          <span className="hdr-right"><button className="icon-btn soft" aria-label="Settings" style={{ color: "var(--primary)" }} onClick={() => nav("/profile")}><Icon name="settings" size={19} /></button></span>
        </div>
        <p className="hdr-sub">Stay present. Bulbu is with you.</p>
      </div>
      {focusable.length > 1 && !running && (
        <div className="chips" style={{ justifyContent: "center" }}>
          {focusable.map(g => <button key={g.id} className="chip" style={g.id === goalId ? { background: "var(--primary-soft)", color: "var(--primary)", borderColor: "transparent" } : {}} onClick={() => setGoalId(g.id)}>{g.title}</button>)}
        </div>
      )}
      <LiquidRing value={running ? (1 - frac) * 100 : 100}>
        <div className="ring-time">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</div><div className="muted" style={{ fontWeight: 500 }}>{LABEL[mode]}</div>
      </LiquidRing>

      <div className="hero" style={{ height: 210, background: "transparent", boxShadow: "none" }}>
        <Bulbu emote={emote} animation={result ? result.bulbu.animation : undefined} cue={cue} glow={result?.bulbu.glow ?? 1} outfit={state?.user.outfit} view="hero"
               background="#E9E8FF" line={result ? result.bulbu.line : running && mode === "focus" ? "I'm right here with you." : null} className="focus-stage" />
        <style>{`.focus-stage { position: absolute; inset: 0; border-radius: 24px; -webkit-mask: radial-gradient(75% 80% at 50% 55%, #000 55%, transparent 100%); mask: radial-gradient(75% 80% at 50% 55%, #000 55%, transparent 100%); }`}</style>
      </div>

      {result && result.impacts[0] && (
        <button className="card tight row" style={{ width: "100%", textAlign: "left" }} onClick={() => nav("/impact")}>
          <span style={{ fontSize: 24 }}>🎉</span><span className="grow"><b className="green">{fmtDays(result.impacts[0].days).slice(1)} closer</b> to {result.impacts[0].goalTitle}<br /><span className="muted tiny">Tap to see the math</span></span><Icon name="right" />
        </button>
      )}

      {running
        ? <button className="btn ghost" onClick={() => finish(false)}><Icon name="pause" size={16} /> {mode === "focus" ? "End session" : "Skip break"}</button>
        : <button className="btn" onClick={start}><Icon name="play" size={16} /> Start {mode === "focus" ? "Focus" : "Break"}</button>}
      <div className="modes">
        {(["focus", "short", "long"] as Mode[]).map(m => (
          <button key={m} onClick={() => pick(m)} className={mode === m ? "on" : ""} style={{ opacity: running && mode !== m ? .4 : 1 }}>
            <Icon name={m === "focus" ? "clock" : m === "short" ? "coffee" : "moon"} size={22} /><span>{m === "focus" ? "Focus" : m === "short" ? "Short Break" : "Long Break"}</span>
          </button>
        ))}
      </div>
    </Screen>
  );
}

function notify(body: string) {
  try { if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") new Notification("Bulbu", { body, icon: "/bulbu.svg" }); } catch { /* not supported */ }
}
