import { EXERCISES, getExercise } from "../data/exercises";
import { isUsable, type AvailabilityContext } from "./substitution";
import type {
  Equipment,
  Exercise,
  ExperienceLevel,
  Goal,
  MovementPattern,
  MuscleGroup,
  Program,
  ProgramDay,
  ProgramItem,
  ProgramSpec,
  SplitType,
} from "../types";

/** Small deterministic PRNG so "regenerate" varies but stays reproducible. */
function rng(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100000) / 100000;
  };
}

type SlotRole = "primary" | "secondary" | "accessory" | "core" | "cardio";

interface SlotSpec {
  role: SlotRole;
  patterns: MovementPattern[];
  muscles?: MuscleGroup[];
  priority: 1 | 2 | 3;
  label: string;
}

interface DayTemplate {
  name: string;
  focus: string;
  slots: SlotSpec[];
}

const slot = (
  label: string,
  role: SlotRole,
  patterns: MovementPattern[],
  priority: 1 | 2 | 3,
  muscles?: MuscleGroup[],
): SlotSpec => ({ label, role, patterns, priority, muscles });

const TEMPLATES: Record<string, DayTemplate> = {
  full_body_a: {
    name: "Full body A",
    focus: "Squat, push, pull",
    slots: [
      slot("Squat", "primary", ["squat"], 1),
      slot("Horizontal push", "primary", ["horizontal_push"], 1),
      slot("Horizontal pull", "primary", ["horizontal_pull"], 1),
      slot("Hinge", "secondary", ["hinge"], 2),
      slot("Shoulders", "accessory", ["shoulder_raise"], 3),
      slot("Core", "core", ["core"], 3),
    ],
  },
  full_body_b: {
    name: "Full body B",
    focus: "Hinge, overhead, chin",
    slots: [
      slot("Hinge", "primary", ["hinge"], 1),
      slot("Vertical pull", "primary", ["vertical_pull"], 1),
      slot("Vertical push", "primary", ["vertical_push"], 1),
      slot("Lunge", "secondary", ["lunge"], 2),
      slot("Biceps", "accessory", ["elbow_flexion"], 3),
      slot("Core", "core", ["core"], 3),
    ],
  },
  full_body_c: {
    name: "Full body C",
    focus: "Unilateral and arms",
    slots: [
      slot("Lunge", "primary", ["lunge", "squat"], 1),
      slot("Horizontal push", "primary", ["horizontal_push"], 1),
      slot("Vertical pull", "primary", ["vertical_pull", "horizontal_pull"], 1),
      slot("Hamstrings", "secondary", ["knee_isolation", "hinge"], 2, ["hamstrings"]),
      slot("Triceps", "accessory", ["elbow_extension"], 3),
      slot("Calves", "accessory", ["calf"], 3),
      slot("Core", "core", ["core"], 3),
    ],
  },
  upper_a: {
    name: "Upper A",
    focus: "Chest and back strength",
    slots: [
      slot("Horizontal push", "primary", ["horizontal_push"], 1),
      slot("Horizontal pull", "primary", ["horizontal_pull"], 1),
      slot("Vertical push", "secondary", ["vertical_push"], 2),
      slot("Vertical pull", "secondary", ["vertical_pull"], 2),
      slot("Side delts", "accessory", ["shoulder_raise"], 3, ["side_delts"]),
      slot("Biceps", "accessory", ["elbow_flexion"], 3),
      slot("Triceps", "accessory", ["elbow_extension"], 3),
    ],
  },
  upper_b: {
    name: "Upper B",
    focus: "Shoulders and lats",
    slots: [
      slot("Vertical pull", "primary", ["vertical_pull"], 1),
      slot("Vertical push", "primary", ["vertical_push"], 1),
      slot("Horizontal pull", "secondary", ["horizontal_pull"], 2),
      slot("Horizontal push", "secondary", ["horizontal_push"], 2),
      slot("Rear delts", "accessory", ["shoulder_raise"], 3, ["rear_delts"]),
      slot("Triceps", "accessory", ["elbow_extension"], 3),
      slot("Biceps", "accessory", ["elbow_flexion"], 3),
    ],
  },
  lower_a: {
    name: "Lower A",
    focus: "Quad dominant",
    slots: [
      slot("Squat", "primary", ["squat"], 1),
      slot("Hinge", "secondary", ["hinge"], 2),
      slot("Lunge", "secondary", ["lunge"], 2),
      slot("Quads", "accessory", ["knee_isolation"], 3, ["quads"]),
      slot("Calves", "accessory", ["calf"], 3),
      slot("Core", "core", ["core"], 3),
    ],
  },
  lower_b: {
    name: "Lower B",
    focus: "Posterior chain",
    slots: [
      slot("Hinge", "primary", ["hinge"], 1),
      slot("Squat", "secondary", ["squat"], 2),
      slot("Glutes", "secondary", ["hinge", "hip_isolation"], 2, ["glutes"]),
      slot("Hamstrings", "accessory", ["knee_isolation"], 3, ["hamstrings"]),
      slot("Calves", "accessory", ["calf"], 3),
      slot("Core", "core", ["core"], 3),
    ],
  },
  push: {
    name: "Push",
    focus: "Chest, shoulders, triceps",
    slots: [
      slot("Horizontal push", "primary", ["horizontal_push"], 1),
      slot("Vertical push", "primary", ["vertical_push"], 1),
      slot("Chest", "secondary", ["horizontal_push"], 2, ["chest"]),
      slot("Side delts", "accessory", ["shoulder_raise"], 3, ["side_delts"]),
      slot("Triceps", "accessory", ["elbow_extension"], 3),
      slot("Triceps", "accessory", ["elbow_extension"], 3),
    ],
  },
  pull: {
    name: "Pull",
    focus: "Back and biceps",
    slots: [
      slot("Vertical pull", "primary", ["vertical_pull"], 1),
      slot("Horizontal pull", "primary", ["horizontal_pull"], 1),
      slot("Lats", "secondary", ["vertical_pull", "horizontal_pull"], 2, ["lats"]),
      slot("Rear delts", "accessory", ["shoulder_raise"], 3, ["rear_delts"]),
      slot("Biceps", "accessory", ["elbow_flexion"], 3),
      slot("Biceps", "accessory", ["elbow_flexion"], 3),
    ],
  },
  legs: {
    name: "Legs",
    focus: "Quads, hamstrings, glutes",
    slots: [
      slot("Squat", "primary", ["squat"], 1),
      slot("Hinge", "secondary", ["hinge"], 2),
      slot("Lunge", "secondary", ["lunge"], 2),
      slot("Quads", "accessory", ["knee_isolation"], 3, ["quads"]),
      slot("Hamstrings", "accessory", ["knee_isolation"], 3, ["hamstrings"]),
      slot("Calves", "accessory", ["calf"], 3),
    ],
  },
  conditioning: {
    name: "Conditioning",
    focus: "Engine and core",
    slots: [
      slot("Intervals", "cardio", ["conditioning"], 1),
      slot("Full body", "secondary", ["squat", "hinge", "lunge"], 2),
      slot("Push", "secondary", ["horizontal_push", "vertical_push"], 2),
      slot("Pull", "secondary", ["horizontal_pull", "vertical_pull"], 2),
      slot("Core", "core", ["core"], 3),
      slot("Core", "core", ["core"], 3),
    ],
  },
};

