import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Ruler, Sparkles, User, Weight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GymLayout } from "../components/GymLayout";
import { NumberField } from "../components/NumberField";
import { getExercise } from "../data/exercises";
import { estimateStartingWeight, formatHeight, hasEnoughProfile, KG_PER_LB, toKg } from "../engine/strength";
import { useGym } from "../store/gymStore";
import type { ExperienceLevel, Sex } from "../types";

const SEX_OPTIONS: { id: Sex; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "unspecified", label: "Rather not say" },
];

const LEVELS: { id: ExperienceLevel; label: string; blurb: string }[] = [
  { id: "beginner", label: "Beginner", blurb: "New to lifting, or back after a long break" },
  { id: "intermediate", label: "Intermediate", blurb: "A year or two of fairly consistent training" },
  { id: "advanced", label: "Advanced", blurb: "Several years, you know your numbers" },
];

/** Lifts worth previewing, in the order most people care about them. */
const PREVIEW_LIFTS = ["barbell_bench_press", "back_squat", "deadlift", "barbell_row", "overhead_press"];

function Chips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "h-11 flex-1 rounded-lg border px-2 text-sm font-medium transition-colors",
            value === option.id
              ? "border-primary bg-primary text-primary-foreground shadow-glow"
              : "border-border bg-background text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { state, updateProfile } = useGym();
  const { profile, settings } = state;
  const metric = settings.units === "kg";

  const [feet, setFeet] = React.useState<number | null>(
    profile.heightCm ? Math.floor(profile.heightCm / 2.54 / 12) : null,
  );
  const [inches, setInches] = React.useState<number | null>(
    profile.heightCm ? Math.round(profile.heightCm / 2.54 - Math.floor(profile.heightCm / 2.54 / 12) * 12) : null,
  );

  const commitImperialHeight = (nextFeet: number | null, nextInches: number | null) => {
    setFeet(nextFeet);
    setInches(nextInches);
    if (nextFeet == null && nextInches == null) {
      updateProfile({ heightCm: null });
      return;
    }
    const totalInches = (nextFeet ?? 0) * 12 + (nextInches ?? 0);
    updateProfile({ heightCm: totalInches > 0 ? Math.round(totalInches * 2.54) : null });
  };

  const displayWeight = profile.weightKg == null ? null : Math.round((metric ? profile.weightKg : profile.weightKg / KG_PER_LB) * 10) / 10;
  const currentAge = profile.birthYear ? new Date().getFullYear() - profile.birthYear : null;

  const previews = React.useMemo(() => {
    if (!hasEnoughProfile(profile)) return [];
    return PREVIEW_LIFTS.map((id) => ({
      name: getExercise(id)?.name ?? id,
      estimate: estimateStartingWeight(id, profile, 8, settings.units),
    })).filter((entry) => entry.estimate.weight != null);
  }, [profile, settings.units]);

  return (
    <GymLayout title="Your details" subtitle="Used for your starting weights and by the coach">
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="display-name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" aria-hidden />
                What should I call you?
              </Label>
              <Input
                id="display-name"
                value={profile.displayName}
                onChange={(event) => updateProfile({ displayName: event.target.value })}
                placeholder="First name"
                autoComplete="given-name"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label>Sex</Label>
              <Chips value={profile.sex} options={SEX_OPTIONS} onChange={(sex) => updateProfile({ sex })} />
              <p className="text-xs text-muted-foreground">
                Only used to make the starting weight estimates less wrong. Leave it out and I will use a middle figure.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="age-field">Age</Label>
                <NumberField
                  ariaLabel="Age"
                  value={currentAge}
                  placeholder="-"
                  onCommit={(value) =>
                    updateProfile({ birthYear: value && value > 12 && value < 100 ? new Date().getFullYear() - value : null })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Weight className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Weight
                </Label>
                <NumberField
                  ariaLabel="Body weight"
                  value={displayWeight}
                  suffix={settings.units}
                  placeholder="-"
                  onCommit={(value) => updateProfile({ weightKg: value == null ? null : toKg(value, settings.units) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5 text-primary" aria-hidden />
                Height
              </Label>
              {metric ? (
                <NumberField
                  ariaLabel="Height in centimetres"
                  value={profile.heightCm}
                  suffix="cm"
                  placeholder="-"
                  onCommit={(value) => updateProfile({ heightCm: value })}
                />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <NumberField ariaLabel="Height in feet" value={feet} suffix="ft" placeholder="-" onCommit={(value) => commitImperialHeight(value, inches)} />
                  <NumberField ariaLabel="Height in inches" value={inches} suffix="in" placeholder="-" onCommit={(value) => commitImperialHeight(feet, value)} />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Units follow your Settings, currently {settings.units === "kg" ? "metric" : "imperial"}.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <Label className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" aria-hidden />
              Experience
            </Label>
            <div className="space-y-2">
              {LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => updateProfile({ experience: level.id })}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    profile.experience === level.id ? "border-primary bg-primary/10" : "border-border",
                  )}
                >
                  <span className="block text-sm font-semibold">{level.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{level.blurb}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <Label htmlFor="profile-notes">Anything else the coach should know</Label>
            <Textarea
              id="profile-notes"
              value={profile.notes}
              onChange={(event) => updateProfile({ notes: event.target.value })}
              placeholder="Desk job, two kids, played rugby until my knee went, train early mornings..."
              className="min-h-[88px]"
            />
            <p className="text-xs text-muted-foreground">This is sent to the coach with every message, so keep it short and useful.</p>
          </CardContent>
        </Card>

        {previews.length ? (
          <Card className="border-accent/40">
            <CardContent className="space-y-3 p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-accent" aria-hidden />
                Your starting weights
              </p>
              <p className="text-sm text-muted-foreground">
                Where I would start you for a set of eight. These are a first guess from your bodyweight, age and experience,
                not a target. After one logged set your real numbers take over.
              </p>
              <div className="space-y-1.5">
                {previews.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm">{entry.name}</span>
                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      {entry.estimate.weight}
                      {settings.units}
                      {entry.estimate.note ? ` ${entry.estimate.note}` : ""}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Add your bodyweight and I will pre-fill a sensible starting weight for every lift in your programme, rather than
              leaving you to guess on set one.
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Button
            className="h-12 flex-1"
            onClick={() => {
              toast.success("Details saved", {
                description: hasEnoughProfile(profile) ? "Your starting weights are ready." : "Add your bodyweight for starting weights.",
              });
              navigate(-1);
            }}
          >
            Done
          </Button>
        </div>

        <p className="px-1 pb-2 text-center text-xs text-muted-foreground">
          Height {formatHeight(profile.heightCm, settings.units)}
          {profile.weightKg ? `, ${displayWeight}${settings.units}` : ""}
          {currentAge ? `, ${currentAge} years old` : ""}
        </p>
      </div>
    </GymLayout>
  );
}
