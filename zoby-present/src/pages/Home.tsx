import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase, isConfigured } from "@/lib/supabase";
import type { EventRecord } from "@/lib/types";

/** Staff entry point: magic-link sign-in, then the list of events. */
export default function Home() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    supabase
      .from("events")
      .select("*")
      .order("starts_at", { ascending: true, nullsFirst: false })
      .then(({ data }) => setEvents((data as EventRecord[]) ?? []));
  }, [signedIn]);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (!error) setSent(true);
  };

  if (!isConfigured) {
    return (
      <Shell>
        <p className="text-muted">
          Set <code className="text-brand">VITE_SUPABASE_URL</code> and{" "}
          <code className="text-brand">VITE_SUPABASE_ANON_KEY</code> in <code>.env</code>, then
          reload. See the README for the full setup.
        </p>
      </Shell>
    );
  }

  if (signedIn === null) {
    return (
      <Shell>
        <Loader2 className="animate-spin text-muted" />
      </Shell>
    );
  }

  if (!signedIn) {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-black">ZOBY Present</h1>
        <p className="text-muted">Sign in to manage your sessions.</p>
        {sent ? (
          <p className="text-positive">Check your inbox for the sign-in link.</p>
        ) : (
          <form onSubmit={sendLink} className="flex w-full max-w-sm gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="field"
            />
            <button type="submit" className="btn-primary shrink-0">
              Send link
            </button>
          </form>
        )}
        <p className="pt-6 text-sm text-muted">
          Here for the talk? Scan the QR code on screen, or open{" "}
          <span className="text-brand">/join/YOURCODE</span>.
        </p>
      </Shell>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl font-black">Your events</h1>
        <button type="button" onClick={() => supabase.auth.signOut()} className="btn-ghost">
          Sign out
        </button>
      </div>

      {events.length === 0 && (
        <p className="text-muted">
          No events yet. Run <code className="text-brand">supabase/seed.sql</code> to create the
          demo event, or insert one in the Supabase dashboard.
        </p>
      )}

      <div className="space-y-3">
        {events.map((event) => (
          <Link key={event.id} to={`/events/${event.id}`} className="card flex items-center justify-between p-4 hover:border-brand">
            <div>
              <p className="font-display text-lg font-bold">{event.name}</p>
              <p className="text-sm text-muted">
                Join code <span className="font-mono text-brand">{event.join_code}</span>
              </p>
            </div>
            <span
              className={
                event.is_live
                  ? "rounded-full bg-positive/20 px-3 py-1 text-xs font-semibold text-positive"
                  : "rounded-full border border-line px-3 py-1 text-xs text-muted"
              }
            >
              {event.is_live ? "Live" : "Closed"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      {children}
    </div>
  );
}
