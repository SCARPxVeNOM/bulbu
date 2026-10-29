// The card that goes with a kingdom moment: what the move did to the building, the new finish date, the maths behind
// it, and a quick move that clears the Dim. Gentle by design: the Dim slows things down, it never takes anything away.
// It stays low and compact so Bulbu (drooping, or cheering) and the building's label stay in view above it.
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { fmtDays } from "@bulbu/engine";
import type { KingdomMoment, Swap } from "@bulbu/api";
import { Icon } from "@/components/Icon";
import { Breakdown, Row, Sheet, tap } from "@/components/ui";
import { C, F, T } from "@/theme";

const shortDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const joinMoves = (m: string[]) => m.length <= 1 ? (m[0] ?? "That") : `${m.slice(0, -1).join(", ")} and ${m[m.length - 1]}`;

export function MomentCard({ m, swap, onOpen, onClose }: { m: KingdomMoment; swap: Swap | null; onOpen: () => void; onClose: () => void }) {
  const [why, setWhy] = useState(false);
  const rise = useRef(new Animated.Value(0)).current;
  // the card comes in after the fog has started rolling, so the kingdom gets looked at first
  useEffect(() => { rise.setValue(0); Animated.spring(rise, { toValue: 1, delay: 1100, useNativeDriver: true, friction: 7 }).start(); }, [m, rise]);
  const dim = m.kind === "dim", by = fmtDays(Math.abs(m.days)).slice(1);
  const what = dim ? `${joinMoves(m.moves)} slowed it by ${by}` : `${joinMoves(m.moves)} brought it ${by} closer`;

  return (
    <Animated.View style={{ opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
      <View style={{ backgroundColor: "rgba(255,255,255,.96)", borderRadius: 20, paddingVertical: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1.5, borderColor: "#fff",
                     shadowColor: "#3B2F8F", shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
        <Row gap={10}>
          <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: dim ? "#ECE8FF" : "#E3F8EE" }}>
            <Text style={{ fontSize: 19 }}>{dim ? "🌫️" : "✨"}</Text>
          </View>
          <Pressable style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`${what}. See why`} onPress={() => { tap(); setWhy(true); }}>
            <Text numberOfLines={1} style={{ fontFamily: F.heavy, fontSize: 15, color: C.ink }}>{dim ? `The Dim drifted over the ${m.name}` : `The ${m.name} lit up`}</Text>
            <Text numberOfLines={2} style={{ fontFamily: F.semibold, fontSize: 12.5, color: C.ink2 }}>
              {what}{m.eta ? ` · now ${shortDate(m.eta)}` : ""}{"  "}<Text style={{ fontFamily: F.bold, color: C.primary }}>See why ›</Text>
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={() => { tap(); onClose(); }}
                     style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F3FB", alignSelf: "flex-start" }}>
            <Icon name="x" size={13} color={C.ink2} />
          </Pressable>
        </Row>

        {dim && swap && (
          <Pressable accessibilityRole="button" accessibilityLabel={`A quick move clears it: ${swap.title}. ${swap.detail}`} onPress={() => { tap(); onOpen(); }}
                     style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 12, backgroundColor: pressed ? "#FFEFC2" : "#FFF7DE" })}>
            <Text style={{ fontSize: 15 }}>🃏</Text>
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.bold, fontSize: 12.5, color: C.ink }}>Clear it: {swap.title}</Text>
            <Icon name="right" size={13} color={C.ink2} />
          </Pressable>
        )}
      </View>

      <Sheet open={why} onClose={() => setWhy(false)} title={dim ? `Why the ${m.name} slowed down` : `Why the ${m.name} sped up`}>
        <Breakdown steps={m.breakdown} note={m.equivalent || undefined} />
        {m.etaBefore && m.eta && m.etaBefore !== m.eta && (
          <Text style={[T.small, { marginTop: 6 }]}>Construction finishes {shortDate(m.eta)}, {dim ? "later than" : "sooner than"} {shortDate(m.etaBefore)} before this.</Text>
        )}
      </Sheet>
    </Animated.View>
  );
}
