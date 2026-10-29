// Builds public/kingdom.glb: Bulbu's kingdom, a floating island of hex tiles assembled from the KayKit Medieval
// Hexagon Pack (CC0, Kay Lousberg). The app drives it through named nodes:
//
//   <Building>              one per goal kind: Castle, Library, Vault, Arena, Observatory, Workshop
//   <Building>_L1.._L5      the building at each level; the app shows the one for the building's level (a new level
//                           swaps the model, like an upgrade, and gets richer: walls, side towers, banners, props)
//   <Building>_Scaffold     scaffolding and building materials beside it while the next level is being built
//   <Building>_Plot         an empty plot (dirt, a pile of stone and timber, a flag) when there's no goal for it yet
//   Castle_Treasure         where the Goal Treasure floats (the app lifts it above whichever level is showing)
//   Vault_Coins             where the coin piles go
//   Ground                  a node per hex cell (Tile_<q>_<r>): the app builds the lawn and the rock under it from these
//   Decor                   forests, mountains, hills, rocks and props (Sway_* nodes sway in the wind)
//   Clouds                  a few clouds drifting round the island
//
// Cells are KayKit-sized hexes, 2 units across the flats (x) and 2.31 point to point (z), with the grass at y = 0.
// They use axial coordinates (q, r) round the castle: x = 2q + r, z = CZ + r·√3.
//
// Source pieces live in assets/kingdom/kaykit (only the ones used, with the palette retinted: see CREDITS.md). With
// KAYKIT=<path to the pack's gltf folder> any missing piece is copied in from the pack first.
//
//   node apps/web/scripts/build-kingdom.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, mergeDocuments, prune, unpartition } from "@gltf-transform/functions";

const here = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(here, "../assets/kingdom/kaykit"), OUT = path.join(here, "../public/kingdom.glb");
const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const base = await io.read(file("rock_single_A"));   // any piece as the base document keeps the buffers simple
const root = base.getRoot(), scene = root.listScenes()[0];
scene.listChildren().forEach(n => { scene.removeChild(n); n.dispose(); });
const kingdom = base.createNode("Kingdom"); scene.addChild(kingdom);

// ---- pieces
function file(name) {
  const flat = path.basename(name), out = path.join(KIT, flat + ".gltf");
  if (!fs.existsSync(out) && process.env.KAYKIT) {
    const dirs = ["buildings/blue", "buildings/green", "buildings/red", "buildings/yellow", "buildings/neutral", "decoration/nature", "decoration/props", "tiles/base", "tiles/coast", "tiles/rivers", "tiles/roads"];
    const dir = dirs.map(d => path.join(process.env.KAYKIT, d)).find(d => fs.existsSync(path.join(d, flat + ".gltf")));
    if (!dir) throw new Error(`no KayKit piece called ${flat}`);
    for (const ext of [".gltf", ".bin"]) fs.copyFileSync(path.join(dir, flat + ext), path.join(KIT, flat + ext));
  }
  if (!fs.existsSync(out)) throw new Error(`missing ${out} (set KAYKIT to the pack's gltf folder to copy it in)`);
  return out;
}
const cache = new Map();
const quatY = deg => { const a = (deg * Math.PI) / 360; return [0, Math.sin(a), 0, Math.cos(a)]; };
const group = (parent, name, pos = [0, 0, 0], rotY = 0, scale = 1) => {
  const n = base.createNode(name).setTranslation(pos).setRotation(quatY(rotY)).setScale([scale, scale, scale]);
  parent.addChild(n); return n;
};
/** Copy a KayKit piece into the kingdom under `parent`. */
async function place(parent, piece, pos = [0, 0, 0], rotY = 0, scale = 1, name) {
  const f = file(piece);
  if (!cache.has(f)) cache.set(f, await io.read(f));
  const map = mergeDocuments(base, cache.get(f));
  const src = map.get(cache.get(f).getRoot().listScenes()[0]);
  const s = Array.isArray(scale) ? scale : [scale, scale, scale];
  const n = base.createNode(name ?? path.basename(piece)).setTranslation(pos).setRotation(quatY(rotY)).setScale(s);
  for (const c of src.listChildren()) { src.removeChild(c); n.addChild(c); }
  src.dispose();
  parent.addChild(n);
  return n;
}

