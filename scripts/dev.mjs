// npm run dev: the API (port 8787) and the web app (port 5173) together.
import { spawn } from "node:child_process";

const run = (name, args, color) => {
  const p = spawn("npm", args, { stdio: ["inherit", "pipe", "pipe"], env: process.env });
  const tag = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = s => d => s.write(d.toString().replace(/^(?=.)/gm, tag));
  p.stdout.on("data", pipe(process.stdout)); p.stderr.on("data", pipe(process.stderr));
  return p;
};
const procs = [run("api", ["run", "dev", "-w", "@bulbu/server"], 35), run("web", ["run", "dev", "-w", "@bulbu/web"], 36)];
const stop = () => { procs.forEach(p => p.kill()); process.exit(); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
procs.forEach(p => p.on("exit", code => { if (code) stop(); }));
