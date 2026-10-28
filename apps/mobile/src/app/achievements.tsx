import { useState } from "react";
import { Text, View } from "react-native";
import { useStore } from "@/lib/store";
import { GlossyIcon } from "@/components/GlossyIcon";
import { Card, Header, Screen, Seg } from "@/components/ui";
import { T } from "@/theme";

const ICON: Record<string, string> = { streak7: "flame", streak30: "refresh", dsa: "code", early: "sun", book: "book", fit: "dumbbell", noscroll: "ban", iphone: "phone" };

export default function Achievements() {
  const { state } = useStore();
  const [tab, setTab] = useState<"all" | "goals" | "streaks" | "special">("all");
  if (!state) return null;
  const list = state.achievements.filter(a => tab === "all" || a.group === tab);
  return (
    <Screen>
      <Header title="Achievements" />
      <Seg value={tab} onChange={setTab} options={[["all", "All"], ["goals", "Goals"], ["streaks", "Streaks"], ["special", "Special"]]} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {list.map(a => (
          <Card key={a.id} style={{ width: "47.8%", alignItems: "center", gap: 6, paddingVertical: 18, opacity: a.earned ? 1 : 0.6 }}>
            <GlossyIcon name={a.earned ? ICON[a.id] ?? "trophy" : "lock"} size={52} />
            <Text style={[T.b, { fontSize: 14, textAlign: "center" }]}>{a.title}</Text>
            <Text style={[T.tiny, { textAlign: "center" }]}>{a.earned ? a.detail : a.progress > 0 ? `${a.detail} · ${Math.round(a.progress * 100)}%` : "Coming soon"}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
