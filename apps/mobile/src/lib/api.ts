import { createBulbuClient } from "@bulbu/api";
import { apiBaseUrl } from "./config";
import { session } from "./session";
export * from "@bulbu/api";

export const API_URL = apiBaseUrl();
export const api = createBulbuClient({ baseUrl: API_URL, getUserId: () => session.load() });
