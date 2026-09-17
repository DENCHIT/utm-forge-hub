import { EXERCISES, getExercise } from "../data/exercises";
import type { Equipment, Exercise, JointArea, MuscleGroup } from "../types";

export interface AvailabilityContext {
  available: Equipment[];
  excludedExerciseIds: string[];
  avoidJoints?: JointArea[];
}

/** Kit that stands in for other kit: an adjustable bench flattens out. */
const IMPLIES: Partial<Record<Equipment, Equipment[]>> = {
  bench_adjustable: ["bench_flat"],
  squat_rack: ["bench_flat"],
};

export function expandEquipment(available: Equipment[]): Equipment[] {
  const set = new Set<Equipment>(available);
  for (const item of available) {
    for (const implied of IMPLIES[item] ?? []) set.add(implied);
  }
  return [...set];
}

/** Every listed piece of kit must be to hand. */
export function hasEquipment(exercise: Exercise, available: Equipment[]): boolean {
  const expanded = expandEquipment(available);
  return exercise.equipment.every((item) => expanded.includes(item));
}

export function isUsable(exercise: Exercise, ctx: AvailabilityContext): boolean {
  if (ctx.excludedExerciseIds.includes(exercise.id)) return false;
  if (!hasEquipment(exercise, ctx.available)) return false;
  if (ctx.avoidJoints?.length && exercise.contraindications?.length) {
    if (exercise.contraindications.some((joint) => ctx.avoidJoints!.includes(joint))) return false;
  }
  return true;
}

export function missingEquipment(exercise: Exercise, available: Equipment[]): Equipment[] {
  const expanded = expandEquipment(available);
  return exercise.equipment.filter((item) => !expanded.includes(item));
}

function overlap(a: MuscleGroup[], b: MuscleGroup[]): number {
  if (!a.length || !b.length) return 0;
  const shared = a.filter((muscle) => b.includes(muscle)).length;
  return shared / Math.max(a.length, b.length);
}

/**
 * How well `candidate` stands in for `original`. Higher is better, 0 means unrelated.
 * Pattern and primary muscles dominate; equipment class and fatigue are tie-breakers.
 */
export function similarity(original: Exercise, candidate: Exercise): number {
  if (original.id === candidate.id) return 0;
  let score = 0;
  if (candidate.pattern === original.pattern) score += 45;
  score += overlap(original.primary, candidate.primary) * 35;
  score += overlap(original.secondary, candidate.secondary) * 8;
  if (candidate.kind === original.kind) score += 12;
  if (candidate.loadType === original.loadType) score += 5;
  // Dropping from a loaded lift to a bodyweight one costs you progression,
  // so only take it when there is genuinely nothing better.
  if (original.loadType === "weight" && candidate.loadType === "bodyweight") score -= 22;
  score -= Math.abs(candidate.fatigue - original.fatigue) * 3;
  if (candidate.unilateral !== original.unilateral) score -= 4;
  return score;
}

export interface SubstituteOption {
  exercise: Exercise;
  score: number;
  reason: string;
}

function describeReason(original: Exercise, candidate: Exercise): string {
  if (candidate.pattern === original.pattern && overlap(original.primary, candidate.primary) > 0.5) {
    return "Same movement and same muscles";
  }
  if (candidate.pattern === original.pattern) return "Same movement pattern";
  if (overlap(original.primary, candidate.primary) > 0) return "Trains the same muscles";
  return "Closest available match";
}

/** Ranked stand-ins for an exercise, filtered to what the user can actually do. */
export function findSubstitutes(
  originalId: string,
  ctx: AvailabilityContext,
  options: { limit?: number; exclude?: string[] } = {},
): SubstituteOption[] {
  const original = getExercise(originalId);
  if (!original) return [];
  const exclude = new Set(options.exclude ?? []);
  return EXERCISES.filter((candidate) => candidate.id !== originalId && !exclude.has(candidate.id) && isUsable(candidate, ctx))
    .map((candidate) => ({
      exercise: candidate,
      score: similarity(original, candidate),
      reason: describeReason(original, candidate),
    }))
    .filter((option) => option.score > 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 8);
}

/** The single best replacement, or null when nothing sensible is available. */
export function bestSubstitute(originalId: string, ctx: AvailabilityContext, exclude: string[] = []): Exercise | null {
  const [top] = findSubstitutes(originalId, ctx, { limit: 1, exclude });
  if (top) return top.exercise;

  // Nothing scored well. Before giving up, take anything that at least trains
  // the same muscles, even if the movement is quite different.
  const original = getExercise(originalId);
  if (!original) return null;
  const banned = new Set(exclude);
  const candidates = EXERCISES.filter(
    (candidate) =>
      candidate.id !== originalId &&
      !banned.has(candidate.id) &&
      isUsable(candidate, ctx) &&
      candidate.primary.some((muscle) => original.primary.includes(muscle) || original.secondary.includes(muscle)),
  );
  if (!candidates.length) return null;
  return candidates.sort((a, b) => similarity(original, b) - similarity(original, a))[0];
}

/** Exercises in the plan that no available kit can cover. */
export function unresolvableCount(exerciseIds: string[], ctx: AvailabilityContext): number {
  return exerciseIds.filter((id) => {
    const exercise = getExercise(id);
    return !exercise || !isUsable(exercise, ctx);
  }).length;
}
