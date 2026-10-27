import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fmtDays, fmtMoney, fmtNum, type Step } from "@bulbu/engine";
import { api, type GoalTemplate, type GoalView, type WhatIf } from "../api";
import { Icon, Tile, TEMPLATE_ICON } from "../components/Icon";
import { Breakdown, Header, Progress, Screen, Seg, Sheet, dayLabel, fmtDate } from "../components/ui";
import { LiquidLine } from "../components/liquid";
import { GlossyIcon } from "../components/GlossyIcon";
import { useStore } from "../store";
import { GoalRow, TASK_LOG, schemeFor } from "./Home";
import NumberFlow from "@number-flow/react";
import { Num, celebrate } from "../components/fx";

const TEMPLATES: [GoalTemplate, string][] = [["dsa", "DSA / Coding"], ["fitness", "Fitness"], ["learning", "Learning"], ["savings", "Savings"], ["iphone", "iPhone"], ["reading", "Reading"], ["productivity", "Productivity"], ["custom", "Custom"]];

export function Goals() {
  const { state, refresh, toast } = useStore();
  const [adding, setAdding] = useState(false);
  const [t, setT] = useState<GoalTemplate>("dsa");
  const [title, setTitle] = useState(""), [target, setTarget] = useState(""), [base, setBase] = useState("");
  if (!state) return null;
  const add = async () => {
    await api.addGoal({ template: t, title: title || undefined, target: Number(target) || undefined, baseline: Number(base) || 0 });
    setAdding(false); setTitle(""); setTarget(""); setBase(""); await refresh(); toast("Goal added");
  };
  return (
    <Screen tabs>
      <Header back={false} title="Your Goals" right={<button className="icon-btn soft" aria-label="Add goal" onClick={() => setAdding(true)}><Icon name="plus" /></button>} />
      {state.goals.map(g => <div className="card" key={g.id}><GoalRow g={g} /></div>)}
      {!state.goals.length && <div className="card center"><p className="muted">No goals yet.</p><button className="btn mt" onClick={() => setAdding(true)}>Add a goal</button></div>}
      <Sheet open={adding} onClose={() => setAdding(false)} title="New goal">
        <div className="stack">
          <div className="goal-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {TEMPLATES.map(([k, l]) => <button key={k} className="cat" aria-pressed={t === k} onClick={() => setT(k)}><Tile {...TEMPLATE_ICON[k]} size={36} />{l.split(" ")[0]}</button>)}
          </div>
          <label className="field">Name (optional)<input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={TEMPLATES.find(x => x[0] === t)![1]} /></label>
          <div className="row">
            <label className="field grow">Target<input className="input" type="number" inputMode="numeric" value={target} onChange={e => setTarget(e.target.value)} placeholder="default" /></label>
            <label className="field grow">Done so far<input className="input" type="number" inputMode="numeric" value={base} onChange={e => setBase(e.target.value)} placeholder="0" /></label>
          </div>
          <button className="btn" onClick={add}>Add goal</button>
        </div>
      </Sheet>
    </Screen>
  );
}

const EXTRAS: Record<string, string[]> = {
  dsa: ["Revise a previous problem", "Watch 1 lecture (optional)"], reading: ["Note one idea you liked"], fitness: ["Stretch for 5 min"],
  savings: ["Skip one delivery order"], iphone: ["Skip one delivery order"], learning: ["Review yesterday's notes"], productivity: ["Plan tomorrow's first task"], custom: [],
};

const money = (g: GoalView) => g.kind === "savings";
export const fmtUnits = (g: GoalView, n: number) => money(g) ? fmtMoney(n) : `${fmtNum(n)} ${g.unit}`;

export function paceSteps(g: GoalView): Step[] {
  const f = g.forecast, p = f.pace;
  const s: Step[] = [
    { label: "Progress", value: `${fmtUnits(g, f.progress)} of ${fmtUnits(g, g.target)}` },
    { label: "Remaining", value: fmtUnits(g, f.remaining) },
    { label: "Your pace", value: `${fmtUnits(g, p.perDay)} a day${p.basedOnDays >= 7 ? ` (your last ${p.basedOnDays} days)` : " (starting estimate, blends in your history over the first week)"}` },
  ];
  if (g.kind === "skill") s.push({ label: "Per focused hour", value: fmtUnits(g, p.perHour) });
  const todayCost = f.daysLeft - f.remaining / p.perDay;
  if (Math.abs(todayCost) > 0.05) s.push({ label: "Today's choices", value: fmtDays(todayCost) });
  s.push({ label: "Goal date", value: `${fmtUnits(g, f.remaining)} ÷ ${fmtUnits(g, p.perDay)}${Math.abs(todayCost) > 0.05 ? ` ${fmtDays(todayCost).replace(/^([+-])/, "$1 ")}` : ""} ≈ ${Math.ceil(f.daysLeft)} days → ${fmtDate(f.eta)}` });
  return s;
}

