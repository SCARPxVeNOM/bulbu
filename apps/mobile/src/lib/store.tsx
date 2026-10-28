import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { api, BulbuError, type BulbuDirective, type LogResult, type Snapshot } from "./api";
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
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [state, setState] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reaction, setReaction] = useState<BulbuDirective | null>(null);
  const [lastLog, setLastLog] = useState<LogResult | null>(null);
  const [toastText, setToast] = useState<string | null>(null);

  useEffect(() => { session.load().then(setUserId); }, []);

  const refresh = useCallback(async () => {
    if (!session.get()) { setState(null); return; }
    setLoading(true);
    try { setState(await api.state()); setError(null); }
    catch (e) {
      if (e instanceof BulbuError && e.status === 401) { await session.set(null); setUserId(null); setState(null); }
      else setError((e as Error).message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (userId) refresh(); }, [userId, refresh]);
  // the snapshot is time-based (streaks, nudges, today's tasks): refresh every minute and whenever the app comes back
  useEffect(() => {
    const t = setInterval(() => { if (AppState.currentState === "active") refresh(); }, 60_000);
    const sub = AppState.addEventListener("change", s => { if (s === "active") refresh(); });
    return () => { clearInterval(t); sub.remove(); };
  }, [refresh]);

  const toast = useCallback((text: string) => { setToast(text); setTimeout(() => setToast(t => t === text ? null : t), 2800); }, []);

  // every log goes through here, so a newly earned Bulbu is always announced
  const recordLog = useCallback((r: LogResult | null) => {
    setLastLog(r);
    const names = (r?.items ?? []).map(i => i.name);
    if (names.length) toast(`Unlocked ${names.join(" and ")} in your inventory!`);
    else if (r?.worldLevel && r.worldLevel.after > r.worldLevel.before) toast(`Level ${r.worldLevel.after}! Bulbu levelled up.`);
  }, [toast]);

  const value = useMemo<Store>(() => ({
    userId, state, loading, error, refresh, reaction, setReaction, lastLog, setLastLog: recordLog, toast, toastText,
    signIn: async (id: string) => { await session.set(id); setReaction(null); setLastLog(null); setState(null); setUserId(id); },
    signOut: async () => { await session.set(null); setUserId(null); setState(null); setReaction(null); },
  }), [userId, state, loading, error, refresh, reaction, lastLog, recordLog, toast, toastText]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStage() {
  const { state } = useStore();
  return state?.user.theme ?? "sky";
}
