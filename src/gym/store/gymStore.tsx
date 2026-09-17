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
import { KG_PER_LB } from "../engine/strength";
import { useAuth } from "./auth";
import {
  fetchRemoteState,
  MissingTableError,
  pushRemoteState,
  type RemoteSnapshot,
} from "./remote";
import type {
  BodyMetric,
  Profile,
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
const SYNC_MARKER_KEY = "gym.sync.v1";
const STATE_VERSION = 1;

export type SyncStatus = "off" | "syncing" | "synced" | "error" | "conflict";

export interface SyncState {
  status: SyncStatus;
  message?: string;
  lastSyncedAt?: string;
}

interface SyncMarker {
  userId: string;
  remoteUpdatedAt: string;
}

/** Timestamps can come back in a different format to the one we sent. */
function sameInstant(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
}

function readSyncMarker(): SyncMarker | null {
  try {
    const raw = window.localStorage.getItem(SYNC_MARKER_KEY);
    return raw ? (JSON.parse(raw) as SyncMarker) : null;
  } catch {
    return null;
  }
}

function writeSyncMarker(marker: SyncMarker | null): void {
  try {
    if (marker) window.localStorage.setItem(SYNC_MARKER_KEY, JSON.stringify(marker));
    else window.localStorage.removeItem(SYNC_MARKER_KEY);
  } catch {
    // Nothing to do; the next sign-in will just ask about conflicts.
  }
}

/** Has anything worth keeping been recorded here? */
export function hasTrainingData(state: GymState): boolean {
  return Boolean(state.program) || state.sessions.length > 0 || state.metrics.length > 0;
}

export const DEFAULT_SETTINGS: Settings = {
  units: "kg",
  theme: "dark",
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

export const EMPTY_PROFILE: Profile = {
  displayName: "",
  sex: "unspecified",
  birthYear: null,
  heightCm: null,
  weightKg: null,
  experience: null,
  notes: "",
  updatedAt: new Date(0).toISOString(),
};

const EMPTY_STATE: GymState = {
  version: STATE_VERSION,
  updatedAt: new Date(0).toISOString(),
  settings: DEFAULT_SETTINGS,
  profile: EMPTY_PROFILE,
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
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      profile: { ...EMPTY_PROFILE, ...parsed.profile },
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
  updateProfile: (patch: Partial<Profile>) => void;
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
  /** Where cloud sync has got to, and anything it needs from the user. */
  sync: SyncState;
  conflict: RemoteSnapshot | null;
  resolveConflict: (choice: "local" | "remote") => Promise<void>;
  syncNow: () => Promise<boolean>;
  signOutAndClear: () => Promise<void>;
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
  const auth = useAuth();
  const stateRef = React.useRef(state);
  stateRef.current = state;

  const [sync, setSync] = React.useState<SyncState>({ status: "off" });
  const [conflict, setConflict] = React.useState<RemoteSnapshot | null>(null);
  const readyToPushRef = React.useRef(false);

  /** Stamps the change so other devices can tell which copy is newer. */
  const commit = React.useCallback((updater: (prev: GymState) => GymState) => {
    setState((prev) => {
      const next = updater(prev);
      if (next === prev) return prev;
      return { ...next, updatedAt: new Date().toISOString() };
    });
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked; the app still works for this session.
    }
  }, [state]);

  const adopt = React.useCallback((remote: GymState) => {
    setState({
      ...EMPTY_STATE,
      ...remote,
      settings: { ...DEFAULT_SETTINGS, ...remote.settings },
      profile: { ...EMPTY_PROFILE, ...remote.profile },
    });
  }, []);

  const pushNow = React.useCallback(async (): Promise<boolean> => {
    if (!auth.user) return false;
    const snapshot = stateRef.current;
    try {
      setSync((prev) => ({ ...prev, status: "syncing" }));
      await pushRemoteState(auth.user, snapshot, snapshot.updatedAt);
      writeSyncMarker({ userId: auth.user.id, remoteUpdatedAt: snapshot.updatedAt });
      setSync({ status: "synced", lastSyncedAt: new Date().toISOString() });
      return true;
    } catch (error) {
      setSync({
        status: "error",
        message: error instanceof MissingTableError ? error.message : (error as Error).message,
      });
      return false;
    }
  }, [auth.user]);

  // Signing in: work out whether this device or the account is ahead.
  React.useEffect(() => {
    const user = auth.user;
    if (!user) {
      readyToPushRef.current = false;
      setSync({ status: "off" });
      setConflict(null);
      return;
    }

    let cancelled = false;
    readyToPushRef.current = false;
    setSync({ status: "syncing" });

    fetchRemoteState(user.id)
      .then(async (remote) => {
        if (cancelled) return;
        const local = stateRef.current;
        const marker = readSyncMarker();
        const remoteIsOurLastSync =
          remote != null && marker?.userId === user.id && sameInstant(marker.remoteUpdatedAt, remote.updatedAt);

        if (!remote || !hasTrainingData(remote.state) || remoteIsOurLastSync) {
          // Nothing on the account yet, or it is exactly what we last sent.
          readyToPushRef.current = true;
          await pushRemoteState(user, local, local.updatedAt);
          writeSyncMarker({ userId: user.id, remoteUpdatedAt: local.updatedAt });
          if (!cancelled) setSync({ status: "synced", lastSyncedAt: new Date().toISOString() });
          return;
        }

        if (!hasTrainingData(local)) {
          adopt(remote.state);
          writeSyncMarker({ userId: user.id, remoteUpdatedAt: remote.updatedAt });
          readyToPushRef.current = true;
          setSync({ status: "synced", lastSyncedAt: new Date().toISOString() });
          return;
        }

        // Both sides have real training in them. Never silently bin either.
        setConflict(remote);
        setSync({ status: "conflict" });
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setSync({ status: "error", message: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [auth.user, adopt]);

  // Ongoing changes, batched so a set of quick taps is one write.
  React.useEffect(() => {
    if (!auth.user || !readyToPushRef.current || conflict) return;
    const marker = readSyncMarker();
    if (marker?.userId === auth.user.id && sameInstant(marker.remoteUpdatedAt, state.updatedAt)) return;
    const handle = window.setTimeout(() => void pushNow(), 1500);
    return () => window.clearTimeout(handle);
  }, [state.updatedAt, auth.user, conflict, pushNow]);

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
    commit((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => (session.id === sessionId ? updater(session) : session)),
    }));
  }, [commit]);

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
        commit((prev) => {
          let next = { ...prev, settings: { ...prev.settings, ...patch } };
          // Weights are stored in whatever units were on at the time, so a
          // switch has to convert them or every past session becomes a lie.
          if (patch.units && patch.units !== prev.settings.units) {
            const factor = patch.units === "lb" ? 1 / KG_PER_LB : KG_PER_LB;
            const convert = (value: number | null | undefined) =>
              value == null ? value : Math.round(value * factor * 10) / 10;
            next = {
              ...next,
              sessions: next.sessions.map((session) => ({
                ...session,
                items: session.items.map((item) => ({
                  ...item,
                  sets: item.sets.map((set) => ({ ...set, weight: convert(set.weight) ?? null })),
                })),
              })),
              metrics: next.metrics.map((metric) => ({ ...metric, weight: convert(metric.weight) })),
            };
          }
          return applyAvailability(next);
        }),

      updateProfile: (patch) =>
        commit((prev) => {
          const profile: Profile = { ...prev.profile, ...patch, updatedAt: new Date().toISOString() };
          // A new bodyweight is worth keeping on the graph, not just in the profile.
          const shouldLog =
            patch.weightKg != null &&
            patch.weightKg !== prev.profile.weightKg &&
            !prev.metrics.some((metric) => metric.date === today() && metric.weight === patch.weightKg);
          const metrics = shouldLog
            ? [
                ...prev.metrics.filter((metric) => metric.date !== today()),
                { id: uid("metric"), date: today(), weight: patch.weightKg! },
              ]
            : prev.metrics;
          // Experience feeds the programme, so keep the spec in step with it.
          const program =
            patch.experience && prev.program
              ? { ...prev.program, spec: { ...prev.program.spec, experience: patch.experience } }
              : prev.program;
          return { ...prev, profile, metrics, program };
        }),

      installProgram: (program, startDate = today()) =>
        commit((prev) => {
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
        commit((prev) => {
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
        commit((prev) =>
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
        commit((prev) => {
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
        commit((prev) =>
          applyAvailability({
            ...prev,
            settings: {
              ...prev.settings,
              availableEquipment: prev.settings.availableEquipment.filter((item) => item !== equipment),
            },
          }),
        ),

      restoreEquipment: (equipment) =>
        commit((prev) =>
          applyAvailability({
            ...prev,
            settings: {
              ...prev.settings,
              availableEquipment: [...new Set([...prev.settings.availableEquipment, equipment])],
            },
          }),
        ),

      setAvailableEquipment: (equipment) =>
        commit((prev) => applyAvailability({ ...prev, settings: { ...prev.settings, availableEquipment: equipment } })),

      banExercise: (exerciseId) =>
        commit((prev) =>
          applyAvailability({
            ...prev,
            settings: {
              ...prev.settings,
              excludedExerciseIds: [...new Set([...prev.settings.excludedExerciseIds, exerciseId])],
            },
          }),
        ),

      unbanExercise: (exerciseId) =>
        commit((prev) =>
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
        commit((prev) => {
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

      shiftPlan: (days) => commit((prev) => ({ ...prev, sessions: shiftSessions(prev.sessions, today(), days) })),

      changeDaysPerWeek: (days, preferredDays) =>
        commit((prev) => {
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
        commit((prev) => ({ ...prev, chat: [...prev.chat, full] }));
        return full;
      },

      setCoachDraft: (draft) => commit((prev) => ({ ...prev, coachDraft: { ...prev.coachDraft, ...draft } })),

      clearChat: () => commit((prev) => ({ ...prev, chat: [], coachDraft: {} })),

      addMetric: (metric) => commit((prev) => ({ ...prev, metrics: [...prev.metrics, { ...metric, id: uid("metric") }] })),

      removeMetric: (id) => commit((prev) => ({ ...prev, metrics: prev.metrics.filter((metric) => metric.id !== id) })),

      resetAll: () => commit(() => ({ ...EMPTY_STATE, settings: DEFAULT_SETTINGS, updatedAt: new Date().toISOString() })),

      getSession: (sessionId) => state.sessions.find((session) => session.id === sessionId),

      sync,
      conflict,

      resolveConflict: async (choice) => {
        if (!auth.user || !conflict) return;
        if (choice === "remote") {
          adopt(conflict.state);
          writeSyncMarker({ userId: auth.user.id, remoteUpdatedAt: conflict.updatedAt });
          setConflict(null);
          readyToPushRef.current = true;
          setSync({ status: "synced", lastSyncedAt: new Date().toISOString() });
          return;
        }
        setConflict(null);
        readyToPushRef.current = true;
        await pushNow();
      },

      syncNow: pushNow,

      signOutAndClear: async () => {
        // Get anything unsaved up first, so signing out is never a data loss.
        if (auth.user && readyToPushRef.current) await pushNow();
        await auth.signOut();
        writeSyncMarker(null);
        readyToPushRef.current = false;
        setConflict(null);
        setSync({ status: "off" });
        setState({ ...EMPTY_STATE, settings: { ...DEFAULT_SETTINGS }, updatedAt: new Date().toISOString() });
      },
    };
  }, [state, availability, status, patchSession, patchItem, commit, sync, conflict, auth, adopt, pushNow]);

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>;
}

export function useGym(): GymContextValue {
  const context = React.useContext(GymContext);
  if (!context) throw new Error("useGym must be used inside GymProvider");
  return context;
}
