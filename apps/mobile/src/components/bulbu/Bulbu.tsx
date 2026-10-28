// Native wrapper for the 3D Bulbu. Off-screen it stops rendering (battery), and screens other than Home only mount it
// while they're focused, so the phone never holds more than a couple of WebGL contexts.
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useIsFocused } from "expo-router";
import BulbuDom, { type BulbuView } from "./BulbuDom";
import { tap } from "../ui";

export interface BulbuProps {
  emote?: string;
  animation?: string;
  cue?: number;
  glow?: number;
  outfit?: string | null;
  gear?: string | null;
  gearColor?: string;
  show?: number;
  line?: string | null;
  background?: string;
  view?: BulbuView;
  world?: boolean;
  /** keep the WebView alive while the screen is in the background (Home) */
  keepAlive?: boolean;
  interactive?: boolean;
  onPoke?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Bulbu({ keepAlive = false, onPoke, style, cue, ...p }: BulbuProps) {
  const focused = useIsFocused();
  const mounted = focused || keepAlive;
  return (
    <View style={[{ overflow: "hidden" }, style]} pointerEvents="box-none">
      {mounted && (
        <BulbuDom {...p} cue={cue} paused={!focused}
                  onPoke={async () => { tap(); onPoke?.(); }}
                  dom={{ scrollEnabled: false, bounces: false, overScrollMode: "never", style: { flex: 1, backgroundColor: "transparent" }, containerStyle: { flex: 1 } } as never} />
      )}
    </View>
  );
}
