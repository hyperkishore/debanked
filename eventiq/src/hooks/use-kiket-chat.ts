"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatMessage } from "@/lib/openclaw-client";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  summary?: string;
}

interface UseKiketChatReturn {
  conversations: Conversation[];
  activeConversationId: string | null;
  loadConversations: () => Promise<void>;
  createConversation: () => Promise<string | null>;
  selectConversation: (id: string) => Promise<ChatMessage[]>;
  saveMessage: (msg: ChatMessage) => Promise<void>;
  isLoadingHistory: boolean;
}

/**
 * Hook for persistent Kiket chat storage.
 * Messages are stored per-user in Supabase (like iMessage).
 */
export function useKiketChat(): UseKiketChatReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/kiket/conversations?limit=30");
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      // Silently fail — chat still works without history
    }
  }, []);

  const createConversation = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/kiket/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New conversation" }),
      });
      if (!res.ok) return null;
      const conv = await res.json();
      setActiveConversationId(conv.id);
      setConversations((prev) => [conv, ...prev]);
      return conv.id;
    } catch {
      return null;
    }
  }, []);

  const selectConversation = useCallback(async (id: string): Promise<ChatMessage[]> => {
    setActiveConversationId(id);
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/kiket/messages?conversation_id=${id}&limit=200`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.messages || []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        role: m.role as "user" | "assistant",
        content: m.content as string,
        thinking: m.thinking as string | undefined,
        timestamp: new Date(m.created_at as string),
      }));
    } catch {
      return [];
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const saveMessage = useCallback(async (msg: ChatMessage) => {
    if (!activeConversationId) return;

    // Queue saves to avoid race conditions
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        await fetch("/api/kiket/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: activeConversationId,
            role: msg.role,
            content: msg.content,
            thinking: msg.thinking || null,
          }),
        });
      } catch {
        // Silently fail — message is still in UI state
      }
    });

    await saveQueue.current;
  }, [activeConversationId]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    activeConversationId,
    loadConversations,
    createConversation,
    selectConversation,
    saveMessage,
    isLoadingHistory,
  };
}
