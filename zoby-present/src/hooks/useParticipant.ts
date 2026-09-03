import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { participantToken } from "@/lib/utils";

/**
 * Gets or creates this device's anonymous participant row for an event.
 * No sign-in: scanning the QR code is the whole onboarding.
 */
export function useParticipant(eventId: string | undefined) {
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;

    (async () => {
      const token = participantToken(eventId);

      const { data: existing } = await supabase
        .from("participants")
        .select("id")
        .eq("event_id", eventId)
        .eq("token", token)
        .maybeSingle();

      if (cancelled) return;
      if (existing) {
        setParticipantId(existing.id);
        return;
      }

      const { data: created, error: insertError } = await supabase
        .from("participants")
        .insert({ event_id: eventId, token })
        .select("id")
        .single();

      if (cancelled) return;
      if (insertError) setError(insertError.message);
      else setParticipantId(created.id);
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return { participantId, error };
}
