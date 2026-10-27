import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Icon } from "./Icon";
import type { Step } from "../api";
import { useStore } from "../store";
import { SlideSeg } from "./fx";
import { LiquidProgressBar, type LiquidScheme } from "./LiquidProgressBar";

// ------------------------------------------------------------------ layout

export function Header({ title, subtitle, back = true, right, large = false }: { title?: ReactNode; subtitle?: ReactNode; back?: boolean | string; right?: ReactNode; large?: boolean }) {
  const nav = useNavigate();
  return (
    <header className={`hdr ${large ? "large" : ""}`}>
      <div className="hdr-row">
        {large ? null : back ? <button className="icon-btn" aria-label="Back" onClick={() => typeof back === "string" ? nav(back) : history.length > 1 ? nav(-1) : nav("/")}><Icon name="back" /></button> : <span />}
        {title && <h1 className="hdr-title">{title}</h1>}
        <span className="hdr-right">{right}</span>
      </div>
      {subtitle && <p className="hdr-sub">{subtitle}</p>}
    </header>
  );
}

export function Screen({ children, className = "", tabs = false }: { children: ReactNode; className?: string; tabs?: boolean }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return <main className={`screen ${tabs ? "with-tabs" : ""} ${className}`}>{children}{tabs && <TabBar />}</main>;
}

export function TabBar() {
  return <BottomNav />;
}

export function Seg<T extends string>({ value, options, onChange, soft = false }: { value: T; options: [T, string][]; onChange: (v: T) => void; soft?: boolean }) {
  return <SlideSeg value={value} options={options} onChange={onChange} soft={soft} />;
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head"><h2>{title}</h2><button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="x" /></button></div>
        {children}
      </div>
    </div>
  );
}

/** Tap-to-see-why: every number Bulbu shows opens its calculation. */
export function Breakdown({ steps, note }: { steps: Step[]; note?: string }) {
  return (
    <div className="breakdown">
      <ol>{steps.map((s, i) => <li key={i}><span>{s.label}</span><b>{s.value}</b></li>)}</ol>
      <p className="muted small">{note ?? "Computed by Bulbu's forecasting engine from your own history. No guesses: the language model only explains these numbers."}</p>
    </div>
  );
}

export function Toast() {
  const { toastText } = useStore();
  return toastText ? <div className="toast" role="status">{toastText}</div> : null;
}

// ------------------------------------------------------------------ data display

/** Every progress bar in the app is the jelly bar. */
export function Progress({ value, scheme = "dsa", height = 16, label = "Progress" }: { value: number; scheme?: LiquidScheme; height?: number; label?: string }) {
  return <LiquidProgressBar value={value} colorScheme={scheme} height={height} ariaLabel={label} />;
}

export function LineChart({ points, labels, height = 120, highlight }: { points: number[]; labels: string[]; height?: number; highlight?: string }) {
  // zoom to the data so a week of progress is visible (a 2% week is still a slope)
  const w = 300, h = height, pad = 14, max = Math.max(...points) + 1, min = Math.max(0, Math.min(...points) - 1);
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
  const y = (v: number) => h - 22 - ((v - min) / Math.max(1, max - min)) * (h - 44);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join("");
  const last = points.length - 1;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="Weekly progress">
      <defs><linearGradient id="lf" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#3D5BFF" stopOpacity=".22" /><stop offset="1" stopColor="#3D5BFF" stopOpacity="0" /></linearGradient></defs>
      <path d={`${d}L${x(last)},${h - 22}L${x(0)},${h - 22}Z`} fill="url(#lf)" />
      <path d={d} fill="none" stroke="#3D5BFF" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p)} r={i === last ? 5 : 3.5} fill="#fff" stroke="#3D5BFF" strokeWidth="2" />)}
      {labels.map((l, i) => <text key={i} x={x(i)} y={h - 4} textAnchor="middle" className="chart-label">{l}</text>)}
      {highlight && <g transform={`translate(${Math.min(x(last), w - 24)},${y(points[last]) - 16})`}><rect x="-22" y="-12" width="44" height="20" rx="8" fill="#3D5BFF" /><text y="2.5" textAnchor="middle" fill="#fff" fontSize="10.5" fontWeight="700">{highlight}</text></g>}
    </svg>
  );
}

export function Donut({ parts, center, sub }: { parts: { value: number; color: string }[]; center: string; sub: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1, r = 42, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg viewBox="0 0 110 110" className="donut" role="img" aria-label={`${center} ${sub}`}>
      <circle cx="55" cy="55" r={r} fill="none" stroke="#EEF1FB" strokeWidth="14" />
      {parts.map((p, i) => { const len = (p.value / total) * c; const el = <circle key={i} cx="55" cy="55" r={r} fill="none" stroke={p.color} strokeWidth="14" strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-off} transform="rotate(-90 55 55)" />; off += len; return el; })}
      <text x="55" y="54" textAnchor="middle" className="donut-c">{center}</text>
      <text x="55" y="70" textAnchor="middle" className="donut-s">{sub}</text>
    </svg>
  );
}

export function Bars({ data, height = 110 }: { data: { label: string; a: number; b: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map(d => Math.max(d.a, d.b)));
  return (
    <div className="bars" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="bar-col" title={`${d.label}: ${Math.round(d.a)} min productive, ${Math.round(d.b)} min social`}>
          <div className="bar-pair"><i style={{ height: `${(d.a / max) * 100}%` }} className="a" /><i style={{ height: `${(d.b / max) * 100}%` }} className="b" /></div>
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ formatting

export const fmtDate = (iso: string | null | undefined, o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  iso ? new Date(iso.length === 10 ? iso + "T12:00" : iso).toLocaleDateString("en-IN", o) : "—";
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
export const dayLabel = (iso: string) => new Date(iso + "T12:00").toLocaleDateString("en-IN", { weekday: "short" });
export function whenLabel(iso: string) {
  const d = new Date(iso), now = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const y = new Date(now); y.setDate(y.getDate() - 1);
  return `${same(d, now) ? "Today" : same(d, y) ? "Yesterday" : fmtDate(iso)}, ${fmtTime(iso)}`;
}
export function greeting() { const h = new Date().getHours(); return h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
