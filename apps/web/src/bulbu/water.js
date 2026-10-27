// A calm water-glass floor: a real mirror reflection of Bulbu and its pedestal (three's Reflector), gently rippled,
// tinted and fading out with distance, plus a soft contact shadow where the pedestal meets the surface. The floor is
// otherwise clear, so the painted backdrop's floor colour shows through it.
import { Reflector } from "three/addons/objects/Reflector.js";

export function addWaterFloor({ THREE, scene, group, y, tint = [0.82, 0.80, 1.0], strength = 0.6, shadow = [0.32, 0.26, 0.58, 0.32], size = 1024 }) {
  const shader = {
    name: "BulbuWater",
    uniforms: {
      color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
      time: { value: 0 }, tint: { value: new THREE.Color(...tint) }, strength: { value: strength },
    },
    vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
      void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform vec3 tint; uniform float strength;
      varying vec4 vUv; varying vec3 vW;
      void main(){
        vec2 p = vW.xz;
        float d = length(p * vec2(0.9, 0.42));                     // stretched toward the viewer, where the reflection lands
        // slow, gentle ripples, calm right under the pedestal and a little livelier further out
        float k = smoothstep(1.0, 3.0, d);
        vec2 rip = vec2(sin(p.y * 7.0 + time * 1.3) + 0.6 * sin(p.x * 11.0 - time * 0.9),
                        cos(p.x * 6.0 + time * 1.1) + 0.6 * cos(p.y * 9.0 + time * 0.7)) * (0.0015 + 0.004 * k);
        vec4 uv = vUv; uv.xy += rip * uv.w;
        vec4 r = texture2DProj(tDiffuse, uv);
        vec3 col = r.rgb / max(r.a, 0.001);                       // the mirror target holds premultiplied colour
        col = mix(col, tint, 0.28);
        float fade = 1.0 - smoothstep(1.6, 3.6, d);                // the reflection fades out with distance
        gl_FragColor = vec4(col, clamp(r.a, 0.0, 1.0) * strength * fade);
      }`,
  };
  const geo = new THREE.PlaneGeometry(40, 40);
  const mirror = new Reflector(geo, { shader, textureWidth: size, textureHeight: size, clipBias: 0.002 });
  mirror.material.transparent = true; mirror.material.depthWrite = false;
  mirror.rotation.x = -Math.PI / 2; mirror.position.y = y; mirror.renderOrder = -3;
  mirror.userData.noMask = true; mirror.userData.noBloom = true;
  // the reflection shows only Bulbu and its pedestal (not the painted sky): render it on a clear background
  const base = mirror.onBeforeRender, cc = new THREE.Color();
  mirror.onBeforeRender = function (renderer, sc, camera, ...rest) {
    const bg = sc.background, a = renderer.getClearAlpha(); renderer.getClearColor(cc);
    sc.background = null; renderer.setClearColor(0x000000, 0);
    base.call(this, renderer, sc, camera, ...rest);
    sc.background = bg; renderer.setClearColor(cc, a);
  };
  group.add(mirror);

  // soft contact shadow around the pedestal's foot
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d"), gr = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  const [sr, sg, sb, sa] = shadow.map((v, i) => (i < 3 ? Math.round(v * 255) : v));
  gr.addColorStop(0, `rgba(${sr},${sg},${sb},${sa})`); gr.addColorStop(0.55, `rgba(${sr},${sg},${sb},${sa * 0.5})`); gr.addColorStop(1, `rgba(${sr},${sg},${sb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  shade.material.map.colorSpace = THREE.SRGBColorSpace;
  shade.rotation.x = -Math.PI / 2; shade.position.y = y + 0.002; shade.renderOrder = -2;
  shade.userData.noMask = true;
  group.add(shade);

  return t => { mirror.material.uniforms.time.value = t; };
}
