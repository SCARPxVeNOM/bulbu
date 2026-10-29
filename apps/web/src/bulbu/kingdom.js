// Bulbu's Kingdom: a floating island with a building per goal, around Bulbu. It's a stage for the engine (see
// engine.js: view, background, build), plus a small controller the app drives with the engine's kingdom() output:
//
//   const k = createKingdom({ url: "/kingdom.glb" });
//   api.setStage(k.stage);
//   k.set({ buildings: [{ id: "Library", level: 3, building: true, glow: 0.6, fog: 0.2 }, …], plots: ["Vault"],
//           treasure: { photo, mask, box } | null });
//   k.anchors()   // { Library: [x, y, z], … } world points above each building, for the ETA labels
//   k.onSelect = (id, again) => …   // a tap picked a building (null: tapped away); k.select(id) picks one from the app
//   k.set({ …, raid: { id: "Castle", state: "coming" | "striking" | "defended", near: 0..1 } | null })   // a Dim raid's
//                 storm over its target: thicker as it nears, flickering while it strikes, scattering when held off
//   k.moment({ id: "Library", kind: "dim", fogFrom: 0, fogTo: 0.7, glowFrom, glowTo })   // play an event on a building:
//                 "dim" rolls the fog in from round it and dims it; "light" blows the fog away and flares it up
//
// The scene comes from public/kingdom.glb (scripts/build-kingdom.mjs: KayKit's hex tiles, buildings and nature),
// driven through its named nodes: <Id>_L1.._L5 (the building at each level, one shown at a time), <Id>_Scaffold while
// the next level is being built, <Id>_Plot for a goal-less building, Castle_Treasure and Vault_Coins. Here we add the
// rock under the island (from the tiles), the dirt paths, grass and flowers that sway in the wind, sunlight with soft
// shadows, the Dim (fog), the raid storm, the treasure orb and the coins. The ground and the scenery are merged into
// a couple of meshes so the island draws in a handful of calls on a phone.
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { cloud, glowDot } from "./sky.js";

export const KINGDOM_IDS = ["Castle", "Library", "Vault", "Arena", "Observatory", "Workshop"];
const DEG = Math.PI / 180, LEVELS = 5;

// ------------------------------------------------------------------ the sky behind the island
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function paintKingdomSky(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#8FB4FF"); g.addColorStop(0.42, "#BFD0FF"); g.addColorStop(0.75, "#F3D6F0"); g.addColorStop(1, "#FFE7D6");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const u = Math.min(W, H * 0.62);
  glowDot(ctx, W * 0.8, H * 0.1, u * 0.6, "255,246,220", 0.6);             // a soft sun up and to the right
  const r = rng(7);
  for (let i = 0; i < 50; i++) glowDot(ctx, r() * W, r() * H * 0.4, u * (0.004 + r() * 0.006), "255,255,255", 0.4 + r() * 0.4);
  // clouds on both sides, and a bank of them low down, under the island
  cloud(ctx, W * 0.08, H * 0.2, u * 0.5, 3, 0.9); cloud(ctx, W * 0.96, H * 0.3, u * 0.42, 5, 0.85);
  for (let i = 0; i < 6; i++) cloud(ctx, W * (i / 5) + (r() - 0.5) * u * 0.2, H * (0.9 + r() * 0.06), u * (0.55 + r() * 0.25), 11 + i, 1);
}

// ------------------------------------------------------------------ camera
function view(aspect) {
  // a three-quarter view from above, Bulbu in the lower middle, the castle behind; on a phone the island runs off
  // the sides a little (drag to look round), on wider screens it all fits
  const fov = 40, tanV = Math.tan((fov / 2) * DEG);
  const halfW = 5.4 + Math.min(1, Math.max(0, (aspect - 0.5) / 0.6)) * 4.0;   // how much of the island's width to show
  const dist = Math.max(14.5, halfW / (tanV * aspect), 6.6 / tanV);
  const el = 38 * DEG, tgt = [0, 1.5, -4.8];
  return { pos: [0, tgt[1] + dist * Math.sin(el), tgt[2] + dist * Math.cos(el)], target: tgt, fov };
}

// ------------------------------------------------------------------ the lawn and the rock under it
const HEX_R = 1.1547;          // a cell's corner radius (2 across the flats)
const hexCorner = (x, z, s, i) => { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; return [x + Math.cos(a) * HEX_R * s, z + Math.sin(a) * HEX_R * s]; };
/** Soft patches of lighter and darker green, so the lawn doesn't read as one flat colour. */
const patch = (x, z) => 0.5 + 0.22 * Math.sin(x * 0.62 + z * 0.31) + 0.16 * Math.sin(x * 1.7 - z * 1.25 + 1.7) + 0.12 * Math.sin(x * 3.3 + z * 3.9 + 0.4);

/** The lawn: every cell as one seamless surface (no seams between tiles), finely split so its colour can vary, and a
 *  grass lip over a band of earth round the outer edge. */
