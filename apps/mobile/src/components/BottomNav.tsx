// The floating liquid-glass tab bar: a frosted capsule that rises into a soft hump around the green jelly "+" orb.
// The active tab sits on a cyan jelly bubble that glides between tabs.
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import type { BottomTabBarProps } from "expo-router/tabs";
import { F } from "@/theme";
import { GlossyGlyph } from "./GlossyIcon";
import { Icon } from "./Icon";
import { tap } from "./ui";

const TABS: Record<string, { icon: string; label: string }> = {
  home: { icon: "home", label: "Home" },
  goals: { icon: "target", label: "Quests" },
  inventory: { icon: "trophy", label: "Inventory" },
  profile: { icon: "user", label: "Me" },
};

export function BottomNav({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const ins = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const routes = state.routes.filter(r => TABS[r.name]);
  const active = routes.findIndex(r => r.key === state.routes[state.index]?.key);
  const cell = (w - 12) / 5;
  const slot = (i: number) => (i >= 2 ? i + 1 : i);          // the orb takes the middle cell
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (active >= 0) Animated.spring(x, { toValue: 6 + slot(active) * cell, useNativeDriver: true, stiffness: 380, damping: 32 }).start(); }, [active, cell, x]);

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 12, right: 12, bottom: Math.max(10, ins.bottom) }}>
      {/* the raised shoulder around the orb */}
      <Svg width={168} height={30} viewBox="0 0 168 30" preserveAspectRatio="none" style={{ position: "absolute", top: -27, alignSelf: "center" }}>
        <Path d="M0 30 C38 30 44 3 84 3 C124 3 130 30 168 30 Z" fill="#FFFFFF" />
      </Svg>
      <View onLayout={e => setW(e.nativeEvent.layout.width)}
            style={{ height: 72, borderRadius: 30, flexDirection: "row", paddingHorizontal: 6, shadowColor: "#405BFF", shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 12 }}>
        <LinearGradient colors={["#FFFFFF", "#F8FAFF", "#EDEFFF"]} locations={[0, 0.55, 1]} style={{ position: "absolute", inset: 0, borderRadius: 30 }} />
        {w > 0 && active >= 0 && (
          <Animated.View style={{ position: "absolute", top: 7, bottom: 7, left: 0, width: cell - 4, marginLeft: 2, borderRadius: 24, overflow: "hidden", transform: [{ translateX: x }] }}>
            <LinearGradient colors={["rgba(57,217,255,.38)", "rgba(64,140,255,.22)", "rgba(120,87,255,.14)"]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={{ flex: 1 }} />
            <LinearGradient colors={["rgba(255,255,255,.85)", "rgba(255,255,255,0)"]} style={{ position: "absolute", left: 6, right: 14, top: 2, height: "45%", borderRadius: 20 }} />
            <View style={{ position: "absolute", width: 9, height: 9, borderRadius: 5, right: "18%", top: "14%", backgroundColor: "rgba(255,255,255,.85)" }} />
            <View style={{ position: "absolute", width: 4, height: 4, borderRadius: 2, left: "17%", top: "46%", backgroundColor: "rgba(57,160,255,.55)" }} />
            <View style={{ position: "absolute", inset: 0, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,.6)" }} />
          </Animated.View>
        )}
        {[0, 1, 2, 3, 4].map(cellIdx => {
          if (cellIdx === 2) return <View key="orb" style={{ flex: 1 }} />;
          const i = cellIdx > 2 ? cellIdx - 1 : cellIdx, r = routes[i];
          if (!r) return <View key={cellIdx} style={{ flex: 1 }} />;
          const t = TABS[r.name], on = i === active;
          return (
            <Pressable key={r.key} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: on }}
                       onPress={() => {
                         tap();
                         const e = emitter.emit({ type: "tabPress", target: r.key, canPreventDefault: true });
                         if (!on && !e.defaultPrevented) navigateToTab(r.key);
                       }}
                       style={({ pressed }) => ({ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, transform: [{ scale: pressed ? 0.9 : 1 }] })}>
              <GlossyGlyph name={t.icon} size={29} active={on} />
              <Text style={{ fontFamily: on ? F.bold : F.semibold, fontSize: 11.5, color: on ? "#405BFF" : "#929DC0" }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Log an activity" onPress={() => { tap(); router.push("/log"); }}
                 style={({ pressed }) => ({ position: "absolute", top: -24, alignSelf: "center", width: 64, height: 64, borderRadius: 32, transform: [{ scale: pressed ? 0.93 : 1 }],
                   shadowColor: "#2EB46E", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 14 })}>
        <View style={{ flex: 1, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,.6)" }}>
          <LinearGradient colors={["#B8F5D2", "#7FE2AC", "#4FC489"]} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.85, y: 0.95 }} style={{ position: "absolute", inset: 0 }} />
          <LinearGradient colors={["rgba(255,255,255,.7)", "rgba(255,255,255,0)"]} style={{ position: "absolute", left: 10, right: 18, top: 4, height: 24, borderRadius: 14 }} />
          <View><Icon name="plus" size={26} stroke={3} color="#0F4D33" /></View>
        </View>
      </Pressable>
    </View>
  );
}
