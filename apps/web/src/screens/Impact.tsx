import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { fmtDays, fmtMinutes, fmtMoney, type Impact } from "@bulbu/engine";
import { api, type Activity } from "../api";
import { Bulbu } from "../bulbu/Bulbu";
import { CAT, Icon, Tile } from "../components/Icon";
import { Breakdown, Header, Screen, Sheet, fmtDate, whenLabel } from "../components/ui";
import { useStore } from "../store";
import { useStage } from "../theme";
import { Beam, Days, Reveal, celebrate } from "../components/fx";

/** "2h on Instagram", never "2h Reels" unless the user said Reels: usage data is per app. */
export function activityTitle(a: Activity) {
  if (a.category === "social_media") return a.label === "Reels" ? `${fmtMinutes(a.minutes ?? 0)} of Reels` : `${fmtMinutes(a.minutes ?? 0)} on ${a.app ?? a.label}`;
  if ((a.category === "eat" || a.category === "spend") && a.amount && !a.label.includes("₹")) return `${a.label} · ${fmtMoney(a.amount)}`;
  return a.label;
}
const sourceLabel: Record<string, string> = { quick: "Quick log", text: "Typed", voice: "Voice", screenshot: "Screenshot", photo: "Photo", device: "Usage access", focus: "Focus Mode", seed: "History" };

export function ImpactScreen() {
  const { lastLog: r, state, setLastLog, refresh, toast, setReaction } = useStore();
  const nav = useNavigate();
  const stage = useStage();
  const [why, setWhy] = useState<Impact | null>(null);
  const big = useRef<HTMLDivElement>(null);
  const good = !!r && r.impacts.some(i => i.days < -0.04) && !r.impacts.some(i => i.days > 0.04);
  useEffect(() => { if (good) celebrate(big.current); }, [r, good]);
  if (!r || !state) return <Navigate to="/home" replace />;

  const main = [...r.impacts].sort((a, b) => Math.abs(b.days) - Math.abs(a.days))[0];
  const rest = r.impacts.filter(i => i !== main);
  const moved = main && r.forecasts.find(f => f.goalId === main.goalId);
  const late = main && main.days > 0.04;
  const a0 = r.activities[0];

  const doSwap = async () => {
    const s = r.swap!; const c = s.activity.category;
    if (["code", "study", "focus", "read"].includes(c)) { nav(`/focus?goal=${s.goalId}`); return; }
    const res = await api.log({ quick: { category: c, minutes: s.activity.minutes, units: s.activity.units, amount: s.activity.amount, label: s.title, goalId: s.goalId } });
    setLastLog(res); setReaction(res.bulbu); refresh();
  };
  const undo = async () => {
    await Promise.all(r.activities.map(a => api.undo(a.id)));
    setLastLog(null); setReaction(null); await refresh(); toast("Removed"); nav("/home");
  };

  return (
    <Screen>
      <Header back="/home" title="Activity Impact" subtitle="See how your choices move you towards or away from your goals." />

      {r.activities.map(a => (
        <div key={a.id} className="card tight row" style={late && a === a0 ? { background: "linear-gradient(180deg,#fff,#FFF3F5)" } : {}}>
          <Tile icon={CAT[a.category]?.icon ?? "dots"} color={CAT[a.category]?.color ?? "#7C8CFF"} size={46} />
          <div className="grow"><b style={{ fontSize: 17 }}>{activityTitle(a)}</b><p className="muted small">{a.app ?? CAT[a.category]?.label} · {whenLabel(a.at)}</p></div>
        </div>
      ))}

      {main ? (
        <button className={`impact-delay ${late ? "" : "good"}`} style={{ border: 0, textAlign: "left", width: "100%" }} onClick={() => setWhy(main)}>
          <div className="row between"><span className="row" style={{ color: late ? "var(--red)" : "var(--green)", fontWeight: 700 }}><Icon name="clock" /> {late ? "Estimated goal delay" : "Goal moved closer"}</span><Icon name="info" style={{ color: "var(--ink-2)" }} /></div>
          <div ref={big} className={`impact-big ${late ? "red" : "green"}`}><Days days={main.days} closer={!late} /></div>
          <Reveal as="p" className="muted" delay={0.25}>{`${main.equivalent}${late ? "." : ` for ${main.goalTitle}.`}`}</Reveal>
          {moved && moved.before.eta !== moved.after.eta && <p className="small" style={{ fontWeight: 600 }}>{main.goalTitle}: {fmtDate(moved.before.eta)} → {fmtDate(moved.after.eta)}</p>}
          <span className="muted tiny">Tap to see the math</span>
        </button>
      ) : (
        <div className="card"><b>Logged!</b><p className="muted small">This doesn't move any of your goals directly{r.activities.some(a => a.category === "eat" && !a.amount) ? ". Add how much it cost and Bulbu can tell you what it means for your savings." : ", but Bulbu will use it to spot patterns (like sleep and focus)."}</p></div>
      )}

      {rest.map(i => (
        <button key={i.goalId + i.activityId} className="card tight row" style={{ textAlign: "left", width: "100%" }} onClick={() => setWhy(i)}>
          <span className="grow"><b>{i.goalTitle}</b><br /><span className="muted small">{i.equivalent}</span></span>
          <b className={i.days > 0 ? "red" : "green"}><Days days={i.days} closer={i.days < 0} /></b>
        </button>
      ))}

      {r.swap && late && (
        <button className="card swap" onClick={doSwap}>
          <Beam />
          <span style={{ fontSize: 30 }}>💡</span>
          <span className="grow"><b>Try this instead?</b><br /><b style={{ color: "var(--primary)" }}>{r.swap.title}</b><br /><span className="muted small">{r.swap.detail}</span></span>
          <Icon name="right" />
        </button>
      )}

      {r.questions.length > 0 && (
        <div className="card tight" style={{ background: "var(--primary-soft)", boxShadow: "none" }}>
          <b className="small">Bulbu wants to know</b>
          {r.questions.map(q => <p key={q} className="small">• {q}</p>)}
          <button className="link mt" onClick={() => nav("/log")}>Answer in the log</button>
        </div>
      )}

      <div className="hero" style={{ height: 250, marginTop: "auto" }}>
        <Bulbu emote={r.bulbu.emote} animation={r.bulbu.animation === "Idle" ? undefined : r.bulbu.animation} cue={r} glow={r.bulbu.glow}
               outfit={state.user.outfit} view="hero" background={stage} line={r.bulbu.line} className="impact-stage" />
        <style>{`.impact-stage { position: absolute; inset: 0; }`}</style>
      </div>
      <p className="muted tiny center">{r.via === "spark" ? "Read by Muse Spark" : r.via === "offline" ? "Understood offline" : sourceLabel[a0?.source] ?? ""}{r.bulbu.via === "spark" ? " · Bulbu's reaction by Muse Spark" : ""} · numbers by Bulbu's forecasting engine</p>
      <div className="row"><button className="btn ghost" onClick={undo}>Undo</button><button className="btn" onClick={() => nav("/home")}>Done</button></div>

      <Sheet open={!!why} onClose={() => setWhy(null)} title={why ? `${why.goalTitle}: ${why.days > 0 ? fmtDays(why.days) : fmtDays(why.days).slice(1) + " closer"}` : ""}>
        {why && <Breakdown steps={why.breakdown} />}
      </Sheet>
    </Screen>
  );
}
