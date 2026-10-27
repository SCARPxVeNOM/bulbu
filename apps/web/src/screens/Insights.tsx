import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fmtDays, fmtMinutes, fmtMoney } from "@bulbu/engine";
import { api, type Insights } from "../api";
import { Icon } from "../components/Icon";
import { Bars, Header, Screen, Seg, dayLabel, fmtDate } from "../components/ui";
import { GlowDonut } from "../components/liquid";
import { useStore } from "../store";

const COLORS: Record<string, string> = { study: "#3D5BFF", social: "#EC4F8A", workout: "#F5B324", read: "#2FC7E0", other: "#9B7BFF" };
const GRAD: Record<string, [string, string]> = { study: ["#6C8BFF", "#3D5BFF"], social: ["#FF9AC6", "#EC4F8A"], workout: ["#FFD66B", "#F5A524"], read: ["#7EE6F5", "#2FC7E0"], other: ["#C6B2FF", "#8B63FF"] };
const hrs = (m: number) => `${(m / 60).toFixed(1)}h`;

export function InsightsScreen() {
  const { state } = useStore();
  const [range, setRange] = useState<"7" | "30" | "90">("7");
  const [data, setData] = useState<Insights | null>(state?.week ?? null);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { api.insights(Number(range)).then(setData).catch(() => {}); }, [range, state?.now]);
  if (!state || !data) return null;
  const w = data;
  const total = w.breakdown.reduce((s, b) => s + b.minutes, 0);
  const pct = (v: number | null) => v == null ? "—" : `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`;
  const bars = range === "7" ? w.daily.map(d => ({ label: dayLabel(d.day), a: d.productive, b: d.social }))
    : chunk(w.daily, range === "30" ? 5 : 15).map(c => ({ label: fmtDate(c[0].day, { day: "numeric", month: "short" }).replace(" ", " "), a: avg(c.map(d => d.productive)), b: avg(c.map(d => d.social)) }));
  const lines = (showAll ? [w.good, w.distracting] : [w.good.slice(0, 3), w.distracting.slice(0, 3)]);

  return (
    <Screen tabs>
      <Header large title="Insights" right={<Link to="/memory" className="icon-btn soft" aria-label="What Bulbu noticed"><Icon name="target" size={19} /></Link>} />
      <Seg soft value={range} onChange={setRange} options={[["7", "This Week"], ["30", "This Month"], ["90", "All Time"]]} />
      <div className="row" style={{ gap: 12 }}>
        <div className="card tight grow row"><RoundIco up={(w.productiveChange ?? 0) >= 0} good={(w.productiveChange ?? 0) >= 0} /><div><b style={{ fontSize: 18 }} className={(w.productiveChange ?? 0) >= 0 ? "green" : "red"}>{pct(w.productiveChange)}</b><p className="muted tiny">Productive time vs last {range === "7" ? "week" : "period"}</p></div></div>
        <div className="card tight grow row"><RoundIco up={(w.socialChange ?? 0) > 0} good={(w.socialChange ?? 0) <= 0} /><div><b style={{ fontSize: 18 }} className={(w.socialChange ?? 0) > 0 ? "red" : "green"}>{pct(w.socialChange)}</b><p className="muted tiny">Social media time</p></div></div>
      </div>

      <section className="card">
        <div className="card-title" style={{ marginBottom: 10 }}>Time Breakdown</div>
        <div className="row" style={{ gap: 16 }}>
          <GlowDonut parts={w.breakdown.filter(b => b.minutes > 0).map(b => ({ value: b.minutes, color: GRAD[b.key] ?? GRAD.other }))} center={hrs(total)} sub="Total" />
          <div className="legend">{w.breakdown.map(b => <div key={b.key}><i style={{ background: COLORS[b.key] }} />{b.label}<b>{hrs(b.minutes)}</b></div>)}</div>
        </div>
      </section>


      <section className="card">
        <div className="card-head"><span className="card-title">Activity Impact</span><button className="link" onClick={() => setShowAll(v => !v)}>{showAll ? "Less" : "See all"}</button></div>
        <div className="list">
          <div className="li"><span className="tile" style={{ width: 30, height: 30, borderRadius: 9, background: "var(--green-soft)", color: "var(--green)" }}><Icon name="up" size={16} stroke={2.6} /></span><span className="grow" style={{ fontWeight: 600 }}>Good choices</span><b className="green">{fmtDays(-w.goodDays).replace("-", "+")}</b></div>
          <div className="li"><span className="tile" style={{ width: 30, height: 30, borderRadius: 9, background: "var(--red-soft)", color: "var(--red)" }}><Icon name="down" size={16} stroke={2.6} /></span><span className="grow" style={{ fontWeight: 600 }}>Distracting choices</span><b className="red">{fmtDays(w.distractingDays)}</b></div>
          <div className="li"><span className="tile" style={{ width: 30, height: 30, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)" }}><Icon name="right" size={16} stroke={2.6} /></span><span className="grow" style={{ fontWeight: 600 }}>Net impact</span><b style={{ color: "var(--primary)" }}>{Math.abs(w.netDays) < 0.05 ? "no change" : w.netDays < 0 ? fmtDays(w.netDays) : fmtDays(w.netDays)}</b></div>
        </div>
        {lines[0].length > 0 && <><p className="small mt" style={{ fontWeight: 700 }}>Good choices</p>{lines[0].map(l => <Line key={l.activityId + l.goalTitle} l={l} />)}</>}
        {lines[1].length > 0 && <><p className="small mt" style={{ fontWeight: 700 }}>Distracting choices</p>{lines[1].map(l => <Line key={l.activityId + l.goalTitle} l={l} />)}</>}
        {w.spend > 0 && <p className="muted small mt">Spent {fmtMoney(w.spend)} on food and shopping in this period.</p>}
      </section>

      <section className="card">
        <div className="card-head"><span className="card-title">{range === "7" ? "Daily" : "Average day"}</span><span className="row tiny muted" style={{ gap: 10 }}><span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: "#3D5BFF" }} /> Productive</span><span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: "#F2A6BE" }} /> Social</span></span></div>
        <Bars data={bars} />
      </section>

      {state.patterns.length > 0 && (
        <section className="card">
          <div className="card-head"><span className="card-title">Bulbu noticed</span><Link className="link" to="/memory">Memory</Link></div>
          <div className="list">{state.patterns.map(p => (
            <div className="li" key={p.id} style={{ alignItems: "flex-start" }}><span style={{ fontSize: 20 }}>🔎</span><span className="grow"><b>{p.text}</b><br /><span className="muted small">{p.detail}</span></span></div>
          ))}</div>
          <p className="muted tiny mt">Patterns are tendencies in your own history, not proven causes.</p>
        </section>
      )}

      <section className="card row">
        <Icon name="clock" />
        <p className="small grow">Productive {fmtMinutes(w.productiveMinutes)} · Social media {fmtMinutes(w.socialMinutes)}</p>
      </section>
    </Screen>
  );
}

function Line({ l }: { l: Insights["good"][number] }) {
  return (
    <div className="row between small" style={{ padding: "5px 0" }}>
      <span className="grow" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.label} <span className="muted">· {l.goalTitle}</span></span>
      <b className={l.days < 0 ? "green" : "red"}>{l.days < 0 ? fmtDays(l.days).replace("-", "−") : fmtDays(l.days)}</b>
    </div>
  );
}

const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);

function RoundIco({ up, good }: { up: boolean; good: boolean }) {
  return <span className="tile" style={{ width: 38, height: 38, borderRadius: "50%", background: good ? "var(--green-soft)" : "var(--red-soft)", color: good ? "var(--green)" : "var(--red)" }}><Icon name={up ? "up" : "down"} size={19} stroke={2.6} /></span>;
}
