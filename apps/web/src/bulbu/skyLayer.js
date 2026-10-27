// The living part of Bulbu's sky: soft clouds that drift, two big stars that float and twinkle, shooting stars that
// streak across now and then, and tiny motes of light rising slowly around Bulbu. The clouds, stars and comets are
// flat cut-outs on a far plane behind everything (laid out to match the painted sky on any screen); they stay out of
// the water's reflection and out of Bulbu's glow passes.
const SKY_LAYER = 2, DEPTH = -9.0;

export function buildSkyLayer({ THREE, scene, camera, renderer, art, motes = true, moteColor = [1.0, 0.95, 0.82] }) {
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  camera.layers.enable(SKY_LAYER);
  const sky = new THREE.Group(); sky.name = "SkyLayer"; scene.add(sky);
  sky.userData.noMask = true; sky.userData.noBloom = true;

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  let W = 0, H = 0, fov = 0, aspect = 0, pxWorld = 1;
  // canvas pixel -> point on the far plane
  function toWorld(px, py, out = new THREE.Vector3()) {
    tmp.set((px / W) * 2 - 1, -(py / H) * 2 + 1, 0.5).unproject(camera);
    tmp2.copy(tmp).sub(camera.position).normalize();
    const t = (DEPTH - camera.position.z) / tmp2.z;
    return out.copy(camera.position).addScaledVector(tmp2, t);
  }
  const flat = (canvas, wWorld, hWorld) => {
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wWorld, hWorld),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    m.layers.set(SKY_LAYER); m.renderOrder = -10; sky.add(m); return m;
  };
  let clouds = [], stars = [];
  function clear() {
    sky.children.slice().forEach(m => { if (m === comet) return; sky.remove(m); m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); });
    clouds = []; stars = [];
  }
  function layout() {
    clear();
    const hz = new THREE.Vector3(0, 0, -3.2).project(camera), horizon = (-hz.y * 0.5 + 0.5) * H;
    const L = art.layout(W, H, horizon);
    const d = toWorld(W / 2, H / 2).distanceTo(camera.position);
    pxWorld = (2 * d * Math.tan((camera.fov * Math.PI / 180) / 2)) / H;   // world units per canvas pixel on the plane
    L.clouds.forEach(([x, y, w, seed, tone], i) => {
      const cw = Math.ceil(w * 1.7), ch = Math.ceil(w * 1.05), k = Math.min(1, 700 / cw);
      const c = document.createElement("canvas"); c.width = Math.ceil(cw * k); c.height = Math.ceil(ch * k);
      const g = c.getContext("2d"); g.scale(k, k);
      art.cloud(g, cw / 2, ch * 0.80, w, seed, tone);
      const m = flat(c, cw * pxWorld, ch * pxWorld);
      m.position.copy(toWorld(x, y - ch * 0.80 + ch / 2)); m.position.z = DEPTH + i * 0.001;
      m.userData = { base: m.position.clone(), ph: i * 1.7, sp: 0.07 + (i % 3) * 0.025, amp: 0.18 + (i % 2) * 0.1 };
      clouds.push(m);
    });
    L.stars.forEach(([x, y, r, rot], i) => {
      const s = Math.ceil(r * 7), c = document.createElement("canvas"); c.width = c.height = s;
      art.puffyStar(c.getContext("2d"), s / 2, s / 2, r, rot);
      const m = flat(c, s * pxWorld, s * pxWorld);
      m.position.copy(toWorld(x, y)); m.position.z = DEPTH + 0.05;
      m.userData = { base: m.position.clone(), ph: i * 2.3 };
      stars.push(m);
    });
  }

  // ---- shooting stars: a bright head with a long fading tail, every few seconds somewhere in the upper sky
  const CW = 512, CH = 64, cc = document.createElement("canvas"); cc.width = CW; cc.height = CH;
  {
    const g = cc.getContext("2d"), y = CH / 2;
    // a warm golden glow under the streak, so it reads against the pale lavender sky
    const glow = g.createLinearGradient(0, 0, CW, 0);
    glow.addColorStop(0, "rgba(255,214,140,0.85)"); glow.addColorStop(0.25, "rgba(255,206,150,0.45)"); glow.addColorStop(1, "rgba(255,200,160,0)");
    g.strokeStyle = glow; g.lineCap = "round"; g.lineWidth = 14; g.shadowColor = "rgba(255,200,120,0.9)"; g.shadowBlur = 18;
    g.beginPath(); g.moveTo(20, y); g.lineTo(CW - 10, y); g.stroke();
    // the bright white core, thinning toward the end of the tail
    const core = g.createLinearGradient(0, 0, CW, 0);
    core.addColorStop(0, "rgba(255,255,255,1)"); core.addColorStop(0.18, "rgba(255,253,244,0.9)"); core.addColorStop(1, "rgba(255,250,236,0)");
    g.shadowBlur = 6; g.shadowColor = "rgba(255,255,255,1)"; g.strokeStyle = core; g.lineWidth = 5;
    g.beginPath(); g.moveTo(18, y); g.lineTo(CW - 20, y); g.stroke();
    g.shadowBlur = 0;
    const head = g.createRadialGradient(22, y, 0, 22, y, 30);
    head.addColorStop(0, "rgba(255,255,255,1)"); head.addColorStop(0.22, "rgba(255,252,232,0.95)"); head.addColorStop(0.5, "rgba(255,220,150,0.45)"); head.addColorStop(1, "rgba(255,210,150,0)");
    g.fillStyle = head; g.fillRect(0, 0, 64, CH);
  }
  const comet = flat(cc, 1, CH / CW); comet.renderOrder = -9; comet.visible = false;
  let next = 1.5 + Math.random() * 2, shot = null, el = 0;
  function launch(t) {
    const a = (22 + Math.random() * 14) * Math.PI / 180;               // heading down and to the left
    const x0 = W * (0.42 + Math.random() * 0.5), y0 = H * (0.05 + Math.random() * 0.2);
    const len = Math.min(W, H * 0.7) * (0.45 + Math.random() * 0.2);
    const p0 = toWorld(x0, y0), p1 = toWorld(x0 - Math.cos(a) * len, y0 + Math.sin(a) * len);
    const dir = p1.clone().sub(p0); const dist = dir.length(); dir.normalize();
    shot = { t0: t, dur: 0.9 + Math.random() * 0.5, p0, dir, dist, tailLen: dist * 0.42 };
    comet.rotation.z = Math.atan2(-dir.y, -dir.x);                       // the tail trails behind the head
  }

  // ---- motes of light rising slowly around Bulbu (never in front of its face)
  let points = null, speeds = null;
  if (motes) {
    const N = 42, pos = new Float32Array(N * 3); speeds = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const side = i % 2 ? 1 : -1;
      pos[i * 3] = side * (0.95 + Math.random() * 2.4); pos[i * 3 + 1] = -0.2 + Math.random() * 3.2; pos[i * 3 + 2] = -1.6 + Math.random() * 2.6;
      speeds[i * 2] = 0.06 + Math.random() * 0.1; speeds[i * 2 + 1] = Math.random() * 6.28;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const dc = document.createElement("canvas"); dc.width = dc.height = 64;
    const g = dc.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.6)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(dc);
    points = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex, size: 0.07, color: new THREE.Color(...moteColor), transparent: true, opacity: 0.85,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false }));
    points.userData.noMask = true; points.renderOrder = 5; scene.add(points);
  }

  if (typeof location !== "undefined" && /[?&]skydebug/.test(location.search))   // test hook only: ?skydebug
    window.__bulbuSky = { get shot() { return shot; }, set next(v) { next = v; }, get el() { return el; }, get W() { return W; } };
  const size = new THREE.Vector2();
  return (dt, t) => {
    renderer.getDrawingBufferSize(size);
    if (size.x !== W || size.y !== H || camera.fov !== fov || camera.aspect !== aspect) {
      W = size.x; H = size.y; fov = camera.fov; aspect = camera.aspect;
      if (W > 1 && H > 1) layout();
    }
    const k = reduce ? 0 : 1;
    clouds.forEach(m => {
      const u = m.userData;
      m.position.x = u.base.x + Math.sin(t * u.sp + u.ph) * u.amp * k;
      m.position.y = u.base.y + Math.sin(t * u.sp * 1.7 + u.ph) * 0.03 * k;
    });
    stars.forEach(m => {
      const u = m.userData, p = Math.sin(t * 1.6 + u.ph);
      m.position.y = u.base.y + Math.sin(t * 0.9 + u.ph) * 0.08 * k;
      m.scale.setScalar(1 + 0.07 * p * k);
      m.material.opacity = 0.85 + 0.15 * (0.5 + 0.5 * p);
    });
    if (!reduce) {
      el += dt;                                   // the sky's own clock (steady even if frames are slow)
      if (!shot && el > next && W > 1) launch(el);
      if (shot) {
        const u = (el - shot.t0) / shot.dur;
        if (u >= 1) { shot = null; comet.visible = false; next = el + 2.5 + Math.random() * 4.5; }
        else {
          const e = 1 - Math.pow(1 - u, 2.2);                              // fast start, easing out
          const head = shot.p0.clone().addScaledVector(shot.dir, shot.dist * e);
          const tail = shot.tailLen * Math.min(1, u * 3.5);
          comet.scale.set(tail, tail, 1);
          comet.position.copy(head).addScaledVector(shot.dir, -tail / 2); comet.position.z = DEPTH + 0.1;
          comet.material.opacity = Math.min(1, u / 0.12) * (1 - Math.max(0, (u - 0.65) / 0.35));
          comet.visible = true;
        }
      }
      if (points) {
        const a = points.geometry.attributes.position, arr = a.array;
        for (let i = 0; i < arr.length / 3; i++) {
          arr[i * 3 + 1] += speeds[i * 2] * dt;
          arr[i * 3] += Math.sin(t * 0.6 + speeds[i * 2 + 1]) * 0.0015;
          if (arr[i * 3 + 1] > 3.1) arr[i * 3 + 1] = -0.25;
        }
        a.needsUpdate = true;
        points.material.opacity = 0.7 + 0.15 * Math.sin(t * 2.0);
      }
    }
  };
}
