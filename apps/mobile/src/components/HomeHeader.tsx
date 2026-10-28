// Home header: the glossy gel BULBU wordmark and a greeting on the left, the nudges bell and avatar on the right.
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import { C, F, shadow } from "@/theme";
import { Icon } from "./Icon";
import { tap } from "./ui";

export function HomeHeader({ name, greeting, nudges }: { name: string; greeting: string; nudges: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ gap: 2 }}>
        <GelWordmark width={190} />
        <Text style={{ fontFamily: F.semibold, fontSize: 16, color: "#5a6391", marginLeft: 6 }}>{greeting}, {name} 👋</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <Pressable accessibilityRole="button" accessibilityLabel={nudges ? `Nudges, ${nudges} new` : "Nudges"} onPress={() => { tap(); router.push("/nudges"); }}
                   style={[{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,.8)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.95)" }, shadow]}>
          <Icon name="bell" size={22} />
          {nudges > 0 && <View style={{ position: "absolute", top: 10, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: C.red, borderWidth: 1.5, borderColor: "#fff" }} />}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => { tap(); router.navigate("/profile"); }}
                   style={[{ width: 46, height: 46, borderRadius: 23, overflow: "hidden", borderWidth: 2.5, borderColor: "#fff" }, shadow]}>
          <CartoonAvatar size={41} />
        </Pressable>
      </View>
    </View>
  );
}

/** "BULBU" as glossy gel: cyan → electric blue → violet, top gloss, white rim, and an orbit swoosh with two glossy spheres. */
export function GelWordmark({ width = 200 }: { width?: number }) {
  return (
    <Svg width={width} height={width * 72 / 236} viewBox="0 0 236 72" accessibilityLabel="Bulbu">
      <Defs>
        <LinearGradient id="gwFill" x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor="#14C3FF" /><Stop offset=".3" stopColor="#2A8CFF" /><Stop offset=".56" stopColor="#3550FF" /><Stop offset=".8" stopColor="#5E3DFF" /><Stop offset="1" stopColor="#7B45FF" />
        </LinearGradient>
        <LinearGradient id="gwGloss" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#fff" stopOpacity=".62" /><Stop offset=".3" stopColor="#fff" stopOpacity=".14" /><Stop offset=".4" stopColor="#fff" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="gwOrbit" x1="0" x2="1"><Stop offset="0" stopColor="#43D9FF" stopOpacity="0" /><Stop offset=".25" stopColor="#43D9FF" stopOpacity=".85" /><Stop offset=".75" stopColor="#8059FF" stopOpacity=".85" /><Stop offset="1" stopColor="#8059FF" stopOpacity="0" /></LinearGradient>
        <RadialGradient id="gwBlue" cx=".35" cy=".3" r=".7"><Stop offset="0" stopColor="#fff" /><Stop offset=".35" stopColor="#7FE6FF" /><Stop offset="1" stopColor="#2F7BFF" /></RadialGradient>
        <RadialGradient id="gwViolet" cx=".35" cy=".3" r=".7"><Stop offset="0" stopColor="#fff" /><Stop offset=".35" stopColor="#B9A4FF" /><Stop offset="1" stopColor="#6A45F0" /></RadialGradient>
      </Defs>
      <Path d="M6 44 A112 13 -5 0 1 226 26" fill="none" stroke="url(#gwOrbit)" strokeWidth={1.6} opacity={0.55} />
      <G>
        <SvgText x={12} y={59} fontFamily={F.wordmark} fontSize={56} fill="#5A4BFF" opacity={0.18}>BULBU</SvgText>
        <SvgText x={12} y={56} fontFamily={F.wordmark} fontSize={56} fill="url(#gwFill)">BULBU</SvgText>
        <SvgText x={12} y={56} fontFamily={F.wordmark} fontSize={56} fill="url(#gwGloss)">BULBU</SvgText>
        <SvgText x={12} y={56} fontFamily={F.wordmark} fontSize={56} fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={0.9}>BULBU</SvgText>
      </G>
      <Path d="M6 44 A112 13 -5 0 0 226 26" fill="none" stroke="url(#gwOrbit)" strokeWidth={2} strokeLinecap="round" />
      <Circle cx={222} cy={40} r={4.4} fill="url(#gwBlue)" />
      <Circle cx={4} cy={30} r={2.8} fill="url(#gwViolet)" />
      <Path d="M214 4c.9 4.6 2.6 6.3 7.2 7.2-4.6.9-6.3 2.6-7.2 7.2-.9-4.6-2.6-6.3-7.2-7.2 4.6-.9 6.3-2.6 7.2-7.2Z" fill="#8059FF" opacity={0.85} />
    </Svg>
  );
}

