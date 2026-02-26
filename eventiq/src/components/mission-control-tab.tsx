"use client";

import { useMemo } from "react";
import { Company, EngagementEntry, RatingData, inferSubVertical } from "@/lib/types";
import { buildFeedItems, parseDateFromNews } from "@/lib/feed-helpers";
import { PipelineRecord } from "@/lib/pipeline-helpers";
import { estimateCompanyValue } from "@/lib/revenue-model";
import { computeReadinessScore, getReadinessLabel, getReadinessColor } from "@/lib/readiness-score";
import { getNextBestAction } from "@/lib/outreach-score";
import { getLastEngagement, getCompanyEngagements } from "@/lib/engagement-helpers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  TrendingUp,
  Zap,
  DollarSign,
  Building2,
  ExternalLink,
  Mail,
  Linkedin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
} from "lucide-react";

interface MissionControlTabProps {
  companies: Company[];
  pipelineState: Record<string, PipelineRecord>;
  engagements: EngagementEntry[];
  ratingState: Record<string, RatingData>;
  metState: Record<string, boolean>;
  onSelectCompany: (id: number) => void;
  onOpenEngagement: (companyId: number) => void;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value}`;
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function formatDaysAgo(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function MissionControlTab({
  companies,
  pipelineState,
  engagements,
  ratingState,
  metState,
  onSelectCompany,
  onOpenEngagement,
}: MissionControlTabProps) {
  const feedItems = useMemo(() => buildFeedItems(companies), [companies]);

  // === Section 1: HubSpot Pipeline Snapshot (real deal data) ===
  const hubspotSnapshot = useMemo(() => {
    const activeDeals: Array<{
      company: Company;
      deal: NonNullable<Company["hubspotDeals"]>[0];
      isActive: boolean;
    }> = [];
    let totalPipeline = 0;
    let totalClosed = 0;
    let activeCount = 0;

    for (const c of companies) {
      for (const deal of c.hubspotDeals || []) {
        const stage = (deal.stageLabel || deal.stage || "").toLowerCase();
        const isWon = stage.includes("closed won");
        const isLost = stage.includes("closed lost");
        const isActive = !isWon && !isLost;

        if (isWon) totalClosed += deal.amount || 0;
        if (isActive) {
          totalPipeline += deal.amount || 0;
          activeCount++;
        }

        activeDeals.push({ company: c, deal, isActive });
      }
    }

    // Sort: active deals first, then by amount desc
    activeDeals.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return (b.deal.amount || 0) - (a.deal.amount || 0);
    });

    return { activeDeals: activeDeals.filter(d => d.isActive), totalPipeline, totalClosed, activeCount };
  }, [companies]);

  // === Section 2: Today's Action List (top 15 by readiness × value) ===
  const actionList = useMemo(() => {
    const items: Array<{
      company: Company;
      readiness: number;
      readinessLabel: string;
      nextAction: string;
      revenue: number;
      actionScore: number;
      lastContactDays: number | null;
      hasEmail: boolean;
      hasLinkedIn: boolean;
      missingPieces: string[];
    }> = [];

    for (const c of companies) {
      // Skip companies with no research at all
      if (!c.desc || c.desc.length < 10) continue;

      const breakdown = computeReadinessScore(c, feedItems, engagements);
      const label = getReadinessLabel(breakdown.total);
      const nextAction = getNextBestAction(c, engagements, pipelineState);
      const revenue = estimateCompanyValue(c);
      const lastEng = getLastEngagement(engagements, c.id);
      const lastContactDays = lastEng ? daysAgo(lastEng.timestamp) : null;
      const hasEmail = (c.leaders || []).some(l => l.email);
      const hasLinkedIn = (c.leaders || []).some(l => l.li);

      // Action score: prioritize ready companies with high value that haven't been contacted recently
      const readinessWeight = breakdown.total; // 0-10
      const revenueWeight = Math.min(revenue / 25000, 4); // 0-4 (caps at $100K+)
      const staleness = lastContactDays === null ? 3 : lastContactDays > 14 ? 2 : lastContactDays > 7 ? 1 : 0;
      const typeBoost = c.type === "SQO" ? 3 : c.type === "Client" ? 2 : c.type === "ICP" ? 1 : 0;
      const actionScore = readinessWeight + revenueWeight + staleness + typeBoost;

      items.push({
        company: c,
        readiness: breakdown.total,
        readinessLabel: label,
        nextAction,
        revenue,
        actionScore,
        lastContactDays,
        hasEmail,
        hasLinkedIn,
        missingPieces: breakdown.missingPieces,
      });
    }

    return items.sort((a, b) => b.actionScore - a.actionScore).slice(0, 15);
  }, [companies, feedItems, engagements, pipelineState]);

  // === Section 3: Recent Signals (last 30 days, high-value only) ===
  const recentSignals = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    return feedItems
      .filter(f => f.dateEstimate > thirtyDaysAgo && f.heat !== "cool")
      .sort((a, b) => b.dateEstimate - a.dateEstimate)
      .slice(0, 10);
  }, [feedItems]);

  // === Section 4: Coverage stats ===
  const coverage = useMemo(() => {
    const sqo = companies.filter(c => c.type === "SQO");
    const clients = companies.filter(c => c.type === "Client");
    const icp = companies.filter(c => c.type === "ICP");

    const contacted = (list: Company[]) =>
      list.filter(c => getCompanyEngagements(engagements, c.id).length > 0).length;

    const withHubSpot = companies.filter(c => (c.hubspotDeals || []).length > 0).length;
    const readyCount = companies.filter(c => {
      const b = computeReadinessScore(c, feedItems, engagements);
      return b.total >= 7;
    }).length;

    return {
      sqo: { total: sqo.length, contacted: contacted(sqo) },
      clients: { total: clients.length, contacted: contacted(clients) },
      icp: { total: icp.length, contacted: contacted(icp) },
      hubspotDeals: withHubSpot,
      readyToSend: readyCount,
      totalCompanies: companies.length,
    };
  }, [companies, engagements, feedItems]);

  return (
    <div className="h-full flex flex-col bg-background">
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto p-6 space-y-8">

          {/* === Pipeline Snapshot === */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Pipeline
              </h2>
              <Badge variant="outline" className="text-xs ml-auto">
                {hubspotSnapshot.activeCount} active deals
              </Badge>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Active Pipeline</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(hubspotSnapshot.totalPipeline)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Closed Won</p>
                <p className="text-xl font-bold tabular-nums text-green-400">{formatCurrency(hubspotSnapshot.totalClosed)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">In HubSpot</p>
                <p className="text-xl font-bold tabular-nums">{coverage.hubspotDeals}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Ready to Send</p>
                <p className="text-xl font-bold tabular-nums text-brand">{coverage.readyToSend}</p>
              </Card>
            </div>

            {/* Active deals list */}
            {hubspotSnapshot.activeDeals.length > 0 && (
              <div className="space-y-1.5">
                {hubspotSnapshot.activeDeals.slice(0, 8).map(({ company, deal }) => (
                  <div
                    key={deal.dealId}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => onSelectCompany(company.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{company.name}</span>
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-orange-500/10 text-orange-400 border-orange-500/30 shrink-0">
                          {deal.stageLabel || deal.stage}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{deal.dealName}</p>
                    </div>
                    {deal.amount && deal.amount > 0 && (
                      <span className="text-sm font-bold tabular-nums shrink-0">{formatCurrency(deal.amount)}</span>
                    )}
                    <a
                      href={`https://app.hubspot.com/contacts/3800237/deal/${deal.dealId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-brand shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
            {hubspotSnapshot.activeDeals.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No active HubSpot deals. Pipeline data comes from synced HubSpot deals on company records.</p>
            )}
          </section>

          {/* === Today's Action List === */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Top Actions
              </h2>
              <span className="text-xs text-muted-foreground ml-auto">
                Ranked by readiness + value + urgency
              </span>
            </div>

            <div className="space-y-1.5">
              {actionList.map(({ company, readiness, readinessLabel, nextAction, revenue, lastContactDays, hasEmail, hasLinkedIn, missingPieces }) => (
                <div
                  key={company.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors group"
                  onClick={() => onSelectCompany(company.id)}
                >
                  {/* Readiness indicator */}
                  <div className="shrink-0 w-8 text-center">
                    <span className={cn("text-sm font-bold tabular-nums", getReadinessColor(readinessLabel as any))}>
                      {readiness.toFixed(1)}
                    </span>
                  </div>

                  {/* Company info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{company.name}</span>
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4 shrink-0">
                        {inferSubVertical(company)}
                      </Badge>
                      {company.type === "SQO" && (
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-red-500/10 text-red-400 border-red-500/30 shrink-0">SQO</Badge>
                      )}
                      {company.type === "Client" && (
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-amber-500/10 text-amber-400 border-amber-500/30 shrink-0">Client</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-brand/80 font-medium">{nextAction}</span>
                      {lastContactDays !== null && (
                        <span className="text-xs text-muted-foreground/60">
                          <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                          {formatDaysAgo(lastContactDays)}
                        </span>
                      )}
                      {lastContactDays === null && (
                        <span className="text-xs text-orange-400/70">No contact yet</span>
                      )}
                    </div>
                  </div>

                  {/* Channels available */}
                  <div className="flex items-center gap-1 shrink-0">
                    {hasEmail && <Mail className="h-3.5 w-3.5 text-muted-foreground/50" />}
                    {hasLinkedIn && <Linkedin className="h-3.5 w-3.5 text-muted-foreground/50" />}
                  </div>

                  {/* Revenue */}
                  <span className="text-xs text-muted-foreground/60 tabular-nums shrink-0 w-12 text-right">
                    {formatCurrency(revenue)}
                  </span>

                  {/* Action button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEngagement(company.id);
                    }}
                  >
                    Log <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* === Coverage === */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Outreach Coverage
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "SQO", ...coverage.sqo, color: "text-red-400" },
                { label: "Client", ...coverage.clients, color: "text-amber-400" },
                { label: "ICP", ...coverage.icp, color: "text-green-400" },
              ].map((tier) => {
                const pct = tier.total > 0 ? Math.round((tier.contacted / tier.total) * 100) : 0;
                return (
                  <Card key={tier.label} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("text-sm font-bold", tier.color)}>{tier.label}</span>
                      <span className="text-xs text-muted-foreground">{tier.contacted}/{tier.total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", pct === 100 ? "bg-green-500" : pct > 50 ? "bg-yellow-500" : "bg-red-500")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pct === 100 ? (
                        <><CheckCircle2 className="h-3 w-3 inline text-green-400 mr-0.5" />All contacted</>
                      ) : tier.total - tier.contacted > 0 ? (
                        <><AlertTriangle className="h-3 w-3 inline text-orange-400 mr-0.5" />{tier.total - tier.contacted} not yet contacted</>
                      ) : "No companies in tier"}
                    </p>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* === Recent Signals === */}
          {recentSignals.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-brand" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Recent Signals
                </h2>
                <span className="text-xs text-muted-foreground ml-auto">Last 30 days</span>
              </div>

              <div className="space-y-1.5">
                {recentSignals.map((signal) => (
                  <div
                    key={signal.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => onSelectCompany(signal.companyId)}
                  >
                    <Circle className={cn(
                      "h-2 w-2 mt-1.5 shrink-0 fill-current",
                      signal.heat === "hot" ? "text-red-400" : "text-yellow-400"
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-brand">{signal.companyName}</span>
                        <span className="text-xs text-muted-foreground/60">{signal.source}</span>
                      </div>
                      <p className="text-sm leading-tight mt-0.5">{signal.headline}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
