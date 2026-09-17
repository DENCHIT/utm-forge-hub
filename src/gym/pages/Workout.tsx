import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  Check,
  Flag,
  Info,
  MoreHorizontal,
  Plus,
  Repeat,
  SkipForward,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ExerciseSwapSheet } from "../components/ExerciseSwapSheet";
import { NumberField } from "../components/NumberField";
import { IDLE_TIMER, RestTimer, type RestTimerState } from "../components/RestTimer";
import { getExercise, MUSCLE_LABEL } from "../data/exercises";
import { EQUIPMENT_LABEL } from "../data/equipment";
import { missingEquipment } from "../engine/substitution";
import { suggestTarget, historyFor, sessionVolume } from "../engine/progression";
import { primeAudio } from "../lib/feedback";
import { formatDuration, formatVolume } from "../lib/format";
import { useWakeLock } from "../lib/wakeLock";
import { useGym } from "../store/gymStore";
import type { LoggedItem, SetLog } from "../types";

function useElapsed(startedAt?: string): number {
  const [, force] = React.useReducer((count: number) => count + 1, 0);
  React.useEffect(() => {
    const id = window.setInterval(force, 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!startedAt) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
}

export default function Workout() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const gym = useGym();
  const { state, updateSet, addSet, removeSet, completeSession, swapExercise, skipItem, startSession } = gym;

  const session = state.sessions.find((entry) => entry.id === sessionId);
  const [openItemId, setOpenItemId] = React.useState<string | null>(null);
  const [timer, setTimer] = React.useState<RestTimerState>(IDLE_TIMER);
  const [swapTarget, setSwapTarget] = React.useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const startedRef = React.useRef(false);

  useWakeLock(Boolean(session) && state.settings.keepScreenAwake);
  const elapsed = useElapsed(session?.startedAt);

  React.useEffect(() => {
    if (!session || startedRef.current) return;
    startedRef.current = true;
    if (session.status !== "completed") startSession(session.id);
    primeAudio();
  }, [session, startSession]);

  React.useEffect(() => {
    if (session && openItemId === null) {
      const firstUnfinished = session.items.find(
        (item) => !item.skipped && item.sets.some((set) => !set.completed),
      );
      setOpenItemId(firstUnfinished?.itemId ?? session.items[0]?.itemId ?? null);
    }
  }, [session, openItemId]);

  if (!session) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">That workout is no longer in your plan.</p>
        <Button onClick={() => navigate("/gym")}>Back to today</Button>
      </div>
    );
  }

  const totalSets = session.items.filter((item) => !item.skipped).reduce((total, item) => total + item.sets.length, 0);
  const doneSets = session.items.reduce((total, item) => total + item.sets.filter((set) => set.completed).length, 0);
  const progress = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;

  const handleToggleSet = (item: LoggedItem, set: SetLog) => {
    const nowCompleted = !set.completed;
    const exercise = getExercise(item.exerciseId);
    const patch: Partial<SetLog> = {
      completed: nowCompleted,
      completedAt: nowCompleted ? new Date().toISOString() : undefined,
    };
    if (nowCompleted && set.reps == null && !item.durationSec) patch.reps = item.repMax;
    if (nowCompleted && item.durationSec && set.durationSec == null) patch.durationSec = item.durationSec;
    updateSet(session.id, item.itemId, set.id, patch);

    if (!nowCompleted) return;

    const remaining = item.sets.filter((entry) => entry.id !== set.id && !entry.completed).length;
    if (state.settings.restTimerAutoStart && remaining > 0) {
      primeAudio();
      setTimer({
        endsAt: Date.now() + item.rest * 1000,
        totalSec: item.rest,
        pausedRemainingMs: null,
        label: `${exercise?.name ?? "Next set"} - set ${item.sets.findIndex((entry) => entry.id === set.id) + 2}`,
      });
    }
    if (remaining === 0) {
      setTimer(IDLE_TIMER);
      const next = session.items.find((entry) => !entry.skipped && entry.itemId !== item.itemId && entry.sets.some((s) => !s.completed));
      if (next) setOpenItemId(next.itemId);
    }
  };

  const finish = () => {
    completeSession(session.id, notes || undefined);
    setTimer(IDLE_TIMER);
    toast.success("Session logged", {
      description: `${doneSets} ${doneSets === 1 ? "set" : "sets"}, ${formatVolume(sessionVolume(session), state.settings.units)} moved`,
    });
    navigate(`/gym/history?session=${session.id}`, { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-40">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-lg px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight">{session.name}</h1>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Timer className="h-3.5 w-3.5" aria-hidden />
                <span className="tabular-nums">{formatDuration(elapsed)}</span>
                <span>-</span>
                <span>
                  {doneSets} of {totalSets} sets
                </span>
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => navigate("/gym")} aria-label="Close workout">
              <X className="h-5 w-5" aria-hidden />
            </Button>
          </div>
          <Progress value={progress} className="mt-2 h-1.5" />
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-3 px-4 py-4">
        {session.items.map((item, index) => {
          const exercise = getExercise(item.exerciseId);
          const isOpen = openItemId === item.itemId;
          const itemDone = item.sets.length > 0 && item.sets.every((set) => set.completed);
          const suggestion = suggestTarget(item, state.sessions, state.settings.units);
          const previous = historyFor(state.sessions, item.exerciseId)[0];

          return (
            <section
              key={item.itemId}
              className={cn(
                "overflow-hidden rounded-xl border transition-colors",
                item.skipped && "opacity-50",
                itemDone ? "border-success/40 bg-success/5" : isOpen ? "border-primary/50 bg-card" : "border-border bg-card",
              )}
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                onClick={() => setOpenItemId(isOpen ? null : item.itemId)}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    itemDone ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {itemDone ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold leading-tight">{exercise?.name ?? "Unknown exercise"}</span>
                    {item.supersetGroup ? (
                      <Badge variant="outline" className="h-4 shrink-0 px-1 text-[10px]">
                        SS {item.supersetGroup}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {item.durationSec && exercise?.loadType === "time"
                      ? `${item.sets.length} x ${Math.round(item.durationSec / (item.durationSec >= 120 ? 60 : 1))}${item.durationSec >= 120 ? " min" : "s"}`
                      : `${item.sets.length} x ${item.repMin}-${item.repMax}`}
                    {" - "}
                    {item.rest}s rest
                    {item.swappedFrom ? " - swapped" : ""}
                  </span>
                </span>
                <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden />
              </button>

              {isOpen ? (
                <div className="space-y-3 border-t border-border/60 px-4 py-3">
                  {item.note ? <p className="text-xs text-muted-foreground">{item.note}</p> : null}

                  {exercise && missingEquipment(exercise, state.settings.availableEquipment).length ? (
                    <div className="flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/5 p-2.5 text-xs">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                      <p>
                        This needs{" "}
                        {missingEquipment(exercise, state.settings.availableEquipment)
                          .map((entry) => EQUIPMENT_LABEL[entry].toLowerCase())
                          .join(" and ")}
                        , which you have marked as unavailable. Tap Swap to pick something else.
                      </p>
                    </div>
                  ) : null}

                  <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-2.5 text-xs">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    <div>
                      <p className="font-medium text-foreground">{suggestion.hint}</p>
                      {previous ? (
                        <p className="mt-0.5 text-muted-foreground">
                          Last time: {previous.sets.map((set) => `${set.weight ?? "-"}${state.settings.units} x ${set.reps ?? "-"}`).join(", ")}
                        </p>
                      ) : null}
                      {exercise?.cues.length ? <p className="mt-0.5 text-muted-foreground">{exercise.cues[0]}</p> : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span>Set</span>
                      <span className="text-center">{exercise?.loadType === "time" ? "Seconds" : `Weight (${state.settings.units})`}</span>
                      <span className="text-center">{exercise?.loadType === "time" ? "Notes" : "Reps"}</span>
                      <span />
                    </div>

                    {item.sets.map((set, setIndex) => (
                      <div key={set.id} className="grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2">
                        <span className="text-center text-sm font-semibold text-muted-foreground">{setIndex + 1}</span>
                        {exercise?.loadType === "time" ? (
                          <>
                            <NumberField
                              ariaLabel={`Set ${setIndex + 1} seconds`}
                              value={set.durationSec ?? null}
                              placeholder={String(item.durationSec ?? 60)}
                              onCommit={(value) => updateSet(session.id, item.itemId, set.id, { durationSec: value })}
                            />
                            <NumberField
                              ariaLabel={`Set ${setIndex + 1} load`}
                              value={set.weight}
                              placeholder="-"
                              onCommit={(value) => updateSet(session.id, item.itemId, set.id, { weight: value })}
                            />
                          </>
                        ) : (
                          <>
                            <NumberField
                              ariaLabel={`Set ${setIndex + 1} weight`}
                              value={set.weight}
                              placeholder={suggestion.weight != null ? String(suggestion.weight) : "-"}
                              onCommit={(value) => updateSet(session.id, item.itemId, set.id, { weight: value })}
                            />
                            <NumberField
                              ariaLabel={`Set ${setIndex + 1} reps`}
                              value={set.reps}
                              placeholder={String(suggestion.reps ?? item.repMax)}
                              onCommit={(value) => updateSet(session.id, item.itemId, set.id, { reps: value })}
                            />
                          </>
                        )}
                        <Button
                          type="button"
                          variant={set.completed ? "default" : "outline"}
                          size="icon"
                          className={cn("h-12 w-12", set.completed && "bg-success text-success-foreground hover:bg-success/90")}
                          aria-label={set.completed ? `Undo set ${setIndex + 1}` : `Complete set ${setIndex + 1}`}
                          onClick={() => handleToggleSet(item, set)}
                        >
                          <Check className="h-5 w-5" aria-hidden />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => addSet(session.id, item.itemId)}>
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Add set
                    </Button>
                    {item.sets.length > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5"
                        onClick={() => removeSet(session.id, item.itemId, item.sets[item.sets.length - 1].id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Remove set
                      </Button>
                    ) : null}
                    <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setSwapTarget(item.itemId)}>
                      <Repeat className="h-3.5 w-3.5" aria-hidden />
                      Swap
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-1.5"
                      onClick={() => skipItem(session.id, item.itemId, !item.skipped)}
                    >
                      <SkipForward className="h-3.5 w-3.5" aria-hidden />
                      {item.skipped ? "Put back" : "Skip"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-1.5"
                      onClick={() => {
                        primeAudio();
                        setTimer({
                          endsAt: Date.now() + item.rest * 1000,
                          totalSec: item.rest,
                          pausedRemainingMs: null,
                          label: exercise?.name ?? "Rest",
                        });
                      }}
                    >
                      <Timer className="h-3.5 w-3.5" aria-hidden />
                      Rest {item.rest}s
                    </Button>
                  </div>

                  {exercise ? (
                    <p className="text-[11px] text-muted-foreground">
                      {exercise.primary.map((muscle) => MUSCLE_LABEL[muscle]).join(", ")}
                      {exercise.cues.length > 1 ? ` - ${exercise.cues[1]}` : ""}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}

        <div className="space-y-2 pt-2">
          <label htmlFor="session-notes" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Session notes
          </label>
          <Textarea
            id="session-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Felt strong, left shoulder a bit tight on pressing..."
            className="min-h-[72px]"
          />
        </div>
      </div>

      <div className={cn("fixed inset-x-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur", timer.endsAt !== null ? "bottom-[92px]" : "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]")}>
        <div className="mx-auto flex max-w-lg gap-2">
          <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => navigate("/gym")}>
            Pause and exit
          </Button>
          <Button type="button" className="h-12 flex-1 gap-2" onClick={() => setConfirmFinish(true)}>
            <Flag className="h-4 w-4" aria-hidden />
            Finish
          </Button>
        </div>
      </div>

      <RestTimer
        timer={timer}
        onChange={setTimer}
        onFinished={() => undefined}
        sound={state.settings.restTimerSound}
        haptics={state.settings.restTimerVibrate}
        warningSec={state.settings.restWarningSec}
      />

      <ExerciseSwapSheet
        open={swapTarget !== null}
        onOpenChange={(open) => !open && setSwapTarget(null)}
        exerciseId={swapTarget ? (session.items.find((item) => item.itemId === swapTarget)?.exerciseId ?? null) : null}
        exclude={session.items.map((item) => item.exerciseId)}
        onPick={(exerciseId) => {
          if (swapTarget) swapExercise(session.id, swapTarget, exerciseId);
          setSwapTarget(null);
        }}
      />

      <AlertDialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish this session?</AlertDialogTitle>
            <AlertDialogDescription>
              {doneSets < totalSets
                ? `You have ${totalSets - doneSets} sets left. Anything not ticked will not count towards your numbers.`
                : "Everything is logged. Nice work."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={finish}>Finish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
