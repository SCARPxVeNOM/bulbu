// Native wrapper for the 3D Bulbu. Off-screen it stops rendering (battery), and screens other than Home only mount it
// while they're focused, so the phone never holds more than a couple of WebGL contexts.
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useIsFocused } from "expo-router";
import BulbuDom, { type BulbuView, type KingdomLabel } from "./BulbuDom";
import type { KingdomView } from "../../../../web/src/bulbu/kingdom.js";
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
  /** Bulbu's Kingdom round Bulbu (Home), with a tappable label over each building */
  kingdom?: KingdomView;
  labels?: KingdomLabel[];
  onBuilding?: (id: string) => void;
  /** keep the WebView alive while the screen is in the background (Home) */
  keepAlive?: boolean;
  interactive?: boolean;
  onPoke?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Bulbu({ keepAlive = false, onPoke, onBuilding, style, cue, ...p }: BulbuProps) {
  const focused = useIsFocused();
  const mounted = focused || keepAlive;
  return (
    <View style={[{ overflow: "hidden" }, style]} pointerEvents="box-none">
      {mounted && (
        <BulbuDom {...p} cue={cue} paused={!focused}
                  onPoke={async () => { tap(); onPoke?.(); }}
                  onBuilding={async (id: string) => { tap(); onBuilding?.(id); }}
                  dom={{ scrollEnabled: false, bounces: false, overScrollMode: "never", style: { flex: 1, backgroundColor: "transparent" }, containerStyle: { flex: 1 } } as never} />
      )}
    </View>
  );
}
