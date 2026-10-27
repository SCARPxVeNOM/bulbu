// The web app's session + the shared client. All endpoint types live in @bulbu/api so the React Native app uses the same ones.
import { createBulbuClient } from "@bulbu/api";
export * from "@bulbu/api";

const KEY = "bulbu-user";
export const session = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (id: string | null) => { try { id ? localStorage.setItem(KEY, id) : localStorage.removeItem(KEY); } catch { /* private mode */ } },
};

// same origin: Vite proxies /api to the server in dev, and the server serves this app in production
export const api = createBulbuClient({ getUserId: session.get });
