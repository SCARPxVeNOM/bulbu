// The jelly progress bar, used for every bar in the app: a pale track, a gradient capsule exactly `value`% wide, with a
// slow surface wave, a few bubbles, a gloss streak and a soft glow. Only things inside the fill move.
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, Path, RadialGradient, LinearGradient as SvgLinear, Stop } from "react-native-svg";

export type LiquidScheme = "dsa" | "reading" | "fitness";
export const LIQUID_SCHEMES: Record<LiquidScheme, { stops: [string, string, ...string[]]; glow: string; deep: string }> = {
  dsa: { stops: ["#43E1F6", "#3C8CFF", "#5A6BFF", "#9A63FF"], glow: "#5B6CFF", deep: "#2B3BC4" },
  reading: { stops: ["#4FE6F2", "#1FD6CB", "#1ED7A6", "#46DE8C"], glow: "#22D3B0", deep: "#0C8F78" },
  fitness: { stops: ["#FFB48C", "#FF7A93", "#F7509D", "#C561FF"], glow: "#FF5FA0", deep: "#C2306D" },
};

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setR).catch(() => {}); }, []);
  return r;
}

export function LiquidProgressBar({ value, scheme = "dsa", height = 16, label = "Progress" }: { value: number; scheme?: LiquidScheme; height?: number; label?: string }) {
  const v = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const h = Math.min(28, Math.max(12, Math.round(height)));
  const s = LIQUID_SCHEMES[scheme] ?? LIQUID_SCHEMES.dsa;
  const [w, setW] = useState(0);
  const reduce = useReducedMotion();
  const fillW = (w * v) / 100;

  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: fillW, duration: reduce ? 0 : 800, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: false }).start();
  }, [fillW, reduce, width]);

  const period = h * 4.5, amp = Math.max(0.6, h * 0.045), base = h * 0.34, waveLen = Math.max(400, w + period * 2);
  let d = `M0 ${base.toFixed(2)}`;
  for (let x = 0; x < waveLen + period; x += period / 2) {
    const up = Math.round(x / (period / 2)) % 2 === 0;
    d += ` Q${(x + period / 4).toFixed(1)} ${(base + (up ? -amp : amp)).toFixed(2)} ${(x + period / 2).toFixed(1)} ${base.toFixed(2)}`;
  }
  const surface = `${d} L${waveLen + period} 0 L0 0 Z`;
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const a = Animated.loop(Animated.timing(drift, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true }));
    a.start(); return () => a.stop();
  }, [drift, reduce]);
  const tx = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -period] });
  const bubbles = [[0.12, 0.66, 0.07], [0.29, 0.5, 0.05], [0.47, 0.7, 0.085], [0.66, 0.56, 0.055], [0.84, 0.68, 0.065]];

  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(v) }}
          onLayout={e => setW(e.nativeEvent.layout.width)} style={{ height: h, borderRadius: h, overflow: "hidden", width: "100%" }}>
      <LinearGradient colors={["#DCE3FA", "#E7ECFC", "#EEF2FE"]} style={{ position: "absolute", inset: 0 }} />
      <Animated.View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width, borderRadius: h, overflow: "hidden",
                              shadowColor: s.glow, shadowOpacity: 0.55, shadowRadius: h * 0.4, shadowOffset: { width: 0, height: 0 } }}>
        <LinearGradient colors={s.stops} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: Math.max(fillW, 1) }} />
        <Animated.View style={{ position: "absolute", left: 0, top: 0, transform: [{ translateX: tx }] }}>
          <Svg width={waveLen + period} height={h}>
            <Defs><SvgLinear id="sf" x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor="#fff" stopOpacity=".38" /><Stop offset="1" stopColor="#fff" stopOpacity="0" /></SvgLinear></Defs>
            <Path d={surface} fill="url(#sf)" />
          </Svg>
        </Animated.View>
        <Svg width={Math.max(fillW, 1)} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
          <Defs><RadialGradient id="bb" cx=".35" cy=".35" r=".7"><Stop offset="0" stopColor="#fff" stopOpacity=".7" /><Stop offset=".55" stopColor="#fff" stopOpacity=".18" /><Stop offset="1" stopColor="#fff" stopOpacity=".04" /></RadialGradient></Defs>
          {fillW > h * 1.5 && bubbles.map(([x, y, r], i) => <Circle key={i} cx={x * fillW} cy={y * h} r={Math.max(1, r * h)} fill="url(#bb)" stroke="#fff" strokeOpacity={0.35} strokeWidth={0.5} />)}
        </Svg>
        {fillW > h && <LinearGradient colors={["rgba(255,255,255,.3)", "rgba(255,255,255,.62)", "rgba(255,255,255,.55)", "rgba(255,255,255,.22)"]} locations={[0, 0.14, 0.86, 1]}
                                      start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                                      style={{ position: "absolute", left: h * 0.42, right: h * 0.42, top: h * 0.17, height: Math.max(2, h * 0.24), borderRadius: h }} />}
        <LinearGradient colors={["transparent", s.deep + "38"]} locations={[0.45, 1]} style={{ position: "absolute", inset: 0 }} />
        <View style={{ position: "absolute", inset: 0, borderRadius: h, borderWidth: 1, borderColor: "rgba(255,255,255,.45)" }} />
      </Animated.View>
    </View>
  );
}
