import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * How many phones are on this session right now, via Realtime presence.
 *
 * Worth putting on the stage for two reasons: it proves to the room that the
 * thing is genuinely live, and "182 of you are connected, 6 have submitted" is
 * the most effective nudge there is.
 *
 * `announce` should be false on the projector - the stage screen is not an
 * audience member and should not inflate its own count.
 */
export function usePresence(channelKey: string | undefined, announce: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!channelKey) return;

    const channel = supabase.channel(`presence:${channelKey}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && announce) {
          await channel.track({ joined_at: Date.now() });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelKey, announce]);

  return count;
}
