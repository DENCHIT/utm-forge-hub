import { getExercise } from "../data/exercises";
import type { Exercise, MovementPattern, Profile, Units } from "../types";

/**
 * Starting-weight estimates.
 *
 * Every number below is a one rep max expressed as a multiple of bodyweight for
 * an intermediate male lifter. Dumbbell entries are per dumbbell, not the pair.
 * These are starting points to save you a guess on session one, not targets:
 * the moment there is a logged set, real numbers take over.
 */
const BODYWEIGHT_RATIO: Record<string, number> = {
  // Squat pattern
  back_squat: 1.5,
  front_squat: 1.2,
  smith_squat: 1.5,
  goblet_squat: 0.35,
  hack_squat_machine: 1.8,
  leg_press: 2.7,

  // Hinge
  deadlift: 1.9,
  romanian_deadlift: 1.4,
  dumbbell_rdl: 0.5,
  hip_thrust: 1.9,
  machine_hip_thrust: 1.9,
  good_morning: 0.8,
  kettlebell_swing: 0.3,
  cable_pull_through: 0.5,
  single_leg_rdl: 0.25,

  // Lunge
  walking_lunge: 0.3,
  reverse_lunge: 0.3,
  bulgarian_split_squat: 0.25,
  step_up: 0.25,

  // Horizontal push
  barbell_bench_press: 1.15,
  incline_barbell_press: 0.95,
  smith_bench_press: 1.15,
  dumbbell_bench_press: 0.42,
  incline_dumbbell_press: 0.36,
  machine_chest_press: 1.1,
  cable_fly: 0.22,
  pec_deck_fly: 0.5,
  dumbbell_fly: 0.18,
  close_grip_bench: 0.95,

  // Vertical push
  overhead_press: 0.7,
  dumbbell_shoulder_press: 0.26,
  machine_shoulder_press: 0.65,
  arnold_press: 0.22,
  landmine_press: 0.3,

  // Horizontal pull
  barbell_row: 1.0,
  dumbbell_row: 0.4,
  chest_supported_row: 0.3,
  seated_cable_row: 0.95,
  machine_row: 1.0,
  landmine_row: 0.5,

  // Vertical pull
  lat_pulldown: 0.9,
  neutral_grip_pulldown: 0.9,
  straight_arm_pulldown: 0.35,

  // Legs, isolation
  leg_extension: 0.9,
  lying_leg_curl: 0.65,
  seated_leg_curl: 0.7,
  standing_calf_raise: 1.6,
  seated_calf_raise: 1.0,
  dumbbell_calf_raise: 0.35,
  hip_abduction: 0.7,

  // Arms
  barbell_curl: 0.45,
  ez_bar_curl: 0.45,
  dumbbell_curl: 0.18,
  hammer_curl: 0.2,
  incline_curl: 0.15,
  cable_curl: 0.35,
  tricep_pushdown: 0.5,
  overhead_tricep_extension: 0.25,
  skullcrusher: 0.35,

  // Shoulders and traps
  lateral_raise: 0.11,
  cable_lateral_raise: 0.11,
  band_lateral_raise: 0.11,
  rear_delt_fly: 0.12,
  front_raise: 0.12,
  upright_row: 0.4,
  shrug: 0.35,

  // Core and carries
  cable_crunch: 0.5,
  pallof_press: 0.25,
  farmers_carry: 0.5,
  suitcase_carry: 0.4,
};

/** Used when an exercise is not in the table above. */
const PATTERN_FALLBACK: Record<MovementPattern, number> = {
  horizontal_push: 0.8,
  vertical_push: 0.55,
  horizontal_pull: 0.8,
  vertical_pull: 0.8,
  squat: 1.2,
  hinge: 1.2,
  lunge: 0.3,
  carry: 0.45,
  core: 0.3,
  elbow_flexion: 0.3,
  elbow_extension: 0.35,
  shoulder_raise: 0.15,
  calf: 1.2,
  hip_isolation: 0.6,
  knee_isolation: 0.7,
  conditioning: 0,
  mobility: 0,
};

const LOWER_BODY: MovementPattern[] = ["squat", "hinge", "lunge", "calf", "knee_isolation", "hip_isolation"];

const LEVEL_FACTOR = { beginner: 0.62, intermediate: 1, advanced: 1.35 } as const;

