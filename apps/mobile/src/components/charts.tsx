// Liquid-neon charts: line, donut, bars and the focus ring. Same drawings as the web app, without SVG filters.
import { useId } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { C, F, T } from "@/theme";

const sid = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "");
const STOPS = [["0", "#2FD3F5"], ["0.35", "#3D7BFF"], ["0.68", "#5B5CFF"], ["0.92", "#A35CFF"], ["1", "#F27BD8"]] as const;

function smooth(pts: [number, number][]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function LiquidLine({ points, labels, max, min = 0, ticks, highlight, height = 160 }: { points: number[]; labels: string[]; max: number; min?: number; ticks?: number[]; highlight?: string; height?: number }) {
  const id = sid(useId());
  const W = 320, H = height, L = ticks ? 30 : 10, R = 14, Tp = 18, B = 22;
  const top = Math.max(max, ...points, 1);
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, points.length - 1);
  const y = (v: number) => Tp + (1 - (v - min) / Math.max(1e-6, top - min)) * (H - Tp - B);
  const pts = points.map((p, i) => [x(i), y(p)] as [number, number]);
  if (!pts.length) return null;
  const d = smooth(pts), last = pts[pts.length - 1];
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H * 1.0} preserveAspectRatio="xMidYMid meet">
      <Defs>
        <LinearGradient id={`s${id}`} x1="0" x2="1" y1="0" y2="0">{STOPS.map(([o, c]) => <Stop key={o} offset={o} stopColor={c} />)}</LinearGradient>
        <LinearGradient id={`a${id}`} x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor="#7B6BFF" stopOpacity=".28" /><Stop offset=".6" stopColor="#5B8CFF" stopOpacity=".08" /><Stop offset="1" stopColor="#5B8CFF" stopOpacity="0" /></LinearGradient>
        <LinearGradient id={`p${id}`} x1="0" x2="1"><Stop offset="0" stopColor="#A8F0C8" /><Stop offset="1" stopColor="#6FDBA0" /></LinearGradient>
      </Defs>
      {ticks?.map(t => <G key={t}><Line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#E3E8F8" strokeWidth={1} strokeDasharray="2 4" /><SvgText x={L - 8} y={y(t) + 3.5} textAnchor="end" fontSize={10} fontFamily={F.medium} fill={C.muted}>{String(t)}</SvgText></G>)}
      <Path d={`${d}L${last[0]},${H - B}L${pts[0][0]},${H - B}Z`} fill={`url(#a${id})`} />
      <Path d={d} fill="none" stroke={`url(#s${id})`} strokeWidth={13} strokeLinecap="round" opacity={0.18} />
      <Path d={d} fill="none" stroke={`url(#s${id})`} strokeWidth={4.5} strokeLinecap="round" />
      <Path d={d} fill="none" stroke="#fff" strokeWidth={1.3} strokeLinecap="round" opacity={0.85} />
      <Circle cx={last[0]} cy={last[1]} r={10} fill="#8B5CFF" opacity={0.2} />
      <Circle cx={last[0]} cy={last[1]} r={5} fill="#fff" stroke="#7B5CFF" strokeWidth={2.5} />
      {labels.map((l, i) => <SvgText key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize={10} fontFamily={F.medium} fill={C.muted}>{l}</SvgText>)}
      {highlight && <G transform={`translate(${Math.min(last[0], W - 26)} ${last[1] - 20})`}><Rect x={-22} y={-12} width={44} height={21} rx={9} fill={`url(#p${id})`} /><SvgText y={3} textAnchor="middle" fill="#0F4D33" fontSize={10.5} fontFamily={F.bold}>{highlight}</SvgText></G>}
    </Svg>
  );
}

