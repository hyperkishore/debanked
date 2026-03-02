/**
 * Document-optimized markdown renderer.
 * Returns { html, toc } tuple for documentation portal rendering.
 *
 * Unlike the chat renderer (chat-message.tsx), this supports:
 * - H1-H6 with proper document sizing and IDs for anchor links
 * - TOC extraction during rendering
 * - Task lists (- [x] / - [ ])
 * - Document-appropriate spacing (mt-6 mb-3 for headings)
 * - Horizontal rules
 */

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, "")      // strip HTML tags
    .replace(/&[^;]+;/g, "")      // strip HTML entities
    .replace(/[^\w\s-]/g, "")     // remove non-word chars
    .replace(/\s+/g, "-")         // spaces to hyphens
    .replace(/-+/g, "-")          // collapse multiple hyphens
    .replace(/^-|-$/g, "");       // trim leading/trailing hyphens
}

const HEADING_STYLES: Record<number, string> = {
  1: "text-2xl font-bold mt-8 mb-4",
  2: "text-xl font-semibold mt-6 mb-3 pb-2 border-b border-border/40",
  3: "text-lg font-semibold mt-5 mb-2",
  4: "text-base font-semibold mt-4 mb-2",
  5: "text-sm font-semibold mt-3 mb-1",
  6: "text-sm font-medium mt-3 mb-1 text-muted-foreground",
};

