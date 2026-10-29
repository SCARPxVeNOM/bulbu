// Dim raids on the kingdom: the warning chip in the game bar, and the sheet that says when it comes, where it's
// heading, why Bulbu expects it, what it would cost, and the loot for holding it off with a 25-minute Defend session.
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { fmtDays } from "@bulbu/engine";
import type { RaidView } from "@bulbu/api";
import { Btn, Row, Sheet, tap } from "@/components/ui";
import { C, F, T } from "@/theme";
import { LightIcon } from "./LightIcon";

const pill = { borderRadius: 999, borderWidth: 1.5, borderColor: "#fff", paddingVertical: 6, paddingHorizontal: 11,
  shadowColor: "#3448BE", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 } as const;

/** The game bar's raid chip. */
export function RaidChip({ raid, onPress }: { raid: RaidView; onPress: () => void }) {
  if (raid.state === "passed") return null;
  const held = raid.state === "defended", now = raid.state === "striking";
  const text = held ? "🛡️ Raid held off" : now ? "⚔️ Dim raid now: defend!" : `⚔️ Dim raid at ${raid.label}`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${text}. Details`} onPress={() => { tap(); onPress(); }}
               style={[pill, { backgroundColor: held ? "rgba(227,248,238,.95)" : now ? "#5B4AA8" : "rgba(239,234,255,.95)" }]}>
      <Text style={{ fontFamily: F.heavy, fontSize: 12, color: held ? "#138A5A" : now ? "#fff" : "#5B4AA8" }}>{text}</Text>
    </Pressable>
  );
}

export function RaidSheet({ raid, open, onClose }: { raid: RaidView; open: boolean; onClose: () => void }) {
  const held = raid.state === "defended", loot = raid.loot;
  const when = new Date(raid.at), today = new Date().toDateString() === when.toDateString();
  return (
    <Sheet open={open} onClose={onClose} title={held ? "Raid held off" : `A Dim raid at ${raid.label}`}>
      <View style={{ gap: 12 }}>
        <Row gap={12} style={{ alignItems: "flex-start" }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: held ? "#E3F8EE" : "#ECE8FF", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 28 }}>{held ? "🛡️" : "⛈️"}</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontFamily: F.heavy, fontSize: 15, color: C.ink }}>
              {held ? `The ${raid.buildingName} is safe tonight.` : `${today ? "Tonight" : "Tomorrow"} at ${raid.label}, heading for the ${raid.buildingName}`}
            </Text>
            <Text style={T.small}>{held ? "Your Defend session held the Dim back." : raid.line}</Text>
          </View>
        </Row>

        {!held && <>
          <View style={{ backgroundColor: "#F6F7FD", borderRadius: 14, padding: 12, gap: 6 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: C.ink }}>Why Bulbu expects it</Text>
            <Text style={T.small}>{raid.why}</Text>
            <Text style={T.small}>If it lands, that's about {raid.minutes} minutes of scrolling: the {raid.buildingName} finishes {fmtDays(raid.days).slice(1)} later.</Text>
          </View>
          <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: C.ink }}>Hold it off and it drops</Text>
        </>}
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          <Row gap={6} style={{ backgroundColor: "#FFF4D2", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 }}>
            <LightIcon size={18} /><Text style={{ fontFamily: F.heavy, fontSize: 13, color: "#8A5A00" }}>+{loot.light} Light</Text>
          </Row>
          {loot.piece && (
            <View style={{ backgroundColor: "#ECE8FF", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 }}>
              <Text style={{ fontFamily: F.heavy, fontSize: 13, color: "#5B4AA8" }}>🧩 {loot.piece.name} piece {loot.piece.have} of {loot.piece.of}</Text>
            </View>
          )}
        </Row>

        {!held && <>
          <Btn icon="play" title="Defend now · 25 min" onPress={() => { onClose(); router.push(`/focus?raid=${raid.id}` as never); }} />
          <Text style={[T.tiny, { textAlign: "center", marginTop: -4 }]}>Any time before the raid's over. 20 minutes is enough to hold it.</Text>
        </>}
      </View>
    </Sheet>
  );
}
