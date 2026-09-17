import { getExercise } from "../data/exercises";
import { estimateStartingWeight } from "./strength";
import type { LoggedItem, MuscleGroup, Profile, SetLog, Units, WorkoutSession } from "../types";

export const estimate1RM = (weight: number, reps: number): number =>
  reps <= 1 ? weight : Math.round(weight * (1 + reps / 30) * 10) / 10;

/** Smallest jump you can realistically make on the bar or the rack. */
export function smallestIncrement(exerciseId: string, units: Units): number {
  const exercise = getExercise(exerciseId);
  const heavy = exercise ? exercise.kind === "compound" && exercise.fatigue >= 4 : false;
  if (units === "lb") return heavy ? 5 : 2.5;
  return heavy ? 2.5 : 1;
}

export interface PastPerformance {
  date: string;
  sessionId: string;
  sets: SetLog[];
  topSet: SetLog | null;
  bestEstimated1RM: number;
}

function workingSets(item: LoggedItem): SetLog[] {
  return item.sets.filter((set) => set.completed && !set.warmup);
}

export function historyFor(sessions: WorkoutSession[], exerciseId: string): PastPerformance[] {
  return sessions
    .filter((session) => session.status === "completed")
    .flatMap((session) =>
      session.items
        .filter((item) => item.exerciseId === exerciseId)
        .map((item) => {
          const sets = workingSets(item);
          const topSet =
            sets.reduce<SetLog | null>((best, set) => {
              if (set.weight == null || set.reps == null) return best;
              if (!best || best.weight == null || best.reps == null) return set;
              return estimate1RM(set.weight, set.reps) > estimate1RM(best.weight, best.reps) ? set : best;
            }, null) ?? null;
          return {
            date: session.completedAt?.slice(0, 10) ?? session.date,
            sessionId: session.id,
            sets,
            topSet,
            bestEstimated1RM:
              topSet && topSet.weight != null && topSet.reps != null ? estimate1RM(topSet.weight, topSet.reps) : 0,
          };
        }),
    )
    .filter((entry) => entry.sets.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface Suggestion {
  weight: number | null;
  reps: number | null;
  hint: string;
}

/**
 * Double progression: fill the rep range at a given weight, then add the
 * smallest increment and drop back to the bottom of the range.
 */
export function suggestTarget(
  item: LoggedItem,
  sessions: WorkoutSession[],
  units: Units,
  profile?: Profile,
): Suggestion {
  const history = historyFor(sessions, item.exerciseId);
  const exercise = getExercise(item.exerciseId);

  if (!history.length) {
    const estimate = profile ? estimateStartingWeight(item.exerciseId, profile, item.repMax, units) : null;
    if (estimate?.weight != null) {
      const perHand = estimate.note ? ` ${estimate.note}` : "";
      return {
        weight: estimate.weight,
        reps: item.repMax,
        hint: `Based on your bodyweight and experience, start around ${estimate.weight}${units}${perHand} for ${item.repMax}. Adjust after the first set.`,
      };
    }
    if (estimate?.kind === "weighted_bodyweight") {
      return { weight: null, reps: item.repMax, hint: estimate.note };
    }
    return {
      weight: null,
      reps: item.repMax,
      hint: "First time on this one. Pick a weight you could do two or three more reps with and note it.",
    };
  }

  const last = history[0];
  const completed = last.sets.filter((set) => set.reps != null);
  if (!completed.length || last.topSet?.weight == null) {
    return { weight: null, reps: item.repMax, hint: "Repeat last session and log the numbers this time." };
  }

  const lastWeight = last.topSet.weight;
  const hitTop = completed.every((set) => (set.reps ?? 0) >= item.repMax);
  const missedBottom = completed.some((set) => (set.reps ?? 0) < item.repMin);
  const increment = smallestIncrement(item.exerciseId, units);

  if (hitTop) {
    const next = Math.round((lastWeight + increment) * 100) / 100;
    return {
      weight: next,
      reps: item.repMin,
      hint: `You hit ${item.repMax} on every set last time. Up to ${next}${units} and aim for ${item.repMin}.`,
    };
  }
  if (missedBottom) {
    const stalls = history.slice(0, 3).filter((entry) => entry.topSet?.weight === lastWeight).length;
    if (stalls >= 3) {
      const deload = Math.round(lastWeight * 0.9 * 100) / 100;
      return {
        weight: deload,
        reps: item.repMax,
        hint: `Three sessions stuck at ${lastWeight}${units}. Back off to ${deload}${units} and build again.`,
      };
    }
    return {
      weight: lastWeight,
      reps: item.repMin,
      hint: `Stay at ${lastWeight}${units} until you clear ${item.repMin} on every set.`,
    };
  }

  const bestReps = Math.max(...completed.map((set) => set.reps ?? 0));
  return {
    weight: lastWeight,
    reps: Math.min(item.repMax, bestReps + 1),
    hint: `Same weight, one more rep than last time${exercise?.unilateral ? " on each side" : ""}.`,
  };
}

export interface VolumePoint {
  label: string;
  volume: number;
  sets: number;
}

export function volumeByWeek(sessions: WorkoutSession[]): VolumePoint[] {
  const buckets = new Map<number, { volume: number; sets: number }>();
  for (const session of sessions) {
    if (session.status !== "completed") continue;
    const bucket = buckets.get(session.weekNumber) ?? { volume: 0, sets: 0 };
    for (const item of session.items) {
      for (const set of workingSets(item)) {
        bucket.sets += 1;
        if (set.weight != null && set.reps != null) bucket.volume += set.weight * set.reps;
      }
    }
    buckets.set(session.weekNumber, bucket);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, value]) => ({ label: `W${week}`, volume: Math.round(value.volume), sets: value.sets }));
}

