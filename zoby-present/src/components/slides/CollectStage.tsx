import { AnimatePresence, motion } from "framer-motion";
import { ArrowBigUp } from "lucide-react";
import { QrPanel } from "@/components/QrPanel";
import { Heading } from "./StaticSlides";
import { cn, hashUnit, pluralise } from "@/lib/utils";
import type { CollectContent } from "@/lib/types";
import type { RankedSubmission } from "@/hooks/useInteraction";

interface CollectStageProps {
  content: CollectContent;
  submissions: RankedSubmission[];
  joinUrl: string;
  joinCode: string;
  /** Phones currently on this session. */
  connected?: number;
}

/**
 * Scale of the wall, by how full it is.
 *
 * The failure mode this exists to prevent: eight submissions rendered at
 * wall-of-300 density, marooned in the top-left corner, reading to the room as
 * "nobody joined in". Below is the opposite - at low counts the cards are big,
 * centred and confident, so a quiet room looks like a curated shortlist rather
 * than a flop.
 */
function wallStyle(count: number) {
  if (count <= 4) {
    return { text: "text-[1.5em]", width: "max-w-[16ch]", gap: "gap-[0.6em]", cap: 4, centre: true };
  }
  if (count <= 10) {
    return { text: "text-[1.15em]", width: "max-w-[18ch]", gap: "gap-[0.55em]", cap: 10, centre: true };
  }
  if (count <= 24) {
    return { text: "text-[0.95em]", width: "max-w-[20ch]", gap: "gap-[0.5em]", cap: 24, centre: false };
  }
  return { text: "text-[0.8em]", width: "max-w-[22ch]", gap: "gap-[0.4em]", cap: 36, centre: false };
}

/**
 * The capture screen: QR on one side, submissions landing live on the other.
 * People need to see their own words hit the wall - that is what makes the
 * next person get their phone out.
 */
export function CollectStage({
  content,
  submissions,
  joinUrl,
  joinCode,
  connected = 0,
}: CollectStageProps) {
  const style = wallStyle(submissions.length);

  // Most-supported first once upvotes start landing, so the wall self-curates
  // and the strongest problems are the ones the back row can read.
  const visible = submissions.slice(0, style.cap);
  const audienceCount = submissions.filter((s) => s.source === "audience").length;
  const totalUpvotes = submissions.reduce((sum, s) => sum + s.upvotes, 0);

  return (
    <div className="grid h-full w-full grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-[2%] p-[3%]">
      <div className="flex min-h-0 flex-col gap-[0.8em]">
        <Heading>{content.heading ?? content.prompt}</Heading>
        {content.heading && <p className="text-[1.2em] text-muted">{content.prompt}</p>}

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            style.centre && "justify-center",
          )}
        >
          <div
            className={cn(
              "flex flex-wrap content-start",
              style.gap,
              style.centre && "justify-center",
            )}
          >
            <AnimatePresence initial={false}>
              {visible.map((submission) => (
                <motion.div
                  key={submission.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    type: "spring",
                    stiffness: 340,
                    damping: 26,
                    // A touch of jitter so simultaneous arrivals do not land in
                    // lockstep, but stable per submission so nothing twitches.
                    delay: hashUnit(submission.id) * 0.18,
                  }}
                  className={cn(
                    "relative rounded-card border bg-surface px-[0.8em] py-[0.55em] leading-snug",
                    style.text,
                    style.width,
                    // Popular problems earn a brighter edge. The room can see
                    // consensus forming before the AI has said a word.
                    submission.upvotes >= 3 ? "border-brand" : "border-line",
                  )}
                >
                  {submission.body}

                  {submission.upvotes > 0 && (
                    <motion.span
                      key={submission.upvotes}
                      initial={{ scale: 1.4 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-[0.4em] -top-[0.4em] flex items-center gap-[0.1em] rounded-full bg-brand px-[0.45em] py-[0.1em] text-[0.6em] font-bold text-white"
                    >
                      <ArrowBigUp size="1em" />
                      {submission.upvotes}
                    </motion.span>
                  )}

                  {/* Provenance, always visible. A seeded problem must never
                      read as something the room just typed. */}
                  {submission.source !== "audience" && (
                    <span className="mt-[0.35em] block text-[0.55em] uppercase tracking-[0.16em] text-muted">
                      {submission.source_label ??
                        (submission.source === "seed" ? "Asked before today" : "From the floor")}
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {submissions.length > style.cap && (
            <p className="mt-[0.6em] text-[0.8em] text-muted">
              +{submissions.length - style.cap} more not shown
            </p>
          )}
        </div>

        <p className="text-[1.1em] font-semibold text-brand">
          <motion.span key={audienceCount} initial={{ scale: 1.3 }} animate={{ scale: 1 }}>
            {pluralise(audienceCount, "problem")} in
          </motion.span>
          {totalUpvotes > 0 && (
            <span className="text-muted"> &middot; {pluralise(totalUpvotes, "upvote")}</span>
          )}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-[1em] rounded-card border border-line bg-surface p-[1.2em]">
        <p className="text-center text-[1.1em] font-semibold">
          {content.allowUpvotes === false ? "Scan to add yours" : "Scan to add or back a problem"}
        </p>
        <QrPanel url={joinUrl} joinCode={joinCode} />

        {/* The nudge. "182 connected, 6 submitted" gets phones out faster than
            any amount of asking from the stage. */}
        {connected > 0 && (
          <p className="text-center text-[0.8em] text-muted">
            <span className="font-bold text-ink">{connected}</span> in the room with us
          </p>
        )}
      </div>
    </div>
  );
}
