import * as React from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { countdownBeep, finishChime, vibrate } from "../lib/feedback";
import { formatDuration } from "../lib/format";

export interface RestTimerState {
  /** Epoch milliseconds the rest ends at, or null when not resting. */
  endsAt: number | null;
  totalSec: number;
  /** Set while paused: how many milliseconds were left when paused. */
  pausedRemainingMs: number | null;
  label: string;
}

export const IDLE_TIMER: RestTimerState = { endsAt: null, totalSec: 0, pausedRemainingMs: null, label: "" };

interface Props {
  timer: RestTimerState;
  onChange: (next: RestTimerState) => void;
  onFinished: () => void;
  sound: boolean;
  haptics: boolean;
  warningSec: number;
}

/**
 * Countdown driven by wall-clock timestamps, so it stays accurate when the
 * phone sleeps or the tab is backgrounded.
 */
export function RestTimer({ timer, onChange, onFinished, sound, haptics, warningSec }: Props) {
  const [now, setNow] = React.useState(() => Date.now());
  const warnedRef = React.useRef(false);
  const finishedRef = React.useRef(false);

  const running = timer.endsAt !== null && timer.pausedRemainingMs === null;
  const remainingMs = timer.pausedRemainingMs ?? (timer.endsAt ? timer.endsAt - now : 0);
  const remaining = Math.max(0, Math.ceil(remainingMs / 1000));

  React.useEffect(() => {
    warnedRef.current = false;
    finishedRef.current = false;
  }, [timer.endsAt, timer.totalSec]);

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [running]);

  React.useEffect(() => {
    if (!running) return;
    if (!warnedRef.current && warningSec > 0 && remaining <= warningSec && remaining > 0) {
      warnedRef.current = true;
      if (sound) countdownBeep();
      if (haptics) vibrate(40);
    }
    if (!finishedRef.current && remaining <= 0) {
      finishedRef.current = true;
      if (sound) finishChime();
      if (haptics) vibrate([80, 60, 120]);
      onFinished();
    }
  }, [remaining, running, sound, haptics, warningSec, onFinished]);

  if (timer.endsAt === null) return null;

  const progress = timer.totalSec > 0 ? Math.min(1, Math.max(0, 1 - remaining / timer.totalSec)) : 1;
  const circumference = 2 * Math.PI * 26;

  const adjust = (deltaSec: number) => {
    if (timer.pausedRemainingMs !== null) {
      onChange({ ...timer, pausedRemainingMs: Math.max(0, timer.pausedRemainingMs + deltaSec * 1000), totalSec: timer.totalSec + deltaSec });
      return;
    }
    onChange({ ...timer, endsAt: (timer.endsAt ?? Date.now()) + deltaSec * 1000, totalSec: Math.max(5, timer.totalSec + deltaSec) });
  };

  const togglePause = () => {
    if (timer.pausedRemainingMs !== null) {
      onChange({ ...timer, endsAt: Date.now() + timer.pausedRemainingMs, pausedRemainingMs: null });
    } else {
      onChange({ ...timer, pausedRemainingMs: Math.max(0, (timer.endsAt ?? Date.now()) - Date.now()) });
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-accent/30 bg-card shadow-lg">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
            <circle cx="32" cy="32" r="26" fill="none" strokeWidth="6" className="stroke-border" />
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className={remaining <= warningSec ? "stroke-warning" : "stroke-accent"}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: "stroke-dashoffset 0.2s linear" }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">
            {formatDuration(remaining)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {timer.pausedRemainingMs !== null ? "Rest paused" : "Rest"}
          </p>
          <p className="truncate text-sm font-semibold">{timer.label || "Next set coming up"}</p>
          <div className="mt-1 flex gap-1.5">
            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => adjust(-15)}>
              -15s
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => adjust(15)}>
              +15s
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={togglePause}>
              {timer.pausedRemainingMs !== null ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        <Button type="button" size="sm" className="h-11 shrink-0 gap-1" onClick={() => onChange(IDLE_TIMER)}>
          <SkipForward className="h-4 w-4" aria-hidden />
          Skip
        </Button>
      </div>
    </div>
  );
}
