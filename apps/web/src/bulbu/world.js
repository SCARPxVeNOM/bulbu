// Bulbu's home worlds: a painted sky (sky.js) plus the glass pedestal and light ribbons (stage3d.js), with a fixed
// camera that frames Bulbu in the lower middle of the screen. Used by <Bulbu world /> on the Home screen.
//   DAY_WORLD   dreamy pastel sky with moon, stars and soft clouds (the one Home uses)
//   NIGHT_WORLD deep starry night: dark sky, Milky Way, moonlit clouds; Bulbu lit dimmer, its own glow warmer
import { paintSky } from "./sky.js";
import { buildStage } from "./stage3d.js";
import { paintNightSky } from "./sky-night.js";
import { buildNightStage } from "./stage3d-night.js";

const DEG = Math.PI / 180;
function view(aspect) {
  const tanV = Math.tan(19 * DEG), minAspect = 0.62;
  const tv = aspect < minAspect ? tanV * minAspect / aspect : tanV;   // narrow phones: keep the pedestal on screen
  return { pos: [0, 1.15, 9.5], target: [0, 1.42, 0], fov: 2 * Math.atan(tv) / DEG };
}

export const DAY_WORLD = { orbit: false, background: paintSky, build: buildStage, view };
export const NIGHT_WORLD = {
  orbit: false, background: paintNightSky, build: buildNightStage, view,
  light: { scale: 0.62, tint: "#c3c8ff", glow: 1.8, env: 0.6 },
};