export function GoalDetail() {
  const { id } = useParams();
  const { state, refresh, toast } = useStore();
  const nav = useNavigate();
  const [tab, setTab] = useState<"overview" | "tasks" | "insights">("overview");
  const [why, setWhy] = useState(false);
  const [manage, setManage] = useState(false);
  const [q, setQ] = useState("");
  const [sim, setSim] = useState<WhatIf | null>(null);
  const [simWhy, setSimWhy] = useState(false);
  const g = state?.goals.find(g => g.id === id);
  if (!state || !g) return <Screen><Header title="Goal" /><p className="muted center">This goal doesn't exist anymore.</p></Screen>;
  const f = g.forecast;
  const lines = [...state.week.good, ...state.week.distracting].filter(l => l.goalTitle === g.title).sort((a, b) => b.at.localeCompare(a.at));
  const runSim = async (text: string) => {
    const r = await api.whatIf(text);
    if ("error" in r) { toast(r.error); setSim(null); } else setSim(r);
  };
  const ideas = g.kind === "savings" ? ["What if I cook 3 nights a week?", "Save ₹100 a day"] : g.template === "dsa" ? ["1 hour less Instagram a day", "Solve 2 problems a day"] : g.template === "fitness" ? ["Work out 5 times a week"] : g.template === "reading" ? ["Read 20 pages a day"] : ["30 min less Instagram a day"];
  const start = () => g.kind === "savings" ? nav(`/log?cat=save&goal=${g.id}`) : g.template === "fitness" ? nav(`/log?cat=workout&goal=${g.id}`) : nav(`/focus?goal=${g.id}`);

  return (
    <Screen>
      <Header right={<button className="icon-btn" aria-label="Manage goal" onClick={() => setManage(true)}><Icon name="settings" /></button>} />
      <div className="row" style={{ gap: 12 }}>
        <GlossyIcon name="target" size={50} />
        <div><h1 className="title-l">{g.title}</h1><p className="muted">{g.subtitle}</p></div>
      </div>
      <div className="row" style={{ gap: 14 }}><div className="grow"><Progress value={f.percent} scheme={schemeFor(g)} height={18} label={`${g.title} progress`} /></div><b style={{ fontSize: 17 }}><Num value={Math.round(f.percent)} suffix="%" /></b></div>
      <Seg soft value={tab} onChange={setTab} options={[["overview", "Overview"], ["tasks", "Tasks"], ["insights", "Insights"]]} />

      {tab === "overview" && <>
        <div className="stats">
          <div className="stat"><b><GlossyIcon name="target" size={24} />{money(g) ? fmtMoney(f.progress) : <Num value={Math.round(f.progress)} />}</b><span>{money(g) ? "Saved" : g.template === "dsa" ? "Solved" : "Done"}</span></div>
          <div className="stat"><b><GlossyIcon name={money(g) ? "wallet" : g.template} size={24} />{money(g) ? fmtMoney(f.remaining) : <Num value={Math.round(f.remaining)} />}</b><span>Remaining</span></div>
          <div className="stat"><b><GlossyIcon name="flame" size={24} /><Num value={state.streak} /></b><span>Day streak</span></div>
        </div>
        <section className="card">
          <div className="card-head"><span className="card-title">Progress</span><span className="dropdown">This Week <Icon name="right" size={12} style={{ transform: "rotate(90deg)" }} /></span></div>
          <WeekChart g={g} percent={f.percent} />
          <button className="row muted small" style={{ background: "none", border: 0, padding: "8px 0 0", width: "100%" }} onClick={() => setWhy(true)}>
            <Icon name="clock" size={15} /><span className="grow" style={{ textAlign: "left" }}>{f.done ? "Goal complete 🎉" : <>On pace for <b style={{ color: "var(--ink)" }}>{fmtDate(f.eta, { day: "numeric", month: "long", year: "numeric" })}</b> · {fmtUnits(g, f.pace.perDay)} a day</>}</span><Icon name="info" size={15} />
          </button>
        </section>
        <section className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>Today's Tasks</div>
          <div className="list">
            <button className="li btn-li" onClick={() => !g.task.done && nav(`/log?cat=${TASK_LOG[g.template]}&goal=${g.id}`)}>
              <GlossyIcon name={TASK_LOG[g.template]} size={28} /><span className="grow">{g.task.label}</span>
              <span className={`check ${g.task.done ? "on" : ""}`}>{g.task.done && <Icon name="check" size={14} stroke={3} />}</span>
            </button>
            {EXTRAS[g.template].map(x => <div className="li" key={x}><GlossyIcon name="focus" size={28} /><span className="grow">{x}</span><span className="check" /></div>)}
          </div>
        </section>
        <button className="btn" onClick={start}><Icon name="play" size={16} /> {g.kind === "savings" ? "Put money aside" : "Start Now"}</button>
        <section className="card stack">
          <span className="card-title">What if…?</span>
          <form className="row" onSubmit={e => { e.preventDefault(); if (q.trim()) runSim(q); }}>
            <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder={ideas[0]} />
            <button className="round primary" aria-label="Simulate"><Icon name="send" size={18} /></button>
          </form>
          <div className="chips">{ideas.map(i => <button key={i} className="chip" onClick={() => { setQ(i); runSim(i); }}>{i}</button>)}</div>
          {sim && (
            <button className="card tight" style={{ textAlign: "left", background: sim.daysSooner > 0 ? "var(--green-soft)" : "#fff", boxShadow: "none" }} onClick={() => setSimWhy(true)}>
              <b>{sim.change.label}</b>
              <p className="mt" style={{ marginTop: 4 }}>{sim.goalTitle}: <b>{fmtDate(sim.before.eta)}</b> → <b className="green">{fmtDate(sim.after.eta)}</b></p>
              <p className="green" style={{ fontWeight: 800, fontSize: 20 }}><NumberFlow value={sim.daysSooner} suffix=" days sooner" /></p>
              <span className="muted tiny">Tap to see the math</span>
            </button>
          )}
        </section>
      </>}

      {tab === "tasks" && (
        <section className="card">
          <div className="card-title" style={{ marginBottom: 6 }}>Today's Tasks</div>
          <div className="list">
            <button className="li btn-li" onClick={() => !g.task.done && nav(`/log?cat=${TASK_LOG[g.template]}&goal=${g.id}`)}>
              <span className={`check ${g.task.done ? "on" : ""}`}>{g.task.done && <Icon name="check" size={14} stroke={3} />}</span><span className="grow">{g.task.label}</span>
            </button>
            {EXTRAS[g.template].map(x => <div className="li" key={x}><span className="check" /><span className="grow muted">{x}</span></div>)}
          </div>
          <div className="card tight mt" style={{ background: "var(--primary-soft)", boxShadow: "none" }}>
            <b>Swap idea: {g.swap.title}</b><p className="muted small">{g.swap.detail}</p>
          </div>
        </section>
      )}

      {tab === "insights" && (
        <section className="card">
          <div className="card-title" style={{ marginBottom: 6 }}>This week on {g.title}</div>
          {lines.length ? <div className="list">{lines.map(l => (
            <div className="li" key={l.activityId + l.goalTitle}><span className="grow">{l.label}<br /><span className="muted tiny">{fmtDate(l.at, { weekday: "short", hour: "numeric", minute: "2-digit" })}</span></span>
              <b className={l.days < 0 ? "green" : "red"}>{l.days < 0 ? fmtDays(l.days).replace("-", "") + " closer" : fmtDays(l.days)}</b></div>
          ))}</div> : <p className="muted small">Nothing logged for this goal this week yet.</p>}
        </section>
      )}

      {tab !== "overview" && <button className="btn" style={{ marginTop: "auto" }} onClick={start}><Icon name="play" size={16} /> {g.kind === "savings" ? "Put money aside" : "Start Now"}</button>}

      <Sheet open={why} onClose={() => setWhy(false)} title="How Bulbu got this date"><Breakdown steps={paceSteps(g)} /></Sheet>
      <Sheet open={simWhy && !!sim} onClose={() => setSimWhy(false)} title={sim?.change.label ?? ""}>{sim && <Breakdown steps={sim.steps} />}</Sheet>
      <Sheet open={manage} onClose={() => setManage(false)} title="Manage goal">
        <div className="stack">
          {!g.primary && <button className="btn ghost" onClick={async () => { await api.updateGoal(g.id, { primary: true }); setManage(false); refresh(); toast("Main focus updated"); }}>Make this my main focus</button>}
          <p className="muted small">{g.primary ? "This is your main focus: distractions count against it." : "Distractions count against your main focus goal."}</p>
          <button className="btn danger" onClick={async () => { if (confirm(`Delete “${g.title}”? Your activity history stays.`)) { await api.deleteGoal(g.id); await refresh(); nav("/goals"); } }}><Icon name="trash" size={18} /> Delete goal</button>
        </div>
      </Sheet>
    </Screen>
  );
}

/** The week's progress, zoomed so a few days of work still reads as a climb. */
function WeekChart({ g, percent }: { g: GoalView; percent: number }) {
  const pts = g.series.map(p => (p.percent / 100) * g.target);
  const lo0 = Math.min(...pts), hi0 = Math.max(...pts), span = Math.max(hi0 - lo0, g.target * 0.02, 1);
  const step = niceStep(span * 1.6 / 3);
  const lo = Math.max(0, Math.floor((lo0 - span * 0.5) / step) * step), hi = Math.ceil((hi0 + span * 0.25) / step) * step;
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
  return <LiquidLine points={pts} labels={g.series.map(p => dayLabel(p.day))} min={lo} max={hi} ticks={ticks} highlight={`${Math.round(percent)}%`} height={170} />;
}
function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6)))), n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
