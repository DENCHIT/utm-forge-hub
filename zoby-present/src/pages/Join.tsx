import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useInteraction } from "@/hooks/useInteraction";
import { useParticipant } from "@/hooks/useParticipant";
import { applyTheme, resetTheme } from "@/lib/theme";
import { cn, pluralise } from "@/lib/utils";
import type { CollectContent, EventRecord } from "@/lib/types";

/**
 * What the audience gets after scanning. No sign-up, no app: the phone follows
 * whatever the stage is on and offers the one action that slide allows.
 */
export default function Join() {
  const { code } = useParams();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    (async () => {
      const { data: eventRow } = await supabase
        .from("events")
        .select("*")
        .eq("join_code", code.toUpperCase())
        .maybeSingle();

      if (cancelled) return;
      if (!eventRow) {
        setStatus("missing");
        return;
      }

      // Follow whichever session is on stage right now.
      const { data: sessionRows } = await supabase
        .from("sessions")
        .select("id, status, position")
        .eq("event_id", eventRow.id)
        .order("position");

      const live = sessionRows?.find((s) => s.status === "live") ?? sessionRows?.[0];

      setEvent(eventRow as EventRecord);
      setSessionId(live?.id);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    applyTheme(event?.theme);
    return resetTheme;
  }, [event?.theme]);

  if (status === "loading") return <Centred><Loader2 className="animate-spin" /></Centred>;
  if (status === "missing") return <Centred>That code does not match a live event.</Centred>;
  if (!event?.is_live) return <Centred>{event?.name} has not opened yet. Keep this page open.</Centred>;
  if (!sessionId) return <Centred>Waiting for the session to start&hellip;</Centred>;

  return <JoinedSession eventId={event.id} eventName={event.name} sessionId={sessionId} />;
}

