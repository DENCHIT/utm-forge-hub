import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "./remote";

const LOCAL_ONLY_KEY = "gym.localOnly.v1";

export type AuthStatus = "loading" | "signed_in" | "signed_out";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  /** True when the person chose to keep everything on this device. */
  localOnly: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsConfirmation: boolean }>;
  sendReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueLocally: () => void;
  leaveLocalMode: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

function readLocalOnly(): boolean {
  try {
    return window.localStorage.getItem(LOCAL_ONLY_KEY) === "true";
  } catch {
    return false;
  }
}

function friendlyAuthError(message: string): string {
  if (/failed to fetch|network|load failed|fetch failed/i.test(message)) {
    return "Could not reach the server. Check your connection and try again.";
  }
  if (/invalid login credentials/i.test(message)) return "That email and password do not match an account.";
  if (/email not confirmed/i.test(message)) return "Confirm your email address first, then sign in.";
  if (/user already registered/i.test(message)) return "There is already an account with that email. Sign in instead.";
  if (/password should be at least/i.test(message)) return "Passwords need to be at least six characters.";
  if (/rate limit|too many/i.test(message)) return "Too many attempts. Wait a minute and try again.";
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>(isSupabaseConfigured ? "loading" : "signed_out");
  const [localOnly, setLocalOnly] = React.useState<boolean>(readLocalOnly);

  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setStatus(data.session ? "signed_in" : "signed_out");
      })
      .catch(() => active && setStatus("signed_out"));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setStatus(next ? "signed_in" : "signed_out");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      session,
      localOnly,
      configured: isSupabaseConfigured,

      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error(friendlyAuthError(error.message));
      },

      signUp: async (email, password, displayName) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw new Error(friendlyAuthError(error.message));
        // With email confirmation on, Supabase returns a user but no session.
        return { needsConfirmation: Boolean(data.user) && !data.session };
      },

      sendReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/gym/auth`,
        });
        if (error) throw new Error(friendlyAuthError(error.message));
      },

      signOut: async () => {
        await supabase.auth.signOut();
      },

      continueLocally: () => {
        try {
          window.localStorage.setItem(LOCAL_ONLY_KEY, "true");
        } catch {
          // Private browsing; the choice just will not stick.
        }
        setLocalOnly(true);
      },

      leaveLocalMode: () => {
        try {
          window.localStorage.removeItem(LOCAL_ONLY_KEY);
        } catch {
          // Nothing to clear.
        }
        setLocalOnly(false);
      },
    }),
    [status, session, localOnly],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