export function GlowDonut({ parts, center, sub, size = 132 }: { parts: { value: number; color: [string, string] }[]; center: string; sub: string; size?: number }) {
  const id = sid(useId());
  const total = parts.reduce((s, p) => s + p.value, 0) || 1, r = 42, c = 2 * Math.PI * r, gap = 5;
  let off = 0;
  return (
    <Svg viewBox="0 0 110 110" width={size} height={size}>
      <Defs>{parts.map((p, i) => <LinearGradient key={i} id={`d${id}${i}`} x1="0" x2="1" y1="0" y2="1"><Stop offset="0" stopColor={p.color[0]} /><Stop offset="1" stopColor={p.color[1]} /></LinearGradient>)}</Defs>
      <Circle cx={55} cy={55} r={r} fill="none" stroke="#EEF1FB" strokeWidth={13} />
      {parts.map((p, i) => {
        const len = (p.value / total) * c, dash = Math.max(0.1, len - gap);
        const el = <G key={i} transform="rotate(-90 55 55)"><Circle cx={55} cy={55} r={r} fill="none" stroke={`url(#d${id}${i})`} strokeWidth={13} strokeDasharray={`${dash} ${c}`} strokeDashoffset={-off} strokeLinecap="round" /></G>;
        off += len; return el;
      })}
      <SvgText x={55} y={56} textAnchor="middle" fontSize={19} fontFamily={F.heavy} fill={C.ink}>{center}</SvgText>
      <SvgText x={55} y={71} textAnchor="middle" fontSize={10} fontFamily={F.medium} fill={C.muted}>{sub}</SvgText>
    </Svg>
  );
}

export function Bars({ data, height = 110 }: { data: { label: string; a: number; b: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map(d => Math.max(d.a, d.b)));
  const inner = height - 18;
  return (
    <View style={{ flexDirection: "row", gap: 8, height }}>
      {data.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: inner }}>
            <Bar h={(d.a / max) * inner} colors={["#2FD3F5", "#3D5BFF"]} />
            <Bar h={(d.b / max) * inner} colors={["#F7A6D0", "#EC4F8A"]} />
          </View>
          <Text style={[T.tiny, { fontSize: 10.5 }]} numberOfLines={1}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}
function Bar({ h, colors }: { h: number; colors: [string, string] }) {
  const id = sid(useId());
  const hh = Math.max(2, h);
  return (
    <Svg width={9} height={hh}>
      <Defs><LinearGradient id={id} x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor={colors[0]} /><Stop offset="1" stopColor={colors[1]} /></LinearGradient></Defs>
      <Rect x={0} y={0} width={9} height={hh} rx={Math.min(4.5, hh / 2)} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Focus timer ring: a liquid gradient arc over a soft track. */
export function LiquidRing({ value, size = 236, children }: { value: number; size?: number; children?: React.ReactNode }) {
  const id = sid(useId());
  const r = 100 - 9, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return (
    <View style={{ width: size, height: size, alignSelf: "center" }}>
      <Svg viewBox="0 0 200 200" width={size} height={size}>
        <Defs><LinearGradient id={`r${id}`} x1="0" x2="1" y1="0" y2="1">{STOPS.map(([o, cc]) => <Stop key={o} offset={o} stopColor={cc} />)}</LinearGradient></Defs>
        <Circle cx={100} cy={100} r={r} fill="none" stroke="rgba(214,222,250,.7)" strokeWidth={15} />
        <G transform="rotate(-90 100 100)">
          <Circle cx={100} cy={100} r={r} fill="none" stroke={`url(#r${id})`} strokeWidth={24} opacity={0.15} strokeDasharray={`${(v / 100) * c} ${c}`} strokeLinecap="round" />
          <Circle cx={100} cy={100} r={r} fill="none" stroke={`url(#r${id})`} strokeWidth={15} strokeDasharray={`${(v / 100) * c} ${c}`} strokeLinecap="round" />
        </G>
      </Svg>
      <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>{children}</View>
    </View>
  );
}

export const legendText = { fontFamily: F.medium, fontSize: 13, color: C.ink };
