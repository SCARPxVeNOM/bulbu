// Inventory: everything Bulbu can wear or carry. Four ways to get things:
//   Level   your XP unlocks them      Streak  keep showing up
//   Shop    buy with Light            Real life  you bought the real thing, Bulbu gets one too
// Anything you own levels up (1 → 3) with Light. Bulbu wears one outfit at a time, and has one real-life item to show
// off: tap Bulbu and it holds your iPad up and looks at it (its emote).
// Real life from a photo: Muse Spark says what it is, SAM 3.1 cuts it out of your photo, Muse Image draws Bulbu with it.
import { useEffect, useId, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Image as SvgImage, Mask } from "react-native-svg";
import { matchRealItem } from "@bulbu/engine";
import type { ItemSource, ItemState } from "@bulbu/api";
import { api } from "@/lib/api";
import { pickPhoto } from "@/lib/photo";
import { useStore } from "@/lib/store";
import { Bulbu } from "@/components/bulbu/Bulbu";
import { GlossyIcon } from "@/components/GlossyIcon";
import { Icon } from "@/components/Icon";
import { LightIcon } from "@/components/world/LightIcon";
import { Btn, Chip, Field, Header, Input, Progress, Row, Screen, Sheet, tap } from "@/components/ui";
import { C, F, T, shadow } from "@/theme";

type Tab = "all" | ItemSource;
const TABS: [Tab, string][] = [["all", "All"], ["level", "Level"], ["play", "Play"], ["light", "Shop"], ["real", "Real life"]];
const SECTION: Record<ItemSource, { title: string; sub: string }> = {
  level: { title: "Unlocked by level", sub: "Every good choice gives XP. New kingdom levels unlock these." },
  play: { title: "Unlocked by playing", sub: "Play your cards and hold off Dim raids. Each one counts." },
  light: { title: "Light shop", sub: "Spend the Light your good choices make." },
  real: { title: "Real life", sub: "Bought something real? Snap a photo and Bulbu gets one too." },
};
/** items whose 3D version is already in Bulbu's model (real-life ones say so with `hold`) */
const IN_3D = new Set(["sweater", "hoodie", "fit", "tech", "champ"]);
const in3d = (it: ItemState) => IN_3D.has(it.id) || !!it.hold;

const stars = (n: number) => "★".repeat(n) + "☆".repeat(3 - n);
const short = (it: ItemState) =>
  it.source === "level" ? `Level ${it.need}` : it.source === "play" ? `${it.need} plays` : it.source === "light" ? `${it.need}` : "Add it";
const busyMine = (it: ItemState) => it.mine?.cutState === "cutting" || it.mine?.artState === "drawing";

