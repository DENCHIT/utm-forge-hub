import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";
import { getExercise } from "../data/exercises";
import { estimateDayMinutes, estimateItemSeconds, fitToTime } from "./programGenerator";
import type { LoggedItem, Program, ProgramDay, ProgramItem, WorkoutSession } from "../types";

export const isoDate = (date: Date): string => format(date, "yyyy-MM-dd");
export const today = (): string => isoDate(new Date());

let counter = 0;
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${Math.floor(Math.random() * 1296).toString(36)}`;
}

const DEFAULT_SPREAD = [1, 3, 5, 2, 4, 6, 0];

/** Which weekdays to train on, given how many days and any preference. */
export function pickWeekdays(daysPerWeek: number, preferred: number[]): number[] {
  const wanted = Math.max(1, Math.min(7, daysPerWeek));
  const chosen = [...new Set(preferred)].filter((day) => day >= 0 && day <= 6);
  if (chosen.length >= wanted) return chosen.slice(0, wanted).sort((a, b) => a - b);
  for (const day of DEFAULT_SPREAD) {
    if (chosen.length >= wanted) break;
    if (!chosen.includes(day)) chosen.push(day);
  }
  return chosen.sort((a, b) => a - b);
}

export function itemToLogged(item: ProgramItem): LoggedItem {
  return {
    itemId: item.id,
    exerciseId: item.exerciseId,
    targetSets: item.sets,
    repMin: item.repMin,
    repMax: item.repMax,
    rest: item.rest,
    supersetGroup: item.supersetGroup,
    durationSec: item.durationSec,
    note: item.note,
    priority: item.priority,
    sets: Array.from({ length: item.sets }, () => ({
      id: uid("set"),
      weight: null,
      reps: null,
      durationSec: item.durationSec ?? null,
      rpe: null,
      completed: false,
    })),
  };
}

export function loggedToItem(logged: LoggedItem): ProgramItem {
  return {
    id: logged.itemId,
    exerciseId: logged.exerciseId,
    sets: logged.targetSets,
    repMin: logged.repMin,
    repMax: logged.repMax,
    rest: logged.rest,
    priority: logged.priority,
    supersetGroup: logged.supersetGroup,
    durationSec: logged.durationSec,
    note: logged.note,
  };
}

export function sessionMinutes(session: WorkoutSession): number {
  return estimateDayMinutes(session.items.map(loggedToItem));
}

function makeSession(program: Program, day: ProgramDay, date: string, weekNumber: number): WorkoutSession {
  return {
    id: uid("session"),
    programId: program.id,
    dayId: day.id,
    name: day.name,
    focus: day.focus,
    date,
    weekNumber,
    status: "scheduled",
    items: day.items.map(itemToLogged),
  };
}

/**
 * Lay the programme's repeating week out onto real dates.
 * The first week only uses days from `startDate` onwards, so a Thursday start
 * does not silently owe you three missed sessions.
 */
export function buildSchedule(program: Program, startDateIso: string = today()): WorkoutSession[] {
  const start = parseISO(startDateIso);
  const weekdays = pickWeekdays(program.days.length, program.spec.preferredDays);
  const sessions: WorkoutSession[] = [];

  for (let week = 0; week < program.spec.weeks; week += 1) {
    const weekStart = addDays(startOfWeek(start, { weekStartsOn: 1 }), week * 7);
    const dates: string[] = [];
    for (const weekday of weekdays) {
      // startOfWeek with weekStartsOn: 1 gives Monday; map 0 (Sunday) to the end.
      const offset = weekday === 0 ? 6 : weekday - 1;
      dates.push(isoDate(addDays(weekStart, offset)));
    }
    let usable = dates.filter((date) => differenceInCalendarDays(parseISO(date), start) >= 0);
    if (week === 0 && usable.length < program.days.length) {
      // Starting mid-week: train today as well, then pick the pattern up
      // properly next week rather than cramming four days back to back.
      const startIso = isoDate(start);
      if (!usable.includes(startIso)) usable = [startIso, ...usable].sort();
    }
    usable = usable.slice(0, program.days.length);
    program.days.forEach((day, index) => {
      const date = usable[index];
      if (!date) return;
      sessions.push(makeSession(program, day, date, week + 1));
    });
  }

  return sessions.sort((a, b) => a.date.localeCompare(b.date));
}

export interface ScheduleStatus {
  todaySession: WorkoutSession | null;
  overdue: WorkoutSession[];
  upcoming: WorkoutSession[];
  completedThisWeek: number;
  plannedThisWeek: number;
  currentWeek: number;
  streak: number;
}

export function analyseSchedule(sessions: WorkoutSession[], now: string = today()): ScheduleStatus {
  const scheduled = sessions.filter((session) => session.status === "scheduled" || session.status === "in_progress");
  const todaySession = scheduled.find((session) => session.date === now) ?? null;
  const overdue = scheduled.filter((session) => session.date < now).sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = scheduled.filter((session) => session.date > now).sort((a, b) => a.date.localeCompare(b.date));

  const weekStart = isoDate(startOfWeek(parseISO(now), { weekStartsOn: 1 }));
  const weekEnd = isoDate(addDays(startOfWeek(parseISO(now), { weekStartsOn: 1 }), 6));
  const inWeek = sessions.filter((session) => session.date >= weekStart && session.date <= weekEnd);
  const completedThisWeek = inWeek.filter((session) => session.status === "completed").length;

  const currentWeek = todaySession?.weekNumber ?? upcoming[0]?.weekNumber ?? overdue[0]?.weekNumber ?? 1;

  return {
    todaySession,
    overdue,
    upcoming,
    completedThisWeek,
    plannedThisWeek: inWeek.length,
    currentWeek,
    streak: computeStreak(sessions, now),
  };
}

/** Consecutive weeks in which at least one session was completed. */
export function computeStreak(sessions: WorkoutSession[], now: string = today()): number {
  const completed = sessions.filter((session) => session.status === "completed");
  if (!completed.length) return 0;
  let streak = 0;
  for (let week = 0; week < 52; week += 1) {
    const start = addDays(startOfWeek(parseISO(now), { weekStartsOn: 1 }), -week * 7);
    const startIso = isoDate(start);
    const endIso = isoDate(addDays(start, 6));
    const any = completed.some((session) => {
      const date = session.completedAt ? session.completedAt.slice(0, 10) : session.date;
      return date >= startIso && date <= endIso;
    });
    if (any) streak += 1;
    else if (week > 0) break;
  }
  return streak;
}

function mergeKey(logged: LoggedItem): string {
  const exercise = getExercise(logged.exerciseId);
  if (!exercise) return logged.exerciseId;
  return `${exercise.pattern}:${exercise.primary.slice().sort().join("+")}`;
}

/**
 * Fold two or more sessions into one that still fits a time cap.
 * Main lifts survive, duplicated patterns collapse, accessories go first.
 */
export function combineSessions(sessions: WorkoutSession[], capMinutes: number, dateIso?: string): WorkoutSession {
  const ordered = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const byKey = new Map<string, LoggedItem>();

  for (const session of ordered) {
    for (const logged of session.items) {
      if (logged.skipped) continue;
      const key = mergeKey(logged);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...logged, itemId: uid("item"), sets: logged.sets.map((set) => ({ ...set, id: uid("set") })) });
        continue;
      }
      // Same pattern twice: keep the more important one, and give it one extra set.
      if (logged.priority < existing.priority) {
        byKey.set(key, {
          ...logged,
          itemId: uid("item"),
          targetSets: logged.targetSets,
          sets: logged.sets.map((set) => ({ ...set, id: uid("set") })),
        });
      }
    }
  }

  let items = [...byKey.values()];

  // Merging means more total work in one go, so trim volume before trimming exercises.
  const sessionCount = ordered.length;
  if (sessionCount > 1) {
    items = items.map((item) => {
      const reduction = item.priority === 1 ? 1 : item.priority === 2 ? 1 : 1;
      const target = Math.max(item.priority === 1 ? 3 : 2, item.targetSets - reduction);
      return { ...item, targetSets: target, sets: item.sets.slice(0, target) };
    });
  }

  items.sort((a, b) => a.priority - b.priority);

  const fitted = fitToTime(items.map(loggedToItem), capMinutes);
  const keptIds = new Set(fitted.map((item) => item.id));
  const finalItems = items
    .filter((item) => keptIds.has(item.itemId))
    .map((item) => {
      const match = fitted.find((entry) => entry.id === item.itemId)!;
      return {
        ...item,
        targetSets: match.sets,
        rest: match.rest,
        supersetGroup: match.supersetGroup,
        sets: item.sets.slice(0, match.sets),
      };
    });

  const base = ordered[0];
  const names = [...new Set(ordered.map((session) => session.name))];
  const mergedName =
    ordered.length === 1 ? base.name : names.length <= 2 ? names.join(" + ") : `${ordered.length} sessions combined`;
  return {
    ...base,
    id: uid("session"),
    name: mergedName,
    focus: ordered.length > 1 ? "Combined session" : base.focus,
    date: dateIso ?? today(),
    status: "scheduled",
    items: finalItems,
    mergedFrom: ordered.map((session) => session.id),
    timeCapMinutes: capMinutes,
  };
}

/** Squeeze a single session into fewer minutes without touching the main lifts. */
export function condenseSession(session: WorkoutSession, capMinutes: number): WorkoutSession {
  const fitted = fitToTime(session.items.map(loggedToItem), capMinutes);
  const keptIds = new Set(fitted.map((item) => item.id));
  const items = session.items
    .filter((item) => keptIds.has(item.itemId))
    .map((item) => {
      const match = fitted.find((entry) => entry.id === item.itemId)!;
      return {
        ...item,
        targetSets: match.sets,
        rest: match.rest,
        supersetGroup: match.supersetGroup,
        sets: item.sets.slice(0, match.sets),
      };
    });
  return { ...session, items, timeCapMinutes: capMinutes };
}

/** Push every remaining scheduled session forward by a number of days. */
export function shiftSessions(sessions: WorkoutSession[], fromIso: string, days: number): WorkoutSession[] {
  return sessions.map((session) => {
    if (session.status !== "scheduled" || session.date < fromIso) return session;
    return { ...session, date: isoDate(addDays(parseISO(session.date), days)) };
  });
}

/** How far behind the plan the user is, in whole sessions. */
export function sessionsBehind(sessions: WorkoutSession[], now: string = today()): number {
  return sessions.filter((session) => session.status === "scheduled" && session.date < now).length;
}

export function totalWorkSeconds(session: WorkoutSession): number {
  return session.items.map(loggedToItem).reduce((total, item) => total + estimateItemSeconds(item), 0);
}