interface Prescription {
  sets: number;
  repMin: number;
  repMax: number;
  rest: number;
}

const GOAL_SCHEMES: Record<Goal, Record<SlotRole, Prescription>> = {
  get_stronger: {
    primary: { sets: 5, repMin: 3, repMax: 5, rest: 180 },
    secondary: { sets: 4, repMin: 5, repMax: 8, rest: 120 },
    accessory: { sets: 3, repMin: 8, repMax: 12, rest: 75 },
    core: { sets: 3, repMin: 8, repMax: 12, rest: 60 },
    cardio: { sets: 1, repMin: 1, repMax: 1, rest: 60 },
  },
  build_muscle: {
    primary: { sets: 4, repMin: 6, repMax: 10, rest: 120 },
    secondary: { sets: 4, repMin: 8, repMax: 12, rest: 90 },
    accessory: { sets: 3, repMin: 10, repMax: 15, rest: 60 },
    core: { sets: 3, repMin: 10, repMax: 15, rest: 45 },
    cardio: { sets: 1, repMin: 1, repMax: 1, rest: 60 },
  },
  lose_fat: {
    primary: { sets: 4, repMin: 8, repMax: 12, rest: 90 },
    secondary: { sets: 3, repMin: 10, repMax: 15, rest: 60 },
    accessory: { sets: 3, repMin: 12, repMax: 20, rest: 45 },
    core: { sets: 3, repMin: 12, repMax: 20, rest: 40 },
    cardio: { sets: 1, repMin: 1, repMax: 1, rest: 60 },
  },
  general_fitness: {
    primary: { sets: 3, repMin: 6, repMax: 10, rest: 120 },
    secondary: { sets: 3, repMin: 8, repMax: 12, rest: 90 },
    accessory: { sets: 3, repMin: 10, repMax: 15, rest: 60 },
    core: { sets: 3, repMin: 10, repMax: 15, rest: 45 },
    cardio: { sets: 1, repMin: 1, repMax: 1, rest: 60 },
  },
  endurance: {
    primary: { sets: 3, repMin: 12, repMax: 15, rest: 60 },
    secondary: { sets: 3, repMin: 12, repMax: 20, rest: 45 },
    accessory: { sets: 2, repMin: 15, repMax: 20, rest: 40 },
    core: { sets: 3, repMin: 15, repMax: 25, rest: 35 },
    cardio: { sets: 1, repMin: 1, repMax: 1, rest: 60 },
  },
  athletic: {
    primary: { sets: 4, repMin: 4, repMax: 6, rest: 150 },
    secondary: { sets: 3, repMin: 6, repMax: 10, rest: 105 },
    accessory: { sets: 3, repMin: 10, repMax: 12, rest: 60 },
    core: { sets: 3, repMin: 10, repMax: 15, rest: 45 },
    cardio: { sets: 1, repMin: 1, repMax: 1, rest: 60 },
  },
};

