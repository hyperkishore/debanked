"use client";

import { useMemo, useState, useEffect } from "react";
import { Company, NewsItem, EngagementEntry, RatingData } from "@/lib/types";
import { 
  FeedItem, 
  buildFeedItems, 
  getHotSignals, 
  SIGNAL_TYPE_CONFIG 
} from "@/lib/feed-helpers";
import { PipelineRecord } from "@/lib/pipeline-helpers";
import { detectBreaches, type SLABreach } from "@/lib/sla-helpers";
import { getSupabase } from "@/lib/supabase";
import { estimateCompanyValue } from "@/lib/revenue-model";
import { RevenueMilestoneTracker } from "@/components/revenue-milestone-tracker";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  AlertCircle, 
  Lightbulb, 
  ArrowRight, 
  Zap,
  Users,
  Target
} from "lucide-react";

interface MissionControlTabProps {
  companies: Company[];
  pipelineState: Record<string, PipelineRecord>;
  engagements: EngagementEntry[];
  ratingState: Record<string, RatingData>;
  onSelectCompany: (id: number) => void;
  onOpenEngagement: (companyId: number) => void;
}

const GTM_PLAYS = [
  {
    name: "Trigger-Based Gifting",
    play: "Send personalized gifts on hard triggers (facility raise, product launch).",
    icon: <Zap className="w-3.5 h-3.5" />
  },
  {
    name: "Underwriting Roundtable",
    play: "Invite to invite-only CRO/COO session on fraud benchmarks.",
    icon: <Users className="w-3.5 h-3.5" />
  },
  {
    name: "Risk Benchmark Teardown",
    play: "Use approval latency benchmarks as outreach hooks.",
    icon: <Target className="w-3.5 h-3.5" />
  }
];

