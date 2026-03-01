"use client";

import { useAuth } from "@/contexts/auth-context";
import { MissionIQChat } from "@/components/missioniq-chat";
import { Button } from "@/components/ui/button";
import { X, MessageCircle } from "lucide-react";

const OPENCLAW_WS_URL = (process.env.NEXT_PUBLIC_OPENCLAW_WS_URL || "wss://ketea.tail38a898.ts.net").replace(/\/ws$/, "");
const OPENCLAW_TOKEN = process.env.NEXT_PUBLIC_OPENCLAW_TOKEN || "";

interface KiketChatPanelProps {
  onClose: () => void;
  initialPrompt?: string;
}

export function KiketChatPanel({ onClose, initialPrompt }: KiketChatPanelProps) {
  const { user, isPasswordAuth } = useAuth();

  if (!user && !isPasswordAuth) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-4 text-center">
        <MessageCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Sign in to use Kiket</p>
      </div>
    );
  }

  const userId = user?.email || "guest";
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest";

  return (
    <div className="h-full flex flex-col">
      <MissionIQChat
        wsUrl={OPENCLAW_WS_URL}
        token={OPENCLAW_TOKEN}
        userId={userId}
        userName={userName}
        initialPrompt={initialPrompt}
        compact
        onClose={onClose}
      />
    </div>
  );
}

/** Collapsed chat strip — clickable to expand */
export function KiketCollapsedStrip({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-full w-10 flex flex-col items-center justify-center gap-2 bg-card border-l border-border hover:bg-accent transition-colors cursor-pointer"
      title="Open Kiket Chat"
    >
      <MessageCircle className="h-4 w-4 text-muted-foreground" />
      <span className="text-[10px] text-muted-foreground font-medium [writing-mode:vertical-lr] rotate-180">
        Kiket
      </span>
    </button>
  );
}
