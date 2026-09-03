import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False when the app has not been pointed at a Supabase project yet. */
export const isConfigured = Boolean(url && anonKey);

if (!isConfigured) {
  console.warn(
    "[zoby-present] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are unset. " +
      "Copy .env.example to .env and fill them in.",
  );
}

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "public-anon-key", {
  realtime: { params: { eventsPerSecond: 20 } },
});

/** Origin used to build audience links and QR codes. */
export function publicAppUrl(): string {
  return import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
}
