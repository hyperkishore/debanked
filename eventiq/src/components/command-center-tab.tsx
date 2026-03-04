"use client";

import { useMemo } from "react";
import { Company, EngagementEntry, RatingData } from "@/lib/types";
import { buildFeedItems } from "@/lib/feed-helpers";
import { PipelineRecord } from "@/lib/pipeline-helpers";
import { FollowUpReminder } from "@/lib/follow-up-helpers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Rss, Target } from "lucide-react";
import { GoalHeader } from "@/components/command-center/goal-header";
import { UnifiedFeed } from "@/components/command-center/unified-feed";
import { TodaysActions } from "@/components/command-center/todays-actions";
import { PipelineDeals } from "@/components/command-center/pipeline-deals";

interface CommandCenterTabProps {
  companies: Company[];
  pipelineState: Record<string, PipelineRecord>;
  engagements: EngagementEntry[];
  ratingState: Record<string, RatingData>;
  metState: Record<string, boolean>;
  followUps: FollowUpReminder[];
  onSelectCompany: (id: number) => void;
  onOpenEngagement: (companyId: number) => void;
  onCompleteFollowUp: (followUpId: string) => void;
}

export function CommandCenterTab({
  companies,
  pipelineState,
  engagements,
  ratingState,
  metState,
  followUps,
  onSelectCompany,
  onOpenEngagement,
  onCompleteFollowUp,
}: CommandCenterTabProps) {
  const feedItems = useMemo(() => buildFeedItems(companies), [companies]);

  return (
    <div className="h-full flex flex-col bg-background">
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto p-6 space-y-6">

          {/* === SECTION 1: Goal Header === */}
          <GoalHeader
            companies={companies}
            pipelineState={pipelineState}
            followUps={followUps}
            feedItems={feedItems}
          />

          {/* === SECTION 2: Two-Panel Intelligence === */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Intelligence Hub</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Left Panel: Unified Signal Feed */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Rss className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Signal Feed</h3>
                </div>
                <UnifiedFeed
                  companies={companies}
                  onSelectCompany={onSelectCompany}
                  limit={12}
                />
              </div>

              {/* Right Panel: Today's Actions */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today&apos;s Actions</h3>
                </div>
                <TodaysActions
                  companies={companies}
                  engagements={engagements}
                  pipelineState={pipelineState}
                  metState={metState}
                  followUps={followUps}
                  onSelectCompany={onSelectCompany}
                  onOpenEngagement={onOpenEngagement}
                  onCompleteFollowUp={onCompleteFollowUp}
                />
              </div>
            </div>
          </section>

          {/* === SECTION 3: Active Deals (collapsible) === */}
          <PipelineDeals
            companies={companies}
            pipelineState={pipelineState}
            onSelectCompany={onSelectCompany}
          />

        </div>
      </ScrollArea>
    </div>
  );
}
