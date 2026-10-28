// Bulbu's UI kit for React Native: the same frosted cards, green jelly buttons and soft segmented pills as the web app.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View,
         type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Step } from "@bulbu/api";
import { C, F, RADIUS, T, THEMES, glow, shadow } from "@/theme";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";
import { GlossyIcon, hasGlossy } from "./GlossyIcon";
import { LiquidProgressBar, type LiquidScheme } from "./LiquidProgressBar";

export const tap = () => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); };

// ------------------------------------------------------------------ layout

export function Background({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { state } = useStore();
  const th = THEMES[state?.user.theme ?? "sky"] ?? THEMES.sky;
  return (
    <View style={[{ flex: 1, backgroundColor: th.bg[0] }, style]}>
      <LinearGradient colors={th.bg} style={{ position: "absolute", inset: 0 }} />
      <LinearGradient colors={["rgba(197,180,255,.45)", "transparent"]} start={{ x: 1, y: 0 }} end={{ x: 0.4, y: 0.4 }} style={{ position: "absolute", inset: 0 }} />
      <LinearGradient colors={["transparent", "rgba(170,205,255,.45)"]} start={{ x: 0.6, y: 0.6 }} end={{ x: 0, y: 1 }} style={{ position: "absolute", inset: 0 }} />
      {children}
    </View>
  );
}

/** A scrolling screen with the app background. `tabs` leaves room for the bottom nav. */
export function Screen({ children, tabs = false, scroll = true, gap = 14, footer }: { children: ReactNode; tabs?: boolean; scroll?: boolean; gap?: number; footer?: ReactNode }) {
  const ins = useSafeAreaInsets();
  const pad = { paddingTop: Math.max(14, ins.top + 6), paddingHorizontal: 18, paddingBottom: tabs ? 120 + ins.bottom : 28 + ins.bottom, gap };
  return (
    <Background>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scroll
          ? <ScrollView contentContainerStyle={[pad, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
          : <View style={[pad, { flex: 1 }]}>{children}</View>}
        {footer && <View style={{ paddingHorizontal: 18, paddingBottom: 12 + ins.bottom, paddingTop: 8 }}>{footer}</View>}
      </KeyboardAvoidingView>
    </Background>
  );
}

export function Header({ title, subtitle, back = true, right, large = false }: { title?: string; subtitle?: string; back?: boolean | string; right?: ReactNode; large?: boolean }) {
  const goBack = () => { tap(); if (typeof back === "string") router.replace(back as never); else if (router.canGoBack()) router.back(); else router.replace("/home"); };
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 40 }}>
        {!large && (back ? <IconBtn name="back" label="Back" onPress={goBack} /> : <View style={{ width: 40 }} />)}
        {title ? <Text style={[large ? T.titleL : T.title, { flex: 1, textAlign: large ? "left" : "center", fontSize: large ? 27 : 21 }]} accessibilityRole="header">{title}</Text> : <View style={{ flex: 1 }} />}
        <View style={{ minWidth: large ? 0 : 40, alignItems: "flex-end" }}>{right}</View>
      </View>
      {subtitle && <Text style={[T.muted, { textAlign: large ? "left" : "center", paddingHorizontal: large ? 0 : 12, fontSize: 13.5 }]}>{subtitle}</Text>}
    </View>
  );
}

export function IconBtn({ name, label, onPress, soft = false, size = 40 }: { name: string; label: string; onPress: () => void; soft?: boolean; size?: number }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}
               style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center",
                 backgroundColor: soft ? "#fff" : "rgba(255,255,255,.78)", transform: [{ scale: pressed ? 0.94 : 1 }] }, shadow]}>
      <Icon name={name} size={19} />
    </Pressable>
  );
}

