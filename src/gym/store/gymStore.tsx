import * as React from "react";
import { getExercise } from "../data/exercises";
import { FULL_GYM } from "../data/equipment";
import { DEFAULT_SPEC, generateProgram } from "../engine/programGenerator";
import {
  analyseSchedule,
  buildSchedule,
  combineSessions,
  condenseSession,
  shiftSessions,
  today,
  uid,
} from "../engine/schedule";
import { bestSubstitute, isUsable, type AvailabilityContext } from "../engine/substitution";
import type {
  BodyMetric,
  ChatMessage,
  Equipment,
  GymState,
  LoggedItem,
  Program,
  ProgramSpec,
  SetLog,
  Settings,
  WorkoutSession,
} from "../types";

const STORAGE_KEY = "gym.state.v1";
const STATE_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  units: "kg",
  theme: "system",
  availableEquipment: FULL_GYM,
  excludedExerciseIds: [],
  restTimerAutoStart: true,
  restTimerSound: true,
  restTimerVibrate: true,
  restWarningSec: 10,
  keepScreenAwake: true,
  anthropicApiKey: "",
  weekStartsOn: 1,
};

const EMPTY_STATE: GymState = {
  version: STATE_VERSION,
  settings: DEFAULT_SETTINGS,
  program: null,
  archivedPrograms: [],
  sessions: [],
  chat: [],
  coachDraft: {},
  metrics: [],
  onboarded: false,
};

function loadState(): GymState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as GymState;
    return {
      ...EMPTY_STATE,
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return EMPTY_STATE;
  }
}

export interface GymContextValue {
  state: GymState;
  availability: AvailabilityContext;
  status: ReturnType<typeof analyseSchedule>;
  updateSettings: (patch: Partial<Settings>) => void;
  installProgram: (program: Program, startDate?: string) => void;
  regenerateProgram: (spec?: Partial<ProgramSpec>) => Program | null;
  updateSpec: (patch: Partial<ProgramSpec>) => void;
  startSession: (sessionId: string) => void;
  updateSet: (sessionId: string, itemId: string, setId: string, patch: Partial<SetLog>) => void;
  addSet: (sessionId: string, itemId: string) => void;
  removeSet: (sessionId: string, itemId: string, setId: string) => void;
  skipItem: (sessionId: string, itemId: string, skipped: boolean) => void;
  swapExercise: (sessionId: string, itemId: string, newExerciseId: string) => void;
  swapProgramExercise: (dayId: string, itemId: string, newExerciseId: string) => void;
  completeSession: (sessionId: string, notes?: string) => void;
  skipSession: (sessionId: string) => void;
  excludeEquipment: (equipment: Equipment) => void;
  restoreEquipment: (equipment: Equipment) => void;
  setAvailableEquipment: (equipment: Equipment[]) => void;
  banExercise: (exerciseId: string) => void;
  unbanExercise: (exerciseId: string) => void;
  combineOverdue: (sessionIds: string[], capMinutes: number, dateIso?: string) => string | null;
  condense: (sessionId: string, capMinutes: number) => void;
  shiftPlan: (days: number) => void;
  changeDaysPerWeek: (days: number, preferredDays?: number[]) => void;
  addChatMessage: (message: Omit<ChatMessage, "id" | "createdAt"> & Partial<Pick<ChatMessage, "id" | "createdAt">>) => ChatMessage;
  setCoachDraft: (draft: Partial<ProgramSpec>) => void;
  clearChat: () => void;
  addMetric: (metric: Omit<BodyMetric, "id">) => void;
  removeMetric: (id: string) => void;
  resetAll: () => void;
  getSession: (sessionId: string) => WorkoutSession | undefined;
}

const GymContext = React.createContext<GymContextValue | null>(null);

