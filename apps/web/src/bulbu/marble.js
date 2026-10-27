// Polished marble for Bulbu's pedestal: procedural veined marble textures (seamless around the side), used with a
// glossy clear-coated physical material so the slab catches the studio light like lustrous marble-glass.
//   palette: { base, cloud, vein, gold }  sRGB hex colours

function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const s = t => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v),
           L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
function fbm(x, y, z) {
  let a = 0.5, f = 1, t = 0;
  for (let o = 0; o < 5; o++) { t += a * noise3(x * f, y * f, z * f); f *= 2.03; a *= 0.5; }
  return t;
}
const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// colour of the marble at a 3D point: soft clouding plus a few sharp veins (and fine gold threads)
function marbleAt(P, x, y, z) {
  const n = fbm(x * 1.6, y * 1.6, z * 1.6);
  const cloud = fbm(x * 0.7 + 7, y * 0.7, z * 0.7);
  // long, flowing diagonal veins (a low-frequency direction, gently warped)
  const v1 = Math.abs(Math.sin((x * 1.1 + y * 0.7 + z * 0.5) * 1.7 + n * 4.2));
  const v2 = Math.abs(Math.sin((x * -0.5 + y * 1.2 + z * 0.9) * 2.2 + n * 5.0 + 2.0));
  const m = Math.min(v1, v2 * 1.15);
  const vein = Math.pow(1 - m, 14) * 0.85 + Math.pow(1 - m, 4) * 0.22;   // a crisp vein inside a soft, smoky band
  const gold = Math.pow(1 - Math.abs(Math.sin((x * 0.8 - z * 1.1 + y * 0.5) * 2.1 + n * 6.0 + 4.0)), 60);
  let c = mix(P.base, P.cloud, Math.min(1, Math.max(0, (cloud - 0.38) * 2.2)) * 0.55);
  c = mix(c, P.vein, Math.min(1, vein * 0.9));
  c = mix(c, P.gold, Math.min(1, gold * 0.8));
  return c;
}

const cache = new Map();
export function marbleTextures(THREE, palette) {
  const key = JSON.stringify(palette);
  if (cache.has(key)) return cache.get(key);
  const P = { base: rgb(palette.base), cloud: rgb(palette.cloud), vein: rgb(palette.vein), gold: rgb(palette.gold) };
  // side: u wraps around the cylinder (seamless because we sample on a circle), v runs up the side
  const SW = 1024, SH = 256, side = document.createElement("canvas"); side.width = SW; side.height = SH;
  let g = side.getContext("2d"), im = g.createImageData(SW, SH), d = im.data;
  for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) {
    const a = (i / SW) * Math.PI * 2, c = marbleAt(P, Math.cos(a) * 1.25, (1 - j / SH) * 0.32 * 1.0, Math.sin(a) * 1.25);
    const k = (j * SW + i) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  // top: planar, same marble continuing from the side
  const T = 768, top = document.createElement("canvas"); top.width = top.height = T;
  g = top.getContext("2d"); im = g.createImageData(T, T); d = im.data;
  for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
    const x = (i / T - 0.5) * 2.5, z = -(j / T - 0.5) * 2.5, c = marbleAt(P, x, 0.32, z);
    const k = (j * T + i) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const out = {};
  for (const [name, cv] of [["side", side], ["top", top]]) {
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    if (name === "side") { t.wrapS = THREE.RepeatWrapping; }
    out[name] = t;
  }
  cache.set(key, out);
  return out;
}

// glossy, lustrous marble: clear-coated, a soft sheen, and the studio reflections on top
export function marbleMaterial(THREE, map, { tint = "#ffffff", emissive = "#000000", emissiveIntensity = 0 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    map, color: new THREE.Color(tint), roughness: 0.08, metalness: 0.0,
    clearcoat: 1.0, clearcoatRoughness: 0.02, reflectivity: 0.8, ior: 1.6,
    iridescence: 0.35, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 420],   // a pearly, glassy lustre
    sheen: 0.4, sheenColor: new THREE.Color("#ffffff"), sheenRoughness: 0.35,
    specularIntensity: 1.0, envMapIntensity: 2.6, emissive: new THREE.Color(emissive), emissiveIntensity,
  });
}
