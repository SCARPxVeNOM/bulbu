import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type ChatReply, type WhatIf } from "../api";
import { Icon } from "../components/Icon";
import { Breakdown, Header, Screen, Sheet, fmtDate } from "../components/ui";
import { useStore } from "../store";
import { Shimmer } from "../components/fx";

interface Msg { role: "user" | "assistant"; text: string; extra?: ChatReply }

export function Chat() {
  const { state, setReaction, refresh } = useStore();
  const nav = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState<WhatIf | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { api.messages().then(m => setMsgs(m.map(x => ({ role: x.role as Msg["role"], text: x.content })))).catch(() => {}); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);

  const send = async (t: string) => {
    if (!t.trim() || busy) return;
    setMsgs(m => [...m, { role: "user", text: t }]); setText(""); setBusy(true);
    try {
      const r = await api.chat(t);
      setMsgs(m => [...m, { role: "assistant", text: r.reply, extra: r }]);
      if (r.bulbu) setReaction(r.bulbu);
      if (r.remembered?.length) refresh();
    } catch (e) { setMsgs(m => [...m, { role: "assistant", text: `I couldn't reach my brain just now (${(e as Error).message}).` }]); }
    finally { setBusy(false); }
  };

  const ideas: [string, string][] = [["Plan my day", "Plan my day around my goals"], ["Tips to avoid distraction", "I keep getting distracted while studying. What should I do?"],
    ["Explain a concept", "Explain a concept I'm stuck on, step by step"], ["Be my study buddy", "Be my study buddy for the next session"]];

  return (
    <Screen>
      <Header title="Chat with Bulbu" subtitle="Ask anything. Get honest advice." />

      <div className="chat">
        {!msgs.length && <div className="bot-row"><img className="av" src="/renders/avatar.webp" alt="" /><div className="msg bot">Hi{state ? ` ${state.user.name}` : ""}! Tell me how it's going, or ask “what if…” and I'll run the numbers for you.</div></div>}
        {msgs.map((m, i) => m.role === "user" ? <div key={i} className="msg me">{m.text}</div> : (
          <div key={i} className="bot-row" style={{ alignItems: "flex-start" }}>
            <img className="av" src="/renders/avatar.webp" alt="" />
            <div className="stack" style={{ gap: 8, maxWidth: "84%" }}>
              <div className="msg bot" style={{ maxWidth: "100%" }}>{m.text}</div>
              {m.extra?.whatIf && (
                <button className="card tight" style={{ textAlign: "left", background: "var(--green-soft)", boxShadow: "none" }} onClick={() => setWhy(m.extra!.whatIf!)}>
                  <b>{m.extra.whatIf.goalTitle}</b>
                  <p>{fmtDate(m.extra.whatIf.before.eta)} → <b className="green">{fmtDate(m.extra.whatIf.after.eta)}</b> · <b className="green">{m.extra.whatIf.daysSooner} days sooner</b></p>
                  <span className="muted tiny">Tap to see the math</span>
                </button>
              )}
              {m.extra?.focus && <button className="btn sm" onClick={() => nav("/focus")}><Icon name="play" size={14} /> Start {m.extra.focus}-min focus</button>}
              {m.extra?.remembered?.map(r => <span key={r} className="pill green">Saved to memory</span>)}
            </div>
          </div>
        ))}
        {busy && <div className="bot-row"><img className="av" src="/renders/avatar.webp" alt="" /><div className="msg bot"><Shimmer>Bulbu is thinking…</Shimmer></div></div>}
        <div ref={end} />
      </div>

      {msgs.length < 2 && <div className="chips wrap">{ideas.map(([l, q]) => <button key={l} className="chip" onClick={() => send(q)}>{l}</button>)}</div>}
      <form className="composer" onSubmit={e => { e.preventDefault(); send(text); }}>
        <button type="button" className="round" aria-label="Focus timer" onClick={() => nav("/focus")}><Icon name="plus" size={20} /></button>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Ask Bulbu anything..." aria-label="Message" />
        <Mic onText={t => setText(t)} />
        <button className="round primary" aria-label="Send" disabled={busy}><Icon name="send" size={18} /></button>
      </form>
      <Sheet open={!!why} onClose={() => setWhy(null)} title={why?.change.label ?? ""}>{why && <Breakdown steps={why.steps} />}</Sheet>
    </Screen>
  );
}

type Rec = { start(): void; stop(): void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; lang: string; interimResults: boolean };
function Mic({ onText }: { onText: (t: string) => void }) {
  const [on, setOn] = useState(false);
  const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
  const rec = useRef<Rec | null>(null);
  if (!SR) return null;
  const toggle = () => {
    if (on) { rec.current?.stop(); return; }
    const r = new SR(); r.lang = "en-IN"; r.interimResults = true;
    r.onresult = e => onText(Array.from(e.results).map(x => x[0].transcript).join(" "));
    r.onend = () => setOn(false);
    rec.current = r; r.start(); setOn(true);
  };
  return <button type="button" className={`round ${on ? "live" : ""}`} aria-label={on ? "Stop dictation" : "Dictate"} onClick={toggle}><Icon name="mic" size={18} /></button>;
}
