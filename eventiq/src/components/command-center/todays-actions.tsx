"use client";

import { useMemo } from "react";
import { Company, EngagementEntry } from "@/lib/types";
import { PipelineRecord } from "@/lib/pipeline-helpers";
import { FollowUpReminder } from "@/lib/follow-up-helpers";
import { getLastEngagement } from "@/lib/engagement-helpers";
import { buildMorningBriefing } from "@/lib/morning-briefing-helpers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Mail,
  Newspaper,
  TrendingDown,
  Zap,
} from "lucide-react";

interface TodaysActionsProps {
  companies: Company[];
  engagements: EngagementEntry[];
  pipelineState: Record<string, PipelineRecord>;
  metState: Record<string, boolean>;
  followUps: FollowUpReminder[];
  onSelectCompany: (id: number) => void;
  onOpenEngagement: (companyId: number) => void;
  onCompleteFollowUp: (id: string) => void;
}

interface ActionItem {
  id: string;
  type: "follow_up" | "news_trigger" | "stale_deal";
  priority: "critical" | "high" | "medium";
  companyId: number;
  companyName: string;
  title: string;
  subtitle: string;
  followUpId?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-[var(--sqo)] border-[var(--sqo)]/30",
  high: "text-[var(--client)] border-[var(--client)]/30",
  medium: "text-muted-foreground border-muted-foreground/30",
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  follow_up: Clock,
  news_trigger: Newspaper,
  stale_deal: TrendingDown,
};

export function TodaysActions({
  companies,
  engagements,
  pipelineState,
  metState,
  followUps,
  onSelectCompany,
  onOpenEngagement,
  onCompleteFollowUp,
}: TodaysActionsProps) {
  const actions = useMemo(() => {
    const items: ActionItem[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const seenCompanyIds = new Set<number>();

    // 1. Follow-ups due/overdue (CRITICAL priority)
    for (const fu of followUps) {
      if (fu.completed) continue;
      if (fu.dueDate <= today) {
        const company = companies.find(c => c.id === fu.companyId);
        if (!company) continue;

        const daysOverdue = Math.floor((now - new Date(fu.dueDate).getTime()) / 86400000);
        seenCompanyIds.add(company.id);

        items.push({
          id: `fu-${fu.id}`,
          type: "follow_up",
          priority: daysOverdue > 2 ? "critical" : "high",
          companyId: company.id,
          companyName: company.name,
          title: `Follow up with ${fu.contactName || company.name}`,
          subtitle: fu.notes || (daysOverdue > 0 ? `${daysOverdue}d overdue` : "Due today"),
          followUpId: fu.id,
        });
      }
    }

    // 2. News triggers from morning briefing (HIGH priority)
    const briefing = buildMorningBriefing(companies, engagements, pipelineState, metState);
    for (const trigger of briefing.newsTriggers) {
      if (seenCompanyIds.has(trigger.company.id)) continue;
      seenCompanyIds.add(trigger.company.id);

      items.push({
        id: `news-${trigger.company.id}`,
        type: "news_trigger",
        priority: "high",
        companyId: trigger.company.id,
        companyName: trigger.company.name,
        title: `React to: "${trigger.headline}"`,
        subtitle: trigger.suggestedMessage.slice(0, 120) + (trigger.suggestedMessage.length > 120 ? "..." : ""),
      });
    }

    // 3. Stale deal warnings (MEDIUM priority)
    for (const warning of briefing.staleWarnings) {
      if (seenCompanyIds.has(warning.company.id)) continue;
      seenCompanyIds.add(warning.company.id);

      items.push({
        id: `stale-${warning.company.id}`,
        type: "stale_deal",
        priority: warning.daysSince > 14 ? "critical" : "medium",
        companyId: warning.company.id,
        companyName: warning.company.name,
        title: `Re-engage ${warning.company.name}`,
        subtitle: `${warning.stage} stage — ${warning.daysSince}d since last ${warning.lastChannel}`,
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return items.slice(0, 12);
  }, [companies, engagements, pipelineState, metState, followUps]);

  if (actions.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="h-8 w-8 text-[var(--icp)]/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">All caught up!</p>
        <p className="text-xs text-muted-foreground/60 mt-1">No urgent actions right now</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action) => {
        const Icon = TYPE_ICONS[action.type] || Zap;
        return (
          <Card
            key={action.id}
            className="p-3 gap-2 shadow-none hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className="shrink-0 mt-0.5">
                {action.priority === "critical" ? (
                  <AlertTriangle className="h-4 w-4 text-[var(--sqo)]" />
                ) : (
                  <Icon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Badge
                    variant="outline"
                    className={cn("text-xs px-1.5 py-0 h-5", PRIORITY_COLORS[action.priority])}
                  >
                    {action.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-muted-foreground">
                    {action.type === "follow_up" ? "Follow-up" : action.type === "news_trigger" ? "News" : "Stale Deal"}
                  </Badge>
                </div>
                <p className="text-sm font-medium line-clamp-1">{action.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{action.subtitle}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {action.followUpId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onCompleteFollowUp(action.followUpId!)}
                    title="Mark complete"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => onOpenEngagement(action.companyId)}
                  title="Log engagement"
                >
                  <Mail className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => onSelectCompany(action.companyId)}
                  title="View company"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
