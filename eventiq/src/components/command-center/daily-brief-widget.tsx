"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Users,
  Newspaper,
  MessageSquare,
  Loader2,
} from "lucide-react";

interface DailyBrief {
  date: string;
  highlights: string[];
  leader_activity: Array<{ name: string; company: string; summary: string }>;
  company_news: Array<{ company: string; headline: string; relevance: string }>;
  hooks_updated: Array<{ leader: string; company: string; hook: string }>;
  recommended_actions: string[];
}

interface DailyBriefWidgetProps {
  onSelectCompany: (id: number) => void;
  companies: Array<{ id: number; name: string }>;
}

export function DailyBriefWidget({ onSelectCompany, companies }: DailyBriefWidgetProps) {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/daily-brief");
        if (!res.ok) {
          setLoading(false);
          return;
        }
        if (mounted) {
          const data = await res.json();
          setBrief(data);
        }
      } catch {
        // Brief not available yet — that's fine
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <Card className="p-4 border-purple-500/20 bg-purple-500/5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading intelligence brief...
        </div>
      </Card>
    );
  }

  if (!brief || brief.highlights?.length === 0 || brief.highlights?.[0]?.includes("No intelligence")) {
    return null; // Don't show empty widget
  }

  const findCompany = (name: string) =>
    companies.find((c) => c.name.toLowerCase().includes(name.toLowerCase()));

  return (
    <Card className="p-4 border-purple-500/20 bg-purple-500/5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-bold text-foreground">Today&apos;s Intelligence Brief</h3>
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-purple-400 border-purple-400/30">
            {brief.date}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Highlights (always visible) */}
      <div className="space-y-1 mb-2">
        {brief.highlights.slice(0, expanded ? undefined : 3).map((h, i) => (
          <p key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
            <span className="text-purple-400 shrink-0 mt-0.5">-</span>
            {h}
          </p>
        ))}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-4 mt-4 pt-3 border-t border-purple-500/10">
          {/* Leader Activity */}
          {brief.leader_activity?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                <Users className="h-3 w-3" /> Leader Activity
              </h4>
              <div className="space-y-1.5">
                {brief.leader_activity.map((a, i) => {
                  const company = findCompany(a.company);
                  return (
                    <div
                      key={i}
                      className={`text-xs p-2 rounded bg-muted/20 ${company ? "cursor-pointer hover:bg-muted/30" : ""}`}
                      onClick={() => company && onSelectCompany(company.id)}
                    >
                      <span className="font-medium text-foreground">{a.name}</span>
                      {a.company && <span className="text-brand ml-1">({a.company})</span>}
                      <p className="text-muted-foreground mt-0.5">{a.summary}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Company News */}
          {brief.company_news?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                <Newspaper className="h-3 w-3" /> Company News
              </h4>
              <div className="space-y-1.5">
                {brief.company_news.map((n, i) => {
                  const company = findCompany(n.company);
                  return (
                    <div
                      key={i}
                      className={`text-xs p-2 rounded bg-muted/20 ${company ? "cursor-pointer hover:bg-muted/30" : ""}`}
                      onClick={() => company && onSelectCompany(company.id)}
                    >
                      <span className="font-medium text-brand">{n.company}:</span>{" "}
                      <span className="text-foreground">{n.headline}</span>
                      {n.relevance && <p className="text-muted-foreground mt-0.5">{n.relevance}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Updated Hooks */}
          {brief.hooks_updated?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                <MessageSquare className="h-3 w-3" /> Fresh Conversation Hooks
              </h4>
              <div className="space-y-1.5">
                {brief.hooks_updated.map((h, i) => (
                  <div key={i} className="text-xs p-2 rounded bg-purple-500/5 border border-purple-500/10">
                    <span className="font-medium text-foreground">{h.leader}</span>
                    {h.company && <span className="text-brand ml-1">({h.company})</span>}
                    <p className="text-purple-400 mt-0.5">&quot;{h.hook}&quot;</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {brief.recommended_actions?.length > 0 && (
            <div className="p-3 rounded bg-brand/5 border border-brand/10">
              <h4 className="text-xs font-semibold text-brand mb-1.5">Recommended Actions</h4>
              {brief.recommended_actions.map((a, i) => (
                <p key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                  <span className="text-brand shrink-0">{i + 1}.</span>
                  {a}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
