import type Anthropic from "@anthropic-ai/sdk";
import { EQUIPMENT_LABEL } from "../data/equipment";
import { age, bmi, formatHeight } from "../engine/strength";
import type { ChatMessage, Equipment, Profile, Program, ProgramSpec, Units } from "../types";

export const COACH_MODEL = "claude-opus-5";

const GOALS = ["build_muscle", "lose_fat", "get_stronger", "general_fitness", "endurance", "athletic", ""] as const;
const LEVELS = ["beginner", "intermediate", "advanced", ""] as const;
const PRESET_IDS = ["full_gym", "free_weights", "home", "bodyweight", ""] as const;

/**
 * Empty string and zero mean "not established yet" so the schema stays free of
 * nullable unions, which keeps strict validation simple.
 */
const COACH_SCHEMA = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description: "What the coach says next. Conversational, British English, no markdown, at most about sixty words.",
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
      description: "Up to four short tappable replies for the user, or an empty array.",
    },
    ready_to_build: {
      type: "boolean",
      description: "True once goal, days per week, session length and experience are all known.",
    },
    spec: {
      type: "object",
      properties: {
        goal: { type: "string", enum: GOALS },
        experience: { type: "string", enum: LEVELS },
        days_per_week: { type: "integer", description: "0 when unknown, otherwise 1 to 7." },
        session_minutes: { type: "integer", description: "0 when unknown, otherwise 20 to 150." },
        weeks: { type: "integer", description: "0 when unknown, otherwise 4 to 16." },
        focus_areas: {
          type: "array",
          items: { type: "string" },
          description: "Muscle keys such as chest, lats, quads, glutes, biceps, triceps, side_delts, abs.",
        },
        avoid_joints: {
          type: "array",
          items: { type: "string" },
          description: "Any of knee, shoulder, lower_back, elbow, wrist, hip, neck, ankle.",
        },
        include_cardio: { type: "boolean" },
        equipment_preset: { type: "string", enum: PRESET_IDS },
        notes: { type: "string", description: "Anything else worth remembering about this person, or an empty string." },
      },
      required: [
        "goal",
        "experience",
        "days_per_week",
        "session_minutes",
        "weeks",
        "focus_areas",
        "avoid_joints",
        "include_cardio",
        "equipment_preset",
        "notes",
      ],
      additionalProperties: false,
    },
  },
  required: ["reply", "suggestions", "ready_to_build", "spec"],
  additionalProperties: false,
} as const;

export interface LlmCoachResult {
  reply: string;
  suggestions: string[];
  readyToBuild: boolean;
  draft: Partial<ProgramSpec>;
  equipmentPreset?: string;
}

interface CoachPayload {
  reply: string;
  suggestions: string[];
  ready_to_build: boolean;
  spec: {
    goal: string;
    experience: string;
    days_per_week: number;
    session_minutes: number;
    weeks: number;
    focus_areas: string[];
    avoid_joints: string[];
    include_cardio: boolean;
    equipment_preset: string;
    notes: string;
  };
}

function describeProfile(profile: Profile, units: Units): string {
  const parts: string[] = [];
  if (profile.displayName.trim()) parts.push(`Name: ${profile.displayName.trim()}`);
  const years = age(profile);
  if (years) parts.push(`Age: ${years}`);
  if (profile.sex !== "unspecified") parts.push(`Sex: ${profile.sex}`);
  if (profile.heightCm) parts.push(`Height: ${formatHeight(profile.heightCm, units)}`);
  if (profile.weightKg) {
    const shown = units === "kg" ? `${Math.round(profile.weightKg)}kg` : `${Math.round(profile.weightKg / 0.45359237)}lb`;
    parts.push(`Bodyweight: ${shown}`);
  }
  const index = bmi(profile);
  if (index) parts.push(`BMI: ${index}`);
  if (profile.experience) parts.push(`Training experience: ${profile.experience}`);
  if (profile.notes.trim()) parts.push(`They also said: ${profile.notes.trim()}`);
  if (!parts.length) return "";
  return `What you know about them already: ${parts.join(". ")}.`;
}

