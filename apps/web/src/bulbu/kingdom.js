// Bulbu's Kingdom: a floating island with a building per goal, around Bulbu. It's a stage for the engine (see
// engine.js: view, background, build), plus a small controller the app drives with the engine's kingdom() output:
//
//   const k = createKingdom({ url: "/kingdom.glb" });
//   api.setStage(k.stage);
//   k.set({ buildings: [{ id: "Library", level: 3, building: true, glow: 0.6, fog: 0.2 }, …], plots: ["Vault"],
//           treasure: { photo, mask, box } | null });
//   k.anchors()   // { Library: [x, y, z], … } world points above each building, for the ETA labels
//   k.moment({ id: "Library", kind: "dim", fogFrom: 0, fogTo: 0.7, glowFrom, glowTo })   // play an event on a building:
//                 "dim" rolls the fog in from round it and dims it; "light" blows the fog away and flares it up
//
// The scene comes from public/kingdom.glb (scripts/build-kingdom.mjs), driven through its named nodes: floors
// <Id>_F1.._F5 up to the level, <Id>_Roof on top, <Id>_Scaffold round the floor being built, <Id>_Plot for a goal-less
// building, Castle_Treasure, Observatory_Dome and Vault_Coins. The island, the Dim (fog), the treasure orb, the dome and
// the coins are made here.
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { cloud, glowDot } from "./sky.js";

export const KINGDOM_IDS = ["Castle", "Library", "Vault", "Arena", "Observatory", "Workshop"];
const DEG = Math.PI / 180, FLOORS = 5;

// ------------------------------------------------------------------ the sky behind the island
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function paintKingdomSky(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#9FB6FF"); g.addColorStop(0.45, "#C9C2FF"); g.addColorStop(0.78, "#F6D3EE"); g.addColorStop(1, "#FFE6D6");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const u = Math.min(W, H * 0.62);
  glowDot(ctx, W * 0.78, H * 0.12, u * 0.55, "255,244,214", 0.55);           // a soft sun up and to the right
  const r = rng(7);
  for (let i = 0; i < 70; i++) glowDot(ctx, r() * W, r() * H * 0.45, u * (0.004 + r() * 0.006), "255,255,255", 0.5 + r() * 0.4);
  // clouds on both sides, and a bank of them low down, under the island
  cloud(ctx, W * 0.08, H * 0.2, u * 0.5, 3, 0.9); cloud(ctx, W * 0.96, H * 0.3, u * 0.42, 5, 0.85);
  for (let i = 0; i < 6; i++) cloud(ctx, W * (i / 5) + (r() - 0.5) * u * 0.2, H * (0.9 + r() * 0.06), u * (0.55 + r() * 0.25), 11 + i, 1);
}

// ------------------------------------------------------------------ camera
function view(aspect) {
  // a three-quarter view from above, Bulbu in the lower middle, the castle behind; on a phone the island runs off
  // the sides a little (drag to look round), on wider screens it all fits
  const fov = 40, tanV = Math.tan((fov / 2) * DEG);
  const halfW = 5.1 + Math.min(1, Math.max(0, (aspect - 0.5) / 0.6)) * 3.8;   // how much of the island's width to show
  const dist = Math.max(14, halfW / (tanV * aspect), 6.4 / tanV);
  const el = 37 * DEG, tgt = [0, 1.7, -4.6];
  return { pos: [0, tgt[1] + dist * Math.sin(el), tgt[2] + dist * Math.cos(el)], target: tgt, fov };
}

