import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { addDays, parseISO, startOfWeek } from "date-fns";
import { AlertTriangle, ArrowRight, CalendarClock, Check, Clock, Flame, MessageSquare, Play, Sparkles, Timer, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CatchUpSheet } from "../components/CatchUpSheet";
import { GymLayout } from "../components/GymLayout";
import { getExercise } from "../data/exercises";
import { sessionMinutes, isoDate, today as todayIso } from "../engine/schedule";
import { sessionVolume } from "../engine/progression";
import { formatVolume, friendlyDate, WEEKDAYS } from "../lib/format";
import { useGym } from "../store/gymStore";
import { hasEnoughProfile } from "../engine/strength";
import type { WorkoutSession } from "../types";

function WeekStrip({ sessions }: { sessions: WorkoutSession[] }) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const now = todayIso();

  return (
    <div className="flex justify-between gap-1">
      {days.map((day) => {
        const iso = isoDate(day);
        const dayOfWeek = day.getDay();
        const planned = sessions.filter((session) => session.date === iso);
        const done = planned.some((session) => session.status === "completed");
        const missed = planned.some((session) => session.status === "scheduled") && iso < now;
        const isToday = iso === now;
        return (
          <div key={iso} className="flex flex-1 flex-col items-center gap-1.5">
            <span className={cn("text-[11px] font-medium", isToday ? "text-primary" : "text-muted-foreground")}>
              {WEEKDAYS[dayOfWeek]}
            </span>
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold",
                done && "border-success bg-success text-success-foreground",
                !done && missed && "border-warning/60 bg-warning/10 text-warning",
                !done && !missed && planned.length > 0 && "border-accent/50 bg-accent/10 text-accent",
                !done && !missed && planned.length === 0 && "border-border text-muted-foreground",
                isToday && !done && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
            >
              {done ? <Check className="h-4 w-4" aria-hidden /> : day.getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SessionPreview({ session }: { session: WorkoutSession }) {
  return (
    <ul className="space-y-1">
      {session.items.slice(0, 5).map((item) => (
        <li key={item.itemId} className="flex items-baseline justify-between gap-3 text-sm">
          <span className="truncate text-foreground/90">{getExercise(item.exerciseId)?.name ?? item.exerciseId}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {item.sets.length} x {item.durationSec && getExercise(item.exerciseId)?.loadType === "time" ? `${item.durationSec}s` : `${item.repMin}-${item.repMax}`}
          </span>
        </li>
      ))}
      {session.items.length > 5 ? (
        <li className="text-xs text-muted-foreground">and {session.items.length - 5} more</li>
      ) : null}
    </ul>
  );
}

export default function Today() {
  const navigate = useNavigate();
  const { state, status, condense, shiftPlan, skipSession } = useGym();
  const [catchUpOpen, setCatchUpOpen] = React.useState(false);

  const next = status.todaySession ?? status.upcoming[0] ?? null;
  const isToday = Boolean(status.todaySession);
  const completedToday = state.sessions.filter(
    (session) => session.status === "completed" && (session.completedAt?.slice(0, 10) ?? session.date) === todayIso(),
  );

  const weekVolume = React.useMemo(() => {
    const weekStart = isoDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
    return state.sessions
      .filter((session) => session.status === "completed" && (session.completedAt?.slice(0, 10) ?? session.date) >= weekStart)
      .reduce((total, session) => total + sessionVolume(session), 0);
  }, [state.sessions]);

  if (!state.program) {
    return (
      <GymLayout title="Your gym" subtitle="Nothing planned yet">
        <Card className="overflow-hidden border-none gradient-hero text-white shadow-lg">
          <CardContent className="space-y-3 p-6">
            <Sparkles className="h-7 w-7" aria-hidden />
            <h2 className="text-2xl font-bold leading-tight">Let's build your programme</h2>
            <p className="text-sm text-white/85">
              Tell the coach what you are after, how often you can train and what kit you have. You will get a plan you can
              start today, and it changes when your week does.
            </p>
            <Button asChild size="lg" variant="secondary" className="h-12 w-full gap-2 text-base">
              <Link to="/gym/coach">
                <MessageSquare className="h-5 w-5" aria-hidden />
                Talk to your coach
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-4 border-accent/40">
          <CardContent className="flex items-start gap-3 p-4">
            <User className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Tell me about you first</p>
              <p className="text-sm text-muted-foreground">
                Height, weight, age and experience. It takes thirty seconds and means every lift starts with a sensible
                weight instead of a guess.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-2 h-9">
                <Link to="/gym/profile">Add your details</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-3 grid gap-3">
          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <Timer className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold">Follow every set</p>
                <p className="text-sm text-muted-foreground">Tick sets off, watch the rest timer, and get told what to lift next time.</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold">Built around your week</p>
                <p className="text-sm text-muted-foreground">Miss a session and the plan folds two workouts into one rather than falling apart.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </GymLayout>
    );
  }

  return (
    <GymLayout
      title={isToday ? "Today" : "Up next"}
      subtitle={state.program.name}
      action={
        <Button asChild variant="ghost" size="icon" className="h-10 w-10">
          <Link to="/gym/coach" aria-label="Talk to your coach">
            <MessageSquare className="h-5 w-5" aria-hidden />
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <WeekStrip sessions={state.sessions} />

        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <Flame className="mx-auto h-4 w-4 text-warning" aria-hidden />
              <p className="mt-1 text-lg font-bold leading-none tabular-nums">{status.streak}</p>
              <p className="text-[11px] text-muted-foreground">week streak</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Check className="mx-auto h-4 w-4 text-success" aria-hidden />
              <p className="mt-1 text-lg font-bold leading-none tabular-nums">
                {status.completedThisWeek}/{status.plannedThisWeek || state.program.spec.daysPerWeek}
              </p>
              <p className="text-[11px] text-muted-foreground">this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <ArrowRight className="mx-auto h-4 w-4 text-accent" aria-hidden />
              <p className="mt-1 text-lg font-bold leading-none tabular-nums">{formatVolume(weekVolume, state.settings.units)}</p>
              <p className="text-[11px] text-muted-foreground">moved</p>
            </CardContent>
          </Card>
        </div>

        {!hasEnoughProfile(state.profile) ? (
          <Card className="border-accent/40 bg-accent/5">
            <CardContent className="flex items-center gap-3 p-4">
              <User className="h-5 w-5 shrink-0 text-accent" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Add your weight and experience</p>
                <p className="text-xs text-muted-foreground">Then every new lift comes with a starting weight.</p>
              </div>
              <Button asChild size="sm" variant="outline" className="h-9 shrink-0">
                <Link to="/gym/profile">Add</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {status.overdue.length ? (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {status.overdue.length} {status.overdue.length === 1 ? "session" : "sessions"} behind
                </p>
                <p className="text-sm text-muted-foreground">
                  Combine them into one, or push the whole plan back. Either is better than starting again.
                </p>
                <Button size="sm" className="mt-2 h-9" onClick={() => setCatchUpOpen(true)}>
                  Sort it out
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {completedToday.length ? (
          <Card className="border-success/50 bg-success/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Check className="h-5 w-5 shrink-0 text-success" aria-hidden />
              <div>
                <p className="font-semibold">{completedToday[0].name} done</p>
                <p className="text-sm text-muted-foreground">
                  {formatVolume(sessionVolume(completedToday[0]), state.settings.units)} moved today.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {next ? (
          <Card className="overflow-hidden">
            <div className={cn("px-4 py-3", isToday ? "gradient-hero text-white" : "bg-muted")}>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-90">
                {friendlyDate(next.date)} - week {next.weekNumber}
              </p>
              <h2 className="text-xl font-bold leading-tight">{next.name}</h2>
              <p className="text-sm opacity-90">{next.focus}</p>
            </div>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" aria-hidden />
                  about {sessionMinutes(next)} min
                </Badge>
                <Badge variant="secondary">{next.items.length} exercises</Badge>
                <Badge variant="secondary">{next.items.reduce((total, item) => total + item.sets.length, 0)} sets</Badge>
              </div>

              <SessionPreview session={next} />

              <Button className="h-12 w-full gap-2 text-base" onClick={() => navigate(`/gym/workout/${next.id}`)}>
                <Play className="h-5 w-5" aria-hidden />
                {next.status === "in_progress" ? "Carry on" : "Start workout"}
              </Button>

              <div className="space-y-2 rounded-lg bg-muted/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Short on time?</p>
                <div className="flex flex-wrap gap-2">
                  {[20, 30, 45].map((minutes) => (
                    <Button
                      key={minutes}
                      size="sm"
                      variant="outline"
                      className="h-9 bg-background"
                      onClick={() => {
                        condense(next.id, minutes);
                        toast.success(`Trimmed to about ${minutes} minutes`, {
                          description: "Main lifts kept, accessories cut or supersetted.",
                        });
                      }}
                    >
                      {minutes} min version
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9"
                    onClick={() => {
                      shiftPlan(1);
                      toast("Everything moved on a day");
                    }}
                  >
                    Not today, shift a day
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 text-muted-foreground"
                    onClick={() => {
                      skipSession(next.id);
                      toast("Session skipped");
                    }}
                  >
                    Skip it
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-3 p-6 text-center">
              <p className="font-semibold">No sessions left in this block</p>
              <p className="text-sm text-muted-foreground">
                You have worked through the programme. Ask the coach for the next block and it will build on what you lifted.
              </p>
              <Button asChild className="h-11 w-full">
                <Link to="/gym/coach">Plan the next block</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {status.upcoming.length > 1 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coming up</p>
            <div className="space-y-2">
              {status.upcoming.slice(next === status.todaySession ? 0 : 1, 4).map((session) => (
                <Link
                  key={session.id}
                  to={`/gym/workout/${session.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium leading-tight">{session.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {friendlyDate(session.date)} - {sessionMinutes(session)} min
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <CatchUpSheet open={catchUpOpen} onOpenChange={setCatchUpOpen} overdue={status.overdue} />
    </GymLayout>
  );
}
