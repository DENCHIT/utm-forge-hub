import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowBigUp, Check, Download, Mail, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn, pluralise } from "@/lib/utils";
import type { EventRecord, SubmissionExportRow } from "@/lib/types";

type Filter = "all" | "with-email" | "finalists" | "unanswered";

/**
 * Every problem the room submitted, in one place.
 *
 * Two jobs. On the day it is the answering script for session two - search it,
 * sort by backing, work down the list from the stage. Afterwards it is the
 * build list: export it and you have every problem paired with the address of
 * whoever wants to hear the answer.
 */
export default function Submissions() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [rows, setRows] = useState<SubmissionExportRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);

    const [{ data: eventRow }, { data: exportRows, error }] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase
        .from("submission_export")
        .select("*")
        .eq("event_id", eventId)
        .order("upvotes", { ascending: false }),
    ]);

    if (error) toast.error(error.message);
    setEvent((eventRow as EventRecord) ?? null);
    setRows((exportRows as SubmissionExportRow[]) ?? []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => void load(), [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !row.body.toLowerCase().includes(needle)
        && !(row.cluster_label ?? "").toLowerCase().includes(needle)) {
        return false;
      }
      if (filter === "with-email") return Boolean(row.email);
      if (filter === "finalists") return row.is_finalist === true;
      if (filter === "unanswered") return !row.notified_at;
      return true;
    });
  }, [rows, query, filter]);

  const withEmail = rows.filter((r) => r.email).length;

  /**
   * CSV for the other platform. Includes the theme and the backing count so a
   * problem arrives with its context, not just as a line of text.
   */
  const exportCsv = () => {
    const headers = [
      "submission_id", "session", "problem", "theme", "is_finalist",
      "upvotes", "source", "email", "notified_at", "submitted_at",
    ];

    // Guard against a leading =, +, - or @ being run as a formula when this
    // lands in a spreadsheet. Audience-typed text ends up in this file.
    const escape = (value: unknown) => {
      const text = value === null || value === undefined ? "" : String(value);
      const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.join(","),
      ...visible.map((row) =>
        [
          row.submission_id, row.session_title, row.body, row.cluster_label ?? "",
          row.is_finalist ?? false, row.upvotes, row.source, row.email ?? "",
          row.notified_at ?? "", row.created_at,
        ].map(escape).join(","),
      ),
    ].join("\n");

    // Leading BOM, or Excel mangles any non-ASCII the audience typed.
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${event?.join_code ?? "event"}-submissions.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  /** Marks who you have emailed, so the next send skips them. */
  const markNotified = async (row: SubmissionExportRow) => {
    if (!row.email || !eventId) return;
    const { error } = await supabase
      .from("contacts")
      .update({ notified_at: new Date().toISOString() })
      .eq("event_id", eventId)
      .eq("email", row.email);

    if (error) return toast.error(error.message);
    setRows((current) =>
      current.map((r) =>
        r.email === row.email ? { ...r, notified_at: new Date().toISOString() } : r,
      ),
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to={`/events/${eventId}`}
            className="text-xs uppercase tracking-[0.24em] text-muted hover:text-ink"
          >
            &larr; {event?.name ?? "Event"}
          </Link>
          <h1 className="font-display text-3xl font-black">Every problem</h1>
          <p className="text-sm text-muted">
            {pluralise(rows.length, "submission")} &middot; {withEmail} want an answer by email
          </p>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={load} className="btn-ghost">
            <RefreshCw size={15} className={cn(loading && "animate-spin")} /> Refresh
          </button>
          <button type="button" onClick={exportCsv} className="btn-primary">
            <Download size={15} /> Export {visible.length === rows.length ? "all" : "filtered"} CSV
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search problems and themes…"
            className="field pl-9"
          />
        </div>

        {([
          ["all", "All"],
          ["finalists", "Made the top 3"],
          ["with-email", "Wants an answer"],
          ["unanswered", "Not emailed yet"],
        ] as [Filter, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn("btn-ghost", filter === value && "border-brand bg-brand/15 text-brand")}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">Loading&hellip;</p>
      ) : visible.length === 0 ? (
        <p className="card p-8 text-center text-muted">Nothing matches that.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((row) => (
            <article key={row.submission_id} className="card flex items-start gap-4 p-4">
              <div className="flex w-12 shrink-0 flex-col items-center">
                <ArrowBigUp size={16} className="text-brand" />
                <span className="font-display text-lg font-black tabular-nums">{row.upvotes}</span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[15px]">{row.body}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="rounded-full border border-line px-2 py-0.5">
                    {row.session_title}
                  </span>
                  {row.cluster_label && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5",
                        row.is_finalist ? "bg-brand/20 text-brand" : "border border-line",
                      )}
                    >
                      {row.cluster_label}
                      {row.is_finalist && row.cluster_rank !== null && ` · #${row.cluster_rank + 1}`}
                    </span>
                  )}
                  {row.source !== "audience" && (
                    <span className="rounded-full border border-line px-2 py-0.5 uppercase tracking-wider">
                      {row.source_label ?? row.source}
                    </span>
                  )}
                </div>
              </div>

              {row.email ? (
                <div className="flex w-56 shrink-0 flex-col items-end gap-1.5">
                  <a
                    href={`mailto:${row.email}`}
                    className="flex items-center gap-1.5 truncate text-sm text-brand hover:underline"
                  >
                    <Mail size={13} className="shrink-0" /> {row.email}
                  </a>
                  {row.notified_at ? (
                    <span className="flex items-center gap-1 text-xs text-positive">
                      <Check size={12} /> Emailed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markNotified(row)}
                      className="text-xs text-muted hover:text-ink"
                    >
                      Mark as emailed
                    </button>
                  )}
                </div>
              ) : (
                <span className="w-56 shrink-0 text-right text-xs text-muted">No address</span>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
