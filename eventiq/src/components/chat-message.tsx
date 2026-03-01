"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, User, Bot } from "lucide-react";
import { useState, useCallback } from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  isStreaming?: boolean;
}

/** Simple markdown-to-HTML renderer for chat messages. */
function renderMarkdown(text: string): string {
  let html = text
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

    // Code blocks (triple backtick)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted rounded-md p-3 my-2 overflow-x-auto text-xs"><code>$2</code></pre>')

    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs">$1</code>')

    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")

    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")

    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand underline underline-offset-2 hover:text-brand/80">$1</a>')

    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="font-semibold text-sm mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-semibold text-base mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-bold text-lg mt-3 mb-1">$1</h1>')

    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^• (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')

    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')

    // Horizontal rules
    .replace(/^---$/gm, '<hr class="border-border my-3" />')

    // Paragraphs (double newlines)
    .replace(/\n\n/g, '</p><p class="my-2">')

    // Line breaks
    .replace(/\n/g, "<br />");

  // Wrap in paragraph
  html = `<p class="my-1">${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p class="my-1"><\/p>/g, "");
  html = html.replace(/<p class="my-2"><\/p>/g, "");

  return html;
}

export const ChatMessage = memo(function ChatMessage({
  role,
  content,
  timestamp,
  isStreaming,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <div
      className={`flex gap-3 ${
        role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      {role === "assistant" && (
        <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center shrink-0 mt-1">
          <Bot className="h-4 w-4 text-brand" />
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          role === "user"
            ? "bg-brand/20 text-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {role === "assistant" ? (
          <div
            className="text-sm leading-relaxed [&_pre]:my-2 [&_li]:my-0.5 [&_ul]:my-1 [&_ol]:my-1"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        )}

        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-brand/60 animate-pulse ml-1" />
        )}

        <div className="flex items-center justify-between mt-2 gap-2">
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {role === "assistant" && !isStreaming && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
        </div>
      </div>

      {role === "user" && (
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
});