function lawn(THREE, tiles, occluders = []) {
  const verts = new Map(), pos = [], col = [], idx = [];
  const dark = new THREE.Color("#4EA92C"), mid = new THREE.Color("#72C83A"), light = new THREE.Color("#9EE152"), c = new THREE.Color();
  const shade = new THREE.Color("#2F7A2A");
  // soft contact shading round the foot of everything standing on the lawn (buildings, trees, rocks)
  const occlusion = (x, z) => { let o = 0; for (const [ox, oz, r] of occluders) { const d = Math.hypot(x - ox, z - oz) / r; if (d < 1) o = Math.max(o, (1 - d) * (1 - d)); } return o; };
  const vert = (x, y, z, color) => {
    const k = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    if (color === undefined && verts.has(k)) return verts.get(k);
    const n = pos.length / 3; pos.push(x, y, z);
    if (color) col.push(color.r, color.g, color.b);
    else {
      const p = Math.max(0, Math.min(1, patch(x, z)));
      c.copy(dark).lerp(mid, Math.min(1, p * 1.6)).lerp(light, Math.max(0, p - 0.62) * 2.2).lerp(shade, occlusion(x, z) * 0.55);
      col.push(c.r, c.g, c.b);
    }
    if (color === undefined) verts.set(k, n);
    return n;
  };
  const N = 4, has = new Set(tiles.map(([x, z]) => `${Math.round(x)},${Math.round(z * 10)}`));
  const lip = new THREE.Color("#3F9A28"), soil = new THREE.Color("#93633F"), soilDeep = new THREE.Color("#6A4430");
  for (const [x, z] of tiles) {
    for (let i = 0; i < 6; i++) {
      const [ax, az] = hexCorner(x, z, 1, i), [bx, bz] = hexCorner(x, z, 1, i + 1);
      // the triangle (centre, a, b) split into N×N little ones
      const P = (u, w) => vert(x + (ax - x) * u + (bx - ax) * w, 0, z + (az - z) * u + (bz - az) * w);
      for (let r = 0; r < N; r++) for (let k = 0; k <= r; k++) {
        const u0 = r / N, u1 = (r + 1) / N;
        idx.push(P(u0, k / N), P(u1, (k + 1) / N), P(u1, k / N));
        if (k < r) idx.push(P(u0, k / N), P(u0, (k + 1) / N), P(u1, (k + 1) / N));
      }
      // an outer edge (no cell beyond it): the grass lip and the earth under it
      const nx = x + ((ax + bx) / 2 - x) * 2, nz = z + ((az + bz) / 2 - z) * 2;
      if (!has.has(`${Math.round(nx)},${Math.round(nz * 10)}`)) {
        const band = (y0, y1, c0, c1, out0, out1) => {
          const o0 = 1 + out0, o1 = 1 + out1;
          const [a0x, a0z] = hexCorner(x, z, o0, i), [b0x, b0z] = hexCorner(x, z, o0, i + 1), [a1x, a1z] = hexCorner(x, z, o1, i), [b1x, b1z] = hexCorner(x, z, o1, i + 1);
          const a = vert(a0x, y0, a0z, c0), b = vert(b0x, y0, b0z, c0), d = vert(a1x, y1, a1z, c1), e = vert(b1x, y1, b1z, c1);
          idx.push(a, b, d, b, e, d);
        };
        band(0, -0.07, lip, lip, 0, 0.012);
        band(-0.07, -0.18, lip, lip.clone().multiplyScalar(0.8), 0.012, 0);
        band(-0.18, -1.0, soil, soilDeep, -0.004, -0.02);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  m.name = "Lawn"; m.receiveShadow = true;
  return m;
}

// Every cell gets a column of rock under it, longest in the middle, in two or three tapering steps: the island's
// underside reads as stacked basalt, earthy under the grass and lavender stone further down.
function underside(THREE, tiles) {
  const r = rng(42), pos = [], col = [];
  const earth = new THREE.Color("#6A4430"), stone = new THREE.Color("#B3A0E6"), deep = new THREE.Color("#6A55B8");
  const cx = 0, cz = -5.6;
  const quad = (a, b, c, d, ca, cb) => { pos.push(...a, ...b, ...c, ...a, ...c, ...d); col.push(...ca, ...cb, ...cb, ...ca, ...cb, ...ca); };
  for (const [tx, tz] of tiles) {
    let x = tx, z = tz;
    const d = Math.hypot((x - cx) / 9.5, (z - cz) / 8.5);
    const depth = 1.3 + Math.max(0, 1 - d) * 5.6 + r() * 0.8;
    const steps = depth > 4 ? 3 : 2;
    let y0 = -0.99, s0 = 0.985;
    for (let k = 0; k < steps; k++) {
      const y1 = -0.99 - depth * ((k + 1) / steps) * (0.9 + r() * 0.2), s1 = Math.max(0.25, s0 * (0.82 - r() * 0.12));
      const ox = (r() - 0.5) * 0.25, oz = (r() - 0.5) * 0.25;
      const t0 = (-y0 - 1) / 7, t1 = (-y1 - 1) / 7;
      const c0 = k === 0 ? earth : stone.clone().lerp(deep, Math.min(1, t0)), c1 = stone.clone().lerp(deep, Math.min(1, t1));
      for (let i = 0; i < 6; i++) {
        const [ax, az] = hexCorner(x, z, s0, i), [bx, bz] = hexCorner(x, z, s0, i + 1);
        const [cx1, cz1] = hexCorner(x + ox, z + oz, s1, i + 1), [dx, dz] = hexCorner(x + ox, z + oz, s1, i);
        quad([ax, y0, az], [bx, y0, bz], [cx1, y1, cz1], [dx, y1, dz], [c0.r, c0.g, c0.b], [c1.r, c1.g, c1.b]);
      }
      // cap the bottom of the last step with a shallow point
      if (k === steps - 1) for (let i = 0; i < 6; i++) {
        const [ax, az] = hexCorner(x + ox, z + oz, s1, i), [bx, bz] = hexCorner(x + ox, z + oz, s1, i + 1);
        pos.push(x + ox, y1 - 0.15, z + oz, bx, y1, bz, ax, y1, az); col.push(c1.r, c1.g, c1.b, c1.r, c1.g, c1.b, c1.r, c1.g, c1.b);
      }
      y0 = y1; s0 = s1; x += ox; z += oz;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, side: THREE.DoubleSide }));
  m.name = "Underside";
  return m;
}

// ------------------------------------------------------------------ dirt paths
function pathTexture(THREE) {
  // packed sand: a crisp edge with a slightly darker rim, a lighter worn middle, and a scatter of pebbles
  const c = document.createElement("canvas"); c.width = 128; c.height = 512;
  const g = c.getContext("2d"), r = rng(3);
  const grd = g.createLinearGradient(0, 0, 128, 0);
  grd.addColorStop(0, "rgba(196,150,92,0)"); grd.addColorStop(0.07, "rgba(196,150,92,1)"); grd.addColorStop(0.13, "rgba(226,186,124,1)");
  grd.addColorStop(0.5, "rgba(246,220,166,1)"); grd.addColorStop(0.87, "rgba(226,186,124,1)"); grd.addColorStop(0.93, "rgba(196,150,92,1)"); grd.addColorStop(1, "rgba(196,150,92,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 46; i++) {
    const x = 22 + r() * 84, y = r() * 512, rx = 2 + r() * 3.2, ry = 1.5 + r() * 2.2, a = r() * 3;
    g.fillStyle = "rgba(160,118,70,.35)"; g.beginPath(); g.ellipse(x + 0.8, y + 1, rx, ry, a, 0, Math.PI * 2); g.fill();     // its shadow
    g.fillStyle = `rgb(${206 + r() * 30},${178 + r() * 26},${132 + r() * 26})`; g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
function pathMesh(THREE, paths) {
  const mat = new THREE.MeshStandardMaterial({ map: pathTexture(THREE), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  const geos = [];
  for (const pts of paths) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0.012, z)), false, "centripetal");
    const N = Math.max(8, Math.round(curve.getLength() * 8)), W = 0.38, pos = [], uv = [], idx = [];
    let len = 0, prev = null;
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = curve.getPoint(t), tg = curve.getTangent(t), nx = -tg.z, nz = tg.x, nl = Math.hypot(nx, nz) || 1;
      if (prev) len += p.distanceTo(prev); prev = p;
      const w = W * (0.92 + 0.08 * Math.sin(len * 2.3)) * (i === 0 || i === N ? 0.6 : 1);
      pos.push(p.x + (nx / nl) * w, p.y, p.z + (nz / nl) * w, p.x - (nx / nl) * w, p.y, p.z - (nz / nl) * w);
      uv.push(0, len / 1.6, 1, len / 1.6);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.setAttribute("normal", new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => i % 3 === 1 ? 1 : 0), 3)); geos.push(g);
  }
  const m = new THREE.Mesh(mergeGeometries(geos), mat); m.name = "Paths"; m.receiveShadow = true; m.renderOrder = 1;
  return m;
}

