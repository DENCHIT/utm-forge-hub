import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Cluster, Submission, Vote } from "@/lib/types";

export interface InteractionData {
  submissions: Submission[];
  clusters: Cluster[];
  votes: Vote[];
  /** clusterId -> vote count, recomputed locally as votes stream in. */
  tally: Map<string, number>;
  totalVotes: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Live submissions, clusters, and votes for one interactive slide.
 *
 * `slideId` is the collect slide's id even on the vote and results slides -
 * the whole interaction (submit, group, vote, reveal) hangs off one id, so a
 * deck can split it across as many screens as the speaker wants.
 */
export function useInteraction(slideId: string | undefined): InteractionData {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!slideId) return;
    const [subs, groups, ballots] = await Promise.all([
      supabase.from("submissions").select("*").eq("slide_id", slideId).order("created_at"),
      supabase.from("clusters").select("*").eq("slide_id", slideId).order("rank", {
        ascending: true,
        nullsFirst: false,
      }),
      supabase.from("votes").select("*").eq("slide_id", slideId),
    ]);

    setSubmissions((subs.data as Submission[]) ?? []);
    setClusters((groups.data as Cluster[]) ?? []);
    setVotes((ballots.data as Vote[]) ?? []);
    setLoading(false);
  }, [slideId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!slideId) return;

    const upsert = <T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>) =>
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [slideId]);

  const tally = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vote of votes) {
      counts.set(vote.cluster_id, (counts.get(vote.cluster_id) ?? 0) + 1);
    }
    return counts;
  }, [votes]);

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
    clusters: sortedClusters,
    votes,
    tally,
    totalVotes: votes.length,
    loading,
    refresh,
  };
}