export function MissionControlTab({ 
  companies, 
  pipelineState, 
  engagements, 
  ratingState,
  onSelectCompany,
  onOpenEngagement 
}: MissionControlTabProps) {
  const [liveNews, setLiveNews] = useState<NewsItem[]>([]);

  // 1. Fetch live news (same as FeedTab)
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("company_news")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(100);
      if (error || !data || cancelled) return;
      const items: NewsItem[] = data.map((row: any) => ({
        h: row.headline || "",
        s: row.source || "",
        d: row.description || "",
        p: row.published_at,
        _companyId: row.company_id,
      }));
      setLiveNews(items);
    })();
    return () => { cancelled = true; };
  }, []);

  // 2. Merge and build signals
  const companiesWithNews = useMemo(() => {
    const newsMap = new Map<number, NewsItem[]>();
    for (const item of liveNews) {
      const cid = (item as any)._companyId;
      if (!cid) continue;
      const existing = newsMap.get(cid) || [];
      existing.push(item);
      newsMap.set(cid, existing);
    }
    return companies.map(c => {
      const add = newsMap.get(c.id);
      if (!add) return c;
      const existing = new Set(c.news.map(n => n.h.toLowerCase().trim()));
      const newItems = add.filter(n => !existing.has(n.h.toLowerCase().trim()));
      return { ...c, news: [...newItems, ...c.news] };
    });
  }, [companies, liveNews]);

  const allSignals = useMemo(() => buildFeedItems(companiesWithNews), [companiesWithNews]);
  const topSignals = useMemo(() => {
    return allSignals
      .map(s => {
        const company = companies.find(c => c.id === s.companyId);
        const value = company ? estimateCompanyValue(company) : 0;
        return { ...s, value };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
  }, [allSignals, companies]);

  // 3. Detect Breaches
  const breaches = useMemo(() => {
    const list = companies.map(c => ({ id: c.id, name: c.name }));
    return detectBreaches(list, engagements, pipelineState).slice(0, 5);
  }, [companies, engagements, pipelineState]);

  // 4. Collaborative Leaderboard (Mock - should be driven by Supabase in future)
  const leaderboard = useMemo(() => [
    { name: "AE 1", pipe: "$1.2M", count: 12 },
    { name: "AE 2", pipe: "$0.8M", count: 8 },
    { name: "AE 3", pipe: "$0.5M", count: 5 },
  ], []);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 1. Global Goal Context (Fixed Top) */}
      <div className="p-4 border-b bg-card/30">
        <RevenueMilestoneTracker 
          companies={companies}
          pipelineState={pipelineState}
        />
      </div>

      <div className="flex-1 flex min-h-0">
        {/* 2. Main Signal Stream (Center) */}
        <ScrollArea className="flex-1 border-r">
          <div className="p-6 space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand" />
                Active Mission Intel
              </h2>
              <Badge variant="outline" className="text-[10px] font-bold">
                {topSignals.length} HIGH-VALUE SIGNALS
              </Badge>
            </div>

            <div className="space-y-3">
              {topSignals.map((signal) => {
                const config = SIGNAL_TYPE_CONFIG[signal.signalType];
                return (
                  <Card key={signal.id} className="p-0 overflow-hidden border-border/50 bg-card/50 hover:bg-card transition-all group">
                    <div className="flex">
                      {/* Left color bar based on value */}
                      <div className={`w-1 ${signal.value > 100000 ? 'bg-brand' : 'bg-muted'}`} />
                      
                      <div className="p-4 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-brand group-hover:underline cursor-pointer" onClick={() => onSelectCompany(signal.companyId)}>
                                {signal.companyName}
                              </span>
                              <Badge variant="outline" className="text-[9px] h-3.5 uppercase font-bold px-1">
                                {signal.companyType}
                              </Badge>
                              {signal.value > 0 && (
                                <span className="text-[10px] font-black text-green-500 ml-auto">
                                  ${(signal.value / 1000).toFixed(0)}K POTENTIAL
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-semibold leading-tight mb-1">{signal.headline}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                              {signal.description}
                            </p>
                            
                            {/* The "Play" - Dynamic Strategy Integration */}
                            <div className="flex items-start gap-2 p-2 rounded bg-brand/5 border border-brand/10">
                              <Lightbulb className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-[11px] font-bold text-brand uppercase tracking-wider">Suggested Play</p>
                                <p className="text-xs text-foreground/90 leading-snug">
                                  {signal.signalType === 'funding' ? "Send personalized gift to CEO - 'Congrats on the facility! Looking forward to helping you scale faster.'" : 
                                   signal.signalType === 'hiring' ? "Target the new leader with the 'Underwriting Roundtable' invite." :
                                   "Use the 'Risk Benchmark Teardown' as a 3-touch sequence hook."}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col gap-2">
                             <Button size="sm" className="h-8 px-3 text-xs font-bold gap-1.5" onClick={() => onSelectCompany(signal.companyId)}>
                               Research <ArrowRight className="w-3 h-3" />
                             </Button>
                             <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-bold" onClick={() => onOpenEngagement(signal.companyId)}>
                               Log Action
                             </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </ScrollArea>

        {/* 3. The Tactical Sidebar (Right) */}
        <div className="w-80 bg-card/20 flex flex-col shrink-0 overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Gap Analysis / Breaches */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  Value at Risk (SLA)
                </h3>
                {breaches.length > 0 ? (
                  <div className="space-y-2">
                    {breaches.map(b => (
                      <div key={b.companyId} className="p-2 rounded border border-red-500/20 bg-red-500/5 space-y-1 cursor-pointer hover:bg-red-500/10 transition-colors" onClick={() => onSelectCompany(b.companyId)}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate pr-2">{b.companyName}</span>
                          <span className="text-[10px] text-red-500 font-bold">{b.hoursOverdue}h Overdue</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Needs touch: {b.slaLabel}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic">No active breaches. Great job!</p>
                )}
              </div>

              <Separator className="opacity-50" />

              {/* Tactical Plays Library */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Live GTM Plays
                </h3>
                <div className="space-y-2">
                  {GTM_PLAYS.map(play => (
                    <div key={play.name} className="p-3 rounded border bg-card/50 space-y-1.5">
                      <div className="flex items-center gap-2 text-brand">
                        {play.icon}
                        <span className="text-xs font-bold">{play.name}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">{play.play}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Collaborative Leaderboard */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  Mission Progress
                </h3>
                <div className="space-y-2">
                  {leaderboard.map((ae, i) => (
                    <div key={ae.name} className="flex items-center justify-between text-xs p-2 rounded bg-muted/20">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-muted-foreground">#{i+1}</span>
                        <span>{ae.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{ae.pipe}</div>
                        <div className="text-[9px] text-muted-foreground">{ae.count} Active Deals</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
