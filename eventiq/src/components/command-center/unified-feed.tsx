"use client";

import { useEffect, useState, useMemo } from "react";
import { Company } from "@/lib/types";
import { buildFeedItems, FeedItem, SIGNAL_TYPE_CONFIG } from "@/lib/feed-helpers";
import { generateAngle, mapSignalType } from "@/lib/why-now-engine";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Newspaper,
  ExternalLink,
  Loader2,
  Linkedin,
  MessageSquare,
  Share2,
  Heart,
  Rss,
} from "lucide-react";

interface UnifiedFeedProps {
  companies: Company[];
  onSelectCompany: (id: number) => void;
  limit?: number;
}

interface NewsApiItem {
  id: string;
  company_id: number;
  company_name: string;
  headline: string;
  source: string;
  description: string;
  published_at: string | null;
  signal_type: string;
  heat: string;
  source_url: string;
}

interface LinkedInItem {
  id: string;
  leader_name: string;
  company_id: number;
  activity_type: string;
  content_summary: string;
  original_url: string;
  extracted_at: string;
}

type UnifiedItem =
  | { kind: "news_api"; data: NewsApiItem; timestamp: number }
  | { kind: "news_static"; data: FeedItem; timestamp: number }
  | { kind: "linkedin"; data: LinkedInItem; timestamp: number };

const HEAT_COLORS: Record<string, string> = {
  hot: "text-[var(--sqo)] border-[var(--sqo)]/30",
  warm: "text-[var(--client)] border-[var(--client)]/30",
  cool: "text-muted-foreground border-muted-foreground/30",
};

const TYPE_LABELS: Record<string, string> = {
  funding: "Funding",
  partnership: "Partnership",
  product: "Product",
  hiring: "Leadership",
  regulatory: "Regulatory",
  milestone: "Milestone",
  general: "News",
};

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  post: MessageSquare,
  share: Share2,
  comment: MessageSquare,
  reaction: Heart,
};

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return "recent"; // future dates (imprecise date parsing)
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function UnifiedFeed({ companies, onSelectCompany, limit = 15 }: UnifiedFeedProps) {
  const [newsItems, setNewsItems] = useState<NewsApiItem[]>([]);
  const [linkedinItems, setLinkedinItems] = useState<LinkedInItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch API data
  useEffect(() => {
    let mounted = true;
    async function fetchAll() {
      const [newsRes, linkedinRes] = await Promise.allSettled([
        fetch(`/api/news-feed?limit=${limit * 2}`).then(r => r.ok ? r.json() : { items: [] }),
        fetch(`/api/linkedin-feed?limit=${limit}`).then(r => r.ok ? r.json() : { items: [] }),
      ]);
      if (!mounted) return;
      if (newsRes.status === "fulfilled") setNewsItems(newsRes.value.items || []);
      if (linkedinRes.status === "fulfilled") setLinkedinItems(linkedinRes.value.items || []);
      setLoading(false);
    }
    fetchAll();
    return () => { mounted = false; };
  }, [limit]);

  // Build client-side feed items
  const staticFeedItems = useMemo(() => buildFeedItems(companies), [companies]);

  // Merge + deduplicate all sources
  const unifiedItems = useMemo(() => {
    const items: UnifiedItem[] = [];
    const seenHeadlines = new Set<string>();

    // Helper to normalize for dedup
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);

    // 1. News API items (highest priority — freshest from Supabase)
    for (const item of newsItems) {
      const key = normalize(item.headline);
      if (seenHeadlines.has(key)) continue;
      seenHeadlines.add(key);
      const ts = item.published_at ? new Date(item.published_at).getTime() : Date.now() - 86400000;
      items.push({ kind: "news_api", data: item, timestamp: ts });
    }

    // 2. Static feed items (from company.news[])
    const now = Date.now();
    for (const item of staticFeedItems) {
      const key = normalize(item.headline);
      if (seenHeadlines.has(key)) continue;
      seenHeadlines.add(key);
      // Cap at now — date parsing from "Source, 2026" defaults to mid-year (future)
      const ts = Math.min(item.dateEstimate, now);
      items.push({ kind: "news_static", data: item, timestamp: ts });
    }

    // 3. LinkedIn activity
    for (const item of linkedinItems) {
      const ts = new Date(item.extracted_at).getTime();
      items.push({ kind: "linkedin", data: item, timestamp: ts });
    }

    // Sort by timestamp descending
    items.sort((a, b) => b.timestamp - a.timestamp);
    return items.slice(0, limit);
  }, [newsItems, linkedinItems, staticFeedItems, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (unifiedItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Newspaper className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No signals yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {unifiedItems.map((item) => {
        if (item.kind === "linkedin") {
          const li = item.data;
          const Icon = ACTIVITY_ICONS[li.activity_type] || MessageSquare;
          return (
            <Card
              key={`li-${li.id}`}
              className="p-3 gap-2 shadow-none hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => onSelectCompany(li.company_id)}
            >
              <div className="flex items-start gap-2">
                <Icon className="h-4 w-4 text-[var(--tam)] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-[var(--tam)] border-[var(--tam)]/30">
                      <Linkedin className="h-2.5 w-2.5 mr-1" />
                      {li.activity_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground/60 ml-auto shrink-0">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{li.leader_name}</p>
                  {li.content_summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{li.content_summary}</p>
                  )}
                </div>
              </div>
            </Card>
          );
        }

        // News item (API or static)
        const isApi = item.kind === "news_api";
        const headline = isApi ? item.data.headline : item.data.headline;
        const companyName = isApi ? item.data.company_name : item.data.companyName;
        const companyId = isApi ? item.data.company_id : item.data.companyId;
        const heat = isApi ? item.data.heat : item.data.heat;
        const signalType = isApi ? item.data.signal_type : item.data.signalType;
        const source = isApi ? item.data.source : item.data.source;
        const description = isApi ? item.data.description : item.data.description;
        const sourceUrl = isApi ? item.data.source_url : undefined;

        // Generate "why it matters" angle
        const whyNowType = mapSignalType(
          signalType as "funding" | "product" | "partnership" | "hiring" | "regulatory" | "milestone" | "general",
          headline
        );
        const angle = generateAngle(whyNowType, headline, companyName);

        return (
          <Card
            key={isApi ? `api-${item.data.id}` : `static-${item.data.id}`}
            className="p-3 gap-2 shadow-none hover:bg-muted/20 transition-colors cursor-pointer"
            onClick={() => onSelectCompany(companyId)}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge
                    variant="outline"
                    className={cn("text-xs px-1.5 py-0 h-5", HEAT_COLORS[heat] || HEAT_COLORS.cool)}
                  >
                    {heat}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-muted-foreground">
                    {TYPE_LABELS[signalType] || "News"}
                  </Badge>
                  <span className="text-xs text-muted-foreground/60 ml-auto shrink-0">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
                <p className="text-sm font-medium line-clamp-2">{headline}</p>
                {description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{description}</p>
                )}
                <p className="text-xs text-orange-400/80 line-clamp-1 mt-1">{angle}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-brand font-medium">{companyName}</span>
                  <span className="text-xs text-muted-foreground/40">via {source}</span>
                </div>
              </div>
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
