"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

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

        <Button
          onClick={handleGoogleSignIn}
          size="lg"
          className="w-full gap-2"
        >
          <LogIn className="h-4 w-4" />
          Sign in with Google
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Restricted to @hyperverge.co accounts
        </p>
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
