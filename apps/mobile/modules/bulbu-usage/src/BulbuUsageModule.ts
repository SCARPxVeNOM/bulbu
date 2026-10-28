import { NativeModule, requireOptionalNativeModule } from "expo";
import type { AppUsage } from "./BulbuUsage.types";

declare class BulbuUsageModule extends NativeModule<{}> {
  hasAccess(): boolean;
  openSettings(): void;
  getUsage(startMs: number, endMs: number): Promise<AppUsage[]>;
}

/** null in Expo Go, on iOS and on web: usage access needs Bulbu's own Android build. */
export default requireOptionalNativeModule<BulbuUsageModule>("BulbuUsage");
