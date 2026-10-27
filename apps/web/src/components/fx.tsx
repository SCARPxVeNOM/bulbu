/**
 * Motion pieces for Bulbu, adapted to plain CSS + Bulbu's tokens.
 * Sources (all MIT, found via designeer.xyz; see THIRD_PARTY_NOTICES.md):
 *  - Motion Primitives (ibelick): TextShimmer, TextEffect, AnimatedGroup, AnimatedBackground
 *  - Magic UI: BorderBeam, Confetti, AnimatedList, AnimatedCircularProgressBar
 *  - NumberFlow (Maxwell Barvian): used as a dependency for animated numbers
 */
import { Children, isValidElement, useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import NumberFlow from "@number-flow/react";
import confetti from "canvas-confetti";

// ------------------------------------------------------------ numbers (NumberFlow)

/** "+3 days" / "2.5 days closer" that rolls digit by digit when it changes. */
export function Days({ days, closer = false, className, style }: { days: number; closer?: boolean; className?: string; style?: CSSProperties }) {
  const a = Math.abs(days);
  if (a < 0.05) return <span className={className} style={style}>no change</span>;
  const v = a >= 1 ? Math.round(a) : Math.round(a * 10) / 10;
  const unit = v === 1 ? "day" : "days";
  return <NumberFlow className={className} style={style} value={v} prefix={closer ? "" : days > 0 ? "+" : "-"}
                     suffix={closer ? ` ${unit} closer` : ` ${unit}`} format={{ maximumFractionDigits: 1 }} />;
}

/** Any number that should tick (percent, streak, counts). Starts at 0 on mount so it counts up. */
export function Num({ value, suffix, prefix, decimals = 0, className, style }: { value: number; suffix?: string; prefix?: string; decimals?: number; className?: string; style?: CSSProperties }) {
  const [v, setV] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setV(value)); return () => cancelAnimationFrame(t); }, [value]);
  return <NumberFlow className={className} style={style} value={v} prefix={prefix} suffix={suffix} format={{ maximumFractionDigits: decimals }} />;
}

// ------------------------------------------------------------ text

/** Shimmering "Bulbu is thinking…" text (after Motion Primitives' TextShimmer, CSS-only). */
export function Shimmer({ children, className = "" }: { children: string; className?: string }) {
  return <span className={`fx-shimmer ${className}`} style={{ "--spread": `${children.length * 2}px` } as CSSProperties}>{children}</span>;
}

/** Words blur in one by one (after Motion Primitives' TextEffect, "fade-in-blur" preset). */
export function Reveal({ children, as = "span", delay = 0, className, style }: { children: string; as?: "span" | "p" | "b" | "div"; delay?: number; className?: string; style?: CSSProperties }) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  if (reduce) { const T = as; return <T className={className} style={style}>{children}</T>; }
  const words = children.split(/(\s+)/);
  return (
    <Tag key={children} className={className} style={style} initial="hidden" animate="visible" aria-label={children}
         variants={{ visible: { transition: { staggerChildren: 0.045, delayChildren: delay } } }}>
      {words.map((w, i) => (
        <motion.span key={i} aria-hidden="true" style={{ display: "inline-block", whiteSpace: "pre" }}
                     variants={{ hidden: { opacity: 0, y: 8, filter: "blur(8px)" }, visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.35 } } }}>
          {w}
        </motion.span>
      ))}
    </Tag>
  );
}

// ------------------------------------------------------------ lists

const stagger: Variants = { visible: { transition: { staggerChildren: 0.06 } } };
const item: Variants = { hidden: { opacity: 0, y: 14, filter: "blur(4px)" }, visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 260, damping: 26 } } };

/** Children enter one after another (after Motion Primitives' AnimatedGroup, "blur-slide"). */
export function Stagger({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <motion.div className={className} style={style} initial="hidden" animate="visible" variants={stagger}>
      {Children.map(children, (c, i) => c == null || c === false ? null : <motion.div key={isValidElement(c) && c.key != null ? c.key : i} variants={item}>{c}</motion.div>)}
    </motion.div>
  );
}

