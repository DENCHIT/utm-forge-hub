import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowBigUp, Check, Loader2, Mail, PartyPopper, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useInteraction, type RankedSubmission } from "@/hooks/useInteraction";
import { useParticipant } from "@/hooks/useParticipant";
import { usePresence } from "@/hooks/usePresence";
import { applyTheme, resetTheme } from "@/lib/theme";
import { cn, participantToken, pluralise } from "@/lib/utils";
import type { Cluster, CollectContent, EventRecord } from "@/lib/types";

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
  usePresence(sessionId, true);

  const sourceSlideId = useMemo(() => {
    if (!currentSlide) return undefined;
    if (currentSlide.type === "collect") return currentSlide.id;
    const source = (currentSlide.content as Record<string, unknown>).sourceSlideId;
    return typeof source === "string" ? source : undefined;
  }, [currentSlide]);

  const { ranked, clusters, votes, submissionVotes, tally, totalVotes } =
    useInteraction(sourceSlideId);
  const phase = currentSlide?.phase ?? "idle";
  const myVote = votes.find((v) => v.participant_id === participantId);

  // Which submissions are mine, and did any of them make the shortlist? That
  // moment - "the thing you typed is on the big screen" - is the single best
  // reason for the person next to them to join in.
  const mine = ranked.filter((s) => s.participant_id === participantId);
  const myFinalist = useMemo(() => {
    const finalistIds = new Set(clusters.filter((c) => c.is_finalist).map((c) => c.id));
    const hit = mine.find((s) => s.cluster_id && finalistIds.has(s.cluster_id));
    return hit ? clusters.find((c) => c.id === hit.cluster_id) ?? null : null;
  }, [mine, clusters]);

  const collectContent = currentSlide?.content as CollectContent | undefined;
  const upvotesAllowed =
    collectContent?.allowUpvotes !== false &&
    ["collecting", "clustering", "shortlist"].includes(phase);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-5 p-5">
      <header className="pt-4">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">{eventName}</p>
      </header>

      {myFinalist && <FinalistBanner cluster={myFinalist} />}

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
              eventId={eventId}
              slideId={sourceSlideId}
              participantId={participantId}
              content={collectContent}
              others={ranked.filter((s) => s.participant_id !== participantId)}
              myUpvotes={submissionVotes}
              upvotesAllowed={upvotesAllowed}
              hasSubmitted={mine.length > 0}
            />
          ) : upvotesAllowed && sourceSlideId ? (
            // Grouping and shortlist are dead air on a phone otherwise. Keep
            // people backing each other's problems right up to the vote.
            <BackPanel
              slideId={sourceSlideId}
              participantId={participantId}
              others={ranked.filter((s) => s.participant_id !== participantId)}
              myUpvotes={submissionVotes}
            />
          ) : phase === "voting" && sourceSlideId ? (
            <VotePanel
              slideId={sourceSlideId}
              participantId={participantId}
              clusters={clusters}
              chosenClusterId={myVote?.cluster_id ?? null}
            />
          ) : phase === "results" ? (
            <div className="space-y-5">
              <ResultsPanel clusters={clusters} tally={tally} totalVotes={totalVotes} />
              {/* Last call, and the best moment to ask: they have just watched
                  the room engage with the thing they typed. */}
              {mine.length > 0 && (
                <NotifyMe eventId={eventId} prompt={collectContent?.notifyConsentText} />
              )}
            </div>
          ) : (
            <Waiting />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * Email capture. Shown once someone has actually put a problem in, because
 * "tell me when you cover mine" only means anything after there is a "mine".
 *
 * Writes through the `leave_contact` function - the audience has no rights on
 * the contacts table at all, so the anon key can never read the list back.
 */
function NotifyMe({ eventId, prompt }: { eventId: string; prompt?: string }) {
  const consentText =
    prompt ??
    "Email me once there's an answer to my problem. My address is used for that " +
      "and nothing else, and I can unsubscribe from any email.";

  const storageKey = `zoby-present:contact:${eventId}`;
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(() => Boolean(localStorage.getItem(storageKey)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc("leave_contact", {
      p_event_id: eventId,
      p_token: participantToken(eventId),
      p_email: email.trim(),
      p_consent_text: consentText,
    });

    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    // Remembered on the device only: the phone cannot read the list back, so
    // this is what stops it asking the same person twice.
    localStorage.setItem(storageKey, "1");
    setSaved(true);
  };

  if (saved) {
    return (
      <p className="card flex items-center gap-2 p-3 text-sm text-muted">
        <Check size={16} className="shrink-0 text-positive" />
        You&rsquo;re on the list. We&rsquo;ll email you when yours is covered.
      </p>
    );
  }

  return (
    <form onSubmit={save} className="card space-y-3 p-4">
      <div className="flex items-start gap-2">
        <Mail size={16} className="mt-0.5 shrink-0 text-brand" />
        <p className="text-sm font-semibold">Want the answer to yours?</p>
      </div>

      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="field text-base"
      />

      {/* The consent is the label, not a pre-ticked box buried underneath. The
          exact wording is stored on the row, so you can show what someone
          agreed to months later. */}
      <p className="text-xs leading-relaxed text-muted">{consentText}</p>

      {error && <p className="text-sm text-warning">{error}</p>}

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
        Notify me
      </button>
    </form>
  );
}

function FinalistBanner({ cluster }: { cluster: Cluster }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card flex items-start gap-3 border-2 p-4"
      style={{ borderColor: cluster.accent ?? "hsl(var(--brand))" }}
    >
      <PartyPopper size={20} className="mt-0.5 shrink-0 text-brand" />
      <div>
        <p className="font-display font-bold">Your problem made the top three</p>
        <p className="text-sm text-muted">It&rsquo;s up there as &ldquo;{cluster.label}&rdquo;.</p>
      </div>
    </motion.div>
  );
}

/** Shared upvote button used by both the submit and the backing panels. */
function UpvoteList({
  slideId,
  participantId,
  others,
  myUpvotes,
  heading,
}: {
  slideId: string;
  participantId: string | null;
  others: RankedSubmission[];
  myUpvotes: { submission_id: string; participant_id: string }[];
  heading: string;
}) {
  const [pending, setPending] = useState<string | null>(null);

  const backed = new Set(
    myUpvotes.filter((v) => v.participant_id === participantId).map((v) => v.submission_id),
  );

  const toggle = async (submissionId: string) => {
    if (!participantId) return;
    setPending(submissionId);

    if (backed.has(submissionId)) {
      await supabase
        .from("submission_votes")
        .delete()
        .eq("submission_id", submissionId)
        .eq("participant_id", participantId);
    } else {
      await supabase
        .from("submission_votes")
        .insert({ submission_id: submissionId, participant_id: participantId, slide_id: slideId });
    }
    setPending(null);
  };

  if (others.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-muted">{heading}</p>
      {others.slice(0, 30).map((submission) => {
        const isBacked = backed.has(submission.id);
        return (
          <button
            key={submission.id}
            type="button"
            onClick={() => toggle(submission.id)}
            disabled={pending !== null}
            className={cn(
              "card flex w-full items-start gap-3 p-3 text-left transition active:scale-[0.98]",
              isBacked && "border-brand bg-brand/10",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-bold",
                isBacked ? "bg-brand text-white" : "bg-canvas text-muted",
              )}
            >
              {pending === submission.id ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>
                  <ArrowBigUp size={14} />
                  {submission.upvotes > 0 && <span className="text-[10px]">{submission.upvotes}</span>}
                </>
              )}
            </span>
            <span className="min-w-0 flex-1 text-sm">
              {submission.body}
              {submission.source !== "audience" && (
                <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted">
                  {submission.source_label ??
                    (submission.source === "seed" ? "Asked before today" : "From the floor")}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SubmitPanel({
  eventId,
  slideId,
  participantId,
  content,
  others,
  myUpvotes,
  upvotesAllowed,
  hasSubmitted,
}: {
  eventId: string;
  slideId: string;
  participantId: string | null;
  content?: CollectContent;
  others: RankedSubmission[];
  myUpvotes: { submission_id: string; participant_id: string }[];
  upvotesAllowed: boolean;
  hasSubmitted: boolean;
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
    const { data: created, error: insertError } = await supabase
      .from("submissions")
      .insert({ slide_id: slideId, participant_id: participantId, body: trimmed, source: "audience" })
      .select("id")
      .single();

    if (insertError) {
      setSending(false);
      setError(insertError.message);
      return;
    }

    setSent((current) => [trimmed, ...current]);
    setBody("");

    // Kick off screening from here so the row clears in the second between
    // tapping send and looking up at the wall. If this call never lands, the
    // row stays pending and the presenter's remote sweeps it up - the wall
    // never shows anything unscreened either way.
    await supabase.functions
      .invoke("screen-submissions", { body: { submissionId: created.id } })
      .catch(() => undefined);

    setSending(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-4">
        <h1 className="font-display text-2xl font-bold leading-tight">
          {content?.prompt ?? "What is your biggest problem right now?"}
        </h1>

        {/* Worked examples. Most people do not arrive with a problem ready -
            they need something to react against. */}
        {content?.examples?.length ? (
          <div className="flex flex-wrap gap-2">
            {content.examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setBody(example)}
                className="rounded-full border border-line px-3 py-1.5 text-xs text-muted active:scale-95"
              >
                {example}
              </button>
            ))}
          </div>
        ) : null}

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={content?.placeholder ?? "Type your problem…"}
          maxLength={500}
          rows={4}
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

      {/* Only once they have skin in the game. Asking for an address before
          somebody has submitted anything is just a lead form. */}
      {(hasSubmitted || sent.length > 0) && (
        <NotifyMe eventId={eventId} prompt={content?.notifyConsentText} />
      )}

      {upvotesAllowed && (
        <UpvoteList
          slideId={slideId}
          participantId={participantId}
          others={others}
          myUpvotes={myUpvotes}
          heading="Or back one already in"
        />
      )}
    </div>
  );
}

function BackPanel({
  slideId,
  participantId,
  others,
  myUpvotes,
}: {
  slideId: string;
  participantId: string | null;
  others: RankedSubmission[];
  myUpvotes: { submission_id: string; participant_id: string }[];
}) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold leading-tight">
        Which of these is also your problem?
      </h1>
      <p className="text-sm text-muted">Back as many as you like. It all counts.</p>
      <UpvoteList
        slideId={slideId}
        participantId={participantId}
        others={others}
        myUpvotes={myUpvotes}
        heading="From the room"
      />
    </div>
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
  clusters: Cluster[];
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
    else if (navigator.vibrate) navigator.vibrate(12);
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
  clusters: Cluster[];
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
