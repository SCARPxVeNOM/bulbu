// Builds public/kingdom.glb: Bulbu's kingdom, assembled from the Kenney Fantasy Town Kit (CC0) and the Low Poly Arena
// (De Alpe Game Art, free for commercial use). The app drives it through named nodes:
//
//   <Building>              one per goal kind: Castle, Library, Vault, Arena, Observatory, Workshop
//   <Building>_F1.._F5      the floors, shown up to the building's level
//   <Building>_Roof         sits on the top floor (the app moves it to the current level)
//   <Building>_Scaffold     poles and planks round the next floor while it's being built
//   <Building>_Plot         an empty plot, shown when there's no goal for that building yet
//   Castle_Treasure         where the Goal Treasure floats (the app puts the orb or the goal's photo here)
//   Observatory_Dome        where the glass dome sits; Vault_Coins where the coin piles go
//   Decor                   trees, rocks, lanterns, stalls, the fountain and the path
//
// Kenney pieces snap to a 1-unit grid. Walls are cell-centred with the wall on the +X face, so a cell's four sides
// are the same piece turned 0/90/180/270° about Y. Floors stack at y = 0, 1, 2…
//
//   node apps/web/scripts/build-kingdom.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO, TextureInfo } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, mergeDocuments, prune, unpartition } from "@gltf-transform/functions";

const here = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(here, "../assets/kingdom"), OUT = path.join(here, "../public/kingdom.glb");
const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(path.join(ASSETS, "kenney/planks.glb"));   // a Kenney piece as the base keeps the buffers simple
const root = doc.getRoot();
const scene = root.listScenes()[0];
scene.listChildren().forEach(n => { scene.removeChild(n); n.dispose(); });

const kingdom = doc.createNode("Kingdom");
scene.addChild(kingdom);

const cache = new Map();
const quatY = deg => { const a = (deg * Math.PI) / 360; return [0, Math.sin(a), 0, Math.cos(a)]; };
const group = (parent, name, pos = [0, 0, 0], rotY = 0, scale = 1) => {
  const n = doc.createNode(name).setTranslation(pos).setRotation(quatY(rotY)).setScale([scale, scale, scale]);
  parent.addChild(n); return n;
};
/** Copy a piece (file name in the kit, or a full path) into the kingdom under `parent`. */
async function place(parent, piece, pos = [0, 0, 0], rotY = 0, scale = 1, name) {
  const file = piece.endsWith(".glb") ? piece : path.join(ASSETS, "kenney", piece + ".glb");
  if (!cache.has(file)) cache.set(file, await io.read(file));
  const map = mergeDocuments(doc, cache.get(file));
  const src = map.get(cache.get(file).getRoot().listScenes()[0]);
  const s = Array.isArray(scale) ? scale : [scale, scale, scale];
  const n = doc.createNode(name ?? path.basename(piece, ".glb")).setTranslation(pos).setRotation(quatY(rotY)).setScale(s);
  for (const c of src.listChildren()) { src.removeChild(c); n.addChild(c); }
  src.dispose();
  parent.addChild(n);
  return n;
}

