import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Cluster, Submission, SubmissionVote, Vote } from "@/lib/types";

export interface RankedSubmission extends Submission {
  upvotes: number;
}

export interface InteractionData {
  submissions: Submission[];
  /** Submissions with their upvote counts, most-supported first. */
  ranked: RankedSubmission[];
  clusters: Cluster[];
  votes: Vote[];
  submissionVotes: SubmissionVote[];
  /** clusterId -> vote count, recomputed locally as votes stream in. */
  tally: Map<string, number>;
  /** submissionId -> upvote count. */
  upvotes: Map<string, number>;
  totalVotes: number;
  /**
   * Submissions plus upvotes. The number to put on the stage: it counts
   * everyone who took part, not just the ones who typed.
   */
  engagementCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Live submissions, upvotes, clusters, and votes for one interactive slide.
 *
 * `slideId` is the collect slide's id even on the vote and results slides -
 * the whole interaction (submit, group, vote, reveal) hangs off one id, so a
 * deck can split it across as many screens as the speaker wants.
 */
export function useInteraction(slideId: string | undefined): InteractionData {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [submissionVotes, setSubmissionVotes] = useState<SubmissionVote[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!slideId) return;
    const [subs, groups, ballots, upvoteRows] = await Promise.all([
      supabase.from("submissions").select("*").eq("slide_id", slideId).order("created_at"),
      supabase.from("clusters").select("*").eq("slide_id", slideId).order("rank", {
        ascending: true,
        nullsFirst: false,
      }),
      supabase.from("votes").select("*").eq("slide_id", slideId),
      supabase.from("submission_votes").select("*").eq("slide_id", slideId),
    ]);

    setSubmissions((subs.data as Submission[]) ?? []);
    setClusters((groups.data as Cluster[]) ?? []);
    setVotes((ballots.data as Vote[]) ?? []);
    setSubmissionVotes((upvoteRows.data as SubmissionVote[]) ?? []);
    setLoading(false);
  }, [slideId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!slideId) return;

    const upsert =
      <T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>) =>
      (payload: { eventType: string; new: unknown; old: unknown }) => {
        setter((current) => {
          if (payload.eventType === "DELETE") {
            return current.filter((row) => row.id !== (payload.old as T).id);
          }
          const next = payload.new as T;
          const without = current.filter((row) => row.id !== next.id);
          return [...without, next];
        });
      };

    const channel = supabase
      .channel(`interaction:${slideId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions", filter: `slide_id=eq.${slideId}` },
        upsert(setSubmissions),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clusters", filter: `slide_id=eq.${slideId}` },
        upsert(setClusters),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes", filter: `slide_id=eq.${slideId}` },
        upsert(setVotes),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submission_votes",
          filter: `slide_id=eq.${slideId}`,
        },
        upsert(setSubmissionVotes),
      )
      .subscribe();

    // Conference wifi blocks or throttles websockets more often than anyone
    // admits. Poll slowly alongside realtime so the stage still fills in even
    // when the socket is silently dead.
    const poll = setInterval(() => void refresh(), 8000);

    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [slideId, refresh]);

  const tally = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vote of votes) {
      counts.set(vote.cluster_id, (counts.get(vote.cluster_id) ?? 0) + 1);
    }
    return counts;
  }, [votes]);

  const upvotes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vote of submissionVotes) {
      counts.set(vote.submission_id, (counts.get(vote.submission_id) ?? 0) + 1);
    }
    return counts;
  }, [submissionVotes]);

  const ranked = useMemo(
    () =>
      submissions
        .map((submission) => ({ ...submission, upvotes: upvotes.get(submission.id) ?? 0 }))
        .sort((a, b) => b.upvotes - a.upvotes || a.created_at.localeCompare(b.created_at)),
    [submissions, upvotes],
  );

  const sortedClusters = useMemo(
    () =>
      [...clusters].sort((a, b) => {
        if (a.rank === null && b.rank === null) return a.label.localeCompare(b.label);
        if (a.rank === null) return 1;
        if (b.rank === null) return -1;
        return a.rank - b.rank;
      }),
    [clusters],
  );

  return {
    submissions,
    ranked,
    clusters: sortedClusters,
    votes,
    submissionVotes,
    tally,
    upvotes,
    totalVotes: votes.length,
    engagementCount: submissions.filter((s) => s.source === "audience").length + submissionVotes.length,
    loading,
    refresh,
  };
}
