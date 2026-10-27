import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { api, type GoalTemplate } from "../api";
import { Bulbu } from "../bulbu/Bulbu";
import { Header, Screen, Sheet } from "../components/ui";
import { Icon, Tile, TEMPLATE_ICON } from "../components/Icon";
import { useStore } from "../store";
import { GlossyIcon } from "../components/GlossyIcon";

const DEMOS = [
  { id: "aryan", name: "Aryan", line: "DSA student losing evenings to Instagram" },
  { id: "priya", name: "Priya", line: "Young earner saving for an iPhone 17" },
];

export function Welcome() {
  const nav = useNavigate();
  const { signIn, toast } = useStore();
  const [demo, setDemo] = useState(false);
  const [cue, setCue] = useState(0);
  const pick = async (id: string, reset = false) => {
    try { if (reset) await api.resetDemo(); signIn(id); nav("/home"); }
    catch { toast("Can't reach Bulbu's server. Is it running?"); }
  };
  return (
    <Screen>
      <div className="center" style={{ marginTop: 34 }}>
        <h1 style={{ fontSize: 46, fontWeight: 800, letterSpacing: "0.01em", color: "var(--ink)" }}>BULBU</h1>
        <p style={{ fontSize: 20, color: "var(--ink-2)", fontWeight: 500, lineHeight: 1.35, marginTop: 4 }}>Small steps.<br />A better you.</p>
      </div>
      <div className="welcome-stage">
        <Bulbu emote="focused" outfit={null} animation="Wave" cue={cue} view="full" interactive={false} onPoke={() => setCue(c => c + 1)} background="#E7EEFF" line={null} className="welcome-bulbu" />
        <span className="script" style={{ right: 6, top: 18 }}>Better<br />Habits<br />Brighter<br />You ♡</span>
      </div>
      <style>{`.welcome-stage { position: relative; flex: 1; min-height: 360px; border-radius: 28px; overflow: hidden; background: radial-gradient(70% 60% at 50% 60%, #fff 0%, transparent 70%); }
        .welcome-bulbu { position: absolute; inset: 0; }`}</style>
      <div className="dots" aria-hidden="true"><i className="on" /><i /><i /><i /></div>
      <button className="btn" onClick={() => nav("/signup")}>Get Started <Icon name="arrow" size={18} /></button>
      <button className="link center" style={{ color: "var(--ink-2)", fontWeight: 600, marginTop: -4 }} onClick={() => setDemo(true)}>Try a demo user</button>
      <Sheet open={demo} onClose={() => setDemo(false)} title="Demo users">
        <p className="muted small" style={{ marginBottom: 12 }}>Each has about 30 days of realistic history, so forecasts and patterns are live.</p>
        <div className="stack">
          {DEMOS.map(d => (
            <button key={d.id} className="card swap" onClick={() => pick(d.id)}>
              <Tile icon={d.id === "aryan" ? "code" : "phone"} color={d.id === "aryan" ? "#3D5BFF" : "#141B4D"} size={44} />
              <span className="grow"><b>{d.name}</b><br /><span className="muted small">{d.line}</span></span>
              <Icon name="right" />
            </button>
          ))}
          <button className="link center" onClick={() => pick("aryan", true)}>Reset demo data and start as Aryan</button>
        </div>
      </Sheet>
    </Screen>
  );
}

export function SignUp() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [step, setStep] = useState<"methods" | "name">("methods");
  return (
    <Screen>
      <Header back="/welcome" />
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="grow">
          <h1 className="title-xl">Create<br />your space</h1>
          <p className="muted mt">Let's set up Bulbu to understand you better.</p>
        </div>
        <Bulbu emote="focused" outfit={null} view="close" className="" background="#EAF0FF" />
      </div>
      <style>{`.screen .row > .bulbu-slot { width: 140px; height: 160px; border-radius: 28px; flex: none; }`}</style>
      {step === "methods" ? (
        <div className="stack mt-l">
          <button className="btn ghost auth" onClick={() => setStep("name")}><GoogleG /> Continue with Google</button>
          <button className="btn ghost auth" onClick={() => setStep("name")}><AppleLogo /> Continue with Apple</button>
          <div className="row muted small" style={{ margin: "6px 0" }}><hr className="grow" style={{ border: 0, borderTop: "1px solid #DDE3F3" }} />or<hr className="grow" style={{ border: 0, borderTop: "1px solid #DDE3F3" }} /></div>
          <button className="btn ghost auth" onClick={() => setStep("name")}><Icon name="mail" style={{ color: "var(--primary)" }} /> Continue with Email</button>
          <p className="muted small center" style={{ marginTop: 26 }}>By continuing, you agree to our<br /><a href="#" style={{ textDecoration: "underline", color: "var(--ink-2)" }}>Terms</a> and <a href="#" style={{ textDecoration: "underline", color: "var(--ink-2)" }}>Privacy Policy</a>.</p>
        </div>
      ) : (
        <form className="stack mt-l" onSubmit={e => { e.preventDefault(); if (name.trim()) nav("/setup", { state: { name: name.trim() } }); }}>
          <label className="field">What should Bulbu call you?
            <input className="input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Your first name" maxLength={40} />
          </label>
          <button className="btn" disabled={!name.trim()}>Continue <Icon name="arrow" size={18} /></button>
        </form>
      )}
    </Screen>
  );
}