// ---- building blocks
const FACES = [["+x", 0], ["-z", 90], ["-x", 180], ["+z", 270]];
const cells = (w, d) => { const out = []; for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) out.push([i - (w - 1) / 2, j - (d - 1) / 2, i, j]); return out; };
/** The walls round one floor of a w×d building. pick(face, i, j) chooses the piece for each outer side. */
async function ring(parent, w, d, y, pick) {
  for (const [x, z, i, j] of cells(w, d)) for (const [face, rot] of FACES) {
    const outer = (face === "+x" && i === w - 1) || (face === "-x" && i === 0) || (face === "+z" && j === d - 1) || (face === "-z" && j === 0);
    if (outer) await place(parent, pick(face, i, j), [x, y, z], rot);
  }
}
/** An empty plot: a low fence round a w×d square, open at the front, with a flag in the middle. */
async function fencedPlot(parent, w, d) {
  for (const [x, z, i, j] of cells(w, d)) for (const [face, rot] of FACES) {
    const outer = (face === "+x" && i === w - 1) || (face === "-x" && i === 0) || (face === "-z" && j === 0);
    if (outer) await place(parent, "fence", [x, 0, z], rot, [1, 0.8, 1]);
  }
  await place(parent, "banner-green", [0, 0.1, 0], 270, [1, 0.8, 1]);
}
/** Floors F1..Fn, a roof, scaffolding for the next floor and an empty plot. */
async function building(name, { at, rot = 0, scale = 1, w = 1, d = 1, floors, pick, roof }) {
  const b = group(kingdom, name, at, rot, scale);
  for (let f = 1; f <= floors; f++) await ring(group(b, `${name}_F${f}`, [0, f - 1, 0]), w, d, 0, (face, i, j) => pick(f, face, i, j));
  if (roof) await roof(group(b, `${name}_Roof`, [0, floors, 0]));
  // scaffolding: poles on every outer side, a planked deck on top, a touch larger than the walls
  const sc = group(b, `${name}_Scaffold`, [0, floors, 0]);
  await ring(group(sc, `${name}_ScaffoldPoles`, [0, 0, 0], 0, 1.12), w, d, 0, () => "poles");
  for (const [x, z] of cells(w, d)) await place(sc, "planks", [x * 1.12, 1, z * 1.12], 0, 1.12);
  await fencedPlot(group(b, `${name}_Plot`), Math.max(w, 2), Math.max(d, 2));
  return b;
}

// ---- the castle: the user's main goal. A two-cell keep with corner towers; the Goal Treasure floats above it.
const castle = await building("Castle", {
  at: [0, 0, -5.6], w: 2, d: 2, floors: 3, scale: 1.05,
  pick: (f, face, i) => f === 1 && face === "+z" ? (i === 0 ? "wall-doorway-round" : "wall-window-stone") : f === 3 ? "wall-window-stone" : "wall",
  roof: async r => { await place(r, "roof-high-point", [0, 0, 0], 0, [2.0, 1.25, 2.0]); },
});
for (const [x, z] of [[-1.35, -1.35], [1.35, -1.35], [-1.35, 1.35], [1.35, 1.35]]) {
  const t = group(castle, "Castle_Tower", [x, 0, z]);
  for (let f = 0; f < 3; f++) await place(t, "wall-rounded", [0, f, 0], 0, 0.7);
  await place(t, "roof-point", [0, 2.1, 0], 0, 0.8);
}
await place(castle, "banner-red", [0, 1.1, 0.62], 270, 1, "Castle_Banner");
group(castle, "Castle_Treasure", [0, 5.2, 0]);

// ---- Library Tower (coding / DSA): a tall, narrow tower of glass-windowed floors
await building("Library", {
  at: [-3.7, 0, -2.6], rot: 20, scale: 1.15, floors: 5,
  pick: (f, face) => f === 1 && face === "+z" ? "wall-door" : f % 2 ? "wall-window-glass" : "wall-window-round",
  roof: async r => { await place(r, "roof-high-point", [0, 0, 0], 0, 1.05); },
});

// ---- Vault (savings): a squat stone strongroom with a flat roof and coin piles at the door
await building("Vault", {
  at: [3.7, 0, -2.6], rot: -20, scale: 1.1, w: 2, d: 1, floors: 3,
  pick: (f, face, i) => f === 1 && face === "+z" && i === 0 ? "wall-door" : "wall-block",
  roof: async r => { for (const x of [-0.5, 0.5]) await place(r, "roof-flat", [x, 0, 0]); await place(r, "chimney", [0.5, 0.1, 0]); },
});
group(kingdom.listChildren().find(n => n.getName() === "Vault"), "Vault_Coins", [0.5, 0, 0.95]);

// ---- Observatory (reading / learning): round windows, and a glass dome the app puts on top
await building("Observatory", {
  at: [4.7, 0, -7.4], rot: -35, scale: 1.1, floors: 3,
  pick: (f, face) => f === 1 && face === "+z" ? "wall-doorway-square" : "wall-window-round",
  roof: async r => { await place(r, "roof-flat", [0, 0, 0], 0, 1.1); group(r, "Observatory_Dome", [0, 0.13, 0]); },
});

// ---- Workshop (any other goal): a timber house
await building("Workshop", {
  at: [-1.2, 0, -9.4], rot: 10, scale: 1.05, floors: 3,
  pick: (f, face) => f === 1 && face === "+z" ? "wall-wood-door" : "wall-wood-window-shutters",
  roof: async r => { await place(r, "roof-high-point", [0, 0, 0], 0, 1.05); },
});

