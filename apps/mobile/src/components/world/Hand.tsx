// Your hand of cards: three small real-life moves Bulbu dealt for today. Do one, then play it here: the move goes in,
// the Dim clears from its building, the finish date pulls back, and Bulbu celebrates.
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { fmtDays } from "@bulbu/engine";
import type { Card } from "@bulbu/api";
import { Sheet, tap } from "@/components/ui";
import { C, F, T } from "@/theme";
import { BUILDING_ART } from "./buildings";

/** The hand on the kingdom: a little fan of cards, like a card game's. */
export function HandButton({ cards, onPress }: { cards: Card[]; onPress: () => void }) {
  const n = cards.length;
  const fan = n ? cards.slice(0, 3) : [null, null, null];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={n ? `Your cards, ${n} to play` : "Your cards, all played today"} onPress={() => { tap(); onPress(); }}
               style={({ pressed }) => ({ alignItems: "center", transform: [{ scale: pressed ? 0.94 : 1 }] })}>
      <View style={{ width: 66, height: 66, alignItems: "center", justifyContent: "flex-end" }}>
        {fan.map((c, i) => {
          const k = fan.length === 1 ? 0 : i - (fan.length - 1) / 2;
          const colors = c ? BUILDING_ART[c.building].colors : ["#D9DCF0", "#B9BEDB"] as [string, string];
          return (
            <View key={i} style={{ position: "absolute", bottom: 2 + Math.abs(k) * -3, width: 36, height: 50, borderRadius: 8, borderWidth: 2.5, borderColor: "#fff", overflow: "hidden",
                                   transform: [{ translateX: k * 14 }, { rotate: `${k * 14}deg` }],
                                   shadowColor: "#3B2F8F", shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 5 }}>
              <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16 }}>{c ? c.icon : "✓"}</Text>
              </LinearGradient>
            </View>
          );
        })}
        {n > 0 && <View style={{ position: "absolute", top: -2, right: 0, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
          <Text style={{ color: "#fff", fontFamily: F.heavy, fontSize: 11 }}>{n}</Text></View>}
      </View>
      <Text style={{ marginTop: 4, fontFamily: F.heavy, fontSize: 12, color: "#fff", textShadowColor: "rgba(40,30,120,.55)", textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } }}>Cards</Text>
    </Pressable>
  );
}

/** The hand, opened: the cards side by side. `focus` puts a building's card first (from "Clear it"). */
export function HandSheet({ open, onClose, cards, focus, onPlay }: { open: boolean; onClose: () => void; cards: Card[]; focus?: string | null; onPlay: (c: Card) => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const shown = focus ? [...cards.filter(c => c.building === focus), ...cards.filter(c => c.building !== focus)] : cards;
  const play = async (c: Card) => { setBusy(c.id); try { await onPlay(c); } finally { setBusy(null); } };
  return (
    <Sheet open={open} onClose={onClose} title="Today's cards">
      <Text style={[T.small, { marginTop: -4, marginBottom: 12 }]}>Do one in real life, then play it here. It clears the Dim and brings its building closer.</Text>
      {shown.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={232} decelerationRate="fast" contentContainerStyle={{ gap: 12, paddingBottom: 6, paddingRight: 8 }}>
          {shown.map(c => <CardView key={c.id} c={c} busy={busy === c.id} disabled={!!busy} onPlay={() => play(c)} />)}
        </ScrollView>
      ) : (
        <View style={{ alignItems: "center", gap: 6, paddingVertical: 24 }}>
          <Text style={{ fontSize: 34 }}>🃏</Text>
          <Text style={T.b}>You've played today's hand</Text>
          <Text style={[T.small, { textAlign: "center" }]}>Bulbu deals new cards tomorrow.</Text>
        </View>
      )}
    </Sheet>
  );
}

function CardView({ c, busy, disabled, onPlay }: { c: Card; busy: boolean; disabled: boolean; onPlay: () => void }) {
  const art = BUILDING_ART[c.building];
  return (
    <View style={{ width: 220, borderRadius: 22, overflow: "hidden", borderWidth: 3, borderColor: "#fff",
                   shadowColor: "#3B2F8F", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6, backgroundColor: "#fff" }}>
      <LinearGradient colors={art.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 118, padding: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 6 }}>
          <Chip text={c.buildingName} />
          {c.clears && <Chip text="🌫️ Clears the Dim" />}
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: "rgba(255,255,255,.45)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 34 }}>{c.icon}</Text>
          </View>
        </View>
      </LinearGradient>
      <View style={{ padding: 12, gap: 6, flex: 1 }}>
        <Text style={{ fontFamily: F.heavy, fontSize: 17, color: C.ink, letterSpacing: -0.2 }}>{c.title}</Text>
        <Text style={T.small}>{c.blurb}</Text>
        {!!c.line && <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: "#5B4AA8", fontStyle: "italic" }}>“{c.line}”</Text>}
        <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: "#E3F8EE", marginTop: 2 }}>
          <Text style={{ fontFamily: F.heavy, fontSize: 12, color: "#138A5A" }}>{fmtDays(-c.daysCloser).slice(1)} sooner</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`I did it: play ${c.title}`} disabled={disabled} onPress={() => { tap(); onPlay(); }}
                   style={({ pressed }) => ({ marginTop: 6, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", overflow: "hidden", opacity: disabled && !busy ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
          <LinearGradient colors={["#7C6CFF", "#5A47F0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", inset: 0 }} />
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: F.heavy, fontSize: 15, color: "#fff" }}>I did it ✓</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const Chip = ({ text }: { text: string }) => (
  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(255,255,255,.75)" }}>
    <Text numberOfLines={1} style={{ fontFamily: F.heavy, fontSize: 10.5, color: C.ink }}>{text}</Text>
  </View>
);
