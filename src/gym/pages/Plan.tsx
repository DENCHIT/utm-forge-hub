import * as React from "react";
import { Link } from "react-router-dom";
import { addDays, parseISO, startOfWeek } from "date-fns";
import { AlertTriangle, CalendarRange, ChevronDown, Layers, Lightbulb, ListChecks, Repeat, Shuffle, Sliders } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ExerciseSwapSheet } from "../components/ExerciseSwapSheet";
import { EmptyState, GymLayout } from "../components/GymLayout";
import { getExercise } from "../data/exercises";
import { isUsable, missingEquipment } from "../engine/substitution";
import { EQUIPMENT_LABEL } from "../data/equipment";
import { estimateDayMinutes, GOAL_LABEL, SPLIT_LABEL } from "../engine/programGenerator";
import { isoDate, sessionMinutes, today as todayIso } from "../engine/schedule";
import { friendlyDate, WEEKDAYS, WEEKDAY_ORDER } from "../lib/format";
import { useGym } from "../store/gymStore";

export default function Plan() {
  const { state, status, availability, regenerateProgram, swapProgramExercise, combineOverdue } = useGym();
  const program = state.program;

  const [openDay, setOpenDay] = React.useState<string | null>(null);
  const [tuning, setTuning] = React.useState(false);
  const [days, setDays] = React.useState(program?.spec.daysPerWeek ?? 3);
  const [minutes, setMinutes] = React.useState(program?.spec.sessionMinutes ?? 60);
  const [weeks, setWeeks] = React.useState(program?.spec.weeks ?? 8);
  const [cardio, setCardio] = React.useState(program?.spec.includeCardio ?? false);
  const [preferred, setPreferred] = React.useState<number[]>(program?.spec.preferredDays ?? [1, 3, 5]);
  const [swap, setSwap] = React.useState<{ dayId: string; itemId: string; exerciseId: string } | null>(null);

  React.useEffect(() => {
    if (!program) return;
    setDays(program.spec.daysPerWeek);
    setMinutes(program.spec.sessionMinutes);
    setWeeks(program.spec.weeks);
    setCardio(program.spec.includeCardio);
    setPreferred(program.spec.preferredDays);
  }, [program]);

  const weekSessions = React.useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const from = isoDate(start);
    const to = isoDate(addDays(start, 6));
    return state.sessions
      .filter((session) => session.date >= from && session.date <= to && session.status === "scheduled")
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [state.sessions]);

  const remainingThisWeek = weekSessions.filter((session) => session.date >= todayIso()).length;

  // Kit can disappear faster than a substitute can be found, so say so plainly.
  const unresolved = React.useMemo(() => {
    if (!program) return [];
    return program.days.flatMap((day) =>
      day.items
        .filter((item) => {
          const exercise = getExercise(item.exerciseId);
          return !exercise || !isUsable(exercise, availability);
        })
        .map((item) => ({ dayId: day.id, itemId: item.id, exerciseId: item.exerciseId })),
    );
  }, [program, availability]);

  if (!program) {
    return (
      <GymLayout title="Plan">
        <EmptyState
          icon={ListChecks}
          title="No programme yet"
          description="Have a chat with the coach and one will appear here."
          action={
            <Button asChild className="h-11">
              <Link to="/gym/coach">Talk to your coach</Link>
            </Button>
          }
        />
      </GymLayout>
    );
  }

  const applyChanges = () => {
    regenerateProgram({ daysPerWeek: days, sessionMinutes: minutes, weeks, includeCardio: cardio, preferredDays: preferred });
    setTuning(false);
    toast.success("Plan rebuilt", { description: "Your history is untouched, only the upcoming sessions changed." });
  };

  /** Fold this week's remaining sessions into a smaller number of days. */
  const squeezeWeek = (target: number) => {
    const remaining = weekSessions.filter((session) => session.date >= todayIso());
    if (target >= remaining.length || remaining.length === 0) {
      toast("Nothing to combine", { description: "You already have that many sessions left this week." });
      return;
    }
    const groups: string[][] = Array.from({ length: target }, () => []);
    remaining.forEach((session, index) => {
      groups[index % target].push(session.id);
    });
    groups.forEach((group, index) => {
      if (group.length < 2) return;
      const first = remaining.find((session) => session.id === group[0]);
      combineOverdue(group, minutes, first?.date);
    });
    toast.success(`This week folded into ${target} ${target === 1 ? "session" : "sessions"}`, {
      description: "Main lifts kept, overlapping work merged.",
    });
  };

  return (
    <GymLayout
      title="Plan"
      subtitle={program.name}
      action={
        <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Adjust plan" onClick={() => setTuning((open) => !open)}>
          <Sliders className="h-5 w-5" aria-hidden />
        </Button>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">{program.summary}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{GOAL_LABEL[program.spec.goal]}</Badge>
              <Badge variant="secondary">{SPLIT_LABEL[program.split]}</Badge>
              <Badge variant="secondary">{program.spec.experience}</Badge>
              <Badge variant="secondary">week {status.currentWeek} of {program.spec.weeks}</Badge>
            </div>
          </CardContent>
        </Card>

        {unresolved.length ? (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {unresolved.length} {unresolved.length === 1 ? "exercise needs" : "exercises need"} kit you have not got
                </p>
                <p className="text-sm text-muted-foreground">
                  There is no close alternative with your current setup. Swap them yourself below, or let me rebuild the plan
                  around what you have.
                </p>
                <Button
                  size="sm"
                  className="mt-2 h-9"
                  onClick={() => {
                    regenerateProgram();
                    toast.success("Rebuilt around your kit");
                  }}
                >
                  Rebuild for this kit
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {tuning ? (
          <Card className="border-primary/40">
            <CardContent className="space-y-5 p-4">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label>Days a week</Label>
                  <span className="text-sm font-bold tabular-nums">{days}</span>
                </div>
                <Slider value={[days]} min={1} max={6} step={1} onValueChange={([value]) => setDays(value)} />
              </div>

              <div className="space-y-2">
                <Label>Which days suit you</Label>
                <div className="flex gap-1.5">
                  {WEEKDAY_ORDER.map((dayIndex) => {
                    const active = preferred.includes(dayIndex);
                    return (
                      <button
                        key={dayIndex}
                        type="button"
                        onClick={() =>
                          setPreferred((prev) => (active ? prev.filter((entry) => entry !== dayIndex) : [...prev, dayIndex]))
                        }
                        className={cn(
                          "h-10 flex-1 rounded-lg border text-xs font-medium transition-colors",
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
                        )}
                      >
                        {WEEKDAYS[dayIndex].slice(0, 1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label>Session length</Label>
                  <span className="text-sm font-bold tabular-nums">{minutes} min</span>
                </div>
                <Slider value={[minutes]} min={20} max={120} step={5} onValueChange={([value]) => setMinutes(value)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label>Block length</Label>
                  <span className="text-sm font-bold tabular-nums">{weeks} weeks</span>
                </div>
                <Slider value={[weeks]} min={2} max={16} step={1} onValueChange={([value]) => setWeeks(value)} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="cardio-toggle">Include conditioning</Label>
                <Switch id="cardio-toggle" checked={cardio} onCheckedChange={setCardio} />
              </div>

              <div className="flex gap-2">
                <Button className="h-11 flex-1" onClick={applyChanges}>
                  Apply
                </Button>
                <Button variant="outline" className="h-11" onClick={() => setTuning(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <CalendarRange className="h-4 w-4 text-primary" aria-hidden />
              Can't make it this week?
            </p>
            <p className="text-sm text-muted-foreground">
              You have {remainingThisWeek} {remainingThisWeek === 1 ? "session" : "sessions"} left this week. Fold them into
              fewer days and nothing important gets lost.
            </p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((target) => (
                <Button key={target} size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => squeezeWeek(target)}>
                  <Layers className="h-3.5 w-3.5" aria-hidden />
                  Only {target} {target === 1 ? "day" : "days"}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">The week</p>
          <div className="space-y-2">
            {program.days.map((day) => {
              const open = openDay === day.id;
              return (
                <Collapsible key={day.id} open={open} onOpenChange={(next) => setOpenDay(next ? day.id : null)}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <button type="button" className="flex w-full items-center gap-3 p-4 text-left">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-tight">{day.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {day.focus} - {day.items.length} exercises - about {estimateDayMinutes(day.items)} min
                          </p>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 border-t border-border px-4 py-3">
                        {day.items.map((item) => {
                          const exercise = getExercise(item.exerciseId);
                          const missing = exercise ? missingEquipment(exercise, state.settings.availableEquipment) : [];
                          return (
                            <div key={item.id} className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{exercise?.name ?? item.exerciseId}</p>
                                {missing.length ? (
                                  <p className="text-xs font-medium text-warning">
                                    Needs {missing.map((entry) => EQUIPMENT_LABEL[entry].toLowerCase()).join(" and ")}
                                  </p>
                                ) : null}
                                <p className="text-xs text-muted-foreground">
                                  {item.sets} x {exercise?.loadType === "time" && item.durationSec ? `${item.durationSec}s` : `${item.repMin}-${item.repMax}`}
                                  {" - "}
                                  {item.rest}s rest
                                  {item.supersetGroup ? ` - superset ${item.supersetGroup}` : ""}
                                </p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 shrink-0"
                                aria-label={`Swap ${exercise?.name ?? "exercise"}`}
                                onClick={() => setSwap({ dayId: day.id, itemId: item.id, exerciseId: item.exerciseId })}
                              >
                                <Repeat className="h-4 w-4" aria-hidden />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </div>

        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Lightbulb className="h-4 w-4 text-warning" aria-hidden />
              How to run it
            </p>
            <ul className="space-y-1.5">
              {program.principles.map((principle) => (
                <li key={principle} className="text-sm text-muted-foreground">
                  {principle}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next sessions</p>
          <div className="space-y-2">
            {status.upcoming.slice(0, 6).map((session) => (
              <Link
                key={session.id}
                to={`/gym/workout/${session.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{session.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {friendlyDate(session.date)} - {sessionMinutes(session)} min
                    {session.mergedFrom ? " - combined" : ""}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  W{session.weekNumber}
                </Badge>
              </Link>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          className="h-11 w-full gap-2"
          onClick={() => {
            regenerateProgram();
            toast.success("Fresh set of exercises", { description: "Same goal and structure, different movements." });
          }}
        >
          <Shuffle className="h-4 w-4" aria-hidden />
          Shuffle the exercises
        </Button>
      </div>

      <ExerciseSwapSheet
        open={swap !== null}
        onOpenChange={(open) => !open && setSwap(null)}
        exerciseId={swap?.exerciseId ?? null}
        exclude={program.days.find((day) => day.id === swap?.dayId)?.items.map((item) => item.exerciseId) ?? []}
        onPick={(exerciseId) => {
          if (!swap) return;
          swapProgramExercise(swap.dayId, swap.itemId, exerciseId);
          setSwap(null);
          toast.success("Swapped for every upcoming session");
        }}
      />
    </GymLayout>
  );
}