// ---- Arena (fitness): the Low Poly Arena, scaled to the grid (it's ~50 units wide); its levels are banners round
// the rim, so its floors are empty groups the app counts
const arena = group(kingdom, "Arena", [-4.9, 0, -7.6], 25);
await place(arena, path.join(ASSETS, "arena/LowPolyArena.glb"), [0, 0.07, 0], 0, 0.075, "Arena_Model");
for (let f = 1; f <= 5; f++) {
  const fl = group(arena, `Arena_F${f}`);
  const a = (f / 5) * Math.PI * 1.6 - Math.PI * 0.8;
  await place(fl, f % 2 ? "banner-red" : "banner-green", [Math.sin(a) * 1.75, 1.0, Math.cos(a) * 1.75], (a * 180) / Math.PI + 90, 0.9);
}
const asc = group(arena, "Arena_Scaffold", [0, 1.45, 0]);
for (const [x, z, r] of [[1.6, 0.6, 0], [-1.6, 0.6, 180], [0, 1.8, 270]]) await place(asc, "poles", [x, 0, z], r, [1, 0.8, 1]);
await fencedPlot(group(arena, "Arena_Plot"), 3, 3);

// ---- decor: the path from Bulbu to the castle, trees round the rim, rocks, lanterns, stalls and the fountain
const decor = group(kingdom, "Decor");
for (const z of [-1.2, -2.2, -3.2]) await place(decor, "road", [0, 0.001, z]);
for (const [x, z] of [[-1.5, 0.6], [1.5, 0.6], [-1.3, -3.6], [1.3, -3.6]]) await place(decor, "lantern", [x, 0, z]);
await place(decor, "fountain-round", [-2.0, 0, 0.9], 0, 0.75);
await place(decor, "stall-red", [2.3, 0, -0.1], -30);
await place(decor, "stall-green", [5.4, 0, -4.9], -60);
await place(decor, "cart", [-2.4, 0, -4.9], 40);
const trees = [[-6.6, -1.0, "tree-high-round"], [-7.0, -4.6, "tree"], [-6.0, -10.0, "tree-high"], [-3.2, -11.0, "tree-crooked"],
  [2.6, -11.2, "tree-high-round"], [6.2, -10.0, "tree"], [7.2, -4.4, "tree-high-crooked"], [6.6, -0.6, "tree-high"],
  [-5.0, 1.4, "tree"], [5.0, 1.6, "tree-high-round"], [2.4, -7.4, "tree"], [-2.4, -7.0, "tree-high"]];
for (const [x, z, t] of trees) await place(decor, t, [x, 0, z], (x * 37) % 360, 1.1);
for (const [x, z, r] of [[-6.2, -6.8, "rock-large"], [6.9, -7.6, "rock-wide"], [-3.8, 1.5, "rock-small"], [4.0, -0.4, "rock-small"], [0.8, -11.4, "rock-large"]])
  await place(decor, r, [x, 0, z], (z * 53) % 360, 0.9);
for (const x of [-0.75, 0.75]) await place(decor, "hedge", [x, 0, -4.1], 0);

// ---- the arena's pixel-art palette must not be filtered (it's 3×4 pixels)
for (const m of root.listMaterials()) {
  const info = m.getBaseColorTextureInfo(), tex = m.getBaseColorTexture();
  if (info && tex && (tex.getSize()?.[0] ?? 99) <= 8) info.setMagFilter(TextureInfo.MagFilter.NEAREST).setMinFilter(TextureInfo.MinFilter.NEAREST);
}

await doc.transform(unpartition(), dedup(), prune({ keepLeaves: true, keepAttributes: true }));
await io.write(OUT, doc);
let tris = 0;
for (const n of root.listNodes()) { const m = n.getMesh(); if (m) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3; }
if (process.env.LIST_PIECES) console.log([...cache.keys()].map(f => path.relative(ASSETS, f)).sort().join("\n"));
console.log(`kingdom.glb: ${root.listNodes().length} nodes, ${root.listMeshes().length} meshes, ~${Math.round(tris)} triangles (instanced pieces counted once per node)`);
