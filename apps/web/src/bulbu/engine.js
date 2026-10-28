// Bulbu engine (from bulbu-web/project/src/bulbu.js; adds setBackground, paused, setView, interactive, headBox): loads the rigged model, drives emotes, animations, glow and FX, and renders with selective bloom.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const EMOTE_ORDER = ["happy", "focused", "drained", "stressed", "thriving", "celebrating"];
export const LABEL = { happy: "Happy", focused: "Focused", drained: "Drained", stressed: "Stressed", thriving: "Thriving", celebrating: "Celebrating" };
const MOTION = { happy: ["Idle", 1], focused: ["Idle", 0.7], drained: ["Sleepy", 1], stressed: ["Jitter", 1.4], thriving: ["Idle", 1.3], celebrating: ["Celebrate", 1] };
const PARTS = ["Eye_Stars", "Eyes_Closed", "Eyes_Squeeze", "Brows_Focused", "Brows_Drained", "FX_Sweat", "FX_StressMarks", "FX_Sparkles", "FX_Confetti"];
const FX = ["FX_Sweat", "FX_StressMarks", "FX_Sparkles", "FX_Confetti"];
const PX = 0.0017, Zp = y => (1300 - y) * PX;

// Material palette, taken from the main reference art (sRGB hex).
export const PALETTE = {
  bodyIvory: "#FFF5E9",        // milky ivory, satin-vinyl
  collarPorcelain: "#FFF0E2",  // porcelain cream rim, a touch glossier
  bodyShade: "#FFD9C4",        // cream-peach tint for the shaded side (instead of grey)
  belt: "#BDEBDD",             // mint-aqua satin
  gemYellow: "#FFE17B", gemCoral: "#F28F91", gemBlue: "#9585F5",
  limbs: "#C7A7F2", limbSheen: "#F6D6FF",   // lavender vinyl with a pink undertone
  hand: "#FFFFFF", handShade: "#EDE6FF",     // round white ball hands, glossy
  eyeTop: "#321547", eyeBottom: "#7040A8", heart: "#FFE4FA", shine: "#FFFFFF",
  cheek: "#F5A8B9",
  glassHighlight: "#FFFDF5",   // ivory reflections on the bulb
  pearlLavender: "#E4D2FF", pearlPink: "#FFD6EA",   // pearlescent edge sheen
};
const lin3 = hex => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };
const BLOOM_LAYER = 1;

