"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ChevronRight, Clock, AlertCircle } from "lucide-react";
import { renderDocumentMarkdown, type TocEntry } from "@/lib/render-document-markdown";

interface DocMeta {
  slug: string;
  title: string;
  description: string;
}

interface DocContent {
  slug: string;
  title: string;
  content: string;
  lastModified: string;
}

export function ResearchTab() {
  const [docList, setDocList] = useState<DocMeta[]>([]);
  const [activeDoc, setActiveDoc] = useState<string>("roadmap");
  const [docContent, setDocContent] = useState<DocContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeHeading, setActiveHeading] = useState<string>("");

  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch document list on mount
  useEffect(() => {
    fetch("/api/research-docs")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setDocList(data.documents || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Fetch document content when activeDoc changes
  useEffect(() => {
    if (!activeDoc) return;
    setContentLoading(true);
    setError(null);

    fetch(`/api/research-docs?doc=${activeDoc}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: DocContent) => {
        setDocContent(data);
        setContentLoading(false);
        // Scroll content area to top
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      })
      .catch((err) => {
        setError(err.message);
        setContentLoading(false);
      });
  }, [activeDoc]);

  // Parse markdown and extract TOC
  const { html, toc } = useMemo(() => {
    if (!docContent?.content) return { html: "", toc: [] as TocEntry[] };
    return renderDocumentMarkdown(docContent.content);
  }, [docContent?.content]);

  // Set up IntersectionObserver on heading elements for active TOC tracking
  useEffect(() => {
    if (!contentRef.current || toc.length === 0) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const headings = contentRef.current.querySelectorAll("h1[id], h2[id], h3[id], h4[id]");
    if (headings.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the first visible heading
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveHeading(visible[0].target.id);
        }
      },
      {
        root: contentRef.current,
        rootMargin: "-10% 0px -80% 0px",
        threshold: 0,
      }
    );

    headings.forEach((h) => observerRef.current!.observe(h));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [html, toc]);

  // Handle TOC click — smooth scroll to heading
  const handleTocClick = useCallback((id: string) => {
    const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveHeading(id);
    }
  }, []);

  // Handle doc switch
  const handleDocSelect = useCallback((slug: string) => {
    setActiveDoc(slug);
    setActiveHeading("");
  }, []);

  // Format last modified date
  const lastModified = docContent?.lastModified
    ? new Date(docContent.lastModified).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // Filter TOC to only show H1-H3 for a cleaner sidebar
  const filteredToc = useMemo(
    () => toc.filter((entry) => entry.level <= 3),
    [toc]
  );

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-6">
          <div className="w-56 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
          <div className="flex-1 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand" />
          <h1 className="text-lg font-bold">Research & Documentation</h1>
          <Badge variant="outline" className="text-xs ml-2">
            {docList.length} docs
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Product roadmap, research findings, and strategic analysis
        </p>
      </div>

      {/* Three-column layout */}
      <div className="flex-1 min-h-0 flex">
        {/* Left sidebar — Document list */}
        <div className="w-56 shrink-0 border-r border-border/40 overflow-y-auto p-3 space-y-1.5">
          {docList.map((doc) => (
            <button
              key={doc.slug}
              onClick={() => handleDocSelect(doc.slug)}
              className={`w-full text-left rounded-lg p-3 transition-colors ${
                activeDoc === doc.slug
                  ? "bg-brand/10 border border-brand/30"
                  : "hover:bg-muted/50 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className={`h-3.5 w-3.5 shrink-0 ${
                  activeDoc === doc.slug ? "text-brand" : "text-muted-foreground"
                }`} />
                <span className={`text-sm font-medium truncate ${
                  activeDoc === doc.slug ? "text-brand" : "text-foreground"
                }`}>
                  {doc.title}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 pl-5.5">
                {doc.description}
              </p>
            </button>
          ))}
        </div>

        {/* Center — Document content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {error && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {contentLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-8 w-96" />
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : docContent ? (
            <>
              {/* Document title bar */}
              <div className="px-6 py-3 border-b border-border/20 shrink-0 flex items-center justify-between">
                <h2 className="text-base font-semibold">{docContent.title}</h2>
                {lastModified && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Updated {lastModified}
                  </span>
                )}
              </div>

              {/* Scrollable content — native overflow-y-auto, NOT Radix ScrollArea */}
              <div
                ref={contentRef}
                className="flex-1 overflow-y-auto px-6 py-4"
              >
                <div
                  className="max-w-4xl prose-invert"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </>
          ) : null}
        </div>

        {/* Right sidebar — Table of Contents */}
        {filteredToc.length > 0 && !contentLoading && (
          <div className="w-52 shrink-0 border-l border-border/40 overflow-y-auto p-4 hidden lg:block">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              On This Page
            </h3>
            <nav className="space-y-0.5">
              {filteredToc.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleTocClick(entry.id)}
                  className={`block w-full text-left text-xs py-1 transition-colors truncate ${
                    entry.level === 1 ? "pl-0 font-medium" : ""
                  }${entry.level === 2 ? "pl-3" : ""}${
                    entry.level === 3 ? "pl-6" : ""
                  } ${
                    activeHeading === entry.id
                      ? "text-brand font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={entry.text}
                >
                  {entry.text}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