export default function InventoryScreen() {
  const { state, refresh, toast, setReaction } = useStore();
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | boolean>(false);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(0);
  const inv = state?.inventory;
  const item = inv?.items.find(i => i.id === open) ?? null;
  const outfitItem = inv?.items.find(i => i.equipped && i.source !== "real") ?? null;
  const held = inv?.items.find(i => i.id === inv.gear) ?? null;
  // what the stage shows: the item you're looking at, on top of what Bulbu has on now
  const stageOutfit = item && item.source !== "real" ? item.outfit ?? null : state?.user.outfit ?? null;
  const stageGear = item?.source === "real" ? item : held;
  const groups = useMemo(() => (["level", "play", "light", "real"] as ItemSource[])
    .filter(s => tab === "all" || tab === s)
    .map(s => ({ s, items: (inv?.items ?? []).filter(i => i.source === s) })), [inv, tab]);

  // the cut-out and Bulbu's picture arrive a few seconds after a photo: keep checking while they're on the way
  const waiting = !!inv?.items.some(busyMine);
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => { refresh().catch(() => {}); }, 3000);
    return () => clearInterval(t);
  }, [waiting, refresh]);

  // opening an item Bulbu can hold plays its emote on the stage above
  useEffect(() => { if (item?.hold) setShow(n => n + 1); }, [item?.id, item?.hold]);

  if (!state || !inv) return null;
  const owned = inv.items.filter(i => i.owned).length;

  const act = async (fn: () => Promise<unknown>, done?: string, cheer = false) => {
    setBusy(true);
    try { await fn(); await refresh(); if (done) toast(done); if (cheer) setReaction({ emote: "celebrating", animation: "celebrate", line: done ?? "", glow: 1, via: "engine" }); }
    catch (e) { toast((e as Error).message); }
    finally { setBusy(false); }
  };
  const showOff = () => { setOpen(null); setTimeout(() => setShow(n => n + 1), 350); };

  const label = item && !item.equipped ? (item.source === "real" ? "TRYING IT" : "TRYING ON") : "WEARING";
  const title = item ? item.name : [outfitItem?.name, held && `has your ${held.name}`].filter(Boolean).join(" · ") || "Nothing";

  return (
    <Screen tabs>
      <Header back={false} large title="Inventory" subtitle={`${owned} of ${inv.items.length} collected`}
              right={<View accessibilityLabel={`${inv.light} Light`} style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFF6DA", borderRadius: 999, paddingVertical: 6, paddingLeft: 6, paddingRight: 12, borderWidth: 1.5, borderColor: "#FFE29A" }}>
                <LightIcon size={22} /><Text style={{ fontFamily: F.heavy, fontSize: 15, color: "#8A5A00" }}>{inv.light}</Text></View>} />

      {/* Bulbu, wearing what you've picked */}
      <View style={[{ height: 280, borderRadius: 26, overflow: "hidden", backgroundColor: C.stage }, shadow]}>
        <Bulbu emote="happy" outfit={stageOutfit} gear={stageGear?.hold ? stageGear.id : null} gearColor={stageGear?.mine?.color} show={show} view="full" interactive style={{ flex: 1 }} />
        <View pointerEvents="box-none" style={{ position: "absolute", left: 12, bottom: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 8 }}>
          <View pointerEvents="none" style={{ flexShrink: 1, backgroundColor: "rgba(255,255,255,.9)", borderRadius: 14, paddingVertical: 7, paddingHorizontal: 12 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 11, color: C.muted, letterSpacing: 0.6 }}>{label}</Text>
            <Text numberOfLines={1} style={{ fontFamily: F.heavy, fontSize: 14, color: C.ink }}>{title}{item?.owned && item.source !== "real" ? `  ${stars(item.level)}` : ""}</Text>
          </View>
          {held?.hold && !item
            ? <Pressable accessibilityRole="button" accessibilityLabel={`Bulbu shows off the ${held.name}`} onPress={() => { tap(); setShow(n => n + 1); }}
                         style={({ pressed }) => ({ backgroundColor: "#FFE07A", borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12, borderWidth: 2, borderColor: "#fff", transform: [{ scale: pressed ? 0.95 : 1 }] })}>
                <Text style={{ fontFamily: F.heavy, fontSize: 13, color: "#7A4A00" }}>✨ Show it off</Text>
              </Pressable>
            : <View pointerEvents="none" style={{ backgroundColor: "rgba(255,255,255,.9)", borderRadius: 14, paddingVertical: 7, paddingHorizontal: 12, alignItems: "flex-end" }}>
                <Text style={{ fontFamily: F.bold, fontSize: 11, color: C.muted, letterSpacing: 0.6 }}>LEVEL {inv.level}</Text>
                <Text style={{ fontFamily: F.heavy, fontSize: 13, color: C.ink }}>🃏 {inv.plays} played</Text>
              </View>}
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
          {s === "real" && <SnapCard onPress={() => setAdding(true)} />}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {items.map(it => <ItemCard key={it.id} it={it} light={inv.light} onPress={() => { tap(); setOpen(it.id); }} />)}
          </View>
        </View>
      ))}

      <Sheet open={!!item} onClose={() => setOpen(null)} title={item?.mine?.name || item?.name || ""}>
        {item && <ItemDetail it={item} light={inv.light} busy={busy}
          onWear={() => act(() => item.equipped ? api.unequipItem(item.id) : api.equipItem(item.id),
            item.equipped ? (item.source === "real" ? `Bulbu gave the ${item.name} back` : `Took off ${item.name}`) : (item.source === "real" ? `Tap Bulbu to see your ${item.name}!` : `Bulbu is wearing ${item.name}`))
            .then(() => { if (!item.equipped && item.hold) showOff(); })}
          onShow={showOff}
          onBuy={() => act(() => api.buyItem(item.id), `${item.name} is yours!`, true)}
          onUpgrade={() => act(() => api.upgradeItem(item.id), `${item.name} is now level ${item.level + 1}!`, true)}
          onAdd={() => { setOpen(null); setAdding(item.id); }}
          onRedraw={() => act(() => api.redrawArt(item.id), "Bulbu is drawing it again…")}
          onRemove={() => act(() => api.removeRealItem(item.id), `Removed ${item.name}`).then(() => setOpen(null))} />}
      </Sheet>

      <AddReal open={adding !== false} initial={typeof adding === "string" ? adding : null} items={inv.items.filter(i => i.source === "real")} busy={busy} ai={state.ai.enabled}
               onClose={() => setAdding(false)}
               onAdd={(id, price) => act(() => api.addRealItem(id, { price }), "Nice! Bulbu got one too.", true).then(() => { setAdding(false); setOpen(id); })}
               onPhoto={async photo => {
                 const r = await api.realPhoto(photo.data, { width: photo.width, height: photo.height });
                 if (!r.matched) return r.seen;
                 await refresh();
                 setAdding(false);
                 const name = r.inventory.items.find(i => i.id === r.matched)?.name ?? r.matched;
                 toast(r.added ? `That's your ${r.seen || name}! Bulbu has one too now.` : `New photo of your ${name}!`);
                 setReaction({ emote: "celebrating", animation: "Celebrate", line: `My own ${name}!`, glow: 1, via: "engine" });
                 setOpen(r.matched);
                 setTimeout(() => setShow(n => n + 1), 600);
                 return null;
               }} />
    </Screen>
  );
}