const OPTIONS: [GoalTemplate, string][] = [
  ["dsa", "DSA / Coding"], ["fitness", "Fitness"], ["learning", "Learning"], ["savings", "Savings"],
  ["iphone", "iPhone"], ["reading", "Reading"], ["productivity", "Productivity"], ["custom", "Custom"],
];
const DETAILS: Record<GoalTemplate, { title: string; target: number; targetLabel: string; baseLabel: string }> = {
  dsa: { title: "Crack DSA", target: 300, targetLabel: "Problems to solve", baseLabel: "Already solved" },
  fitness: { title: "Get fit", target: 48, targetLabel: "Workouts (4× a week for 12 weeks = 48)", baseLabel: "Done so far" },
  learning: { title: "Learn something new", target: 30, targetLabel: "Lessons", baseLabel: "Already done" },
  savings: { title: "Savings", target: 50000, targetLabel: "Amount to save (₹)", baseLabel: "Saved so far (₹)" },
  iphone: { title: "iPhone 17", target: 79900, targetLabel: "Price (₹)", baseLabel: "Saved so far (₹)" },
  reading: { title: "Read more", target: 1200, targetLabel: "Pages", baseLabel: "Already read" },
  productivity: { title: "Deep work", target: 100, targetLabel: "Focus hours", baseLabel: "Done so far" },
  custom: { title: "", target: 30, targetLabel: "Sessions", baseLabel: "Done so far" },
};

export function Setup() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { name?: string } };
  const { signIn, toast } = useStore();
  const [sel, setSel] = useState<GoalTemplate[]>([]);
  const [step, setStep] = useState<"pick" | "detail">("pick");
  const [form, setForm] = useState<Record<string, { title: string; target: number; baseline: number }>>({});
  const [busy, setBusy] = useState(false);
  const name = loc.state?.name;
  if (!name) return <Navigate to="/signup" replace />;

  const toggle = (t: GoalTemplate) => setSel(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t]);
  const toDetail = () => {
    setForm(Object.fromEntries(sel.map(t => [t, form[t] ?? { title: DETAILS[t].title, target: DETAILS[t].target, baseline: 0 }])));
    setStep("detail");
  };
  const finish = async () => {
    setBusy(true);
    try {
      const u = await api.createUser(name, sel.map(t => ({ template: t, title: form[t].title || "My goal", target: Math.max(1, form[t].target), baseline: Math.max(0, form[t].baseline) })));
      signIn(u.id); nav("/home");
    } catch (e) { toast((e as Error).message); setBusy(false); }
  };

  if (step === "pick") return (
    <Screen>
      <Header back="/signup" />
      <h1 className="title-l">What are your goals?</h1>
      <p className="muted">Choose a few to get started. You can always add more later.</p>
      <div className="goal-grid">
        {OPTIONS.map(([t, label]) => (
          <button key={t} className="goal-opt" aria-pressed={sel.includes(t)} onClick={() => toggle(t)}>
            <GlossyIcon name={t} size={46} />
            <span>{label}</span>
            {sel.includes(t) && <span className="tick check on"><Icon name="check" size={14} stroke={3} /></span>}
          </button>
        ))}
      </div>
      <button className="btn" style={{ marginTop: "auto" }} disabled={!sel.length} onClick={toDetail}>Continue <Icon name="arrow" size={18} /></button>
    </Screen>
  );

  return (
    <Screen>
      <Header back={false} title="Your goals" right={<button className="link" onClick={() => setStep("pick")}>Edit</button>} />
      <p className="muted center">Bulbu turns every activity into days closer or further from these. The first one is your main focus.</p>
      {sel.map(t => (
        <div className="card stack" key={t}>
          <div className="row"><Tile {...TEMPLATE_ICON[t]} size={36} /><b>{OPTIONS.find(o => o[0] === t)![1]}</b></div>
          <label className="field">Name<input className="input" value={form[t].title} placeholder="e.g. Learn guitar" onChange={e => setForm({ ...form, [t]: { ...form[t], title: e.target.value } })} /></label>
          <div className="row">
            <label className="field grow">{DETAILS[t].targetLabel}<input className="input" type="number" inputMode="numeric" min={1} value={form[t].target} onChange={e => setForm({ ...form, [t]: { ...form[t], target: Number(e.target.value) } })} /></label>
            <label className="field grow">{DETAILS[t].baseLabel}<input className="input" type="number" inputMode="numeric" min={0} value={form[t].baseline} onChange={e => setForm({ ...form, [t]: { ...form[t], baseline: Number(e.target.value) } })} /></label>
          </div>
        </div>
      ))}
      <button className="btn" disabled={busy} onClick={finish}>Meet Bulbu <Icon name="arrow" size={18} /></button>
    </Screen>
  );
}

function GoogleG() {
  return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>;
}
function AppleLogo() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.37 1.43c0 1.14-.42 2.2-1.24 3.04-.86.9-1.9 1.42-3.03 1.33-.1-1.1.45-2.25 1.23-3.03.85-.86 2.12-1.42 3.04-1.34zM20.5 17.1c-.55 1.27-.82 1.83-1.53 2.95-.99 1.56-2.39 3.5-4.12 3.51-1.54.02-1.93-1-4.02-.99-2.08.01-2.52 1.01-4.06 1-1.73-.02-3.05-1.77-4.04-3.33C-.04 15.88-.33 10.84 1.4 8.2c1.23-1.88 3.17-2.98 4.99-2.98 1.86 0 3.03 1.02 4.56 1.02 1.49 0 2.4-1.02 4.55-1.02 1.62 0 3.34.88 4.56 2.41-4.01 2.2-3.36 7.93.44 9.47z" /></svg>;
}
