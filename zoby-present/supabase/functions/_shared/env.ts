/**
 * Reads the Supabase credentials the platform injects into every function.
 *
 * Projects created before the API key change get SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY; newer ones get SB_PUBLISHABLE_KEY and
 * SB_SECRET_KEY. Both are accepted here so a function does not silently fail
 * on a freshly created project.
 *
 * Neither key is ever hard-coded or set by hand: Supabase provides them at
 * runtime. If you find yourself pasting a secret key anywhere, something has
 * gone wrong - it bypasses row-level security completely.
 */
export function supabaseEnv() {
  const url = Deno.env.get("SUPABASE_URL");

  const publishable =
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SB_PUBLISHABLE_KEY");

  const secret =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SB_SECRET_KEY");

  const missing = [
    !url && "SUPABASE_URL",
    !publishable && "SUPABASE_ANON_KEY or SB_PUBLISHABLE_KEY",
    !secret && "SUPABASE_SERVICE_ROLE_KEY or SB_SECRET_KEY",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(`Missing function environment: ${missing.join(", ")}`);
  }

  return { url: url!, publishable: publishable!, secret: secret! };
}
