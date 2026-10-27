import { Link } from "react-router-dom";
import { type GoalView } from "../api";
import { Bulbu } from "../bulbu/Bulbu";
import { Screen, fmtDate, greeting } from "../components/ui";
import { LiquidProgressBar, type LiquidScheme } from "../components/LiquidProgressBar";
import { Num } from "../components/fx";
import { HomeHeader } from "../components/HomeHeader";
import { GlossyIcon } from "../components/GlossyIcon";
import { useStore } from "../store";

/** Where a goal's daily task takes you on the Log screen. */
export const TASK_LOG: Record<string, string> = {
  dsa: "code", reading: "read", fitness: "workout", savings: "save", iphone: "save", learning: "study", productivity: "focus", custom: "focus",
};

/** Small stars that twinkle over the painted sky (positions as % of the screen). */
const TWINKLES: [number, number][] = [[30, 13], [62, 11], [92, 17], [7, 24], [56, 33], [95, 40], [10, 55], [86, 60], [37, 43], [76, 6]];

/** Home: just Bulbu, standing on its glass pedestal in its own night-sky world. Its mood and glow still follow your
 *  day; tap it and it waves. */
export function Home() {
  const { state, reaction } = useStore();
  if (!state) return null;
  const s = state;
  const emote = reaction?.emote ?? s.emote;

  return (
    <Screen tabs className="home-world">
      <Bulbu world emote={emote} glow={reaction?.glow ?? s.glow} outfit={s.user.outfit} line={reaction?.line} className="home-world-stage" />
      <div className="home-twinkles" aria-hidden="true">
        {TWINKLES.map(([x, y], i) => <i key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i * 0.73) % 4}s`, animationDuration: `${2.6 + (i % 4) * 0.7}s` }} />)}
      </div>
      <div className="home-world-top">
        <HomeHeader name={s.user.name} greeting={greeting()} nudges={s.nudges.length} />
      </div>
    </Screen>
  );
}

export const schemeFor = (g: GoalView): LiquidScheme => g.template === "reading" ? "reading" : g.template === "fitness" ? "fitness" : "dsa";

export function GoalRow({ g }: { g: GoalView }) {
  const f = g.forecast;
  const scheme = schemeFor(g);
  return (
    <Link to={`/goals/${g.id}`} className="goal-row" style={{ color: "inherit" }}>
      <GlossyIcon name={g.template} size={46} />
      <div className="goal-body">
        <div className="row between"><b className="goal-name">{g.title}</b><b className="goal-pct">{f.done ? "Done!" : <Num value={Math.round(f.percent)} suffix="%" />}</b></div>
        <LiquidProgressBar value={f.percent} colorScheme={scheme} height={18} ariaLabel={`${g.title} progress`} />
        <span className="muted tiny">{g.subtitle} · {f.done ? "complete" : `on pace for ${fmtDate(f.eta)}`}</span>
      </div>
    </Link>
  );
}
