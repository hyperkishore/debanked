"use client";

import { useMemo, useState } from "react";
import { Company, EngagementEntry, EngagementChannel } from "@/lib/types";
import { PipelineRecord } from "@/lib/pipeline-helpers";
import {
  SequenceProgress,
  SequenceType,
  autoSelectSequence,
  generateSequence,
  getSequenceColor,
} from "@/lib/sequence-helpers";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Mail,
  Linkedin,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { toast } from "sonner";

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  linkedin: Linkedin,
  call: Phone,
  meeting: Calendar,
};

interface SequencePanelProps {
  company: Company;
  engagements: EngagementEntry[];
  pipelineState: Record<string, PipelineRecord>;
  sequenceProgress: SequenceProgress | undefined;
  onStepComplete: (companyId: number, stepId: string, channel: EngagementChannel, action: string) => void;
}

export function SequencePanel({
  company,
  engagements,
  pipelineState,
  sequenceProgress,
  onStepComplete,
}: SequencePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const sequenceType = useMemo(
    () => sequenceProgress?.sequenceType || autoSelectSequence(company, engagements, pipelineState),
    [company, engagements, pipelineState, sequenceProgress]
  );

  const leader = company.leaders?.[0];

  const sequence = useMemo(
    () => generateSequence(sequenceType, company, leader),
    [sequenceType, company, leader]
  );

  const completedSteps = new Set(sequenceProgress?.completedSteps || []);
  const completedCount = sequence.steps.filter((s) => completedSteps.has(s.id)).length;

  return (
    <div>
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 mb-2 w-full text-left h-auto p-0 justify-start"
      >
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
          Sequence
        </h3>
        <Badge variant="outline" className={cn("text-xs", getSequenceColor(sequenceType))}>
          {sequence.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{sequence.steps.length}
        </span>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>

      {/* Timeline */}
      {!collapsed && (
        <div className="relative ml-3 border-l-2 border-border pl-4 space-y-2">
          {sequence.steps.map((step, i) => {
            const Icon = channelIcons[step.channel] || Mail;
            const isDone = completedSteps.has(step.id);
            const isExpanded = expandedStep === step.id;
            const isNext = !isDone && !sequence.steps.slice(0, i).some((s) => !completedSteps.has(s.id));

            return (
              <div key={step.id} className="relative">
                {/* Timeline dot */}
                <div
                  className={cn(
                    "absolute -left-[calc(1rem+5px)] w-2.5 h-2.5 rounded-full border-2 mt-1.5",
                    isDone
                      ? "bg-green-500 border-green-500"
                      : isNext
                        ? "bg-brand border-brand"
                        : "bg-background border-border"
                  )}
                />

                <div
                  className={cn(
                    "rounded-lg p-2.5 transition-colors",
                    isDone ? "bg-green-500/5" : isNext ? "bg-brand/5" : "bg-secondary/20",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {/* Checkbox */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (!isDone) {
                          onStepComplete(company.id, step.id, step.channel, step.engagementAction);
                        }
                      }}
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        isDone
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-border hover:border-brand"
                      )}
                    >
                      {isDone && <Check className="h-3 w-3" />}
                    </Button>

                    {/* Step info */}
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", isDone ? "text-green-400" : "text-muted-foreground")} />
                    <Badge variant="outline" className="text-xs px-1 py-0.5 h-5">
                      Day {step.dayOffset}
                    </Badge>
                    <span className={cn("text-xs flex-1", isDone && "line-through text-muted-foreground")}>
                      {step.description}
                    </span>

                    {/* Expand toggle */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                      className="h-6 w-6 text-muted-foreground"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="mt-2 ml-6">
                      <div className="flex items-start gap-2">
                        <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed bg-secondary/30 rounded-lg p-2.5 flex-1">
                          {step.preWrittenContent}
                        </pre>
                        <CopyButton text={step.preWrittenContent} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
