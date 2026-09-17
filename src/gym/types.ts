/** Core domain types for the gym app. */

export type Equipment =
  | "bodyweight"
  | "barbell"
  | "ez_bar"
  | "dumbbell"
  | "kettlebell"
  | "plate"
  | "squat_rack"
  | "bench_flat"
  | "bench_adjustable"
  | "smith_machine"
  | "cable_machine"
  | "lat_pulldown"
  | "seated_row_machine"
  | "chest_press_machine"
  | "shoulder_press_machine"
  | "pec_deck"
  | "leg_press"
  | "hack_squat"
  | "leg_curl_machine"
  | "leg_extension_machine"
  | "calf_raise_machine"
  | "glute_machine"
  | "pullup_bar"
  | "dip_station"
  | "landmine"
  | "resistance_band"
  | "suspension_trainer"
  | "medicine_ball"
  | "ab_wheel"
  | "plyo_box"
  | "sled"
  | "battle_ropes"
  | "jump_rope"
  | "treadmill"
  | "stationary_bike"
  | "rower"
  | "ski_erg"
  | "stair_machine"
  | "elliptical"
  | "mat";

export type MuscleGroup =
  | "chest"
  | "upper_back"
  | "lats"
  | "traps"
  | "front_delts"
  | "side_delts"
  | "rear_delts"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs"
  | "obliques"
  | "lower_back"
  | "hip_flexors"
  | "adductors"
  | "abductors"
  | "full_body"
  | "cardio";

export type MovementPattern =
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "squat"
  | "hinge"
  | "lunge"
  | "carry"
  | "core"
  | "elbow_flexion"
  | "elbow_extension"
  | "shoulder_raise"
  | "calf"
  | "hip_isolation"
  | "knee_isolation"
  | "conditioning"
  | "mobility";

export type ExerciseKind = "compound" | "isolation" | "core" | "cardio" | "mobility";

export type LoadType = "weight" | "bodyweight" | "weighted_bodyweight" | "time" | "distance";

export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  pattern: MovementPattern;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  /** All of these are needed to perform the movement. */
  equipment: Equipment[];
  loadType: LoadType;
  unilateral: boolean;
  /** Relative systemic cost, 1 (easy) to 5 (very taxing). Used when combining sessions. */
  fatigue: number;
  /** Difficulty gate: which experience levels this suits. */
  levels: ExperienceLevel[];
  cues: string[];
  /** Movements that hurt if this one does; used for injury filtering. */
  contraindications?: JointArea[];
}

export type JointArea = "lower_back" | "knee" | "shoulder" | "elbow" | "wrist" | "hip" | "neck" | "ankle";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type Goal =
  | "build_muscle"
  | "lose_fat"
  | "get_stronger"
  | "general_fitness"
  | "endurance"
  | "athletic";

export type SplitType =
  | "full_body"
  | "upper_lower"
  | "push_pull_legs"
  | "push_pull_legs_upper_lower"
  | "arnold"
  | "body_part"
  | "hybrid";

/** Everything the coach needs to build a programme. */
export interface ProgramSpec {
  goal: Goal;
  experience: ExperienceLevel;
  daysPerWeek: number;
  sessionMinutes: number;
  weeks: number;
  /** Preferred weekday indices, 0 = Sunday. Empty means flexible. */
  preferredDays: number[];
  focusAreas: MuscleGroup[];
  avoidJoints: JointArea[];
  includeCardio: boolean;
  /** Which equipment preset the user picked, when they told us. */
  equipmentPreset?: string;
  notes: string;
}

export interface ProgramItem {
  id: string;
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  /** Seconds. */
  rest: number;
  rpe?: number;
  /** 1 = the session's main lift, 3 = first thing to cut when short on time. */
  priority: 1 | 2 | 3;
  /** Items sharing a group letter are performed back to back. */
  supersetGroup?: string;
  /** For time-based work such as planks or cardio. */
  durationSec?: number;
  note?: string;
}

export interface ProgramDay {
  id: string;
  name: string;
  focus: string;
  items: ProgramItem[];
  /** Set when this day was produced by merging two or more planned days. */
  mergedFrom?: string[];
}

export interface Program {
  id: string;
  name: string;
  spec: ProgramSpec;
  split: SplitType;
  /** The repeating template. One entry per training day in a week. */
  days: ProgramDay[];
  summary: string;
  createdAt: string;
  /** Coaching notes shown on the plan screen. */
  principles: string[];
}

export interface SetLog {
  id: string;
  weight: number | null;
  reps: number | null;
  durationSec?: number | null;
  rpe?: number | null;
  completed: boolean;
  /** Warm-up sets do not count towards working volume. */
  warmup?: boolean;
  completedAt?: string;
}

export interface LoggedItem {
  itemId: string;
  exerciseId: string;
  targetSets: number;
  repMin: number;
  repMax: number;
  rest: number;
  supersetGroup?: string;
  durationSec?: number;
  note?: string;
  priority: 1 | 2 | 3;
  sets: SetLog[];
  skipped?: boolean;
  /** Set when the user swapped away from the programmed exercise. */
  swappedFrom?: string;
}

export type SessionStatus = "scheduled" | "in_progress" | "completed" | "skipped";

export interface WorkoutSession {
  id: string;
  programId: string;
  dayId: string;
  name: string;
  focus: string;
  /** ISO date (yyyy-mm-dd) this session is planned for. */
  date: string;
  weekNumber: number;
  status: SessionStatus;
  items: LoggedItem[];
  startedAt?: string;
  completedAt?: string;
  durationSec?: number;
  notes?: string;
  /** Present when built by combining missed sessions. */
  mergedFrom?: string[];
  /** Cap applied when the session was condensed, in minutes. */
  timeCapMinutes?: number;
}

export type Units = "kg" | "lb";

export type ThemePreference = "system" | "light" | "dark";

export interface Settings {
  units: Units;
  theme: ThemePreference;
  /** Equipment the user can actually reach. */
  availableEquipment: Equipment[];
  /** Exercises banned outright, by id. */
  excludedExerciseIds: string[];
  restTimerAutoStart: boolean;
  restTimerSound: boolean;
  restTimerVibrate: boolean;
  /** Seconds of warning before the rest timer ends. */
  restWarningSec: number;
  keepScreenAwake: boolean;
  /** Stored locally only, never sent anywhere but the Anthropic API. */
  anthropicApiKey: string;
  weekStartsOn: 0 | 1;
}

export type Sex = "male" | "female" | "unspecified";

export interface Profile {
  displayName: string;
  sex: Sex;
  birthYear: number | null;
  heightCm: number | null;
  weightKg: number | null;
  experience: ExperienceLevel | null;
  /** Anything else the coach should keep in mind. */
  notes: string;
  updatedAt: string;
}

export interface BodyMetric {
  id: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  note?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  /** Quick-reply chips offered with an assistant message. */
  suggestions?: string[];
  /** Set on the message that produced a programme. */
  programId?: string;
}

export interface GymState {
  version: number;
  /** Stamped on every change; used to work out which device is ahead. */
  updatedAt: string;
  settings: Settings;
  profile: Profile;
  program: Program | null;
  /** Older programmes, newest first. */
  archivedPrograms: Program[];
  sessions: WorkoutSession[];
  chat: ChatMessage[];
  /** Coach slot-filling progress for the built-in coach. */
  coachDraft: Partial<ProgramSpec>;
  metrics: BodyMetric[];
  onboarded: boolean;
}
