"use client";

import { useAuth } from "@/contexts/auth-context";
import { MissionIQChat } from "@/components/missioniq-chat";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// OpenClaw gateway: connect to root path (no /ws suffix)
const OPENCLAW_WS_URL = (process.env.NEXT_PUBLIC_OPENCLAW_WS_URL || "wss://ketea.tail38a898.ts.net").replace(/\/ws$/, "");
const OPENCLAW_TOKEN = process.env.NEXT_PUBLIC_OPENCLAW_TOKEN || "";

function ChatPageInner() {
  const { user, isLoading, isPasswordAuth, signIn } = useAuth();
  const searchParams = useSearchParams();
  const companyParam = searchParams.get("company");

  // Build initial prompt from query param
  const initialPrompt = companyParam ? `Tell me about ${companyParam}` : undefined;

  if (isLoading) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not authenticated
  if (!user && !isPasswordAuth) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center">
          <span className="text-brand font-bold text-2xl">MQ</span>
        </div>
        <h1 className="text-xl font-bold">MissionIQ Chat</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with your @hyperverge.co account to access the chat.
        </p>
        <Button onClick={signIn}>Sign in with Google</Button>
      </div>
    );
  }

  const userId = user?.email || "guest";
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest";

  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* Minimal top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card">
        <Link href="/">
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-brand/20 flex items-center justify-center">
            <span className="text-brand font-bold text-xs">EQ</span>
          </div>
          <span className="text-xs text-muted-foreground">EventIQ</span>
        </div>
      </div>

      {/* Chat widget takes remaining space */}
      <div className="flex-1 min-h-0">
        <MissionIQChat
          wsUrl={OPENCLAW_WS_URL}
          token={OPENCLAW_TOKEN}
          userId={userId}
          userName={userName}
          initialPrompt={initialPrompt}
        />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-dvh flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  );
}
