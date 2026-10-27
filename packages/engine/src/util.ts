export const DAY_MS = 86_400_000;

export function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

/** Local calendar day, yyyy-mm-dd. */
export function dayKey(d: string | Date) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export function daysBetween(a: Date, b: Date) { return Math.round((+b - +a) / DAY_MS); }

/** 1, 1.5, 0.33 – no trailing zeros. */
export function fmtNum(n: number) {
  const a = Math.abs(n);
  const v = a >= 10 ? Math.round(n) : a >= 1 ? Math.round(n * 10) / 10 : Math.round(n * 100) / 100;
  return v.toLocaleString("en-IN");
}

export function fmtMoney(n: number) { return "₹" + Math.round(n).toLocaleString("en-IN"); }

export function fmtMinutes(m: number) {
  m = Math.round(m);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

/** Singular when n is about 1, plural otherwise. Works on either form ("problems" or "DSA problem"). */
export function plural(word: string, n: number) {
  if (!/[a-z]$/i.test(word)) return word;
  const one = Math.abs(Math.abs(n) - 1) < 0.05;
  if (one) return word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
  return word.endsWith("s") ? word : word + "s";
}