/** Swap any exercise the user can no longer do for the closest thing they can. */
function reconcileSession(session: WorkoutSession, ctx: AvailabilityContext): WorkoutSession {
  let changed = false;
  const used = new Set(session.items.map((item) => item.exerciseId));
  const items = session.items.map((item) => {
    const exercise = getExercise(item.exerciseId);
    if (exercise && isUsable(exercise, ctx)) return item;
    const replacement = bestSubstitute(item.exerciseId, ctx, [...used]);
    if (!replacement) return { ...item, skipped: true };
    changed = true;
    used.delete(item.exerciseId);
    used.add(replacement.id);
    return { ...item, exerciseId: replacement.id, swappedFrom: item.swappedFrom ?? item.exerciseId };
  });
  return changed ? { ...session, items } : session;
}

function reconcileProgram(program: Program, ctx: AvailabilityContext): Program {
  let changed = false;
  const days = program.days.map((day) => {
    const used = new Set(day.items.map((item) => item.exerciseId));
    const items = day.items.map((item) => {
      const exercise = getExercise(item.exerciseId);
      if (exercise && isUsable(exercise, ctx)) return item;
      const replacement = bestSubstitute(item.exerciseId, ctx, [...used]);
      if (!replacement) return item;
      changed = true;
      used.delete(item.exerciseId);
      used.add(replacement.id);
      return { ...item, exerciseId: replacement.id };
    });
    return { ...day, items };
  });
  return changed ? { ...program, days } : program;
}

