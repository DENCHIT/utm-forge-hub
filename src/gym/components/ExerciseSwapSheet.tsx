import * as React from "react";
import { Ban, Check, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EQUIPMENT_LABEL } from "../data/equipment";
import { EXERCISES, MUSCLE_LABEL, getExercise } from "../data/exercises";
import { findSubstitutes, isUsable } from "../engine/substitution";
import { useGym } from "../store/gymStore";
import type { Exercise } from "../types";

interface Props {
  exerciseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (exerciseId: string) => void;
  /** Exercises already in the session, so we do not offer a duplicate. */
  exclude?: string[];
}

function ExerciseRow({
  exercise,
  reason,
  onPick,
}: {
  exercise: Exercise;
  reason?: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-start justify-between gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-muted/50 active:scale-[0.99]"
    >
      <div className="min-w-0">
        <p className="font-medium leading-tight">{exercise.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {exercise.primary.map((muscle) => MUSCLE_LABEL[muscle]).join(", ")}
          {reason ? ` - ${reason}` : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {exercise.equipment.map((item) => (
            <Badge key={item} variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
              {EQUIPMENT_LABEL[item]}
            </Badge>
          ))}
        </div>
      </div>
      <Check className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

export function ExerciseSwapSheet({ exerciseId, open, onOpenChange, onPick, exclude = [] }: Props) {
  const { availability, excludeEquipment, banExercise } = useGym();
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const current = exerciseId ? getExercise(exerciseId) : undefined;

  const substitutes = React.useMemo(
    () => (exerciseId ? findSubstitutes(exerciseId, availability, { limit: 10, exclude }) : []),
    [exerciseId, availability, exclude],
  );

  const searchResults = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return EXERCISES.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(term) ||
        exercise.primary.some((muscle) => MUSCLE_LABEL[muscle].toLowerCase().includes(term)),
    ).slice(0, 25);
  }, [query]);

  const handlePick = (id: string) => {
    onPick(id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[88dvh] flex-col gap-0 rounded-t-2xl p-0">
        <SheetHeader className="space-y-1 border-b border-border px-4 pb-3 pr-12 pt-4 text-left">
          <SheetTitle className="text-lg leading-tight">Swap {current ? current.name : "exercise"}</SheetTitle>
          <SheetDescription>
            Pick something else, or tell me which kit is taken and I will keep it out of your whole plan.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 px-4 py-4">
            {current ? (
              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Kit this needs - tap what you have not got
                </p>
                <div className="flex flex-wrap gap-2">
                  {current.equipment.map((item) => (
                    <Button
                      key={item}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => {
                        excludeEquipment(item);
                        onOpenChange(false);
                      }}
                    >
                      <X className="h-3 w-3" aria-hidden />
                      No {EQUIPMENT_LABEL[item].toLowerCase()}
                    </Button>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Best alternatives</p>
              <div className="space-y-2">
                {substitutes.length ? (
                  substitutes.map((option) => (
                    <ExerciseRow
                      key={option.exercise.id}
                      exercise={option.exercise}
                      reason={option.reason}
                      onPick={() => handlePick(option.exercise.id)}
                    />
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Nothing close enough with the kit you have marked as available. Add some kit in Settings, or search below.
                  </p>
                )}
              </div>
            </section>

            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search everything</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Exercise or muscle"
                  className="h-11 pl-9"
                />
              </div>
              <div className="mt-2 space-y-2">
                {searchResults.map((exercise) => (
                  <ExerciseRow
                    key={exercise.id}
                    exercise={exercise}
                    reason={isUsable(exercise, availability) ? undefined : "Kit marked unavailable"}
                    onPick={() => handlePick(exercise.id)}
                  />
                ))}
              </div>
            </section>

            {current ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full gap-2 text-destructive hover:text-destructive"
                onClick={() => {
                  banExercise(current.id);
                  onOpenChange(false);
                }}
              >
                <Ban className="h-4 w-4" aria-hidden />
                Never show me {current.name} again
              </Button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
