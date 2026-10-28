"use dom";
// The 3D Bulbu, running the web app's three.js engine inside a DOM component (a WebView on phones, a plain div on web).
// The engine and the GLB are shared with apps/web, so outfits and emotes added there show up here too.
import { useEffect, useRef, useState } from "react";
import type { DOMProps } from "expo/dom";
import { createBulbu } from "../../../../web/src/bulbu/engine.js";
import { DAY_WORLD } from "../../../../web/src/bulbu/world.js";
import { createKingdom, type KingdomView } from "../../../../web/src/bulbu/kingdom.js";
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
  toScreen(x: number, y: number, z: number): [number, number];
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
  /** Bulbu's Kingdom instead of the plain world: the buildings to show, and a label for each */
  kingdom?: KingdomView;
  labels?: KingdomLabel[];
  onBuilding?: (id: string) => Promise<void>;
  paused?: boolean;
  interactive?: boolean;
  onPoke?: () => Promise<void>;
  dom?: DOMProps;
}

/** The floating label over a building: its name and level, and when its construction finishes. */
export interface KingdomLabel { id: string; title: string; sub: string; kind: "building" | "built" | "plot"; dim: boolean }

const base = () => { const b = process.env.EXPO_BASE_URL || "/"; return b.endsWith("/") ? b : b + "/"; };

export default function BulbuDom({ emote, animation, cue, glow, outfit, gear, gearColor, show, line, background = "#E9F0FF", view = "full", world = false, kingdom, labels, onBuilding, paused = false, interactive = false, onPoke }: BulbuDomProps) {
  const host = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<Api | null>(null);
  const [failed, setFailed] = useState(false);
  const poke = useRef(onPoke); poke.current = onPoke;
  const pick = useRef(onBuilding); pick.current = onBuilding;
  const realm = useRef<ReturnType<typeof createKingdom> | null>(null);
  const labelEls = useRef<Record<string, HTMLButtonElement | null>>({});
  const isKingdom = !!kingdom;
  if (isKingdom && !realm.current) realm.current = createKingdom({ url: base() + "kingdom.glb" });

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
    if (isKingdom && realm.current) api.setStage(realm.current.stage);
    else if (world) api.setStage(DAY_WORLD);
    else { api.setStage(null); api.setBackground(background); const v = VIEWS[view]; api.setView([...v.pos], [...v.target]); }
    api.interactive = isKingdom || (interactive && !world);       // the kingdom can be turned round with a drag
  }, [api, background, view, interactive, world, isKingdom]);
  const kingdomKey = kingdom ? JSON.stringify(kingdom) : "";
  useEffect(() => { if (realm.current && kingdom) realm.current.set(kingdom); }, [kingdomKey]);   // eslint-disable-line react-hooks/exhaustive-deps

  // the labels follow their buildings on screen (moved directly, every frame, without re-rendering)
  useEffect(() => {
    if (!api || !isKingdom) return;
    let raf = 0;
    const tick = () => {
      const k = realm.current, s = host.current;
      if (k && s) {
        const r = s.getBoundingClientRect(), at = k.anchors();
        for (const [id, el] of Object.entries(labelEls.current)) {
          if (!el) continue;
          const p = at[id];
          if (!p) { el.style.display = "none"; continue; }
          const [x, y] = api.toScreen(p[0], p[1], p[2]);
          el.style.display = "flex";
          el.style.transform = `translate(${Math.round(x - r.left)}px, ${Math.round(y - r.top)}px) translate(-50%, -100%)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [api, isKingdom]);

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
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: isKingdom ? "#B9B8FF" : world ? "#a3b2f3" : background, touchAction: "none" }}>
      <div ref={host} style={{ position: "absolute", inset: 0 }} />
      {api && isKingdom && (labels ?? []).map(l => (
        <button key={l.id} ref={el => { labelEls.current[l.id] = el; }} onClick={() => { void pick.current?.(l.id); }}
                aria-label={`${l.title}, ${l.sub}`}
                style={{ position: "absolute", left: 0, top: 0, display: "none", flexDirection: "column", alignItems: "center", gap: 1, zIndex: 2,
                  padding: "4px 9px 5px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,.95)", cursor: "pointer", whiteSpace: "nowrap",
                  background: l.dim ? "rgba(122,112,170,.86)" : "rgba(255,255,255,.92)", boxShadow: "0 6px 14px rgba(40,40,120,.18)",
                  font: "800 11px/1.15 'Plus Jakarta Sans', system-ui, -apple-system, Roboto, sans-serif", color: l.dim ? "#fff" : "#141B4D" }}>
          <span>{l.title}</span>
          <span style={{ fontWeight: 700, fontSize: 10, color: l.dim ? "#EDEAFF" : l.kind === "building" ? "#B3610B" : l.kind === "built" ? "#18935F" : "#5B6487" }}>{l.kind === "building" ? "🔨 " : l.kind === "built" ? "✓ " : "+ "}{l.sub}</span>
        </button>
      ))}
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
