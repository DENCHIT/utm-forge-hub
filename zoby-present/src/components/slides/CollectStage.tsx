import { AnimatePresence, motion } from "framer-motion";
import { QrPanel } from "@/components/QrPanel";
import { Heading } from "./StaticSlides";
import { hashUnit, pluralise } from "@/lib/utils";
import type { CollectContent, Submission } from "@/lib/types";

interface CollectStageProps {
  content: CollectContent;
  submissions: Submission[];
  joinUrl: string;
  joinCode: string;
}

/**
 * The capture screen: QR on one side, submissions landing live on the other.
 * People need to see their own words hit the wall - that is what makes the
 * next person get their phone out.
 */
export function CollectStage({ content, submissions, joinUrl, joinCode }: CollectStageProps) {
  // Newest first, capped: a wall of 300 cards reads as noise from the back.
  const visible = [...submissions].reverse().slice(0, 24);

  return (
    <div className="grid h-full w-full grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-[2%] p-[3%]">
      <div className="flex min-h-0 flex-col gap-[0.8em]">
        <Heading>{content.heading ?? content.prompt}</Heading>
        {content.heading && (
          <p className="text-[1.2em] text-muted">{content.prompt}</p>
        )}

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex flex-wrap content-start gap-[0.5em]">
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
                  className="max-w-[22ch] rounded-card border border-line bg-surface px-[0.8em] py-[0.55em] text-[0.9em] leading-snug"
                >
                  {submission.body}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-[1.1em] font-semibold text-brand">
          <motion.span key={submissions.length} initial={{ scale: 1.3 }} animate={{ scale: 1 }}>
            {pluralise(submissions.length, "problem")} in
          </motion.span>
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-[1em] rounded-card border border-line bg-surface p-[1.2em]">
        <p className="text-center text-[1.1em] font-semibold">Scan to add yours</p>
        <QrPanel url={joinUrl} joinCode={joinCode} />
      </div>
    </div>
  );
}
