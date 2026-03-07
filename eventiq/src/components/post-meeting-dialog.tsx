"use client";

import { useState, useMemo } from "react";
import { Company, EngagementEntry } from "@/lib/types";
import { PipelineStage, PIPELINE_STAGES, PipelineRecord } from "@/lib/pipeline-helpers";
import { parseMeetingNotes, ParsedMeetingNotes } from "@/lib/meeting-notes-parser";
import { getAllContacts } from "@/lib/engagement-helpers";
import { FollowUpData, SentimentData } from "@/components/engagement-log";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Notebook,
  ArrowRight,
  Check,
  AlertTriangle,
  Minus,
  Users,
  ListChecks,
  TrendingUp,
  MessageSquare,
  Clock,
  Pencil,
  ChevronLeft,
  X,
} from "lucide-react";

interface PostMeetingDialogProps {
  open: boolean;
  company: Company;
  pipelineState: Record<string, PipelineRecord>;
  onClose: () => void;
  onSave: (
    entry: EngagementEntry,
    followUp?: FollowUpData,
    sentimentData?: SentimentData,
    additionalFollowUps?: { contactName: string; dueDate: string; notes: string }[]
  ) => void;
}

const SENTIMENT_CONFIG = {
  positive: {
    icon: TrendingUp,
    label: "Positive",
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  negative: {
    icon: AlertTriangle,
    label: "Negative",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  neutral: {
    icon: Minus,
    label: "Neutral",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  },
};

export function PostMeetingDialog({
  open,
  company,
  pipelineState,
  onClose,
  onSave,
}: PostMeetingDialogProps) {
  const [rawNotes, setRawNotes] = useState("");
  const [parsed, setParsed] = useState<ParsedMeetingNotes | null>(null);
  const [editableNotes, setEditableNotes] = useState("");
  const [editableContact, setEditableContact] = useState("");
  const [applyPipelineChange, setApplyPipelineChange] = useState(true);
  const [selectedFollowUps, setSelectedFollowUps] = useState<Set<number>>(new Set());

  const contacts = useMemo(() => getAllContacts(company), [company]);
  const currentStage = pipelineState[company.id]?.stage || "researched";

  const handleProcess = () => {
    if (!rawNotes.trim()) return;
    const result = parseMeetingNotes(rawNotes, company);
    setParsed(result);

    // Pre-fill editable fields
    setEditableNotes(result.summary);
    setEditableContact(
      result.mentionedPeople[0]?.name || contacts[0]?.name || ""
    );

    // Select all follow-up items by default
    setSelectedFollowUps(new Set(result.followUpItems.map((_, i) => i)));
    setApplyPipelineChange(!!result.suggestedPipelineStage);
  };

  const handleSaveAll = () => {
    if (!parsed) return;

    // Build the engagement entry
    const entry: EngagementEntry = {
      id: crypto.randomUUID(),
      companyId: company.id,
      contactName: editableContact,
      channel: "meeting",
      action: "completed",
      timestamp: new Date().toISOString(),
      notes: editableNotes,
      source: "manual",
      metadata: {
        meetingNotes: rawNotes,
        sentiment: parsed.sentiment,
        actionItems: parsed.actionItems,
        keyTakeaways: parsed.keyTakeaways,
      },
    };

    // Primary follow-up: first selected action item
    const selectedItems = parsed.followUpItems.filter((_, i) =>
      selectedFollowUps.has(i)
    );
    const primaryFollowUp =
      selectedItems.length > 0
        ? {
            dueDate: getFutureDate(selectedItems[0].dueInDays),
            notes: selectedItems[0].text,
          }
        : undefined;

    // Sentiment / pipeline data
    const sentimentData: SentimentData | undefined =
      applyPipelineChange && parsed.suggestedPipelineStage
        ? {
            sentiment:
              parsed.sentiment === "positive"
                ? "interested"
                : parsed.sentiment === "negative"
                ? "objection"
                : "neutral",
            pipelineStage: parsed.suggestedPipelineStage,
          }
        : undefined;

    // Additional follow-ups (beyond the primary one)
    const additionalFollowUps = selectedItems.slice(1).map((item) => ({
      contactName: editableContact,
      dueDate: getFutureDate(item.dueInDays),
      notes: item.text,
    }));

    onSave(
      entry,
      primaryFollowUp,
      sentimentData,
      additionalFollowUps.length > 0 ? additionalFollowUps : undefined
    );

    // Reset and close
    resetState();
    onClose();
  };

  const resetState = () => {
    setRawNotes("");
    setParsed(null);
    setEditableNotes("");
    setEditableContact("");
    setApplyPipelineChange(true);
    setSelectedFollowUps(new Set());
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleBack = () => {
    setParsed(null);
  };

  const toggleFollowUp = (index: number) => {
    setSelectedFollowUps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const stageLabel = (stage: PipelineStage) =>
    PIPELINE_STAGES.find((s) => s.id === stage)?.label || stage;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {parsed && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0"
                onClick={handleBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-base flex items-center gap-2">
              <Notebook className="h-4 w-4" />
              Post-Meeting Notes: {company.name}
            </DialogTitle>
          </div>
        </DialogHeader>

        {!parsed ? (
          /* --- INPUT VIEW --- */
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Meeting Date
              </Label>
              <Input
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-auto mt-1.5 bg-secondary/30 rounded-lg"
                disabled
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Paste your meeting notes
              </Label>
              <Textarea
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder={`Paste your raw meeting notes here...\n\nExample:\nMet with John Smith today. He was excited about our underwriting product.\n- Send proposal by Friday\n- Schedule demo with their CTO next week\n- They want to see pricing for 500+ applications/month\nOverall very positive meeting. They're currently using a competitor but open to switching.`}
                className="w-full h-48 mt-1.5 bg-secondary/30 rounded-lg resize-y text-sm"
              />
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleProcess} disabled={!rawNotes.trim()}>
                <ArrowRight className="h-4 w-4 mr-1.5" />
                Process Notes
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* --- CONFIRMATION VIEW --- */
          <div className="space-y-4 py-2">
            {/* Sentiment Badge */}
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sentiment
              </Label>
              {(() => {
                const config = SENTIMENT_CONFIG[parsed.sentiment];
                const Icon = config.icon;
                return (
                  <Badge
                    variant="outline"
                    className={cn("text-xs", config.className)}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                );
              })()}
            </div>

            {/* People Mentioned */}
            {parsed.mentionedPeople.length > 0 && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  People Mentioned
                </Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {parsed.mentionedPeople.map((p) => (
                    <Badge
                      key={p.name}
                      variant="outline"
                      className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30"
                    >
                      {p.name}
                      {p.title && (
                        <span className="text-muted-foreground ml-1">
                          ({p.title})
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Key Takeaways */}
            {parsed.keyTakeaways.length > 0 && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" />
                  Key Takeaways
                </Label>
                <ul className="mt-1.5 space-y-1">
                  {parsed.keyTakeaways.map((t, i) => (
                    <li
                      key={i}
                      className="text-sm text-foreground/80 flex items-start gap-2"
                    >
                      <span className="text-muted-foreground mt-1 shrink-0">
                        &bull;
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items / Follow-ups */}
            {parsed.followUpItems.length > 0 && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ListChecks className="h-3 w-3" />
                  Action Items & Follow-ups
                </Label>
                <div className="mt-1.5 space-y-1.5">
                  {parsed.followUpItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => toggleFollowUp(i)}
                      className={cn(
                        "w-full flex items-start gap-2 p-2 rounded-lg text-left text-sm transition-colors",
                        selectedFollowUps.has(i)
                          ? "bg-brand/10 border border-brand/20"
                          : "bg-secondary/30 border border-transparent opacity-60"
                      )}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 mt-0.5 rounded border shrink-0 flex items-center justify-center",
                          selectedFollowUps.has(i)
                            ? "bg-brand border-brand"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selectedFollowUps.has(i) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-foreground/90">{item.text}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Due in {item.dueInDays === 0 ? "today" : `${item.dueInDays}d`}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Pipeline Stage Suggestion */}
            {parsed.suggestedPipelineStage && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" />
                  Pipeline Stage Change
                </Label>
                <button
                  onClick={() => setApplyPipelineChange(!applyPipelineChange)}
                  className={cn(
                    "w-full mt-1.5 flex items-center gap-3 p-3 rounded-lg text-sm transition-colors",
                    applyPipelineChange
                      ? "bg-purple-500/10 border border-purple-500/20"
                      : "bg-secondary/30 border border-transparent opacity-60"
                  )}
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded border shrink-0 flex items-center justify-center",
                      applyPipelineChange
                        ? "bg-purple-500 border-purple-500"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {applyPipelineChange && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Badge
                      variant="outline"
                      className="text-xs bg-muted/50 text-muted-foreground"
                    >
                      {stageLabel(currentStage)}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge
                      variant="outline"
                      className="text-xs bg-purple-500/15 text-purple-400 border-purple-500/30"
                    >
                      {stageLabel(parsed.suggestedPipelineStage)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    (keyword: &quot;{parsed.pipelineKeyword}&quot;)
                  </span>
                </button>
              </div>
            )}

            <Separator />

            {/* Editable Engagement Entry */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Pencil className="h-3 w-3" />
                Engagement Entry (editable)
              </Label>
              <div className="mt-1.5 space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Contact
                  </Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {contacts.map((c) => (
                      <Button
                        key={c.name}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "px-3 py-1.5 h-auto rounded-lg text-xs font-medium",
                          editableContact === c.name
                            ? "bg-brand/20 text-brand border-brand/30"
                            : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50"
                        )}
                        onClick={() => setEditableContact(c.name)}
                      >
                        {c.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Summary
                  </Label>
                  <Textarea
                    value={editableNotes}
                    onChange={(e) => setEditableNotes(e.target.value)}
                    className="w-full h-20 mt-1 bg-secondary/30 rounded-lg resize-y text-sm"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSaveAll}>
                <Check className="h-4 w-4 mr-1.5" />
                Save All
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Helpers ---

function getFutureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
