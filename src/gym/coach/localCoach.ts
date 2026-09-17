import { DEFAULT_SPEC } from "../engine/programGenerator";
import { PRESETS } from "../data/equipment";
import type { Equipment, ExperienceLevel, Goal, JointArea, MuscleGroup, ProgramSpec } from "../types";

export interface CoachTurn {
  reply: string;
  suggestions: string[];
  draft: Partial<ProgramSpec>;
  equipment?: Equipment[];
  readyToBuild: boolean;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
};

const GOAL_PATTERNS: [RegExp, Goal][] = [
  [/\b(strength|stronger|strong|1rm|one rep max|powerlift|deadlift more|squat more)\b/i, "get_stronger"],
  [/\b(lose|fat|leaner|lean out|cut|slim|drop weight|weight loss|shred|tone up)\b/i, "lose_fat"],
  [/\b(muscle|bulk|size|mass|hypertrophy|bigger|grow|gain weight)\b/i, "build_muscle"],
  [/\b(endurance|stamina|marathon|half marathon|10k|5k|cycling|triathlon)\b/i, "endurance"],
  [/\b(athletic|sport|explosive|speed|power|football|rugby|basketball|hyrox)\b/i, "athletic"],
  [/\b(general|health|fitness|feel better|move better|habit|consistent)\b/i, "general_fitness"],
];

const MUSCLE_PATTERNS: [RegExp, MuscleGroup[]][] = [
  [/\barms?\b|\bbiceps?\b|\btriceps?\b/i, ["biceps", "triceps"]],
  [/\bchest\b|\bpecs?\b/i, ["chest"]],
  [/\bback\b|\blats?\b/i, ["lats", "upper_back"]],
  [/\bshoulders?\b|\bdelts?\b/i, ["side_delts", "rear_delts"]],
  [/\blegs?\b|\bquads?\b/i, ["quads", "hamstrings", "glutes"]],
  [/\bglutes?\b|\bbum\b|\bbutt\b/i, ["glutes"]],
  [/\babs\b|\bcore\b|\bstomach\b|\bmidsection\b/i, ["abs", "obliques"]],
  [/\bcalves?\b/i, ["calves"]],
];

const JOINT_PATTERNS: [RegExp, JointArea][] = [
  [/\bknees?\b/i, "knee"],
  [/\bshoulders?\b/i, "shoulder"],
  [/\b(lower back|back)\b/i, "lower_back"],
  [/\belbows?\b/i, "elbow"],
  [/\bwrists?\b/i, "wrist"],
  [/\bhips?\b/i, "hip"],
  [/\bneck\b/i, "neck"],
  [/\bankles?\b/i, "ankle"],
];

const INJURY_CONTEXT = /\b(injur|hurt|sore|bad|dodgy|painful|pain|problem|issue|niggle|rehab|surgery|tweak|avoid)\w*/i;

export function parseGoal(text: string): Goal | undefined {
  for (const [pattern, goal] of GOAL_PATTERNS) if (pattern.test(text)) return goal;
  return undefined;
}

export function parseDays(text: string): number | undefined {
  const digit = text.match(/\b([1-7])\s*(?:x|times|days?|sessions?|nights?)?\s*(?:a|per)?\s*week\b/i) ?? text.match(/\b([1-7])\s*(?:x|times|days?|sessions?)\b/i);
  if (digit) return Number(digit[1]);
  const word = text.match(/\b(one|two|three|four|five|six|seven)\s*(?:x|times|days?|sessions?)\b/i);
  if (word) return NUMBER_WORDS[word[1].toLowerCase()];
  if (/\bevery ?day\b|\bdaily\b/i.test(text)) return 6;
  return undefined;
}

export function parseMinutes(text: string): number | undefined {
  const explicit = text.match(/\b(\d{2,3})\s*(?:min|mins|minutes)\b/i);
  if (explicit) return Math.max(20, Math.min(150, Number(explicit[1])));
  if (/\bhalf an hour\b|\b30\b/i.test(text) && /hour|min/i.test(text)) return 30;
  const hours = text.match(/\b(an|one|1|1\.5|two|2)\s*(?:hour|hr)s?\b/i);
  if (hours) {
    const raw = hours[1].toLowerCase();
    if (raw === "two" || raw === "2") return 120;
    if (raw === "1.5") return 90;
    return 60;
  }
  if (/\bquick\b|\bshort\b|\bnot long\b|\bbusy\b/i.test(text)) return 40;
  return undefined;
}

export function parseExperience(text: string): ExperienceLevel | undefined {
  if (/\b(never|beginner|new to|first time|starting out|no experience|complete novice|just started)\b/i.test(text)) return "beginner";
  if (/\b(advanced|very experienced|ten years|competed|competitive|coach myself|powerlifter|bodybuilder)\b/i.test(text)) return "advanced";
  if (/\b(intermediate|couple of years|few years|on and off|some experience|year or two|\d+ years)\b/i.test(text)) return "intermediate";
  return undefined;
}

