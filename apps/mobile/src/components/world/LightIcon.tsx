// Light ✨: Bulbu World's currency, a glowing four-point spark.
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";

export function LightIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <RadialGradient id="lg" cx=".5" cy=".5" r=".5"><Stop offset="0" stopColor="#FFF7C2" stopOpacity=".95" /><Stop offset="1" stopColor="#FFD45C" stopOpacity="0" /></RadialGradient>
        <RadialGradient id="lc" cx=".4" cy=".35" r=".7"><Stop offset="0" stopColor="#FFFDF0" /><Stop offset=".55" stopColor="#FFE07A" /><Stop offset="1" stopColor="#F5A524" /></RadialGradient>
      </Defs>
      <Circle cx={16} cy={16} r={15} fill="url(#lg)" />
      <Path d="M16 3c1.3 7.6 5.4 11.7 13 13-7.6 1.3-11.7 5.4-13 13-1.3-7.6-5.4-11.7-13-13 7.6-1.3 11.7-5.4 13-13Z" fill="url(#lc)" stroke="#E8A21C" strokeWidth={0.8} />
    </Svg>
  );
}