// ---- the hex grid
const CZ = -5.6, S3 = Math.sqrt(3);
const hx = (q, r) => [2 * q + r, CZ + r * S3];
const dist = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
const cellAt = (x, z) => { const r = Math.round((z - CZ) / S3); return [Math.round((x - r) / 2), r]; };
const key = (q, r) => `${q}_${r}`;
// the island: everything within 4 of the castle, a little more in front (where Bulbu stands), a corner or two less
const cells = new Map();
for (let q = -6; q <= 6; q++) for (let r = -6; r <= 6; r++) if (dist(q, r) <= 4) cells.set(key(q, r), [q, r]);
for (const [q, r] of [[-2, 5], [-3, 5], [-1, 5], [-5, 3], [4, -5], [5, -1]]) cells.set(key(q, r), [q, r]);
for (const k of ["4_-4", "-4_0"]) cells.delete(k);

// what stands on each cell
const used = new Map();     // key -> what's there (a building, the path, decor)
const claim = (x, z, what) => { const [q, r] = cellAt(x, z); used.set(key(q, r), what); };

// ---- buildings: one model per level (KayKit's colours: blue, green, red, yellow)
const B = (kind, color) => `building_${kind}_${color}`;
const SPOTS = {
  Castle: { x: 0, z: CZ, rot: 0, scale: 1.12 },
  Library: { at: hx(-3, 2), rot: 25, scale: 1.25 },
  Vault: { at: hx(1, 2), rot: -25, scale: 1.25 },
  Arena: { at: hx(-2, -1), rot: 30, scale: 1.25 },
  Observatory: { at: hx(3, -1), rot: -30, scale: 1.25 },
  Workshop: { at: hx(0, -3), rot: 15, scale: 1.25 },
};
/** Each level: [piece, x, z, rotY, scale] parts, in the building's own space (+z faces Bulbu). */
const LEVELS = {
  Castle: [
    [[B("tower_A", "yellow"), 0, 0, 0, 1.05], ["flag_yellow", 0.75, 0.55, 0, 1]],
    [[B("barracks", "yellow"), 0, 0, 0, 1.05], ["flag_yellow", 1.0, 0.85, 0, 1]],
    [[B("castle", "yellow"), 0, 0, 0, 1.12], ["flag_yellow", 1.15, 0.95, 0, 1], ["flag_yellow", -1.15, 0.95, 0, 1]],
    [[B("castle", "yellow"), 0, 0, 0, 1.2], [B("tower_A", "yellow"), -1.75, 0.95, 0, 0.6], [B("tower_A", "yellow"), 1.75, 0.95, 0, 0.6],
     ["flag_yellow", 1.3, 1.25, 0, 1], ["flag_yellow", -1.3, 1.25, 0, 1]],
    [[B("castle", "yellow"), 0, 0, 0, 1.28], ["wall_straight", -1.8, 0.0, 90, 0.75], ["wall_straight", 1.8, 0.0, 90, 0.75],
     [B("tower_A", "yellow"), -1.85, 1.05, 0, 0.64], [B("tower_A", "yellow"), 1.85, 1.05, 0, 0.64],
     ["flag_yellow", -1.85, -0.95, 0, 1.2], ["flag_yellow", 1.85, -0.95, 0, 1.2]],
  ],
  Library: [
    [[B("home_A", "blue"), 0, 0, 0, 1.05], ["crate_A_small", 0.55, 0.45, 20, 1]],
    [[B("home_B", "blue"), 0, 0, 0, 1.05], ["barrel", 0.6, 0.5, 0, 1], ["crate_A_small", -0.55, 0.5, 10, 1]],
    [[B("church", "blue"), 0, 0, 0, 1.05], ["barrel", 0.65, 0.6, 0, 1]],
    [[B("church", "blue"), 0.1, -0.1, 0, 1.15], [B("home_A", "blue"), -0.75, 0.5, 30, 0.6], ["flag_blue", 0.75, 0.65, 0, 0.9]],
    [[B("church", "blue"), 0.25, -0.15, 0, 1.2], [B("tower_A", "blue"), -0.75, 0.25, 0, 0.62], ["flag_blue", 0.85, 0.7, 0, 0.9], ["crate_A_big", -0.2, 0.85, 15, 0.9]],
  ],
  Vault: [
    [[B("mine", "green"), 0, 0, 0, 0.85]],
    [[B("mine", "green"), 0, -0.1, 0, 0.95], ["crate_B_small", 0.75, 0.55, 15, 1], ["barrel", -0.75, 0.6, 0, 1]],
    [[B("mine", "green"), 0, -0.15, 0, 1.05], ["wheelbarrow", 0.75, 0.6, -30, 1], ["sack", -0.75, 0.65, 0, 1], ["crate_B_big", -0.9, 0.2, 10, 0.9]],
    [[B("mine", "green"), -0.25, -0.2, 0, 1.05], [B("market", "green"), 0.65, 0.45, -20, 0.6], ["sack", -0.85, 0.7, 0, 1]],
    [[B("mine", "green"), -0.25, -0.25, 0, 1.12], [B("market", "green"), 0.7, 0.45, -20, 0.68], ["wheelbarrow", -0.8, 0.75, 30, 1], ["flag_green", 0.95, -0.35, 0, 0.9]],
  ],
  Arena: [
    [["tent", -0.25, 0, 20, 1.1], ["target", 0.55, 0.35, -20, 1.1], ["weaponrack", -0.6, 0.6, 30, 1]],
    [[B("archeryrange", "red"), 0, 0, 0, 0.9]],
    [[B("archeryrange", "red"), 0, 0, 0, 1.02], ["weaponrack", -0.85, 0.6, 30, 1]],
    [[B("archeryrange", "red"), 0.1, 0, 0, 1.1], ["target", -0.9, 0.55, 20, 1], ["weaponrack", 0.95, 0.65, -20, 1], ["flag_red", -0.9, -0.5, 0, 0.9]],
    [[B("barracks", "red"), 0.1, -0.1, 0, 1.0], ["target", -1.0, 0.65, 25, 1], ["target", -1.15, 0.05, 40, 1], ["weaponrack", 0.95, 0.75, -20, 1], ["flag_red", 1.0, -0.55, 0, 0.9]],
  ],
  Observatory: [
    [[B("tower_base", "blue"), 0, 0, 0, 1.0], ["crate_A_small", 0.55, 0.45, 20, 1]],
    [[B("tower_A", "blue"), 0, 0, 0, 0.85]],
    [[B("tower_A", "blue"), 0, 0, 0, 1.0], ["barrel", 0.6, 0.5, 0, 1]],
    [[B("tower_B", "blue"), 0, 0, 0, 1.05], [B("home_A", "blue"), 0.75, 0.45, -30, 0.55]],
    [[B("tower_B", "blue"), -0.1, -0.1, 0, 1.15], [B("home_A", "blue"), 0.8, 0.45, -30, 0.58], ["flag_blue", -0.8, 0.6, 0, 0.9]],
  ],
  Workshop: [
    [[B("blacksmith", "yellow"), 0, 0, 0, 0.85]],
    [[B("blacksmith", "yellow"), 0, 0, 0, 1.0], ["resource_lumber", 0.75, 0.55, 20, 0.9]],
    [[B("lumbermill", "yellow"), 0, 0, 0, 1.0], ["resource_lumber", 0.8, 0.55, 20, 0.9], ["resource_stone", -0.8, 0.55, 0, 0.9]],
    [[B("lumbermill", "yellow"), -0.35, -0.1, 0, 1.0], [B("blacksmith", "yellow"), 0.65, 0.4, -25, 0.62]],
    [[B("windmill", "yellow"), -0.35, -0.2, 0, 1.15], [B("blacksmith", "yellow"), 0.7, 0.4, -25, 0.62], ["resource_lumber", -0.85, 0.7, 30, 0.9]],
  ],
};
const PLOT_FLAG = { Castle: "flag_yellow", Library: "flag_blue", Vault: "flag_green", Arena: "flag_red", Observatory: "flag_blue", Workshop: "flag_yellow" };

