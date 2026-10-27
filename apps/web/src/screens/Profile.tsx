import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fmtMinutes } from "@bulbu/engine";
import { api, type Emote, type OutfitChoice } from "../api";
import { Icon, Tile } from "../components/Icon";
import { Header, Progress, Screen, Seg } from "../components/ui";
import { useStore } from "../store";
import { THEMES } from "../theme";

// glyphs from the app's own icon set until each Bulbu's artwork lands
const BULBU_ICON: Record<string, string> = { grad: "cap", fit: "dumbbell", cozy: "book", champ: "trophy", tech: "code", nature: "sun", dream: "target", party: "sparkles" };

const EMOTES: [Emote, string][] = [["happy", "Happy"], ["drained", "Sleepy"], ["focused", "Focused"], ["thriving", "Excited"], ["celebrating", "Celebrating"], ["stressed", "Stressed"]];

export function Profile() {
  const { state, refresh, signOut, toast } = useStore();
  const nav = useNavigate();
  const [tab, setTab] = useState<"bulbu" | "stats" | "achievements">("bulbu");
  const [preview, setPreview] = useState<Emote | null>(null);
  if (!state) return null;
  const s = state, u = s.user;
  const hoodieEarned = s.achievements.find(a => a.id === "streak7")?.earned ?? false;
  const setUser = async (b: Parameters<typeof api.updateUser>[0]) => { await api.updateUser(b); refresh(); };
  const outfits: { id: OutfitChoice; label: string; locked?: string }[] = [
    { id: "sweater", label: "Cosy sweater" }, { id: "hoodie", label: "Star hoodie", locked: hoodieEarned ? undefined : "7-day streak" }, { id: null, label: "No outfit" },
  ];
  const earned = s.achievements.filter(a => a.earned).length;
  const bulbus = s.outfits ?? [];
  const wear = async (id: OutfitChoice) => {
    try { await api.equip(id); await refresh(); } catch (e) { toast((e as Error).message); }
  };

  return (
    <Screen tabs>
      <Header large title="Profile" right={<button className="icon-btn soft" aria-label="Settings" onClick={() => nav("/memory")}><Icon name="settings" size={19} /></button>} />
      <div className="row" style={{ gap: 14 }}>
        <span className="tile" style={{ width: 62, height: 62, borderRadius: "50%", background: "linear-gradient(135deg,#FFD9B8,#F7B58C)", color: "#7A3E12", fontWeight: 800, fontSize: 25, boxShadow: "0 0 0 3px #fff, 0 6px 16px rgba(52,72,190,.15)" }}>{u.name[0]}</span>
        <div className="grow"><b style={{ fontSize: 19 }}>{u.name}</b><p className="muted small">Level {s.level.level} · {s.streak} day streak</p>
          <div className="mt" style={{ marginTop: 6 }}><Progress value={(s.level.into / s.level.span) * 100} height={12} label="Level progress" /></div>
          <p className="muted tiny">{s.level.span - s.level.into} XP to level {s.level.level + 1}</p></div>
      </div>
      <Seg soft value={tab} onChange={t => t === "achievements" ? nav("/achievements") : setTab(t)} options={[["bulbu", "Bulbu"], ["stats", "Stats"], ["achievements", "Achievements"]]} />

      {tab === "bulbu" && <>
        <section>
          <div className="card-head"><span className="card-title">Outfits</span><span className="link">See all</span></div>
          <div className="thumbs">{outfits.map(o => (
            <button key={String(o.id)} className="thumb" aria-pressed={u.outfit === o.id} disabled={!!o.locked} title={o.locked ? `Unlocks with a ${o.locked}` : o.label} onClick={() => setUser({ outfit: o.id })}>
              <img src={`/renders/outfit-${o.id ?? "none"}.webp`} alt={o.label} style={{ filter: o.locked ? "grayscale(.6) opacity(.6)" : undefined }} />
              {u.outfit === o.id && <span className="tick"><Icon name="check" size={12} stroke={3} /></span>}
              {o.locked && <span className="lockcap"><Icon name="lock" size={10} /> {o.locked}</span>}
            </button>
          ))}</div>
        </section>
        {bulbus.length > 0 && <section>
          <div className="card-head"><span className="card-title">The eight Bulbus</span><span className="muted small">{bulbus.filter(b => b.unlocked).length}/{bulbus.length} earned</span></div>
          <div className="card list">{bulbus.map(b => (
            <div key={b.id} className="li" style={{ alignItems: "flex-start" }}>
              <Tile icon={BULBU_ICON[b.id]} color="#3D5BFF" size={38} />
              <span className="grow" style={{ minWidth: 0 }}>
                <b>{b.name}</b><br /><span className="muted small">{b.tagline}</span>
                {!b.unlocked && <span style={{ display: "block", marginTop: 6 }}><Progress value={b.progress * 100} height={12} label={`${b.name} progress`} /><span className="muted tiny">{b.unlock} · {b.detail}</span></span>}
              </span>
              {b.unlocked
                ? <button className={u.outfit === b.id ? "btn ghost sm" : "btn sm"} aria-pressed={u.outfit === b.id} onClick={() => wear(u.outfit === b.id ? null : b.id)}>{u.outfit === b.id ? "Wearing" : "Wear"}</button>
                : <Icon name="lock" size={16} />}
            </div>
          ))}</div>
        </section>}
        <section>
          <div className="card-head"><span className="card-title">Expressions</span></div>
          <div className="thumbs">{EMOTES.map(([e, l]) => (
            <button key={e} className="thumb sm" aria-pressed={(preview ?? s.emote) === e} title={l} aria-label={l} onClick={() => setPreview(e)}><img src={`/renders/emote-${e}.webp`} alt="" /></button>
          ))}</div>
        </section>
        <section>
          <div className="card-head"><span className="card-title">Themes</span><span className="link">See all</span></div>
          <div className="thumbs">{Object.entries(THEMES).map(([k, t]) => (
            <button key={k} className="thumb" aria-pressed={u.theme === k} onClick={() => setUser({ theme: k })} aria-label={t.label} style={{ background: t.swatch }}>
              {u.theme === k && <span className="tick"><Icon name="check" size={12} stroke={3} /></span>}
            </button>
          ))}</div>
        </section>
      </>}

      {tab === "stats" && (
        <section className="card">
          <div className="stats" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="stat"><b>{s.level.xp}</b><span>XP</span></div>
            <div className="stat"><b>{s.streak}</b><span>Day streak</span></div>
            <div className="stat"><b>{fmtMinutes(s.week.productiveMinutes)}</b><span>Productive this week</span></div>
            <div className="stat"><b>{earned}/{s.achievements.length}</b><span>Badges</span></div>
          </div>
          <div className="li mt"><Icon name="sparkles" /><span className="grow small">{s.ai.enabled ? <>Muse Spark ({s.ai.models.spark}) and Muse Wonder ({s.ai.models.wonder}) connected</> : <>Offline mode: Bulbu understands text locally. Add a Meta Model API key for screenshots, voice understanding and coaching.</>}</span></div>
        </section>
      )}

      <section className="card list">
        <Link to="/memory" className="li" style={{ color: "inherit" }}><Tile icon="brain" color="#7B5CFF" size={36} /><span className="grow"><b>What Bulbu remembers</b><br /><span className="muted small">See, edit or delete everything</span></span><Icon name="right" /></Link>
        <Link to="/achievements" className="li" style={{ color: "inherit" }}><Tile icon="trophy" color="#F5A524" size={36} /><span className="grow"><b>Achievements</b><br /><span className="muted small">{earned} earned</span></span><Icon name="right" /></Link>
        <Link to="/chat" className="li" style={{ color: "inherit" }}><Tile icon="sparkles" color="#3D5BFF" size={36} /><span className="grow"><b>Chat with Bulbu</b></span><Icon name="right" /></Link>
        <Link to="/focus" className="li" style={{ color: "inherit" }}><Tile icon="clock" color="#18B37A" size={36} /><span className="grow"><b>Focus Mode</b></span><Icon name="right" /></Link>
      </section>

      <div className="row">
        <button className="btn ghost" onClick={() => { signOut(); nav("/welcome"); }}>Switch user</button>
        {u.demo
          ? <button className="btn ghost" onClick={async () => { await api.resetDemo(); await refresh(); toast("Demo data reset"); }}>Reset demo</button>
          : <button className="btn danger" onClick={async () => { if (confirm("Delete your profile and everything Bulbu remembers? This can't be undone.")) { await api.deleteUser(); signOut(); nav("/welcome"); } }}>Delete my data</button>}
      </div>
    </Screen>
  );
}