// ------------------------------------------------------------------ the pond
const pondEdge = (r, a) => r * (1 + 0.12 * Math.sin(3 * a + 1) + 0.07 * Math.sin(5 * a + 0.3));
function pond(THREE, x, z, r) {
  const g = new THREE.Group(); g.name = "Pond"; g.position.set(x, 0, z);
  const N = 48;
  // a sandy bank, then the water: pale and shallow at the edge, deep blue in the middle
  const ring = (inner, outer, y, cIn, cOut) => {
    const pos = [], col = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      for (const [k, c] of [[inner, cIn], [outer, cOut]]) { const rr = pondEdge(r, a) * k; pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr); col.push(c.r, c.g, c.b); }
      if (i) { const b = (i - 1) * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  };
  const C = h => new THREE.Color(h);
  const bank = new THREE.Mesh(ring(0.92, 1.2, 0.01, C("#E9D29C"), C("#CDE58A")), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  bank.receiveShadow = true;
  const water = new THREE.Mesh(ring(0, 0.97, 0.022, C("#2F8FD8"), C("#8FE3F2")), new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4 }));
  water.receiveShadow = true;
  // a few glints that drift and twinkle on the surface
  const glint = new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.8, depthWrite: false });
  const glints = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.025), glint); m.rotation.x = -Math.PI / 2; m.position.y = 0.03;
    m.userData = { a: i * 1.3, d: 0.2 + (i % 3) * 0.22, ph: i * 2.1 }; g.add(m); glints.push(m);
  }
  g.add(bank, water);
  g.userData.tick = t => glints.forEach(m => {
    const u = m.userData, a = u.a + t * 0.06;
    m.position.x = Math.cos(a) * r * u.d; m.position.z = Math.sin(a) * r * u.d;
    m.scale.setScalar(0.6 + 0.5 * Math.max(0, Math.sin(t * 1.3 + u.ph)));
  });
  return g;
}