for (const [id, spot] of Object.entries(SPOTS)) {
  const [x, z] = spot.at ?? [spot.x, spot.z];
  const b = group(kingdom, id, [x, 0, z], spot.rot, spot.scale);
  claim(x, z, id);
  for (const [i, parts] of LEVELS[id].entries()) {
    const lv = group(b, `${id}_L${i + 1}`);
    for (const [piece, px, pz, pr, ps] of parts) await place(lv, piece, [px, 0, pz], pr, ps);
  }
  // being built: scaffolding to one side, a pile of timber and stone to the other
  const sc = group(b, `${id}_Scaffold`);
  await place(sc, "building_scaffolding", [0.95, 0, 0.55], -20, 0.55);
  await place(sc, "resource_lumber", [-0.95, 0, 0.75], 25, 0.85);
  await place(sc, "resource_stone", [-0.55, 0, 1.05], 0, 0.8);
  // no goal yet: a dirt plot with a pile of materials and a flag
  const plot = group(b, `${id}_Plot`);
  await place(plot, "building_dirt", [0, 0.005, 0], 0, 0.95);
  await place(plot, "building_stage_A", [-0.15, 0, -0.1], 0, 0.95);
  await place(plot, PLOT_FLAG[id], [0.55, 0, 0.45], 0, 1);
}
group(kingdom.listChildren().find(n => n.getName() === "Castle"), "Castle_Treasure", [0, 5.2, 0]);
group(kingdom.listChildren().find(n => n.getName() === "Vault"), "Vault_Coins", [0.05, 0, 0.95]);
// the castle's walls reach into the cells beside it, and the path runs from Bulbu to the gate: keep those clear
for (const x of [-2, 2]) claim(x, CZ, "Castle");
for (const [q, r] of [[0, 4], [0, 3], [-1, 3], [0, 2], [-1, 2], [0, 1], [-1, 1], [-2, 5], [-1, 5]]) used.set(key(q, r), "path");

