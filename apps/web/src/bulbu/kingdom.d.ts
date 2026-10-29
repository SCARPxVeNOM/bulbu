// Types for kingdom.js (plain JS, shared by the web and React Native apps).
export const KINGDOM_IDS: string[];
export interface KingdomBuildingView { id: string; level: number; building: boolean; glow: number; fog: number }
export interface KingdomTreasure { photo: string; mask?: string; box?: { left: number; top: number; right: number; bottom: number } }
export interface KingdomView { buildings: KingdomBuildingView[]; plots: string[]; treasure?: KingdomTreasure | null }
export function paintKingdomSky(ctx: CanvasRenderingContext2D, W: number, H: number): void;
export function createKingdom(o: { url: string }): {
  stage: unknown;
  set(s: KingdomView): void;
  /** world points above each shown building, for labels */
  anchors(): Record<string, [number, number, number]>;
  /** play an event on a building: "dim" rolls the fog in and dims it, "light" blows the fog away and flares it */
  moment(m: KingdomMomentView): void;
};
export interface KingdomMomentView { id: string; kind: "dim" | "light"; fogFrom?: number; fogTo?: number; glowFrom?: number; glowTo?: number }
