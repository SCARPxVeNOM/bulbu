import { useState } from "react";
import { Header, Screen, Seg } from "../components/ui";
import { GlossyIcon } from "../components/GlossyIcon";
import { useStore } from "../store";
import { Stagger, celebrate } from "../components/fx";

const ICON: Record<string, [string, string]> = { streak7: ["flame", "#F57A1F"], streak30: ["refresh", "#7B5CFF"], dsa: ["code", "#3D5BFF"], early: ["sun", "#F5B324"], book: ["book", "#3D5BFF"], fit: ["dumbbell", "#7B5CFF"], noscroll: ["ban", "#F0465A"], iphone: ["phone", "#141B4D"] };

export function Achievements() {
  const { state } = useStore();
  const [tab, setTab] = useState<"all" | "goals" | "streaks" | "special">("all");
  if (!state) return null;
  const list = state.achievements.filter(a => tab === "all" || a.group === tab);
  return (
    <Screen>
      <Header title="Achievements" />
      <Seg value={tab} onChange={setTab} options={[["all", "All"], ["goals", "Goals"], ["streaks", "Streaks"], ["special", "Special"]]} />
      <Stagger key={tab} className="badges">
        {list.map(a => (
          <button key={a.id} className={`card badge ${a.earned ? "" : "locked"}`} style={{ width: "100%", height: "100%", font: "inherit", color: "inherit" }} onClick={e => a.earned && celebrate(e.currentTarget)}>
            <GlossyIcon name={a.earned ? (ICON[a.id] ?? ["trophy"])[0] : "lock"} size={52} />
            <b>{a.title}</b>
            <span className="muted tiny">{a.earned ? a.detail : a.progress > 0 ? `${a.detail} · ${Math.round(a.progress * 100)}%` : "Coming soon"}</span>
            
          </button>
        ))}
      </Stagger>
    </Screen>
  );
}
