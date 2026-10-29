// The what-if on the kingdom: ask "What if I sleep by 12?", then turn the dial (nights a week, minutes a day…) and
// watch the construction dates move on the buildings, live. The panel stays low so the kingdom stays in view; every
// stop on the dial was worked out by the forecasting engine in one go, so turning it is instant.
import { useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View, type LayoutChangeEvent } from "react-native";
import { fmtMinutes, fmtMoney } from "@bulbu/engine";
import type { KingdomWhatIfView, Step } from "@bulbu/api";
import { Icon } from "@/components/Icon";
import { Breakdown, Row, Sheet, tap } from "@/components/ui";
import { C, F, T } from "@/theme";

const shortDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** The "What if I…" bar on the kingdom. */
export function WhatIfBar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="What if… Try a change and watch the finish dates move" onPress={() => { tap(); onPress(); }}
               style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 18,
                 backgroundColor: pressed ? "#fff" : "rgba(255,255,255,.92)", borderWidth: 1.5, borderColor: "#fff",
                 shadowColor: "#3448BE", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 })}>
      <Text style={{ fontSize: 16 }}>🔮</Text>
      <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 14, color: C.ink2 }} numberOfLines={1}>What if I…</Text>
      <Text style={{ fontFamily: F.heavy, fontSize: 12, color: C.primary }}>Simulate</Text>
    </Pressable>
  );
}

export function WhatIfPanel({ ideas, result, stop, busy, error, onAsk, onStop, onClose }: {
  ideas: string[]; result: KingdomWhatIfView | null; stop: number; busy: boolean; error: string | null;
  onAsk: (text: string) => void; onStop: (i: number) => void; onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [why, setWhy] = useState<{ title: string; steps: Step[] } | null>(null);
  const s = result?.stops[stop];
  const ask = (t: string) => { const q = t.trim(); if (q) { setText(q); onAsk(q); } };
  return (
    <View style={{ backgroundColor: "rgba(255,255,255,.97)", borderRadius: 22, padding: 12, gap: 10, borderWidth: 1.5, borderColor: "#fff",
                   shadowColor: "#3B2F8F", shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
      <Row gap={8}>
        <Text style={{ fontSize: 16 }}>🔮</Text>
        <TextInput value={text} onChangeText={setText} onSubmitEditing={() => ask(text)} returnKeyType="go" autoFocus={!result}
                   placeholder="What if I sleep by 12?" placeholderTextColor={C.muted} accessibilityLabel="What if"
                   style={[{ flex: 1, fontFamily: F.semibold, fontSize: 15, color: C.ink, paddingVertical: 6 }, Platform.OS === "web" && ({ outlineStyle: "none" } as object)]} />
        {busy ? <ActivityIndicator color={C.primary} /> : !!text.trim() && (
          <Pressable accessibilityRole="button" accessibilityLabel="Simulate" onPress={() => { tap(); ask(text); }} hitSlop={8}
                     style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: C.primary }}>
            <Text style={{ fontFamily: F.heavy, fontSize: 12.5, color: "#fff" }}>Simulate</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Close the what-if" hitSlop={10} onPress={() => { tap(); onClose(); }}
                   style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F3FB" }}>
          <Icon name="x" size={13} color={C.ink2} />
        </Pressable>
      </Row>

      {!result && !busy && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {ideas.map(t => (
            <Pressable key={t} accessibilityRole="button" onPress={() => { tap(); ask(t); }}
                       style={({ pressed }) => ({ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: pressed ? "#E2E7FF" : "#EEF1FF" })}>
              <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: C.primary }}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {!!error && !busy && <Text style={[T.small, { color: C.ink2 }]}>{error}</Text>}

      {result && s && <>
        <Text style={{ fontFamily: F.heavy, fontSize: 15, color: C.ink }}>{s.label}</Text>
        <Dial values={result.knob.values} index={stop} onChange={onStop} format={v => fmtStop(result.knob.field, v)} />
        <View style={{ gap: 4 }}>
          {s.buildings.length ? s.buildings.map(b => (
            <Pressable key={b.id} accessibilityRole="button" accessibilityLabel={`${b.name}: finishes ${b.eta ? shortDate(b.eta) : "later"}, ${b.daysSooner} days sooner. See why`}
                       onPress={() => { tap(); setWhy({ title: `${b.name}: ${s.label}`, steps: b.steps }); }}>
              <Row gap={6}>
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.ink, flex: 1 }} numberOfLines={1}>
                  {b.name} <Text style={{ fontFamily: F.semibold, color: C.ink2, textDecorationLine: "line-through" }}>{b.etaBefore ? shortDate(b.etaBefore) : ""}</Text>
                  {"  →  "}{b.eta ? shortDate(b.eta) : "—"}
                </Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: "#E3F8EE" }}>
                  <Text style={{ fontFamily: F.heavy, fontSize: 12, color: "#138A5A" }}>{b.daysSooner} {b.daysSooner === 1 ? "day" : "days"} sooner</Text>
                </View>
                <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.primary }}>Why ›</Text>
              </Row>
            </Pressable>
          )) : <Text style={T.small}>At this setting nothing moves yet.</Text>}
        </View>
      </>}

      <Sheet open={!!why} onClose={() => setWhy(null)} title={why?.title ?? ""}>
        {why && <Breakdown steps={why.steps} />}
      </Sheet>
    </View>
  );
}

