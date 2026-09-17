import * as React from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Layers, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { getExercise } from "../data/exercises";
import { combineSessions, sessionMinutes } from "../engine/schedule";
import { friendlyDate } from "../lib/format";
import { useGym } from "../store/gymStore";
import type { WorkoutSession } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overdue: WorkoutSession[];
}

export function CatchUpSheet({ open, onOpenChange, overdue }: Props) {
  const navigate = useNavigate();
  const { state, combineOverdue, shiftPlan, skipSession } = useGym();
  const defaultCap = state.program?.spec.sessionMinutes ?? 60;
  const [cap, setCap] = React.useState(defaultCap);
  const [selected, setSelected] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setSelected(overdue.slice(0, 2).map((session) => session.id));
      setCap(defaultCap);
    }
  }, [open, overdue, defaultCap]);

  const chosen = overdue.filter((session) => selected.includes(session.id));
  const preview = React.useMemo(() => (chosen.length ? combineSessions(chosen, cap) : null), [chosen, cap]);

  const handleCombine = () => {
    if (!chosen.length) return;
    const id = combineOverdue(selected, cap);
    onOpenChange(false);
    if (id) {
      toast.success("Sessions combined", { description: "The main lifts survived, the accessories took the hit." });
      navigate(`/gym/workout/${id}`);
    }
  };

  const handlePush = () => {
    const days = Math.max(1, overdue.length ? 7 : 1);
    shiftPlan(days);
    onOpenChange(false);
    toast.success(`Plan pushed back a week`, { description: "Nothing lost, everything just moved." });
  };

  const handleWriteOff = () => {
    overdue.forEach((session) => skipSession(session.id));
    onOpenChange(false);
    toast("Missed sessions cleared", { description: "Start fresh from the next one." });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[90dvh] flex-col gap-0 rounded-t-2xl p-0">
        <SheetHeader className="space-y-1 border-b border-border px-4 pb-3 pt-4 text-left">
          <SheetTitle>Behind on the plan</SheetTitle>
          <SheetDescription>
            {overdue.length} {overdue.length === 1 ? "session" : "sessions"} missed. Pick the ones to fold into one, or move the
            whole plan.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            {overdue.map((session) => (
              <label
                key={session.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3"
                htmlFor={`catchup-${session.id}`}
              >
                <Checkbox
                  id={`catchup-${session.id}`}
                  checked={selected.includes(session.id)}
                  onCheckedChange={(checked) =>
                    setSelected((prev) => (checked ? [...prev, session.id] : prev.filter((id) => id !== session.id)))
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{session.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {friendlyDate(session.date)} - {session.focus} - {sessionMinutes(session)} min
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">Time you have today</span>
              <span className="text-sm font-bold tabular-nums">{cap} min</span>
            </div>
            <Slider value={[cap]} min={20} max={120} step={5} onValueChange={([value]) => setCap(value)} />
          </div>

          {preview ? (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Layers className="h-4 w-4 text-primary" aria-hidden />
                Combined session, about {sessionMinutes(preview)} minutes
              </p>
              <ul className="mt-2 space-y-1">
                {preview.items.map((item) => (
                  <li key={item.itemId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{getExercise(item.exerciseId)?.name ?? item.exerciseId}</span>
                    <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                      {item.targetSets} x {item.repMin}-{item.repMax}
                    </Badge>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Duplicate movements were merged and the lowest priority work was dropped first.
              </p>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Select at least one session to see what the combined workout would look like.
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button className="h-12 w-full gap-2" disabled={!chosen.length} onClick={handleCombine}>
            <Layers className="h-4 w-4" aria-hidden />
            Combine {chosen.length || ""} into one session
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 flex-1 gap-2" onClick={handlePush}>
              <CalendarClock className="h-4 w-4" aria-hidden />
              Push plan back
            </Button>
            <Button variant="ghost" className="h-11 flex-1 gap-2 text-muted-foreground" onClick={handleWriteOff}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Write them off
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