export function GymProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<GymState>(loadState);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked; the app still works for this session.
    }
  }, [state]);

  const availability = React.useMemo<AvailabilityContext>(
    () => ({
      available: state.settings.availableEquipment,
      excludedExerciseIds: state.settings.excludedExerciseIds,
      avoidJoints: state.program?.spec.avoidJoints ?? [],
    }),
    [state.settings.availableEquipment, state.settings.excludedExerciseIds, state.program?.spec.avoidJoints],
  );

  const status = React.useMemo(() => analyseSchedule(state.sessions), [state.sessions]);

  const patchSession = React.useCallback((sessionId: string, updater: (session: WorkoutSession) => WorkoutSession) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => (session.id === sessionId ? updater(session) : session)),
    }));
  }, []);

  const patchItem = React.useCallback(
    (sessionId: string, itemId: string, updater: (item: LoggedItem) => LoggedItem) => {
      patchSession(sessionId, (session) => ({
        ...session,
        items: session.items.map((item) => (item.itemId === itemId ? updater(item) : item)),
      }));
    },
    [patchSession],
  );

  const value = React.useMemo<GymContextValue>(() => {
    const applyAvailability = (next: GymState): GymState => {
      const ctx: AvailabilityContext = {
        available: next.settings.availableEquipment,
        excludedExerciseIds: next.settings.excludedExerciseIds,
        avoidJoints: next.program?.spec.avoidJoints ?? [],
      };
      return {
        ...next,
        program: next.program ? reconcileProgram(next.program, ctx) : null,
        sessions: next.sessions.map((session) =>
          session.status === "completed" || session.status === "skipped" ? session : reconcileSession(session, ctx),
        ),
      };
    };

    return {
      state,
      availability,
      status,

      updateSettings: (patch) =>
        setState((prev) => applyAvailability({ ...prev, settings: { ...prev.settings, ...patch } })),

      installProgram: (program, startDate = today()) =>
        setState((prev) => {
          const sessions = buildSchedule(program, startDate);
          const keepHistory = prev.sessions.filter((session) => session.status === "completed" || session.status === "skipped");
          return {
            ...prev,
            program,
            archivedPrograms: prev.program ? [prev.program, ...prev.archivedPrograms].slice(0, 5) : prev.archivedPrograms,
            sessions: [...keepHistory, ...sessions],
            onboarded: true,
          };
        }),

      regenerateProgram: (specPatch) => {
        let created: Program | null = null;
        setState((prev) => {
          const spec: ProgramSpec = { ...(prev.program?.spec ?? DEFAULT_SPEC), ...specPatch };
          const program = generateProgram(spec, {
            available: prev.settings.availableEquipment,
            excludedExerciseIds: prev.settings.excludedExerciseIds,
            seed: Math.floor(Math.random() * 1e9),
          });
          created = program;
          const sessions = buildSchedule(program, today());
          const keepHistory = prev.sessions.filter((session) => session.status === "completed" || session.status === "skipped");
          return {
            ...prev,
            program,
            archivedPrograms: prev.program ? [prev.program, ...prev.archivedPrograms].slice(0, 5) : prev.archivedPrograms,
            sessions: [...keepHistory, ...sessions],
            onboarded: true,
          };
        });
        return created;
      },

      updateSpec: (patch) =>
        setState((prev) =>
          prev.program ? { ...prev, program: { ...prev.program, spec: { ...prev.program.spec, ...patch } } } : prev,
        ),

      startSession: (sessionId) =>
        patchSession(sessionId, (session) => ({
          ...session,
          status: session.status === "completed" ? session.status : "in_progress",
          startedAt: session.startedAt ?? new Date().toISOString(),
          date: session.status === "scheduled" && session.date < today() ? today() : session.date,
        })),

      updateSet: (sessionId, itemId, setId, patch) =>
        patchItem(sessionId, itemId, (item) => ({
          ...item,
          sets: item.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
        })),

      addSet: (sessionId, itemId) =>
        patchItem(sessionId, itemId, (item) => {
          const last = item.sets[item.sets.length - 1];
          return {
            ...item,
            sets: [
              ...item.sets,
              {
                id: uid("set"),
                weight: last?.weight ?? null,
                reps: null,
                durationSec: item.durationSec ?? null,
                rpe: null,
                completed: false,
              },
            ],
          };
        }),

      removeSet: (sessionId, itemId, setId) =>
        patchItem(sessionId, itemId, (item) => ({ ...item, sets: item.sets.filter((set) => set.id !== setId) })),

      skipItem: (sessionId, itemId, skipped) => patchItem(sessionId, itemId, (item) => ({ ...item, skipped })),

      swapExercise: (sessionId, itemId, newExerciseId) =>
        patchItem(sessionId, itemId, (item) => ({
          ...item,
          swappedFrom: item.swappedFrom ?? item.exerciseId,
          exerciseId: newExerciseId,
          sets: item.sets.map((set) => ({ ...set, weight: null, completed: false })),
        })),

      swapProgramExercise: (dayId, itemId, newExerciseId) =>
        setState((prev) => {
          if (!prev.program) return prev;
          const program = {
            ...prev.program,
            days: prev.program.days.map((day) =>
              day.id !== dayId
                ? day
                : { ...day, items: day.items.map((item) => (item.id === itemId ? { ...item, exerciseId: newExerciseId } : item)) },
            ),
          };
          const sessions = prev.sessions.map((session) => {
            if (session.dayId !== dayId || session.status === "completed" || session.status === "skipped") return session;
            return {
              ...session,
              items: session.items.map((item) =>
                item.itemId === itemId
                  ? { ...item, swappedFrom: item.swappedFrom ?? item.exerciseId, exerciseId: newExerciseId }
                  : item,
              ),
            };
          });
          return { ...prev, program, sessions };
        }),

      completeSession: (sessionId, notes) =>
        patchSession(sessionId, (session) => {
          const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
          return {
            ...session,
            status: "completed",
            completedAt: new Date().toISOString(),
            durationSec: Math.round((Date.now() - startedAt) / 1000),
            notes: notes ?? session.notes,
          };
        }),

      skipSession: (sessionId) => patchSession(sessionId, (session) => ({ ...session, status: "skipped" })),

      excludeEquipment: (equipment) =>
        setState((prev) =>
          applyAvailability({
            ...prev,
            settings: {
              ...prev.settings,
              availableEquipment: prev.settings.availableEquipment.filter((item) => item !== equipment),
            },
          }),
        ),

      restoreEquipment: (equipment) =>
        setState((prev) =>
          applyAvailability({
            ...prev,
            settings: {
              ...prev.settings,
              availableEquipment: [...new Set([...prev.settings.availableEquipment, equipment])],
            },
          }),
        ),

      setAvailableEquipment: (equipment) =>
        setState((prev) => applyAvailability({ ...prev, settings: { ...prev.settings, availableEquipment: equipment } })),

      banExercise: (exerciseId) =>
        setState((prev) =>
          applyAvailability({
            ...prev,
            settings: {
              ...prev.settings,
              excludedExerciseIds: [...new Set([...prev.settings.excludedExerciseIds, exerciseId])],
            },
          }),
        ),

      unbanExercise: (exerciseId) =>
        setState((prev) =>
          applyAvailability({
            ...prev,
            settings: {
              ...prev.settings,
              excludedExerciseIds: prev.settings.excludedExerciseIds.filter((id) => id !== exerciseId),
            },
          }),
        ),

      combineOverdue: (sessionIds, capMinutes, dateIso) => {
        let newId: string | null = null;
        setState((prev) => {
          const chosen = prev.sessions.filter((session) => sessionIds.includes(session.id));
          if (chosen.length < 1) return prev;
          const merged = combineSessions(chosen, capMinutes, dateIso);
          newId = merged.id;
          return {
            ...prev,
            sessions: [...prev.sessions.filter((session) => !sessionIds.includes(session.id)), merged].sort((a, b) =>
              a.date.localeCompare(b.date),
            ),
          };
        });
        return newId;
      },

      condense: (sessionId, capMinutes) => patchSession(sessionId, (session) => condenseSession(session, capMinutes)),

      shiftPlan: (days) => setState((prev) => ({ ...prev, sessions: shiftSessions(prev.sessions, today(), days) })),

      changeDaysPerWeek: (days, preferredDays) =>
        setState((prev) => {
          if (!prev.program) return prev;
          const spec: ProgramSpec = {
            ...prev.program.spec,
            daysPerWeek: days,
            preferredDays: preferredDays ?? prev.program.spec.preferredDays,
          };
          const program = generateProgram(spec, {
            available: prev.settings.availableEquipment,
            excludedExerciseIds: prev.settings.excludedExerciseIds,
            seed: Math.floor(Math.random() * 1e9),
            name: prev.program.name,
          });
          const keep = prev.sessions.filter((session) => session.status === "completed" || session.status === "skipped");
          return { ...prev, program, sessions: [...keep, ...buildSchedule(program, today())] };
        }),

      addChatMessage: (message) => {
        const full: ChatMessage = {
          id: message.id ?? uid("msg"),
          createdAt: message.createdAt ?? new Date().toISOString(),
          role: message.role,
          content: message.content,
          suggestions: message.suggestions,
          programId: message.programId,
        };
        setState((prev) => ({ ...prev, chat: [...prev.chat, full] }));
        return full;
      },

      setCoachDraft: (draft) => setState((prev) => ({ ...prev, coachDraft: { ...prev.coachDraft, ...draft } })),

      clearChat: () => setState((prev) => ({ ...prev, chat: [], coachDraft: {} })),

      addMetric: (metric) => setState((prev) => ({ ...prev, metrics: [...prev.metrics, { ...metric, id: uid("metric") }] })),

      removeMetric: (id) => setState((prev) => ({ ...prev, metrics: prev.metrics.filter((metric) => metric.id !== id) })),

      resetAll: () => setState({ ...EMPTY_STATE, settings: DEFAULT_SETTINGS }),

      getSession: (sessionId) => state.sessions.find((session) => session.id === sessionId),
    };
  }, [state, availability, status, patchSession, patchItem]);

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>;
}

export function useGym(): GymContextValue {
  const context = React.useContext(GymContext);
  if (!context) throw new Error("useGym must be used inside GymProvider");
  return context;
}
