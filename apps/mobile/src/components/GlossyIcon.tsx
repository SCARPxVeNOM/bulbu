// Glossy squircle tiles with an embossed glyph: Bulbu's own icon set, drawn with react-native-svg.
import { useId } from "react";
import { View } from "react-native";
import Svg, { ClipPath, Defs, G, LinearGradient, Mask, RadialGradient, Rect, Stop } from "react-native-svg";
import { ALIAS, G as GLYPHS, TONE } from "./glyphs";

const sid = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "");

export function GlossyIcon({ name, size = 44, locked = false }: { name: string; size?: number; locked?: boolean }) {
  const id = sid(useId());
  const g = GLYPHS[ALIAS[name] ?? name] ?? GLYPHS.other;
  const [top, mid, deep] = TONE[locked ? "grey" : g.tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.27, shadowColor: mid, shadowOpacity: 0.35, shadowRadius: size * 0.11, shadowOffset: { width: 0, height: size * 0.07 } }}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Defs>
          <LinearGradient id={`t${id}`} x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor={top} /><Stop offset=".62" stopColor={mid} /><Stop offset="1" stopColor={deep} /></LinearGradient>
          <RadialGradient id={`h${id}`} cx=".28" cy=".12" r=".75"><Stop offset="0" stopColor="#fff" stopOpacity=".6" /><Stop offset=".55" stopColor="#fff" stopOpacity=".08" /><Stop offset="1" stopColor="#fff" stopOpacity="0" /></RadialGradient>
          <LinearGradient id={`s${id}`} x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor="#fff" stopOpacity=".42" /><Stop offset="1" stopColor="#fff" stopOpacity="0" /></LinearGradient>
          <LinearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="1" stopColor="#E8EEFF" /></LinearGradient>
          <ClipPath id={`c${id}`}><Rect x="2" y="2" width="60" height="60" rx="17" /></ClipPath>
        </Defs>
        <G clipPath={`url(#c${id})`}>
          <Rect x="2" y="2" width="60" height="60" fill={`url(#t${id})`} />
          <Rect x="2" y="2" width="60" height="60" fill={`url(#h${id})`} />
          <Rect x="2" y="2" width="60" height="24" fill={`url(#s${id})`} />
          <Rect x="2" y="44" width="60" height="18" fill={deep} opacity={0.16} />
        </G>
        <Rect x="2.75" y="2.75" width="58.5" height="58.5" rx="16.3" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.4} />
        {/* emboss: the glyph's own shadow, then the glyph */}
        <G opacity={0.45} transform="translate(0 1.8)">{g.draw({ fill: deep, accent: deep, deep })}</G>
        <G opacity={locked ? 0.9 : 1}>{g.draw({ fill: `url(#g${id})`, accent: g.accent ?? deep, deep })}</G>
      </Svg>
    </View>
  );
}

/** The same glyphs without a tile, filled with a glossy gradient (bottom nav). */
export function GlossyGlyph({ name, size = 26, active = false }: { name: string; size?: number; active?: boolean }) {
  const id = sid(useId());
  const g = GLYPHS[ALIAS[name] ?? name] ?? GLYPHS.other;
  const [a, b] = active ? ["#5BD9FF", "#405BFF"] : ["#C3CAE3", "#97A1C4"];
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id={`n${id}`} x1="0" x2=".4" y1="0" y2="1"><Stop offset="0" stopColor={a} /><Stop offset="1" stopColor={b} /></LinearGradient>
        <LinearGradient id={`w${id}`} x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor="#fff" stopOpacity=".55" /><Stop offset=".5" stopColor="#fff" stopOpacity="0" /></LinearGradient>
        <Mask id={`m${id}`}>{g.draw({ fill: "#fff", accent: "#fff", deep: "#000" })}</Mask>
      </Defs>
      {g.draw({ fill: `url(#n${id})`, accent: active ? "#FFE07A" : "#B9C1DE", deep: active ? "#2338C9" : "#7F89AE" })}
      <Rect x="0" y="0" width="64" height="40" fill={`url(#w${id})`} mask={`url(#m${id})`} />
    </Svg>
  );
}

export { hasGlossy } from "./glyphs";
