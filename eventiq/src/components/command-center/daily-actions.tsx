"use client";

import { useMemo } from "react";
import { Company, EngagementEntry } from "@/lib/types";
import { PipelineRecord } from "@/lib/pipeline-helpers";
import { FollowUpReminder } from "@/lib/follow-up-helpers";
import { getLastEngagement } from "@/lib/engagement-helpers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Phone,
  ArrowRight,
} from "lucide-react";

interface DailyActionsProps {
  companies: Company[];
  engagements: EngagementEntry[];
  pipelineState: Record<string, PipelineRecord>;
  followUps: FollowUpReminder[];
  onSelectCompany: (id: number) => void;
  onOpenEngagement: (companyId: number) => void;
  onCompleteFollowUp: (id: string) => void;
}

interface ActionItem {
  id: string;
  type: "follow_up" | "stale_deal" | "quick_win";
  priority: "critical" | "high" | "medium";
  company: Company;
  title: string;
  subtitle: string;
  daysOverdue?: number;
  followUpId?: string;
}

export function DailyActions({
  companies,
  engagements,
  pipelineState,
  followUps,
  onSelectCompany,
  onOpenEngagement,
  onCompleteFollowUp,
}: DailyActionsProps) {
  const actions = useMemo(() => {
    const items: ActionItem[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const now = Date.now();

    // 1. Follow-ups due today or overdue
    for (const fu of followUps) {
      if (fu.completed) continue;
      if (fu.dueDate <= today) {
        const company = companies.find((c) => c.id === fu.companyId);
        if (!company) continue;

        const daysOverdue = Math.floor(
          (now - new Date(fu.dueDate).getTime()) / 86400000
        );

        items.push({
          id: `fu-${fu.id}`,
          type: "follow_up",
          priority: daysOverdue > 2 ? "critical" : "high",
          company,
          title: `Follow up with ${fu.contactName || company.name}`,
          subtitle: fu.notes || `Due ${daysOverdue > 0 ? `${daysOverdue}d overdue` : "today"}`,
          daysOverdue,
          followUpId: fu.id,
        });
      }
    }

    // 2. Stale active deals (7+ days no movement)
    const activeStages = new Set(["contacted", "engaged", "demo", "proposal"]);
    for (const company of companies) {
      const record = pipelineState[company.id];
      if (!record || !activeStages.has(record.stage)) continue;

      const last = getLastEngagement(engagements, company.id);
      if (!last) continue;

      const daysSince = Math.floor(
        (now - new Date(last.timestamp).getTime()) / 86400000
      );

      if (daysSince >= 7) {
        // Don't duplicate if already a follow-up
        if (items.some((a) => a.company.id === company.id)) continue;

        items.push({
          id: `stale-${company.id}`,
          type: "stale_deal",
          priority: daysSince > 14 ? "critical" : "high",
          company,
          title: `Re-engage ${company.name}`,
          subtitle: `${record.stage} stage — ${daysSince}d since last touch`,
          daysOverdue: daysSince,
        });
      }
    }

    // Sort: critical first, then high, then medium
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return items.slice(0, 10);
  }, [companies, engagements, pipelineState, followUps]);

  if (actions.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-8 w-8 text-[var(--icp)]/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">All caught up!</p>
        <p className="text-xs text-muted-foreground/60 mt-1">No urgent actions right now</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <Card
          key={action.id}
          className="p-3 gap-2 shadow-none hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-start gap-2">
            <div className="shrink-0 mt-0.5">
              {action.priority === "critical" ? (
                <AlertTriangle className="h-4 w-4 text-[var(--sqo)]" />
              ) : action.type === "follow_up" ? (
                <Clock className="h-4 w-4 text-[var(--client)]" />
              ) : (
                <ArrowRight className="h-4 w-4 text-brand" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs px-1.5 py-0 h-5",
                    action.priority === "critical"
                      ? "text-[var(--sqo)] border-[var(--sqo)]/30"
                      : action.priority === "high"
                      ? "text-[var(--client)] border-[var(--client)]/30"
                      : "text-muted-foreground"
                  )}
                >
                  {action.priority}
                </Badge>
                <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-muted-foreground">
                  {action.type === "follow_up" ? "Follow-up" : "Stale Deal"}
                </Badge>
              </div>
              <p className="text-sm font-medium">{action.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{action.subtitle}</p>
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
                onClick={() => onOpenEngagement(action.company.id)}
                title="Log engagement"
              >
                <Mail className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => onSelectCompany(action.company.id)}
                title="View company"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
