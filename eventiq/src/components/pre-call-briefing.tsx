"use client";

import { useMemo } from "react";
import { Company, Leader, EngagementEntry } from "@/lib/types";
import { PipelineRecord } from "@/lib/pipeline-helpers";
import { generateBriefing, briefingToText, PreCallBriefing } from "@/lib/briefing-helpers";
import { CopyButton } from "@/components/copy-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  User,
  Clock,
  Target,
  Newspaper,
  AlertTriangle,
  Copy,
} from "lucide-react";

interface PreCallBriefingDialogProps {
  open: boolean;
  onClose: () => void;
  company: Company;
  leader: Leader;
  engagements: EngagementEntry[];
  pipelineState: Record<string, PipelineRecord>;
}

export function PreCallBriefingDialog({
  open,
  onClose,
  company,
  leader,
  engagements,
  pipelineState,
}: PreCallBriefingDialogProps) {
  const briefing = useMemo(
    () => generateBriefing(company, leader, engagements, pipelineState),
    [company, leader, engagements, pipelineState]
  );

  const fullText = useMemo(
    () => briefingToText(briefing, company.name),
    [briefing, company.name]
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">
              Brief: {leader.n} @ {company.name}
            </DialogTitle>
            <CopyButton text={fullText} variant="button" label="Copy All" size="sm" />
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* WHO */}
          <BriefSection icon={User} title="WHO">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{briefing.who.leader.n}</span>
                <span className="text-xs text-muted-foreground">{briefing.who.leader.t}</span>
              </div>
              <Badge variant="outline" className={cn("text-[10px]", briefing.who.persona.colorClass)}>
                {briefing.who.persona.label}: {briefing.who.persona.strategy}
              </Badge>
              <p className="text-xs text-muted-foreground leading-relaxed">{briefing.who.oneLiner}</p>
              {briefing.who.topHooks.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {briefing.who.topHooks.map((hook, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {hook}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </BriefSection>

          {/* LAST TOUCH */}
          <BriefSection icon={Clock} title="LAST TOUCH">
            {briefing.lastTouch ? (
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium capitalize">{briefing.lastTouch.action}</span>
                  <span className="text-muted-foreground"> via {briefing.lastTouch.channel} </span>
                  <span className="text-xs text-muted-foreground">({briefing.lastTouch.when})</span>
                </p>
                <p className="text-xs text-muted-foreground">With: {briefing.lastTouch.contactName}</p>
                {briefing.lastTouch.notes && (
                  <p className="text-xs text-muted-foreground italic">{briefing.lastTouch.notes}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No previous contact — first touch</p>
            )}
          </BriefSection>

          {/* YOUR ANGLE */}
          <BriefSection icon={Target} title="YOUR ANGLE">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <p className="text-sm text-foreground/90 bg-primary/5 border border-primary/20 rounded-lg p-2.5 flex-1 leading-relaxed">
                  {briefing.yourAngle.talkingPoint}
                </p>
                <CopyButton text={briefing.yourAngle.talkingPoint} />
              </div>
              <div className="flex items-start gap-2">
                <p className="text-xs text-primary bg-primary/5 rounded-lg p-2 flex-1">
                  CTA: {briefing.yourAngle.cta}
                </p>
                <CopyButton text={briefing.yourAngle.cta} />
              </div>
            </div>
          </BriefSection>

          {/* NEWS HOOK */}
          {briefing.newsHook && (
            <BriefSection icon={Newspaper} title="NEWS HOOK">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">{briefing.newsHook.headline}</p>
                <p className="text-[10px] text-primary/70">{briefing.newsHook.source}</p>
                <div className="flex items-start gap-2">
                  <p className="text-xs text-foreground/80 bg-secondary/30 rounded-lg p-2 flex-1 leading-relaxed italic">
                    &ldquo;{briefing.newsHook.suggestedOpener}&rdquo;
                  </p>
                  <CopyButton text={briefing.newsHook.suggestedOpener} />
                </div>
              </div>
            </BriefSection>
          )}

          {/* LAND MINES */}
          {briefing.landMines.length > 0 && (
            <BriefSection icon={AlertTriangle} title="LAND MINES">
              <div className="space-y-1">
                {briefing.landMines.map((mine, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-red-400 shrink-0 mt-0.5">&bull;</span>
                    <span className="text-red-400/80">{mine}</span>
                  </div>
                ))}
              </div>
            </BriefSection>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BriefSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-secondary/20 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}
