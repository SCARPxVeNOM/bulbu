// Bulbu's home world, painted once per screen size: a dreamy pastel night sky with a crescent moon, puffy glowing
// stars, a shooting star, soft clouds on both sides, a pink glow along the horizon and a glossy floor that reflects
// the glass pedestal. Everything is placed on a phone-shaped frame (centred), and the clouds and sky extend to the
// edges on wider screens. project(x, y, z) gives the canvas position of a point in Bulbu's 3D scene, so the horizon
// and the pedestal's reflection line up with the 3D stage.

const TAU = Math.PI * 2;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function glowDot(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color},${alpha})`); g.addColorStop(0.35, `rgba(${color},${alpha * 0.45})`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

function sparkle(ctx, x, y, r, alpha) {
  // a little four-point twinkle
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha;
  glowDot(ctx, 0, 0, r * 2.2, "255,250,235", 0.55);
  ctx.fillStyle = "#fffdf4"; ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.22 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

export function puffyStar(ctx, x, y, r, rot = -Math.PI / 2) {
  // a soft, rounded, glowing five-point star
  const path = new Path2D();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * TAU, rr = i % 2 ? r * 0.5 : r;
    path[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  path.closePath();
  ctx.save();
  glowDot(ctx, x, y, r * 3.0, "255,244,200", 0.45);
  ctx.lineJoin = "round"; ctx.lineWidth = r * 0.42;
  ctx.shadowColor = "rgba(255,240,190,0.95)"; ctx.shadowBlur = r * 1.1;
  const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.25, r * 0.05, x, y, r * 1.1);
  g.addColorStop(0, "#fffef6"); g.addColorStop(0.55, "#fff4cc"); g.addColorStop(1, "#fbe3a2");
  ctx.fillStyle = g; ctx.strokeStyle = g;
  ctx.stroke(path); ctx.fill(path);
  ctx.shadowBlur = 0;
  // glossy highlight on the upper left arm
  ctx.globalAlpha = 0.7; ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.ellipse(x - r * 0.28, y - r * 0.3, r * 0.2, r * 0.1, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}

function moon(ctx, x, y, r) {
  ctx.save();
  glowDot(ctx, x, y, r * 2.6, "255,246,214", 0.55);
  glowDot(ctx, x, y, r * 1.5, "255,250,230", 0.5);
  // crescent cut from a full disc on an offscreen canvas
  const c = document.createElement("canvas"); const s = Math.ceil(r * 2.6); c.width = c.height = s;
  const g = c.getContext("2d"); const cx = s / 2, cy = s / 2;
  const fill = g.createRadialGradient(cx - r * 0.35, cy + r * 0.2, r * 0.1, cx, cy, r);
  fill.addColorStop(0, "#fffdf2"); fill.addColorStop(0.6, "#fff6d6"); fill.addColorStop(1, "#fbe8b0");
  g.fillStyle = fill; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
  g.globalCompositeOperation = "destination-out";
  g.beginPath(); g.arc(cx + r * 0.42, cy - r * 0.26, r * 0.86, 0, TAU); g.fill();
  ctx.shadowColor = "rgba(255,240,195,1)"; ctx.shadowBlur = r * 0.55;
  ctx.drawImage(c, x - cx, y - cy);
  ctx.shadowBlur = 0; ctx.globalAlpha = 0.5; ctx.drawImage(c, x - cx, y - cy);
  ctx.restore();
}

export function cloud(ctx, x, y, w, seed, tone = 1) {
  // a soft cumulus drawn on its own layer: puffs lit from the upper left (pink-white), lavender-blue in the shade,
  // a fuzzy glowing edge, and a base that fades into the horizon haze
  const R = rng(seed), puffs = [];
  const n = 5 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), arch = Math.sin(t * Math.PI);
    const r = w * (0.12 + 0.13 * arch + 0.04 * R());
    puffs.push([x - w / 2 + t * w, y - r * 0.5 - arch * w * 0.14 + R() * w * 0.02, r]);
  }
  for (let i = 0; i < 3; i++) puffs.push([x - w * 0.25 + R() * w * 0.5, y - w * (0.16 + R() * 0.08), w * (0.12 + R() * 0.05)]);
  const pad = w * 0.4, cw = Math.ceil(w + pad * 2), ch = Math.ceil(w * 0.9 + pad);
  const c = document.createElement("canvas"); c.width = cw; c.height = ch;
  const g = c.getContext("2d"), ox = pad - (x - w / 2), oy = ch - pad * 0.6 - y;
  g.translate(ox, oy);
  const top = Math.min(...puffs.map(([, py, r]) => py - r));
  // one soft silhouette: light from the upper left, pink-white on top, lavender-blue underneath
  const body = g.createLinearGradient(x - w * 0.3, top, x + w * 0.2, y + w * 0.02);
  body.addColorStop(0, "#fff8fd"); body.addColorStop(0.45, "#f6e4f8"); body.addColorStop(0.8, "#dfd0f5"); body.addColorStop(1, "#c9bff1");
  g.shadowColor = "rgba(255,228,248,0.95)"; g.shadowBlur = w * 0.07;
  g.fillStyle = body; g.beginPath();
  for (const [px, py, r] of puffs) { g.moveTo(px + r, py); g.arc(px, py, r, 0, TAU); }
  g.fill();
  g.shadowBlur = 0;
  // the bumps: a soft highlight on the top of each puff, a gentle shade under it
  for (const [px, py, r] of puffs) {
    const hl = g.createRadialGradient(px - r * 0.3, py - r * 0.45, 0, px - r * 0.3, py - r * 0.45, r * 0.85);
    hl.addColorStop(0, "rgba(255,255,255,0.75)"); hl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hl; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
  }
  g.globalCompositeOperation = "source-atop";
  for (const [px, py, r] of puffs) {
    const sh = g.createRadialGradient(px + r * 0.2, py + r * 0.9, 0, px + r * 0.2, py + r * 0.9, r * 0.9);
    sh.addColorStop(0, "rgba(176,166,232,0.22)"); sh.addColorStop(1, "rgba(176,166,232,0)");
    g.fillStyle = sh; g.fillRect(px - r * 1.2, py, r * 2.4, r * 2);
  }
  // fade the base into the haze
  g.globalCompositeOperation = "destination-out";
  const fade = g.createLinearGradient(0, y - w * 0.10, 0, y + w * 0.02);
  fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(1, "rgba(0,0,0,0.85)");
  g.fillStyle = fade; g.fillRect(-ox, y - w * 0.10, cw, ch);
  ctx.save(); ctx.globalAlpha *= 0.95 * tone; ctx.drawImage(c, -ox, -oy); ctx.restore();
}

export function paintSky(ctx, W, H, project) {
  const fw = Math.min(W, H * 0.70), fx0 = (W - fw) / 2;
  const X = f => fx0 + f * fw, Y = f => f * H, S = f => f * fw;
  // the floor's far edge sits just behind the pedestal, like in the art (a low, cosy horizon)
  const [, horizon] = project(0, 0.0, -3.2);
  const [pcx, pby] = project(0, -0.32, 0);           // pedestal: base centre
  const pr = project(1.25, -0.32, 0)[0] - pcx;          // pedestal radius on screen
  const [, headY] = project(0, 1.3, 0);
  const R = rng(7);

  // ---- sky
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#a3b2f3"); sky.addColorStop(0.32, "#b3b5f4"); sky.addColorStop(0.62, "#c7b8f2");
  sky.addColorStop(0.88, "#e0c2ef"); sky.addColorStop(1, "#f1d2ef");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizon + 1);
  // ---- floor: glossy, pale near the horizon, periwinkle toward the viewer
  const floor = ctx.createLinearGradient(0, horizon, 0, H);
  floor.addColorStop(0, "#ecdcf6"); floor.addColorStop(0.18, "#d9d2f7"); floor.addColorStop(0.6, "#c2c6f4"); floor.addColorStop(1, "#b3bdf1");
  ctx.fillStyle = floor; ctx.fillRect(0, horizon, W, H - horizon);

  // ---- warm light from Bulbu and a pink glow along the horizon
  glowDot(ctx, pcx, headY, S(0.62), "255,240,214", 0.55);
  const hz = ctx.createLinearGradient(0, horizon - H * 0.10, 0, horizon + H * 0.06);
  hz.addColorStop(0, "rgba(255,214,236,0)"); hz.addColorStop(0.65, "rgba(255,222,240,0.55)"); hz.addColorStop(1, "rgba(255,222,240,0)");
  ctx.fillStyle = hz; ctx.fillRect(0, horizon - H * 0.10, W, H * 0.16);

  // ---- tiny stars and twinkles
  for (let i = 0; i < 70; i++) {
    const x = R() * W, y = R() * horizon * 0.92, r = (0.6 + R() * 1.6) * (W / 600);
    glowDot(ctx, x, y, r * 3, "255,253,240", 0.25 + R() * 0.5);
  }
  for (let i = 0; i < 16; i++) sparkle(ctx, R() * W, R() * horizon * 0.85, S(0.008 + R() * 0.012), 0.5 + R() * 0.5);

  // ---- moon (the shooting stars, the big stars and the clouds live in the moving sky layer: skyLayer.js)
  moon(ctx, X(0.235), Y(0.268), S(0.108));

  // ---- the floor: clean water-glass. A warm pool of light under the pedestal and a few soft horizontal sheens;
  // the 3D floor adds the mirror reflection and the contact shadow on top.
  ctx.save();
  ctx.translate(pcx, pby); ctx.scale(1, 0.24);
  glowDot(ctx, 0, 0, pr * 2.1, "255,244,226", 0.55);
  ctx.restore();
  for (const [f, a, h] of [[0.06, 0.30, 0.010], [0.16, 0.20, 0.014], [0.32, 0.14, 0.020], [0.55, 0.10, 0.028]]) {
    const y = horizon + (H - horizon) * f, band = ctx.createLinearGradient(0, y - H * h, 0, y + H * h);
    band.addColorStop(0, "rgba(255,255,255,0)"); band.addColorStop(0.5, `rgba(255,255,255,${a})`); band.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = band; ctx.fillRect(0, y - H * h, W, H * h * 2);
  }
}

// Where the moving pieces go (canvas pixels), in the same phone-shaped frame as the painted sky:
// clouds sit on the horizon in a soft bank on each side (more on wide screens), two big stars up high.
export function skyLayout(W, H, horizon) {
  const fw = Math.min(W, H * 0.70), fx0 = (W - fw) / 2;
  const X = f => fx0 + f * fw, Y = f => f * H, S = f => f * fw;
  const R = rng(77), cy = horizon;
  const clouds = [
    [X(-0.02), cy - H * 0.21, S(0.30), 11, 0.9], [X(0.09), cy - H * 0.08, S(0.34), 12, 1], [X(-0.07), cy - H * 0.03, S(0.34), 13, 1],
    [X(1.02), cy - H * 0.16, S(0.28), 21, 0.9], [X(0.94), cy - H * 0.05, S(0.32), 22, 1], [X(1.08), cy - H * 0.01, S(0.30), 23, 1],
  ];
  for (let x = fx0 - S(0.25); x > -S(0.4); x -= S(0.38)) clouds.push([x, cy - H * (0.04 + R() * 0.08), S(0.42 + R() * 0.12), Math.floor(R() * 1e6), 1]);
  for (let x = fx0 + fw + S(0.25); x < W + S(0.4); x += S(0.38)) clouds.push([x, cy - H * (0.03 + R() * 0.08), S(0.42 + R() * 0.12), Math.floor(R() * 1e6), 1]);
  const stars = [[X(0.44), Y(0.195), S(0.040), -1.62], [X(0.83), Y(0.29), S(0.048), -1.45]];
  return { clouds: clouds.sort((a, b) => a[1] - b[1]), stars, frame: { fw, fx0 } };
}
