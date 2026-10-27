import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Header, Screen, fmtTime } from "../components/ui";
import { useStore } from "../store";
import { Beam, DropList } from "../components/fx";

const EMOJI: Record<string, string> = { drained: "🥱", focused: "🧐", happy: "😊", thriving: "🤩", stressed: "😵‍💫", celebrating: "🥳" };

export function Nudges() {
  const { state, refresh } = useStore();
  const nav = useNavigate();
  if (!state) return null;
  const now = Date.now();
  return (
    <Screen>
      <Header title="Nudges" subtitle="At most 3 a day, never during quiet hours, always with a swap." />
      <DropList>{state.nudges.map((n, i) => (
        <div key={n.id} className="card nudge">
          {i === 0 && <Beam size={60} duration={6} />}
          <span style={{ fontSize: 28 }}>{EMOJI[n.emote] ?? "💡"}</span>
          <div className="grow">
            <p className="tiny muted">{+new Date(n.at) > now + 60_000 ? `Planned for ${fmtTime(n.at)}` : "Now"}</p>
            <p style={{ fontWeight: 600 }}>{n.text}</p>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn sm" onClick={() => nav(n.action.to)}>{n.action.label}</button>
              <button className="link" style={{ color: "var(--ink-2)" }} onClick={async () => { await api.dismissNudge(n.kind); refresh(); }}>Fewer like this</button>
            </div>
          </div>
        </div>
      ))}</DropList>
      {!state.nudges.length && <div className="card center"><p style={{ fontSize: 30 }}>🌙</p><p className="muted">Nothing right now. Bulbu will step in before the usual drift, not after.</p></div>}
    </Screen>
  );
}
