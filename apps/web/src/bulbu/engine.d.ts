// Types for the plain-JS engine shared with bulbu-web.
export const EMOTE_ORDER: string[];
export function createBulbu(opts: {
  container: HTMLElement;
  glbBytes: Uint8Array;
  emotes: unknown;
  reduceMotion?: boolean;
  onReady?: (api: any, err?: Error) => void;
  onEmote?: (name: string) => void;
  onAnim?: (name: string) => void;
  onPoke?: () => void;
  /** a world for Bulbu (backdrop, props, fixed camera); can also be switched later with api.setStage */
  stage?: unknown;
}): void;
