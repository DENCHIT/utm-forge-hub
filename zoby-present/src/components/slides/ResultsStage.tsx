import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Heading } from "./StaticSlides";
import { ordinal, pluralise } from "@/lib/utils";
import type { Cluster } from "@/lib/types";

interface ResultsStageProps {
  heading?: string;
  clusters: Cluster[];
  tally: Map<string, number>;
  totalVotes: number;
}

/**
 * The reveal. Bars race up from zero, then the winner separates itself after a
 * beat - the pause is the whole point, so do not shorten it.
 */
export function ResultsStage({ heading, clusters, tally, totalVotes }: ResultsStageProps) {
  const [revealed, setRevealed] = useState(false);

  const ranked = useMemo(
    () =>
      clusters
        .filter((c) => c.is_finalist)
        .map((cluster) => ({ cluster, votes: tally.get(cluster.id) ?? 0 }))
        .sort((a, b) => b.votes - a.votes),
    [clusters, tally],
  );

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  const winner = ranked[0];
  const tied = ranked.length > 1 && ranked[1].votes === winner?.votes;

  return (
    <div className="flex h-full w-full flex-col gap-[1em] p-[4%]">
      <Heading>{heading ?? "The room has decided"}</Heading>

      <div className="grid min-h-0 flex-1 grid-cols-3 items-end gap-[1.5em] pb-[2em]">
        {ranked.map(({ cluster, votes }, index) => {
          const share = totalVotes > 0 ? votes / totalVotes : 0;
          const isWinner = revealed && !tied && index === 0;
          const accent = cluster.accent ?? "hsl(var(--brand))";

          return (
            <div key={cluster.id} className="flex h-full flex-col justify-end gap-[0.6em]">
              <motion.div
                animate={{ scale: isWinner ? 1.04 : 1, opacity: revealed && !isWinner ? 0.55 : 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="text-center"
              >
                <p className="text-[0.75em] font-bold uppercase tracking-[0.24em] text-muted">
                  {ordinal(index + 1)}
                </p>
                <h3 className="font-display text-[1.6em] font-black leading-tight">
                  {cluster.label}
                </h3>
                <p className="mt-[0.2em] font-display text-[2.2em] font-black tabular-nums" style={{ color: accent }}>
                  {Math.round(share * 100)}%
                </p>
                <p className="text-[0.8em] text-muted">{pluralise(votes, "vote")}</p>
              </motion.div>

              <motion.div
                className="w-full rounded-t-card"
                style={{ backgroundColor: accent }}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(share * 100, 4)}%` }}
                transition={{
                  type: "spring",
                  stiffness: 60,
                  damping: 18,
                  delay: 0.3 + index * 0.15,
                }}
              />
            </div>
          );
        })}
      </div>

      {revealed && winner && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-card border-2 p-[1em] text-center"
          style={{ borderColor: winner.cluster.accent ?? "hsl(var(--brand))" }}
        >
          <p className="text-[0.8em] font-bold uppercase tracking-[0.28em] text-muted">
            {tied ? "It's a dead heat" : "So this is what we fix"}
          </p>
          <p className="font-display text-[2em] font-black leading-tight">
            {tied ? ranked.filter((r) => r.votes === winner.votes).map((r) => r.cluster.label).join(" · ") : winner.cluster.label}
          </p>
          {!tied && winner.cluster.summary && (
            <p className="mt-[0.3em] text-[1.05em] text-muted">{winner.cluster.summary}</p>
          )}
        </motion.div>
      )}
    </div>
  );
}
