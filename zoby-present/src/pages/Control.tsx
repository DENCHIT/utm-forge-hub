import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Users,
  Vote as VoteIcon,
} from "lucide-react";
import { goToSlide, setSlidePhase, useLiveSession } from "@/hooks/useLiveSession";
import { useInteraction } from "@/hooks/useInteraction";
import { supabase } from "@/lib/supabase";
import { cn, pluralise } from "@/lib/utils";
import type { CollectContent, Slide, SlidePhase } from "@/lib/types";

/**
 * The presenter's phone or second screen. Everything that changes what the room
 * sees happens here, so the stage screen can stay untouched all session.
 */
export default function Control() {
  const { sessionId } = useParams();
  const { session, slides, currentSlide, currentIndex, loading } = useLiveSession(sessionId);

  // The interaction the current slide belongs to, so counts and the AI button
  // stay available across the collect/cluster/vote/results run.
  const sourceSlideId = useMemo(() => {
    if (!currentSlide) return undefined;
    if (currentSlide.type === "collect") return currentSlide.id;
    const source = (currentSlide.content as Record<string, unknown>).sourceSlideId;
    return typeof source === "string" ? source : undefined;
  }, [currentSlide]);

  const { submissions, clusters, totalVotes } = useInteraction(sourceSlideId);
  const [clustering, setClustering] = useState(false);

  // Keep the remote awake; a locked phone mid-session is a bad moment.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock
      ?.request("screen")
      .then((sentinel) => {
        lock = sentinel;
      })
      .catch(() => undefined);
    return () => void lock?.release().catch(() => undefined);
  }, []);

  if (loading) return <p className="p-6 text-muted">Loading&hellip;</p>;
  if (!session) return <p className="p-6 text-muted">Session not found.</p>;

  const move = async (direction: 1 | -1) => {
    const next = Math.min(slides.length - 1, Math.max(0, currentIndex + direction));
    if (next === currentIndex || !sessionId) return;
    await goToSlide(sessionId, slides[next].id);
  };

  const setPhase = async (phase: SlidePhase) => {
    if (!currentSlide) return;
    // The phase lives on the interaction's own slide when there is one, so the
    // audience's submit/vote gates follow the run rather than the screen.
    const target = sourceSlideId ?? currentSlide.id;
    try {
      await setSlidePhase(target, phase);
      if (target !== currentSlide.id) await setSlidePhase(currentSlide.id, phase);
      toast.success(`Phase: ${phase}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change phase.");
    }
  };

  const runClustering = async () => {
    if (!sourceSlideId) return;
    setClustering(true);
    await setSlidePhase(sourceSlideId, "clustering").catch(() => undefined);

    const collectSlide = slides.find((s) => s.id === sourceSlideId);
    const finalistCount = (collectSlide?.content as CollectContent | undefined)?.finalistCount ?? 3;

    const { data, error } = await supabase.functions.invoke("cluster-problems", {
      body: { slideId: sourceSlideId, finalistCount },
    });

    setClustering(false);

    if (error || (data as { error?: string })?.error) {
      const message = (data as { error?: string })?.error ?? error?.message ?? "Clustering failed.";
      toast.error(message);
      return;
    }
    toast.success(`Grouped into ${pluralise((data as { clusters: unknown[] }).clusters.length, "theme")}`);
  };

  const isInteractive =
    currentSlide && ["collect", "cluster", "vote", "results"].includes(currentSlide.type);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 pb-32">
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Now controlling</p>
        <h1 className="font-display text-2xl font-bold">{session.title}</h1>
      </header>

      {/* Live counts. The two numbers the speaker actually needs mid-flow. */}
      {isInteractive && (
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<Users size={16} />} label="Problems in" value={submissions.length} />
          <Stat icon={<VoteIcon size={16} />} label="Votes cast" value={totalVotes} />
        </div>
      )}

      {currentSlide && (
        <section className="card p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">
            Slide {currentIndex + 1} of {slides.length} &middot; {currentSlide.type}
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold">{slideLabel(currentSlide)}</h2>
          {currentSlide.notes && (
            <p className="mt-3 whitespace-pre-wrap border-l-2 border-brand pl-3 text-sm text-muted">
              {currentSlide.notes}
            </p>
          )}
        </section>
      )}

      {isInteractive && (
        <section className="card space-y-3 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Run the interaction</p>
          <div className="grid grid-cols-2 gap-2">
            <PhaseButton
              current={currentSlide?.phase}
              phase="collecting"
              onClick={setPhase}
              label="Open submissions"
            />
            <PhaseButton
              current={currentSlide?.phase}
              phase="shortlist"
              onClick={setPhase}
              label="Show top 3"
            />
            <PhaseButton
              current={currentSlide?.phase}
              phase="voting"
              onClick={setPhase}
              label="Open voting"
            />
            <PhaseButton
              current={currentSlide?.phase}
              phase="results"
              onClick={setPhase}
              label="Reveal winner"
            />
          </div>

          <button
            type="button"
            onClick={runClustering}
            disabled={clustering || submissions.length === 0}
            className="btn-primary w-full"
          >
            {clustering ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {clusters.length ? "Re-group problems" : "Group problems with AI"}
          </button>
          {submissions.length === 0 && (
            <p className="text-center text-xs text-muted">Nothing submitted yet.</p>
          )}
        </section>
      )}

      <section className="card divide-y divide-line">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => sessionId && goToSlide(sessionId, slide.id)}
            className={cn(
              "flex w-full items-center gap-3 p-3 text-left transition hover:bg-canvas",
              index === currentIndex && "bg-canvas",
            )}
          >
            <span className="w-6 shrink-0 text-xs tabular-nums text-muted">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{slideLabel(slide)}</span>
            <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
              {slide.type}
            </span>
          </button>
        ))}
      </section>

      {/* Thumb-reachable, fixed, and big. Nobody aims precisely on stage. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-3">
          <button type="button" onClick={() => move(-1)} className="btn-ghost h-14 flex-1">
            <ChevronLeft size={22} />
          </button>
          <button type="button" onClick={() => move(1)} className="btn-primary h-14 flex-[2]">
            Next <ChevronRight size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card p-3">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted">
        {icon} {label}
      </p>
      <p className="font-display text-3xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function PhaseButton({
  current,
  phase,
  label,
  onClick,
}: {
  current: SlidePhase | undefined;
  phase: SlidePhase;
  label: string;
  onClick: (phase: SlidePhase) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(phase)}
      className={cn("btn-ghost", current === phase && "border-brand bg-brand/15 text-brand")}
    >
      {label}
    </button>
  );
}

function slideLabel(slide: Slide): string {
  const content = slide.content as Record<string, unknown>;
  for (const key of ["heading", "prompt", "question", "quote", "body"]) {
    const value = content[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return `Untitled ${slide.type} slide`;
}
