import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type ConnectionState = "connecting" | "live" | "degraded" | "offline";

/**
 * Connection health, for the remote only - never the stage. The speaker needs
 * to know the room has gone quiet because the wifi died rather than because
 * nobody cares, and needs to know it before they ask a question nobody can
 * answer.
 *
 * `degraded` means the browser has a network but the realtime socket is not
 * up: submissions will still arrive on the 8s poll in useInteraction, just not
 * instantly. That is a "keep going, it is slower" state, not a "stop" state.
 */
export function useConnection(): ConnectionState {
  const [online, setOnline] = useState(navigator.onLine);
  const [socket, setSocket] = useState<"connecting" | "open" | "closed">("connecting");

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("connection-probe")
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setSocket("open");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setSocket("closed");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  if (!online) return "offline";
  if (socket === "open") return "live";
  if (socket === "connecting") return "connecting";
  return "degraded";
}