// stage (optional; also api.setStage(stage | null) at any time) turns the viewer into a scene with its own world:
//   view(aspect) -> { pos: [x, y, z], target: [x, y, z], fov }   fixed camera framing for the screen shape
//   orbit: false                                                 no drag-to-orbit / zoom (taps still poke Bulbu)
//   background(ctx, w, h, project)                               paints the backdrop (canvas pixels); project(x, y, z) -> [px, py]
//   build({ THREE, scene, camera, renderer, BLOOM_LAYER }) -> update(dt, t)   adds scene props once; update runs every frame
//   light: { scale, tint, glow, env }                            relight Bulbu for the world (e.g. night: dimmer, moon-blue, warmer own glow)
// Props with userData.noMask stay out of Bulbu's silhouette mask (so the halo still glows over them); props with
// userData.noBloom are skipped by the glow passes (only drawn in the final image).
export function createBulbu({ container, glbBytes, emotes, reduceMotion = false, onReady, onEmote, onAnim, onPoke, stage = null }) {
  // ------------------------------------------------------------ renderer, scene, camera
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  // Reflection studio shaped like the art: tall soft strips at the left and right give the long glossy streaks on the glass.
  const studio = new THREE.Scene();
  studio.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.22, 0.18, 0.30), side: THREE.BackSide })));
  const strip = (w, h, pos, k, tint = [1, 1, 1]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...tint).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 1, 0); studio.add(m);
  };
  strip(1.1, 9, [-6, 3, 5], 6);                          // key streak, upper left
  strip(0.6, 7, [6.5, 2, 3.5], 4);                       // thin streak, right edge
  strip(9, 2.5, [0, 9, 1], 1.6, [0.92, 0.88, 1.0]);      // soft top light
  strip(14, 6, [0, 2, -9], 0.9, [0.80, 0.70, 1.0]);      // lavender bounce from behind
  scene.environment = pmrem.fromScene(studio, 0.02).texture;
  scene.environmentIntensity = 0.5;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0.75, 1.2, 5.6);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.1, 0);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 2.6; controls.maxDistance = 10;
  controls.maxPolarAngle = Math.PI * 0.62;
  controls.autoRotate = false; controls.autoRotateSpeed = 0.6;

  const hemi = new THREE.HemisphereLight(0xfffaf6, 0xd9cdf2, 1.5); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfffaf4, 1.5); key.position.set(-2.6, 3.8, 4.2); scene.add(key);
  const fill = new THREE.DirectionalLight(0xf6f2ff, 0.55); fill.position.set(3.4, 1.6, 3.6); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xd2bcff, 0.9); rim.position.set(0, 2.5, -4); scene.add(rim);
  const glowLight = new THREE.PointLight(0xffd26a, 1.6, 3.2, 1.6); glowLight.position.set(0, 1.25, 0.2); scene.add(glowLight);

  // soft contact shadow
  const sc = document.createElement("canvas"); sc.width = sc.height = 128;
  const sg = sc.getContext("2d"); const grd = sg.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, "rgba(70,50,110,0.38)"); grd.addColorStop(1, "rgba(70,50,110,0)");
  sg.fillStyle = grd; sg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; scene.add(shadow);

  // ------------------------------------------------------------ selective bloom (core, filament, sparkles)
  const bloomLayer = new THREE.Layers(); bloomLayer.set(BLOOM_LAYER);
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const hiddenForBloom = [];
  const renderScene = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.9, 0.8, 0.0);
  const bloomComposer = new EffectComposer(renderer); bloomComposer.renderToScreen = false;
  bloomComposer.addPass(renderScene); bloomComposer.addPass(bloomPass);
  const mixPass = new ShaderPass(new THREE.ShaderMaterial({
    uniforms: { baseTexture: { value: null }, bloomTexture: { value: bloomComposer.renderTarget2.texture }, maskTexture: { value: null },
                tint: { value: new THREE.Color(1, 0.86, 0.55) }, power: { value: 1 }, inside: { value: 0.06 },
                maskTexel: { value: new THREE.Vector2(1 / 256, 1 / 256) }, maskBlur: { value: 0.0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform sampler2D baseTexture; uniform sampler2D bloomTexture; uniform sampler2D maskTexture; uniform sampler2D filTexture;
      uniform vec3 tint; uniform float power; uniform float inside; uniform vec3 filTint; uniform float filPower; varying vec2 vUv;
      uniform vec2 maskTexel; uniform float maskBlur;
      void main(){ vec4 b = texture2D(baseTexture, vUv); vec3 g = texture2D(bloomTexture, vUv).rgb;
        float m = texture2D(maskTexture, vUv).r;   // Bulbu's silhouette (antialiased, same pixels as the picture)
        vec3 halo = mix(g, tint * max(max(g.r, g.g), g.b), 0.55) * power * mix(1.0, inside, m);
        vec3 fg = texture2D(filTexture, vUv).rgb;
        float face = texture2D(maskTexture, vUv).g;
        halo += filTint * max(max(fg.r, fg.g), fg.b) * filPower;
        halo *= 1.0 - 0.92 * face;   // no glow over the eyes, mouth and face lines
        halo *= 1.0 - texture2D(maskTexture, vUv).b;   // or over something Bulbu holds: it stays solid
        gl_FragColor = vec4(1.0 - (1.0 - b.rgb) * (1.0 - clamp(halo, 0.0, 1.0)), b.a); }`
  }), "baseTexture");
  // full-resolution, antialiased mask: it lines up pixel for pixel with the picture, so the halo stops exactly at
  // Bulbu's outline (no faint rim or aura around the model)
  const maskRT = new THREE.WebGLRenderTarget(256, 256, { samples: 4 });
  const maskMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });       // R = Bulbu's silhouette
  const maskFaceMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });   // G = face features (eyes, mouth, lines)
  const maskGearMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });   // B = a held item (no glow over it at all)
  const faceMeshes = new Set(), maskSaved = new Map();
  mixPass.uniforms.maskTexture = { value: maskRT.texture };
  const filComposer = new EffectComposer(renderer); filComposer.renderToScreen = false;
  filComposer.addPass(new RenderPass(scene, camera));
  filComposer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.3, 0.0));
  mixPass.uniforms.filTexture = { value: filComposer.renderTarget2.texture };
  mixPass.uniforms.filTint = { value: new THREE.Color(1, 0.97, 0.66) };
  mixPass.uniforms.filPower = { value: 0.8 };
  const coreMeshes = [], filMeshes = [];
  const finalComposer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(256, 256, { type: THREE.HalfFloatType, samples: 4 }));   // smooth (antialiased) edges
  finalComposer.addPass(renderScene); finalComposer.addPass(mixPass); finalComposer.addPass(new OutputPass());
  const savedMats = new Map();
  let bgColor = new THREE.Color("#efeae6");
  // stage: backdrop painted once per screen size into a texture the size of the canvas, plus its own 3D props
  const bgCanvas = document.createElement("canvas");
  const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.colorSpace = THREE.SRGBColorSpace;
  let stageCfg = null, stageUpdate = null, stageObjs = [], noMask = [], noBloom = [], stageGlow = 1;
  const baseLights = [hemi, key, fill, rim].map(l => [l, l.intensity, l.color.clone()]);
  const baseGround = hemi.groundColor.clone(), baseEnv = scene.environmentIntensity;
  function setStage(st) {
    stageObjs.forEach(o => {
      scene.remove(o);
      o.traverse(m => {
        if (m.isReflector) { m.dispose(); return; }        // frees the mirror's render target too
        if (m.geometry) m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => { if (x && x.map) x.map.dispose(); if (x && x.dispose) x.dispose(); });
      });
    });
    stageObjs = []; stageUpdate = null; noMask = []; noBloom = [];
    stageCfg = st || null;
    if (stageCfg && stageCfg.build) {
      const before = new Set(scene.children);
      stageUpdate = stageCfg.build({ THREE, scene, camera, renderer, BLOOM_LAYER }) || null;
      stageObjs = scene.children.filter(c => !before.has(c));
    }
    scene.traverse(o => { if (o.userData.noMask) noMask.push(o); if (o.userData.noBloom) noBloom.push(o); });
    if (stageCfg && stageCfg.orbit === false) controls.enabled = false;
    const L = (stageCfg && stageCfg.light) || null;
    baseLights.forEach(([l, i, c]) => { l.intensity = i * (L ? L.scale ?? 1 : 1); l.color.copy(c); if (L && L.tint) l.color.multiply(new THREE.Color(L.tint)); });
    hemi.groundColor.copy(baseGround); if (L && L.tint) hemi.groundColor.multiply(new THREE.Color(L.tint));
    scene.environmentIntensity = baseEnv * (L ? L.env ?? 1 : 1);
    stageGlow = L ? L.glow ?? 1 : 1;
    if (resize) resize();
  }

  function renderFrame() {
    scene.background = null;
    scene.traverse(o => { if (o.isMesh && !bloomLayer.test(o.layers)) { savedMats.set(o, o.material); o.material = darkMat; } });
    hiddenForBloom.forEach(o => { o.userData.v = o.visible; o.visible = false; });
    noBloom.forEach(o => { o.userData.bv = o.visible; o.visible = false; });   // e.g. a mirror floor: only the final pass renders it
    shadow.visible = false;
    bloomComposer.render();
    coreMeshes.forEach(o => { o.userData.cv = o.visible; o.visible = false; });   // hide (a black stand-in would cover the symbol)
    filMeshes.forEach(o => { o.userData.c = o.material.color.clone(); o.material.color.multiplyScalar(3); });   // HDR feed: a thin line needs more light to bloom
    filComposer.render();
    filMeshes.forEach(o => { o.material.color.copy(o.userData.c); });
    coreMeshes.forEach(o => { o.visible = o.userData.cv; });
    hiddenForBloom.forEach(o => { o.visible = o.userData.v; });
    noBloom.forEach(o => { o.visible = o.userData.bv; });
    // silhouette mask
    noMask.forEach(o => { o.userData.mv = o.visible; o.visible = false; });
    scene.traverse(o => { if (o.isMesh && o !== shadow) { maskSaved.set(o, o.material); o.material = faceMeshes.has(o) ? maskFaceMat : o.userData.gearMesh ? maskGearMat : maskMat; } });
    scene.background = null;
    renderer.setRenderTarget(maskRT); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    maskSaved.forEach((m, o) => { o.material = m; }); maskSaved.clear();
    noMask.forEach(o => { o.visible = o.userData.mv; });
    savedMats.forEach((m, o) => { o.material = m; }); savedMats.clear();
    hiddenForBloom.forEach(o => { o.visible = o.userData.v; });
    shadow.visible = true;
    scene.background = stageCfg && stageCfg.background ? bgTex : bgColor;
    finalComposer.render();
  }

  var resize = function () {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false); bloomComposer.setSize(w, h); filComposer.setSize(w, h); finalComposer.setSize(w, h);
    const pr = renderer.getPixelRatio(); maskRT.setSize(Math.ceil(w * pr), Math.ceil(h * pr));
    mixPass.uniforms.maskTexel.value.set(1 / maskRT.width, 1 / maskRT.height);
    camera.aspect = w / h;
    if (stageCfg && stageCfg.view) {
      const v = stageCfg.view(w / h);
      camera.position.set(...v.pos); controls.target.set(...v.target); camera.fov = v.fov;
      camera.lookAt(controls.target); controls.update();
    } else {
      // keep Bulbu framed on tall/narrow screens
      camera.fov = w / h < 0.8 ? 28 * Math.min(1.6, 0.8 / (w / h)) : 28;
    }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    if (stageCfg && stageCfg.background) {
      const W = Math.round(w * pr), H = Math.round(h * pr);
      bgCanvas.width = W; bgCanvas.height = H;
      const pv = new THREE.Vector3();
      const project = (x, y, z) => { pv.set(x, y, z).project(camera); return [(pv.x * 0.5 + 0.5) * W, (-pv.y * 0.5 + 0.5) * H]; };
      stageCfg.background(bgCanvas.getContext("2d"), W, H, project);
      bgTex.needsUpdate = true;
    }
  };
  new ResizeObserver(() => resize()).observe(container);
  setStage(stage);

  // ------------------------------------------------------------ custom materials
  const U = {
    center: { value: new THREE.Color() }, edge: { value: new THREE.Color() }, rainbowOn: { value: 0 },
    stops: { value: Array.from({ length: 7 }, () => new THREE.Color()) }, stopPos: { value: [0, .22, .38, .52, .72, .88, 1] },
    cz: { value: 1.20 }, spreadMin: { value: 0.12 }, spreadMax: { value: 1.0 }, power: { value: 1 },
    rimTint: { value: new THREE.Color() }, bodyTint: { value: new THREE.Color() }, bodyAlpha: { value: 0.06 },
  };
  const withPos = sh => {
    sh.vertexShader = "varying vec3 vPos;\n" + sh.vertexShader.replace("#include <skinning_vertex>", "#include <skinning_vertex>\n vPos = transformed;");
    sh.fragmentShader = "varying vec3 vPos;\n" + sh.fragmentShader;
  };
  function coreMaterial() {
    const m = new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false });   // only the far inside wall glows
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U); withPos(sh);
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
        uniform vec3 center; uniform vec3 edge; uniform float rainbowOn; uniform vec3 stops[7]; uniform float stopPos[7];
        uniform float cz; uniform float spreadMin; uniform float spreadMax; uniform float power;
        vec3 ramp(float a){ vec3 c = stops[0]; for (int i = 1; i < 7; i++){ float t = clamp((a - stopPos[i-1]) / max(stopPos[i] - stopPos[i-1], 1e-4), 0.0, 1.0); if (a >= stopPos[i-1]) c = mix(stops[i-1], stops[i], t); } return c; }`)
        .replace("vec4 diffuseColor = vec4( diffuse, opacity );", `
        float dx = vPos.x / 0.60, dz = (vPos.y - cz) / 0.82;
        float t = smoothstep(spreadMin, spreadMax, sqrt(dx*dx + dz*dz));
        float a = atan(dz, dx) / 6.2831853 + 0.5;
        vec3 e = mix(edge, ramp(a), rainbowOn);
        vec3 c = mix(center, e, t);
        float hs = exp(-(pow(vPos.x / 0.36, 2.0) + pow((vPos.y - 1.0) / 0.30, 2.0)));
        c = mix(c, ${lin3("#FFFBEA")}, hs * 0.45);   // glow is brightest low in the bulb, around the face
        vec4 diffuseColor = vec4(c * power, 1.0);`);
    };
    return m;
  }
  function glassMaterial() {
    // black base: the lit result is then reflections only, which we add on top of the tinted, mostly clear glass
    const m = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.14, metalness: 0, transparent: true, depthWrite: false, envMapIntensity: 1.5 });
    m.onBeforeCompile = sh => {
      sh.uniforms.rimTint = U.rimTint; sh.uniforms.bodyTint = U.bodyTint; sh.uniforms.bodyAlpha = U.bodyAlpha;
      sh.fragmentShader = "uniform vec3 rimTint; uniform vec3 bodyTint; uniform float bodyAlpha;\n" + sh.fragmentShader.replace("#include <dithering_fragment>", `
        float fr = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 1.4);
        // pearlescent edge: lavender <-> pink, shifting with the surface angle
        float band = 0.5 + 0.5 * sin(normal.y * 3.2 + normal.x * 3.0 + 0.6);
        vec3 pearl = mix(${lin3(PALETTE.pearlLavender)}, ${lin3(PALETTE.pearlPink)}, band);
        // the edge melts into the glow colour (a hint of pearl only), so the glass has no pale rim around it
        vec3 edgeCol = mix(bodyTint, mix(rimTint, pearl, 0.6), 0.22);
        float edgeBand = smoothstep(0.55, 0.96, 1.0 - abs(dot(normalize(vViewPosition), normal)));
        float alpha = clamp(bodyAlpha + 0.40 * edgeBand, 0.0, 1.0);
        fr = max(fr, edgeBand);
        float s = clamp(max(max(gl_FragColor.r, gl_FragColor.g), gl_FragColor.b) - 0.04, 0.0, 1.0) * 2.4;
        vec3 spec = ${lin3(PALETTE.glassHighlight)} * s;
        gl_FragColor = vec4(mix(bodyTint, edgeCol, fr) + spec, clamp(alpha + min(s, 1.0) * 0.8, 0.0, 1.0));
        #include <dithering_fragment>`);
    };
    return m;
  }
  function eyeMaterial() {
    const m = new THREE.MeshPhysicalMaterial({ color: 0x28082a, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06 });
    m.onBeforeCompile = sh => {
      withPos(sh);
      sh.fragmentShader = sh.fragmentShader.replace("vec4 diffuseColor = vec4( diffuse, opacity );", `
        float g = smoothstep(${(Zp(630) + 0.07).toFixed(3)}, ${(Zp(630) - 0.10).toFixed(3)}, vPos.y);
        vec4 diffuseColor = vec4(mix(${lin3(PALETTE.eyeTop)}, ${lin3(PALETTE.eyeBottom)}, g), 1.0);`);
    };
    return m;
  }
  function blushMaterial() {
    // The blush is a thin sheet lying on the glass; uv runs -1..1 across it (glTF flips v, so undo that).
    // Alpha: a soft round falloff from the middle of the cheek, times how much the face is turned toward the viewer
    // (the head's forward direction), so it is a gentle flush from the front and quarter views and melts away as Bulbu
    // turns side-on, instead of floating on the glass like a patch. The cheek surface facing away is never drawn.
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.cheek), transparent: true, depthWrite: false, toneMapped: false });
    m.onBeforeCompile = sh => {
      sh.vertexShader = "varying vec2 vCheek; varying vec3 vNrm; varying vec3 vView; varying float vFace;\n" + sh.vertexShader
        .replace("#include <uv_vertex>", "#include <uv_vertex>\n vCheek = vec2(uv.x, 1.0 - uv.y);")
        .replace("#include <project_vertex>", `#include <project_vertex>
          vView = -mvPosition.xyz;
          vNrm = normalize(transformedNormal);
          vec3 headFwd = normalize(normalMatrix * (skinMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);   // the face looks along +Z
          vFace = dot(headFwd, normalize(vView));`);
      sh.fragmentShader = "varying vec2 vCheek; varying vec3 vNrm; varying vec3 vView; varying float vFace;\n" + sh.fragmentShader.replace("vec4 diffuseColor = vec4( diffuse, opacity );", `
        float d = length(vCheek);
        float b = pow(smoothstep(1.0, 0.0, d), 1.6);
        float facing = clamp(dot(normalize(vNrm), normalize(vView)), 0.0, 1.0);
        float side = smoothstep(0.10, 0.40, facing) * smoothstep(0.28, 0.80, vFace);
        vec4 diffuseColor = vec4(diffuse, b * 0.88 * side);`);
    };
    return m;
  }
  function bodyMaterial() {
    // milky ivory satin body; the rolled rim above it becomes porcelain cream and a little glossier
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(PALETTE.bodyIvory), roughness: 0.42, metalness: 0,
      clearcoat: 0.3, clearcoatRoughness: 0.35, sheen: 0.25, sheenColor: new THREE.Color("#FFEBD0"), sheenRoughness: 0.7,
      emissive: new THREE.Color("#FFE6C4"), emissiveIntensity: 0.12,
    });
    m.onBeforeCompile = sh => {
      withPos(sh);
      sh.fragmentShader = sh.fragmentShader
        .replace("vec4 diffuseColor = vec4( diffuse, opacity );", `
          float collarMask = smoothstep(${(Zp(915) - 0.008).toFixed(4)}, ${(Zp(915) + 0.008).toFixed(4)}, vPos.y);
          vec4 diffuseColor = vec4(mix(diffuse, ${lin3(PALETTE.collarPorcelain)}, collarMask), opacity);`)
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.26, collarMask);");
    };
    return m;
  }
  // Knit texture: one tile holds 4 x 4 stockinette stitches (each stitch is a "V" of two leaning loops).
  // The sweater's UVs are laid out in stitch units, so the texture simply repeats. Used as a bump map and as a soft
  // light/dark pattern in the colour, so the knit reads up close and stays calm from a distance.
  let knitTex = null;
  const KNIT = { leg: "#2F49B2", gap: "#E6ECFF", sheen: "#8EA2EE" };   // royal-blue knit with fine pale stripes
  function knitTextures() {
    if (knitTex) return knitTex;
    const N = 4, S = 64, size = N * S;
    const cv = document.createElement("canvas"); cv.width = cv.height = size;
    const g = cv.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, size, size);
    for (let i = 0; i < N; i++) for (let j = -1; j <= N; j++) {
      for (const sgn of [-1, 1]) {
        // each leg of the V: a soft ellipse leaning toward the centre line of the stitch
        const cx = (i + 0.5) * S + sgn * S * 0.2, cy = (j + 0.5) * S;
        for (const dx of [-size, 0, size]) {
          g.save(); g.translate(cx + dx, cy); g.rotate(sgn * 0.5); g.scale(0.36, 1);
          const gr = g.createRadialGradient(0, 0, 0, 0, 0, S * 0.62);
          gr.addColorStop(0, "#fff"); gr.addColorStop(0.55, "#bbb"); gr.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = gr; g.beginPath(); g.arc(0, 0, S * 0.62, 0, Math.PI * 2); g.fill(); g.restore();
        }
      }
    }
    const bump = new THREE.CanvasTexture(cv);
    // colour: grooves between stitches a little darker, loop tops a little lighter
    const cc = document.createElement("canvas"); cc.width = cc.height = size;
    const c2 = cc.getContext("2d"); c2.drawImage(cv, 0, 0);
    const im = c2.getImageData(0, 0, size, size), d = im.data;
    // royal-blue yarn with a fine, slightly wavy white stripe along every row (like the art's striped knit)
    const srgb = h => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
    const leg = srgb(KNIT.leg), gap = srgb(KNIT.gap);   // the canvas holds sRGB values
    for (let k = 0; k < d.length; k += 4) {
      const i = k >> 2, px = i % size, py = (i / size) | 0;
      const v = d[k] / 255, shade = 0.80 + 0.20 * v;
      const f = ((py / S) + 0.06 * Math.sin((px / S) * Math.PI * 2)) % 1, edge = Math.min(f, 1 - f);
      const st = Math.max(0, Math.min(1, (0.15 - edge) / 0.09));          // 1 on the stripe, soft edges
      const m = st * st * (3 - 2 * st) * 0.92;
      d[k] = Math.round(255 * (leg.r * shade * (1 - m) + gap.r * m));
      d[k + 1] = Math.round(255 * (leg.g * shade * (1 - m) + gap.g * m));
      d[k + 2] = Math.round(255 * (leg.b * shade * (1 - m) + gap.b * m)); d[k + 3] = 255;
    }
    c2.putImageData(im, 0, 0);
    const color = new THREE.CanvasTexture(cc); color.colorSpace = THREE.SRGBColorSpace;
    const aniso = renderer.capabilities.getMaxAnisotropy();
    for (const t of [bump, color]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.flipY = false; t.anisotropy = Math.min(8, aniso); }
    knitTex = { bump, color };
    return knitTex;
  }
  function knitMaterial() {
    const t = knitTextures();
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#ffffff"), map: t.color, bumpMap: t.bump, bumpScale: 2.4, metalness: 0, roughness: 0.92,
      sheen: 1.0, sheenColor: new THREE.Color(KNIT.sheen), sheenRoughness: 0.55,
      emissive: new THREE.Color(KNIT.leg), emissiveIntensity: 0.06,
    });
  }
  const satin = (hex, o = {}) => () => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), metalness: 0, ...o });
  // terry cloth: a field of tiny raised loops (bump only, so the base colour stays clean)
  let terryBump = null;
  function terryTex() {
    if (terryBump) return terryBump;
    const size = 256, cv = document.createElement("canvas"); cv.width = cv.height = size;
    const g = cv.getContext("2d"); g.fillStyle = "#555"; g.fillRect(0, 0, size, size);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * size, y = rnd() * size, r = 2.2 + rnd() * 2.2;
      for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
        const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        gr.addColorStop(0, "rgba(255,255,255,0.85)"); gr.addColorStop(0.6, "rgba(200,200,200,0.4)"); gr.addColorStop(1, "rgba(80,80,80,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); g.fill();
      }
    }
    terryBump = new THREE.CanvasTexture(cv);
    terryBump.wrapS = terryBump.wrapT = THREE.RepeatWrapping; terryBump.flipY = false;
    terryBump.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return terryBump;
  }
  const terryMaterial = (hex, sheenHex, emit) => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex), bumpMap: terryTex(), bumpScale: 3.2, roughness: 0.96, metalness: 0,
    sheen: 1.0, sheenColor: new THREE.Color(sheenHex), sheenRoughness: 0.7, emissive: new THREE.Color(hex), emissiveIntensity: emit });
  // ribbed cuffs and hem: the knit's bump, without its colour
  const ribMaterial = (hex, sheenHex = "#FF8C8C") => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), roughness: 0.85, metalness: 0,
    sheen: 1.0, sheenColor: new THREE.Color(sheenHex), sheenRoughness: 0.55, emissive: new THREE.Color(hex), emissiveIntensity: 0.05 });
  // the CHAMPION headband: red cloth with a faint woven pattern, gold lettering and crowns across the front
  // (u runs once round the band, the front of Bulbu at u = 0.75; v runs bottom -> top)
  function bandMaterial() {
    const W = 4096, H = 192, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    g.fillStyle = "#D9232E"; g.fillRect(0, 0, W, H);
    let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.globalAlpha = 0.10;
    for (let y = 6; y < H; y += 12) for (let x = (y / 12) % 2 ? 0 : 6; x < W; x += 12) { g.fillStyle = rnd() > 0.5 ? "#7A0C14" : "#FF6B6B"; g.fillRect(x, y, 4, 4); }
    g.globalAlpha = 1;
    g.fillStyle = "rgba(120,10,20,0.35)"; g.fillRect(0, 0, W, 10); g.fillRect(0, H - 10, W, 10);   // hemmed edges
    const cx = 0.75 * W, cy = H / 2 + 4;
    const gold = g.createLinearGradient(0, cy - 60, 0, cy + 60);
    gold.addColorStop(0, "#FFF0A8"); gold.addColorStop(0.45, "#FFD45C"); gold.addColorStop(1, "#E39A1E");
    g.font = "900 118px 'Arial Black', 'Helvetica Neue', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineJoin = "round"; g.lineWidth = 10; g.strokeStyle = "rgba(110,20,10,0.55)";
    g.strokeText("CHAMPION", cx, cy); g.fillStyle = gold; g.fillText("CHAMPION", cx, cy);
    const tw = g.measureText("CHAMPION").width;
    const crown = (x, y, s) => {
      g.beginPath(); g.moveTo(x - s, y + s * 0.6); g.lineTo(x - s, y - s * 0.45); g.lineTo(x - s * 0.5, y); g.lineTo(x, y - s * 0.75);
      g.lineTo(x + s * 0.5, y); g.lineTo(x + s, y - s * 0.45); g.lineTo(x + s, y + s * 0.6); g.closePath();
      g.lineWidth = 8; g.stroke(); g.fillStyle = gold; g.fill();
      [-1, 0, 1].forEach(k => { g.beginPath(); g.arc(x + k * s, y - (k ? s * 0.45 : s * 0.75) - s * 0.12, s * 0.14, 0, 7); g.fill(); });
    };
    crown(cx - tw / 2 - 90, cy, 44); crown(cx + tw / 2 + 90, cy, 44);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false;
    tex.wrapS = THREE.RepeatWrapping; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.72, metalness: 0, sheen: 1.0, sheenColor: new THREE.Color("#FF9A8A"), sheenRoughness: 0.45,
      emissive: new THREE.Color("#ffffff"), emissiveMap: tex, emissiveIntensity: 0.10 });
  }
  // the laptop's screen: an editor with code being typed, line by line (only drawn while Techie is on)
  let screen = null;
  function codeScreen() {
    if (screen) return screen;
    const W = 512, H = 320, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d"), tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false;
    const COLS = ["#7FDBFF", "#FF7AB6", "#FFD866", "#A9E34B", "#C3A6FF", "#E8ECF8"];
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const newLine = () => { const indent = Math.floor(rnd() * 3) * 22, toks = []; let x = 0, n = 2 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) { const w = 18 + rnd() * 60; toks.push([x, w, COLS[Math.floor(rnd() * COLS.length)]]); x += w + 10; }
      return { indent, toks, len: x }; };
    const lines = [newLine()]; let typed = 0, acc = 0;
    const LH = 24, TOP = 34, MAXL = Math.floor((H - TOP - 10) / LH);
    function draw(blink) {
      g.fillStyle = "#0E1630"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#18223F"; g.fillRect(0, 0, W, 22);
      ["#FF6B6B", "#FFD166", "#5BD68C"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(14 + i * 16, 11, 5, 0, 7); g.fill(); });
      g.fillStyle = "#5FE9FF"; g.font = "bold 13px monospace"; g.fillText("</> bulbu.js", 70, 15);
      const first = Math.max(0, lines.length - MAXL);
      lines.slice(first).forEach((ln, i) => {
        const y = TOP + i * LH, cur = first + i === lines.length - 1;
        g.fillStyle = "#3A4670"; g.fillRect(10, y + 6, 18, 6);
        ln.toks.forEach(([x, w, c]) => { const vis = cur ? Math.min(w, Math.max(0, typed - x)) : w;
          if (vis > 0) { g.fillStyle = c; g.globalAlpha = 0.92; g.fillRect(42 + ln.indent + x, y + 4, vis, 10); g.globalAlpha = 1; } });
        if (cur && blink) { g.fillStyle = "#FFFFFF"; g.fillRect(42 + ln.indent + Math.min(typed, ln.len), y + 1, 3, 16); }
      });
      tex.needsUpdate = true;
    }
    draw(true);
    // speed: characters (pixels) per second; 0 pauses typing
    function update(dt, t, speed) {
      acc += dt; if (acc < 0.08) return; const step = acc; acc = 0;
      if (speed > 0) { typed += speed * step; const ln = lines[lines.length - 1];
        if (typed > ln.len + 20) { lines.push(newLine()); typed = 0; if (lines.length > 60) lines.splice(0, lines.length - 30); } }
      draw(Math.sin(t * 7) > 0);
    }
    screen = { tex, update };
    return screen;
  }
  const BELT = satin(PALETTE.belt, { roughness: 0.45, sheen: 0.5, sheenColor: new THREE.Color("#ffffff"), sheenRoughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.4 });
  const GEM = hex => satin(hex, { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, emissive: new THREE.Color(hex), emissiveIntensity: 0.08 });
  const HAND = satin(PALETTE.hand, { roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.12, sheen: 0.5, sheenColor: new THREE.Color(PALETTE.handShade), sheenRoughness: 0.4,
                                     emissive: new THREE.Color("#F4F0FF"), emissiveIntensity: 0.08 });
  const OUTFIT_MATS = {
    Outfit_Fabric_White:    satin("#F8F3FB", { roughness: 0.7, sheen: 1.0, sheenColor: new THREE.Color("#FFFFFF"), sheenRoughness: 0.55, emissive: new THREE.Color("#FFF6EE"), emissiveIntensity: 0.05 }),
    Outfit_Fabric_Lavender: satin("#A98AEB", { roughness: 0.66, sheen: 1.0, sheenColor: new THREE.Color("#E7D9FF"), sheenRoughness: 0.5, emissive: new THREE.Color("#A98AEB"), emissiveIntensity: 0.06 }),
    Outfit_Trim_Lavender:   satin("#8E6BE0", { roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    Outfit_Buckle:          satin("#8E72DC", { roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.1 }),
    Outfit_Star:            satin("#FFE070", { roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15, emissive: new THREE.Color("#FFD84A"), emissiveIntensity: 0.12 }),
    Outfit_Lace:            satin("#F6B4D2", { roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color("#FFE6F2") }),
    Outfit_Sole:            satin("#FBF8FF", { roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.25 }),
    // knit sweater: royal-blue stockinette with fine pale stripes, cream rib trims and a knitted yellow star
    Sweater_Knit: () => knitMaterial(),
    Sweater_Rib:  satin("#FFF4E4", { roughness: 0.9, sheen: 1.0, sheenColor: new THREE.Color("#FFFFFF"), sheenRoughness: 0.6, emissive: new THREE.Color("#FFF1DE"), emissiveIntensity: 0.06 }),
    Sweater_Star: satin("#FFE070", { roughness: 0.8, sheen: 1.0, sheenColor: new THREE.Color("#FFF6C8"), sheenRoughness: 0.5, emissive: new THREE.Color("#FFD84A"), emissiveIntensity: 0.10 }),
    // fit: soft terry sweatband + wristbands (white with a purple stripe), a glossy purple dumbbell
    Fit_Terry:  () => terryMaterial("#FBF8FF", "#FFFFFF", 0.06),
    Fit_Stripe: () => terryMaterial("#7A55E6", "#C9B6FF", 0.10),
    Fit_Plate:  satin("#7452E4", { roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.4, sheenColor: new THREE.Color("#C8B4FF"), emissive: new THREE.Color("#5B3BD0"), emissiveIntensity: 0.12 }),
    Fit_Track:      satin("#7B57E8", { roughness: 0.48, sheen: 1.0, sheenColor: new THREE.Color("#C9B6FF"), sheenRoughness: 0.45, clearcoat: 0.15, clearcoatRoughness: 0.5, emissive: new THREE.Color("#6A48E0"), emissiveIntensity: 0.08 }),
    Fit_TrackDark:  satin("#5C3DCB", { roughness: 0.52, sheen: 1.0, sheenColor: new THREE.Color("#B7A2FF"), sheenRoughness: 0.45, clearcoat: 0.12, clearcoatRoughness: 0.5, emissive: new THREE.Color("#4F33BD"), emissiveIntensity: 0.08 }),
    Fit_TrackWhite: satin("#FFFFFF", { roughness: 0.45, sheen: 0.6, sheenColor: new THREE.Color("#FFFFFF"), sheenRoughness: 0.5, emissive: new THREE.Color("#F4F0FF"), emissiveIntensity: 0.10 }),
    Fit_TrackRib:   () => ribMaterial("#6646D6", "#C9B6FF"),
    Fit_Zip:        satin("#DCDDE6", { metalness: 0.85, roughness: 0.22 }),
    Fit_Bar:    satin("#EEEAF6", { metalness: 0.45, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.1, emissive: new THREE.Color("#F2EEFF"), emissiveIntensity: 0.05 }),
    // techie: red hoodie, cream cords, silver tips, black frames, a space-grey laptop
    Techie_Fabric: satin("#E2262E", { roughness: 0.78, sheen: 1.0, sheenColor: new THREE.Color("#FF9C9C"), sheenRoughness: 0.5, emissive: new THREE.Color("#E2262E"), emissiveIntensity: 0.06 }),
    Techie_Rib:    () => ribMaterial("#C71C26"),
    Techie_Cord:   satin("#F4ECE4", { roughness: 0.6, sheen: 0.8, sheenColor: new THREE.Color("#FFFFFF"), sheenRoughness: 0.5 }),
    Techie_Metal:  satin("#D9DCE6", { metalness: 0.85, roughness: 0.22 }),
    Techie_Frame:  satin("#1C1A24", { roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }),
    Techie_Laptop: satin("#8C91A0", { metalness: 0.72, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.2 }),
    Techie_Keys:   satin("#262933", { roughness: 0.6 }),
    Techie_Pad:    satin("#A6ABB8", { metalness: 0.55, roughness: 0.28 }),
    Techie_Bezel:  satin("#111218", { roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.05 }),
    // neon: unlit and a touch over-bright so it reads as glowing (the halo pass is kept for the bulb)
    // champion: red fabric with a cream trim, polished gold
    Champ_Band:      () => bandMaterial(),
    Champ_Red:       satin("#D9232E", { roughness: 0.72, sheen: 1.0, sheenColor: new THREE.Color("#FF9A8A"), sheenRoughness: 0.45, emissive: new THREE.Color("#C81E2A"), emissiveIntensity: 0.07, side: THREE.DoubleSide }),
    Champ_RedInner:  satin("#B11824", { roughness: 0.8, sheen: 0.8, sheenColor: new THREE.Color("#FF8A80"), sheenRoughness: 0.5, emissive: new THREE.Color("#9E1520"), emissiveIntensity: 0.06 }),
    Champ_Cream:     satin("#FBEBD3", { roughness: 0.7, sheen: 1.0, sheenColor: new THREE.Color("#FFFFFF"), sheenRoughness: 0.5, emissive: new THREE.Color("#FBEBD3"), emissiveIntensity: 0.06 }),
    Champ_Gold:      satin("#FFC447", { metalness: 0.9, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.1, emissive: new THREE.Color("#D99A22"), emissiveIntensity: 0.32 }),
    Champ_GoldLight: satin("#FFE07A", { metalness: 0.9, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.08, emissive: new THREE.Color("#E8B030"), emissiveIntensity: 0.38 }),
    Techie_Glow:   () => new THREE.MeshBasicMaterial({ color: new THREE.Color("#5FE9FF").multiplyScalar(1.15), toneMapped: false }),
    Techie_Screen: () => new THREE.MeshBasicMaterial({ map: codeScreen().tex, toneMapped: false, side: THREE.DoubleSide }),
  };
  const LIMB = satin(PALETTE.limbs, { roughness: 0.34, clearcoat: 0.35, clearcoatRoughness: 0.3, sheen: 1.0, sheenColor: new THREE.Color(PALETTE.limbSheen), sheenRoughness: 0.4,
                                      emissive: new THREE.Color(PALETTE.limbs), emissiveIntensity: 0.16 });

  // ------------------------------------------------------------ state
  const nodes = {}, mats = {}, morphMeshes = [], fxGroups = {};
  let model = null, mixer = null, actions = {}, current = null, baseAnim = "Idle", headBone = null;
  let emote = null, popT = 10, frozen = false, glow = 0.8;
  let sleeping = false, sleepAmt = 0, sleepEyes = null;
  // Outfits. Each is a set of nodes in the model plus the base parts it covers.
  //  Arms are two bones (upper arm from a ball-and-socket shoulder, forearm + hand from a soft elbow). The bare arm and
  //  both outfits' sleeves share one axis, one skin and the identical white ball hand, so every animation fits them all.
  //  sweater: knit body, rib collar, hem, sleeves, cuffs and its own copy of the ball hands.
  //  hoodie:  the star hoodie (hood lying on the back, slim neckline), lavender cuffs and the same hands; sneakers replace the feet.
  //  fit:     purple track jacket + track pants (belt and gems on show), terry sweatband and wristbands, a dumbbell in
  //           the right hand; its activity is "Curl".
  //  techie:  red </> hoodie, glasses, and a laptop on its own bone (prop.R); its activity is "Type".
  //  An outfit with an activity plays it as Bulbu's motion (emotes still change the face and the glow), and shows the
  //  focused brows from the art.
  const OUTFITS = {
    sweater: { match: /^Sweater_/, covers: ["Body", "Belt", "Gems", "Arm.L", "Arm.R", "Shoulder.L", "Shoulder.R"] },
    hoodie:  { match: /^Outfit_/,  covers: ["Body", "Belt", "Gems", "Foot.L", "Foot.R", "Arm.L", "Arm.R", "Shoulder.L", "Shoulder.R"] },
    fit:     { match: /^Fit_/,     covers: ["Arm.L", "Arm.R", "Shoulder.L", "Shoulder.R"], activity: "Curl", brows: true },
    techie:  { match: /^Techie_/,  covers: ["Body", "Belt", "Gems", "Arm.L", "Arm.R", "Shoulder.L", "Shoulder.R"], activity: "Type", brows: true },
    // champ: CHAMPION headband with fluttering ribbon tails, a red cape, gold medallion and shoulder rings, and a gold
    // trophy hoisted in the right hand; its activity is "Champion" and its happy face has a big open smile
    champ:   { match: /^Champ_/,   covers: [], activity: "Champion", brows: true, happyMouth: { Open: 1 } },
  };
  const outfitNodes = Object.fromEntries(Object.keys(OUTFITS).map(k => [k, []]));
  // holding gear frees the hand: the outfit's own activity (curls, typing, the trophy) pauses until it's put away
  const activity = () => (!gearHeld() && outfit && OUTFITS[outfit].activity && actions[OUTFITS[outfit].activity]) ? OUTFITS[outfit].activity : null;
  let outfit = "sweater";
  // the app's Bulbu ids map onto the 3D outfits ("tech" is Techie Bulbu)
  const OUTFIT_ALIAS = { tech: "techie", champion: "champ" };
  const normOutfit = v => { if (v === true) return "sweater"; v = OUTFIT_ALIAS[v] || v; return (v && OUTFITS[v]) ? v : null; };
  function setOutfit(v) {
    outfit = normOutfit(v);
    const covered = new Set(outfit ? OUTFITS[outfit].covers : []);
    Object.entries(outfitNodes).forEach(([k, list]) => list.forEach(o => { o.visible = k === outfit; }));
    // three.js strips dots from node names on load ("Arm.L" -> "ArmL"), so look both up
    const all = new Set(Object.values(OUTFITS).flatMap(o => o.covers));
    all.forEach(n => { const o = nodes[n] || nodes[n.replace(/\./g, "")]; if (o) o.visible = !covered.has(n); });
    applyGear();
    if (!mixer) return;
    // re-apply the emote: the outfit's face (brows, mouth) and its activity, which takes over the motion; taking the
    // outfit off returns to the emote's own motion
    if (emote) setEmote(emote);
  }
  // ------------------------------------------------------------ gear
  // A real thing the user bought (its own GLB, e.g. their iPad). Bulbu doesn't carry it around: tap Bulbu (or call
  // showGear()) and it plays the item's emote. The item pops into both hands, Bulbu turns to it and looks at it
  // happily for a few seconds, then puts it away. Each model is measured and scaled on load, so any GLB fits:
  //   size    longest side in Bulbu units (Bulbu is ~2.1 tall)
  //   at      where the item's centre sits while Bulbu holds it (model space, Bulbu faces +z)
  //   rot     its rotation there (XYZ radians): the screen faces Bulbu, the back faces you
  //   screen  material names to light up with Bulbu's own glowing wallpaper
  //   body    material names that take the colour of the user's own one (a blue iPad turns Bulbu's iPad blue)
  //   hide    material names of extras to leave out (the iPad model comes with an Apple Pencil and a glass layer)
  // The hold pose: the body from the moment in the "Type" clip where Bulbu leans in, and both arms posed (solved so
  // each hand lands on a side edge of the item: right hand at (-0.21, 0.54, 0.63), left at (0.28, 0.55, 0.49)).
  // Bulbu's arms are short and its bulb is wide, so the item sits just in front of the hands, below the face.
  const GEAR = {
    iphone: { size: 0.56, at: [0.035, 0.57, 0.56], rot: [0.55, Math.PI + 0.32, Math.PI / 2], screen: /screen/i,
              body: /^COLOUR_Cherry_(Backpanel|Side_Panel|Side_Panel_Gloss|Antenna|Aniso|Aniso_0|Plastic|Apple|Side_Button_Detail)$/ },
    ipad:   { size: 0.6, at: [0.035, 0.585, 0.56], rot: [0.25, Math.PI + 0.32, 0], screen: /^screen$/i, flipScreen: true, body: /^Body$/, hide: /^(apple_pencil|glass$)/ },
  };
  const HOLD = { clip: "Type", at: 2.0, D: 5.2, ease: 0.55, arms: {
    "arm_bare.R": [-0.6774, 0.2044, 0.6449, -0.2889], "fore_bare.R": [0.2579, -0.0019, 0.3072, 0.916],
    "arm_bare.L": [0.5252, 0.3524, 0.6974, 0.3369], "fore_bare.L": [-0.029, -0.2559, -0.1992, 0.9455],
  } };
  const holdQ = Object.fromEntries(Object.entries(HOLD.arms).map(([k, q]) => [k, new THREE.Quaternion(...q).normalize()]));
  const HAND_PROPS = ["Champ_Trophy", "Fit_Dumbbell", "Techie_Laptop", "Techie_Laptop_Logo"];
  const gearCache = {};
  let gearId = null, gearGroup = null, showT = -1, holdW = 0, squint = 0;
  const gearHeld = () => showT >= 0;
  function wallpaper(flip = false) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 512; const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 256, 512); grd.addColorStop(0, "#8EA6FF"); grd.addColorStop(0.55, "#B79BFF"); grd.addColorStop(1, "#FFB8D9");
    g.fillStyle = grd; g.fillRect(0, 0, 256, 512);
    const r = g.createRadialGradient(128, 230, 4, 128, 230, 90); r.addColorStop(0, "rgba(255,247,190,1)"); r.addColorStop(1, "rgba(255,230,140,0)");
    g.fillStyle = r; g.beginPath(); g.arc(128, 230, 90, 0, 7); g.fill();
    g.fillStyle = "#FFF6C8"; g.beginPath(); g.ellipse(128, 222, 36, 44, 0, 0, 7); g.fill();          // a tiny Bulbu
    g.fillStyle = "#3A2160"; g.beginPath(); g.arc(114, 226, 6, 0, 7); g.arc(142, 226, 6, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,.85)"; g.font = "bold 44px sans-serif"; g.textAlign = "center"; g.fillText("9:41", 128, 110);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = flip; if (flip) { t.center.set(0.5, 0.5); t.rotation = Math.PI; }
    return new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
  }
  function fitGear(id, scene) {
    const def = GEAR[id] || GEAR.iphone, root = new THREE.Group(), inner = new THREE.Group(), body = [];
    if (def.hide) {        // drop the extras first, so they don't count in the size
      const drop = []; scene.traverse(o => { if (o.isMesh && (Array.isArray(o.material) ? o.material : [o.material]).some(m => def.hide.test(m.name || ""))) drop.push(o); });
      drop.forEach(o => o.parent.remove(o));
    }
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const k = def.size / Math.max(size.x, size.y, size.z);
    scene.position.sub(mid); inner.add(scene); inner.scale.setScalar(k);
    scene.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false; o.userData.gearMesh = true;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      if (def.screen && ms.some(m => def.screen.test(m.name || ""))) o.material = wallpaper(!!def.flipScreen);
      else if (def.body) ms.forEach(m => { if (def.body.test(m.name || "") && m.color) { m.userData.base = m.color.clone(); body.push(m); } });
    });
    root.userData.body = body;
    root.position.set(...def.at); root.rotation.set(...def.rot);
    root.add(inner); root.userData.gear = id; root.visible = false;
    return root;
  }
  function applyGear() {
    const held = gearHeld();
    HAND_PROPS.forEach(n => { const o = nodes[n] || nodes[n.replace(/\./g, "")]; if (o && held) o.visible = false; });
  }
  // the user's colour on the body parts, kept a touch darker and glossy so it still reads as metal and glass
  function tintGear(color) {
    (gearGroup?.userData.body || []).forEach(m => {
      m.userData.metal ??= [m.metalness, m.roughness];
      if (!color) { m.color.copy(m.userData.base); [m.metalness, m.roughness] = m.userData.metal; return; }
      // less mirror-like, so the colour still reads in a dim world
      m.metalness = Math.min(m.userData.metal[0], 0.25); m.roughness = Math.max(m.userData.metal[1], 0.32);
      const c = new THREE.Color(color), hsl = {}; c.getHSL(hsl);
      m.color.setHSL(hsl.h, Math.min(1, hsl.s * 1.05), Math.min(0.62, hsl.l * 0.92));
    });
  }
  /** setGear(id, url, { color }): give Bulbu a real-life item (in the user's colour) to show off; setGear(null) takes it back. */
  function setGear(id, url, opts = {}) {
    if (showT >= 0) endShow();
    if (gearGroup) { gearGroup.visible = false; gearGroup.parent && gearGroup.parent.remove(gearGroup); }
    gearId = id || null; gearGroup = null;
    if (!gearId || !url) return;
    const want = gearId;
    const done = scene => {
      if (gearId !== want || !model) return;
      gearGroup = gearCache[want] = gearCache[want] || fitGear(want, scene);
      model.add(gearGroup); gearGroup.visible = false; tintGear(opts.color);
      if (pendingShow) { pendingShow = false; showGear(); }
    };
    if (gearCache[want]) return done(null);
    new GLTFLoader().load(url, g => done(g.scene), undefined, err => console.warn("gear", want, err));
  }
  // The item's emote. Called before the model has loaded, it plays as soon as it can.
  let pendingShow = false, holdAction = null;
  function showGear() {
    if (!gearId) return false;
    if (!gearGroup || !model) { pendingShow = true; return true; }
    showT = 0; popT = 0; released = false;
    setEmote("happy");
    const a = actions[HOLD.clip];
    if (a) {
      holdAction = a; a.reset(); a.time = HOLD.at; a.timeScale = 0; a.setEffectiveWeight(1).fadeIn(0.45).play();
      Object.values(actions).forEach(x => { if (x !== a && x.getEffectiveWeight() > 0) x.fadeOut(0.45); });
      current = a;
    }
    applyGear();
    return true;
  }
  // As the item shrinks away the arms come down: the hold pose fades out (still frozen, so no typing) into the motion
  // Bulbu had before, once. Then everything is back to normal until the next tap.
  let released = false, heldClip = null;
  function releaseHold() {
    if (released) return;
    released = true;
    const a = holdAction; holdAction = null; heldClip = a;
    const back = baseAnim === HOLD.clip ? "Idle" : baseAnim, next = actions[back];
    if (next) { next.reset().setEffectiveWeight(1).fadeIn(HOLD.ease).play(); current = next; playing = back; }
    Object.values(actions).forEach(x => { if (x !== next && x.getEffectiveWeight() > 0) x.fadeOut(HOLD.ease); });
  }
  function endShow() {
    releaseHold();
    showT = -1; holdW = 0; squint = 0;
    if (headBone) headBone.quaternion.copy(headBone.userData.rest[1]);
    if (gearGroup) { gearGroup.visible = false; gearGroup.scale.setScalar(1); }
    if (model) model.rotation.y = 0;
    if (heldClip) { heldClip.stop(); heldClip.timeScale = 1; heldClip = null; }
    setOutfit(outfit);                 // the outfit's own motion (typing, curls) and face come back
  }
  const qLook = new THREE.Quaternion(), eLook = new THREE.Euler();
  function updateGear(dt, t) {
    if (showT < 0 || !gearGroup) return;
    showT += dt;
    const { D, ease } = HOLD;
    const w = showT < ease ? showT / ease : showT > D - ease ? Math.max(0, (D - showT) / ease) : 1;
    holdW = w * w * (3 - 2 * w);                               // smoothstep in and out
    // the item pops into the hands (a little overshoot), bobs while Bulbu looks at it, and shrinks away at the end
    const pop = showT < ease ? 1 + 0.18 * Math.sin(Math.PI * Math.min(1, showT / ease)) : 1;
    gearGroup.visible = holdW > 0.02;
    gearGroup.scale.setScalar(Math.max(0.001, holdW * pop));
    const def = GEAR[gearId] || GEAR.iphone;
    gearGroup.position.set(def.at[0], def.at[1] + (motion ? Math.sin(t * 2.2) * 0.012 : 0), def.at[2]);
    // the arms ease from whatever they were doing into the hold, and back out as the item goes
    for (const [k, q] of Object.entries(holdQ)) { const b = nodes[k] || nodes[k.replace(/\./g, "")]; if (b) b.quaternion.slerp(q, holdW); }
    // Bulbu turns toward it, tips its head down to look, and its eyes go soft and happy
    model.rotation.y = 0.2 * holdW;
    if (headBone) {
      eLook.set(0.08 * holdW, 0.2 * holdW, -0.05 * holdW); qLook.setFromEuler(eLook);
      headBone.quaternion.multiply(qLook);
    }
    squint = 0.38 * holdW;
    if (showT >= D - ease) releaseHold();
    if (showT >= D) endShow();
  }

  const SLEEP_HIDE = ["Eyes_Closed", "Eyes_Squeeze", "Eye_Stars", "Brows_Focused", "Brows_Drained", ...FX];
  const target = { morph: {}, center: new THREE.Color(), edge: new THREE.Color(), stops: Array.from({ length: 7 }, () => new THREE.Color()),
                   rainbow: 0, cz: 1.2, smin: 0.12, smax: 1.0, fil: new THREE.Color(), halo: new THREE.Color(), haloPow: 1 };
  const now = { morph: {} };
  // colours are hex strings (sRGB) or calibrated [r, g, b] arrays in linear space
  const col = v => Array.isArray(v) ? new THREE.Color(v[0], v[1], v[2]) : new THREE.Color(v);
  const stats = {};

  // FX meshes are skinned to the head bone with full weight. Re-parent them as plain meshes under the head bone
  // so they can be animated (bob, drip, swirl) without touching the rig.
  function rigidify(name) {
    const node = nodes[name]; if (!node || !headBone) return;
    const g = new THREE.Group(); g.name = name + "_fx"; headBone.add(g);
    node.traverse(o => {
      if (!o.isSkinnedMesh) return;
      const i = o.skeleton.bones.indexOf(o.skeleton.getBoneByName(headBone.name));
      const mesh = new THREE.Mesh(o.geometry, o.material);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(o.skeleton.boneInverses[i]).multiply(o.bindMatrix);
      mesh.layers.mask = o.layers.mask; mesh.frustumCulled = false;
      g.add(mesh);
    });
    node.visible = false;
    fxGroups[name] = g; g.visible = false;
  }
  const partNode = p => fxGroups[p] || nodes[p];

  // Sleeping eyes: the happy closed-eye arcs (∩) flipped upside down into relaxed, downturned lids (∪).
  function buildSleepEyes() {
    const src = nodes.Eyes_Closed; if (!src || !headBone) return null;
    const g = new THREE.Group(); g.name = "Eyes_Sleep"; headBone.add(g);
    const yc = (1300 - 630) * PX - 0.006;     // flip about the eye centre line, then the lids sit a touch low
    const flip = new THREE.Matrix4().makeTranslation(0, yc, 0)
      .multiply(new THREE.Matrix4().makeScale(1, -1, 1)).multiply(new THREE.Matrix4().makeTranslation(0, -yc, 0));
    src.traverse(o => {
      if (!o.isSkinnedMesh) return;
      const i = o.skeleton.bones.indexOf(o.skeleton.getBoneByName(headBone.name));
      const mat = o.material.clone(); mat.side = THREE.DoubleSide;   // the flip reverses the winding
      const mesh = new THREE.Mesh(o.geometry, mat);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(o.skeleton.boneInverses[i]).multiply(flip).multiply(o.bindMatrix);
      mesh.renderOrder = 10; mesh.frustumCulled = false;
      faceMeshes.add(mesh);
      g.add(mesh);
    });
    g.visible = false;
    return g;
  }

  // Which face parts show: the emote's own, or the sleeping face.
  function applyFace() {
    const e = emotes[emote]; if (!e) return;
    if (sleeping) {
      if (nodes.Eyes) nodes.Eyes.visible = false;
      SLEEP_HIDE.forEach(p => { const n = partNode(p); if (n) n.visible = false; });
      if (sleepEyes) sleepEyes.visible = true;
    } else {
      if (sleepEyes) sleepEyes.visible = false;
      if (nodes.Eyes) nodes.Eyes.visible = e.eyes === "open";
      (mats["Eye_Heart"] || []).forEach(o => { o.visible = e.hearts; });
      PARTS.forEach(p => { const n = partNode(p); if (n) n.visible = e.parts.includes(p); });
      if (outfit && OUTFITS[outfit].brows && e.eyes === "open" && !e.parts.includes("Brows_Drained")) {
        const b = partNode("Brows_Focused"); if (b) b.visible = true;
      }
    }
  }

  // ------------------------------------------------------------ load
  const buf = glbBytes.buffer.slice(glbBytes.byteOffset, glbBytes.byteOffset + glbBytes.byteLength);
  new GLTFLoader().parse(buf, "", gltf => {
    model = gltf.scene;
    let tris = 0, bones = 0;
    model.traverse(o => {
      if (o.name) nodes[o.name] = nodes[o.name] || o;
      if (o.isBone) { bones++; if (o.name === "head") headBone = o; o.userData.rest = [o.position.clone(), o.quaternion.clone(), o.scale.clone()]; }
      if (!o.isMesh) return;
      o.frustumCulled = false;
      const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { (mats[m.name] = mats[m.name] || []).push(o); });
      if (o.morphTargetDictionary) morphMeshes.push(o);
    });
    const swap = (name, mk, bloom) => (mats[name] || []).forEach(o => { o.material = mk(); if (bloom) o.layers.enable(BLOOM_LAYER); });
    swap("Bulb_Core", coreMaterial, true);
    (mats["Bulb_Core"] || []).forEach(o => coreMeshes.push(o));
    swap("Bulb_Glass", glassMaterial, false);
    swap("Eye_Purple", eyeMaterial, false);
    swap("Cheek_Blush", blushMaterial, false);
    swap("Body_Cream", bodyMaterial, false);
    swap("Belt_Mint", BELT, false);
    swap("Gem_Yellow", GEM(PALETTE.gemYellow), false);
    swap("Gem_Coral", GEM(PALETTE.gemCoral), false);
    swap("Gem_Blue", GEM(PALETTE.gemBlue), false);
    swap("Limb_Lavender", LIMB, false);
    swap("Hand_White", HAND, false);
    Object.entries(OUTFIT_MATS).forEach(([n, mk]) => swap(n, mk, false));
    model.traverse(o => {
      for (const [k, def] of Object.entries(OUTFITS))
        if (def.match.test(o.name) && !def.match.test(o.parent?.name || "")) outfitNodes[k].push(o);
    });
    setOutfit(outfit);
    (mats["Filament"] || []).forEach(o => { o.material = new THREE.MeshBasicMaterial({ color: 0xfcf296, toneMapped: false }); o.layers.enable(BLOOM_LAYER); filMeshes.push(o); });
    (mats["FX_Sparkle"] || []).forEach(o => { o.material = new THREE.MeshBasicMaterial({ color: 0xfff1b8, toneMapped: false, transparent: true }); o.layers.enable(BLOOM_LAYER); });
    ["Eye_Shine", "Eye_Heart", "Eye_Star"].forEach(n => (mats[n] || []).forEach(o => { o.material = new THREE.MeshBasicMaterial({ color: o.material.color, toneMapped: false }); }));
    (mats["Eye_Shine"] || []).forEach(o => o.material.color.set(PALETTE.shine));
    (mats["Eye_Heart"] || []).forEach(o => o.material.color.set(PALETTE.heart));
    (mats["FX_Sweat"] || []).forEach(o => { o.material.transparent = true; });
    (mats["FX_StressMark"] || []).forEach(o => { o.material.transparent = true; });
    (mats["Bulb_Glass"] || []).forEach(o => hiddenForBloom.push(o));
    ["Eye_Purple", "Eye_Shine", "Eye_Heart", "Eye_Star", "Face_Line", "Mouth", "Tongue", "Cheek_Blush"].forEach(n =>
      (mats[n] || []).forEach(o => { o.renderOrder = n === "Cheek_Blush" ? 5 : 10; o.material.transparent = true; if (n !== "Cheek_Blush") faceMeshes.add(o); }));
    scene.add(model);
    model.updateMatrixWorld(true);
    FX.forEach(rigidify);
    sleepEyes = buildSleepEyes();

    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach(clip => {
      const a = mixer.clipAction(clip);
      if (clip.name.startsWith("Wave")) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = false; }
      actions[clip.name] = a;
    });
    mixer.addEventListener("finished", () => play(baseAnim));

    const keys = new Set(); morphMeshes.forEach(m => Object.keys(m.morphTargetDictionary).forEach(k => keys.add(k)));
    Object.assign(stats, { triangles: Math.round(tris), bones, shapeKeys: keys.size, animations: gltf.animations.length, emoteParts: PARTS.length });
    setEmote("happy", true);
    onReady && onReady(api);
  }, err => { onReady && onReady(null, err); });

  // ------------------------------------------------------------ emotes & animation
  function setEmote(name, instant = false) {
    const e = emotes[name]; if (!e || !model) return;
    if (name !== emote && !instant) popT = 0;
    emote = name;
    const keys = { Blink: 0, Sleepy: 0, Small: 0, Frown: 0, Wavy: 0, Open: 0, Fil_Focus: 0, Fil_Drained: 0, Fil_Zigzag: 0 };
    Object.assign(keys, e.eyeKeys, e.mouth); if (e.filamentShape) keys[e.filamentShape] = 1;
    if (name === "happy" && outfit && OUTFITS[outfit].happyMouth) Object.assign(keys, OUTFITS[outfit].happyMouth);
    target.morph = keys;
    const g = e.live || {};   // calibrated values for this renderer (see project/calibrate.py); fall back to the art's colours
    target.center.copy(col(g.center || e.viewCenter));
    target.rainbow = e.viewRainbow ? 1 : 0;
    if (e.viewEdge) target.edge.copy(col(g.edge || e.viewEdge));
    if (e.viewRainbow) { e.viewRainbow.forEach(([, c], i) => target.stops[i].copy(col(g.rainbow ? g.rainbow[i] : c))); target.edge.copy(target.stops[4]); }
    else target.stops.forEach(s => s.copy(target.edge));
    target.cz = e.viewRainbow ? 1.36 : 1.20; target.smin = e.viewRainbow ? 0.22 : 0.12; target.smax = e.viewRainbow ? 0.80 : 1.0;
    target.fil.copy(col(e.filament));
    target.halo.copy(col(e.halo)); target.haloPow = e.haloPower;
    sleeping = false;
    applyFace();
    if (instant) {
      Object.assign(now.morph, target.morph);
      U.center.value.copy(target.center); U.edge.value.copy(target.edge); U.rainbowOn.value = target.rainbow;
      U.stops.value.forEach((s, i) => s.copy(target.stops[i]));
      U.cz.value = target.cz; U.spreadMin.value = target.smin; U.spreadMax.value = target.smax;
      U.bodyTint.value.copy(target.center);
    }
    const [anim0, speed0] = MOTION[name], act = activity();
    const anim = act || anim0, speed = act ? 1 : speed0;
    baseAnim = anim; setSpeed(anim, speed);
    play(anim, 0.35, true);
    onEmote && onEmote(name);
  }

  // fromEmote: the emote chose this motion (Drained uses Sleepy with its own droopy face);
  // otherwise the Sleepy button puts Bulbu properly to sleep, and any other animation wakes it up.
  // Every outfit uses the same clips: the sleeves ride on the arm bones, so nothing needs re-timing.
  const clip = name => actions[name];
  function setSpeed(name, v) { if (actions[name]) actions[name].timeScale = v; }
  let playing = "Idle";
  function play(name, fade = 0.35, fromEmote = false) {
    // showing off an item holds its pose; the motion asked for now plays when it's put away
    if (showT >= 0) { if (name !== "Wave" && name !== HOLD.clip) baseAnim = name; return; }
    const act = activity();
    if (act && name !== act) {            // holding a prop: keep doing the activity (only the sleepy face follows)
      if (!fromEmote) { const s = name === "Sleepy"; if (s !== sleeping) { sleeping = s; applyFace(); } }
      name = act; fromEmote = true;
    }
    const next = clip(name); if (!next) return;
    if (!fromEmote) {
      const s = name === "Sleepy";
      if (s !== sleeping) { sleeping = s; applyFace(); }
      if (s) setSpeed(name, 0.8);
    }
    if (name !== "Wave") baseAnim = name;
    if (current === next && name !== "Wave") return;
    next.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (current && current !== next) current.fadeOut(fade);
    current = next; playing = name;
    onAnim && onAnim(name);
  }

  // click / tap Bulbu to poke it: it waves back
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let downAt = null;
  renderer.domElement.addEventListener("pointerdown", e => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener("pointerup", e => {
    if (!downAt || !model) return;
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]); downAt = null;
    if (moved > 6) return;                              // that was an orbit drag, not a tap
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(model, true).length) poke();
  });
  // tapping Bulbu: with a real-life item it shows it off, otherwise it waves back
  function poke() { popT = 0; if (gearId && gearGroup) { if (showT < 0) showGear(); } else if (!activity()) play("Wave"); onPoke && onPoke(); }

  // ------------------------------------------------------------ loop
  const clock = new THREE.Clock();
  let nextBlink = 2.5, blinkT = -1;
  const tmpC = new THREE.Color(), white = new THREE.Color("#f6eeff"), sparkleWhite = new THREE.Color(1.0, 0.92, 0.6);
  const headTop = new THREE.Vector3();
  const motion = reduceMotion ? 0 : 1;

  let paused = false;
  renderer.setAnimationLoop(() => {
    if (paused) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (stageUpdate) stageUpdate(dt, t);
    if (!model) { renderFrame(); return; }
    // while Bulbu shows an item off its head is turned on top of the clip: start each frame from the rest pose
    if (showT >= 0 && headBone) headBone.quaternion.copy(headBone.userData.rest[1]);
    if (!frozen) mixer.update(dt);
    updateGear(dt, t);
    if (screen && outfit === "techie") {
      // type while the hands are on the keys (the typing part of the clip), pause while carrying
      const a = actions.Type, tt = a ? a.time : 0;
      screen.update(dt, t, motion && tt > 2.5 && tt < 11.3 ? 260 : 0);
    }
    const k = 1 - Math.exp(-dt * 7);
    sleepAmt += ((sleeping ? 1 : 0) - sleepAmt) * (1 - Math.exp(-dt * 3));
    const faceTarget = sleeping ? { ...target.morph, Blink: 0, Sleepy: 0, Small: 0.55, Frown: 0.45, Wavy: 0, Open: 0 } : target.morph;
    for (const n in faceTarget) now.morph[n] = (now.morph[n] ?? 0) + (faceTarget[n] - (now.morph[n] ?? 0)) * k;

    // idle blinking on open-eyed emotes
    let blink = 0;
    const e = emotes[emote];
    if (motion && e.eyes === "open" && !e.eyeKeys.Sleepy) {
      if (t > nextBlink && blinkT < 0) blinkT = 0;
      if (blinkT >= 0) { blinkT += dt; blink = Math.sin(Math.min(blinkT / 0.16, 1) * Math.PI); if (blinkT > 0.16) { blinkT = -1; nextBlink = t + 2.5 + Math.random() * 3; } }
    }
    morphMeshes.forEach(mesh => {
      for (const [name, i] of Object.entries(mesh.morphTargetDictionary)) {
        let v = now.morph[name] ?? 0; if (name === "Blink") v = Math.max(v, blink, squint);
        mesh.morphTargetInfluences[i] = v;
      }
    });

    // glow
    U.center.value.lerp(target.center, k); U.edge.value.lerp(target.edge, k);
    U.rainbowOn.value += (target.rainbow - U.rainbowOn.value) * k;
    U.stops.value.forEach((s, i) => s.lerp(target.stops[i], k));
    U.cz.value += (target.cz - U.cz.value) * k; U.spreadMin.value += (target.smin - U.spreadMin.value) * k; U.spreadMax.value += (target.smax - U.spreadMax.value) * k;
    const flicker = motion && !frozen && emote === "stressed" ? 0.94 + 0.06 * Math.sin(t * 23) * Math.sin(t * 7.3) : 1;
    const breathe = motion ? 0.5 + 0.5 * Math.sin(t * 1.6) : 0.5;
    const dim = 1 - sleepAmt * (0.22 - 0.06 * breathe);    // asleep: glow drops to ~80% and pulses gently
    U.power.value = flicker * dim;   // the head's own colour stays true; the Glow control only sets the halo
    tmpC.copy(U.rainbowOn.value > 0.5 ? U.stops.value[4] : U.edge.value);
    U.rimTint.value.copy(white).lerp(tmpC, 0.3);
    U.bodyTint.value.lerp(target.center, k);
    (mats["Filament"] || []).forEach(o => o.material.color.lerp(target.fil, k));
    mixPass.uniforms.filTint.value.lerp(target.fil, k);
    mixPass.uniforms.filPower.value = 0.9 * glow * flicker * (1 - 0.45 * sleepAmt);
    mixPass.uniforms.tint.value.lerp(target.halo, k);
    mixPass.uniforms.power.value += (target.haloPow * 0.95 * glow * flicker * (1 - 0.4 * sleepAmt) - mixPass.uniforms.power.value) * k;
    glowLight.color.copy(U.center.value); glowLight.intensity = 1.6 * target.haloPow * glow * stageGlow;

    // squash-and-stretch pop when the emote changes or Bulbu is poked
    popT += dt;
    const s = motion ? Math.sin(popT * 16) * Math.exp(-popT * 5.5) * 0.07 : 0;
    model.scale.set(1 + s, 1 - s, 1 + s);

    // FX life
    if (motion) {
      const sw = fxGroups.FX_Sweat;
      if (sw && sw.visible) {
        const p = (t % 1.8) / 1.8;
        sw.position.y = -0.07 * p * p;
        const a = Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.25);
        sw.children.forEach(m => { m.material.opacity = 0.9 * a; });
      }
      const sm = fxGroups.FX_StressMarks;
      if (sm && sm.visible) sm.children.forEach(m => { m.material.opacity = 0.45 + 0.55 * (Math.sin(t * 9) > -0.2 ? 1 : 0); });
      const sp = fxGroups.FX_Sparkles;
      if (sp && sp.visible) sp.children.forEach(m => { m.material.color.copy(sparkleWhite).multiplyScalar(1.0 + 0.25 * Math.sin(t * 5)); });
      const cf = fxGroups.FX_Confetti;
      if (cf && cf.visible) { cf.position.y = 0.035 * Math.sin(t * 2.2); cf.rotation.y = 0.18 * Math.sin(t * 1.3); }
    }

    controls.update();
    renderFrame();
  });

  function setTheme(isDark) { bgColor = new THREE.Color(isDark ? "#1b1622" : "#efeae6"); }
  // the app paints Bulbu onto its own surface colour (sRGB hex)
  function setBackground(hex) { bgColor = new THREE.Color(hex); }

  // screen position of the top of Bulbu's head (for the speech bubble)
  function headScreen() {
    if (!headBone) return null;
    headBone.localToWorld(headTop.set(0, 1.42, 0));
    headTop.project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: (headTop.x * 0.5 + 0.5) * r.width, y: (-headTop.y * 0.5 + 0.5) * r.height };
  }

  // the head's on-screen extent (top of the bulb to the neck), so UI can keep clear of the face
  const headBase = new THREE.Vector3();
  function headBox() {
    if (!headBone) return null;
    const r = renderer.domElement.getBoundingClientRect();
    headBone.localToWorld(headTop.set(0, 1.42, 0)); headTop.project(camera);
    headBone.localToWorld(headBase.set(0, 0, 0)); headBase.project(camera);
    const top = (-headTop.y * 0.5 + 0.5) * r.height, bottom = (-headBase.y * 0.5 + 0.5) * r.height;
    const x = (headTop.x * 0.5 + 0.5) * r.width, half = Math.abs(bottom - top) * 0.46;
    return { x, top, bottom, left: x - half, right: x + half };
  }

  const api = {
    setEmote, play, poke, headScreen, headBox, setTheme, setBackground, setStage, stats,
    // stop rendering while Bulbu is off-screen (saves battery on phones)
    set paused(v) { paused = !!v; }, get paused() { return paused; },
    setView(pos, target) { camera.position.set(...pos); controls.target.set(...target); controls.update(); },
    set interactive(v) { controls.enabled = !!v; }, get interactive() { return controls.enabled; }, debug: { mix: mixPass.uniforms, nodes, mats, actions },
    // test hooks: hold the rig still and project a model-space point to the screen
    freeze(v = true) { frozen = v; if (v && actions[baseAnim]) { mixer.stopAllAction(); model.traverse(o => { if (o.isBone && o.userData.rest) { o.position.copy(o.userData.rest[0]); o.quaternion.copy(o.userData.rest[1]); o.scale.copy(o.userData.rest[2]); } }); } },
    toScreen(x, y, z) {
      const v = new THREE.Vector3(x, y, z).project(camera); const r = renderer.domElement.getBoundingClientRect();
      return [(v.x * 0.5 + 0.5) * r.width + r.left, (-v.y * 0.5 + 0.5) * r.height + r.top];
    },
    get emote() { return emote; },
    set autoRotate(v) { controls.autoRotate = v; }, get autoRotate() { return controls.autoRotate; },
    set glow(v) { glow = Math.max(0, Math.min(1.2, v)); }, get glow() { return glow; },
    get sleeping() { return sleeping; },
    // "sweater", "hoodie" or null (true means the sweater)
    set outfit(v) { setOutfit(v); }, get outfit() { return outfit; },
    // a real-life item Bulbu can show off (its own GLB): setGear("ipad", url, { color }) / setGear(null);
    // showGear() plays its emote (tapping Bulbu does too)
    setGear, showGear, get gear() { return gearId; }, get showing() { return showT >= 0; }, gearDefs: GEAR,
    outfits: Object.keys(OUTFITS),
    resetView() { camera.position.set(0.75, 1.2, 5.6); controls.target.set(0, 1.1, 0); controls.update(); },
  };
  return api;
}