/** An original cartoon portrait: dark hair, friendly face, navy hoodie, on warm peach. */
export function CartoonAvatar({ size = 44 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 64 64" width={size} height={size}>
      <Defs>
        <RadialGradient id="avbg" cx=".45" cy=".35" r=".75"><Stop offset="0" stopColor="#FFDCC2" /><Stop offset="1" stopColor="#FFB98C" /></RadialGradient>
        <RadialGradient id="avskin" cx=".42" cy=".38" r=".7"><Stop offset="0" stopColor="#FFE1C9" /><Stop offset="1" stopColor="#F0B892" /></RadialGradient>
        <LinearGradient id="avhood" x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor="#2E3D6E" /><Stop offset="1" stopColor="#18213F" /></LinearGradient>
        <LinearGradient id="avhair" x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor="#4A352A" /><Stop offset="1" stopColor="#2B1E18" /></LinearGradient>
      </Defs>
      <Circle cx="32" cy="32" r="32" fill="url(#avbg)" />
      <Path d="M9 64C10.5 52 19 45.5 32 45.5S53.5 52 55 64Z" fill="url(#avhood)" />
      <Path d="M22 47.5C25 52 28.5 53.5 32 53.5S39 52 42 47.5C39.5 46.4 36 45.8 32 45.8S24.5 46.4 22 47.5Z" fill="#3A4C86" />
      <Path d="M29 52v5M35 52v5" stroke="#E8EDFF" strokeWidth="1.1" strokeLinecap="round" />
      <Rect x="28" y="38" width="8" height="9.5" rx="3.5" fill="#E9AE88" />
      <Circle cx="20.2" cy="30" r="3.2" fill="#F2BE9A" /><Circle cx="43.8" cy="30" r="3.2" fill="#F2BE9A" />
      <Ellipse cx="32" cy="28.5" rx="12.2" ry="13.2" fill="url(#avskin)" />
      <Path d="M19.4 27.5C18.4 16.5 24.6 11 32.6 11C41.2 11 46.6 16.6 44.8 27.2C43.6 22.6 41.4 20 38.6 18.8C37 21.6 32.4 23.4 27.4 22.2C25.6 23.8 22.4 25.2 19.4 27.5Z" fill="url(#avhair)" />
      <Path d="M27 14.6C30.6 12.8 36 13 39.4 15.4" stroke="#6B4E3D" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity=".7" />
      <Path d="M24.6 25.6l3.8-.7M35.6 24.9l3.8.7" stroke="#3A2A22" strokeWidth="1.3" strokeLinecap="round" />
      <Ellipse cx="27" cy="30.2" rx="1.9" ry="2.3" fill="#2A1E1A" /><Ellipse cx="37" cy="30.2" rx="1.9" ry="2.3" fill="#2A1E1A" />
      <Circle cx="27.6" cy="29.4" r=".7" fill="#fff" /><Circle cx="37.6" cy="29.4" r=".7" fill="#fff" />
      <Ellipse cx="24" cy="34.2" rx="2.2" ry="1.3" fill="#FF9A9A" opacity=".35" /><Ellipse cx="40" cy="34.2" rx="2.2" ry="1.3" fill="#FF9A9A" opacity=".35" />
      <Path d="M28.8 35.4Q32 37.8 35.2 35.4" stroke="#B5615A" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </Svg>
  );
}