export function parseFocus(text: string): MuscleGroup[] {
  const focus = new Set<MuscleGroup>();
  if (!/\b(focus|priorit|bring up|lagging|work on|emphasis|mainly|especially|bias|target|want bigger|grow my|weak)\w*/i.test(text)) return [];
  for (const [pattern, muscles] of MUSCLE_PATTERNS) {
    if (pattern.test(text)) muscles.forEach((muscle) => focus.add(muscle));
  }
  return [...focus];
}

export function parseInjuries(text: string): JointArea[] {
  if (!INJURY_CONTEXT.test(text)) return [];
  const joints = new Set<JointArea>();
  for (const [pattern, joint] of JOINT_PATTERNS) if (pattern.test(text)) joints.add(joint);
  return [...joints];
}

/**
 * Only fires on phrases that are unambiguously about equipment. "Nothing to
 * report" is an answer about injuries, not a declaration that you own no kit.
 */
export function parseEquipmentPreset(text: string): string | undefined {
  if (/^a full gym$/i.test(text.trim())) return "full_gym";
  if (/^free weights only$/i.test(text.trim())) return "free_weights";
  if (/^home gym$/i.test(text.trim())) return "home";
  if (/^bodyweight only$/i.test(text.trim())) return "bodyweight";
  if (/\b(bodyweight|body weight|calisthenics|no kit|no equipment|no weights|nothing but (me|my body)|hotel room)\b/i.test(text)) {
    return "bodyweight";
  }
  if (/\b(home gym|train at home|garage gym|dumbbells only|just dumbbells|only dumbbells|spare room)\b/i.test(text)) {
    return "home";
  }
  if (/\b(free weights|no machines|barbell gym|old school gym|powerlifting gym)\b/i.test(text)) {
    return "free_weights";
  }
  if (/\b(commercial gym|full gym|proper gym|big gym|everything there|fully equipped|leisure centre)\b/i.test(text)) {
    return "full_gym";
  }
  return undefined;
}

export function equipmentForPreset(presetId: string | undefined): Equipment[] | undefined {
  if (!presetId) return undefined;
  return PRESETS.find((preset) => preset.id === presetId)?.equipment;
}

export function parseWeeks(text: string): number | undefined {
  const match = text.match(/\b(\d{1,2})\s*weeks?\b/i);
  if (!match) return undefined;
  return Math.max(2, Math.min(24, Number(match[1])));
}

export function extract(text: string): { draft: Partial<ProgramSpec>; equipment?: Equipment[] } {
  const draft: Partial<ProgramSpec> = {};
  const preset = parseEquipmentPreset(text);
  if (preset) draft.equipmentPreset = preset;
  const goal = parseGoal(text);
  if (goal) draft.goal = goal;
  const days = parseDays(text);
  if (days) draft.daysPerWeek = days;
  const minutes = parseMinutes(text);
  if (minutes) draft.sessionMinutes = minutes;
  const experience = parseExperience(text);
  if (experience) draft.experience = experience;
  const focus = parseFocus(text);
  if (focus.length) draft.focusAreas = focus;
  const injuries = parseInjuries(text);
  if (injuries.length) draft.avoidJoints = injuries;
  const weeks = parseWeeks(text);
  if (weeks) draft.weeks = weeks;
  if (/\b(cardio|conditioning|running|fitness|out of breath|stamina)\b/i.test(text)) draft.includeCardio = true;
  if (/\bno cardio\b|\bhate cardio\b|\bskip the cardio\b/i.test(text)) draft.includeCardio = false;
  return { draft, equipment: equipmentForPreset(preset) };
}

const GOAL_REPLY: Record<Goal, string> = {
  build_muscle: "Building muscle it is. That means enough volume per muscle each week, and getting stronger in the eight to twelve rep range.",
  lose_fat: "Fat loss. The lifting keeps the muscle you already have, the deficit does the rest. I will keep sessions dense and add some conditioning.",
  get_stronger: "Strength. Heavier sets, longer rests, and the main lifts get priority every session.",
  general_fitness: "General fitness. A bit of everything, nothing that leaves you wrecked for three days.",
  endurance: "Endurance. Higher reps, shorter rests, and conditioning baked in.",
  athletic: "Athletic performance. Heavy but crisp main lifts, then accessories that keep you robust.",
};

interface Question {
  key: keyof ProgramSpec | "equipment";
  ask: (draft: Partial<ProgramSpec>) => string;
  suggestions: string[];
}