export function Card({ children, style, tight = false, onPress, label }: { children: ReactNode; style?: StyleProp<ViewStyle>; tight?: boolean; onPress?: () => void; label?: string }) {
  const base: StyleProp<ViewStyle> = [{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: RADIUS, padding: tight ? 12 : 16, paddingHorizontal: tight ? 14 : 16 }, shadow, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { tap(); onPress(); }} style={({ pressed }) => [base, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}>{children}</Pressable>;
}

export function Row({ children, style, gap = 10 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

export function CardHead({ title, right }: { title: string; right?: ReactNode }) {
  return <Row style={{ justifyContent: "space-between", marginBottom: 10 }}><Text style={T.cardTitle}>{title}</Text>{right}</Row>;
}

// ------------------------------------------------------------------ buttons

type BtnKind = "primary" | "ghost" | "danger";
export function Btn({ title, onPress, kind = "primary", disabled = false, busy = false, icon, small = false, style }: { title: string; onPress: () => void; kind?: BtnKind; disabled?: boolean; busy?: boolean; icon?: string; small?: boolean; style?: StyleProp<ViewStyle> }) {
  const color = kind === "primary" ? C.onGrad : kind === "danger" ? C.red : C.ink;
  const inner = (
    <Row gap={8} style={{ justifyContent: "center" }}>
      {busy ? <ActivityIndicator color={color} size="small" /> : icon && icon !== "arrow" ? <Icon name={icon} size={small ? 15 : 18} color={color} stroke={2.4} /> : null}
      <Text style={{ fontFamily: kind === "ghost" ? F.semibold : F.bold, fontSize: small ? 14 : 16, color }}>{title}</Text>
      {!busy && icon === "arrow" && <Icon name="arrow" size={small ? 15 : 18} color={color} stroke={2.4} />}
    </Row>
  );
  const pad = small ? { paddingVertical: 10, paddingHorizontal: 16 } : { paddingVertical: 16, paddingHorizontal: 22 };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy }} disabled={disabled || busy}
               onPress={() => { tap(); onPress(); }}
               style={({ pressed }) => [{ borderRadius: 999, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.985 : 1 }], alignSelf: small ? "flex-start" : "stretch" },
                 kind === "primary" ? glow : kind === "ghost" ? shadow : null, style]}>
      {kind === "primary" ? (
        <LinearGradient colors={C.grad} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[{ borderRadius: 999, overflow: "hidden" }, pad]}>
          <LinearGradient colors={["rgba(255,255,255,.22)", "transparent"]} style={{ position: "absolute", left: 0, right: 0, top: 0, height: "50%" }} />
          {inner}
        </LinearGradient>
      ) : (
        <View style={[{ borderRadius: 999, backgroundColor: kind === "danger" ? C.redSoft : "#fff", borderWidth: kind === "ghost" ? 1 : 0, borderColor: "#E6EBFB" }, pad]}>{inner}</View>
      )}
    </Pressable>
  );
}

export function LinkBtn({ title, onPress, color = C.primary, style }: { title: string; onPress: () => void; color?: string; style?: StyleProp<TextStyle> }) {
  return <Pressable accessibilityRole="button" onPress={() => { tap(); onPress(); }} hitSlop={8}><Text style={[{ fontFamily: F.bold, fontSize: 13.5, color }, style]}>{title}</Text></Pressable>;
}

export function Round({ name, onPress, primary = false, live = false, size = 40, label, disabled = false }: { name: string; onPress: () => void; primary?: boolean; live?: boolean; size?: number; label: string; disabled?: boolean }) {
  const color = live ? "#fff" : primary ? C.onGrad : C.ink2;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={() => { tap(); onPress(); }}
               style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center", opacity: disabled ? 0.5 : 1,
                 backgroundColor: live ? C.red : "transparent", transform: [{ scale: pressed ? 0.93 : 1 }] }, primary || live ? glow : null]}>
      {primary && !live && <LinearGradient colors={["#A8F0C8", "#6FDBA0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", inset: 0 }} />}
      <View><Icon name={name} size={size * 0.45} color={color} stroke={2.2} /></View>
    </Pressable>
  );
}

// ------------------------------------------------------------------ controls

