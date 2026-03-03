"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Newspaper, ExternalLink, Loader2 } from "lucide-react";

interface NewsItem {
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

interface NewsFeedProps {
  limit?: number;
}

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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NewsFeed({ limit = 15 }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch(`/api/news-feed?limit=${limit}`);
        if (res.ok) {
          const data = await res.json();
          setNews(data.items || []);
        }
      } catch {
        // Silently fail — feed is supplementary
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, [limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="text-center py-8">
        <Newspaper className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No recent news signals</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Set up Google Alerts RSS to start ingesting industry news
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {news.map((item) => (
        <Card
          key={item.id}
          className="p-3 gap-2 shadow-none hover:bg-muted/20 transition-colors cursor-default"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Badge
                  variant="outline"
                  className={cn("text-xs px-1.5 py-0 h-5", HEAT_COLORS[item.heat] || HEAT_COLORS.cool)}
                >
                  {item.heat}
                </Badge>
                <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-muted-foreground">
                  {TYPE_LABELS[item.signal_type] || "News"}
                </Badge>
                {item.published_at && (
                  <span className="text-xs text-muted-foreground/60 ml-auto shrink-0">
                    {formatDate(item.published_at)}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium line-clamp-2">{item.headline}</p>
              {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-brand font-medium">{item.company_name}</span>
                <span className="text-xs text-muted-foreground/40">via {item.source}</span>
              </div>
            </div>
            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