export function renderDocumentMarkdown(text: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];

  // Extract code blocks first to protect them from other transformations
  const codeBlocks: string[] = [];
  let processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const langLabel = lang ? `<span class="absolute top-2 right-3 text-xs text-muted-foreground/60 select-none">${lang}</span>` : "";
    const idx = codeBlocks.length;
    codeBlocks.push(
      `<div class="relative"><pre class="bg-muted/50 border border-border/30 rounded-lg p-4 my-3 overflow-x-auto text-sm font-mono leading-relaxed">${langLabel}<code>${escaped}</code></pre></div>`
    );
    return `\x00CODE${idx}\x00`;
  });

  // Escape HTML in remaining text
  processed = processed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Inline code
  processed = processed.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono border border-border/20">$1</code>');

  // Bold (before italic)
  processed = processed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  processed = processed.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");

  // Strikethrough
  processed = processed.replace(/~~(.+?)~~/g, '<del class="text-muted-foreground">$1</del>');

  // Links
  processed = processed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand underline underline-offset-2 hover:text-brand/80">$1</a>'
  );

  // Images
  processed = processed.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="rounded-lg max-w-full my-3" />'
  );

  // Process line by line for block elements
  const lines = processed.split("\n");
  const output: string[] = [];
  let inUl = false;
  let inOl = false;
  let inBlockquote = false;
  let inTable = false;
  let ulDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block placeholder — pass through
    if (trimmed.match(/^\x00CODE\d+\x00$/)) {
      if (inUl) { output.push("</ul>".repeat(ulDepth)); inUl = false; ulDepth = 0; }
      if (inOl) { output.push("</ol>"); inOl = false; }
      if (inBlockquote) { output.push("</blockquote>"); inBlockquote = false; }
      if (inTable) { output.push("</tbody></table></div>"); inTable = false; }
      output.push(trimmed);
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      if (inUl) { output.push("</ul>".repeat(ulDepth)); inUl = false; ulDepth = 0; }
      if (inOl) { output.push("</ol>"); inOl = false; }
      if (inBlockquote) { output.push("</blockquote>"); inBlockquote = false; }
      if (inTable) { output.push("</tbody></table></div>"); inTable = false; }
      output.push('<hr class="my-6 border-border/40" />');
      continue;
    }

    // Table row (starts with |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      // Skip separator rows (|---|---|)
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) continue;

      const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
      if (!inTable) {
        if (inUl) { output.push("</ul>".repeat(ulDepth)); inUl = false; ulDepth = 0; }
        if (inOl) { output.push("</ol>"); inOl = false; }
        if (inBlockquote) { output.push("</blockquote>"); inBlockquote = false; }
        output.push('<div class="overflow-x-auto my-3 rounded-lg border border-border/30"><table class="text-sm w-full border-collapse">');
        // Check if next line is separator — if so, this is a header
        const next = lines[i + 1]?.trim() || "";
        if (/^\|[\s\-:|]+\|$/.test(next)) {
          output.push(
            "<thead><tr>" +
              cells.map((c) => `<th class="border-b border-border/30 px-3 py-2 text-left font-semibold bg-muted/30 text-sm">${c}</th>`).join("") +
              "</tr></thead><tbody>"
          );
          i++; // skip separator
        } else {
          output.push(
            "<tbody><tr>" +
              cells.map((c) => `<td class="border-b border-border/20 px-3 py-2">${c}</td>`).join("") +
              "</tr>"
          );
        }
        inTable = true;
      } else {
        output.push(
          "<tr>" +
            cells.map((c) => `<td class="border-b border-border/20 px-3 py-2">${c}</td>`).join("") +
            "</tr>"
        );
      }
      continue;
    }
    if (inTable) { output.push("</tbody></table></div>"); inTable = false; }

    // Headers (H1-H6)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (inUl) { output.push("</ul>".repeat(ulDepth)); inUl = false; ulDepth = 0; }
      if (inOl) { output.push("</ol>"); inOl = false; }
      if (inBlockquote) { output.push("</blockquote>"); inBlockquote = false; }

      const level = headingMatch[1].length;
      const content = headingMatch[2];
      // Strip inline formatting for the slug/toc text
      const plainText = content.replace(/<[^>]*>/g, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
      const id = slugify(plainText);
      const style = HEADING_STYLES[level] || HEADING_STYLES[6];
      const tag = `h${level}`;

      toc.push({ id, text: plainText, level });

      output.push(`<${tag} id="${id}" class="${style} scroll-mt-4">${content}</${tag}>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("&gt; ") || trimmed === "&gt;") {
      if (inUl) { output.push("</ul>".repeat(ulDepth)); inUl = false; ulDepth = 0; }
      if (inOl) { output.push("</ol>"); inOl = false; }

      const quoteContent = trimmed.replace(/^&gt;\s?/, "");
      if (!inBlockquote) {
        output.push('<blockquote class="border-l-2 border-brand/40 pl-4 my-3 text-muted-foreground italic">');
        inBlockquote = true;
      }
      output.push(`<p>${quoteContent}</p>`);
      continue;
    }
    if (inBlockquote && trimmed !== "") {
      output.push("</blockquote>");
      inBlockquote = false;
    }

    // Task list items (- [x] or - [ ])
    const taskMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      if (!inUl) {
        if (inOl) { output.push("</ol>"); inOl = false; }
        output.push('<ul class="my-2 space-y-1 list-none pl-0">');
        inUl = true;
        ulDepth = 1;
      }
      const checked = taskMatch[1] !== " ";
      const checkIcon = checked
        ? '<span class="text-green-400 mr-2">&#x2611;</span>'
        : '<span class="text-muted-foreground mr-2">&#x2610;</span>';
      const textStyle = checked ? "line-through text-muted-foreground" : "";
      output.push(`<li class="flex items-start gap-0 text-sm leading-relaxed">${checkIcon}<span class="${textStyle}">${taskMatch[2]}</span></li>`);
      continue;
    }

    // Unordered list items
    const ulMatch = trimmed.match(/^([-*])\s+(.+)$/);
    if (ulMatch) {
      if (!inUl) {
        if (inOl) { output.push("</ol>"); inOl = false; }
        output.push('<ul class="my-2 space-y-1 list-disc pl-6">');
        inUl = true;
        ulDepth = 1;
      }
      output.push(`<li class="text-sm leading-relaxed">${ulMatch[2]}</li>`);
      continue;
    }

    // Indented list items (2-space or 4-space indent)
    const indentUlMatch = line.match(/^(\s{2,})([-*])\s+(.+)$/);
    if (indentUlMatch && inUl) {
      output.push(`<li class="text-sm leading-relaxed ml-4">${indentUlMatch[3]}</li>`);
      continue;
    }

    // Ordered list items
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (olMatch) {
      if (!inOl) {
        if (inUl) { output.push("</ul>".repeat(ulDepth)); inUl = false; ulDepth = 0; }
        output.push('<ol class="my-2 space-y-1 list-decimal pl-6">');
        inOl = true;
      }
      output.push(`<li class="text-sm leading-relaxed">${olMatch[2]}</li>`);
      continue;
    }

    // Close lists if we hit non-list content
    if (inUl && trimmed !== "") {
      output.push("</ul>".repeat(ulDepth));
      inUl = false;
      ulDepth = 0;
    }
    if (inOl && trimmed !== "") {
      output.push("</ol>");
      inOl = false;
    }

    // Empty line
    if (trimmed === "") {
      // Close blockquote on empty line
      if (inBlockquote) {
        output.push("</blockquote>");
        inBlockquote = false;
      }
      continue;
    }

    // Regular paragraph
    output.push(`<p class="text-sm leading-relaxed my-2">${trimmed}</p>`);
  }

  // Close any open elements
  if (inUl) output.push("</ul>".repeat(ulDepth));
  if (inOl) output.push("</ol>");
  if (inBlockquote) output.push("</blockquote>");
  if (inTable) output.push("</tbody></table></div>");

  // Restore code blocks
  let html = output.join("\n");
  for (let i = 0; i < codeBlocks.length; i++) {
    html = html.replace(`\x00CODE${i}\x00`, codeBlocks[i]);
  }

  return { html, toc };
}
