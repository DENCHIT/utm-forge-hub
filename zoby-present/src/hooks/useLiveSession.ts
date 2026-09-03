import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { EventRecord, SessionRecord, Slide } from "@/lib/types";

interface LiveSession {
  session: SessionRecord | null;
  event: EventRecord | null;
  slides: Slide[];
  currentSlide: Slide | null;
  currentIndex: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * The presenter, the remote control, and every audience phone all read from
 * this. `sessions.current_slide_id` is the single source of truth for where
 * the room is, so a late-joining phone lands on the right screen immediately.
 */
export function useLiveSession(sessionId: string | undefined): LiveSession {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) return;

    const { data: sessionRow, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionRow) {
      setError(sessionError?.message ?? "Session not found.");
      setLoading(false);
      return;
    }

    const [{ data: eventRow }, { data: slideRows, error: slideError }] = await Promise.all([
      supabase.from("events").select("*").eq("id", sessionRow.event_id).single(),
      supabase.from("slides").select("*").eq("session_id", sessionId).order("position"),
    ]);

    if (slideError) setError(slideError.message);

    setSession(sessionRow as SessionRecord);
    setEvent((eventRow as EventRecord) ?? null);
    setSlides((slideRows as Slide[]) ?? []);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          setSession(payload.new as SessionRecord);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "slides",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setSlides((current) => {
            if (payload.eventType === "DELETE") {
              return current.filter((s) => s.id !== (payload.old as Slide).id);
            }
            const next = payload.new as Slide;
            const without = current.filter((s) => s.id !== next.id);
            return [...without, next].sort((a, b) => a.position - b.position);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const currentIndex = useMemo(() => {
    if (!session?.current_slide_id) return slides.length ? 0 : -1;
    const index = slides.findIndex((s) => s.id === session.current_slide_id);
    return index === -1 ? 0 : index;
  }, [session?.current_slide_id, slides]);

  return {
    session,
    event,
    slides,
    currentSlide: slides[currentIndex] ?? null,
    currentIndex,
    loading,
    error,
    refresh,
  };
}

/** Moves the whole room to a slide. Called by the presenter and the remote. */
export async function goToSlide(sessionId: string, slideId: string) {
  const { error } = await supabase
    .from("sessions")
    .update({ current_slide_id: slideId })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
}

export async function setSlidePhase(slideId: string, phase: Slide["phase"]) {
  const { error } = await supabase.from("slides").update({ phase }).eq("id", slideId);
  if (error) throw new Error(error.message);
}
