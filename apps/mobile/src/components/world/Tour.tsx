// Bulbu's tour: the first time you open the app, Bulbu pops up (like a game's guide character) and explains how the
// kingdom works: buildings and their finish dates, the Dim, cards, the what-if, raids. It gives you starter Light.
// Saved on the server, so it shows once; Me can replay it.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Modal, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { WorldState } from "@bulbu/api";
import { RENDERS } from "@/lib/renders";
import { C, F } from "@/theme";
import { Btn, tap } from "../ui";
import { LightIcon } from "./LightIcon";

type Step = { text: string; emote?: string; action?: "next" | "gift" | "finish"; button?: string };

export function steps(name: string, level: number, light: number): Step[] {
  // nine steps, the gift on the eighth (the server counts them)
  return [
    { text: `Hi ${name}! I'm Bulbu, and this is our kingdom. ✨ Your real choices build it.`, emote: "happy" },
    level > 0 && light > 0
      ? { text: `Your choices have already made ${light.toLocaleString("en-IN")} Light, so our kingdom starts at level ${level}! Let me show you round.`, emote: "thriving" }
      : { text: "It's a quiet island for now. Just me in my cosy sweater, and a few empty plots.", emote: "focused" },
    { text: "Every goal is a building: coding raises the Library, saving fills the Vault, workouts build the Arena. Your main goal is the Castle.", emote: "thriving" },
    { text: "The label over each building says when construction finishes, at your pace. Tap it to see exactly why.", emote: "focused" },
    { text: "Scrolling rolls the Dim over the buildings it slows. It never breaks anything, and a good move clears it fast. 🌫️", emote: "drained" },
    { text: "I deal you three cards a day: small real-life moves. Do one, play it, and watch its building jump closer. 🃏", emote: "celebrating" },
    { text: "Before you choose, ask \"What if…\" and turn the dial. The finish dates move before you've done a thing. 🔮", emote: "happy" },
    { text: "Here's 100 Light from me to get us going! 🎁", emote: "celebrating", action: "gift", button: "Take the Light" },
    { text: "Tap ＋ to show me a screenshot or tell me about your day. If a Dim raid's coming, I'll warn you. Let's build!", emote: "happy", action: "finish", button: "Let's build!" },
  ];
}

export function Tour({ world, name, busy, onStep, onGift, onFinish }: {
  world: WorldState; name: string; busy: boolean;
  onStep: (step: number) => void; onGift: () => void; onFinish: () => void;
}) {
  const list = steps(name, world.level, world.light);
  const i = Math.max(0, Math.min(list.length - 1, world.tutorial));
  const s = list[i];
  // the line types itself out; a tap shows it all at once
  const [shown, setShown] = useState(0);
  useEffect(() => {
    // time-based, so it keeps pace even when the 3D scene makes frames slow
    setShown(0);
    const start = Date.now();
    const t = setInterval(() => { const n = Math.ceil((Date.now() - start) / 18); setShown(n); if (n >= s.text.length) clearInterval(t); }, 30);
    return () => clearInterval(t);
  }, [s.text]);
  const done = shown >= s.text.length;
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => { pop.setValue(0); Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 6, tension: 90 }).start(); }, [i, pop]);
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    a.start(); return () => a.stop();
  }, [bob]);

  const advance = () => {
    tap();
    if (!done) { setShown(s.text.length); return; }
    if (!s.action || s.action === "next") onStep(i + 1);
  };
  const img = RENDERS.emote[s.emote ?? "happy"] ?? RENDERS.avatarHappy;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={{ flex: 1 }}>
        {/* tapping anywhere moves the tour on (the action buttons are outside this, so no button sits inside a button) */}
        <Pressable style={{ position: "absolute", inset: 0 }} onPress={advance} accessibilityRole="button" accessibilityLabel={done ? "Continue" : "Show the whole message"}>
          <LinearGradient colors={["rgba(20,27,77,0)", "rgba(20,27,77,.18)", "rgba(20,27,77,.5)"]} locations={[0, 0.45, 1]} style={{ position: "absolute", inset: 0 }} />
        </Pressable>
        <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: 36, alignItems: "center" }}>
        <View pointerEvents="box-none" style={{ width: "100%", maxWidth: 440 }}>
          {/* Bulbu, the guide */}
          <Animated.View style={{ position: "absolute", left: 6, bottom: 150, transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }, { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
            <View style={{ width: 132, height: 132, borderRadius: 66, overflow: "hidden", borderWidth: 4, borderColor: "#fff", backgroundColor: "#E9F0FF",
                           shadowColor: "#5B4FD0", shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 }}>
              <Image source={img} style={{ width: "100%", height: "100%" }} accessibilityIgnoresInvertColors />
            </View>
          </Animated.View>
          {/* the dialog box */}
          <Animated.View style={{ opacity: pop, transform: [{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
            <View style={{ backgroundColor: "#fff", borderRadius: 24, borderWidth: 3, borderColor: "#DCE4FF", padding: 18, paddingTop: 22, minHeight: 140, gap: 14,
                           shadowColor: "#141B4D", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12 }}>
              <View style={{ position: "absolute", top: -15, left: 150, borderRadius: 999, overflow: "hidden" }}>
                <LinearGradient colors={["#8E7BFF", "#4F6BFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 5, paddingHorizontal: 14 }}>
                  <Text style={{ fontFamily: F.heavy, fontSize: 13, color: "#fff", letterSpacing: 0.5 }}>BULBU</Text>
                </LinearGradient>
              </View>
              <Pressable onPress={advance} accessibilityRole="text">
                <Text style={{ fontFamily: F.semibold, fontSize: 16.5, lineHeight: 24, color: C.ink, minHeight: 72 }} accessibilityLiveRegion="polite">
                  {s.text.slice(0, shown)}
                </Text>
              </Pressable>
              {done && s.action && s.action !== "next" ? (
                <Btn title={s.button ?? "OK"} busy={busy}
                     onPress={() => s.action === "gift" ? onGift() : onFinish()} />
              ) : (
                <Pressable onPress={advance} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", gap: 5 }}>{list.map((_, k) => <View key={k} style={{ width: k === i ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: k === i ? C.primary : "#D5DCF5" }} />)}</View>
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.primary }}>{done ? "Tap to continue ▸" : ""}</Text>
                </Pressable>
              )}
              {s.action === "gift" && done && (
                <View style={{ position: "absolute", right: 16, top: -22, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF6D6", borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 2, borderColor: "#fff" }}>
                  <LightIcon size={20} /><Text style={{ fontFamily: F.heavy, color: "#8A5A00" }}>+100</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </View>
        </View>
      </View>
    </Modal>
  );
}
