"use dom";
// The 3D Bulbu, running the web app's three.js engine inside a DOM component (a WebView on phones, a plain div on web).
// The engine and the GLB are shared with apps/web, so outfits and emotes added there show up here too.
import { useEffect, useRef, useState } from "react";
import type { DOMProps } from "expo/dom";
import { createBulbu } from "../../../../web/src/bulbu/engine.js";
import { DAY_WORLD } from "../../../../web/src/bulbu/world.js";
import { createKingdom, type KingdomMomentView, type KingdomView } from "../../../../web/src/bulbu/kingdom.js";
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
  /** an event to play on a building (fog rolls in or clears); a new key plays it again */
  moment?: (KingdomMomentView & { key: number }) | null;
  paused?: boolean;
  interactive?: boolean;
  onPoke?: () => Promise<void>;
  dom?: DOMProps;
}

/** The floating label over a building: its name and level, and when its construction finishes. */
export interface KingdomLabel {
  id: string; title: string; sub: string; kind: "building" | "built" | "plot"; dim: boolean;
  /** during a moment: the date it was ("24 Jan") and the shift ("+3 days"), shown under the new date */
  was?: string; shift?: string; tone?: "dim" | "light";
}

const base = () => { const b = process.env.EXPO_BASE_URL || "/"; return b.endsWith("/") ? b : b + "/"; };

export default function BulbuDom({ emote, animation, cue, glow, outfit, gear, gearColor, show, line, background = "#E9F0FF", view = "full", world = false, kingdom, labels, onBuilding, moment, paused = false, interactive = false, onPoke }: BulbuDomProps) {
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
  // tap a building to pick it (it bounces, a ring lights up round it and its label pops up); tap it again, or its
  // label, to open it; tap anywhere else to put it down
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    const k = realm.current; if (!k) return;
    k.onSelect = (id: string | null, again: boolean) => { setPicked(id); if (id && again) void pick.current?.(id); };
    return () => { k.onSelect = null; };
  }, [isKingdom]);

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
  // play a moment once the 3D is up (the kingdom queues it until its model has loaded)
  useEffect(() => { if (api && realm.current && moment) realm.current.moment(moment); }, [api, moment?.key]);   // eslint-disable-line react-hooks/exhaustive-deps

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
          // keep the whole label on screen (near an edge it slides in; its point stays over the building)
          const half = el.offsetWidth / 2, lx = Math.max(half + 6, Math.min(r.width - half - 6, x - r.left)), ly = Math.max(el.offsetHeight + 6, y - r.top);
          el.style.transform = `translate(${Math.round(lx)}px, ${Math.round(ly)}px) translate(-50%, -100%)`;
          const tip = el.lastElementChild as HTMLElement | null;
          if (tip) tip.style.marginLeft = `${Math.round(Math.max(-half + 14, Math.min(half - 14, x - r.left - lx)) * 2)}px`;
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
      {api && isKingdom && (labels ?? []).filter(l => l.id === picked || l.was).map(l => (
        <button key={l.id} ref={el => { labelEls.current[l.id] = el; }} onClick={() => { void pick.current?.(l.id); }}
                aria-label={`${l.title}, ${l.sub}. Open`}
                style={{ position: "absolute", left: 0, top: 0, display: "none", flexDirection: "column", alignItems: "center", zIndex: 2, padding: 0, border: 0, background: "none", cursor: "pointer" }}>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "6px 12px 7px", borderRadius: 14, whiteSpace: "nowrap",
                         border: "2px solid rgba(255,255,255,.95)", background: l.dim ? "rgba(122,112,170,.92)" : "rgba(255,255,255,.96)", boxShadow: "0 8px 18px rgba(40,40,120,.22)",
                         font: "800 12.5px/1.15 'Plus Jakarta Sans', system-ui, -apple-system, Roboto, sans-serif", color: l.dim ? "#fff" : "#141B4D",
                         transformOrigin: "50% 100%", animation: "label .32s cubic-bezier(.3,1.6,.5,1) both" }}>
            <span>{l.title}</span>
            <span key={l.sub} style={{ fontWeight: 700, fontSize: 11, color: l.dim ? "#EDEAFF" : l.kind === "building" ? "#B3610B" : l.kind === "built" ? "#18935F" : "#5B6487",
                           animation: l.was ? "slip .7s 1.1s cubic-bezier(.3,1.6,.5,1) both" : undefined }}>{l.kind === "building" ? "🔨 " : l.kind === "built" ? "✓ " : "+ "}{l.sub}</span>
            {l.was && (
              <span key={`${l.id}${l.was}${l.shift}`} style={{ display: "flex", gap: 4, alignItems: "center", fontWeight: 700, fontSize: 10, marginTop: 1 }}>
                <s style={{ opacity: 0.75, animation: "strike .6s .5s both" }}>{l.was}</s>
                <span style={{ padding: "1px 5px", borderRadius: 999, color: "#fff", background: l.tone === "light" ? "#18935F" : "#6B5BC2", animation: "slip .6s 1.6s cubic-bezier(.3,1.6,.5,1) both" }}>{l.shift}</span>
              </span>
            )}
            {l.id === picked && onBuilding && <span style={{ marginTop: 4, padding: "3px 10px", borderRadius: 999, background: l.dim ? "rgba(255,255,255,.22)" : "#6C4DF0", color: "#fff", fontWeight: 800, fontSize: 11 }}>
              {l.kind === "plot" ? "Start building ›" : "Open ›"}</span>}
          </span>
          {/* the little point under the label, at the building */}
          <span style={{ display: "block", width: 12, height: 12, marginTop: -7, transform: "rotate(45deg)", borderRadius: 2,
                         background: l.dim ? "rgba(122,112,170,.92)" : "rgba(255,255,255,.96)", borderRight: "2px solid rgba(255,255,255,.95)", borderBottom: "2px solid rgba(255,255,255,.95)",
                         animation: "label .32s cubic-bezier(.3,1.6,.5,1) both" }} />
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
      <style>{"@keyframes pop { from { opacity: 0; transform: scale(.9); } } @keyframes slip { from { opacity: 0; transform: translateY(-6px) scale(.8); } } @keyframes strike { from { opacity: 1; text-decoration-color: transparent; } } @keyframes label { from { opacity: 0; transform: translateY(8px) scale(.6); } } canvas { display: block; width: 100% !important; height: 100% !important; }"}</style>
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
