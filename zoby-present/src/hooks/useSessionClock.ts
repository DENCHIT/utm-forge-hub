import { useCallback, useEffect, useState } from "react";

/**
 * When this session started, for the stage clock.
 *
 * Kept in localStorage rather than the database on purpose: if the projector
 * browser reloads mid-talk - and it will, at the worst moment - the clock has
 * to come back showing the same elapsed time, without a round trip and without
 * caring whether the network is up.
 *
 * Starts itself the first time the stage renders a session, so an unattended
 * screen is still timing. Reset from the stage with `R`.
 */
export function useSessionClock(sessionId: string | undefined) {
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const key = sessionId ? `zoby-present:started:${sessionId}` : null;

  useEffect(() => {
    if (!key) return;
    const stored = localStorage.getItem(key);
    if (stored) {
      setStartedAt(Number(stored));
      return;
    }
    const now = Date.now();
    localStorage.setItem(key, String(now));
    setStartedAt(now);
  }, [key]);

  const reset = useCallback(() => {
    if (!key) return;
    const now = Date.now();
    localStorage.setItem(key, String(now));
    setStartedAt(now);
  }, [key]);

  return { startedAt, reset };
}
