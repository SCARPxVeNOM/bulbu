import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { outfitById } from "@bulbu/engine";
import { api, session, type BulbuDirective, type LogResult, type Snapshot } from "./api";

interface Store {
  userId: string | null;
  state: Snapshot | null;
  loading: boolean;
  error: string | null;
  refresh(): Promise<void>;
  signIn(id: string): void;
  signOut(): void;
  /** the last thing Bulbu said or did (from a log, chat or focus session) */
  reaction: BulbuDirective | null;
  setReaction(d: BulbuDirective | null): void;
  /** the last log result, shown on the Activity Impact screen */
  lastLog: LogResult | null;
  setLastLog(r: LogResult | null): void;
  toast(text: string): void;
  toastText: string | null;
}

const Ctx = createContext<Store>(null!);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(session.get());
  const [state, setState] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reaction, setReaction] = useState<BulbuDirective | null>(null);
  const [lastLog, setLastLog] = useState<LogResult | null>(null);
  const [toastText, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session.get()) { setState(null); return; }
    setLoading(true);
    try { setState(await api.state()); setError(null); }
    catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) { session.set(null); setUserId(null); setState(null); }
      else setError(err.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [userId, refresh]);
  // the snapshot is time-based (streaks, nudges, today's tasks); keep it fresh while the app is open
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 60_000);
    const v = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", v);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", v); };
  }, [refresh]);

  const toast = useCallback((text: string) => { setToast(text); setTimeout(() => setToast(t => t === text ? null : t), 2600); }, []);

  // every log goes through here, so a newly earned Bulbu is always announced
  const recordLog = useCallback((r: LogResult | null) => {
    setLastLog(r);
    const names = (r?.unlocked ?? []).map(id => outfitById(id)?.name).filter(Boolean);
    if (names.length) toast(`You unlocked ${names.join(" and ")}! Wear it from your profile.`);
  }, [toast]);

  const value = useMemo<Store>(() => ({
    userId, state, loading, error, refresh, reaction, setReaction, lastLog, setLastLog: recordLog, toast, toastText,
    signIn: (id: string) => { session.set(id); setUserId(id); setReaction(null); setLastLog(null); },
    signOut: () => { session.set(null); setUserId(null); setState(null); setReaction(null); },
  }), [userId, state, loading, error, refresh, reaction, lastLog, recordLog, toast, toastText]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