const QUESTIONS: Question[] = [
  {
    key: "goal",
    ask: () => "What are you actually after? Tell me the goal in your own words and I will build around it.",
    suggestions: ["Build muscle", "Lose fat", "Get stronger", "General fitness"],
  },
  {
    key: "daysPerWeek",
    ask: () => "How many days a week can you realistically get there? Be honest, not optimistic. I would rather build three days you actually do than five you skip.",
    suggestions: ["2 days", "3 days", "4 days", "5 days"],
  },
  {
    key: "sessionMinutes",
    ask: () => "And how long have you got per session, door to door?",
    suggestions: ["30 minutes", "45 minutes", "60 minutes", "90 minutes"],
  },
  {
    key: "experience",
    ask: () => "How much lifting have you done before?",
    suggestions: ["Complete beginner", "On and off for a year or two", "Several years, consistent"],
  },
  {
    key: "equipmentPreset",
    ask: () => "What have you got to work with? You can fine tune the exact kit later in Settings.",
    suggestions: ["A full gym", "Free weights only", "Home gym", "Bodyweight only"],
  },
  {
    key: "avoidJoints",
    ask: () => "Last thing. Anything I should work around? Bad knee, dodgy shoulder, anything that flares up.",
    suggestions: ["Nothing to report", "Dodgy knees", "Bad lower back", "Sore shoulders"],
  },
];

function isAnswered(draft: Partial<ProgramSpec>, key: Question["key"]): boolean {
  if (key === "avoidJoints") return draft.avoidJoints !== undefined;
  if (key === "equipment") return true;
  return draft[key as keyof ProgramSpec] !== undefined;
}

const PRESET_REPLY: Record<string, string> = {
  full_gym: "A full gym, so nothing is off the table.",
  free_weights: "Free weights only. Good, barbells and dumbbells do most of the job anyway.",
  home: "Home setup. I will build it around dumbbells and bands.",
  bodyweight: "Bodyweight only. Progression comes from harder variations and slower tempo rather than more weight.",
};

export function buildSpecFromDraft(draft: Partial<ProgramSpec>): ProgramSpec {
  return {
    ...DEFAULT_SPEC,
    ...draft,
    focusAreas: draft.focusAreas ?? [],
    avoidJoints: draft.avoidJoints ?? [],
    preferredDays: draft.preferredDays?.length ? draft.preferredDays : DEFAULT_SPEC.preferredDays,
    includeCardio: draft.includeCardio ?? (draft.goal === "lose_fat" || draft.goal === "endurance"),
  };
}

const NEGATIVE = /\b(no|none|nope|nothing|nah|all good|fine|healthy|no issues)\b/i;

/** One conversational turn of the built-in coach. Deterministic, no network. */
export function coachRespond(userText: string, current: Partial<ProgramSpec>): CoachTurn {
  const { draft: parsed, equipment } = extract(userText);
  const draft: Partial<ProgramSpec> = { ...current, ...parsed };

  // "Nothing to report" is an answer to the injury question.
  if (current.avoidJoints === undefined && NEGATIVE.test(userText) && !parsed.avoidJoints) {
    const askedAboutInjuries = Object.keys(current).length >= 3;
    if (askedAboutInjuries) draft.avoidJoints = [];
  }
  if (parsed.avoidJoints?.length) draft.avoidJoints = parsed.avoidJoints;

  const acknowledgements: string[] = [];
  if (parsed.goal) acknowledgements.push(GOAL_REPLY[parsed.goal]);
  if (parsed.daysPerWeek) {
    acknowledgements.push(
      parsed.daysPerWeek <= 2
        ? `${parsed.daysPerWeek} days a week means full body every session, so nothing gets missed.`
        : parsed.daysPerWeek >= 5
          ? `${parsed.daysPerWeek} days is a lot. I will keep each session shorter so it is sustainable.`
          : `${parsed.daysPerWeek} days a week is the sweet spot.`,
    );
  }
  if (parsed.sessionMinutes) {
    acknowledgements.push(
      parsed.sessionMinutes <= 40
        ? "Short sessions, so I will superset the accessory work and keep the rest tight on the small stuff."
        : `Right, ${parsed.sessionMinutes} minutes a session.`,
    );
  }
  if (parsed.equipmentPreset) {
    acknowledgements.push(PRESET_REPLY[parsed.equipmentPreset] ?? "Noted on the kit.");
  }
  if (draft.avoidJoints?.length) {
    acknowledgements.push(`I will steer clear of anything that tends to aggravate the ${draft.avoidJoints.join(" and ").replace(/_/g, " ")}.`);
  }
  if (parsed.focusAreas?.length) acknowledgements.push("I will bias the accessory work towards that.");

  const nextQuestion = QUESTIONS.find((question) => !isAnswered(draft, question.key));

  if (!nextQuestion) {
    return {
      reply: [
        ...acknowledgements,
        "That is everything I need. Here is what I am thinking, have a look and tell me if you want it changed.",
      ].join(" "),
      suggestions: [],
      draft,
      equipment,
      readyToBuild: true,
    };
  }

  return {
    reply: [...acknowledgements, nextQuestion.ask(draft)].filter(Boolean).join(" "),
    suggestions: nextQuestion.suggestions,
    draft,
    equipment,
    readyToBuild: false,
  };
}

export const OPENING_MESSAGE =
  "I am your coach. Tell me what you want out of the gym and anything I should know, and I will write you a programme you can actually follow. What is the goal?";

export const OPENING_SUGGESTIONS = ["Build muscle", "Lose fat", "Get stronger", "Just get fitter"];
