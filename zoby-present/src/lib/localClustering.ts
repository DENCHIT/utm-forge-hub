import { supabase } from "./supabase";
import type { Submission } from "./types";

const ACCENTS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4",
  "#8b5cf6", "#ef4444", "#84cc16", "#f97316", "#14b8a6",
];

// Words that carry no signal about what somebody's problem actually is.
const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "your", "our", "with", "that",
  "this", "have", "has", "from", "they", "them", "we", "i", "my", "me", "is",
  "it", "its", "of", "to", "in", "on", "at", "a", "an", "be", "get", "getting",
  "too", "very", "much", "more", "most", "when", "how", "what", "why", "can",
  "cant", "dont", "doesnt", "no", "so", "just", "还", "problem", "problems",
  "issue", "issues", "team", "teams", "people", "time", "lot", "really", "always",
]);

function keywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
      // Crude stemming: enough to match "reporting" with "reports".
      .map((word) => word.replace(/(ing|ed|es|s)$/, "")),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const word of a) if (b.has(word)) shared++;
  return shared / Math.max(1, Math.min(a.size, b.size));
}

/**
 * Groups submissions by keyword overlap, with no network call.
 *
 * This exists for one moment: the venue wifi is dead or the Anthropic API is
 * unreachable, you are on stage, and the grouping has to happen anyway. It is
 * visibly worse than the model - it groups on shared words, so it misses two
 * people describing the same pain in different language, which is exactly the
 * thing the model is there for. Labels come from the most common words, so
 * they read like tags rather than sentences.
 *
 * Use it as the fallback it is. The remote tells the presenter when it ran, so
 * nobody claims the AI did this.
 */
export function clusterLocally(
  submissions: Submission[],
  upvotes: Map<string, number>,
  finalistCount = 3,
) {
  const items = submissions.map((s) => ({ submission: s, words: keywords(s.body) }));
  const groups: { members: typeof items; words: Set<string> }[] = [];

  for (const item of items) {
    let best: (typeof groups)[number] | null = null;
    let bestScore = 0;

    for (const group of groups) {
      const score = overlap(item.words, group.words);
      if (score > bestScore) {
        bestScore = score;
        best = group;
      }
    }

    // 0.34 is a deliberately loose threshold: on stage, a group that is a bit
    // broad reads far better than a shortlist of singletons.
    if (best && bestScore >= 0.34) {
      best.members.push(item);
      for (const word of item.words) best.words.add(word);
    } else {
      groups.push({ members: [item], words: new Set(item.words) });
    }
  }

  const backing = (group: (typeof groups)[number]) =>
    group.members.length +
    group.members.reduce((sum, m) => sum + (upvotes.get(m.submission.id) ?? 0), 0);

  return groups
    .sort((a, b) => backing(b) - backing(a))
    .map((group, index) => {
      // Label from the words that appear in the most members of the group.
      const frequency = new Map<string, number>();
      for (const member of group.members) {
        for (const word of member.words) frequency.set(word, (frequency.get(word) ?? 0) + 1);
      }
      const label = [...frequency.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([word]) => word)
        .join(" · ");

      return {
        label: label || group.members[0].submission.body.slice(0, 40),
        summary: group.members[0].submission.body,
        submission_ids: group.members.map((m) => m.submission.id),
        rank: index < finalistCount ? index : null,
        is_finalist: index < finalistCount,
        accent: ACCENTS[index % ACCENTS.length],
      };
    });
}

/** Writes a local grouping to the database, replacing whatever was there. */
export async function saveLocalClusters(
  slideId: string,
  groups: ReturnType<typeof clusterLocally>,
) {
  await supabase.from("submissions").update({ cluster_id: null }).eq("slide_id", slideId);
  await supabase.from("clusters").delete().eq("slide_id", slideId);

  const { data: inserted, error } = await supabase
    .from("clusters")
    .insert(
      groups.map((g) => ({
        slide_id: slideId,
        label: g.label,
        summary: g.summary,
        rank: g.rank,
        is_finalist: g.is_finalist,
        accent: g.accent,
      })),
    )
    .select("id");

  if (error || !inserted) throw new Error(error?.message ?? "Could not save the grouping.");

  await Promise.all(
    inserted.map((cluster, i) =>
      supabase.from("submissions").update({ cluster_id: cluster.id }).in("id", groups[i].submission_ids),
    ),
  );

  return inserted.length;
}
