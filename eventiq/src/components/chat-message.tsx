"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, User, ChevronRight } from "lucide-react";
import { useState, useCallback } from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  timestamp?: Date;
  isStreaming?: boolean;
  onSelectCompany?: (id: number) => void;
}

/** Markdown-to-HTML renderer for chat messages with proper list/table/blockquote support. */
function renderMarkdown(text: string): string {
  // Extract code blocks first to protect them from other transformations
  const codeBlocks: string[] = [];
  let processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="bg-muted rounded-md p-3 my-2 overflow-x-auto text-xs font-mono"><code>${escaped}</code></pre>`);
    return `\x00CODE${idx}\x00`;
  });

  // Escape HTML in remaining text
  processed = processed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Inline code
  processed = processed.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

  // Bold (before italic)
  processed = processed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  processed = processed.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");

  // Company deep-links: [Company Name](#company:ID)
  processed = processed.replace(/\[([^\]]+)\]\(#company:(\d+)\)/g, '<a href="#" data-company-id="$2" class="text-brand underline underline-offset-2 hover:text-brand/80 cursor-pointer">$1</a>');

  // Links
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand underline underline-offset-2 hover:text-brand/80">$1</a>');

  // Process line by line for block elements
  const lines = processed.split("\n");
  const output: string[] = [];
  let inUl = false;
  let inOl = false;
  let inBlockquote = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block placeholder — pass through
    if (trimmed.match(/^\x00CODE\d+\x00$/)) {
      if (inUl) { output.push("</ul>"); inUl = false; }
      if (inOl) { output.push("</ol>"); inOl = false; }
      if (inBlockquote) { output.push("</blockquote>"); inBlockquote = false; }
      if (inTable) { output.push("</tbody></table></div>"); inTable = false; }
      output.push(trimmed);
      continue;
    }

    // Table row (starts with |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      // Skip separator rows (|---|---|)
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) continue;

      const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
      if (!inTable) {
        if (inUl) { output.push("</ul>"); inUl = false; }
        if (inOl) { output.push("</ol>"); inOl = false; }
        output.push('<div class="overflow-x-auto my-2"><table class="text-xs w-full border-collapse">');
        // Check if next line is separator — if so, this is a header
        const next = lines[i + 1]?.trim() || "";
        if (/^\|[\s\-:|]+\|$/.test(next)) {
          output.push("<thead><tr>" + cells.map((c) => `<th class="border border-border px-2 py-1 text-left font-semibold bg-muted/50">${c}</th>`).join("") + "</tr></thead><tbody>");
          i++; // skip separator
        } else {
          output.push("<tbody><tr>" + cells.map((c) => `<td class="border border-border px-2 py-1">${c}</td>`).join("") + "</tr>");
        }
        inTable = true;
      } else {
        output.push("<tr>" + cells.map((c) => `<td class="border border-border px-2 py-1">${c}</td>`).join("") + "</tr>");
      }
      continue;
    }
    if (inTable) { output.push("</tbody></table></div>"); inTable = false; }

    // Headers
    if (/^### (.+)$/.test(trimmed)) {
      if (inUl) { output.push("</ul>"); inUl = false; }
      if (inOl) { output.push("</ol>"); inOl = false; }
      if (inBlockquote) { output.push("</blockquote>"); inBlockquote = false; }
      output.push(`<h3 class="font-semibold text-sm mt-3 mb-1">${trimmed.slice(4)}</h3>`);
      continue;
    }
    if (/^## (.+)$/.test(trimmed)) {
      if (inUl) { output.push("</ul>"); inUl = false; }
      if (inOl) { output.push("</ol>"); inOl = false; }
      if (inBlockquote) { output.push("</blockquote>"); inBlockquote = false; }
      output.push(`<h2 class="font-semibold text-sm mt-3 mb-1">${trimmed.slice(3)}</h2>`);
      continue;
    }
    if (/^# (.+)$/.test(trimmed)) {
      if (inUl) { output.push("</ul>"); inUl = false; }
      if (inOl) { output.push("</ol>"); inOl = false; }
      if (inBlockquote) { output.push("</blockquote>"); inBlockquote = false; }
      output.push(`<h1 class="font-bold text-sm mt-3 mb-1">${trimmed.slice(2)}</h1>`);
      continue;
    }

    // Blockquotes
    if (/^&gt;\s?(.*)$/.test(trimmed)) {
      const content = trimmed.replace(/^&gt;\s?/, "");
      if (!inBlockquote) {
        if (inUl) { output.push("</ul>"); inUl = false; }
        if (inOl) { output.push("</ol>"); inOl = false; }
        output.push('<blockquote class="border-l-2 border-brand/40 pl-3 my-2 text-muted-foreground italic">');
        inBlockquote = true;
      }
      output.push(content || "<br />");
      continue;
    }
    if (inBlockquote) { output.push("</blockquote>"); inBlockquote = false; }

    // Unordered lists (- or • or *)
    if (/^[-•*]\s+(.+)$/.test(trimmed)) {
      const content = trimmed.replace(/^[-•*]\s+/, "");
      if (inOl) { output.push("</ol>"); inOl = false; }
      if (!inUl) {
        output.push('<ul class="list-disc pl-5 my-1.5 space-y-0.5">');
        inUl = true;
      }
      output.push(`<li class="text-sm">${content}</li>`);
      continue;
    }
    if (inUl && trimmed === "") { continue; } // skip blank lines inside lists
    if (inUl) { output.push("</ul>"); inUl = false; }

    // Ordered lists
    if (/^\d+\.\s+(.+)$/.test(trimmed)) {
      const content = trimmed.replace(/^\d+\.\s+/, "");
      if (inUl) { output.push("</ul>"); inUl = false; }
      if (!inOl) {
        output.push('<ol class="list-decimal pl-5 my-1.5 space-y-0.5">');
        inOl = true;
      }
      output.push(`<li class="text-sm">${content}</li>`);
      continue;
    }
    if (inOl && trimmed === "") { continue; }
    if (inOl) { output.push("</ol>"); inOl = false; }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      output.push('<hr class="border-border my-3" />');
      continue;
    }

    // Empty line = paragraph break
    if (trimmed === "") {
      output.push('<div class="h-2"></div>');
      continue;
    }

    // Regular text
    output.push(`<p class="my-1 text-sm leading-relaxed">${trimmed}</p>`);
  }

  // Close any open elements
  if (inUl) output.push("</ul>");
  if (inOl) output.push("</ol>");
  if (inBlockquote) output.push("</blockquote>");
  if (inTable) output.push("</tbody></table></div>");

  // Restore code blocks
  let result = output.join("\n");
  codeBlocks.forEach((block, idx) => {
    result = result.replace(`\x00CODE${idx}\x00`, block);
  });

  return result;
}

export const ChatMessage = memo(function ChatMessage({
  role,
  content,
  thinking,
  timestamp,
  isStreaming,
  onSelectCompany,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const companyLink = target.closest("[data-company-id]") as HTMLElement | null;
    if (companyLink && onSelectCompany) {
      e.preventDefault();
      const id = parseInt(companyLink.dataset.companyId || "", 10);
      if (!isNaN(id)) onSelectCompany(id);
    }
  }, [onSelectCompany]);

  return (
    <div
      className={`flex gap-3 ${
        role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      {role === "assistant" && (
        <img
          src="/kiket-avatar.jpg"
          alt="Kiket"
          className="w-7 h-7 rounded-full object-cover shrink-0 mt-1"
        />
      )}

      <div
        className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-4 py-3 break-words ${
          role === "user"
            ? "bg-brand/20 text-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {/* Collapsible thinking section */}
        {role === "assistant" && thinking && (
          <button
            onClick={() => setShowThinking(!showThinking)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${showThinking ? "rotate-90" : ""}`} />
            <span>Thinking</span>
          </button>
        )}
        {showThinking && thinking && (
          <div className="mb-3 px-3 py-2 rounded-md bg-background/50 border border-border/30">
            <div
              className="text-xs text-muted-foreground leading-relaxed [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(thinking) }}
            />
          </div>
        )}

        {role === "assistant" ? (
          <div
            className="text-sm leading-relaxed [&_pre]:my-2 [&_strong]:font-semibold [&_strong]:text-foreground"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            onClick={handleContentClick}
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
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
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
