// The 3D model lives in the web app (one source of truth). Copy it into this app's public/ folder, which Expo serves
// to the 3D view in development and bundles into the native app. Runs before start and after install.
import { chmodSync, copyFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, "../../web/public"), to = join(here, "../public");
mkdirSync(join(to, "gear"), { recursive: true });
// gear/: real-life items Bulbu can hold (one GLB each)
for (const f of ["bulbu.glb", "bulbu.svg", "gear/iphone.glb", "gear/ipad.glb"]) {
  const a = join(from, f), b = join(to, f);
  let same = false;
  try { const sa = statSync(a), sb = statSync(b); same = sa.size === sb.size && sb.mtimeMs >= sa.mtimeMs; } catch { /* not copied yet */ }
  if (!same) { rmSync(b, { force: true }); copyFileSync(a, b); chmodSync(b, 0o644); console.log(`[bulbu] copied ${f}`); }
}
