// Inventory: everything Bulbu can wear or carry. Four ways to get things:
//   Level   your XP unlocks them      Streak  keep showing up
//   Shop    buy with Light            Real life  you bought the real thing, Bulbu gets one too
// Anything you own levels up (1 → 3) with Light. Bulbu wears one thing at a time.
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { matchRealItem } from "@bulbu/engine";
import type { ItemSource, ItemState } from "@bulbu/api";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Bulbu } from "@/components/bulbu/Bulbu";
import { GlossyIcon } from "@/components/GlossyIcon";
import { Icon } from "@/components/Icon";
import { LightIcon } from "@/components/world/LightIcon";
import { Btn, Chip, Field, Header, Input, Progress, Row, Screen, Sheet, tap } from "@/components/ui";
import { C, F, T, shadow } from "@/theme";

type Tab = "all" | ItemSource;
const TABS: [Tab, string][] = [["all", "All"], ["level", "Level"], ["streak", "Streak"], ["light", "Shop"], ["real", "Real life"]];
const SECTION: Record<ItemSource, { title: string; sub: string }> = {
  level: { title: "Unlocked by level", sub: "Every good habit gives XP. New levels unlock these." },
  streak: { title: "Unlocked by streaks", sub: "Show up day after day. Your best streak counts." },
  light: { title: "Light shop", sub: "Spend the Light your habits make." },
  real: { title: "Real life", sub: "Bought something real? Add it and Bulbu gets one too." },
};
/** items whose 3D version is already in Bulbu's model */
const IN_3D = new Set(["sweater", "hoodie", "fit", "tech", "champ"]);

const stars = (n: number) => "★".repeat(n) + "☆".repeat(3 - n);
const short = (it: ItemState) =>
  it.source === "level" ? `Level ${it.need}` : it.source === "streak" ? `${it.need}-day streak` : it.source === "light" ? `${it.need}` : "Add it";