export function setsByMuscle(sessions: WorkoutSession[], sinceIso?: string): { muscle: MuscleGroup; sets: number }[] {
  const counts = new Map<MuscleGroup, number>();
  for (const session of sessions) {
    if (session.status !== "completed") continue;
    if (sinceIso && (session.completedAt?.slice(0, 10) ?? session.date) < sinceIso) continue;
    for (const item of session.items) {
      const exercise = getExercise(item.exerciseId);
      if (!exercise) continue;
      const count = workingSets(item).length;
      for (const muscle of exercise.primary) counts.set(muscle, (counts.get(muscle) ?? 0) + count);
      for (const muscle of exercise.secondary) counts.set(muscle, (counts.get(muscle) ?? 0) + count * 0.5);
    }
  }
  return [...counts.entries()]
    .map(([muscle, sets]) => ({ muscle, sets: Math.round(sets * 10) / 10 }))
    .sort((a, b) => b.sets - a.sets);
}

export interface PersonalBest {
  exerciseId: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  date: string;
}

export function personalBests(sessions: WorkoutSession[]): PersonalBest[] {
  const best = new Map<string, PersonalBest>();
  for (const session of sessions) {
    if (session.status !== "completed") continue;
    const date = session.completedAt?.slice(0, 10) ?? session.date;
    for (const item of session.items) {
      for (const set of workingSets(item)) {
        if (set.weight == null || set.reps == null || set.weight <= 0) continue;
        const oneRm = estimate1RM(set.weight, set.reps);
        const current = best.get(item.exerciseId);
        if (!current || oneRm > current.estimated1RM) {
          best.set(item.exerciseId, { exerciseId: item.exerciseId, weight: set.weight, reps: set.reps, estimated1RM: oneRm, date });
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => b.estimated1RM - a.estimated1RM);
}

export function sessionVolume(session: WorkoutSession): number {
  return session.items.reduce(
    (total, item) =>
      total +
      workingSets(item).reduce((sum, set) => sum + (set.weight != null && set.reps != null ? set.weight * set.reps : 0), 0),
    0,
  );
}

export function completedSetCount(session: WorkoutSession): number {
  return session.items.reduce((total, item) => total + workingSets(item).length, 0);
}