export const GOAL_LABEL: Record<Goal, string> = {
  build_muscle: "Build muscle",
  lose_fat: "Lose fat",
  get_stronger: "Get stronger",
  general_fitness: "General fitness",
  endurance: "Endurance",
  athletic: "Athletic performance",
};

export const SPLIT_LABEL: Record<SplitType, string> = {
  full_body: "Full body",
  upper_lower: "Upper / lower",
  push_pull_legs: "Push / pull / legs",
  push_pull_legs_upper_lower: "PPL + upper / lower",
  arnold: "Arnold split",
  body_part: "Body part split",
  hybrid: "Hybrid",
};

export function chooseSplit(daysPerWeek: number, goal: Goal): { split: SplitType; templates: string[] } {
  const conditioningHeavy = goal === "lose_fat" || goal === "endurance";
  switch (Math.max(1, Math.min(6, daysPerWeek))) {
    case 1:
      return { split: "full_body", templates: ["full_body_a"] };
    case 2:
      return { split: "full_body", templates: ["full_body_a", "full_body_b"] };
    case 3:
      return conditioningHeavy
        ? { split: "hybrid", templates: ["full_body_a", "conditioning", "full_body_b"] }
        : { split: "full_body", templates: ["full_body_a", "full_body_b", "full_body_c"] };
    case 4:
      return { split: "upper_lower", templates: ["upper_a", "lower_a", "upper_b", "lower_b"] };
    case 5:
      return conditioningHeavy
        ? { split: "hybrid", templates: ["upper_a", "lower_a", "conditioning", "upper_b", "lower_b"] }
        : { split: "push_pull_legs_upper_lower", templates: ["push", "pull", "legs", "upper_a", "lower_a"] };
    default:
      return { split: "push_pull_legs", templates: ["push", "pull", "legs", "push", "pull", "legs"] };
  }
}

interface PickContext extends AvailabilityContext {
  experience: ExperienceLevel;
  focusAreas: MuscleGroup[];
  usedInDay: Set<string>;
  usedInProgram: Map<string, number>;
  random: () => number;
}

function matchesSlot(exercise: Exercise, spec: SlotSpec): boolean {
  if (!spec.patterns.includes(exercise.pattern)) return false;
  if (spec.muscles?.length) {
    const hits = spec.muscles.some((muscle) => exercise.primary.includes(muscle));
    if (!hits) return false;
  }
  if (spec.role === "primary" || spec.role === "secondary") {
    return exercise.kind === "compound" || exercise.kind === "cardio" || spec.muscles !== undefined;
  }
  if (spec.role === "core") return exercise.kind === "core";
  if (spec.role === "cardio") return exercise.kind === "cardio";
  return exercise.kind === "isolation" || exercise.kind === "core";
}

