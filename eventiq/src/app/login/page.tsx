"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { LogIn, Lock } from "lucide-react";
import { toast } from "sonner";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const showGoogle = isSupabaseConfigured();

  useEffect(() => {
    if (error === "unauthorized_domain") {
      toast.error("Access restricted to @hyperverge.co accounts");
    }
  }, [error]);

  const handleGoogleSignIn = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      toast.error("Authentication is not configured");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: { hd: "hyperverge.co" },
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error("Sign in failed: " + error.message);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        toast.error("Invalid password");
        setPassword("");
      }
    } catch {
      toast.error("Sign in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-brand font-bold text-2xl">EQ</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">EventIQ</h1>
          <p className="text-sm text-muted-foreground mt-1">
            MCA Market Intelligence Platform
          </p>
        </div>

        {/* Password sign-in */}
        <form onSubmit={handlePasswordSignIn} className="space-y-3 mb-4">
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <Button
            type="submit"
            size="lg"
            className="w-full gap-2"
            disabled={isLoading || !password.trim()}
          >
            <Lock className="h-4 w-4" />
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {/* Divider + Google OAuth (only when Supabase configured) */}
        {showGoogle && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              onClick={handleGoogleSignIn}
              size="lg"
              variant="outline"
              className="w-full gap-2"
            >
              <LogIn className="h-4 w-4" />
              Sign in with Google
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Google sign-in restricted to @hyperverge.co
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
