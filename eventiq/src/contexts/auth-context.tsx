"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { isMigrated, migrateToSupabase } from "@/lib/migration";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  isPasswordAuth: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isLoading: true,
  isConfigured: false,
  isPasswordAuth: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordAuth, setIsPasswordAuth] = useState(false);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    const supabase = getSupabase();

    if (!supabase) {
      // No Supabase configured — check if we're password-authed
      // If we're on a non-login page and loaded, we must be authed
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        setIsPasswordAuth(true);
      }
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      // If no Supabase session but we're on a non-login page, password auth is active
      if (!s?.user && typeof window !== "undefined" && window.location.pathname !== "/login") {
        setIsPasswordAuth(true);
      }
      setIsLoading(false);
    });

    // Listen for auth changes + auto-migrate on first login
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      // Auto-migrate localStorage → Supabase on first login
      if (s?.user && !isMigrated()) {
        migrateToSupabase().then(({ migrated, errors }) => {
          if (migrated > 0) {
            console.log(`[EventIQ] Migrated ${migrated} records to Supabase`);
          }
          if (errors.length > 0) {
            console.warn("[EventIQ] Migration errors:", errors);
          }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: { hd: "hyperverge.co" }, // restrict to @hyperverge.co
        redirectTo: window.location.origin + "/auth/callback",
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    // Clear password auth cookie
    if (isPasswordAuth) {
      await fetch("/api/auth/password", { method: "DELETE" });
      setIsPasswordAuth(false);
      window.location.href = "/login";
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [isPasswordAuth]);

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, isConfigured: isConfigured || isPasswordAuth, isPasswordAuth, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