function scoreCandidate(exercise: Exercise, spec: SlotSpec, ctx: PickContext): number {
  let score = 50;
  if (spec.role === "primary") {
    score += exercise.fatigue * 6;
    if (exercise.kind === "compound") score += 20;
  }
  if (spec.role === "accessory") {
    score += (5 - exercise.fatigue) * 4;
    if (exercise.kind === "isolation") score += 10;
  }
  if (!exercise.levels.includes(ctx.experience)) score -= 45;
  if (ctx.experience === "beginner" && exercise.fatigue >= 5) score -= 12;
  if (ctx.focusAreas.some((muscle) => exercise.primary.includes(muscle))) score += 18;
  const improvised = exercise.equipment.some((item) => item === "resistance_band" || item === "suspension_trainer");
  const hasRealLoad = ctx.available.includes("dumbbell") || ctx.available.includes("cable_machine") || ctx.available.includes("barbell");
  if (improvised && hasRealLoad) score -= 16;
  const usedCount = ctx.usedInProgram.get(exercise.id) ?? 0;
  score -= usedCount * 22;
  score += ctx.random() * 14;
  return score;
}

function pickForSlot(spec: SlotSpec, ctx: PickContext): Exercise | null {
  const candidates = EXERCISES.filter(
    (exercise) => !ctx.usedInDay.has(exercise.id) && matchesSlot(exercise, spec) && isUsable(exercise, ctx),
  );
  if (!candidates.length) return null;
  let best: Exercise | null = null;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const score = scoreCandidate(candidate, spec, ctx);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function adjustSets(base: Prescription, experience: ExperienceLevel, role: SlotRole): Prescription {
  const out = { ...base };
  if (experience === "beginner") {
    out.sets = Math.max(2, out.sets - 1);
    if (role === "primary") {
      out.repMin = Math.max(out.repMin, 5);
      out.repMax = Math.max(out.repMax, 8);
    }
  }
  if (experience === "advanced" && role !== "cardio") out.sets += 1;
  return out;
}

/** Seconds spent setting up and walking to the next exercise. */
const CHANGEOVER_SEC = 45;

/**
 * Rough wall-clock cost of one item. Rest only happens *between* sets, and the
 * gap after the last set is the changeover to whatever comes next.
 */
export function estimateItemSeconds(item: ProgramItem): number {
  const perRep = 3.5;
  const work = item.durationSec ?? Math.round(((item.repMin + item.repMax) / 2) * perRep);
  return item.sets * work + Math.max(0, item.sets - 1) * item.rest + CHANGEOVER_SEC;
}

export function estimateDayMinutes(items: ProgramItem[]): number {
  const seconds = items.reduce((total, item) => total + estimateItemSeconds(item), 0);
  // Supersetted work fills the other exercise's rest, so a pair costs roughly
  // a third less than doing the two straight.
  const supersetSeconds = items
    .filter((item) => item.supersetGroup)
    .reduce((total, item) => total + estimateItemSeconds(item) * 0.35, 0);
  return Math.round((seconds - supersetSeconds) / 60) + 6; // plus warm-up
}

let itemCounter = 0;
function nextId(prefix: string): string {
  itemCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${itemCounter.toString(36)}`;
}

function buildDay(templateKey: string, index: number, spec: ProgramSpec, ctx: Omit<PickContext, "usedInDay">): ProgramDay {
  const template = TEMPLATES[templateKey];
  const usedInDay = new Set<string>();
  const pickCtx: PickContext = { ...ctx, usedInDay };
  const scheme = GOAL_SCHEMES[spec.goal];
  const items: ProgramItem[] = [];

  for (const slotSpec of template.slots) {
    const exercise = pickForSlot(slotSpec, pickCtx);
    if (!exercise) continue;
    usedInDay.add(exercise.id);
    ctx.usedInProgram.set(exercise.id, (ctx.usedInProgram.get(exercise.id) ?? 0) + 1);
    const prescription = adjustSets(scheme[slotSpec.role], spec.experience, slotSpec.role);
    const isTimed = exercise.loadType === "time";
    items.push({
      id: nextId("item"),
      exerciseId: exercise.id,
      sets: isTimed && exercise.kind === "cardio" ? 1 : prescription.sets,
      repMin: prescription.repMin,
      repMax: prescription.repMax,
      rest: prescription.rest,
      priority: slotSpec.priority,
      durationSec: isTimed ? (exercise.kind === "cardio" ? 600 : 40) : undefined,
      note: slotSpec.role === "primary" ? "Main lift, take the full rest" : undefined,
    });
  }

  // A template slot can come up empty when the kit is not there. Rather than
  // hand back a two exercise session, top it up with whatever does work.
  const FALLBACK_SLOTS: SlotSpec[] = [
    slot("Push", "secondary", ["horizontal_push", "vertical_push"], 2),
    slot("Pull", "secondary", ["horizontal_pull", "vertical_pull"], 2),
    slot("Legs", "secondary", ["squat", "lunge", "hinge"], 2),
    slot("Core", "core", ["core"], 3),
    slot("Arms", "accessory", ["elbow_flexion", "elbow_extension"], 3),
    slot("Shoulders", "accessory", ["shoulder_raise"], 3),
    slot("Calves", "accessory", ["calf"], 3),
    slot("Conditioning", "cardio", ["conditioning"], 3),
  ];
  for (const fallback of FALLBACK_SLOTS) {
    if (items.length >= 4) break;
    const exercise = pickForSlot(fallback, pickCtx);
    if (!exercise) continue;
    usedInDay.add(exercise.id);
    ctx.usedInProgram.set(exercise.id, (ctx.usedInProgram.get(exercise.id) ?? 0) + 1);
    const prescription = adjustSets(scheme[fallback.role], spec.experience, fallback.role);
    const isTimed = exercise.loadType === "time";
    items.push({
      id: nextId("item"),
      exerciseId: exercise.id,
      sets: isTimed && exercise.kind === "cardio" ? 1 : prescription.sets,
      repMin: prescription.repMin,
      repMax: prescription.repMax,
      rest: prescription.rest,
      priority: fallback.priority,
      durationSec: isTimed ? (exercise.kind === "cardio" ? 480 : 40) : undefined,
    });
  }

  if (spec.includeCardio && !items.some((item) => getExercise(item.exerciseId)?.kind === "cardio")) {
    const finisher = pickForSlot(slot("Finisher", "cardio", ["conditioning"], 3), pickCtx);
    if (finisher) {
      items.push({
        id: nextId("item"),
        exerciseId: finisher.id,
        sets: 1,
        repMin: 1,
        repMax: 1,
        rest: 60,
        priority: 3,
        durationSec: spec.goal === "lose_fat" ? 720 : 480,
        note: "Finisher, keep it conversational unless it says intervals",
      });
    }
  }

  return {
    id: `day_${index}_${templateKey}`,
    name: template.name,
    focus: template.focus,
    items: fitToTime(items, spec.sessionMinutes),
  };
}

/**
 * Squeeze a day into a time budget the way a coach would: superset the small
 * stuff, tighten the rests that can be tightened, and only then start cutting.
 * Main lifts are the last thing to go.
 */
export function fitToTime(items: ProgramItem[], targetMinutes: number): ProgramItem[] {
  let working = items.map((item) => ({ ...item }));
  if (estimateDayMinutes(working) <= targetMinutes) return working;

  // 1. Pair the accessories up. Two exercises sharing one rest is free time.
  const accessories = working.filter((item) => item.priority === 3 && !item.supersetGroup);
  for (let i = 0; i + 1 < accessories.length; i += 2) {
    if (estimateDayMinutes(working) <= targetMinutes) break;
    const group = String.fromCharCode(65 + i / 2);
    accessories[i].supersetGroup = group;
    accessories[i + 1].supersetGroup = group;
  }

  // 2. Tighten rest on everything that is not a main lift.
  const restFloor: Record<number, number> = { 1: 90, 2: 60, 3: 40 };
  for (const item of working) {
    if (estimateDayMinutes(working) <= targetMinutes) break;
    if (item.priority === 1) continue;
    item.rest = Math.max(restFloor[item.priority], Math.round(item.rest * 0.7));
  }

  // 3. Drop the least valuable work, but leave a session worth turning up for.
  // A merged session can carry more than three main lifts; a normal one cannot,
  // so those are only ever cut when there is a surplus.
  const floor = targetMinutes >= 40 ? 4 : 3;
  while (estimateDayMinutes(working) > targetMinutes && working.length > floor) {
    const lowest = [...working].sort(
      (a, b) => b.priority - a.priority || estimateItemSeconds(b) - estimateItemSeconds(a),
    )[0];
    if (lowest.priority === 1 && working.filter((item) => item.priority === 1).length <= 3) break;
    working = working.filter((item) => item.id !== lowest.id);
  }

  // 4. Still over? Shave sets, lowest priority first.
  while (estimateDayMinutes(working) > targetMinutes && working.some((item) => item.sets > 2)) {
    const target = [...working].sort((a, b) => b.priority - a.priority || b.sets - a.sets)[0];
    if (target.sets <= 2) break;
    target.sets -= 1;
  }

  // 5. Last resort on a very tight cap: cut the main lifts' rest too.
  if (estimateDayMinutes(working) > targetMinutes) {
    for (const item of working) {
      if (item.priority === 1) item.rest = Math.max(90, Math.round(item.rest * 0.8));
    }
  }

  for (const item of working) item.rest = Math.round(item.rest / 5) * 5;

  return working;
}

function buildPrinciples(spec: ProgramSpec, split: SplitType): string[] {
  const principles: string[] = [];
  principles.push(
    spec.goal === "get_stronger"
      ? "Add weight before you add reps. When you hit the top of the rep range on every set, go up."
      : "Double progression: work up to the top of the rep range on every set, then add the smallest jump available.",
  );
  principles.push("Leave one or two reps in reserve on most sets. The last set of a main lift can go closer to failure.");
  if (spec.daysPerWeek >= 5) {
    principles.push("Five or more sessions a week only works if sleep and food keep up. Drop to four in a bad week rather than grinding.");
  }
  if (split === "full_body") {
    principles.push("Full body means every session matters, but missing one costs you less. That is the point of this split.");
  }
  if (spec.goal === "lose_fat") {
    principles.push("Keep the weights heavy while the calories are low. Cardio does the deficit, lifting keeps the muscle.");
  }
  principles.push("Log every set. Next week's target comes from this week's numbers.");
  return principles;
}

function buildSummary(spec: ProgramSpec, split: SplitType, days: ProgramDay[]): string {
  const avg = Math.round(days.reduce((total, day) => total + estimateDayMinutes(day.items), 0) / Math.max(1, days.length));
  return `${SPLIT_LABEL[split]} across ${spec.daysPerWeek} ${spec.daysPerWeek === 1 ? "day" : "days"} a week, around ${avg} minutes a session, built for ${GOAL_LABEL[spec.goal].toLowerCase()}.`;
}

export interface GenerateOptions {
  available: Equipment[];
  excludedExerciseIds: string[];
  seed?: number;
  name?: string;
}

export function generateProgram(spec: ProgramSpec, options: GenerateOptions): Program {
  const { split, templates } = chooseSplit(spec.daysPerWeek, spec.goal);
  const random = rng(options.seed ?? Date.now());
  const usedInProgram = new Map<string, number>();
  const baseCtx = {
    available: options.available,
    excludedExerciseIds: options.excludedExerciseIds,
    avoidJoints: spec.avoidJoints,
    experience: spec.experience,
    focusAreas: spec.focusAreas,
    usedInProgram,
    random,
  };

  const seen = new Map<string, number>();
  const days = templates.map((templateKey, index) => {
    const repeat = (seen.get(templateKey) ?? 0) + 1;
    seen.set(templateKey, repeat);
    const day = buildDay(templateKey, index, spec, baseCtx);
    const duplicated = templates.filter((key) => key === templateKey).length > 1;
    return duplicated ? { ...day, name: `${day.name} ${repeat}` } : day;
  });

  return {
    id: nextId("program"),
    name: options.name ?? `${GOAL_LABEL[spec.goal]} - ${spec.daysPerWeek} day ${SPLIT_LABEL[split].toLowerCase()}`,
    spec,
    split,
    days,
    summary: buildSummary(spec, split, days),
    principles: buildPrinciples(spec, split),
    createdAt: new Date().toISOString(),
  };
}

export const DEFAULT_SPEC: ProgramSpec = {
  goal: "build_muscle",
  experience: "beginner",
  daysPerWeek: 3,
  sessionMinutes: 60,
  weeks: 8,
  preferredDays: [1, 3, 5],
  focusAreas: [],
  avoidJoints: [],
  includeCardio: false,
  notes: "",
};
