import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { GoalView } from "@bulbu/api";
import { C, F, T } from "@/theme";
import { fmtDate } from "@/lib/format";
import { GlossyIcon } from "./GlossyIcon";
import { LiquidProgressBar } from "./LiquidProgressBar";
import { schemeFor } from "./goals";
import { tap } from "./ui";

export function GoalRow({ g }: { g: GoalView }) {
  const f = g.forecast;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${g.title}, ${Math.round(f.percent)}%`} onPress={() => { tap(); router.push({ pathname: "/goal/[id]", params: { id: g.id } }); }}
               style={({ pressed }) => ({ flexDirection: "row", gap: 14, alignItems: "center", opacity: pressed ? 0.85 : 1 })}>
      <GlossyIcon name={g.template} size={46} />
      <View style={{ flex: 1, gap: 7, minWidth: 0 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 15.5, color: C.ink, flex: 1 }} numberOfLines={1}>{g.title}</Text>
          <Text style={{ fontFamily: F.heavy, fontSize: 15, color: C.primary }}>{f.done ? "Done!" : `${Math.round(f.percent)}%`}</Text>
        </View>
        <LiquidProgressBar value={f.percent} scheme={schemeFor(g)} height={18} label={`${g.title} progress`} />
        <Text style={T.tiny} numberOfLines={1}>{g.subtitle} · {f.done ? "complete" : `on pace for ${fmtDate(f.eta)}`}</Text>
      </View>
    </Pressable>
  );
}
