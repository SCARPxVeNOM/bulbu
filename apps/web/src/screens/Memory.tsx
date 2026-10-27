import { useState } from "react";
import { api, type Fact } from "../api";
import { Icon } from "../components/Icon";
import { Header, Screen, Sheet, fmtDate } from "../components/ui";
import { useStore } from "../store";

const GROUPS: [Fact["kind"], string, string][] = [
  ["fact", "Who you are", "Things you told Bulbu, or that Bulbu inferred"],
  ["pattern", "How you behave", "Recomputed every night from your history"],
  ["promise", "Promises", "Bulbu checks back on these"],
  ["win", "Wins", "Moments worth remembering"],
];

export function Memory() {
  const { state, refresh, toast } = useStore();
  const [edit, setEdit] = useState<Fact | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [letter, setLetter] = useState<string | null>(null);
  if (!state) return null;

  const save = async () => { if (!edit) return; await api.editMemory(edit.id, { text }); setEdit(null); refresh(); toast("Corrected. Bulbu will use this from now on."); };
  const forget = async (f: Fact) => { await api.forget(f.id); setEdit(null); refresh(); toast("Forgotten"); };
  const reflect = async () => {
    setBusy(true);
    try { const r = await api.reflect(); setLetter(r.letter); await refresh(); toast(r.via === "wonder" ? "Muse Wonder reflected on your month" : "Patterns recomputed"); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <Header title="What Bulbu remembers" subtitle="Numbers live in your ledger. Meaning lives here. See, correct or delete anything." />
      {GROUPS.map(([kind, title, sub]) => {
        const list = state.facts.filter(f => f.kind === kind);
        if (!list.length && kind !== "fact") return null;
        return (
          <section key={kind} className="card">
            <div className="card-title">{title}</div>
            <p className="muted tiny" style={{ marginBottom: 6 }}>{sub}</p>
            <div className="list">
              {list.map(f => (
                <button key={f.id} className="li btn-li" style={{ alignItems: "flex-start" }}
                        onClick={() => { setEdit(f); setText(f.text); }}>
                  <span className="grow">
                    <span style={{ textDecoration: f.done ? "line-through" : "none" }}>{f.text}</span>
                    {f.detail && <><br /><span className="muted small">{f.detail}</span></>}
                    <br /><span className="row" style={{ gap: 6, marginTop: 4 }}>
                      <span className={`pill ${f.source === "stated" ? "green" : "grey"}`}>{f.source === "stated" ? "You said" : "Inferred"}</span>
                      {f.source === "inferred" && <span className="pill grey">{Math.round(f.confidence * 100)}% sure</span>}
                      {f.checkAt && !f.done && <span className="pill">Check-in {fmtDate(f.checkAt)}</span>}
                    </span>
                  </span>
                  <Icon name="edit" size={16} style={{ color: "var(--muted)", marginTop: 3 }} />
                </button>
              ))}
              {!list.length && <p className="muted small">Nothing yet. Tell Bulbu about yourself in chat.</p>}
            </div>
          </section>
        );
      })}
      {letter && <section className="card" style={{ background: "linear-gradient(135deg,#fff,#F1EEFF)" }}><b>A letter from future you</b><p className="mt" style={{ fontStyle: "italic" }}>{letter}</p></section>}
      <button className="btn ghost" disabled={busy} onClick={reflect}><Icon name="refresh" size={18} /> {busy ? "Reflecting…" : "Run tonight's reflection now"}</button>
      <p className="muted tiny center">Every night Bulbu merges duplicates, updates confidence, recomputes patterns and lets stale guesses fade.</p>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Edit memory">
        {edit && <div className="stack">
          <textarea className="input" value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 90 }} />
          {edit.kind === "pattern" && <p className="muted small">Correcting a pattern turns it into something you said, e.g. “No, I wasn't stressed, that was a party.”</p>}
          <button className="btn" onClick={save} disabled={!text.trim()}>Save correction</button>
          {edit.kind === "promise" && !edit.done && <button className="btn ghost" onClick={async () => { await api.editMemory(edit.id, { done: true }); setEdit(null); refresh(); toast("Promise kept! 🎉"); }}>I kept this promise</button>}
          <button className="btn danger" onClick={() => forget(edit)}><Icon name="trash" size={18} /> Forget this</button>
        </div>}
      </Sheet>
    </Screen>
  );
}