// ------------------------------------------------------------------ the island
function island(THREE) {
  const g = new THREE.Group(); g.name = "Island";
  const r = rng(42), cx = 0, cz = -4.3, RX = 9.0, RZ = 8.2, N = 96, rim = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, k = 1 + 0.05 * Math.sin(a * 3 + 1) + 0.035 * Math.sin(a * 7) + (r() - 0.5) * 0.02;
    rim.push([cx + Math.cos(a) * RX * k, cz + Math.sin(a) * RZ * k]);
  }
  // the grass: a gently domed disc, lighter in the middle
  const top = new THREE.BufferGeometry(), pos = [cx, 0, cz], col = [], idx = [];
  const c0 = new THREE.Color("#A8E07C"), c1 = new THREE.Color("#72C766");
  col.push(c0.r, c0.g, c0.b);
  const RINGS = 6;
  for (let k = 1; k <= RINGS; k++) {
    const t = k / RINGS, c = c0.clone().lerp(c1, t * t);
    for (const [x, z] of rim) { pos.push(cx + (x - cx) * t, -0.12 * t * t, cz + (z - cz) * t); col.push(c.r, c.g, c.b); }
  }
  for (let i = 0; i < N; i++) idx.push(0, 1 + ((i + 1) % N), 1 + i);
  for (let k = 1; k < RINGS; k++) for (let i = 0; i < N; i++) {
    const a = 1 + (k - 1) * N + i, b = 1 + (k - 1) * N + ((i + 1) % N), c = a + N, d = b + N;
    idx.push(a, b, d, a, d, c);
  }
  top.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); top.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  top.setIndex(idx); top.computeVertexNormals();
  g.add(new THREE.Mesh(top, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 })));
  // the cliff and the rock underneath: rings narrowing to a point, with a band of dark earth under the grass
  const LAY = 9, depth = 6.2, rock = new THREE.BufferGeometry(), rp = [], rc = [], ri = [];
  const earth = new THREE.Color("#8C6A5A"), stone = new THREE.Color("#B7A7D6"), deep = new THREE.Color("#7D6FB0");
  for (let k = 0; k <= LAY; k++) {
    const t = k / LAY, shrink = Math.pow(1 - t, 1.45) * (k ? 0.96 : 1), y = -0.12 - t * depth - (k ? 0.18 : 0);
    const c = k === 0 ? earth : k === 1 ? earth.clone().lerp(stone, 0.4) : stone.clone().lerp(deep, t);
    for (const [x, z] of rim) {
      const j = k > 0 && k < LAY ? 1 + (r() - 0.5) * 0.14 : 1;
      rp.push(cx + (x - cx) * shrink * j, y + (k > 0 && k < LAY ? (r() - 0.5) * 0.25 : 0), cz + (z - cz) * shrink * j); rc.push(c.r, c.g, c.b);
    }
  }
  for (let k = 0; k < LAY; k++) for (let i = 0; i < N; i++) {
    const a = k * N + i, b = k * N + ((i + 1) % N), c = a + N, d = b + N;
    ri.push(a, d, b, a, c, d);
  }
  rock.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3)); rock.setAttribute("color", new THREE.Float32BufferAttribute(rc, 3));
  rock.setIndex(ri); rock.computeVertexNormals();
  g.add(new THREE.Mesh(rock, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true })));
  // a few small rocks floating below
  const bits = new THREE.MeshStandardMaterial({ color: "#B4A5D8", roughness: 0.8, flatShading: true });
  for (const [x, y, z, s] of [[-10.5, -2.6, -2, 0.9], [10.8, -3.4, -6, 0.7], [-8.2, -5.2, -9, 0.6], [7.5, -1.8, 2.2, 0.5]]) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), bits); m.position.set(x, y, z); m.userData.float = r() * 6; g.add(m);
  }
  return g;
}

// ------------------------------------------------------------------ the stage
export function createKingdom({ url }) {
  let want = { buildings: [], plots: [], treasure: null };
  let ctl = null, pending = null;
  const stage = {
    orbit: true,
    controls: { minDistance: 12, maxDistance: 34, minPolarAngle: 38 * DEG, maxPolarAngle: 72 * DEG, minAzimuthAngle: -55 * DEG, maxAzimuthAngle: 55 * DEG, enablePan: false },
    view, background: paintKingdomSky,
    light: { scale: 1.08, env: 1.0 },
    build(ctx) { ctl = build(ctx, url, () => want); if (pending) { ctl.moment(pending); pending = null; } return ctl.update; },
  };
  return {
    stage,
    set(s) { want = { buildings: s.buildings ?? [], plots: s.plots ?? [], treasure: s.treasure ?? null }; ctl?.apply(); },
    anchors() { return ctl ? ctl.anchors() : {}; },
    moment(m) { if (ctl) ctl.moment(m); else pending = m; },
  };
}

