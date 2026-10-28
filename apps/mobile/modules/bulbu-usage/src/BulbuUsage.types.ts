export interface AppUsage {
  /** the app's label as the phone shows it */
  name: string;
  /** Android package name */
  package: string;
  minutes: number;
  /** epoch ms */
  lastUsedAt: number;
}
