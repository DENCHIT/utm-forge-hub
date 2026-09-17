import * as React from "react";
import { Ban, ChevronDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GymLayout } from "../components/GymLayout";
import { EQUIPMENT_LABEL } from "../data/equipment";
import { EXERCISES, MUSCLE_LABEL, PATTERN_LABEL } from "../data/exercises";
import { isUsable, missingEquipment } from "../engine/substitution";
import { useGym } from "../store/gymStore";
import type { MuscleGroup } from "../types";

const FILTERS: { label: string; muscles: MuscleGroup[] }[] = [
  { label: "Chest", muscles: ["chest"] },
  { label: "Back", muscles: ["lats", "upper_back", "traps"] },
  { label: "Shoulders", muscles: ["front_delts", "side_delts", "rear_delts"] },
  { label: "Arms", muscles: ["biceps", "triceps", "forearms"] },
  { label: "Legs", muscles: ["quads", "hamstrings", "glutes", "calves"] },
  { label: "Core", muscles: ["abs", "obliques", "lower_back"] },
  { label: "Cardio", muscles: ["cardio", "full_body"] },
];

export default function Exercises() {
  const { state, availability, banExercise, unbanExercise } = useGym();
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<string | null>(null);
  const [onlyAvailable, setOnlyAvailable] = React.useState(true);
  const [open, setOpen] = React.useState<string | null>(null);

  const list = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    const active = FILTERS.find((entry) => entry.label === filter);
    return EXERCISES.filter((exercise) => {
      if (term && !exercise.name.toLowerCase().includes(term)) return false;
      if (active && !active.muscles.some((muscle) => exercise.primary.includes(muscle))) return false;
      if (onlyAvailable && !isUsable(exercise, availability)) return false;
      return true;
    });
  }, [query, filter, onlyAvailable, availability]);

  return (
    <GymLayout title="Exercises" subtitle={`${list.length} of ${EXERCISES.length} shown`}>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercises" className="h-11 pl-9" />
        </div>

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {FILTERS.map((entry) => (
            <Button
              key={entry.label}
              size="sm"
              variant={filter === entry.label ? "default" : "outline"}
              className="h-8 shrink-0 rounded-full text-xs"
              onClick={() => setFilter(filter === entry.label ? null : entry.label)}
            >
              {entry.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <Label htmlFor="only-available" className="text-sm font-normal">
            Only what I can do with my kit
          </Label>
          <Switch id="only-available" checked={onlyAvailable} onCheckedChange={setOnlyAvailable} />
        </div>

        <div className="space-y-2">
          {list.map((exercise) => {
            const expanded = open === exercise.id;
            const blocked = state.settings.excludedExerciseIds.includes(exercise.id);
            const missing = missingEquipment(exercise, state.settings.availableEquipment);
            return (
              <Collapsible key={exercise.id} open={expanded} onOpenChange={(next) => setOpen(next ? exercise.id : null)}>
                <Card className={cn(blocked && "opacity-60")}>
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex w-full items-center gap-3 p-3.5 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium leading-tight">{exercise.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {PATTERN_LABEL[exercise.pattern]} - {exercise.primary.map((muscle) => MUSCLE_LABEL[muscle]).join(", ")}
                        </p>
                      </div>
                      {missing.length ? (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          needs kit
                        </Badge>
                      ) : null}
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 border-t border-border px-3.5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {exercise.equipment.map((item) => (
                          <Badge
                            key={item}
                            variant={state.settings.availableEquipment.includes(item) ? "secondary" : "destructive"}
                            className="px-1.5 py-0 text-[10px] font-normal"
                          >
                            {EQUIPMENT_LABEL[item]}
                          </Badge>
                        ))}
                      </div>
                      {exercise.cues.map((cue) => (
                        <p key={cue} className="text-sm text-muted-foreground">
                          {cue}
                        </p>
                      ))}
                      {exercise.contraindications?.length ? (
                        <p className="text-xs text-warning">
                          Often aggravates: {exercise.contraindications.join(", ").replace(/_/g, " ")}
                        </p>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-8 gap-1.5", !blocked && "text-destructive hover:text-destructive")}
                        onClick={() => {
                          if (blocked) {
                            unbanExercise(exercise.id);
                            toast(`${exercise.name} allowed again`);
                          } else {
                            banExercise(exercise.id);
                            toast(`${exercise.name} blocked`, { description: "It will be swapped out of your plan." });
                          }
                        }}
                      >
                        <Ban className="h-3.5 w-3.5" aria-hidden />
                        {blocked ? "Allow again" : "Never programme this"}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </GymLayout>
  );
}
