import { useStore } from "./store";

/** Themes from the Profile screen. `stage` is the colour the 3D canvas paints behind Bulbu (sRGB hex). */
export const THEMES: Record<string, { label: string; stage: string; swatch: string }> = {
  sky: { label: "Sky", stage: "#E9F0FF", swatch: "radial-gradient(60% 50% at 70% 30%,#fff 0,transparent 60%),linear-gradient(160deg,#BFD3FF,#E8E2FF 60%,#FFE4F2)" },
  night: { label: "Starry", stage: "#DCE1FF", swatch: "radial-gradient(1.5px 1.5px at 20% 30%,#fff 99%,transparent),radial-gradient(1.5px 1.5px at 70% 20%,#fff 99%,transparent),radial-gradient(2px 2px at 55% 60%,#fff 99%,transparent),radial-gradient(1px 1px at 35% 75%,#fff 99%,transparent),radial-gradient(60% 40% at 50% 100%,#FF9AD5 0,transparent 70%),linear-gradient(180deg,#2B2F8F,#5A3FB8 60%,#B15FD0)" },
  sunset: { label: "Sunset", stage: "#FFEDEA", swatch: "radial-gradient(30% 25% at 50% 62%,#FFE7A8 0,transparent 70%),linear-gradient(180deg,#8E7BFF,#F59AB6 55%,#FFC9A8)" },
  aurora: { label: "Aurora", stage: "#E6F7F5", swatch: "radial-gradient(1.5px 1.5px at 25% 25%,#fff 99%,transparent),radial-gradient(1.5px 1.5px at 75% 35%,#fff 99%,transparent),linear-gradient(200deg,transparent 30%,rgba(110,255,220,.7) 45%,transparent 60%),linear-gradient(180deg,#3B49C9,#7A5BE6 55%,#B9A4FF)" },
};

export function useStage() {
  const { state } = useStore();
  return THEMES[state?.user.theme ?? "sky"]?.stage ?? THEMES.sky.stage;
}