function systemPrompt(
  available: Equipment[],
  program: Program | null,
  draft: Partial<ProgramSpec>,
  profile: Profile,
  units: Units,
): string {
  const kit = available.length > 24 ? "a full commercial gym" : available.map((item) => EQUIPMENT_LABEL[item]).join(", ");
  return [
    "You are a strength and conditioning coach inside a gym app. You are talking to one person about their training.",
    "Write in British English. Be warm but direct, like a good coach on the gym floor. No markdown, no bullet points, no emoji.",
    "Ask one question at a time. Never ask for something the person has already told you.",
    "You need four things before a programme can be built: the goal, how many days a week they can train, how long a session can be, and how much lifting experience they have. Ask about injuries too, but do not block on it.",
    "Push back gently on unrealistic plans. Six days a week for someone who has not trained in a year is worth a word.",
    describeProfile(profile, units),
    "Never ask for something the profile already tells you, and use their name occasionally if you have it.",
    "You can talk about their bodyweight, height and age when it is relevant to training. Be matter of fact about it, never judgemental, and do not give medical or diet advice beyond broad, sensible training-adjacent points.",
    `The equipment they have access to: ${kit}. Do not suggest anything else.`,
    program
      ? `They already have a programme: ${program.name}. ${program.summary} If they are asking for a change, work out what should change and set ready_to_build true to rebuild it.`
      : "They do not have a programme yet.",
    Object.keys(draft).length ? `What you already know: ${JSON.stringify(draft)}.` : "",
    "Return spec fields you are confident about. Leave a field as an empty string, zero or an empty array when you do not know it yet. Never invent an answer the person has not given.",
    "Set ready_to_build true only when you have the four essentials, and in that turn say briefly what the programme will look like.",
  ]
    .filter(Boolean)
    .join("\n");
}

function toDraft(spec: CoachPayload["spec"]): Partial<ProgramSpec> {
  const draft: Partial<ProgramSpec> = {};
  if (spec.goal) draft.goal = spec.goal as ProgramSpec["goal"];
  if (spec.experience) draft.experience = spec.experience as ProgramSpec["experience"];
  if (spec.days_per_week > 0) draft.daysPerWeek = Math.max(1, Math.min(7, spec.days_per_week));
  if (spec.session_minutes > 0) draft.sessionMinutes = Math.max(20, Math.min(150, spec.session_minutes));
  if (spec.weeks > 0) draft.weeks = Math.max(2, Math.min(24, spec.weeks));
  if (spec.focus_areas.length) draft.focusAreas = spec.focus_areas as ProgramSpec["focusAreas"];
  if (spec.avoid_joints.length) draft.avoidJoints = spec.avoid_joints as ProgramSpec["avoidJoints"];
  draft.includeCardio = spec.include_cardio;
  if (spec.equipment_preset) draft.equipmentPreset = spec.equipment_preset;
  if (spec.notes) draft.notes = spec.notes;
  return draft;
}

export function hasApiKey(key: string): boolean {
  return /^sk-ant-/.test(key.trim());
}

export class CoachError extends Error {
  constructor(message: string, readonly recoverable = true) {
    super(message);
    this.name = "CoachError";
  }
}

/**
 * Talks to Claude for the free-form coaching conversation.
 * The key stays in the browser and is only ever sent to the Anthropic API.
 */
export async function askCoach(options: {
  apiKey: string;
  history: ChatMessage[];
  available: Equipment[];
  program: Program | null;
  draft: Partial<ProgramSpec>;
  profile: Profile;
  units: Units;
}): Promise<LlmCoachResult> {
  // Loaded on demand: most people never add a key, and the SDK is not small.
  const [{ default: AnthropicSdk }, { jsonSchemaOutputFormat }] = await Promise.all([
    import("@anthropic-ai/sdk"),
    import("@anthropic-ai/sdk/helpers/json-schema"),
  ]);

  const client = new AnthropicSdk({
    apiKey: options.apiKey.trim(),
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });

  const messages: Anthropic.MessageParam[] = options.history
    .filter((message) => message.content.trim().length > 0)
    .slice(-24)
    .map((message) => ({ role: message.role, content: message.content }));

  if (!messages.length || messages[0].role !== "user") {
    messages.unshift({ role: "user", content: "Hello, I would like a programme." });
  }

  try {
    const response = await client.messages.parse({
      model: COACH_MODEL,
      max_tokens: 4000,
      system: systemPrompt(options.available, options.program, options.draft, options.profile, options.units),
      messages,
      output_config: {
        format: jsonSchemaOutputFormat(COACH_SCHEMA),
        effort: "low",
      },
    });

    const parsed = response.parsed_output as CoachPayload | null;
    if (!parsed) throw new CoachError("The coach replied in a format the app could not read. Try again.");

    return {
      reply: parsed.reply,
      suggestions: parsed.suggestions.slice(0, 4),
      readyToBuild: parsed.ready_to_build,
      draft: toDraft(parsed.spec),
      equipmentPreset: parsed.spec.equipment_preset || undefined,
    };
  } catch (error) {
    if (error instanceof CoachError) throw error;
    if (error instanceof AnthropicSdk.AuthenticationError) {
      throw new CoachError("That API key was rejected. Check it in Settings.", false);
    }
    if (error instanceof AnthropicSdk.RateLimitError) {
      throw new CoachError("Rate limited by the API. Give it a moment and try again.");
    }
    if (error instanceof AnthropicSdk.APIError) {
      throw new CoachError(`The API returned an error (${error.status}). Falling back to the built-in coach.`);
    }
    throw new CoachError("Could not reach the API. Falling back to the built-in coach.");
  }
}