/** The big "snap what you bought" card at the top of Real life. */
function SnapCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="I bought something: snap a photo" onPress={() => { tap(); onPress(); }}
               style={({ pressed }) => [{ borderRadius: 22, overflow: "hidden", transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow]}>
      <LinearGradient colors={["#8EA6FF", "#B79BFF", "#FFB8D9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(255,255,255,.9)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="camera" size={28} color={C.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: F.heavy, fontSize: 16, color: "#fff" }}>I bought something!</Text>
          <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: "rgba(255,255,255,.92)" }}>Snap a photo. Bulbu works out what it is and gets one too.</Text>
        </View>
        <Icon name="right" size={18} color="#fff" />
      </LinearGradient>
    </Pressable>
  );
}

/** Your own item, cut out of your photo by SAM 3.1 (or the photo itself while that's on the way). */
function Sticker({ it, size }: { it: ItemState; size: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const p = it.mine?.photo, cut = it.mine?.cutout;
  if (!p) return null;
  const url = api.mediaUrl(p.file);
  if (!cut || !p.width || !p.height)
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size * 0.22 }} resizeMode="cover" accessibilityLabel={`Your ${it.name}`} />;
  const b = cut.box, bw = Math.max(1, b.right - b.left), bh = Math.max(1, b.bottom - b.top);
  return (
    <View accessibilityLabel={`Your ${it.name}`} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`${b.left} ${b.top} ${bw} ${bh}`} preserveAspectRatio="xMidYMid meet">
        <Defs>
          <Mask id={`m${id}`} maskUnits="userSpaceOnUse" x={b.left} y={b.top} width={bw} height={bh}>
            <SvgImage href={{ uri: api.mediaUrl(cut.mask) }} x={b.left} y={b.top} width={bw} height={bh} preserveAspectRatio="none" />
          </Mask>
        </Defs>
        <SvgImage href={{ uri: url }} x={0} y={0} width={p.width} height={p.height} preserveAspectRatio="none" mask={`url(#m${id})`} />
      </Svg>
    </View>
  );
}

