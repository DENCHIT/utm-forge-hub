import * as React from "react";
import { CloudDownload, Smartphone } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { friendlyDate } from "../lib/format";
import { useGym } from "../store/gymStore";

function describe(sessions: number, programName: string | undefined, updatedAt: string): string {
  const parts = [programName ?? "No programme"];
  parts.push(`${sessions} logged ${sessions === 1 ? "session" : "sessions"}`);
  parts.push(`last changed ${friendlyDate(updatedAt.slice(0, 10)).toLowerCase()}`);
  return parts.join(", ");
}

/**
 * Two devices, two sets of training. Rather than guess, ask, because the wrong
 * guess deletes someone's history.
 */
export function SyncConflictDialog() {
  const { state, conflict, resolveConflict } = useGym();
  const [busy, setBusy] = React.useState(false);

  if (!conflict) return null;

  const localSessions = state.sessions.filter((session) => session.status === "completed").length;
  const remoteSessions = conflict.state.sessions?.filter((session) => session.status === "completed").length ?? 0;

  const choose = async (choice: "local" | "remote") => {
    setBusy(true);
    try {
      await resolveConflict(choice);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Two sets of training</AlertDialogTitle>
          <AlertDialogDescription>
            This device and your account both have training on them. Pick the one to keep. The other is replaced, so choose
            carefully.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-3 whitespace-normal py-3 text-left"
            disabled={busy}
            onClick={() => void choose("local")}
          >
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="block font-semibold">Keep this device</span>
              <span className="block text-xs text-muted-foreground">
                {describe(localSessions, state.program?.name, state.updatedAt)}
              </span>
            </span>
          </Button>

          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-3 whitespace-normal py-3 text-left"
            disabled={busy}
            onClick={() => void choose("remote")}
          >
            <CloudDownload className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
            <span>
              <span className="block font-semibold">Use my account</span>
              <span className="block text-xs text-muted-foreground">
                {describe(remoteSessions, conflict.state.program?.name, conflict.updatedAt)}
              </span>
            </span>
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
