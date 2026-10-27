// One Bulbu for the whole app. The 3D engine owns a single WebGL canvas; each screen's <Bulbu> slot borrows it,
// so the 6.5 MB model loads once and screens switch instantly. Off-screen, rendering pauses.
import { useEffect, useRef, useState } from "react";
import { createBulbu } from "./engine.js";
import { DAY_WORLD } from "./world.js";
import emotes from "./emotes.json";
import type { Emote } from "../api";

export interface BulbuApi {
  setEmote(name: Emote, instant?: boolean): void;
  play(name: string): void;
  poke(): void;
  headScreen(): { x: number; y: number } | null;
  headBox(): { x: number; top: number; bottom: number; left: number; right: number } | null;
  setBackground(hex: string): void;
  setView(pos: [number, number, number], target: [number, number, number]): void;
  /** give Bulbu a world (backdrop, props, fixed camera) or null for the plain surface colour */
  setStage(stage: unknown | null): void;
  glow: number;
  /** "sweater", "hoodie", one of the eight Bulbu ids (shown once its 3D outfit exists), or null */
  outfit: string | null;
  paused: boolean;
  interactive: boolean;
  autoRotate: boolean;
  emote: Emote;
}

let host: HTMLDivElement | null = null;
let ready: Promise<BulbuApi> | null = null;
let current: BulbuApi | null = null;

function boot() {
  if (host) return host;
  host = document.createElement("div");
  host.className = "bulbu-host";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  ready = fetch("/bulbu.glb").then(r => r.arrayBuffer()).then(buf => new Promise<BulbuApi>((resolve, reject) => {
    createBulbu({ container: host!, glbBytes: new Uint8Array(buf), emotes, reduceMotion,
      onReady: (api: BulbuApi | null, err?: Error) => { if (api) { current = api; (window as unknown as { bulbu: BulbuApi }).bulbu = api; resolve(api); } else reject(err); } });
  }));
  return host;
}

export const whenBulbu = () => { boot(); return ready!; };

const VIEWS = {
  full: { pos: [0.75, 1.2, 5.6], target: [0, 1.1, 0] },
  hero: { pos: [0.55, 1.3, 4.4], target: [0, 1.18, 0] },
  /** Bulbu on the right of a wide card, leaving room for copy on the left */
  side: { pos: [-0.25, 1.3, 4.8], target: [-0.8, 1.12, 0] },
  close: { pos: [0.4, 1.45, 3.4], target: [0, 1.35, 0] },
} as const;

export interface BulbuProps {
  emote?: Emote;
  /** a one-shot animation, replayed whenever `cue` changes */
  animation?: string;
  cue?: unknown;
  glow?: number;
  outfit?: string | null;
  /** what Bulbu says (speech bubble that follows the head) */
  line?: string | null;
  background?: string;
  view?: keyof typeof VIEWS;
  interactive?: boolean;
  /** stand Bulbu in its own world (pastel sky, glass pedestal, ribbons of light) instead of on a plain colour */
  world?: boolean;
  className?: string;
  onPoke?: () => void;
}

export function Bulbu({ emote, animation, cue, glow, outfit, line, background = "#E9F0FF", view = "full", interactive = false, world = false, className = "", onPoke }: BulbuProps) {
  const slot = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<BulbuApi | null>(current);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const h = boot(), el = slot.current!;
    el.prepend(h);
    if (current) current.paused = false;
    whenBulbu().then(a => { a.paused = false; setApi(a); }).catch(() => setFailed(true));
    return () => { if (h.parentElement === el) { el.removeChild(h); if (current) current.paused = true; } };
  }, []);

  useEffect(() => {
    if (!api) return;
    if (world) api.setStage(DAY_WORLD);
    else { api.setStage(null); api.setBackground(background); const v = VIEWS[view]; api.setView([...v.pos], [...v.target]); }
    api.interactive = interactive && !world;
  }, [api, background, view, interactive, world]);
  useEffect(() => { if (api && emote && api.emote !== emote) api.setEmote(emote); }, [api, emote]);
  useEffect(() => { if (api && glow != null) api.glow = glow; }, [api, glow]);
  useEffect(() => { if (api && outfit !== undefined) api.outfit = outfit; }, [api, outfit]);
  useEffect(() => { if (api && animation) api.play(animation); }, [api, animation, cue]);

  // tap to poke: the engine waves back; we let the screen react too
  useEffect(() => {
    const el = slot.current; if (!el || !onPoke) return;
    let down: [number, number] | null = null;
    const d = (e: PointerEvent) => { down = [e.clientX, e.clientY]; };
    const u = (e: PointerEvent) => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) onPoke(); down = null; };
    el.addEventListener("pointerdown", d); el.addEventListener("pointerup", u);
    return () => { el.removeEventListener("pointerdown", d); el.removeEventListener("pointerup", u); };
  }, [onPoke]);

  // speech bubble follows the head
  useEffect(() => {
    if (!api || !line) return;
    let raf = 0;
    const tick = () => {
      const h = api.headBox(), b = bubble.current, s = slot.current;
      if (h && b && s) placeBubble(b, h, s.clientWidth, s.clientHeight);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [api, line]);

  return (
    <div ref={slot} className={`bulbu-slot ${interactive ? "interactive" : ""} ${className}`}>
      {!api && !failed && <div className="bulbu-loading"><img src="/bulbu.svg" alt="" /></div>}
      {failed && <div className="bulbu-loading"><img src="/bulbu.svg" alt="Bulbu" /></div>}
      {line && api && <div ref={bubble} key={line} className="speech">{line}</div>}
    </div>
  );
}

/** Put the speech bubble where it never covers Bulbu's face: above the head if there's room,
 *  otherwise beside it on the roomier side (narrowing to fit), always inside the stage. */
function placeBubble(b: HTMLDivElement, h: { x: number; top: number; bottom: number; left: number; right: number }, W: number, H: number) {
  const pad = 8, gap = 8;
  b.style.transform = "none";
  b.style.maxWidth = "";
  let bw = b.offsetWidth, bh = b.offsetHeight;
  if (h.top - gap - pad >= bh) {                                   // above the head
    b.dataset.side = "top";
    b.style.left = `${Math.max(pad, Math.min(h.x - bw / 2, W - bw - pad))}px`;
    b.style.top = `${h.top - gap - bh}px`;
    return;
  }
  const roomL = h.left - gap - pad, roomR = W - h.right - gap - pad;
  const side = roomR >= roomL ? "right" : "left", room = Math.max(roomL, roomR);
  if (room >= 96) {                                                // beside the head
    if (bw > room) { b.style.maxWidth = `${room}px`; bw = b.offsetWidth; bh = b.offsetHeight; }
    b.dataset.side = side;
    b.style.left = `${side === "right" ? h.right + gap : h.left - gap - bw}px`;
    b.style.top = `${Math.max(pad, Math.min(h.top + (h.bottom - h.top) * 0.05, H - bh - pad))}px`;
    return;
  }
  b.dataset.side = "top";                                          // last resort: as high as possible
  b.style.left = `${Math.max(pad, Math.min(h.x - bw / 2, W - bw - pad))}px`;
  b.style.top = `${pad}px`;
}
