import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Award, ChevronDown, Dumbbell, Scale, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { EmptyState, GymLayout } from "../components/GymLayout";
import { NumberField } from "../components/NumberField";
import { getExercise, MUSCLE_LABEL } from "../data/exercises";
import { completedSetCount, personalBests, sessionVolume, setsByMuscle, volumeByWeek } from "../engine/progression";
import { today as todayIso } from "../engine/schedule";
import { formatLongDuration, formatVolume, friendlyDate, shortDate } from "../lib/format";
import { useGym } from "../store/gymStore";

export default function History() {
  const [params] = useSearchParams();
  const { state, addMetric } = useGym();
  const [openSession, setOpenSession] = React.useState<string | null>(params.get("session"));
  const [newWeight, setNewWeight] = React.useState<number | null>(null);

  const completed = React.useMemo(
    () =>
      state.sessions
        .filter((session) => session.status === "completed")
        .sort((a, b) => (b.completedAt ?? b.date).localeCompare(a.completedAt ?? a.date)),
    [state.sessions],
  );

  const totalVolume = completed.reduce((total, session) => total + sessionVolume(session), 0);
  const totalSets = completed.reduce((total, session) => total + completedSetCount(session), 0);
  const weekly = React.useMemo(() => volumeByWeek(state.sessions), [state.sessions]);
  const muscles = React.useMemo(() => setsByMuscle(state.sessions).filter((entry) => entry.sets > 0).slice(0, 8), [state.sessions]);
  const bests = React.useMemo(() => personalBests(state.sessions).slice(0, 12), [state.sessions]);
  const weights = React.useMemo(
    () => [...state.metrics].sort((a, b) => a.date.localeCompare(b.date)).map((metric) => ({ date: shortDate(metric.date), weight: metric.weight ?? 0 })),
    [state.metrics],
  );

  if (!completed.length) {
    return (
      <GymLayout title="Progress">
        <EmptyState
          icon={TrendingUp}
          title="Nothing logged yet"
          description="Finish a session and your numbers, volume and personal bests will show up here."
        />
      </GymLayout>
    );
  }

  return (
    <GymLayout title="Progress" subtitle={`${completed.length} ${completed.length === 1 ? "session" : "sessions"} logged`}>
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold leading-none tabular-nums">{completed.length}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold leading-none tabular-nums">{totalSets}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">working sets</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold leading-none tabular-nums">{formatVolume(totalVolume, state.settings.units)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">total volume</p>
              </CardContent>
            </Card>
          </div>

          {weekly.length > 1 ? (
            <Card>
              <CardContent className="p-4">
                <p className="mb-3 font-semibold">Volume by week</p>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekly} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} className="text-[11px]" />
                      <YAxis tickLine={false} axisLine={false} width={48} className="text-[11px]" />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                        formatter={(value: number) => [`${Math.round(value)} ${state.settings.units}`, "Volume"]}
                      />
                      <Bar dataKey="volume" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {muscles.length ? (
            <Card>
              <CardContent className="p-4">
                <p className="mb-3 font-semibold">Where the work went</p>
                <div className="space-y-2">
                  {muscles.map((entry) => {
                    const max = muscles[0].sets || 1;
                    return (
                      <div key={entry.muscle} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-xs text-muted-foreground">{MUSCLE_LABEL[entry.muscle]}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(entry.sets / max) * 100}%` }} />
                        </div>
                        <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums">{entry.sets}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {bests.length ? (
            <Card>
              <CardContent className="p-4">
                <p className="mb-3 flex items-center gap-2 font-semibold">
                  <Award className="h-4 w-4 text-warning" aria-hidden />
                  Personal bests
                </p>
                <div className="space-y-2">
                  {bests.map((best) => (
                    <div key={best.exerciseId} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{getExercise(best.exerciseId)?.name ?? best.exerciseId}</p>
                        <p className="text-xs text-muted-foreground">{shortDate(best.date)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums">
                          {best.weight}
                          {state.settings.units} x {best.reps}
                        </p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          ~{best.estimated1RM}
                          {state.settings.units} max
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="sessions" className="mt-4 space-y-2">
          {completed.map((session) => {
            const open = openSession === session.id;
            return (
              <Collapsible key={session.id} open={open} onOpenChange={(next) => setOpenSession(next ? session.id : null)}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex w-full items-center gap-3 p-4 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold leading-tight">{session.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {friendlyDate(session.completedAt?.slice(0, 10) ?? session.date)} - {completedSetCount(session)} sets
                          {session.durationSec ? ` - ${formatLongDuration(session.durationSec)}` : ""}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {formatVolume(sessionVolume(session), state.settings.units)}
                      </Badge>
                      <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 border-t border-border px-4 py-3">
                      {session.items.map((item) => {
                        const done = item.sets.filter((set) => set.completed);
                        if (!done.length) return null;
                        return (
                          <div key={item.itemId}>
                            <p className="text-sm font-medium">{getExercise(item.exerciseId)?.name ?? item.exerciseId}</p>
                            <p className="text-xs text-muted-foreground">
                              {done
                                .map((set) =>
                                  set.durationSec && set.reps == null
                                    ? `${set.durationSec}s`
                                    : `${set.weight ?? "-"}${state.settings.units} x ${set.reps ?? "-"}`,
                                )
                                .join("  ")}
                            </p>
                          </div>
                        );
                      })}
                      {session.notes ? <p className="pt-1 text-xs italic text-muted-foreground">{session.notes}</p> : null}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </TabsContent>

        <TabsContent value="body" className="mt-4 space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Scale className="h-4 w-4 text-primary" aria-hidden />
                Log your weight
              </p>
              <div className="flex items-end gap-2">
                <NumberField
                  ariaLabel="Body weight"
                  value={newWeight}
                  onCommit={setNewWeight}
                  suffix={state.settings.units}
                  className="flex-1"
                  placeholder="0"
                />
                <Button
                  className="h-12"
                  disabled={newWeight == null}
                  onClick={() => {
                    if (newWeight == null) return;
                    addMetric({ date: todayIso(), weight: newWeight });
                    setNewWeight(null);
                  }}
                >
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          {weights.length > 1 ? (
            <Card>
              <CardContent className="p-4">
                <p className="mb-3 font-semibold">Body weight</p>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weights} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-[11px]" />
                      <YAxis domain={["dataMin - 2", "dataMax + 2"]} tickLine={false} axisLine={false} width={48} className="text-[11px]" />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                        formatter={(value: number) => [`${value} ${state.settings.units}`, "Weight"]}
                      />
                      <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState icon={Dumbbell} title="No weigh-ins yet" description="Log a couple and the trend will appear here." />
          )}
        </TabsContent>
      </Tabs>
    </GymLayout>
  );
}
