import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { api, BulbuError, type BulbuDirective, type Hand, type KingdomMoment, type LivePhoto, type LogResult, type Snapshot, type Swap } from "./api";

/** What a new move did to the kingdom, played on Home: the fog rolls in or clears, the finish date slips or pulls back. */
export interface Moment { key: number; items: KingdomMoment[]; swap: Swap | null }
import { session } from "./session";

interface Store {
  /** undefined while the saved session is still loading */
  userId: string | null | undefined;
  state: Snapshot | null;
  loading: boolean;
  error: string | null;
  refresh(): Promise<void>;
  signIn(id: string): Promise<void>;
  signOut(): Promise<void>;
  /** the last thing Bulbu said or did (after a move, a chat or a focus session) */
  reaction: BulbuDirective | null;
  setReaction(d: BulbuDirective | null): void;
  /** the last move's result (what it moved; the kingdom plays it as a moment) */
  lastLog: LogResult | null;
  setLastLog(r: LogResult | null): void;
  /** the kingdom moment waiting to play (or playing) on Home */
  moment: Moment | null;
  setMoment(m: Moment | null): void;
  /** today's hand of cards */
  hand: Hand | null;
  /** play a card (you did it): the move goes in, the kingdom plays the moment, and Bulbu celebrates */
  playCard(id: string, photo?: LivePhoto): Promise<LogResult | null>;
  toast(text: string): void;
  toastText: string | null;
}

const Ctx = createContext<Store>(null!);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [state, setState] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reaction, setReaction] = useState<BulbuDirective | null>(null);
  const [lastLog, setLastLog] = useState<LogResult | null>(null);
  const [moment, setMoment] = useState<Moment | null>(null);
  const [hand, setHand] = useState<Hand | null>(null);
  const [toastText, setToast] = useState<string | null>(null);

  useEffect(() => { session.load().then(setUserId); }, []);

  const refresh = useCallback(async () => {
    if (!session.get()) { setState(null); return; }
    setLoading(true);
    api.hand().then(setHand).catch(() => {});          // the hand comes along (dealt once a day, cheap after that)
    try { setState(await api.state()); setError(null); }
    catch (e) {
      if (e instanceof BulbuError && e.status === 401) { await session.set(null); setUserId(null); setState(null); }
      else setError((e as Error).message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (userId) refresh(); }, [userId, refresh]);
  // the snapshot is time-based (finish dates, raids, nudges, today's cards): refresh every minute and whenever the app comes back
  useEffect(() => {
    const t = setInterval(() => { if (AppState.currentState === "active") refresh(); }, 60_000);
    const sub = AppState.addEventListener("change", s => { if (s === "active") refresh(); });
    return () => { clearInterval(t); sub.remove(); };
  }, [refresh]);

  const toast = useCallback((text: string) => { setToast(text); setTimeout(() => setToast(t => t === text ? null : t), 2800); }, []);

  // every move goes through here, so a newly earned Bulbu is always announced
  const recordLog = useCallback((r: LogResult | null) => {
    setLastLog(r);
    setMoment(r?.moments?.length ? { key: Date.now(), items: r.moments, swap: r.swap } : null);
    const names = (r?.items ?? []).map(i => i.name);
    if (names.length) toast(`Unlocked ${names.join(" and ")} in your inventory!`);
    else if (r?.worldLevel && r.worldLevel.after > r.worldLevel.before) toast(`Level ${r.worldLevel.after}! Bulbu levelled up.`);
  }, [toast]);

  const playCard = useCallback(async (id: string, photo?: LivePhoto) => {
    try {
      const r = await api.playCard(id, photo);
      recordLog(r); setReaction(r.bulbu);
      setHand(h => h && { ...h, cards: h.cards.filter(c => c.id !== id), played: h.played + 1 });
      void refresh();
      return r;
    } catch (e) { toast((e as Error).message); return null; }
  }, [recordLog, refresh, toast]);

  const value = useMemo<Store>(() => ({
    userId, state, loading, error, refresh, reaction, setReaction, lastLog, setLastLog: recordLog, moment, setMoment, hand, playCard, toast, toastText,
    signIn: async (id: string) => { await session.set(id); setReaction(null); setLastLog(null); setMoment(null); setHand(null); setState(null); setUserId(id); },
    signOut: async () => { await session.set(null); setUserId(null); setState(null); setReaction(null); },
  }), [userId, state, loading, error, refresh, reaction, lastLog, recordLog, moment, hand, playCard, toast, toastText]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStage() {
  const { state } = useStore();
  return state?.user.theme ?? "sky";
}
