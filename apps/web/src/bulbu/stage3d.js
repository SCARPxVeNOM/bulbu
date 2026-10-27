// The 3D part of Bulbu's home: a round polished marble-glass pedestal with thin gold rims that Bulbu stands on, set on a calm
// water-glass floor that mirrors Bulbu and the pedestal (water.js). The pedestal stays out of Bulbu's silhouette mask
// so the halo still glows over it.

import { addWaterFloor } from "./water.js";
import { marbleTextures, marbleMaterial } from "./marble.js";
import { buildSkyLayer } from "./skyLayer.js";
import { cloud, puffyStar, skyLayout } from "./sky.js";

export const PEDESTAL = { r: 1.25, h: 0.32 };

export function buildStage({ THREE, scene, camera, renderer, BLOOM_LAYER }) {
  const group = new THREE.Group(); group.name = "HomeStage"; scene.add(group);
  const mark = (o, bloom) => { o.userData.noMask = true; if (bloom) o.layers.enable(BLOOM_LAYER); group.add(o); return o; };
  const { r: R, h: Hh } = PEDESTAL;

  // ---- pedestal: a slab of polished marble-glass: veined marble under a glassy clear coat, so it catches the light
  // and the studio reflections with a soft lustre (see marble.js)
  const tex = marbleTextures(THREE, { base: "#F9F6FD", cloud: "#E9E0F8", vein: "#B9A9E4", gold: "#E7C98F" });
  const side = mark(new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.01, Hh, 160, 1, true), marbleMaterial(THREE, tex.side)));
  side.position.y = -Hh / 2 - 0.002;
  const cap = mark(new THREE.Mesh(new THREE.CircleGeometry(R, 160), marbleMaterial(THREE, tex.top)));
  cap.rotation.x = -Math.PI / 2; cap.position.y = -0.002;
  // a rounded, polished edge where the top meets the side
  const bevel = mark(new THREE.Mesh(new THREE.TorusGeometry(R - 0.004, 0.022, 16, 192), marbleMaterial(THREE, tex.side)));
  bevel.rotation.x = Math.PI / 2; bevel.position.y = -0.024;

  const rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.93, 0.76), toneMapped: false });
  const rimTop = mark(new THREE.Mesh(new THREE.TorusGeometry(R + 0.016, 0.006, 8, 192), rimMat));
  rimTop.rotation.x = Math.PI / 2; rimTop.position.y = -0.03;
  const rimBot = mark(new THREE.Mesh(new THREE.TorusGeometry(R * 1.01 + 0.002, 0.006, 8, 192), rimMat));
  rimBot.rotation.x = Math.PI / 2; rimBot.position.y = -Hh - 0.002;

  // ---- the floor: calm water-glass that mirrors Bulbu and the pedestal, with a soft contact shadow
  const water = addWaterFloor({ THREE, scene, group, y: -Hh - 0.006, tint: [0.84, 0.80, 1.0], strength: 0.62, shadow: [0.36, 0.30, 0.62, 0.30] });

  // ---- the moving sky: drifting clouds, twinkling stars, shooting stars, rising motes of light
  const skyLife = buildSkyLayer({ THREE, scene, camera, renderer, art: { cloud, puffyStar, layout: skyLayout }, moteColor: [1.0, 0.95, 0.82] });

  return (dt, t) => { water(t); skyLife(dt, t); };
}