function fmtStop(field: string, v: number) {
  return field === "perWeek" ? `${v}×` : field === "minutes" ? fmtMinutes(v) : field === "amount" ? fmtMoney(v) : String(v);
}

/** A stepped slider: drag along it or tap a stop. Every stop is already worked out, so the dates follow straight away. */
function Dial({ values, index, onChange, format }: { values: number[]; index: number; onChange: (i: number) => void; format: (v: number) => string }) {
  const track = useRef<ComponentRef<typeof View>>(null);
  const box = useRef({ x: 0, w: 1 });
  const last = useRef(index); last.current = index;
  const n = values.length;
  const measure = (_e?: LayoutChangeEvent) => track.current?.measureInWindow((x, _y, w) => { box.current = { x, w: Math.max(1, w) }; });
  const pick = (pageX: number) => {
    const f = Math.max(0, Math.min(1, (pageX - box.current.x) / box.current.w));
    const i = Math.round(f * (n - 1));
    if (i !== last.current) { last.current = i; tap(); onChange(i); }
  };
  const pct = n > 1 ? (index / (n - 1)) * 100 : 0;
  return (
    <View>
      <View ref={track} onLayout={measure} accessibilityRole="adjustable" accessibilityValue={{ text: format(values[index]) }}
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
            onAccessibilityAction={e => onChange(Math.max(0, Math.min(n - 1, index + (e.nativeEvent.actionName === "increment" ? 1 : -1))))}
            onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderTerminationRequest={() => false}
            onResponderGrant={e => { measure(); pick(e.nativeEvent.pageX); }} onResponderMove={e => pick(e.nativeEvent.pageX)}
            style={{ height: 30, justifyContent: "center" }}>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: "#E6E9F7" }}>
          <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: "#7C6CFF" }} />
        </View>
        {values.map((_, i) => (
          <View key={i} pointerEvents="none" style={{ position: "absolute", left: `${n > 1 ? (i / (n - 1)) * 100 : 0}%`, marginLeft: -3, width: 6, height: 6, borderRadius: 3, backgroundColor: i <= index ? "#fff" : "#C9CEE6" }} />
        ))}
        <View pointerEvents="none" style={{ position: "absolute", left: `${pct}%`, marginLeft: -13, width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff", borderWidth: 3, borderColor: "#7C6CFF",
                                             shadowColor: "#3B2F8F", shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 4 }} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
        {values.map((v, i) => (
          <Pressable key={i} onPress={() => { tap(); onChange(i); }} hitSlop={6}>
            <Text style={{ fontFamily: i === index ? F.heavy : F.semibold, fontSize: 11, color: i === index ? C.primary : C.muted }}>{format(v)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
