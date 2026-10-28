"use dom";
// The 3D Bulbu, running the web app's three.js engine inside a DOM component (a WebView on phones, a plain div on web).
// The engine and the GLB are shared with apps/web, so outfits and emotes added there show up here too.
import { useEffect, useRef, useState } from "react";
import type { DOMProps } from "expo/dom";
import { createBulbu } from "../../../../web/src/bulbu/engine.js";
import { DAY_WORLD } from "../../../../web/src/bulbu/world.js";
import emotes from "../../../../web/src/bulbu/emotes.json";

export type BulbuView = "full" | "hero" | "side" | "close";
const VIEWS: Record<BulbuView, { pos: [number, number, number]; target: [number, number, number] }> = {
  full: { pos: [0.75, 1.2, 5.6], target: [0, 1.1, 0] },
  hero: { pos: [0.55, 1.3, 4.4], target: [0, 1.18, 0] },
  side: { pos: [-0.25, 1.3, 4.8], target: [-0.8, 1.12, 0] },
  close: { pos: [0.4, 1.45, 3.4], target: [0, 1.35, 0] },
};

interface Api {
  setEmote(name: string, instant?: boolean): void; play(name: string): void;
  headBox(): { x: number; top: number; bottom: number; left: number; right: number } | null;
  setBackground(hex: string): void; setView(pos: [number, number, number], target: [number, number, number]): void; setStage(stage: unknown | null): void;
  glow: number; outfit: string | null; paused: boolean; interactive: boolean; emote: string;
  setGear(id: string | null, url?: string, opts?: { color?: string }): void; showGear(): void; gearDefs: Record<string, unknown>;
}

export interface BulbuDomProps {
  emote?: string;
  animation?: string;
  /** replays `animation` whenever it changes */
  cue?: number;
  glow?: number;
  outfit?: string | null;
  /** a real-life item Bulbu holds (one with a 3D model in public/gear) */
  gear?: string | null;
  /** the colour of the user's own one (hex) */
  gearColor?: string;
  /** change it to make Bulbu show the item off */
  show?: number;
  line?: string | null;
  background?: string;
  view?: BulbuView;
  world?: boolean;
  paused?: boolean;
  interactive?: boolean;
  onPoke?: () => Promise<void>;
  dom?: DOMProps;
}

const base = () => { const b = process.env.EXPO_BASE_URL || "/"; return b.endsWith("/") ? b : b + "/"; };

export default function BulbuDom({ emote, animation, cue, glow, outfit, gear, gearColor, show, line, background = "#E9F0FF", view = "full", world = false, paused = false, interactive = false, onPoke }: BulbuDomProps) {
  const host = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<Api | null>(null);
  const [failed, setFailed] = useState(false);
  const poke = useRef(onPoke); poke.current = onPoke;

  useEffect(() => {
    if (process.env.EXPO_DOM_HOST_OS) {        // inside the phone's WebView (on web this is a plain div in the page)
      document.documentElement.style.cssText = "margin:0;height:100%;background:transparent;overflow:hidden";
      document.body.style.cssText = "margin:0;height:100%;background:transparent;overflow:hidden;-webkit-user-select:none;user-select:none";
    }
    let alive = true;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    fetch(base() + "bulbu.glb").then(r => { if (!r.ok) throw new Error(`GLB ${r.status}`); return r.arrayBuffer(); }).then(buf => {
      if (!alive || !host.current) return;
      createBulbu({ container: host.current, glbBytes: new Uint8Array(buf), emotes, reduceMotion,
        onPoke: () => { void poke.current?.(); },
        onReady: (a: Api | null) => { if (!alive) return; if (a) setApi(a); else setFailed(true); } });
    }).catch(() => alive && setFailed(true));
    return () => { alive = false; };
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
  useEffect(() => {
    if (!api || gear === undefined) return;
    api.setGear(gear && api.gearDefs[gear] ? gear : null, gear ? `${base()}gear/${gear}.glb` : undefined, { color: gearColor });
  }, [api, gear, gearColor]);
  useEffect(() => { if (api && show) api.showGear(); }, [api, show]);
  useEffect(() => { if (api) api.paused = paused; }, [api, paused]);
  useEffect(() => { if (api && animation && animation !== "Idle") api.play(animation); }, [api, animation, cue]);

  // the speech bubble follows Bulbu's head and never covers the face
  useEffect(() => {
    if (!api || !line) return;
    let raf = 0;
    const tick = () => {
      const h = api.headBox(), b = bubble.current, s = host.current;
      if (h && b && s) placeBubble(b, h, s.clientWidth, s.clientHeight);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [api, line]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: world ? "#a3b2f3" : background, touchAction: "none" }}>
      <div ref={host} style={{ position: "absolute", inset: 0 }} />
      {!api && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <img src={base() + "bulbu.svg"} alt={failed ? "Bulbu" : "Loading Bulbu"} style={{ width: "34%", maxWidth: 120, opacity: 0.9, animation: failed ? undefined : "bob 2.4s ease-in-out infinite" }} />
          <style>{"@keyframes bob { 50% { transform: translateY(-8px); } } @keyframes pop { from { opacity: 0; transform: scale(.9); } }"}</style>
        </div>
      )}
      {line && api && (
        <div ref={bubble} key={line} style={{ position: "absolute", zIndex: 3, maxWidth: 190, background: "#fff", color: "#141B4D", borderRadius: "16px 16px 16px 4px",
          padding: "9px 12px", font: "700 13.5px/1.3 'Plus Jakarta Sans', system-ui, -apple-system, Roboto, sans-serif", boxShadow: "0 8px 20px rgba(40,60,160,.14)",
          pointerEvents: "none", animation: "pop .35s cubic-bezier(.3,1.6,.5,1)" }}>{line}</div>
      )}
      <style>{"@keyframes pop { from { opacity: 0; transform: scale(.9); } } canvas { display: block; width: 100% !important; height: 100% !important; }"}</style>
    </div>
  );
}

/** Above the head if there's room, otherwise beside it on the roomier side (narrowing to fit), always inside the stage. */
function placeBubble(b: HTMLDivElement, h: { x: number; top: number; bottom: number; left: number; right: number }, W: number, H: number) {
  const pad = 8, gap = 8;
  b.style.maxWidth = "";
  let bw = b.offsetWidth, bh = b.offsetHeight;
  if (h.top - gap - pad >= bh) {
    b.style.borderRadius = "16px 16px 16px 4px";
    b.style.left = `${Math.max(pad, Math.min(h.x - bw / 2, W - bw - pad))}px`;
    b.style.top = `${h.top - gap - bh}px`;
    return;
  }
  const roomL = h.left - gap - pad, roomR = W - h.right - gap - pad;
  const side = roomR >= roomL ? "right" : "left", room = Math.max(roomL, roomR);
  if (room >= 96) {
    if (bw > room) { b.style.maxWidth = `${room}px`; bw = b.offsetWidth; bh = b.offsetHeight; }
    b.style.borderRadius = side === "right" ? "4px 16px 16px 16px" : "16px 4px 16px 16px";
    b.style.left = `${side === "right" ? h.right + gap : h.left - gap - bw}px`;
    b.style.top = `${Math.max(pad, Math.min(h.top + (h.bottom - h.top) * 0.05, H - bh - pad))}px`;
    return;
  }
  b.style.left = `${Math.max(pad, Math.min(h.x - bw / 2, W - bw - pad))}px`;
  b.style.top = `${pad}px`;
}
