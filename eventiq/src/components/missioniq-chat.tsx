"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/components/chat-message";
import { OpenClawClient, type ConnectionState, type ChatMessage as ChatMsg } from "@/lib/openclaw-client";
import { Send, Plus, Wifi, WifiOff, Loader2 } from "lucide-react";

interface MissionIQChatProps {
  wsUrl: string;
  token: string;
  userId: string;
  userName: string;
}

export function MissionIQChat({ wsUrl, token, userId, userName }: MissionIQChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<{ id: string; content: string } | null>(null);
  const [conversationId] = useState(() => crypto.randomUUID());

  const clientRef = useRef<OpenClawClient | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage, isTyping]);

  // Initialize WebSocket client
  useEffect(() => {
    const client = new OpenClawClient({
      wsUrl,
      token,
      agent: "missioniq",
      userId,
      onMessage: (msg) => {
        setStreamingMessage(null);
        setMessages((prev) => {
          // Replace streaming message if it exists, otherwise append
          const existing = prev.findIndex((m) => m.id === msg.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = msg;
            return updated;
          }
          return [...prev, msg];
        });
      },
      onTyping: setIsTyping,
      onStateChange: setConnectionState,
      onError: (err) => {
        setError(err);
        setTimeout(() => setError(null), 5000);
      },
      onStreamChunk: (content, messageId) => {
        setStreamingMessage({ id: messageId, content });
      },
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
    };
  }, [wsUrl, token, userId]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !clientRef.current) return;

    // Add user message locally
    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Send to OpenClaw
    clientRef.current.sendMessage(text, conversationId);

    // Refocus input
    inputRef.current?.focus();
  }, [input, conversationId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setStreamingMessage(null);
    inputRef.current?.focus();
  }, []);

  const isConnected = connectionState === "connected";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center">
            <span className="text-brand font-bold text-sm">MQ</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold">MissionIQ</h2>
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : connectionState === "connecting" ? (
                <Loader2 className="h-3 w-3 text-yellow-500 animate-spin" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {connectionState === "connected"
                  ? "Online"
                  : connectionState === "connecting"
                  ? "Connecting..."
                  : "Offline"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {userName}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewConversation}
            title="New conversation"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs border-b border-destructive/20">
          {error}
        </div>
      )}

      {/* Messages area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4">
          {messages.length === 0 && !streamingMessage && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
                <span className="text-brand font-bold text-2xl">MQ</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">MissionIQ</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Your GTM intelligence assistant. Ask about companies, leaders,
                outreach briefs, or market stats.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                {[
                  "Tell me about Fortun Advance",
                  "Top funders in New York",
                  "Outreach brief for NY Tribeca",
                  "Market stats by category",
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start h-auto py-2 px-3"
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
            />
          ))}

          {/* Streaming message */}
          {streamingMessage && (
            <ChatMessage
              role="assistant"
              content={streamingMessage.content}
              isStreaming
            />
          )}

          {/* Typing indicator */}
          {isTyping && !streamingMessage && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-xs">MissionIQ is thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "Ask about companies, leaders, or market intel..." : "Connecting to agent..."}
            disabled={!isConnected}
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !isConnected}
            size="sm"
            className="h-[44px] px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">
          Shift+Enter for new line. Powered by OpenClaw + Claude.
        </p>
      </div>
    </div>
  );
}