export default function InventoryScreen() {
  const { state, refresh, toast, setReaction } = useStore();
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | boolean>(false);
  const [busy, setBusy] = useState(false);
  const inv = state?.inventory;
  const item = inv?.items.find(i => i.id === open) ?? null;
  const wearing = inv?.items.find(i => i.equipped) ?? null;
  const preview = item ?? wearing;
  const groups = useMemo(() => (["level", "streak", "light", "real"] as ItemSource[])
    .filter(s => tab === "all" || tab === s)
    .map(s => ({ s, items: (inv?.items ?? []).filter(i => i.source === s) })), [inv, tab]);
  if (!state || !inv) return null;
  const owned = inv.items.filter(i => i.owned).length;

  const act = async (fn: () => Promise<unknown>, done?: string, cheer = false) => {
    setBusy(true);
    try { await fn(); await refresh(); if (done) toast(done); if (cheer) setReaction({ emote: "celebrating", animation: "celebrate", line: done ?? "", glow: 1, via: "engine" }); }
    catch (e) { toast((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Screen tabs>
      <Header back={false} large title="Inventory" subtitle={`${owned} of ${inv.items.length} collected`}
              right={<View accessibilityLabel={`${inv.light} Light`} style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFF6DA", borderRadius: 999, paddingVertical: 6, paddingLeft: 6, paddingRight: 12, borderWidth: 1.5, borderColor: "#FFE29A" }}>
                <LightIcon size={22} /><Text style={{ fontFamily: F.heavy, fontSize: 15, color: "#8A5A00" }}>{inv.light}</Text></View>} />

      {/* Bulbu, wearing what you've picked */}
      <View style={[{ height: 280, borderRadius: 26, overflow: "hidden", backgroundColor: C.stage }, shadow]}>
        <Bulbu emote="happy" outfit={preview ? preview.outfit ?? null : null} view="full" interactive style={{ flex: 1 }} />
        <View pointerEvents="none" style={{ position: "absolute", left: 12, bottom: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View style={{ backgroundColor: "rgba(255,255,255,.9)", borderRadius: 14, paddingVertical: 7, paddingHorizontal: 12 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 11, color: C.muted, letterSpacing: 0.6 }}>{item && !item.equipped ? "TRYING ON" : "WEARING"}</Text>
            <Text style={{ fontFamily: F.heavy, fontSize: 15, color: C.ink }}>{preview?.name ?? "Nothing"}{preview?.owned ? `  ${stars(preview.level)}` : ""}</Text>
          </View>
          <View style={{ backgroundColor: "rgba(255,255,255,.9)", borderRadius: 14, paddingVertical: 7, paddingHorizontal: 12, alignItems: "flex-end" }}>
            <Text style={{ fontFamily: F.bold, fontSize: 11, color: C.muted, letterSpacing: 0.6 }}>LEVEL {inv.level}</Text>
            <Text style={{ fontFamily: F.heavy, fontSize: 13, color: C.ink }}>🔥 best {inv.bestStreak}d</Text>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        {TABS.map(([k, l]) => <Chip key={k} title={l} on={tab === k} onPress={() => setTab(k)} />)}
      </ScrollView>

      {groups.map(({ s, items }) => (
        <View key={s} style={{ gap: 10 }}>
          <View style={{ gap: 2 }}>
            <Text style={[T.b, { fontSize: 17 }]}>{SECTION[s].title}</Text>
            <Text style={T.small}>{SECTION[s].sub}</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {items.map(it => <ItemCard key={it.id} it={it} light={inv.light} onPress={() => { tap(); setOpen(it.id); }} />)}
          </View>
          {s === "real" && <Btn kind="ghost" icon="plus" title="I bought something" onPress={() => setAdding(true)} />}
        </View>
      ))}

      <Sheet open={!!item} onClose={() => setOpen(null)} title={item?.name ?? ""}>
        {item && <ItemDetail it={item} light={inv.light} busy={busy}
          onWear={() => act(() => api.equipItem(item.equipped ? null : item.id), item.equipped ? `Took off ${item.name}` : `Bulbu is wearing ${item.name}`)}
          onBuy={() => act(() => api.buyItem(item.id), `${item.name} is yours!`, true)}
          onUpgrade={() => act(() => api.upgradeItem(item.id), `${item.name} is now level ${item.level + 1}!`, true)}
          onAdd={() => { setOpen(null); setAdding(item.id); }}
          onRemove={() => act(() => api.removeRealItem(item.id), `Removed ${item.name}`).then(() => setOpen(null))} />}
      </Sheet>

      <AddReal open={adding !== false} initial={typeof adding === "string" ? adding : null} items={inv.items.filter(i => i.source === "real")} busy={busy}
               onClose={() => setAdding(false)}
               onAdd={(id, price) => act(() => api.addRealItem(id, { price }), "Nice! Bulbu got one too.", true).then(() => { setAdding(false); setOpen(id); })} />
    </Screen>
  );
}

function ItemCard({ it, light, onPress }: { it: ItemState; light: number; onPress: () => void }) {
  const locked = !it.owned;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${it.name}. ${it.owned ? `Owned, level ${it.level}${it.equipped ? ", wearing" : ""}` : it.detail}`} onPress={onPress}
               style={({ pressed }) => [{ width: "31.4%", flexGrow: 0, borderRadius: 20, backgroundColor: "#fff", borderWidth: 2, borderColor: it.equipped ? C.primary : it.affordable ? "#FFD45C" : C.cardBorder,
                 padding: 10, alignItems: "center", gap: 6, transform: [{ scale: pressed ? 0.96 : 1 }] }, shadow]}>
      <View>
        <GlossyIcon name={it.icon} size={50} locked={locked} />
        {locked && it.source !== "real" && it.source !== "light" && <View style={{ position: "absolute", right: -5, bottom: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: C.ink, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="lock" size={11} color="#fff" /></View>}
        {it.equipped && <View style={{ position: "absolute", right: -5, top: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={11} stroke={3} color="#fff" /></View>}
      </View>
      <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 12.5, color: locked ? C.ink2 : C.ink }}>{it.name}</Text>
      {it.owned
        ? <Text style={{ fontSize: 13, color: "#F5A524", letterSpacing: 1 }}>{stars(it.level)}</Text>
        : it.source === "light"
          ? <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><LightIcon size={15} /><Text style={{ fontFamily: F.heavy, fontSize: 12.5, color: light >= it.need ? "#8A5A00" : C.muted }}>{it.need}</Text></View>
          : it.source === "real"
            ? <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: C.primary }}>+ Add it</Text>
            : <View style={{ width: "100%", gap: 3 }}>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: "#E6EAF7", overflow: "hidden" }}>
                  <LinearGradient colors={it.source === "streak" ? ["#FFB547", "#FF6B3D"] : ["#7FD8FF", "#3D5BFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: "100%", width: `${Math.max(6, it.progress * 100)}%` }} />
                </View>
                <Text style={{ fontFamily: F.semibold, fontSize: 10.5, color: C.muted, textAlign: "center" }}>{short(it)}</Text>
              </View>}
    </Pressable>
  );
}

function ItemDetail({ it, light, busy, onWear, onBuy, onUpgrade, onAdd, onRemove }: { it: ItemState; light: number; busy: boolean; onWear: () => void; onBuy: () => void; onUpgrade: () => void; onAdd: () => void; onRemove: () => void }) {
  const kind = { level: "Level reward", streak: "Streak reward", light: "Shop item", real: "Real-life item" }[it.source];
  return <>
    <Row gap={12}>
      <GlossyIcon name={it.icon} size={58} locked={!it.owned} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 11, color: C.muted, letterSpacing: 0.6 }}>{kind.toUpperCase()}</Text>
        {it.owned ? <Text style={{ fontSize: 17, color: "#F5A524", letterSpacing: 2 }}>{stars(it.level)} <Text style={[T.small, { letterSpacing: 0 }]}>level {it.level} of 3</Text></Text>
                  : <Text style={T.small}>{it.detail}</Text>}
      </View>
    </Row>
    <Text style={T.muted}>{it.tagline}</Text>
    {!IN_3D.has(it.id) && <Text style={T.tiny}>Bulbu's 3D {it.name.toLowerCase()} is still being made. It's in your inventory now and shows up on Bulbu when it's ready.</Text>}
    {it.realAt && <Text style={T.tiny}>Added {new Date(it.realAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</Text>}

    {it.owned && <>
      <Btn kind={it.equipped ? "ghost" : "primary"} icon={it.equipped ? undefined : "check"} title={it.equipped ? "Take it off" : `Wear ${it.name}`} busy={busy} onPress={onWear} />
      {it.upgradeCost != null
        ? <View style={{ gap: 6, padding: 12, borderRadius: 18, backgroundColor: "#FFF8E3", borderWidth: 1.5, borderColor: "#FFE29A" }}>
            <Text style={T.b}>Level up to {stars(it.level + 1)}</Text>
            <Text style={T.small}>A higher level makes Bulbu glow brighter while it wears this.</Text>
            <Btn kind="primary" title={light >= it.upgradeCost ? `Level up · ${it.upgradeCost} Light` : `Need ${it.upgradeCost - light} more Light`} disabled={light < it.upgradeCost} busy={busy} onPress={onUpgrade} />
          </View>
        : <Text style={[T.small, { textAlign: "center" }]}>Max level. This is as shiny as it gets.</Text>}
      {it.realAt && <Btn kind="ghost" title="Remove from inventory" busy={busy} onPress={onRemove} />}
    </>}

    {!it.owned && it.source === "light" &&
      <Btn title={light >= it.need ? `Buy · ${it.need} Light` : `Need ${it.need - light} more Light`} disabled={light < it.need} busy={busy} onPress={onBuy} />}
    {!it.owned && (it.source === "level" || it.source === "streak") && <View style={{ gap: 6 }}>
      <Progress value={it.progress * 100} label={`${it.name} progress`} />
      <Text style={T.small}>{it.source === "level" ? "Log good habits to earn XP. It unlocks by itself." : "Log something good every day. It unlocks by itself."}</Text>
    </View>}
    {!it.owned && it.source === "real" && <Btn icon="plus" title={`I bought ${/^[aeiou]/i.test(it.name) ? "an" : "a"} ${it.name.toLowerCase()}`} onPress={onAdd} />}
  </>;
}

function AddReal({ open, initial, items, busy, onClose, onAdd }: { open: boolean; initial: string | null; items: ItemState[]; busy: boolean; onClose: () => void; onAdd: (id: string, price?: number) => void }) {
  const [text, setText] = useState("");
  const [pick, setPick] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const chosen = pick ?? initial ?? (text.trim() ? matchRealItem(text)?.id ?? null : null);
  const def = items.find(i => i.id === chosen);
  const close = () => { setText(""); setPick(null); setPrice(""); onClose(); };
  return (
    <Sheet open={open} onClose={close} title="You bought something real">
      <Text style={T.muted}>Something you saved up for or worked toward? Add it and Bulbu gets a tiny one too.</Text>
      <Field label="What did you buy?"><Input value={text} onChangeText={t => { setText(t); setPick(null); }} placeholder="New AirPods, running shoes, a guitar…" /></Field>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {items.map(i => <Chip key={i.id} title={`${i.owned ? "✓ " : ""}${i.name}`} on={chosen === i.id} onPress={() => setPick(i.id)} />)}
      </View>
      {text.trim() !== "" && !chosen && <Text style={T.small}>Bulbu doesn't have that one yet. Pick the closest from the list.</Text>}
      <Field label="Price (optional)"><Input value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="e.g. 2499" /></Field>
      <Btn icon="plus" title={def ? (def.owned ? `${def.name} is already in the inventory` : `Add ${def.name}`) : "Pick what you bought"} disabled={!def || def.owned} busy={busy}
           onPress={() => { if (def) { onAdd(def.id, Number(price) || undefined); setText(""); setPick(null); setPrice(""); } }} />
    </Sheet>
  );
}