// ---- dirt paths: from Bulbu to the castle gate, and on to each building's door (the app lays them as ribbons)
const PATHS = [
  [[0, 1.6], [0.3, 0.2], [0.05, -1.4], [-0.2, -2.8], [0, -4.0]],
  [[0.2, -0.4], [-1.2, -0.2], [-2.4, -0.75], [-3.3, -1.25]],
  [[0.1, -1.6], [1.4, -1.45], [2.5, -1.2], [3.3, -1.3]],
  [[-0.15, -2.9], [-1.5, -3.25], [-2.9, -3.7], [-3.75, -5.0], [-4.3, -6.1]],
  [[0, -3.6], [1.6, -3.45], [3.0, -4.0], [3.85, -5.1], [4.3, -6.1]],
  [[-3.6, -4.7], [-3.4, -6.4], [-2.6, -7.9], [-2.6, -9.3]],
];
const paths = group(kingdom, "Paths");
PATHS.forEach((pts, i) => { const p = group(paths, `Path_${i}`); pts.forEach(([x, z], j) => group(p, `Path_${i}_${j}`, [x, 0, z])); });
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - t * dx, z - az - t * dz); };
const nearPath = (x, z, d) => PATHS.some(p => p.some((a, i) => i && segDist(x, z, p[i - 1], a) < d)) || nearPond(x, z, d * 0.6);

// ---- a pond on the lawn, front left (the app lays the water; lilies and reeds come from the kit)
const POND = { x: -2.9, z: 1.0, r: 0.95 };
group(kingdom, "Pond", [POND.x, 0, POND.z]).setExtras({ r: POND.r });
used.set(key(...cellAt(POND.x, POND.z)), "pond");
const nearPond = (x, z, d) => Math.hypot(x - POND.x, z - POND.z) < POND.r + d;