function JoinedSession({
  eventId,
  eventName,
  sessionId,
}: {
  eventId: string;
  eventName: string;
  sessionId: string;
}) {
  const { currentSlide } = useLiveSession(sessionId);
  const { participantId } = useParticipant(eventId);

  const sourceSlideId = useMemo(() => {
    if (!currentSlide) return undefined;
    if (currentSlide.type === "collect") return currentSlide.id;
    const source = (currentSlide.content as Record<string, unknown>).sourceSlideId;
    return typeof source === "string" ? source : undefined;
  }, [currentSlide]);

  const { clusters, votes, tally, totalVotes } = useInteraction(sourceSlideId);
  const phase = currentSlide?.phase ?? "idle";
  const myVote = votes.find((v) => v.participant_id === participantId);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-5 p-5">
      <header className="pt-4">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">{eventName}</p>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentSlide?.id}-${phase}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.28 }}
          className="flex-1"
        >
          {phase === "collecting" && sourceSlideId ? (
            <SubmitPanel
              slideId={sourceSlideId}
              participantId={participantId}
              content={currentSlide?.content as CollectContent}
            />
          ) : phase === "voting" && sourceSlideId ? (
            <VotePanel
              slideId={sourceSlideId}
              participantId={participantId}
              clusters={clusters}
              chosenClusterId={myVote?.cluster_id ?? null}
            />
          ) : phase === "results" ? (
            <ResultsPanel clusters={clusters} tally={tally} totalVotes={totalVotes} />
          ) : (
            <Waiting />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SubmitPanel({
  slideId,
  participantId,
  content,
}: {
  slideId: string;
  participantId: string | null;
  content?: CollectContent;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length < 3) {
      setError("A few more words, please.");
      return;
    }

    setSending(true);
    setError(null);
    const { error: insertError } = await supabase
      .from("submissions")
      .insert({ slide_id: slideId, participant_id: participantId, body: trimmed });
    setSending(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSent((current) => [trimmed, ...current]);
    setBody("");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="font-display text-2xl font-bold leading-tight">
        {content?.prompt ?? "What is your biggest problem right now?"}
      </h1>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={content?.placeholder ?? "Type your problem…"}
        maxLength={500}
        rows={4}
        autoFocus
        className="field resize-none text-base"
      />

      {error && <p className="text-sm text-warning">{error}</p>}

      <button type="submit" disabled={sending} className="btn-primary w-full py-3.5 text-base">
        {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        Send it in
      </button>

      {/* Sending more than one is fine and encouraged - people warm up. */}
      {sent.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs uppercase tracking-wider text-muted">
            {pluralise(sent.length, "problem")} sent
          </p>
          {sent.map((item, i) => (
            <p key={i} className="card flex items-start gap-2 p-3 text-sm text-muted">
              <Check size={16} className="mt-0.5 shrink-0 text-positive" />
              {item}
            </p>
          ))}
        </div>
      )}
    </form>
  );
}

function VotePanel({
  slideId,
  participantId,
  clusters,
  chosenClusterId,
}: {
  slideId: string;
  participantId: string | null;
  clusters: { id: string; label: string; summary: string | null; accent: string | null; is_finalist: boolean }[];
  chosenClusterId: string | null;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const finalists = clusters.filter((c) => c.is_finalist);

  const castVote = async (clusterId: string) => {
    if (!participantId) return;
    setPending(clusterId);
    setError(null);

    // One row per person per slide; changing your mind updates it.
    const { error: voteError } = await supabase
      .from("votes")
      .upsert(
        { slide_id: slideId, cluster_id: clusterId, participant_id: participantId },
        { onConflict: "slide_id,participant_id" },
      );

    setPending(null);
    if (voteError) setError(voteError.message);
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold leading-tight">Which one do we solve?</h1>
      {finalists.map((cluster) => {
        const chosen = chosenClusterId === cluster.id;
        return (
          <button
            key={cluster.id}
            type="button"
            onClick={() => castVote(cluster.id)}
            disabled={pending !== null}
            className={cn(
              "card w-full p-4 text-left transition active:scale-[0.98]",
              chosen && "border-2",
            )}
            style={chosen ? { borderColor: cluster.accent ?? "hsl(var(--brand))" } : undefined}
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: cluster.accent ?? "hsl(var(--brand))" }}
              >
                {pending === cluster.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : chosen ? (
                  <Check size={14} />
                ) : null}
              </span>
              <div>
                <p className="font-display text-lg font-bold leading-tight">{cluster.label}</p>
                {cluster.summary && <p className="mt-1 text-sm text-muted">{cluster.summary}</p>}
              </div>
            </div>
          </button>
        );
      })}

      {error && <p className="text-sm text-warning">{error}</p>}
      {chosenClusterId && (
        <p className="text-center text-sm text-muted">Vote counted. Tap another to change it.</p>
      )}
    </div>
  );
}

function ResultsPanel({
  clusters,
  tally,
  totalVotes,
}: {
  clusters: { id: string; label: string; accent: string | null; is_finalist: boolean }[];
  tally: Map<string, number>;
  totalVotes: number;
}) {
  const ranked = clusters
    .filter((c) => c.is_finalist)
    .map((cluster) => ({ cluster, votes: tally.get(cluster.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">The room decided</h1>
      {ranked.map(({ cluster, votes }, index) => {
        const share = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
        return (
          <div key={cluster.id} className="card overflow-hidden p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p
                className={cn(
                  "font-display font-bold leading-tight",
                  index === 0 ? "text-xl" : "text-base",
                )}
              >
                {cluster.label}
              </p>
              <p className="shrink-0 font-display text-lg font-black tabular-nums">{share}%</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: cluster.accent ?? "hsl(var(--brand))" }}
                initial={{ width: 0 }}
                animate={{ width: `${share}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Waiting() {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="h-2 w-24 animate-shimmer rounded-full bg-gradient-to-r from-surface via-brand to-surface bg-[length:200%_100%]" />
      <p className="text-muted">Eyes on the screen. We&rsquo;ll bring you in shortly.</p>
    </div>
  );
}

function Centred({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-center text-muted">
      {children}
    </div>
  );
}
