// Shared data model. The activity list is the ledger: every number Bulbu shows is computed from it.

export type GoalKind = "skill" | "savings" | "habit";

/** Goal templates from the Select Goals screen. The template decides which activities move the goal. */
export type GoalTemplate =
  | "dsa" | "fitness" | "learning" | "savings" | "iphone" | "reading" | "productivity" | "custom";

export type Category =
  | "study" | "code" | "read" | "workout" | "sleep" | "eat" | "social_media" | "spend" | "save" | "focus" | "other";

export type Source = "quick" | "text" | "voice" | "photo" | "screenshot" | "device" | "focus" | "seed";

export interface Goal {
  id: string;
  title: string;
  template: GoalTemplate;
  kind: GoalKind;
  /** "problems", "₹", "workouts", "pages" */
  unit: string;
  target: number;
  /** progress made before Bulbu started tracking (e.g. problems already solved) */
  baseline: number;
  /** the goal that absorbs the opportunity cost of distractions */
  primary?: boolean;
  createdAt: string;
  /** user-tuned pace, overrides the template default until history exists */
  paceHint?: Partial<Pace>;
}

export interface Activity {
  id: string;
  /** ISO timestamp of when it happened */
  at: string;
  category: Category;
  label: string;
  minutes?: number;
  /** money spent (spend/eat) or put aside (save), in the goal currency */
  amount?: number;
  /** what the cheaper alternative would have cost (cooking instead of delivery) */
  alternativeCost?: number;
  /** goal units directly produced: problems solved, pages read, workouts */
  units?: number;
  /** the goal the units belong to; when absent the engine routes by category */
  goalId?: string;
  /** app name for screen time ("Instagram"); usage data is per app, not per feature */
  app?: string;
  source: Source;
}

export interface Pace {
  /** goal units progressed per day, rolling average */
  perDay: number;
  /** skill goals: units per hour of productive time */
  perHour: number;
  /** habit goals: minutes that count as one session */
  sessionMinutes: number;
  /** how many days of history the averages come from (0 = template default) */
  basedOnDays: number;
}

export interface Step { label: string; value: string }

export interface Forecast {
  goalId: string;
  progress: number;
  remaining: number;
  percent: number;
  pace: Pace;
  daysLeft: number;
  /** ISO date (yyyy-mm-dd), null when there is no forward pace */
  eta: string | null;
  done: boolean;
}

export interface Impact {
  goalId: string;
  goalTitle: string;
  activityId: string;
  /** signed: positive = goal arrives later, negative = sooner */
  days: number;
  /** signed goal units: positive = progress made, negative = progress missed */
  units: number;
  /** plain-language equivalent: "about 1 DSA problem you could have solved" */
  equivalent: string;
  /** tap-to-see-why: pace, the time or money involved, and the calculation */
  breakdown: Step[];
}

export interface Swap {
  goalId: string;
  title: string;
  detail: string;
  /** days closer if the user does it (positive) */
  daysCloser: number;
  activity: Omit<Activity, "id" | "at" | "source">;
}
