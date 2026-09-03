// Groups the audience's raw submissions into themed clusters and picks the
// finalists. Runs server-side so ANTHROPIC_API_KEY never reaches a browser.
//
// POST { slideId: string, finalistCount?: number }
// -> { clusters: [{ id, label, summary, rank, is_finalist, size }] }

import Anthropic from "npm:@anthropic-ai/sdk@^0.71.0";
import { createClient } from "npm:@supabase/supabase-js@^2.57.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACCENTS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4",
  "#8b5cf6", "#ef4444", "#84cc16", "#f97316", "#14b8a6",
];

const EMIT_CLUSTERS = {
  name: "emit_clusters",
  description: "Return the grouped problems.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      clusters: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: {
              type: "string",
              description: "The shared problem, 2-6 words, in the audience's own language.",
            },
            summary: {
              type: "string",
              description: "One sentence on what these people are struggling with.",
            },
            submission_ids: {
              type: "array",
              items: { type: "string" },
              description: "Ids of every submission in this group.",
            },
          },
          required: ["label", "summary", "submission_ids"],
        },
      },
    },
    required: ["clusters"],
  },
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY is not set." }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header." }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  // Acts as the caller, so RLS decides whether they may touch this slide.
  const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  // Writes the results back; bypasses RLS deliberately.
  const asService = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let slideId: string;
  let finalistCount = 3;
  try {
    const body = await req.json();
    slideId = String(body.slideId ?? "");
    if (Number.isFinite(body.finalistCount)) {
      finalistCount = Math.min(6, Math.max(2, Number(body.finalistCount)));
    }
  } catch {
    return json({ error: "Body must be JSON." }, 400);
  }
  if (!slideId) return json({ error: "slideId is required." }, 400);

  // The caller-scoped read doubles as the permission check: a phone with the
  // anon key can read the slide but the write below is service-role only, and
  // we reject anyone who is not an org member.
  const { data: slide, error: slideError } = await asCaller
    .from("slides")
    .select("id, content, session_id, sessions!inner(event_id, events!inner(org_id))")
    .eq("id", slideId)
    .single();

  if (slideError || !slide) return json({ error: "Slide not found." }, 404);

  const { data: caller } = await asCaller.auth.getUser();
  if (!caller?.user) return json({ error: "Sign in to run clustering." }, 401);

  const orgId = (slide as Record<string, any>).sessions?.events?.org_id;
  const { data: membership } = await asCaller
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", caller.user.id)
    .maybeSingle();
  if (!membership) return json({ error: "Not a member of this organisation." }, 403);

  const { data: submissions, error: subsError } = await asService
    .from("submissions")
    .select("id, body")
    .eq("slide_id", slideId)
    .order("created_at", { ascending: true });

  if (subsError) return json({ error: subsError.message }, 500);
  if (!submissions?.length) return json({ error: "No submissions to group yet." }, 400);

  // Presenter-authored steer: "we're after operational problems, not people
  // problems", "ignore anything about pricing", and so on.
  const steer = (slide.content as Record<string, unknown>)?.clustering_context;
  const audience = (slide.content as Record<string, unknown>)?.audience_context;

  const system = [
    "You group problems submitted live by an audience at a conference talk.",
    "",
    "Rules:",
    "- Group by the underlying problem, not by shared wording. Two people who",
    "  describe the same pain in different words belong together.",
    "- Every submission goes in exactly one group. Use its id verbatim.",
    "- A submission that genuinely stands alone gets its own group of one.",
    "- Aim for 4-8 groups. Fewer if the room is unanimous, more if it is not.",
    "- Label each group in the audience's own register: plain, specific, no",
    "  consultant-speak. It goes on a screen behind the speaker.",
    audience ? `\nWho is in the room: ${audience}` : "",
    steer ? `\nWhat the speaker wants surfaced: ${steer}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const anthropic = new Anthropic({ apiKey });

  let payload: { clusters: Array<{ label: string; summary: string; submission_ids: string[] }> };
  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system,
      tools: [EMIT_CLUSTERS as unknown as Anthropic.Tool],
      tool_choice: { type: "tool", name: "emit_clusters" },
      messages: [
        {
          role: "user",
          content:
            "Group these submissions.\n\n" +
            submissions.map((s) => `${s.id}: ${s.body}`).join("\n"),
        },
      ],
    });

    const block = response.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      return json({ error: "The model returned no grouping." }, 502);
    }
    payload = block.input as typeof payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: `Clustering failed: ${message}` }, 502);
  }

  const valid = new Set(submissions.map((s) => s.id));
  const groups = payload.clusters
    .map((c) => ({ ...c, submission_ids: c.submission_ids.filter((id) => valid.has(id)) }))
    .filter((c) => c.submission_ids.length > 0)
    // Biggest group wins the room, so rank by size.
    .sort((a, b) => b.submission_ids.length - a.submission_ids.length);

  if (!groups.length) return json({ error: "Nothing could be grouped." }, 502);

  // Re-running replaces the previous grouping rather than stacking on it.
  await asService.from("submissions").update({ cluster_id: null }).eq("slide_id", slideId);
  await asService.from("clusters").delete().eq("slide_id", slideId);

  const { data: inserted, error: insertError } = await asService
    .from("clusters")
    .insert(
      groups.map((g, i) => ({
        slide_id: slideId,
        label: g.label,
        summary: g.summary,
        rank: i < finalistCount ? i : null,
        is_finalist: i < finalistCount,
        accent: ACCENTS[i % ACCENTS.length],
      })),
    )
    .select("id, label, summary, rank, is_finalist, accent");

  if (insertError || !inserted) {
    return json({ error: insertError?.message ?? "Could not save clusters." }, 500);
  }

  await Promise.all(
    inserted.map((cluster, i) =>
      asService
        .from("submissions")
        .update({ cluster_id: cluster.id })
        .in("id", groups[i].submission_ids),
    ),
  );

  return json({
    clusters: inserted.map((c, i) => ({ ...c, size: groups[i].submission_ids.length })),
  });
});