/** Items drop in like notifications, one every `delay` ms, newest on top (after Magic UI's AnimatedList). */
export function DropList({ children, delay = 450, className }: { children: ReactNode; delay?: number; className?: string }) {
  const arr = useMemo(() => Children.toArray(children), [children]);
  const [n, setN] = useState(1);
  useEffect(() => { if (n >= arr.length) return; const t = setTimeout(() => setN(n + 1), delay); return () => clearTimeout(t); }, [n, arr.length, delay]);
  const shown = arr.slice(0, n);
  return (
    <div className={className} style={{ display: "grid", gap: 12 }}>
      <AnimatePresence initial>
        {shown.map((c, i) => (
          <motion.div key={isValidElement(c) && c.key != null ? c.key : i} layout initial={{ scale: 0.6, opacity: 0, y: -12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 350, damping: 32 }} style={{ originY: 0 }}>
            {c}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------ controls

/** Segmented control whose active pill slides between options (after Motion Primitives' AnimatedBackground). */
export function SlideSeg<T extends string>({ value, options, onChange, soft = false }: { value: T; options: [T, string][]; onChange: (v: T) => void; soft?: boolean }) {
  const id = useId();
  return (
    <div className={`seg ${soft ? "soft" : ""}`} role="tablist">
      {options.map(([v, l]) => (
        <button key={v} role="tab" aria-selected={v === value} className={v === value ? "on" : ""} onClick={() => onChange(v)} style={{ position: "relative" }}>
          {v === value && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          <span style={{ position: "relative" }}>{l}</span>
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ decoration

/** A light that travels around a card's border (after Magic UI's BorderBeam). Parent needs position: relative. */
export function Beam({ size = 70, duration = 5, from = "#7C8CFF", to = "#3D5BFF", width = 2 }: { size?: number; duration?: number; from?: string; to?: string; width?: number }) {
  if (useReducedMotion()) return null;
  return (
    <span className="fx-beam" style={{ "--bw": `${width}px` } as CSSProperties} aria-hidden="true">
      <motion.span className="fx-beam-dot" style={{ width: size, offsetPath: `rect(0 auto auto 0 round ${size}px)`, background: `linear-gradient(to left, ${from}, ${to}, transparent)` }}
                   animate={{ offsetDistance: ["0%", "100%"] }} transition={{ repeat: Infinity, ease: "linear", duration }} />
    </span>
  );
}

/** Progress ring that animates to its value (after Magic UI's AnimatedCircularProgressBar). */
export function Ring({ value, size = 64, stroke = 8, color = "var(--primary)", track = "#E6EBFB", children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = 50 - stroke / 2 - 1, c = 2 * Math.PI * r;
  const [v, setV] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setV(Math.max(0, Math.min(100, value)))); return () => cancelAnimationFrame(t); }, [value]);
  return (
    <span className="fx-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" transform="rotate(-90 50 50)"
                strokeDasharray={`${(v / 100) * c} ${c}`} style={{ transition: "stroke-dasharray 1s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <span className="fx-ring-c">{children}</span>
    </span>
  );
}

// ------------------------------------------------------------ celebration (canvas-confetti, as in Magic UI's Confetti)

const PALETTE = ["#3D5BFF", "#7C8CFF", "#18B37A", "#F5A524", "#EC4F8A", "#FFD45C"];

/** Burst of confetti from an element (or the centre of the screen). */
export function celebrate(from?: Element | null, big = false) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = from?.getBoundingClientRect();
  const origin = r ? { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight } : { x: 0.5, y: 0.45 };
  void confetti({ origin, particleCount: big ? 140 : 70, spread: big ? 100 : 70, startVelocity: big ? 42 : 32, scalar: 0.9, colors: PALETTE, zIndex: 9999, disableForReducedMotion: true });
  if (big) setTimeout(() => void confetti({ origin, particleCount: 60, spread: 120, startVelocity: 25, scalar: 0.8, colors: PALETTE, zIndex: 9999, disableForReducedMotion: true }), 220);
}