function build({ THREE, scene, BLOOM_LAYER }, url, getState) {
  // Bulbu stands at the origin; the island sits a little behind it, so Bulbu reads big in front of its kingdom
  const root = new THREE.Group(); root.name = "KingdomStage"; root.position.z = -1.0; scene.add(root);
  const mark = o => { o.traverse(m => { m.userData.noMask = true; }); return o; };
  root.add(mark(island(THREE)));
  const B = {};           // id -> { node, floors[], roof, scaffold, plot, mats[], fog: { group, puffs, now }, level, shown }
  let treasure = null, treasureKey = "", dome = null, coins = null, loaded = false, treasureAt = null;

  // the treasure: a glowing gold orb until there's a photo of the real thing
  const orbMat = new THREE.MeshStandardMaterial({ color: "#FFC94A", emissive: "#FFB21F", emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.25 });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 40, 24), orbMat); orb.layers.enable(BLOOM_LAYER);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.025, 8, 80), new THREE.MeshBasicMaterial({ color: "#FFE9A8", toneMapped: false }));
  ring.rotation.x = Math.PI / 2; ring.layers.enable(BLOOM_LAYER);
  const orbGroup = new THREE.Group(); orbGroup.add(orb, ring);

  // the Dim: soft lavender-grey clouds that drift round a building, thicker the more it was slowed down
  const puffTex = (() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 170;
    cloud(c.getContext("2d"), 128, 112, 220, 9, 1);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const fogMat = () => new THREE.SpriteMaterial({ map: puffTex, color: "#6F64A6", transparent: true, opacity: 0, depthWrite: false });
  function makeFog(b) {
    const g = new THREE.Group(); g.name = b.id + "_Dim";
    const box = new THREE.Box3().setFromObject(b.node), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const mat = fogMat(), r = rng(b.id.length * 31), puffs = [];
    const R = Math.max(size.x, size.z) * 0.55 + 0.4, H = Math.min(size.y, 4.5);
    // mostly a low bank round the base, a few wisps higher up
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + r(), p = new THREE.Sprite(mat), low = i % 3 !== 2;
      p.userData.base = new THREE.Vector3(c.x + Math.cos(a) * R * (0.75 + r() * 0.35), box.min.y + (low ? 0.25 + r() * 0.5 : 0.9 + r() * H * 0.6), c.z + Math.sin(a) * R * (0.75 + r() * 0.35));
      p.userData.s = 1.5 + r() * 1.0; p.userData.ph = r() * 6;
      p.position.copy(p.userData.base); p.scale.setScalar(0.001); p.renderOrder = 3;
      g.add(p); puffs.push(p);
    }
    root.add(g);
    return { group: g, mat, puffs, now: 0, center: c };
  }

  new GLTFLoader().load(url, gltf => {
    const k = gltf.scene; mark(k); root.add(k);
    k.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } });
    for (const id of KINGDOM_IDS) {
      const node = k.getObjectByName(id); if (!node) continue;
      // each building gets its own copy of the shared palette material, so it can glow and dim on its own
      const mats = new Map();
      node.traverse(o => { if (!o.isMesh) return; const m = o.material; if (!mats.has(m)) { const c = m.clone(); c.userData.base = c.color.clone(); mats.set(m, c); } o.material = mats.get(m); });
      const by = n => node.getObjectByName(n);
      B[id] = {
        id, node, mats: [...mats.values()],
        floors: Array.from({ length: FLOORS }, (_, i) => by(`${id}_F${i + 1}`)).filter(Boolean),
        roof: by(`${id}_Roof`), scaffold: by(`${id}_Scaffold`), plot: by(`${id}_Plot`), model: by(`${id}_Model`),
        level: 0, shown: null, pop: new Map(),
      };
      B[id].floors.forEach(f => { f.visible = false; });
    }
    for (const b of Object.values(B)) b.fog = makeFog(b);
    // the observatory's glass dome, the vault's coin piles
    const domeAt = k.getObjectByName("Observatory_Dome");
    if (domeAt) {
      dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshPhysicalMaterial({ color: "#CFE6FF", roughness: 0.05, metalness: 0, transmission: 0.6, transparent: true, opacity: 0.75, clearcoat: 1 }));
      mark(dome); domeAt.add(dome);
    }
    const coinsAt = k.getObjectByName("Vault_Coins");
    if (coinsAt) {
      coins = new THREE.Group();
      const coinMat = new THREE.MeshStandardMaterial({ color: "#FFCF4D", metalness: 0.75, roughness: 0.3, emissive: "#8A5A00", emissiveIntensity: 0.25 });
      const coinGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.03, 20), r = rng(5);
      for (let i = 0; i < 26; i++) {
        const c = new THREE.Mesh(coinGeo, coinMat), pile = i % 3, a = r() * Math.PI * 2, rr = r() * 0.16;
        c.position.set((pile - 1) * 0.32 + Math.cos(a) * rr, 0.015 + Math.floor(i / 3) * 0.028, Math.sin(a) * rr);
        c.rotation.set((r() - 0.5) * 0.3, r() * 3, (r() - 0.5) * 0.3); coins.add(c);
      }
      mark(coins); coinsAt.add(coins);
    }
    treasureAt = k.getObjectByName("Castle_Treasure");
    if (treasureAt) { mark(orbGroup); treasureAt.add(orbGroup); }
    loaded = true; apply();
    if (queued) { const m = queued; queued = null; moment(m); }
  }, undefined, err => console.warn("kingdom", err));

  // ---- the Goal Treasure from a photo: the user's own item, cut out with SAM's mask, as a glowing card
  function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
  async function setTreasure(t) {
    const key = t ? `${t.photo}|${t.mask ?? ""}` : "";
    if (key === treasureKey) return;
    treasureKey = key;
    if (treasure) { treasure.parent?.remove(treasure); treasure.material.map?.dispose(); treasure.material.dispose(); treasure = null; }
    orbGroup.visible = !t;
    if (!t) return;
    try {
      const [photo, mask] = await Promise.all([loadImage(t.photo), t.mask ? loadImage(t.mask) : null]);
      if (key !== treasureKey) return;
      const b = t.box ?? { left: 0, top: 0, right: photo.naturalWidth, bottom: photo.naturalHeight };
      const bw = b.right - b.left, bh = b.bottom - b.top, S = 512 / Math.max(bw, bh);
      const cv = document.createElement("canvas"); cv.width = Math.round(bw * S); cv.height = Math.round(bh * S);
      const g = cv.getContext("2d");
      g.drawImage(photo, b.left, b.top, bw, bh, 0, 0, cv.width, cv.height);
      if (mask) { g.globalCompositeOperation = "destination-in"; g.drawImage(mask, 0, 0, cv.width, cv.height); }
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const h = 1.5, w = h * cv.width / cv.height;
      treasure = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false }));
      treasure.scale.set(w, h, 1); treasure.userData.noMask = true;
      orbGroup.parent?.add(treasure);
    } catch { orbGroup.visible = true; }
  }

  // ---- apply the app's state: levels, construction, plots, glow and the Dim
  function apply() {
    if (!loaded) return;
    const s = getState(), on = new Map(s.buildings.map(b => [b.id, b]));
    for (const [id, b] of Object.entries(B)) {
      const st = on.get(id), plot = !st && s.plots.includes(id);
      b.node.visible = !!st || plot;
      if (b.plot) b.plot.visible = plot;
      const showParts = !!st;
      if (b.model) b.model.visible = showParts;
      const maxF = b.floors.length || FLOORS, level = st ? Math.max(1, Math.min(maxF, st.level)) : 0;
      b.floors.forEach((f, i) => {
        const vis = showParts && i < level;
        if (vis && !f.visible && b.shown !== null) b.pop.set(f, 0);      // a new floor pops up
        f.visible = vis;
      });
      // while it's being built the roof sits on top of the scaffolding (the floor in progress); then it comes down
      if (b.roof) { b.roof.visible = showParts; b.roof.position.y = level + (st?.building && level < maxF ? 1 : 0); }
      if (b.scaffold) {
        b.scaffold.visible = showParts && !!st.building;
        if (id !== "Arena") b.scaffold.position.y = Math.min(level, maxF - 1);
        if (b.roof && level >= maxF) b.scaffold.visible = false;
      }
      b.level = level; b.shown = !!st;
      b.target = { glow: st ? st.glow : 0, fog: st ? st.fog : 0 };
    }
    // the treasure floats just above the castle's roof, wherever the roof is now
    const cr = B.Castle?.roof;
    if (treasureAt && cr) treasureAt.position.y = cr.position.y + 2.2;
    setTreasure(s.treasure);
  }

  // ---- an event on one building: the Dim rolls in from round it (a slow, visible drift), or blows away as it lights up
  let queued = null;
  function moment(m) {
    const b = B[m?.id];
    if (!loaded || !b) { queued = m; return; }
    b.fog.now = m.fogFrom ?? b.fog.now;
    b.glowNow = m.glowFrom ?? b.glowNow ?? 0;
    b.target = { glow: m.glowTo ?? b.target?.glow ?? 0, fog: m.fogTo ?? b.target?.fog ?? 0 };
    b.ev = { kind: m.kind, t: 0, from: b.fog.now };
  }
  const EV = 3.2;           // seconds the moment takes

  const tint = new THREE.Color("#6E648F"), warm = new THREE.Color("#FFC867"), v = new THREE.Vector3();
  function update(dt, t) {
    root.traverse(o => { if (o.userData.float != null) o.position.y += Math.sin(t * 0.6 + o.userData.float) * 0.0015; });
    if (!loaded) return;
    const k = 1 - Math.exp(-dt * 2.2);
    for (const b of Object.values(B)) {
      const tg = b.target ?? { glow: 0, fog: 0 };
      // during a moment things move slowly enough to watch; a "light" flares the building on the way
      const ev = b.ev; let spread = 1, flare = 0;
      if (ev) {
        ev.t += dt; const p = Math.min(1, ev.t / EV), e = 1 - Math.pow(1 - p, 3);
        b.fog.now = ev.from + (tg.fog - ev.from) * e;
        if (ev.kind === "dim") spread = 1 + 1.7 * (1 - e);            // the puffs drift in from outside
        else { spread = 1 + 1.3 * e; flare = Math.sin(Math.min(1, ev.t / 1.4) * Math.PI) * 1.4; }   // ...or blow away
        if (p >= 1) b.ev = null;
      } else b.fog.now += (tg.fog - b.fog.now) * k;
      b.glowNow = (b.glowNow ?? 0) + (tg.glow - (b.glowNow ?? 0)) * (ev ? k * 0.4 : k);
      const f = ev && ev.kind === "light" ? Math.max(b.fog.now, ev.from * (1 - Math.min(1, ev.t / EV))) : b.fog.now, gl = b.glowNow + flare;
      // dim the building under the fog, warm it when it glows
      for (const m of b.mats) { m.color.copy(m.userData.base).lerp(tint, f * 0.6); m.emissive.copy(warm); m.emissiveIntensity = gl * 0.22 * (1 - f); }
      // even a little of the Dim shows (a short scroll should be seen), and it thickens from there
      b.fog.mat.opacity = (f > 0.01 ? Math.min(0.8, 0.28 + f * 0.75) : 0) * (spread > 1 && ev?.kind === "light" ? Math.max(0, 1 - (spread - 1) / 1.3) : 1);
      b.fog.group.visible = f > 0.01;
      const c = b.fog.center;
      for (const p of b.fog.puffs) {
        const s = p.userData.s * (0.55 + 0.45 * f) * (1 + 0.06 * Math.sin(t * 0.7 + p.userData.ph));
        const sc = Math.max(0.001, s * Math.min(1, 0.45 + f * 2)); p.scale.set(sc * 1.5, sc * 0.6, 1);
        p.position.copy(p.userData.base).add(v.set(Math.sin(t * 0.25 + p.userData.ph) * 0.35, Math.sin(t * 0.4 + p.userData.ph) * 0.12, Math.cos(t * 0.22 + p.userData.ph) * 0.3));
        if (spread !== 1) { p.position.x = c.x + (p.position.x - c.x) * spread; p.position.z = c.z + (p.position.z - c.z) * spread; }
      }
      // new floors pop in with a little overshoot
      for (const [fl, p0] of b.pop) {
        const p = p0 + dt / 0.6; b.pop.set(fl, p);
        const e = p >= 1 ? 1 : 1 + 0.25 * Math.sin(p * Math.PI) * (1 - p) - (1 - p) * (1 - p);
        fl.scale.set(1, Math.max(0.001, e), 1);
        if (p >= 1) { fl.scale.set(1, 1, 1); b.pop.delete(fl); }
      }
    }
    orbGroup.position.y = Math.sin(t * 1.4) * 0.12; orb.rotation.y += dt * 0.8; ring.rotation.z += dt * 0.5;
    orbMat.emissiveIntensity = 0.8 + 0.25 * Math.sin(t * 2.2);
    if (treasure) treasure.position.y = Math.sin(t * 1.4) * 0.12 + 0.2;
    if (coins) coins.visible = !!B.Vault?.shown;
  }

  // world points above each building, for the ETA labels
  function anchors() {
    const out = {};
    for (const [id, b] of Object.entries(B)) {
      if (!b.node.visible) continue;
      const top = id === "Arena" ? 2.6 : id === "Castle" ? (b.roof ? b.roof.position.y : 4) + 3.1 : (b.shown ? (b.roof ? b.roof.position.y : b.level) : 0) + 1.3;
      b.node.localToWorld(v.set(0, top, 0));
      out[id] = [v.x, v.y, v.z];
    }
    return out;
  }

  return { update, apply, anchors, moment };
}
