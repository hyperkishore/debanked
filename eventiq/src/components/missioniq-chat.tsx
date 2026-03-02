"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/components/chat-message";
import { OpenClawClient, type ConnectionState, type ChatMessage as ChatMsg } from "@/lib/openclaw-client";
import { Send, Plus, Loader2, X } from "lucide-react";

interface MissionIQChatProps {
  wsUrl: string;
  token: string;
  userId: string;
  userName: string;
  initialPrompt?: string;
  compact?: boolean;
  onClose?: () => void;
}

export function MissionIQChat({ wsUrl, token, userId, userName, initialPrompt, compact, onClose }: MissionIQChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<{ id: string; content: string } | null>(null);
  const [conversationId] = useState(() => crypto.randomUUID());
  const initialPromptSentRef = useRef(false);

  const clientRef = useRef<OpenClawClient | null>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [sendTimestamp, setSendTimestamp] = useState<number | null>(null);
  const [timing, setTiming] = useState<{ ttfc: number | null; ttfr: number | null }>({ ttfc: null, ttfr: null });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage, isTyping]);

  // Initialize WebSocket client
  useEffect(() => {
    const client = new OpenClawClient({
      wsUrl,
      token,
      agent: "missioniq",
      userId,
      userName,
      onMessage: (msg) => {
        setStreamingMessage(null);
        setSendTimestamp((ts) => {
          if (ts) {
            const ttfr = Date.now() - ts;
            setTiming((prev) => ({ ...prev, ttfr }));
            console.log(`[Kiket] Total response: ${(ttfr / 1000).toFixed(1)}s`);
          }
          return null;
        });
        setMessages((prev) => {
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
      onStateChange: (state) => {
        setConnectionState(state);
        if (state === "connected") {
          console.log(`[Kiket] Connected to gateway`);
        }
      },
      onError: (err) => {
        setError(err);
        console.warn(`[Kiket] Error: ${err}`);
        setTimeout(() => setError(null), 5000);
      },
      onStreamChunk: (content, messageId) => {
        setSendTimestamp((ts) => {
          if (ts) {
            setTiming((prev) => {
              if (prev.ttfc === null) {
                const ttfc = Date.now() - ts;
                console.log(`[Kiket] First chunk: ${(ttfc / 1000).toFixed(1)}s`);
                return { ...prev, ttfc };
              }
              return prev;
            });
          }
          return ts;
        });
        setStreamingMessage({ id: messageId, content });
      },
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
    };
  }, [wsUrl, token, userId]);

  // Auto-send initial prompt (from ?company= query param) once connected
  useEffect(() => {
    if (initialPrompt && connectionState === "connected" && !initialPromptSentRef.current && clientRef.current) {
      initialPromptSentRef.current = true;
      const userMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "user",
        content: initialPrompt,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      clientRef.current.sendMessage(initialPrompt, conversationId);
    }
  }, [initialPrompt, connectionState, conversationId]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !clientRef.current) return;

    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Track timing
    setSendTimestamp(Date.now());
    setTiming({ ttfc: null, ttfr: null });

    clientRef.current.sendMessage(text, conversationId);
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
      <div className={`flex items-center justify-between border-b border-border ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
        <div className="flex items-center gap-2">
          {!compact && (
            <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center">
              <span className="text-brand font-bold text-sm">K</span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold">Kiket</h2>
              {isConnected ? (
                <span className="w-2 h-2 rounded-full bg-green-500" />
              ) : connectionState === "connecting" ? (
                <Loader2 className="h-3 w-3 text-yellow-500 animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </div>
            {!compact && (
              <span className="text-xs text-muted-foreground">
                {connectionState === "connected"
                  ? "Online"
                  : connectionState === "connecting"
                  ? "Connecting..."
                  : "Offline"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!compact && (
            <Badge variant="outline" className="text-xs max-w-[120px] truncate">
              {userName}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewConversation}
            title="New conversation"
            className="h-7 w-7 p-0"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              title="Close chat"
              className="h-7 w-7 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs border-b border-destructive/20">
          {error}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4">
        <div className="py-4 space-y-4">
          {messages.length === 0 && !streamingMessage && (
            <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-8" : "py-16"}`}>
              {!compact && (
                <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
                  <span className="text-brand font-bold text-2xl">K</span>
                </div>
              )}
              <h3 className={`font-semibold mb-2 ${compact ? "text-sm" : "text-lg"}`}>Kiket</h3>
              <p className={`text-muted-foreground max-w-sm mb-4 ${compact ? "text-xs" : "text-sm mb-6"}`}>
                {compact
                  ? "Ask about companies, leaders, or market intel."
                  : "Your GTM intelligence assistant. Ask about companies, leaders, outreach briefs, or market stats."}
              </p>
              <div className={`grid gap-2 ${compact ? "grid-cols-1 max-w-xs" : "grid-cols-1 sm:grid-cols-2 max-w-lg"}`}>
                {(compact
                  ? ["Top funders in New York", "Market stats by category"]
                  : ["Tell me about Fortun Advance", "Top funders in New York", "Outreach brief for NY Tribeca", "Market stats by category"]
                ).map((suggestion) => (
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

          {/* Typing indicator with timing */}
          {isTyping && !streamingMessage && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-xs">Kiket is thinking...</span>
            </div>
          )}

          {/* Timing display */}
          {timing.ttfr !== null && messages.length > 0 && (
            <div className="flex justify-center">
              <span className="text-xs text-muted-foreground/50">
                {timing.ttfc !== null && `First token: ${(timing.ttfc / 1000).toFixed(1)}s`}
                {timing.ttfc !== null && timing.ttfr !== null && " · "}
                {timing.ttfr !== null && `Total: ${(timing.ttfr / 1000).toFixed(1)}s`}
              </span>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={scrollBottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className={`border-t border-border ${compact ? "px-3 py-2" : "px-4 py-3"} pb-[max(0.75rem,env(safe-area-inset-bottom))]`}>
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? (compact ? "Ask Kiket..." : "Ask about companies, leaders, or market intel...") : "Connecting..."}
            disabled={!isConnected}
            className={`min-h-[40px] max-h-[120px] resize-none text-sm ${compact ? "min-h-[36px]" : ""}`}
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !isConnected}
            size="sm"
            className={compact ? "h-[36px] px-2.5" : "h-[44px] px-3"}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-1.5 text-center">
            Shift+Enter for new line. Powered by OpenClaw + Claude.
          </p>
        )}
      </div>
    </div>
  );
}