function ItemCard({ it, light, onPress }: { it: ItemState; light: number; onPress: () => void }) {
  const locked = !it.owned;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${it.name}. ${it.owned ? `Owned, level ${it.level}${it.equipped ? (it.source === "real" ? ", Bulbu has it" : ", wearing") : ""}` : it.detail}`} onPress={onPress}
               style={({ pressed }) => [{ width: "31.4%", flexGrow: 0, borderRadius: 20, backgroundColor: "#fff", borderWidth: 2, borderColor: it.equipped ? C.primary : it.affordable ? "#FFD45C" : C.cardBorder,
                 padding: 10, alignItems: "center", gap: 6, transform: [{ scale: pressed ? 0.96 : 1 }] }, shadow]}>
      <View>
        {it.mine?.photo ? <Sticker it={it} size={50} /> : <GlossyIcon name={it.icon} size={50} locked={locked} />}
        {locked && it.source !== "real" && it.source !== "light" && <View style={{ position: "absolute", right: -5, bottom: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: C.ink, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="lock" size={11} color="#fff" /></View>}
        {it.equipped && <View style={{ position: "absolute", right: -5, top: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={11} stroke={3} color="#fff" /></View>}
        {it.source === "real" && it.hold && !it.owned && <View style={{ position: "absolute", left: -6, top: -6, backgroundColor: "#7B5CFF", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1.5, borderColor: "#fff" }}><Text style={{ fontFamily: F.heavy, fontSize: 9, color: "#fff" }}>3D</Text></View>}
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
                  <LinearGradient colors={it.source === "play" ? ["#FFB547", "#FF6B3D"] : ["#7FD8FF", "#3D5BFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: "100%", width: `${Math.max(6, it.progress * 100)}%` }} />
                </View>
                <Text style={{ fontFamily: F.semibold, fontSize: 10.5, color: C.muted, textAlign: "center" }}>{short(it)}</Text>
              </View>}
    </Pressable>
  );
}

/** "Bulbu with your iPad", drawn by Muse Image from your photo. */
function Art({ it, onRedraw, busy }: { it: ItemState; onRedraw: () => void; busy: boolean }) {
  const m = it.mine;
  if (!m?.photo) return null;
  return (
    <View style={{ gap: 8 }}>
      <Row gap={12} style={{ alignItems: "stretch" }}>
        <View style={{ width: 104, borderRadius: 18, backgroundColor: "#F1F3FF", alignItems: "center", justifyContent: "center", padding: 8, gap: 6 }}>
          <Sticker it={it} size={82} />
          <Text style={[T.tiny, { textAlign: "center" }]}>{m.cutState === "cutting" ? "Cutting it out…" : `Your ${it.name}`}</Text>
        </View>
        <View style={{ flex: 1, aspectRatio: 1, borderRadius: 18, overflow: "hidden", backgroundColor: "#EEE9FF", alignItems: "center", justifyContent: "center" }}>
          {m.art
            ? <Image source={{ uri: api.mediaUrl(m.art) }} style={{ width: "100%", height: "100%" }} accessibilityLabel={`Bulbu with your ${it.name}`} />
            : m.artState === "drawing"
              ? <View style={{ alignItems: "center", gap: 8, padding: 10 }}><ActivityIndicator color={C.violet} /><Text style={[T.small, { textAlign: "center" }]}>Bulbu is drawing itself with your {it.name}…</Text></View>
              : <Pressable accessibilityRole="button" onPress={onRedraw} disabled={busy} style={{ alignItems: "center", gap: 6, padding: 10 }}>
                  <Icon name="refresh" size={22} color={C.violet} />
                  <Text style={[T.small, { textAlign: "center" }]}>{m.artState === "failed" ? "The drawing didn't work. Tap to try again." : "Tap for a picture of Bulbu with it"}</Text>
                </Pressable>}
        </View>
      </Row>
      {(m.engraving || m.price) && <Text style={T.tiny}>{[m.engraving && `Engraved: “${m.engraving}”`, m.price && `Paid ₹${m.price.toLocaleString("en-IN")}`].filter(Boolean).join(" · ")}</Text>}
      {m.art && <Pressable accessibilityRole="button" onPress={onRedraw} disabled={busy || m.artState === "drawing"}><Text style={[T.tiny, { color: C.violet }]}>Draw a new picture</Text></Pressable>}
    </View>
  );
}

function ItemDetail({ it, light, busy, onWear, onShow, onBuy, onUpgrade, onAdd, onRedraw, onRemove }: { it: ItemState; light: number; busy: boolean; onWear: () => void; onShow: () => void; onBuy: () => void; onUpgrade: () => void; onAdd: () => void; onRedraw: () => void; onRemove: () => void }) {
  const kind = { level: "Level reward", play: "Play reward", light: "Shop item", real: "Real-life item" }[it.source];
  const real = it.source === "real";
  return <>
    {real && it.mine?.photo ? <Art it={it} onRedraw={onRedraw} busy={busy} /> : (
      <Row gap={12}>
        <GlossyIcon name={it.icon} size={58} locked={!it.owned} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 11, color: C.muted, letterSpacing: 0.6 }}>{kind.toUpperCase()}</Text>
          {it.owned ? <Text style={{ fontSize: 17, color: "#F5A524", letterSpacing: 2 }}>{stars(it.level)} <Text style={[T.small, { letterSpacing: 0 }]}>level {it.level} of 3</Text></Text>
                    : <Text style={T.small}>{it.detail}</Text>}
        </View>
      </Row>
    )}
    <Text style={T.muted}>{it.tagline}</Text>
    {!in3d(it) && <Text style={T.tiny}>Bulbu's 3D {it.name.toLowerCase()} is still being made. It's in your inventory now and shows up on Bulbu when it's ready.</Text>}
    {it.realAt && !it.mine?.photo && <Text style={T.tiny}>Added {new Date(it.realAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</Text>}

    {it.owned && <>
      {real
        ? <Row gap={10}>
            <View style={{ flex: 1 }}><Btn kind={it.equipped ? "ghost" : "primary"} icon={it.equipped ? undefined : "check"} title={it.equipped ? "Take it back" : "Give it to Bulbu"} busy={busy} onPress={onWear} /></View>
            {it.equipped && it.hold && <View style={{ flex: 1 }}><Btn title="✨ Show it off" onPress={onShow} /></View>}
          </Row>
        : <Btn kind={it.equipped ? "ghost" : "primary"} icon={it.equipped ? undefined : "check"} title={it.equipped ? "Take it off" : `Wear ${it.name}`} busy={busy} onPress={onWear} />}
      {it.upgradeCost != null
        ? <View style={{ gap: 6, padding: 12, borderRadius: 18, backgroundColor: "#FFF8E3", borderWidth: 1.5, borderColor: "#FFE29A" }}>
            <Text style={T.b}>Level up to {stars(it.level + 1)}</Text>
            <Text style={T.small}>A higher level makes Bulbu glow brighter while it has this.</Text>
            <Btn kind="primary" title={light >= it.upgradeCost ? `Level up · ${it.upgradeCost} Light` : `Need ${it.upgradeCost - light} more Light`} disabled={light < it.upgradeCost} busy={busy} onPress={onUpgrade} />
          </View>
        : <Text style={[T.small, { textAlign: "center" }]}>Max level. This is as shiny as it gets.</Text>}
      {real && <Row gap={10}>
        {it.hold && <View style={{ flex: 1 }}><Btn kind="ghost" icon="camera" title="New photo" onPress={onAdd} /></View>}
        {it.realAt && <View style={{ flex: 1 }}><Btn kind="ghost" title="Remove" busy={busy} onPress={onRemove} /></View>}
      </Row>}
    </>}

    {!it.owned && it.source === "light" &&
      <Btn title={light >= it.need ? `Buy · ${it.need} Light` : `Need ${it.need - light} more Light`} disabled={light < it.need} busy={busy} onPress={onBuy} />}
    {!it.owned && (it.source === "level" || it.source === "play") && <View style={{ gap: 6 }}>
      <Progress value={it.progress * 100} label={`${it.name} progress`} />
      <Text style={T.small}>{it.source === "level" ? "Good choices earn XP. It unlocks by itself as your kingdom grows." : "Play today's cards and hold off Dim raids. It unlocks by itself."}</Text>
    </View>}
    {!it.owned && real && <>
      {it.hold && <Text style={T.small}>Tap Bulbu and it shows this one off in 3D, in the same colour as yours.</Text>}
      <Btn icon="camera" title={`I bought ${/^[aeiou]/i.test(it.name) ? "an" : "a"} ${it.name}`} onPress={onAdd} />
    </>}
  </>;
}

function AddReal({ open, initial, items, busy, ai, onClose, onAdd, onPhoto }: {
  open: boolean; initial: string | null; items: ItemState[]; busy: boolean; ai: boolean;
  onClose: () => void; onAdd: (id: string, price?: number) => void;
  /** returns what Bulbu saw when it isn't one of Bulbu's items, otherwise null */
  onPhoto: (p: { data: string; width: number; height: number }) => Promise<string | null>;
}) {
  const { toast } = useStore();
  const [text, setText] = useState("");
  const [pick, setPick] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [looking, setLooking] = useState<string | null>(null);
  const [seen, setSeen] = useState<string | null>(null);
  const chosen = pick ?? initial ?? (text.trim() ? matchRealItem(text)?.id ?? null : null);
  const def = items.find(i => i.id === chosen);
  const reset = () => { setText(""); setPick(null); setPrice(""); setSeen(null); setLooking(null); };
  const close = () => { reset(); onClose(); };
  const snap = async (camera: boolean) => {
    try {
      const p = await pickPhoto(camera);
      if (!p) return;
      setSeen(null); setLooking(p.uri);
      const miss = await onPhoto(p);
      if (miss != null) { setSeen(miss || "something else"); setLooking(null); }
      else reset();
    } catch (e) { setLooking(null); toast((e as Error).message); }
  };
  return (
    <Sheet open={open} onClose={close} title="You bought something real">
      {looking
        ? <View style={{ alignItems: "center", gap: 12, paddingVertical: 10 }}>
            <Image source={{ uri: looking }} style={{ width: 150, height: 150, borderRadius: 22 }} resizeMode="cover" />
            <Row gap={8}><ActivityIndicator color={C.violet} /><Text style={T.b}>Bulbu is looking at it…</Text></Row>
            <Text style={[T.small, { textAlign: "center" }]}>Muse Spark works out what it is, then it goes straight into Bulbu's inventory.</Text>
          </View>
        : <>
            <Text style={T.muted}>Snap the thing you bought (or its box, or the receipt). Bulbu works out what it is and gets one too.</Text>
            <Row gap={10}>
              <View style={{ flex: 1 }}><Btn icon="camera" title="Take a photo" disabled={!ai} onPress={() => snap(true)} /></View>
              <View style={{ flex: 1 }}><Btn kind="ghost" title="Choose a photo" disabled={!ai} onPress={() => snap(false)} /></View>
            </Row>
            {!ai && <Text style={T.tiny}>Reading photos needs Muse Spark (set META_API_KEY on the server). You can still pick it from the list.</Text>}
            {seen && <Text style={[T.small, { color: C.ink }]}>Bulbu thinks that's {/^[aeiou]/i.test(seen) ? "an" : "a"} {seen}. Bulbu doesn't have one of those yet, so pick the closest below.</Text>}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: C.line }} /><Text style={T.tiny}>or pick it yourself</Text><View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
            </View>
            <Field label="What did you buy?"><Input value={text} onChangeText={t => { setText(t); setPick(null); }} placeholder="New AirPods, running shoes, an iPad…" /></Field>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {items.map(i => <Chip key={i.id} title={`${i.owned ? "✓ " : ""}${i.name}`} on={chosen === i.id} onPress={() => setPick(i.id)} />)}
            </View>
            {text.trim() !== "" && !chosen && <Text style={T.small}>Bulbu doesn't have that one yet. Pick the closest from the list.</Text>}
            <Field label="Price (optional)"><Input value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="e.g. 2499" /></Field>
            <Btn kind="ghost" icon="plus" title={def ? (def.owned ? `${def.name} is already in the inventory` : `Add ${def.name}`) : "Pick what you bought"} disabled={!def || def.owned} busy={busy}
                 onPress={() => { if (def) { onAdd(def.id, Number(price) || undefined); reset(); } }} />
          </>}
    </Sheet>
  );
}