export function Seg<T extends string>({ value, options, onChange, soft = false }: { value: T; options: [T, string][]; onChange: (v: T) => void; soft?: boolean }) {
  const [w, setW] = useState(0);
  const i = Math.max(0, options.findIndex(o => o[0] === value));
  const x = useRef(new Animated.Value(0)).current;
  const seg = (w - 8 - (options.length - 1) * 4) / options.length;
  useEffect(() => { Animated.spring(x, { toValue: i * (seg + 4), useNativeDriver: true, stiffness: 420, damping: 34 }).start(); }, [i, seg, x]);
  return (
    <View accessibilityRole="tablist" onLayout={e => setW(e.nativeEvent.layout.width)}
          style={[{ flexDirection: "row", padding: 4, gap: 4, borderRadius: 14, backgroundColor: soft ? "rgba(233,238,255,.75)" : "rgba(255,255,255,.72)", borderWidth: 1, borderColor: C.cardBorder }]}>
      {w > 0 && (
        <Animated.View style={[{ position: "absolute", top: 4, bottom: 4, left: 4, width: seg, borderRadius: 10, overflow: "hidden", transform: [{ translateX: x }] }, soft ? shadow : glow]}>
          {soft ? <View style={{ flex: 1, backgroundColor: "#fff" }} /> : <LinearGradient colors={C.grad} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />}
        </Animated.View>
      )}
      {options.map(([v, l]) => (
        <Pressable key={v} accessibilityRole="tab" accessibilityState={{ selected: v === value }} onPress={() => { tap(); onChange(v); }} style={{ flex: 1, paddingVertical: 8, alignItems: "center" }}>
          <Text style={{ fontFamily: F.semibold, fontSize: 13.5, color: v === value ? (soft ? C.primary : C.onGrad) : C.ink2 }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Chip({ title, onPress, on = false }: { title: string; onPress: () => void; on?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { tap(); onPress(); }}
               style={({ pressed }) => ({ borderWidth: 1, borderColor: on ? C.primary : "#E1E6F6", backgroundColor: "rgba(255,255,255,.92)", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, opacity: pressed ? 0.8 : 1 })}>
      <Text style={{ fontFamily: F.semibold, fontSize: 13, color: on ? C.primary : C.ink }}>{title}</Text>
    </Pressable>
  );
}
export function Chips({ children, wrap = false }: { children: ReactNode; wrap?: boolean }) {
  if (wrap) return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
}

export function Field({ label, children, right }: { label: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Row style={{ justifyContent: "space-between" }}><Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.ink2, flexShrink: 1 }}>{label}</Text>{right}</Row>
      {children}
    </View>
  );
}
export function Input(p: TextInputProps & { multiline?: boolean }) {
  const [focus, setFocus] = useState(false);
  return <TextInput placeholderTextColor={C.muted} {...p} onFocus={e => { setFocus(true); p.onFocus?.(e); }} onBlur={e => { setFocus(false); p.onBlur?.(e); }}
                    style={[{ borderWidth: 1, borderColor: focus ? C.primary : "#E1E6F6", backgroundColor: "#fff", borderRadius: 16, paddingVertical: 13, paddingHorizontal: 14,
                      fontFamily: F.medium, fontSize: 15, color: C.ink, minHeight: p.multiline ? 96 : undefined, textAlignVertical: p.multiline ? "top" : "center" }, p.style]} />;
}

export function Check({ on }: { on: boolean }) {
  return on
    ? <LinearGradient colors={["#9BEDC0", "#66D79A"]} style={{ width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center" }}><Icon name="check" size={14} stroke={3} color={C.onGrad} /></LinearGradient>
    : <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: "#CDD4EE", backgroundColor: "#fff" }} />;
}

export function Pill({ title, tone = "blue" }: { title: string; tone?: "blue" | "green" | "red" | "grey" }) {
  const [bg, fg] = tone === "green" ? [C.greenSoft, C.green] : tone === "red" ? [C.redSoft, C.red] : tone === "grey" ? ["rgba(255,255,255,.9)", C.ink2] : [C.primarySoft, C.primary];
  return <View style={{ backgroundColor: bg, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, alignSelf: "flex-start" }}><Text style={{ fontFamily: F.bold, fontSize: 12, color: fg }}>{title}</Text></View>;
}

export function Tile({ icon, color, size = 40 }: { icon: string; color: string; size?: number }) {
  if (hasGlossy(icon)) return <GlossyIcon name={icon} size={size} />;
  return <View style={{ width: size, height: size, borderRadius: 14, backgroundColor: color + "17", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={size * 0.5} color={color} /></View>;
}

export function Progress({ value, scheme = "dsa", height = 16, label = "Progress" }: { value: number; scheme?: LiquidScheme; height?: number; label?: string }) {
  return <LiquidProgressBar value={value} scheme={scheme} height={height} label={label} />;
}

export function Stat({ value, label, icon }: { value: string; label: string; icon?: ReactNode }) {
  return (
    <View style={[{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 16, padding: 12, gap: 2 }, shadow]}>
      <Row gap={6}>{icon}<Text style={{ fontFamily: F.heavy, fontSize: 18, color: C.ink }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text></Row>
      <Text style={T.tiny}>{label}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ overlays

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(20,27,77,.3)" }} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" }}>
        <View style={{ width: "100%", maxWidth: 460, maxHeight: 640, backgroundColor: "#fff", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 8, paddingBottom: Math.max(22, ins.bottom + 10) }}>
          <View style={{ width: 42, height: 5, borderRadius: 9, backgroundColor: "#DDE2F2", alignSelf: "center", marginVertical: 6 }} />
          <Row style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={[T.title, { fontSize: 18, flex: 1 }]}>{title}</Text>
            <IconBtn name="x" label="Close" onPress={onClose} />
          </Row>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 6 }}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Toast() {
  const { toastText } = useStore();
  const ins = useSafeAreaInsets();
  if (!toastText) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 20, right: 20, bottom: 112 + ins.bottom, alignItems: "center" }}>
      <View accessibilityLiveRegion="polite" style={{ backgroundColor: C.ink, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 14 }}>
        <Text style={{ color: "#fff", fontFamily: F.semibold, fontSize: 14, textAlign: "center" }}>{toastText}</Text>
      </View>
    </View>
  );
}

/** Tap-to-see-why: every number Bulbu shows opens its calculation. */
export function Breakdown({ steps, note }: { steps: Step[]; note?: string }) {
  return (
    <View>
      {steps.map((s, i) => (
        <Row key={i} style={{ justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 11, borderBottomWidth: i < steps.length - 1 ? 1 : 0, borderStyle: "dashed", borderColor: "#E3E8F6", gap: 14 }}>
          <Text style={[T.muted, { maxWidth: "45%" }]}>{s.label}</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 14, color: i === steps.length - 1 ? C.primary : C.ink, textAlign: "right", flex: 1 }}>{s.value}</Text>
        </Row>
      ))}
      <Text style={[T.small, { marginTop: 10 }]}>{note ?? "Computed by Bulbu's forecasting engine from your own history. No guesses: the language model only explains these numbers."}</Text>
    </View>
  );
}

/** "Bulbu is thinking…" with a soft pulse. */
export function Thinking({ text = "Bulbu is thinking…", color = C.ink2 }: { text?: string; color?: string }) {
  const o = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(o, { toValue: 0.45, duration: 700, useNativeDriver: true })]));
    a.start(); return () => a.stop();
  }, [o]);
  return <Animated.Text style={{ opacity: o, fontFamily: F.semibold, fontSize: 14.5, color }}>{text}</Animated.Text>;
}

/** "+3 days" / "2.5 days closer" */
export function daysText(days: number, closer = false) {
  const a = Math.abs(days);
  if (a < 0.05) return "no change";
  const v = a >= 1 ? Math.round(a) : Math.round(a * 10) / 10, unit = v === 1 ? "day" : "days";
  return closer ? `${v} ${unit} closer` : `${days > 0 ? "+" : "-"}${v} ${unit}`;
}

export const txt = (s: TextStyle) => s;
