"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageSquarePlus,
  Send,
  Download,
  Trash2,
  Search,
  Wrench,
  Lightbulb,
  Bug,
  Pin,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ChatMessage,
  InputCategory,
  InputContext,
  getPendingCount,
  getCategoryLabel,
  getCategoryEmoji,
  exportToMarkdown,
} from "@/lib/chat-helpers";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// --- Category icon mapping ---

function CategoryIcon({ category, className }: { category: InputCategory; className?: string }) {
  const props = { className: cn("size-3", className) };
  switch (category) {
    case "research":
      return <Search {...props} />;
    case "data-enhancement":
      return <Wrench {...props} />;
    case "feature-idea":
      return <Lightbulb {...props} />;
    case "bug":
      return <Bug {...props} />;
    default:
      return <Pin {...props} />;
  }
}

// --- Props ---

interface ChatWidgetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onClearMessages: () => void;
  currentContext: InputContext;
}

// --- FAB ---

export function ChatFab({
  pendingCount,
  onClick,
}: {
  pendingCount: number;
  onClick: () => void;
}) {
  const isMobile = useIsMobile();

  return (
    <Button
      size="icon"
      onClick={onClick}
      className={cn(
        "fixed z-[60] rounded-full h-12 w-12 shadow-lg hover:bg-primary/90 transition-all",
        isMobile ? "right-4" : "bottom-6 right-6",
        pendingCount > 0 && "chat-fab-pulse"
      )}
      style={isMobile ? { bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" } : undefined}
      aria-label="Open input capture"
    >
      <MessageSquarePlus className="size-5" />
      {pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center size-5 rounded-full bg-destructive text-xs font-bold text-white">
          {pendingCount > 9 ? "9+" : pendingCount}
        </span>
      )}
    </Button>
  );
}

// --- Chat Panel ---

export function ChatWidget({
  open,
  onOpenChange,
  messages,
  onSendMessage,
  onClearMessages,
  currentContext,
}: ChatWidgetProps) {
  const isMobile = useIsMobile();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingCount = getPendingCount(messages);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Focus textarea when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 80) + "px"; // max ~3 lines
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleExport = useCallback(() => {
    const md = exportToMarkdown(messages);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user-inputs.md";
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  const handleClear = useCallback(() => {
    if (messages.length === 0) return;
    if (window.confirm("Clear all inputs? This cannot be undone.")) {
      onClearMessages();
    }
  }, [messages.length, onClearMessages]);

  // Context bar text
  const contextText = (() => {
    const parts: string[] = [];
    if (currentContext.companyName) {
      parts.push(
        currentContext.companyName +
          (currentContext.companyType ? ` (${currentContext.companyType})` : "")
      );
    }
    parts.push(
      currentContext.tab.charAt(0).toUpperCase() + currentContext.tab.slice(1) + " tab"
    );
    return parts.join(" \u00B7 ");
  })();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        showCloseButton={false}
        className={cn(
          "flex flex-col gap-0 p-0",
          isMobile ? "h-[70vh]" : "w-96 sm:max-w-[384px]"
        )}
      >
        <SheetTitle className="sr-only">Input Capture</SheetTitle>
        <SheetDescription className="sr-only">
          Capture research requests, ideas, and notes while browsing.
        </SheetDescription>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Inputs</h2>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-xs h-5">
                {pendingCount} pending
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handleExport}
              disabled={messages.length === 0}
              title="Export as markdown"
            >
              <Download className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={handleClear}
              disabled={messages.length === 0}
              title="Clear all"
            >
              <Trash2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onOpenChange(false)}
              title="Close"
            >
              <span className="text-lg leading-none">&times;</span>
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0">
          <div ref={scrollRef} className="flex flex-col gap-3 p-4 overflow-y-auto h-full">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <MessageSquarePlus className="size-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Capture research requests, ideas, or notes while you browse.
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Context is auto-attached from the current page.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "chat-message-enter max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "self-end bg-primary/20 text-foreground"
                      : "self-start bg-secondary text-secondary-foreground"
                  )}
                >
                  {/* User message: show category tag */}
                  {msg.role === "user" && msg.category && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <CategoryIcon category={msg.category} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">
                        {getCategoryLabel(msg.category)}
                      </span>
                      {msg.context?.companyName && (
                        <span className="text-xs text-muted-foreground/60">
                          \u00B7 {msg.context.companyName}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Render bot messages with basic bold support */}
                  {msg.role === "assistant" ? (
                    <p
                      className="text-xs leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\u2014/g, "&mdash;"),
                      }}
                    />
                  ) : (
                    <p className="leading-relaxed">{msg.content}</p>
                  )}
                  <span className="block text-xs text-muted-foreground/50 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Context bar */}
        <div className="border-t border-border/50 px-4 py-1.5">
          <p className="text-xs text-muted-foreground/60 truncate">
            Viewing: {contextText}
          </p>
        </div>

        {/* Input area */}
        <div className="border-t border-border px-3 py-2 flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a request, idea, or note..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 border-0 focus-visible:ring-0 py-1.5 max-h-20 min-h-0"
          />
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "size-8 shrink-0",
              input.trim() ? "text-primary" : "text-muted-foreground/40"
            )}
            onClick={handleSubmit}
            disabled={!input.trim()}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
