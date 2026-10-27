/** Liquid-neon visuals: glowing cyan → electric blue → violet strokes with a white-hot core, soft bloom and glints. */
import { useId, type ReactNode } from "react";

const STOPS = [["0", "#2FD3F5"], ["0.35", "#3D7BFF"], ["0.68", "#5B5CFF"], ["0.92", "#A35CFF"], ["1", "#F27BD8"]] as const;
const Stops = () => <>{STOPS.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}</>;

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Molten neon line chart. `points` are values on [0, max]; y-axis shows `ticks`. */
export function LiquidLine({ points, labels, max, min = 0, ticks, highlight, height = 150 }: { points: number[]; labels: string[]; max: number; min?: number; ticks?: number[]; highlight?: string; height?: number }) {
  const id = useId().replace(/:/g, "");
  const W = 320, H = height, L = ticks ? 30 : 10, R = 14, T = 18, B = 22;
  const top = Math.max(max, ...points, 1);
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, points.length - 1);
  const y = (v: number) => T + (1 - (v - min) / Math.max(1e-6, top - min)) * (H - T - B);
  const pts = points.map((p, i) => [x(i), y(p)] as [number, number]);
  const d = smooth(pts), last = pts[pts.length - 1];
  const glints = pts.filter((_, i) => i > 0 && i < pts.length - 1 && i % 2 === 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Progress chart">
      <defs>
        <linearGradient id={`s${id}`} x1="0" x2="1" y1="0" y2="0"><Stops /></linearGradient>
        <linearGradient id={`a${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7B6BFF" stopOpacity=".28" /><stop offset=".6" stopColor="#5B8CFF" stopOpacity=".08" /><stop offset="1" stopColor="#5B8CFF" stopOpacity="0" /></linearGradient>
        <filter id={`g${id}`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
        <filter id={`k${id}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" /></filter>
        <linearGradient id={`p${id}`} x1="0" x2="1"><stop offset="0" stopColor="#A8F0C8" /><stop offset="1" stopColor="#6FDBA0" /></linearGradient>
      </defs>
      {ticks?.map(t => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#E3E8F8" strokeWidth="1" strokeDasharray="2 4" /><text x={L - 8} y={y(t) + 3.5} textAnchor="end" className="chart-label">{t}</text></g>)}
      <path d={`${d}L${last[0]},${H - B}L${pts[0][0]},${H - B}Z`} fill={`url(#a${id})`} />
      <path d={d} fill="none" stroke={`url(#s${id})`} strokeWidth="11" strokeLinecap="round" opacity=".45" filter={`url(#g${id})`} />
      <path d={d} fill="none" stroke={`url(#s${id})`} strokeWidth="4.5" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity=".85" />
      {glints.map(([gx, gy], i) => <circle key={i} cx={gx} cy={gy} r="2.6" fill="#fff" filter={`url(#k${id})`} />)}
      <circle cx={last[0]} cy={last[1]} r="9" fill="#8B5CFF" opacity=".25" filter={`url(#k${id})`} />
      <circle cx={last[0]} cy={last[1]} r="5" fill="#fff" stroke="#7B5CFF" strokeWidth="2.5" />
      {labels.map((l, i) => <text key={i} x={x(i)} y={H - 4} textAnchor="middle" className="chart-label">{l}</text>)}
      {highlight && <g transform={`translate(${Math.min(last[0], W - 26)},${last[1] - 20})`}><rect x="-22" y="-12" width="44" height="21" rx="9" fill={`url(#p${id})`} /><text y="3" textAnchor="middle" fill="#0F4D33" fontSize="10.5" fontWeight="700">{highlight}</text></g>}
    </svg>
  );
}

/** Circular timer ring with a flowing liquid gradient. `value` 0–100 is the lit portion. */
export function LiquidRing({ value, children }: { value: number; children?: ReactNode }) {
  const p = `${Math.max(0, Math.min(100, value)) * 3.6}deg`;
  const grad = `conic-gradient(from 0deg, #2FD3F5, #3D7BFF 25%, #6A5CFF 50%, #B45CFF 70%, #F27BD8 82%, #2FD3F5)`;
  const lit = { background: grad, WebkitMaskImage: `conic-gradient(#000 ${p}, transparent 0)`, maskImage: `conic-gradient(#000 ${p}, transparent 0)` };
  return (
    <div className="ring">
      <div className="lq-ring">
        <div className="track" />
        <div className="spin" style={{ animationPlayState: "running" }}>
          <div className="bloom" style={{ background: grad }} />
        </div>
        <div className="shape"><div className="fill" style={lit} /></div>
        <div className="core" style={{ ["--p" as string]: p }} />
      </div>
      <div className="ring-in">{children}</div>
    </div>
  );
}

/** Donut with glowing gradient segments, rounded ends and small gaps. */
export function GlowDonut({ parts, center, sub }: { parts: { value: number; color: [string, string] }[]; center: string; sub: string }) {
  const id = useId().replace(/:/g, "");
  const total = parts.reduce((s, p) => s + p.value, 0) || 1, r = 42, c = 2 * Math.PI * r, gap = 5;
  let off = 0;
  return (
    <svg viewBox="0 0 110 110" className="donut" role="img" aria-label={`${center} ${sub}`}>
      <defs>
        {parts.map((p, i) => <linearGradient key={i} id={`d${id}${i}`} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor={p.color[0]} /><stop offset="1" stopColor={p.color[1]} /></linearGradient>)}
        <filter id={`b${id}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.5" /></filter>
      </defs>
      <circle cx="55" cy="55" r={r} fill="none" stroke="#EEF1FB" strokeWidth="13" />
      {parts.map((p, i) => {
        const len = (p.value / total) * c; const dash = Math.max(0.1, len - gap);
        const el = (
          <g key={i} transform="rotate(-90 55 55)">
            <circle cx="55" cy="55" r={r} fill="none" stroke={`url(#d${id}${i})`} strokeWidth="13" strokeDasharray={`${dash} ${c}`} strokeDashoffset={-off} strokeLinecap="round" opacity=".45" filter={`url(#b${id})`} />
            <circle cx="55" cy="55" r={r} fill="none" stroke={`url(#d${id}${i})`} strokeWidth="13" strokeDasharray={`${dash} ${c}`} strokeDashoffset={-off} strokeLinecap="round" />
          </g>
        );
        off += len; return el;
      })}
      <text x="55" y="56" textAnchor="middle" className="donut-c">{center}</text>
      <text x="55" y="71" textAnchor="middle" className="donut-s">{sub}</text>
    </svg>
  );
}
