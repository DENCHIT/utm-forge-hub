import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { participantToken } from "@/lib/utils";

/**
 * Gets or creates this device's anonymous participant row for an event.
 * No sign-in: scanning the QR code is the whole onboarding.
 *
 * Goes through the `claim_participant` function rather than reading the table.
 * `participants` holds each device's identity token, so it is staff-only - a
 * phone that could read it could vote as somebody else.
 */
export function useParticipant(eventId: string | undefined) {
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;

    (async () => {
      const { data, error: rpcError } = await supabase.rpc("claim_participant", {
        p_event_id: eventId,
        p_token: participantToken(eventId),
      });

      if (cancelled) return;
      if (rpcError) setError(rpcError.message);
      else setParticipantId(data as string);
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return { participantId, error };
}
