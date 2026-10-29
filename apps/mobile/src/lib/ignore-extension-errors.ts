// Browser extensions (crypto wallets especially) inject scripts into every page and sometimes throw, e.g.
// "NotUnlocked: Unlock Shield to use a DApp". Those errors aren't Bulbu's, so in the browser we keep them out of
// Expo's error overlay. Only errors that come from a browser extension are hidden; Bulbu's own errors still show.
import { Platform } from "react-native";

const EXT = /(chrome|moz|safari(-web)?)-extension:\/\//;
const WALLET = /Unlock .+ to use a DApp|NotUnlocked/;
// an extension's messaging failing ("Receiving end does not exist"): Bulbu never uses extension messaging
const EXT_MSG = /Could not establish connection\. Receiving end does not exist|Extension context invalidated/;
const fromExtension = (...parts: unknown[]) => parts.some(p => typeof p === "string" && EXT.test(p));

if (Platform.OS === "web" && typeof window !== "undefined") {
  // the dev overlay keeps its own ignore list: wallet-lock messages never belong to the app
  if (__DEV__) {
    try { (require("@expo/log-box/LogBox") as { default: { ignoreLogs(p: (string | RegExp)[]): void } }).default.ignoreLogs([WALLET, EXT_MSG]); }
    catch { /* the overlay isn't there (production build) */ }
  }
  // and any other error thrown from an extension's own script is stopped before the page treats it as uncaught
  window.addEventListener("error", e => {
    if (fromExtension(e.filename, (e.error as Error | undefined)?.stack) || EXT_MSG.test(String(e.message ?? ""))) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  window.addEventListener("unhandledrejection", e => {
    const r = e.reason as { stack?: string; message?: string } | undefined;
    if (fromExtension(r?.stack) || WALLET.test(String(r?.message ?? "")) || EXT_MSG.test(String(r?.message ?? r ?? ""))) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
}
