// The game bar over Bulbu: level + XP on the left, Light on the right (like a game's resource bar), then today's
// Light, the streak, and a warning when today has more scrolling than good habits.
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import type { WorldState } from "@bulbu/api";
import { C, F } from "@/theme";
import { Icon } from "../Icon";
import { LiquidProgressBar } from "../LiquidProgressBar";
import { tap } from "../ui";
import { LightIcon } from "./LightIcon";

const pill = { backgroundColor: "rgba(255,255,255,.88)", borderRadius: 999, borderWidth: 1.5, borderColor: "#fff",
  shadowColor: "#3448BE", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 } as const;

/** `extra`: more chips for the second row (the Dim raid warning) */
export function Hud({ world, name, nudges, extra }: { world: WorldState; name: string; nudges: number; extra?: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {/* level shield */}
        <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 3, borderColor: "#fff", overflow: "hidden", alignItems: "center", justifyContent: "center",
                       shadowColor: "#5B4FD0", shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
              accessibilityLabel={`World level ${world.level}`}>
          <LinearGradient colors={["#8E7BFF", "#4F6BFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", inset: 0 }} />
          <Text style={{ fontFamily: F.heavy, fontSize: 9, color: "rgba(255,255,255,.85)", marginBottom: -3 }}>LV</Text>
          <Text style={{ fontFamily: F.heavy, fontSize: 22, color: "#fff" }}>{world.level}</Text>
        </View>
        <View style={[pill, { flex: 1, paddingVertical: 7, paddingHorizontal: 12, gap: 5, borderRadius: 16 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.heavy, fontSize: 13.5, color: C.ink }} numberOfLines={1}>{name}'s Bulbu</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 11, color: C.ink2 }}>{world.into}/{world.span} XP</Text>
          </View>
          <LiquidProgressBar value={(world.into / Math.max(1, world.span)) * 100} height={12} label="Progress to the next world level" />
        </View>
        {/* Light: the resource you build with */}
        <View style={[pill, { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 9, paddingLeft: 9, paddingRight: 13 }]} accessibilityLabel={`${world.light} Light`}>
          <LightIcon size={22} />
          <Text style={{ fontFamily: F.heavy, fontSize: 16, color: "#8A5A00" }}>{world.light.toLocaleString("en-IN")}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", gap: 8, flexShrink: 1, flexWrap: "wrap" }}>
          <Chip text={`🔥 ${world.streak}-day streak`} tone="orange" />
          {world.earnedToday > 0 && <Chip text={`+${world.earnedToday} Light today`} />}
          {extra}
          {world.fog > 0.3 && <Chip text="Too much scrolling today" warn />}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={nudges ? `Bulbu's tips, ${nudges} new` : "Bulbu's tips"} onPress={() => { tap(); router.push("/nudges"); }}
                   style={[pill, { width: 40, height: 40, alignItems: "center", justifyContent: "center" }]}>
          <Icon name="bell" size={19} />
          {nudges > 0 && <View style={{ position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: C.red, borderWidth: 1.5, borderColor: "#fff" }} />}
        </Pressable>
      </View>
    </View>
  );
}

function Chip({ text, warn = false, tone }: { text: string; warn?: boolean; tone?: "orange" }) {
  return (
    <View style={[pill, { paddingVertical: 6, paddingHorizontal: 11, backgroundColor: warn ? "rgba(255,240,244,.92)" : "rgba(255,255,255,.88)" }]}>
      <Text style={{ fontFamily: F.bold, fontSize: 12, color: warn ? C.red : tone === "orange" ? "#D9631E" : C.green }}>{text}</Text>
    </View>
  );
}
