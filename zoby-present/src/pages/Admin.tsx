import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Monitor, Plus, Smartphone, Trash2 } from "lucide-react";
import { supabase, publicAppUrl } from "@/lib/supabase";
import { SlideRenderer } from "@/components/slides/SlideRenderer";
import { SLIDE_TEMPLATES } from "@/lib/slideTemplates";
import { cn } from "@/lib/utils";
import type { EventRecord, SessionRecord, Slide, SlideType } from "@/lib/types";

/**
 * Deck builder. Slide content is edited as JSON against the shapes in
 * lib/types.ts - deliberately, for now: it covers every slide type on day one
 * and a per-type form can be layered on top later without a data change.
 */
export default function Admin() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!eventId) return;
    const [{ data: eventRow }, { data: sessionRows }] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase.from("sessions").select("*").eq("event_id", eventId).order("position"),
    ]);
    setEvent((eventRow as EventRecord) ?? null);
    setSessions((sessionRows as SessionRecord[]) ?? []);
    setActiveSessionId((current) => current ?? sessionRows?.[0]?.id ?? null);
  }, [eventId]);

  const loadSlides = useCallback(async () => {
    if (!activeSessionId) return;
    const { data } = await supabase
      .from("slides")
      .select("*")
      .eq("session_id", activeSessionId)
      .order("position");
    setSlides((data as Slide[]) ?? []);
  }, [activeSessionId]);

  useEffect(() => void loadSessions(), [loadSessions]);
  useEffect(() => void loadSlides(), [loadSlides]);

  const selected = useMemo(
    () => slides.find((s) => s.id === selectedId) ?? slides[0] ?? null,
    [slides, selectedId],
  );

  const toggleLive = async () => {
    if (!event) return;
    const { error } = await supabase
      .from("events")
      .update({ is_live: !event.is_live })
      .eq("id", event.id);
    if (error) return toast.error(error.message);
    setEvent({ ...event, is_live: !event.is_live });
  };

  const setSessionStatus = async (session: SessionRecord, status: SessionRecord["status"]) => {
    // Only one session is on stage at a time; the audience follows it.
    if (status === "live" && eventId) {
      await supabase
        .from("sessions")
        .update({ status: "complete" })
        .eq("event_id", eventId)
        .eq("status", "live");
    }
    const { error } = await supabase.from("sessions").update({ status }).eq("id", session.id);
    if (error) return toast.error(error.message);
    void loadSessions();
  };

  const addSlide = async (type: SlideType) => {
    if (!activeSessionId) return;
    const { error } = await supabase.from("slides").insert({
      session_id: activeSessionId,
      position: slides.length,
      type,
      content: SLIDE_TEMPLATES[type],
    });
    if (error) return toast.error(error.message);
    void loadSlides();
  };

  const moveSlide = async (slide: Slide, direction: -1 | 1) => {
    const index = slides.findIndex((s) => s.id === slide.id);
    const swap = slides[index + direction];
    if (!swap) return;
    await Promise.all([
      supabase.from("slides").update({ position: swap.position }).eq("id", slide.id),
      supabase.from("slides").update({ position: slide.position }).eq("id", swap.id),
    ]);
    void loadSlides();
  };

  const deleteSlide = async (slide: Slide) => {
    if (!confirm("Delete this slide? Any submissions and votes on it go too.")) return;
    const { error } = await supabase.from("slides").delete().eq("id", slide.id);
    if (error) return toast.error(error.message);
    void loadSlides();
  };

  const saveSlide = async (slide: Slide, patch: Partial<Slide>) => {
    const { error } = await supabase.from("slides").update(patch).eq("id", slide.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    void loadSlides();
  };

  if (!event) return <p className="p-8 text-muted">Loading&hellip;</p>;

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
        <div>
          <Link to="/" className="text-xs uppercase tracking-[0.24em] text-muted hover:text-ink">
            &larr; Events
          </Link>
          <h1 className="font-display text-2xl font-black">{event.name}</h1>
          <p className="text-sm text-muted">
            Audience link:{" "}
            <span className="font-mono text-brand">
              {publicAppUrl().replace(/^https?:\/\//, "")}/join/{event.join_code}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={toggleLive}
          className={event.is_live ? "btn-ghost border-positive text-positive" : "btn-primary"}
        >
          {event.is_live ? "Close the doors" : "Open the doors"}
        </button>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-line p-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "card flex items-center gap-3 p-3",
              session.id === activeSessionId && "border-brand",
            )}
          >
            <button
              type="button"
              onClick={() => setActiveSessionId(session.id)}
              className="text-left"
            >
              <p className="font-semibold">{session.title}</p>
              <p className="text-xs text-muted">{session.status}</p>
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setSessionStatus(session, session.status === "live" ? "draft" : "live")}
                className="btn-ghost px-2 py-1 text-xs"
              >
                {session.status === "live" ? "Stop" : "Go live"}
              </button>
              <Link to={`/present/${session.id}`} target="_blank" className="btn-ghost px-2 py-1">
                <Monitor size={14} />
              </Link>
              <Link to={`/control/${session.id}`} target="_blank" className="btn-ghost px-2 py-1">
                <Smartphone size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
        {/* Slide list */}
        <aside className="space-y-2">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={cn(
                "card flex items-center gap-2 p-2",
                slide.id === selected?.id && "border-brand",
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedId(slide.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm">
                  {index + 1}. {String((slide.content as Record<string, unknown>).heading ?? slide.type)}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted">{slide.type}</p>
              </button>
              <button type="button" onClick={() => moveSlide(slide, -1)} className="text-muted hover:text-ink">
                <ArrowUp size={14} />
              </button>
              <button type="button" onClick={() => moveSlide(slide, 1)} className="text-muted hover:text-ink">
                <ArrowDown size={14} />
              </button>
              <button type="button" onClick={() => deleteSlide(slide)} className="text-muted hover:text-warning">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <details className="card p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              <Plus size={14} className="mr-1 inline" /> Add a slide
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {(Object.keys(SLIDE_TEMPLATES) as SlideType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addSlide(type)}
                  className="btn-ghost px-2 py-1 text-xs"
                >
                  {type}
                </button>
              ))}
            </div>
          </details>
        </aside>

        {/* Live preview at the real aspect ratio. */}
        <main>
          {selected ? (
            <div className="stage-scale aspect-video w-full overflow-hidden rounded-card border border-line bg-canvas text-[0.5em]">
              <SlideRenderer slide={selected} event={event} active={false} />
            </div>
          ) : (
            <p className="text-muted">Add a slide to get started.</p>
          )}
        </main>

        {/* Editor */}
        <aside>{selected && <SlideEditor key={selected.id} slide={selected} onSave={saveSlide} />}</aside>
      </div>
    </div>
  );
}

function SlideEditor({
  slide,
  onSave,
}: {
  slide: Slide;
  onSave: (slide: Slide, patch: Partial<Slide>) => void;
}) {
  const [json, setJson] = useState(() => JSON.stringify(slide.content, null, 2));
  const [notes, setNotes] = useState(slide.notes ?? "");
  const [parseError, setParseError] = useState<string | null>(null);

  const save = () => {
    try {
      const content = JSON.parse(json);
      setParseError(null);
      onSave(slide, { content, notes: notes || null });
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Invalid JSON.");
    }
  };

  return (
    <div className="card space-y-3 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-muted">{slide.type} content</p>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        spellCheck={false}
        rows={18}
        className="field font-mono text-xs"
      />
      {parseError && <p className="text-sm text-warning">{parseError}</p>}

      <p className="text-xs uppercase tracking-[0.24em] text-muted">Speaker notes</p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        placeholder="Only you see these, on the remote."
        className="field text-sm"
      />

      <button type="button" onClick={save} className="btn-primary w-full">
        Save slide
      </button>
    </div>
  );
}
