import * as React from "react";
import { Link } from "react-router-dom";
import { Ban, Check, ExternalLink, Eye, EyeOff, KeyRound, ListOrdered, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GymLayout } from "../components/GymLayout";
import { EQUIPMENT, EQUIPMENT_GROUPS, PRESETS } from "../data/equipment";
import { getExercise } from "../data/exercises";
import { COACH_MODEL, hasApiKey } from "../coach/llmCoach";
import { useGym } from "../store/gymStore";
import type { Equipment, ThemePreference } from "../types";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">{children}</p>;
}

export default function GymSettings() {
  const { state, updateSettings, setAvailableEquipment, excludeEquipment, restoreEquipment, unbanExercise, resetAll } = useGym();
  const { settings } = state;
  const [showKey, setShowKey] = React.useState(false);
  const [keyDraft, setKeyDraft] = React.useState(settings.anthropicApiKey);

  const activePreset = PRESETS.find(
    (preset) =>
      preset.equipment.length === settings.availableEquipment.length &&
      preset.equipment.every((item) => settings.availableEquipment.includes(item)),
  );

  const toggle = (equipment: Equipment, available: boolean) => {
    if (available) restoreEquipment(equipment);
    else excludeEquipment(equipment);
  };

  return (
    <GymLayout title="Settings">
      <div className="space-y-1">
        <SectionTitle>Your kit</SectionTitle>
        <Card>
          <CardContent className="space-y-4 p-4">
            <p className="text-sm text-muted-foreground">
              Anything you turn off here disappears from your plan straight away, and the closest alternative takes its place.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setAvailableEquipment(preset.equipment);
                    toast.success(`Switched to ${preset.label.toLowerCase()}`);
                  }}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    activePreset?.id === preset.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {activePreset?.id === preset.id ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
                    {preset.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{preset.description}</span>
                </button>
              ))}
            </div>

            {EQUIPMENT_GROUPS.map((group) => (
              <div key={group.id}>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{group.label}</p>
                <div className="space-y-1">
                  {EQUIPMENT.filter((item) => item.group === group.id).map((item) => {
                    const available = settings.availableEquipment.includes(item.id);
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 py-1">
                        <Label htmlFor={`eq-${item.id}`} className="text-sm font-normal">
                          {item.label}
                        </Label>
                        <Switch id={`eq-${item.id}`} checked={available} onCheckedChange={(checked) => toggle(item.id, checked)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {settings.excludedExerciseIds.length ? (
          <>
            <SectionTitle>Blocked exercises</SectionTitle>
            <Card>
              <CardContent className="space-y-2 p-4">
                {settings.excludedExerciseIds.map((id) => (
                  <div key={id} className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <Ban className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
                      <span className="truncate">{getExercise(id)?.name ?? id}</span>
                    </span>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => unbanExercise(id)}>
                      Allow again
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : null}

        <SectionTitle>Rest timer</SectionTitle>
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="auto-rest">Start automatically</Label>
                <p className="text-xs text-muted-foreground">Begins the moment you tick a set off.</p>
              </div>
              <Switch
                id="auto-rest"
                checked={settings.restTimerAutoStart}
                onCheckedChange={(checked) => updateSettings({ restTimerAutoStart: checked })}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="rest-sound" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" aria-hidden />
                Sound
              </Label>
              <Switch
                id="rest-sound"
                checked={settings.restTimerSound}
                onCheckedChange={(checked) => updateSettings({ restTimerSound: checked })}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="rest-vibrate">Vibrate</Label>
              <Switch
                id="rest-vibrate"
                checked={settings.restTimerVibrate}
                onCheckedChange={(checked) => updateSettings({ restTimerVibrate: checked })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label>Warning before the end</Label>
                <span className="text-sm font-bold tabular-nums">{settings.restWarningSec}s</span>
              </div>
              <Slider
                value={[settings.restWarningSec]}
                min={0}
                max={30}
                step={5}
                onValueChange={([value]) => updateSettings({ restWarningSec: value })}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="wake-lock">Keep the screen on</Label>
                <p className="text-xs text-muted-foreground">While a workout is open, where the browser allows it.</p>
              </div>
              <Switch
                id="wake-lock"
                checked={settings.keepScreenAwake}
                onCheckedChange={(checked) => updateSettings({ keepScreenAwake: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <SectionTitle>Display</SectionTitle>
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <Label>Units</Label>
              <div className="flex overflow-hidden rounded-lg border border-border">
                {(["kg", "lb"] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => updateSettings({ units: unit })}
                    className={cn(
                      "h-9 w-14 text-sm font-medium transition-colors",
                      settings.units === unit ? "bg-primary text-primary-foreground" : "bg-background",
                    )}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label>Theme</Label>
              <div className="flex overflow-hidden rounded-lg border border-border">
                {(["system", "light", "dark"] as ThemePreference[]).map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => updateSettings({ theme })}
                    className={cn(
                      "h-9 px-3 text-xs font-medium capitalize transition-colors",
                      settings.theme === theme ? "bg-primary text-primary-foreground" : "bg-background",
                    )}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <SectionTitle>Coach</SectionTitle>
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              Talk to Claude
            </p>
            <p className="text-sm text-muted-foreground">
              The built-in coach works offline and needs nothing. Add an Anthropic API key and the conversation runs on{" "}
              {COACH_MODEL} instead, so you can explain your situation in your own words. The key is stored on this device
              only and is sent nowhere except Anthropic.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  type={showKey ? "text" : "password"}
                  value={keyDraft}
                  onChange={(event) => setKeyDraft(event.target.value)}
                  placeholder="sk-ant-..."
                  autoComplete="off"
                  className="h-11 pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((open) => !open)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground"
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
              <Button
                className="h-11"
                onClick={() => {
                  updateSettings({ anthropicApiKey: keyDraft.trim() });
                  toast.success(hasApiKey(keyDraft) ? "Key saved" : "Key cleared");
                }}
              >
                Save
              </Button>
            </div>
            {hasApiKey(settings.anthropicApiKey) ? (
              <Badge variant="secondary" className="gap-1">
                <Check className="h-3 w-3" aria-hidden />
                Claude coach active
              </Badge>
            ) : (
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary underline"
              >
                Get a key
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
          </CardContent>
        </Card>

        <SectionTitle>More</SectionTitle>
        <Card>
          <CardContent className="divide-y divide-border p-0">
            <Link to="/gym/exercises" className="flex items-center justify-between gap-3 p-4">
              <span className="flex items-center gap-2 text-sm font-medium">
                <ListOrdered className="h-4 w-4 text-muted-foreground" aria-hidden />
                Exercise library
              </span>
              <Badge variant="secondary">browse</Badge>
            </Link>
            <div className="p-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="h-10 w-full justify-start gap-2 px-0 text-destructive hover:text-destructive">
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Reset everything
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Wipe all your data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your programme, every logged session and all your settings are stored on this device. This deletes the
                      lot and cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep my data</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        resetAll();
                        toast("Everything cleared");
                      }}
                    >
                      Delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        <p className="px-1 py-6 text-center text-xs text-muted-foreground">
          Everything lives in this browser. Clearing site data clears your training history.
        </p>
      </div>
    </GymLayout>
  );
}