// ---- decor
const decor = group(kingdom, "Decor");
let sway = 0;
const tree = (piece, pos, rot, s) => place(decor, piece, pos, rot, s, `Sway_${piece}_${sway++}`);
const r01 = (() => { let s = 99; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
// the far edge: mountains and wooded hills behind the castle
const BACK = [[-1, -3, "mountain_A_grass_trees", 1.25], [0, -4, "mountain_B_grass_trees", 1.35], [1, -4, "mountain_C_grass_trees", 1.2],
  [2, -4, "mountain_A_grass_trees", 1.15], [4, -5, "hills_B_trees", 1.0], [-1, -4 + 1, null, 0], [3, -4, "hills_C_trees", 1.05],
  [-2, -2, "hills_A_trees", 1.0], [1, -3, "hills_B_trees", 0.9]];
for (const [q, r, piece, s] of BACK) {
  if (!piece || !cells.has(key(q, r)) || used.has(key(q, r))) continue;
  const [x, z] = hx(q, r); await place(decor, piece, [x, 0, z], r01() * 360, s); used.set(key(q, r), "decor");
}
// forests round the rim, single trees and rocks further in, and a few props
const outer = [...cells.values()].filter(([q, r]) => !used.has(key(q, r)) && (dist(q, r) >= 4 || r >= 5 || (q === 5 && r === -1)));
const FOREST = ["trees_B_large", "trees_A_large", "trees_B_medium", "trees_A_medium"];
for (const [q, r] of outer) {
  const [x, z] = hx(q, r);
  if (z > -0.5) {                                                         // the front edge, near Bulbu: low and open
    if (Math.abs(x) < 2.5 || nearPond(x, z, 1.2)) { used.set(key(q, r), "open"); continue; }
    await tree(r01() < 0.5 ? "tree_single_B" : "tree_single_A", [x + (r01() - 0.5) * 0.6, 0, z + (r01() - 0.5) * 0.4], r01() * 360, 1.0 + r01() * 0.25);
    await place(decor, "rock_single_" + "ABCDE"[Math.floor(r01() * 5)], [x - 0.5, 0, z + 0.3], r01() * 360, 1.6);
  } else if (!nearPath(x, z, 1.5)) await tree(FOREST[Math.floor(r01() * FOREST.length)], [x, 0, z], Math.floor(r01() * 6) * 60, 0.95 + r01() * 0.15);
  used.set(key(q, r), "decor");
}
// inner cells: a scatter of single trees, rocks and hills, leaving most of the grass open
for (const [q, r] of cells.values()) {
  if (used.has(key(q, r))) continue;
  const [x, z] = hx(q, r), roll = r01();
  if (z > -1.0 && Math.abs(x) < 3) continue;                              // Bulbu's lawn
  if (roll < 0.45) {
    for (let i = 0, n = 1 + Math.floor(r01() * 2); i < n; i++) {
      const tx = x + (r01() - 0.5) * 1.2, tz = z + (r01() - 0.5) * 1.2;
      if (!nearPath(tx, tz, 0.75)) await tree(r01() < 0.5 ? "tree_single_A" : "tree_single_B", [tx, 0, tz], r01() * 360, 0.95 + r01() * 0.3);
    }
  } else if (roll < 0.75) { const rx = x + (r01() - 0.5), rz = z + (r01() - 0.5); if (!nearPath(rx, rz, 0.6)) await place(decor, "rock_single_" + "ABCDE"[Math.floor(r01() * 5)], [rx, 0, rz], r01() * 360, 1.8); }
}
// lilies on the pond, reeds at its edge
for (const [a, d, piece, s] of [[0.4, 0.45, "waterlily_A", 1.1], [2.3, 0.35, "waterlily_B", 1.1], [4.2, 0.55, "waterlily_A", 0.9],
  [1.2, 1.0, "waterplant_B", 1.7], [3.4, 1.02, "waterplant_A", 1.6], [5.3, 0.98, "waterplant_C", 1.7], [2.5, 1.05, "waterplant_C", 1.4]])
  await (piece.startsWith("waterplant") ? tree : (pc, pos, rot, sc) => place(decor, pc, pos, rot, sc))(piece, [POND.x + Math.cos(a) * POND.r * d, 0.02, POND.z + Math.sin(a) * POND.r * d], a * 57, s);
// little touches round the path
await place(decor, "barrel", [1.0, 0, -1.6], 0, 1);
await place(decor, "crate_A_big", [-1.15, 0, -2.2], 20, 1);
await place(decor, "bucket_water", [1.25, 0, -2.0], 0, 1);

// ---- the ground: one (empty) node per cell; the app lays a seamless lawn over them and the rock underneath
const ground = group(kingdom, "Ground");
for (const [q, r] of cells.values()) {
  const [x, z] = hx(q, r);
  group(ground, `Tile_${q}_${r}`, [x, 0, z]);
}

// ---- clouds drifting round the island
const clouds = group(kingdom, "Clouds");
for (const [x, y, z, s, piece] of [[-12.5, -1.5, -3, 1.2, "cloud_big"], [12.8, -2.6, -6.5, 1.0, "cloud_big"], [-10.5, -4.2, -10.5, 0.8, "cloud_small"],
  [10.5, 1.2, -13.5, 0.9, "cloud_small"], [-7.5, 3.5, -15, 1.1, "cloud_big"], [8.5, -4.5, 1.5, 0.8, "cloud_small"]])
  await place(clouds, piece, [x, y, z], r01() * 360, s);

await base.transform(unpartition(), dedup(), prune({ keepLeaves: true, keepAttributes: true }));
await io.write(OUT, base);
let tris = 0;
for (const n of root.listNodes()) { const m = n.getMesh(); if (m) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3; }
if (process.env.LIST_PIECES) console.log([...cache.keys()].map(f => path.basename(f, ".gltf")).sort().join("\n"));
console.log(`kingdom.glb: ${cells.size} tiles, ${root.listNodes().length} nodes, ${root.listMeshes().length} meshes, ~${Math.round(tris)} triangles placed (every level of every building counted)`);
