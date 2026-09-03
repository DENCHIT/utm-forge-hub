import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface StageClockProps {
  /** Epoch ms the session started. Elapsed counts from here. */
  startedAt: number | null;
  /** Slot length in minutes. Drives the colour. Omit for a plain count-up. */
  targetMinutes?: number | null;
  /** Slide position, so you can see pace at a glance. */
  slideIndex: number;
  slideCount: number;
}

function clock(date: Date) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function duration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Bottom-corner clock for the speaker.
 *
 * Deliberately quiet: low contrast and small, so it reads from the confidence
 * monitor at two metres and disappears from row 20. It gets louder only when
 * you are running out of time, which is the one moment interrupting the design
 * is worth it.
 */
export function StageClock({ startedAt, targetMinutes, slideIndex, slideCount }: StageClockProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = startedAt ? now - startedAt : 0;
  const remaining = targetMinutes ? targetMinutes * 60_000 - elapsed : null;

  // Amber inside the last five minutes, red once the slot is gone.
  const state =
    remaining === null ? "neutral" : remaining < 0 ? "over" : remaining < 5 * 60_000 ? "close" : "fine";

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-3 left-4 flex items-baseline gap-3 font-mono tabular-nums transition-colors",
        state === "over"
          ? "text-warning"
          : state === "close"
            ? "text-warning/70"
            : "text-muted/40",
      )}
    >
      <span className="text-sm">{clock(new Date(now))}</span>

      {startedAt && (
        <span className={cn("text-sm", state === "over" && "font-bold")}>
          {state === "over" ? "+" : ""}
          {duration(remaining !== null ? Math.abs(remaining) : elapsed)}
          {remaining !== null && state !== "over" && (
            <span className="opacity-60"> left</span>
          )}
        </span>
      )}

      <span className="text-xs opacity-60">
        {slideIndex + 1}/{slideCount}
      </span>
    </div>
  );
}
