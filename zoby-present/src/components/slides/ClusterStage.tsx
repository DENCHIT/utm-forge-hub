import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Heading } from "./StaticSlides";
import { cn, ordinal, pluralise } from "@/lib/utils";
import type { Cluster, SlidePhase, Submission } from "@/lib/types";

interface ClusterStageProps {
  heading?: string;
  phase: SlidePhase;
  submissions: Submission[];
  clusters: Cluster[];
  /** submissionId -> upvotes, so a group's badge counts everyone behind it. */
  upvotes?: Map<string, number>;
}

/**
 * The moment the AI earns its keep. During `clustering` every submission is
 * still on screen and cards physically migrate into their group as the result
 * lands - shared `layoutId`s do the flying. During `shortlist` everything but
 * the finalists falls away.
 */
export function ClusterStage({
  heading,
  phase,
  submissions,
  clusters,
  upvotes,
}: ClusterStageProps) {
  const grouped = new Map<string, Submission[]>();
  const loose: Submission[] = [];

  for (const submission of submissions) {
    if (!submission.cluster_id) {
      loose.push(submission);
      continue;
    }
    const bucket = grouped.get(submission.cluster_id) ?? [];
    bucket.push(submission);
    grouped.set(submission.cluster_id, bucket);
  }

  const shown = phase === "shortlist" ? clusters.filter((c) => c.is_finalist) : clusters;
  const thinking = phase === "clustering" && clusters.length === 0;

  return (
    <div className="flex h-full w-full flex-col gap-[0.9em] p-[3%]">
      <div className="flex items-baseline justify-between gap-[1em]">
        <Heading>
          {heading ?? (phase === "shortlist" ? "The three that matter" : "Finding the patterns")}
        </Heading>
        <p className="shrink-0 text-[0.9em] text-muted">
          {pluralise(submissions.length, "problem")} &middot;{" "}
          {pluralise(clusters.length, "theme")}
        </p>
      </div>

      <LayoutGroup>
        <div className="min-h-0 flex-1 overflow-hidden">
          {thinking ? (
            <ThinkingPool submissions={submissions} />
          ) : (
            <div
              className={cn(
                "grid h-full gap-[0.8em]",
                shown.length <= 3
                  ? "grid-cols-3"
                  : shown.length === 4
                    ? "grid-cols-4"
                    : "grid-cols-4 grid-rows-2",
              )}
            >
              <AnimatePresence>
                {shown.map((cluster) => (
                  <ClusterColumn
                    key={cluster.id}
                    cluster={cluster}
                    members={grouped.get(cluster.id) ?? []}
                    emphasised={phase === "shortlist"}
                    upvotes={upvotes}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {loose.length > 0 && clusters.length > 0 && (
          <div className="flex flex-wrap gap-[0.4em] opacity-50">
            {loose.slice(0, 12).map((submission) => (
              <motion.span
                key={submission.id}
                layoutId={`submission-${submission.id}`}
                className="rounded-full border border-line bg-surface px-[0.7em] py-[0.3em] text-[0.7em]"
              >
                {submission.body}
              </motion.span>
            ))}
          </div>
        )}
      </LayoutGroup>
    </div>
  );
}

function ThinkingPool({ submissions }: { submissions: Submission[] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[1em]">
      <div className="flex max-h-full flex-wrap justify-center gap-[0.45em] overflow-hidden">
        {submissions.slice(0, 40).map((submission) => (
          <motion.span
            key={submission.id}
            layoutId={`submission-${submission.id}`}
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              delay: (submission.id.charCodeAt(0) % 12) * 0.12,
            }}
            className="max-w-[20ch] rounded-card border border-line bg-surface px-[0.7em] py-[0.4em] text-[0.75em] leading-snug"
          >
            {submission.body}
          </motion.span>
        ))}
      </div>
      <p className="text-[1.1em] font-semibold text-brand">
        Grouping what the room just told us&hellip;
      </p>
    </div>
  );
}

function ClusterColumn({
  cluster,
  members,
  emphasised,
  upvotes,
}: {
  cluster: Cluster;
  members: Submission[];
  emphasised: boolean;
  upvotes?: Map<string, number>;
}) {
  const accent = cluster.accent ?? "hsl(var(--brand))";

  // Everyone behind this theme: the people who wrote a problem in it, plus the
  // people who backed one. Three submissions with forty upvotes is a bigger
  // deal than eight submissions nobody else recognised, and the badge has to
  // say so or the shortlist looks arbitrary.
  const backing =
    members.length + members.reduce((sum, m) => sum + (upvotes?.get(m.id) ?? 0), 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 210, damping: 26 }}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-card border bg-surface p-[0.8em]",
        emphasised ? "border-2" : "border-line",
      )}
      style={emphasised ? { borderColor: accent } : undefined}
    >
      <div className="mb-[0.5em] flex items-start justify-between gap-[0.5em]">
        <div className="min-w-0">
          {emphasised && cluster.rank !== null && (
            <p className="text-[0.7em] font-bold uppercase tracking-[0.24em]" style={{ color: accent }}>
              {ordinal(cluster.rank + 1)}
            </p>
          )}
          <h3
            className={cn(
              "font-display font-bold leading-tight",
              emphasised ? "text-[1.5em]" : "text-[1em]",
            )}
          >
            {cluster.label}
          </h3>
        </div>
        <span
          className="shrink-0 rounded-full px-[0.6em] py-[0.15em] text-[0.75em] font-bold text-white"
          style={{ backgroundColor: accent }}
          title="People behind this theme"
        >
          {backing}
        </span>
      </div>

      {emphasised && cluster.summary && (
        <p className="mb-[0.6em] text-[0.95em] leading-snug text-muted">{cluster.summary}</p>
      )}

      <div className="min-h-0 flex-1 space-y-[0.3em] overflow-hidden">
        {members.slice(0, emphasised ? 4 : 8).map((submission) => (
          <motion.p
            key={submission.id}
            layoutId={`submission-${submission.id}`}
            transition={{ type: "spring", stiffness: 190, damping: 24 }}
            className="truncate rounded-lg bg-canvas px-[0.6em] py-[0.3em] text-[0.72em] text-muted"
          >
            {submission.body}
          </motion.p>
        ))}
        {members.length > (emphasised ? 4 : 8) && (
          <p className="px-[0.6em] text-[0.7em] text-muted">
            +{members.length - (emphasised ? 4 : 8)} more
          </p>
        )}
      </div>
    </motion.div>
  );
}