// ------------------------------------------------------------------ wind
const wind = { value: 0 };
/** Make a material sway with the wind: vertices move by `aSway` (0 at the roots, 1 at the tips). */
function windy(mat, amount, instanced = false) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uWind = wind;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uWind; attribute float aSway;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vec3 wp = ${instanced ? "instanceMatrix[3].xyz" : "transformed"};
        float sw = sin(uWind * 1.7 + wp.x * 0.55 + wp.z * 0.4) * 0.7 + sin(uWind * 2.9 + wp.x * 1.3) * 0.3;
        transformed.x += sw * ${amount.toFixed(3)} * aSway;
        transformed.z += cos(uWind * 1.3 + wp.z * 0.6) * ${(amount * 0.5).toFixed(3)} * aSway;`);
  };
  mat.customProgramCacheKey = () => `windy${amount}${instanced}`;
  return mat;
}

/** Grass tufts and flowers over the open grass, as two instanced meshes. */
function meadow(THREE, tiles, keepOut) {
  // a tuft: five blades, dark at the root, bright at the tip
  const pos = [], col = [], sway = [], root = new THREE.Color("#5CAE3A"), tip = new THREE.Color("#BDF07A");
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3, lean = 0.05 + (i % 2) * 0.04, h = 0.15 + ((i * 7) % 5) * 0.025, w = 0.03;
    const bx = Math.cos(a) * 0.05, bz = Math.sin(a) * 0.05, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean);
    col.push(root.r, root.g, root.b, root.r, root.g, root.b, tip.r, tip.g, tip.b); sway.push(0, 0, 1);
  }
  const tuft = new THREE.BufferGeometry();
  tuft.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); tuft.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  tuft.setAttribute("aSway", new THREE.Float32BufferAttribute(sway, 1)); tuft.computeVertexNormals();
  // light the blades from above, whichever way they face (no dark backs)
  const n = tuft.getAttribute("normal"); for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  const flower = new THREE.OctahedronGeometry(0.045, 0); flower.translate(0, 0.17, 0);
  flower.setAttribute("aSway", new THREE.Float32BufferAttribute(new Array(flower.getAttribute("position").count).fill(1), 1));
  const r = rng(11), spots = [], blooms = [];
  for (const [x, z] of tiles) for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 1.05, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (keepOut(px, pz)) continue;
    spots.push([px, pz]);
    if (r() < 0.12) blooms.push([px + 0.05, pz + 0.04]);
  }
  const mk = (geo, list, mat, scale, colors) => {
    const m = new THREE.InstancedMesh(geo, mat, list.length), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), M = new THREE.Matrix4();
    const tints = colors && colors.map(c => new THREE.Color(c));
    list.forEach(([x, z], i) => {
      const k = scale * (0.75 + r() * 0.6);
      M.compose(p.set(x, 0, z), q.setFromEuler(e.set(0, r() * Math.PI * 2, 0)), s.set(k, k * (0.8 + r() * 0.5), k));
      m.setMatrixAt(i, M);
      if (tints) m.setColorAt(i, tints[Math.floor(r() * tints.length)]);
    });
    m.receiveShadow = true;
    return m;
  };
  const grass = mk(tuft, spots, windy(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }), 0.06, true), 1);
  const flowers = mk(flower, blooms, windy(new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: "#ffffff", emissiveIntensity: 0.08 }), 0.05, true), 1,
    ["#FFFFFF", "#FFD8F0", "#FFE680", "#FF9FC8", "#CFC4FF"]);
  grass.name = "Grass"; flowers.name = "Flowers";
  return [grass, flowers];
}

// ------------------------------------------------------------------ the stage
export function createKingdom({ url }) {
  let want = { buildings: [], plots: [], treasure: null, raid: null };
  let ctl = null, pending = null, selected = null;
  const k = {
    stage: null,
    /** called when a tap picks a building (its id; `again` when it was already picked) or picks nothing (null) */
    onSelect: null,
    set(s) { want = { buildings: s.buildings ?? [], plots: s.plots ?? [], treasure: s.treasure ?? null, raid: s.raid ?? null }; ctl?.apply(); },
    anchors() { return ctl ? ctl.anchors() : {}; },
    moment(m) { if (ctl) ctl.moment(m); else pending = m; },
    /** pick a building (it bounces and a ring lights up round it), or nothing */
    select(id) { selected = id ?? null; ctl?.select(selected); },
    get selected() { return selected; },
  };
  k.stage = {
    orbit: true,
    controls: { minDistance: 12, maxDistance: 34, minPolarAngle: 36 * DEG, maxPolarAngle: 70 * DEG, minAzimuthAngle: -55 * DEG, maxAzimuthAngle: 55 * DEG, enablePan: false },
    view, background: paintKingdomSky,
    light: { scale: 0.7, env: 1.0, grade: { vibrance: 0.38, contrast: 1.1 } },
    build(ctx) { ctl = build(ctx, url, () => want); if (pending) { ctl.moment(pending); pending = null; } if (selected) ctl.select(selected); return ctl.update; },
    // a tap on the island: the building under it (or nearest the tapped ground), else nothing
    tap(ray) {
      const id = ctl ? ctl.pick(ray) : null, again = !!id && id === selected;
      k.select(id); k.onSelect?.(id, again);
    },
  };
  return k;
}

function build({ THREE, scene, renderer, BLOOM_LAYER, bulbu }, url, getState) {
  // Bulbu stands at the origin; the island sits a little behind it, so Bulbu reads big in front of its kingdom
  const root = new THREE.Group(); root.name = "KingdomStage"; root.position.z = -1.0; scene.add(root);
  const mark = o => { o.traverse(m => { m.userData.noMask = true; }); return o; };
  const B = {};           // id -> { node, levels[], scaffold, plot, mats[], tops[], fog, level, shown }
  let treasure = null, treasureKey = "", coins = null, loaded = false, treasureAt = null, shadowFrames = 0;
  let roads = [], walker = null;
  // Bulbu walks the island at a villager's size (it stands at its spot in front until the island has loaded)
  const BULBU_SIZE = 0.55;
  if (bulbu) { bulbu.node.scale.setScalar(BULBU_SIZE); }
  const floaters = [];

  // sunlight from the upper left (a little behind, so shadows fall towards you and to the right), with soft shadows. The island doesn't move, so the shadow map is drawn only when
  // something changes (a level going up, a plot turning into a building), not every frame.
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  const sun = new THREE.DirectionalLight("#FFEBC8", 2.0);
  sun.position.set(-13, 15, -8); sun.target.position.set(0, 0, -5.5);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 13, bottom: -13, near: 2, far: 40 });
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.025; sun.shadow.radius = 3;
  root.add(sun, sun.target);
  const sky = new THREE.HemisphereLight("#B9D4FF", "#6FB848", 0.42); root.add(sky);   // cool skylight in the shadows, green bounce off the grass
  const reshadow = (n = 2) => { shadowFrames = Math.max(shadowFrames, n); };

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
  const box = new THREE.Box3(), v = new THREE.Vector3();
  function makeFog(b) {
    const g = new THREE.Group(); g.name = b.id + "_Dim";
    // round the building as it is at level 3 (a fair middle size), in the stage's space
    const ref = b.levels[2] ?? b.levels[0];
    const was = ref.visible; ref.visible = true; box.setFromObject(ref); ref.visible = was;
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    root.worldToLocal(c); const minY = box.min.y;
    const mat = fogMat(), r = rng(b.id.length * 31), puffs = [];
    const R = Math.max(size.x, size.z) * 0.55 + 0.4, H = Math.min(size.y, 4.5);
    // mostly a low bank round the base, a few wisps higher up
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + r(), p = new THREE.Sprite(mat), low = i % 3 !== 2;
      p.userData.base = new THREE.Vector3(c.x + Math.cos(a) * R * (0.75 + r() * 0.35), minY + (low ? 0.25 + r() * 0.5 : 0.9 + r() * H * 0.6), c.z + Math.sin(a) * R * (0.75 + r() * 0.35));
      p.userData.s = 1.5 + r() * 1.0; p.userData.ph = r() * 6;
      p.position.copy(p.userData.base); p.scale.setScalar(0.001); p.renderOrder = 3;
      g.add(p); puffs.push(p);
    }
    root.add(g);
    return { group: g, mat, puffs, now: 0, center: c };
  }

  // the Dim raid: a dark storm that gathers over its target building
  const stormMat = new THREE.SpriteMaterial({ map: puffTex, color: "#3F3570", transparent: true, opacity: 0, depthWrite: false });
  const storm = new THREE.Group(); storm.name = "DimRaid"; storm.visible = false; root.add(storm);
  const stormPuffs = [];
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Sprite(stormMat), a = (i / 9) * Math.PI * 2;
    p.userData = { a, r: 1.25 + (i % 3) * 0.35, y: (i % 2) * 0.45, s: 1.7 + (i % 4) * 0.35 };
    p.renderOrder = 4; storm.add(p); stormPuffs.push(p);
  }
  let stormNow = 0, stormGone = 0, stormFor = null;

  new GLTFLoader().load(url, gltf => {
    const k = gltf.scene; k.updateMatrixWorld(true);
    const byName = n => k.getObjectByName(n);

    // ---- the ground and the scenery: baked into two meshes (one sways in the wind)
    const tiles = [];
    byName("Ground")?.children.forEach(t => tiles.push([t.position.x, t.position.z]));
    const still = [], swaying = [];
    let sharedMat = null;
    const bake = (o, sw) => {
      o.traverse(m => {
        if (!m.isMesh) return;
        sharedMat ??= m.material;
        const g = m.geometry.clone();
        for (const a of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(a)) g.deleteAttribute(a);
        if (!g.index) g.setIndex([...Array(g.getAttribute("position").count).keys()]);
        // how far up the tree each vertex is (0 at the trunk's foot, 1 at the top): that's how much it sways
        g.computeBoundingBox();
        const p = g.getAttribute("position"), lo = g.boundingBox.min.y, hi = g.boundingBox.max.y, s = new Float32Array(p.count);
        for (let i = 0; i < p.count; i++) s[i] = sw ? Math.pow(Math.max(0, (p.getY(i) - lo) / Math.max(0.01, hi - lo)), 1.6) : 0;
        g.setAttribute("aSway", new THREE.BufferAttribute(s, 1));
        g.applyMatrix4(m.matrixWorld);
        (sw ? swaying : still).push(g);
      });
      o.parent.remove(o);
    };
    const occluders = [];
    for (const c of byName("Decor")?.children ?? []) {
      box.setFromObject(c); const sz = box.getSize(v);
      if (sz.y > 0.12) occluders.push([c.position.x, c.position.z, Math.max(0.35, Math.max(sz.x, sz.z) * 0.62)]);
    }
    for (const id of KINGDOM_IDS) { const n = byName(id); if (n) occluders.push([n.position.x, n.position.z, 1.45 * n.scale.x]); }
    for (const n of ["Ground", "Decor"]) {
      const g = byName(n); if (!g) continue;
      for (const c of [...g.children]) bake(c, c.name.startsWith("Sway_"));
    }
    // the palette is flat swatches of colour: sample it without mipmaps so far-off pieces keep their exact colours
    // (mipmaps would blend neighbouring swatches into mud)
    if (sharedMat.map) { const t = sharedMat.map; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.anisotropy = 1; t.needsUpdate = true; }
    const groundMat = sharedMat.clone(); groundMat.roughness = 0.85;
    const treeMat = windy(sharedMat.clone(), 0.045); treeMat.roughness = 0.8;
    for (const [geos, mat, name] of [[still, groundMat, "Scenery"], [swaying, treeMat, "Trees"]]) {
      if (!geos.length) continue;
      const m = new THREE.Mesh(mergeGeometries(geos), mat); m.name = name;
      m.castShadow = true; m.receiveShadow = true; root.add(mark(m));
    }
    root.add(mark(lawn(THREE, tiles, occluders)), mark(underside(THREE, tiles)));

    // ---- paths, then grass and flowers everywhere that's open
    const paths = (byName("Paths")?.children ?? []).map(p => p.children.map(c => [c.position.x, c.position.z]));
    byName("Paths")?.removeFromParent();
    if (paths.length) root.add(mark(pathMesh(THREE, paths)));
    roads = paths;
    const pn = byName("Pond"), pondAt = pn ? [pn.position.x, pn.position.z, pn.userData.r ?? 0.95] : null;
    if (pondAt) { const p = pond(THREE, ...pondAt); root.add(mark(p)); floaters.push(p); pn.removeFromParent(); }
    const homes = KINGDOM_IDS.map(id => byName(id)).filter(Boolean).map(n => [n.position.x, n.position.z]);
    const segD = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - t * dx, z - az - t * dz); };
    const keepOut = (x, z) => homes.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 1.25) || paths.some(p => p.some((a, i) => i && segD(x, z, p[i - 1], a) < 0.45))
      || Math.hypot(x, z - 1) < 0.9                                        // Bulbu's spot
      || (pondAt && Math.hypot(x - pondAt[0], z - pondAt[1]) < pondAt[2] * 1.3);
    for (const m of meadow(THREE, tiles, keepOut)) root.add(mark(m));

    // ---- clouds drifting round the island
    for (const c of [...(byName("Clouds")?.children ?? [])]) {
      c.userData.float = rng(c.id)() * 6; c.userData.drift = c.position.x; c.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.roughness = 1; m.material.emissive = new THREE.Color("#ffffff"); m.material.emissiveIntensity = 0.25; } });
      floaters.push(c);
    }

    mark(k); root.add(k);
    k.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    for (const id of KINGDOM_IDS) {
      const node = byName(id); if (!node) continue;
      // each building gets its own copy of the shared palette material, so it can glow and dim on its own
      const mats = new Map();
      node.traverse(o => { if (!o.isMesh) return; const m = o.material; if (!mats.has(m)) { const c = m.clone(); c.userData.base = c.color.clone(); mats.set(m, c); } o.material = mats.get(m); });
      const by = n => node.getObjectByName(n);
      const levels = Array.from({ length: LEVELS }, (_, i) => by(`${id}_L${i + 1}`)).filter(Boolean);
      B[id] = { id, node, baseScale: node.scale.clone(), mats: [...mats.values()], levels, scaffold: by(`${id}_Scaffold`), plot: by(`${id}_Plot`), level: 0, shown: null, pop: null };
      // the top of each level (for labels, the storm and the treasure), in the stage's space
      B[id].tops = [...levels, B[id].plot].map(l => {
        if (!l) return null;
        box.setFromObject(l); const c = box.getCenter(new THREE.Vector3()); c.y = box.max.y; return root.worldToLocal(c);
      });
      levels.forEach(l => { l.visible = false; });
    }
    for (const b of Object.values(B)) b.fog = makeFog(b);
    const coinsAt = byName("Vault_Coins");
    if (coinsAt) {
      coins = new THREE.Group();
      const coinMat = new THREE.MeshStandardMaterial({ color: "#FFCF4D", metalness: 0.75, roughness: 0.3, emissive: "#8A5A00", emissiveIntensity: 0.25 });
      const coinGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.03, 20), r = rng(5);
      for (let i = 0; i < 26; i++) {
        const c = new THREE.Mesh(coinGeo, coinMat), pile = i % 3, a = r() * Math.PI * 2, rr = r() * 0.16;
        c.position.set((pile - 1) * 0.32 + Math.cos(a) * rr, 0.015 + Math.floor(i / 3) * 0.028, Math.sin(a) * rr);
        c.rotation.set((r() - 0.5) * 0.3, r() * 3, (r() - 0.5) * 0.3); c.castShadow = true; coins.add(c);
      }
      mark(coins); coinsAt.add(coins);
    }
    treasureAt = byName("Castle_Treasure");
    if (treasureAt) { mark(orbGroup); treasureAt.add(orbGroup); }
    loaded = true; apply(); reshadow(3);
    walker = bulbu ? makeWalker() : null;
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

  // ---- picking a building: a hex ring of light round its foot, and a little bounce
  const ringMat = new THREE.MeshBasicMaterial({ color: "#FFD84A", transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const selRing = new THREE.Mesh(new THREE.RingGeometry(1.06, 1.34, 6, 1, Math.PI / 6), ringMat);
  selRing.layers.enable(BLOOM_LAYER);
  selRing.rotation.x = -Math.PI / 2; selRing.renderOrder = 2; selRing.visible = false; selRing.name = "Selected";
  const selGlow = new THREE.Mesh(new THREE.CircleGeometry(1.06, 6, Math.PI / 6), new THREE.MeshBasicMaterial({ color: "#FFF2B8", transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3 }));
  selGlow.renderOrder = 2; selGlow.position.z = -0.001; selRing.add(selGlow);   // (in the ring's own plane)
  root.add(mark(selRing));
  let sel = null;
  function select(id) {
    walker?.goTo(id && B[id] ? id : null);
    const b = id && B[id];
    if (sel && sel !== b) { sel.node.scale.copy(sel.baseScale); sel.bounce = null; }
    sel = b || null;
    selRing.visible = !!sel;
    if (!sel) return;
    selRing.position.set(sel.node.position.x, 0.03, sel.node.position.z);
    selRing.scale.setScalar(sel.node.scale.x * (sel.id === "Castle" ? 1.35 : 1));
    sel.bounce = 0;
  }
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
  const shownChain = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  function pick(ray) {
    if (!loaded) return null;
    const live = Object.values(B).filter(b => b.node.visible);
    const hit = ray.intersectObjects(live.map(b => b.node), true).find(h => shownChain(h.object));
    if (hit) return live.find(b => { for (let p = hit.object; p; p = p.parent) if (p === b.node) return true; return false; })?.id ?? null;
    // missed the model: the building nearest the tapped ground, if it's close
    if (!ray.ray.intersectPlane(ground, hitP)) return null;
    root.worldToLocal(hitP);
    let best = null, bd = Infinity;
    for (const b of live) { const d = Math.hypot(hitP.x - b.node.position.x, hitP.z - b.node.position.z) / b.node.scale.x; if (d < bd) { bd = d; best = b; } }
    return best && bd < (best.id === "Castle" ? 1.9 : 1.3) ? best.id : null;
  }

  // ---- Bulbu walking the island: along the dirt paths from one spot to the next, stopping now and then. Pick a
  // building and Bulbu heads there and goes in at the door (the building lights up while it's inside); pick
  // something else, or nothing, and it comes back out.
  function makeWalker() {
    const node = bulbu.node, SPEED = 1.35, r = rng(77);
    // the path network: points every ~0.35 along each path, joined where paths meet
    const pts = [], links = [];
    const add = (x, z) => { pts.push([x, z]); links.push([]); return pts.length - 1; };
    const join = (a, b) => { if (a !== b && !links[a].includes(b)) { links[a].push(b); links[b].push(a); } };
    const near = (x, z, skip) => { let best = -1, bd = Infinity; pts.forEach(([px, pz], i) => { if (skip && skip(i)) return; const d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = i; } }); return [best, bd]; };
    const runs = roads.map(pp => {
      const curve = new THREE.CatmullRomCurve3(pp.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal");
      const n = Math.max(2, Math.round(curve.getLength() / 0.35)), ids = [];
      curve.getSpacedPoints(n).forEach((p, i) => { const k = add(p.x, p.z); if (i) join(ids[ids.length - 1], k); ids.push(k); });
      return ids;
    });
    runs.forEach(ids => {
      for (const end of [ids[0], ids[ids.length - 1]]) {
        const mine = new Set(ids), [k, d] = near(...pts[end], i => mine.has(i));
        if (k >= 0 && d < 0.75) join(end, k);
      }
    });
    const home = add(0, 1.0); join(home, near(0, 1.0, i => i === home)[0]);
    const route = (from, to) => {                                        // shortest way along the paths
      const dist = new Map([[from, 0]]), prev = new Map(), open = [from];
      while (open.length) {
        open.sort((a, b) => dist.get(a) - dist.get(b));
        const c = open.shift(); if (c === to) break;
        for (const n of links[c]) {
          const d = dist.get(c) + Math.hypot(pts[n][0] - pts[c][0], pts[n][1] - pts[c][1]);
          if (d < (dist.get(n) ?? Infinity)) { dist.set(n, d); prev.set(n, c); open.push(n); }
        }
      }
      if (!dist.has(to)) return [to];
      const out = [to]; for (let c = to; prev.has(c); c = prev.get(c)) out.unshift(prev.get(c));
      return out;
    };
    // a building's door: in front of it, at the foot of the model
    const doorOf = b => {
      const a = b.node.rotation.y, s = b.node.scale.x * (b.id === "Castle" ? 1.15 : 0.75);
      return [b.node.position.x + Math.sin(a) * s, b.node.position.z + Math.cos(a) * s];
    };
    const w = { x: 0, z: 1.0, heading: 0, way: [], state: "rest", wait: 3 + r() * 2, goal: null, inside: null, t: 0 };
    const place = () => {
      v.set(w.x, 0, w.z); root.localToWorld(v);
      node.position.set(v.x, v.y, v.z);
      node.rotation.y = w.heading;
    };
    const setWay = (x, z, extra = []) => {
      const [from] = near(w.x, w.z), [to] = near(x, z);
      w.way = [...route(from, to).map(i => pts[i]), ...extra];
      // skip the first point if we're already past it
      if (w.way.length > 1 && Math.hypot(w.way[0][0] - w.x, w.way[0][1] - w.z) < 0.4) w.way.shift();
      w.state = "walk"; bulbu.walk(true);
    };
    const leave = () => {                                                  // come back out of the door
      const b = B[w.inside]; if (!b) { w.inside = null; return; }
      b.home = false; w.inside = null; w.state = "out"; w.t = 0; node.visible = true;
      const [dx, dz] = doorOf(b); w.x = dx; w.z = dz; w.heading = b.node.rotation.y;
    };
    const head = () => {                                                    // go to the goal, or wander
      const b = w.goal && B[w.goal];
      if (b) {
        const [dx, dz] = doorOf(b), a = b.node.rotation.y, s = b.node.scale.x;
        setWay(dx + Math.sin(a) * 0.45 * s, dz + Math.cos(a) * 0.45 * s, [[dx, dz]]);
        w.state = "walk"; w.toDoor = b.id;
      } else {
        w.toDoor = null;
        let k = Math.floor(r() * pts.length);
        for (let i = 0; i < 6 && Math.hypot(pts[k][0] - w.x, pts[k][1] - w.z) < 2.5; i++) k = Math.floor(r() * pts.length);
        setWay(...pts[k]);
      }
    };
    place();
    return {
      goTo(id) {
        if (id === w.goal && (w.inside === id || w.toDoor === id)) return;
        w.goal = id;
        if (w.inside && w.inside !== id) leave();
        else if (w.state !== "out" && w.state !== "in") head();
      },
      update(dt) {
        if (w.state === "rest") {
          bulbu.walk(false);
          if ((w.wait -= dt) <= 0) head();
        } else if (w.state === "walk") {
          let step = SPEED * dt;
          while (step > 0 && w.way.length) {
            const [tx, tz] = w.way[0], dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz);
            if (d > 0.02) {
              const want = Math.atan2(dx, dz); let da = want - w.heading;
              da = Math.atan2(Math.sin(da), Math.cos(da)); w.heading += da * Math.min(1, dt * 9);
            }
            if (d <= step) { w.x = tx; w.z = tz; step -= d; w.way.shift(); }
            else { w.x += (dx / d) * step; w.z += (dz / d) * step; step = 0; }
          }
          if (!w.way.length) {
            const b = w.toDoor && B[w.toDoor];
            if (b && b.shown) { w.state = "in"; w.t = 0; }        // a building: go in
            else if (b) {                                                              // a plot: stop and look at it
              w.state = "wait"; bulbu.walk(false);
              w.heading = Math.atan2(b.node.position.x - w.x, b.node.position.z - w.z);
            } else { w.state = "rest"; w.wait = 2 + r() * 5; }
          }
        } else if (w.state === "in") {                                      // through the door, shrinking away
          const b = B[w.toDoor]; w.t += dt / 0.55;
          const p = Math.min(1, w.t), [dx, dz] = doorOf(b);
          w.heading = b.node.rotation.y + Math.PI;
          w.x = dx - Math.sin(b.node.rotation.y) * 0.35 * p; w.z = dz - Math.cos(b.node.rotation.y) * 0.35 * p;
          node.scale.setScalar(BULBU_SIZE * Math.max(0.001, 1 - p * p));
          if (p >= 1) {
            node.visible = false; bulbu.walk(false); w.state = "inside"; w.inside = b.id; b.home = true; b.visit = 1.4;
            if (sel === b) b.bounce = 0;                                     // the building gives a happy little bounce
            if (w.goal !== b.id) leave();                                  // picked something else on the way in
          }
        } else if (w.state === "out") {                                     // out of the door, popping back up
          w.t += dt / 0.45; const p = Math.min(1, w.t);
          node.scale.setScalar(BULBU_SIZE * (p < 1 ? 1 - Math.pow(1 - p, 3) + Math.sin(p * Math.PI) * 0.15 : 1));
          if (p >= 1) { node.scale.setScalar(BULBU_SIZE); if (w.goal) head(); else { w.state = "rest"; w.wait = 0.6 + r(); } }
        } else if (w.state === "wait" && !w.goal) { w.state = "rest"; w.wait = 0.5; }
        if (node.visible) place();
      },
    };
  }

  // the top of a building as it stands now (its level, or its plot)
  const topOf = b => (b.level ? b.tops[b.level - 1] : b.tops[b.tops.length - 1]) ?? b.node.position;

  // ---- apply the app's state: levels, construction, plots, glow and the Dim
  function apply() {
    if (!loaded) return;
    const s = getState(), on = new Map(s.buildings.map(b => [b.id, b]));
    let changed = false;
    for (const [id, b] of Object.entries(B)) {
      const st = on.get(id), plot = !st && s.plots.includes(id);
      const level = st ? Math.max(1, Math.min(b.levels.length, st.level)) : 0;
      const vis = !!st || plot;
      if (b.node.visible !== vis || (b.plot && b.plot.visible !== plot) || b.level !== level) changed = true;
      b.node.visible = vis;
      if (b.plot) b.plot.visible = plot;
      b.levels.forEach((l, i) => {
        const show = i === level - 1;
        if (show && !l.visible && b.shown !== null) b.pop = { node: l, t: 0 };          // a new level pops up
        l.visible = show;
      });
      const sc = !!st && !!st.building && level < b.levels.length;
      if (b.scaffold) { if (b.scaffold.visible !== sc) changed = true; b.scaffold.visible = sc; }
      b.level = level; b.shown = !!st;
      b.target = { glow: st ? st.glow : 0, fog: st ? st.fog : 0 };
    }
    if (changed) reshadow(2);
    if (sel && !sel.node.visible) select(null);
    // the raid's storm sits over its target; when it's held off it scatters, then goes
    const r = s.raid, tb = r && B[r.id];
    if (tb && r.state !== "defended") {
      const top = topOf(tb);
      storm.position.set(top.x, top.y - 0.7, top.z);                         // round the roof, under its label
      stormFor = { state: r.state, near: Math.max(0, Math.min(1, r.near ?? 0.5)) }; stormGone = 0;
    } else if (stormFor && r?.state === "defended") stormFor = { ...stormFor, state: "defended" };
    else if (!r) stormFor = null;
    // the treasure floats just above the castle's top, whichever level is showing
    if (treasureAt && B.Castle) treasureAt.position.y = (topOf(B.Castle).y + 0.9) / B.Castle.node.scale.y;
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

  const tint = new THREE.Color("#6E648F"), warm = new THREE.Color("#FFC867");
  function update(dt, t) {
    wind.value = t;
    for (const c of floaters) {
      if (c.userData.tick) { c.userData.tick(t); continue; }
      c.position.y += Math.sin(t * 0.5 + c.userData.float) * 0.002; c.position.x = c.userData.drift + Math.sin(t * 0.05 + c.userData.float) * 1.2;
    }
    if (shadowFrames > 0) { renderer.shadowMap.needsUpdate = true; shadowFrames--; }
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
      b.visit = Math.max(b.home ? 0.35 : 0, (b.visit ?? 0) - dt * 0.6);       // lit up while Bulbu's inside
      for (const m of b.mats) { m.color.copy(m.userData.base).lerp(tint, f * 0.6); m.emissive.copy(warm); m.emissiveIntensity = (gl * 0.2 + b.visit * 0.22) * (1 - f); }
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
      // a new level pops up out of the ground with a little bounce
      if (b.pop) {
        const p = (b.pop.t += dt / 0.7), n = b.pop.node;
        const e = p >= 1 ? 1 : 1 - Math.pow(1 - p, 3) + Math.sin(p * Math.PI) * 0.18;
        n.scale.set(0.6 + 0.4 * Math.min(1, e), Math.max(0.001, e), 0.6 + 0.4 * Math.min(1, e));
        if (p >= 1) { n.scale.set(1, 1, 1); b.pop = null; reshadow(2); }
      }
    }
    // the raid's storm: gathers with how near it is, flickers while it strikes, scatters once held off
    if (stormFor) {
      const held = stormFor.state === "defended";
      if (held) stormGone = Math.min(1, stormGone + dt / 2.2);
      const want = held ? 0 : stormFor.state === "striking" ? 0.92 : 0.5 + 0.35 * stormFor.near;
      stormNow += (want - stormNow) * (1 - Math.exp(-dt * 1.5));
      const flash = stormFor.state === "striking" && Math.sin(t * 9.1) * Math.sin(t * 2.3) > 0.93 ? 1 : 0;
      stormMat.color.set(flash ? "#9C8CFF" : "#3F3570");
      stormMat.opacity = Math.min(0.85, stormNow) * (1 - stormGone);
      storm.visible = stormMat.opacity > 0.01;
      const spread = 1 + stormGone * 2.2;
      for (const p of stormPuffs) {
        const u = p.userData, a = u.a + t * 0.12;
        p.position.set(Math.cos(a) * u.r * spread, u.y + Math.sin(t * 0.8 + u.a) * 0.08 + stormGone * 0.8, Math.sin(a) * u.r * spread);
        const sc = u.s * (0.7 + 0.3 * stormNow); p.scale.set(sc * 1.4, sc * 0.65, 1);
      }
      if (held && stormGone >= 1) { stormFor = null; storm.visible = false; }
    } else storm.visible = false;
    walker?.update(dt);
    if (sel) {
      ringMat.opacity = 0.75 + 0.25 * Math.sin(t * 4);
      if (sel.bounce != null) {
        const p = (sel.bounce += dt / 0.45), e = p >= 1 ? 0 : Math.sin(p * Math.PI * 2) * (1 - p) * 0.09;
        sel.node.scale.set(sel.baseScale.x * (1 - e * 0.5), sel.baseScale.y * (1 + e), sel.baseScale.z * (1 - e * 0.5));
        if (p >= 1) { sel.node.scale.copy(sel.baseScale); sel.bounce = null; }
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
      const top = topOf(b);
      v.set(top.x, top.y + 0.45, top.z);
      root.localToWorld(v);
      out[id] = [v.x, v.y, v.z];
    }
    return out;
  }

  return { update, apply, anchors, moment, pick, select };
}
