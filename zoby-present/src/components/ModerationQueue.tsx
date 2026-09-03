import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, EyeOff, ShieldAlert, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn, pluralise } from "@/lib/utils";
import type { Submission } from "@/lib/types";

interface ModerationQueueProps {
  slideId: string;
  /** Pending and flagged rows, from useInteraction. */
  queue: Submission[];
  /** Approved rows, so the wall can be cleared or trimmed. */
  approved: Submission[];
}

/**
 * The speaker's view of everything the room typed that is not on the wall, and
 * the controls for pulling things off it.
 *
 * The design rule here: releasing something is one tap, and pulling something
 * is one tap. On stage there is no time to read a confirmation dialogue, and
 * the cost of a mistaken hide is nil - you can put it back.
 */
export function ModerationQueue({ slideId, queue, approved }: ModerationQueueProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [showWall, setShowWall] = useState(false);

  const flagged = queue.filter((s) => s.status === "flagged");
  const pending = queue.filter((s) => s.status === "pending");

  // Anything the phone's own screening call failed to land gets picked up here.
  // Runs while there is a backlog and stops when there is not, so it costs
  // nothing on a healthy network.
  const sweepRef = useRef(false);
  useEffect(() => {
    if (pending.length === 0 || sweepRef.current) return;

    sweepRef.current = true;
    setSweeping(true);

    supabase.functions
      .invoke("screen-submissions", { body: { slideId } })
      .catch(() => undefined)
      .finally(() => {
        setSweeping(false);
        // Back off before trying again, so a broken screener does not spin.
        setTimeout(() => {
          sweepRef.current = false;
        }, 6000);
      });
  }, [pending.length, slideId]);

  const setStatus = async (submission: Submission, status: "approved" | "hidden") => {
    setBusy(submission.id);

    const { error } =
      status === "hidden"
        ? await supabase.rpc("hide_submission", { p_submission_id: submission.id })
        : await supabase.from("submissions").update({ status }).eq("id", submission.id);

    setBusy(null);
    if (error) toast.error(error.message);
  };

  const clearWall = async () => {
    if (!confirm("Pull every problem off the wall? Upvotes go too.")) return;
    const { data, error } = await supabase.rpc("hide_all_submissions", { p_slide_id: slideId });
    if (error) return toast.error(error.message);
    toast.success(`Cleared ${pluralise((data as number) ?? 0, "problem")} off the wall.`);
  };

  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.24em] text-muted">
          <ShieldAlert size={14} /> Screening
        </p>
        {sweeping && <span className="text-xs text-muted">checking&hellip;</span>}
      </div>

      {/* The number that matters: things the screener objected to, waiting on
          you. Loud, because it is the one thing here that is time-sensitive. */}
      {flagged.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-warning">
            <AlertTriangle size={14} /> {pluralise(flagged.length, "flagged problem")}
          </p>
          {flagged.map((submission) => (
            <div key={submission.id} className="rounded-xl border border-warning/40 bg-warning/5 p-3">
              <p className="text-sm">{submission.body}</p>
              {submission.moderation_reason && (
                <p className="mt-1 text-xs text-warning">{submission.moderation_reason}</p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy === submission.id}
                  onClick={() => setStatus(submission, "approved")}
                  className="btn-ghost flex-1 px-2 py-1.5 text-xs"
                >
                  <Check size={13} /> Put it up anyway
                </button>
                <button
                  type="button"
                  disabled={busy === submission.id}
                  onClick={() => setStatus(submission, "hidden")}
                  className="btn-ghost flex-1 border-warning px-2 py-1.5 text-xs text-warning"
                >
                  <X size={13} /> Bin it
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            {pluralise(pending.length, "problem")} waiting to be screened
          </p>
          {/* The manual release valve. If the screener cannot be reached, this
              is how the wall keeps filling - a deliberate act, with the text
              in front of you. */}
          {pending.map((submission) => (
            <div key={submission.id} className="flex items-start gap-2 rounded-xl bg-canvas p-2.5">
              <p className="min-w-0 flex-1 text-sm">{submission.body}</p>
              <button
                type="button"
                disabled={busy === submission.id}
                onClick={() => setStatus(submission, "approved")}
                className="shrink-0 rounded-lg bg-brand px-2 py-1 text-xs font-semibold text-white"
              >
                Release
              </button>
            </div>
          ))}
        </div>
      )}

      {queue.length === 0 && (
        <p className="text-sm text-muted">Nothing held back. Everything is on the wall.</p>
      )}

      {/* Panic controls, below the fold of the normal flow but always reachable. */}
      <div className="space-y-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setShowWall((s) => !s)}
          className="btn-ghost w-full text-xs"
        >
          <EyeOff size={13} /> {showWall ? "Hide" : "Pull something off the wall"}
        </button>

        {showWall && (
          <>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {approved.map((submission) => (
                <button
                  key={submission.id}
                  type="button"
                  disabled={busy === submission.id}
                  onClick={() => setStatus(submission, "hidden")}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg bg-canvas p-2 text-left text-xs",
                    "hover:bg-warning/10 active:scale-[0.99]",
                  )}
                >
                  <X size={13} className="mt-0.5 shrink-0 text-warning" />
                  <span className="min-w-0 flex-1">{submission.body}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={clearWall}
              className="btn-ghost w-full border-warning text-xs text-warning"
            >
              Clear the whole wall
            </button>
          </>
        )}
      </div>
    </section>
  );
}
