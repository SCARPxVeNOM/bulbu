export const fmtDate = (iso: string | null | undefined, o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  iso ? new Date(iso.length === 10 ? iso + "T12:00" : iso).toLocaleDateString("en-IN", o) : "—";
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
export const dayLabel = (iso: string) => new Date(iso + "T12:00").toLocaleDateString("en-IN", { weekday: "short" });
export function whenLabel(iso: string) {
  const d = new Date(iso), now = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const y = new Date(now); y.setDate(y.getDate() - 1);
  return `${same(d, now) ? "Today" : same(d, y) ? "Yesterday" : fmtDate(iso)}, ${fmtTime(iso)}`;
}
export function greeting() { const h = new Date().getHours(); return h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
export const fmtM = (m: number) => m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
