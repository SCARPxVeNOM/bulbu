/**
 * LiquidProgressBar — a glossy "jelly" progress bar.
 *
 * Geometry: a rounded pale-blue track; the fill is a capsule whose width is exactly `value`% of the track.
 * Everything decorative (wave contour, gloss, bubbles, inner shading, glow) lives inside the track and is
 * clipped by the track, so nothing can escape it or affect layout. The only motion is a slow drift of the surface
 * wave and bubbles inside the fill (no periodic shine); the width never animates except when `value` changes.
 */
import { useId, type CSSProperties } from "react";
import "./LiquidProgressBar.css";

export type LiquidScheme = "dsa" | "reading" | "fitness";

/** Gradient stops (left → right), the colour the glow and bubbles pick up, and the deep tone for inner shading. */
export const LIQUID_SCHEMES: Record<LiquidScheme, { stops: string[]; glow: string; deep: string }> = {
  dsa: { stops: ["#43E1F6", "#3C8CFF", "#5A6BFF", "#9A63FF"], glow: "#5B6CFF", deep: "#2B3BC4" },
  reading: { stops: ["#4FE6F2", "#1FD6CB", "#1ED7A6", "#46DE8C"], glow: "#22D3B0", deep: "#0C8F78" },
  fitness: { stops: ["#FFB48C", "#FF7A93", "#F7509D", "#C561FF"], glow: "#FF5FA0", deep: "#C2306D" },
};

export interface LiquidProgressBarProps {
  /** 0–100. Values outside are clamped; NaN reads as 0. */
  value: number;
  colorScheme?: LiquidScheme;
  /** Bar height in px, 12–28. */
  height?: number;
  /** Gentle surface motion (wave drift, bubbles). Also off under prefers-reduced-motion. */
  animated?: boolean;
  ariaLabel?: string;
  className?: string;
}

const WAVE_LENGTH = 2400; // px of wave path; longer than any bar, translated by one period to loop

export function LiquidProgressBar({ value, colorScheme = "dsa", height = 16, animated = true, ariaLabel = "Progress", className = "" }: LiquidProgressBarProps) {
  const id = useId().replace(/:/g, "");
  const v = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const h = Math.min(28, Math.max(12, Math.round(height)));
  const s = LIQUID_SCHEMES[colorScheme] ?? LIQUID_SCHEMES.dsa;

  // Wave contour: a gentle sine just below the top of the liquid. Amplitude stays tiny relative to height.
  const period = h * 4.5, amp = Math.max(0.6, h * 0.045), base = h * 0.34;
  let d = `M0 ${base.toFixed(2)}`;
  for (let x = 0; x < WAVE_LENGTH + period; x += period / 2) {
    const up = (x / (period / 2)) % 2 === 0;
    d += ` Q${(x + period / 4).toFixed(1)} ${(base + (up ? -amp : amp)).toFixed(2)} ${(x + period / 2).toFixed(1)} ${base.toFixed(2)}`;
  }
  const surface = `${d} L${WAVE_LENGTH + period} 0 L0 0 Z`;

  // Bubbles sit at fixed fractions of the fill so they scale with it; radii scale with height.
  const bubbles = [[0.12, 0.66, 0.07], [0.29, 0.5, 0.05], [0.47, 0.7, 0.085], [0.66, 0.56, 0.055], [0.84, 0.68, 0.065]];

  const vars = {
    "--lq-h": `${h}px`,
    "--lq-glow": s.glow,
    "--lq-deep": s.deep,
    "--lq-grad": `linear-gradient(90deg, ${s.stops.join(", ")})`,
    "--lq-period": `${period}px`,
  } as CSSProperties;

  return (
    <div className={`lpb ${animated ? "is-animated" : ""} ${className}`} style={vars}
         role="progressbar" aria-label={ariaLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-valuetext={`${Math.round(v)}%`}>
      <div className="lpb-fill" style={{ width: `${v}%` }} data-value={v}>
        <svg className="lpb-svg" width="100%" height={h} aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={`sf${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".38" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <radialGradient id={`bb${id}`} cx=".35" cy=".35" r=".7">
              <stop offset="0" stopColor="#fff" stopOpacity=".7" /><stop offset=".55" stopColor="#fff" stopOpacity=".18" /><stop offset="1" stopColor="#fff" stopOpacity=".04" />
            </radialGradient>
          </defs>
          <g className="lpb-wave"><path d={surface} fill={`url(#sf${id})`} /></g>
          {bubbles.map(([x, y, r], i) => (
            <circle key={i} className="lpb-bubble" style={{ animationDelay: `${-i * 1.3}s` }}
                    cx={`${x * 100}%`} cy={y * h} r={Math.max(1, r * h)} fill={`url(#bb${id})`} stroke="#fff" strokeOpacity=".35" strokeWidth=".5" />
          ))}
        </svg>
        <span className="lpb-gloss" />
        <span className="lpb-shade" />
      </div>
    </div>
  );
}
