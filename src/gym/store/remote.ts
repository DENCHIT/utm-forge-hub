import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { GymState } from "../types";

/** The generated Database type does not know about the gym table yet. */
const db = supabase as unknown as SupabaseClient;

export const TABLE = "gym_state";

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

/** Thrown when the project is reachable but the migration has not been run. */
export class MissingTableError extends Error {
  constructor() {
    super(`The "${TABLE}" table does not exist in this Supabase project yet. Run the migration in supabase/migrations.`);
    this.name = "MissingTableError";
  }
}

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  // PostgREST reports an unknown table as PGRST205, Postgres itself as 42P01.
  return error.code === "PGRST205" || error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? "");
}

export interface RemoteSnapshot {
  state: GymState;
  updatedAt: string;
}

export async function fetchRemoteState(userId: string): Promise<RemoteSnapshot | null> {
  const { data, error } = await db.from(TABLE).select("state, updated_at").eq("user_id", userId).maybeSingle();
  if (error) {
    if (isMissingTable(error)) throw new MissingTableError();
    throw new Error(error.message);
  }
  if (!data?.state) return null;
  const state = data.state as GymState;
  // Prefer the stamp inside the document: it is written by the client in a
  // stable format, whereas the column comes back in Postgres' own formatting
  // and would never compare equal to what we sent.
  const updatedAt = state.updatedAt ?? (data.updated_at as string) ?? new Date(0).toISOString();
  return { state, updatedAt };
}

export async function pushRemoteState(user: User, state: GymState, updatedAt: string): Promise<void> {
  const { error } = await db.from(TABLE).upsert(
    {
      user_id: user.id,
      state,
      display_name: state.profile.displayName || null,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" },
  );
  if (error) {
    if (isMissingTable(error)) throw new MissingTableError();
    throw new Error(error.message);
  }
}

export async function deleteRemoteState(userId: string): Promise<void> {
  const { error } = await db.from(TABLE).delete().eq("user_id", userId);
  if (error && !isMissingTable(error)) throw new Error(error.message);
}

export { db as gymDb };
