import * as React from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: number | null;
  onCommit: (value: number | null) => void;
  placeholder?: string;
  suffix?: string;
  step?: number;
  className?: string;
  ariaLabel: string;
}

/**
 * Numeric input that keeps its own text while you are typing, so decimals and
 * half-entered values survive until you leave the field.
 */
export function NumberField({ value, onCommit, placeholder, suffix, className, ariaLabel }: Props) {
  const [text, setText] = React.useState(value == null ? "" : String(value));
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) setText(value == null ? "" : String(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const trimmed = raw.trim().replace(",", ".");
    if (!trimmed) {
      onCommit(null);
      return;
    }
    const parsed = Number(trimmed);
    onCommit(Number.isFinite(parsed) ? parsed : null);
  };

  return (
    <div className={cn("relative", className)}>
      <input
        aria-label={ariaLabel}
        inputMode="decimal"
        enterKeyHint="done"
        value={text}
        placeholder={placeholder}
        onFocus={(event) => {
          setFocused(true);
          event.currentTarget.select();
        }}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          setFocused(false);
          commit(text);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className={cn(
          "h-12 w-full rounded-lg border border-input bg-background text-center text-base font-semibold tabular-nums",
          "placeholder:font-normal placeholder:text-muted-foreground/55",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
          suffix && "pr-6",
        )}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
      ) : null}
    </div>
  );
}
