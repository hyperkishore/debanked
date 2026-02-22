"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

/**
 * /auth/callback
 *
 * Handles Supabase OAuth callback on the CLIENT side.
 *
 * The Supabase auth flow may return tokens via:
 * - Hash fragment: #access_token=xxx (implicit flow)
 * - Query param: ?code=xxx (PKCE flow)
 *
 * createBrowserClient with detectSessionInUrl:true handles both:
 * - Hash fragments: auto-detected and processed by the auth module
 * - Code params: exchangeCodeForSession is called automatically
 *
 * After session is established, cookies are set via document.cookie
 * (handled by @supabase/ssr's storage adapter), making the session
 * visible to server middleware.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        router.replace("/login");
        return;
      }

      // The Supabase client's detectSessionInUrl feature (enabled by
      // createBrowserClient) automatically processes:
      // - Hash fragment tokens (#access_token=...)
      // - PKCE authorization codes (?code=...)
      // We just need to check if a session was established.

      // Give detectSessionInUrl a moment to process
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("[auth/callback] Error:", error.message);
        router.replace("/login");
        return;
      }

      if (session) {
        // Session established — redirect to home
        router.replace("/");
      } else {
        // No session — try waiting briefly for async token processing
        // detectSessionInUrl processes hash tokens asynchronously
        const timeout = setTimeout(() => {
          router.replace("/login");
        }, 3000);

        // Listen for auth state change
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event) => {
            if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
              clearTimeout(timeout);
              router.replace("/");
            }
          }
        );

        return () => {
          clearTimeout(timeout);
          subscription.unsubscribe();
        };
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