function sexFactor(profile: Profile, pattern: MovementPattern): number {
  const lower = LOWER_BODY.includes(pattern);
  if (profile.sex === "male") return 1;
  if (profile.sex === "female") return lower ? 0.76 : 0.66;
  // Not given: sit between the two so the first set is in the right postcode.
  return lower ? 0.88 : 0.83;
}

function ageFactor(profile: Profile): number {
  if (!profile.birthYear) return 1;
  const age = new Date().getFullYear() - profile.birthYear;
  if (age < 20) return 0.9;
  if (age <= 40) return 1;
  return Math.max(0.7, 1 - (age - 40) * 0.006);
}

export const KG_PER_LB = 0.45359237;

export const toDisplayWeight = (kg: number, units: Units): number =>
  units === "kg" ? kg : kg / KG_PER_LB;

export const toKg = (value: number, units: Units): number => (units === "kg" ? value : value * KG_PER_LB);

/** Round to something you can actually load on the bar or pick off the rack. */
export function roundToIncrement(value: number, units: Units, heavy: boolean): number {
  const step = units === "kg" ? (heavy ? 2.5 : 1) : heavy ? 5 : 2.5;
  return Math.max(step, Math.round(value / step) * step);
}

export interface WeightEstimate {
  /** In the user's chosen units, ready to show. */
  weight: number | null;
  /** Bodyweight movements have no number to suggest. */
  kind: "loaded" | "bodyweight" | "weighted_bodyweight" | "unknown";
  note: string;
}

export function hasEnoughProfile(profile: Profile): boolean {
  return profile.weightKg != null && profile.weightKg > 0;
}

/**
 * A first guess at what to put on the bar, from bodyweight, experience, sex and
 * age. Deliberately conservative: it is easier to add a plate than to peel
 * yourself off the floor.
 */
export function estimateStartingWeight(
  exerciseId: string,
  profile: Profile,
  targetReps: number,
  units: Units,
): WeightEstimate {
  const exercise: Exercise | undefined = getExercise(exerciseId);
  if (!exercise) return { weight: null, kind: "unknown", note: "" };

  if (exercise.loadType === "bodyweight" || exercise.loadType === "time" || exercise.loadType === "distance") {
    return { weight: null, kind: "bodyweight", note: "" };
  }
  if (exercise.loadType === "weighted_bodyweight") {
    return {
      weight: null,
      kind: "weighted_bodyweight",
      note: "Start with bodyweight only. Add a belt once you can do all the sets clean.",
    };
  }
  if (!hasEnoughProfile(profile)) return { weight: null, kind: "unknown", note: "" };

  const level = profile.experience ?? "beginner";
  const ratio = BODYWEIGHT_RATIO[exercise.id] ?? PATTERN_FALLBACK[exercise.pattern];
  if (!ratio) return { weight: null, kind: "unknown", note: "" };

  const oneRepMaxKg = profile.weightKg! * ratio * LEVEL_FACTOR[level] * sexFactor(profile, exercise.pattern) * ageFactor(profile);

  // Epley, rearranged: what you could do for the target reps.
  const workingKg = oneRepMaxKg / (1 + targetReps / 30);

  // First session, so shade it down. You want to finish it, not survive it.
  const conservativeKg = workingKg * 0.88;

  const heavy = exercise.kind === "compound" && exercise.fatigue >= 4;
  const weight = roundToIncrement(toDisplayWeight(conservativeKg, units), units, heavy);

  const perHand = exercise.equipment.includes("dumbbell") || exercise.equipment.includes("kettlebell");
  return {
    weight,
    kind: "loaded",
    note: perHand ? "per dumbbell" : "",
  };
}

/** Body mass index, when we have both numbers. Shown as context, never as a verdict. */
export function bmi(profile: Profile): number | null {
  if (!profile.heightCm || !profile.weightKg) return null;
  const metres = profile.heightCm / 100;
  return Math.round((profile.weightKg / (metres * metres)) * 10) / 10;
}

export function age(profile: Profile): number | null {
  if (!profile.birthYear) return null;
  return new Date().getFullYear() - profile.birthYear;
}

export function formatHeight(heightCm: number | null, units: Units): string {
  if (!heightCm) return "-";
  if (units === "kg") return `${Math.round(heightCm)} cm`;
  const totalInches = heightCm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return `${feet}ft ${inches}in`;
}
