import { motion } from "framer-motion";
import { QrPanel } from "@/components/QrPanel";
import { Heading } from "./StaticSlides";
import { pluralise } from "@/lib/utils";
import type { Cluster } from "@/lib/types";

interface VoteStageProps {
  heading?: string;
  question?: string;
  clusters: Cluster[];
  tally: Map<string, number>;
  totalVotes: number;
  joinUrl: string;
  joinCode: string;
  /** Hide the bars until the reveal so nobody votes with the herd. */
  blind?: boolean;
}

export function VoteStage({
  heading,
  question,
  clusters,
  tally,
  totalVotes,
  joinUrl,
  joinCode,
  blind = true,
}: VoteStageProps) {
  const finalists = clusters.filter((c) => c.is_finalist);

  return (
    <div className="grid h-full w-full grid-cols-[minmax(0,7fr)_minmax(0,4fr)] gap-[2%] p-[3%]">
      <div className="flex min-h-0 flex-col gap-[0.8em]">
        <Heading>{heading ?? "Which one do we solve?"}</Heading>
        {question && <p className="text-[1.15em] text-muted">{question}</p>}

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-[0.7em]">
          {finalists.map((cluster, index) => {
            const votes = tally.get(cluster.id) ?? 0;
            const share = totalVotes > 0 ? votes / totalVotes : 0;
            const accent = cluster.accent ?? "hsl(var(--brand))";

            return (
              <motion.div
                key={cluster.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.12, duration: 0.5 }}
                className="relative overflow-hidden rounded-card border border-line bg-surface p-[0.9em]"
              >
                {!blind && (
                  <motion.div
                    className="absolute inset-y-0 left-0 opacity-20"
                    style={{ backgroundColor: accent }}
                    initial={{ width: 0 }}
                    animate={{ width: `${share * 100}%` }}
                    transition={{ type: "spring", stiffness: 90, damping: 20 }}
                  />
                )}
                <div className="relative flex items-center gap-[0.8em]">
                  <span
                    className="flex h-[1.9em] w-[1.9em] shrink-0 items-center justify-center rounded-full font-display text-[1.1em] font-black text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-[1.5em] font-bold leading-tight">
                      {cluster.label}
                    </h3>
                    {cluster.summary && (
                      <p className="truncate text-[0.9em] text-muted">{cluster.summary}</p>
                    )}
                  </div>
                  {!blind && (
                    <span className="shrink-0 font-display text-[1.6em] font-black tabular-nums">
                      {Math.round(share * 100)}%
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-[1em] rounded-card border border-line bg-surface p-[1.2em]">
        <p className="text-center text-[1.1em] font-semibold">Vote now</p>
        <QrPanel url={joinUrl} joinCode={joinCode} />
        <motion.p
          key={totalVotes}
          initial={{ scale: 1.25 }}
          animate={{ scale: 1 }}
          className="font-display text-[1.3em] font-black text-brand"
        >
          {pluralise(totalVotes, "vote")}
        </motion.p>
      </div>
    </div>
  );
}
