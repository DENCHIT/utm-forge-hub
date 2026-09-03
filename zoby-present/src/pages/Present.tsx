import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SlideRenderer } from "@/components/slides/SlideRenderer";
import { goToSlide, useLiveSession } from "@/hooks/useLiveSession";
import { applyTheme, resetTheme } from "@/lib/theme";
import type { BulletsContent } from "@/lib/types";

/**
 * The stage screen. Mirror this to the projector and never touch it again -
 * everything is driven from the remote (/control/:sessionId) or the keyboard.
 *
 * Keys: -> / space advance, <- back, F fullscreen, . blank.
 */
export default function Present() {
  const { sessionId } = useParams();
  const { session, event, slides, currentSlide, currentIndex, loading, error } =
    useLiveSession(sessionId);
  const [revealed, setRevealed] = useState(1);
  const [blank, setBlank] = useState(false);

  useEffect(() => {
    document.body.dataset.stage = "true";
    return () => {
      delete document.body.dataset.stage;
    };
  }, []);

  useEffect(() => {
    applyTheme(event?.theme);
    return resetTheme;
  }, [event?.theme]);

  // Reset the bullet reveal whenever the room moves to a different slide.
  useEffect(() => setRevealed(1), [currentSlide?.id]);

  const advance = useCallback(
    async (direction: 1 | -1) => {
      if (!sessionId || !slides.length) return;

      const bullets = currentSlide?.content as BulletsContent | undefined;
      const total = currentSlide?.type === "bullets" && bullets?.reveal ? bullets.items.length : 0;

      // Step through the bullets before leaving the slide.
      if (direction === 1 && revealed < total) {
        setRevealed((n) => n + 1);
        return;
      }
      if (direction === -1 && revealed > 1) {
        setRevealed((n) => n - 1);
        return;
      }

      const next = Math.min(slides.length - 1, Math.max(0, currentIndex + direction));
      if (next === currentIndex) return;
      await goToSlide(sessionId, slides[next].id);
    },
    [sessionId, slides, currentIndex, currentSlide, revealed],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        void advance(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        void advance(-1);
      } else if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      } else if (e.key === "." || e.key === "b") {
        setBlank((b) => !b);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  if (loading) return <StageMessage>Loading the deck&hellip;</StageMessage>;
  if (error) return <StageMessage>{error}</StageMessage>;
  if (!session) return <StageMessage>Session not found.</StageMessage>;
  if (!currentSlide) return <StageMessage>{session.title} has no slides yet.</StageMessage>;

  return (
    <div className="stage-scale relative h-screen w-screen overflow-hidden bg-canvas">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id}
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <SlideRenderer slide={currentSlide} event={event} revealed={revealed} active />
        </motion.div>
      </AnimatePresence>

      {blank && <div className="absolute inset-0 z-50 bg-black" />}

      {/* Deliberately faint: orientation for the speaker, invisible from row 20. */}
      <div className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted/40">
        {currentIndex + 1} / {slides.length}
      </div>
    </div>
  );
}

function StageMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-canvas text-xl text-muted">
      {children}
    </div>
  );
}
