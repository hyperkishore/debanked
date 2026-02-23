"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquareHeart, Bug, Lightbulb, HelpCircle, Send, Loader2 } from "lucide-react";
import { syncToSheets } from "@/lib/sheets-sync";
import { toast } from "sonner";

const SECTIONS = [
  "Companies List",
  "Company Detail",
  "Dashboard",
  "Pipeline",
  "Schedule",
  "Pitch",
  "Checklist",
  "Search",
  "Morning Briefing",
  "Sequences",
  "Battlecards",
  "Pre-Call Briefing",
  "General / Other",
] as const;

type FeedbackType = "bug" | "suggestion" | "question";

const FEEDBACK_TYPES: { id: FeedbackType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: "bug", label: "Bug", icon: Bug, color: "text-red-400" },
  { id: "suggestion", label: "Suggestion", icon: Lightbulb, color: "text-amber-400" },
  { id: "question", label: "Question", icon: HelpCircle, color: "text-blue-400" },
];

interface FeedbackWidgetProps {
  companyName?: string;
  currentTab?: string;
}

export function FeedbackWidget({ companyName, currentTab }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string>(currentTab || "General / Other");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("suggestion");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      toast.error("Please add a description");
      return;
    }

    setSending(true);

    const payload = {
      section,
      feedbackType,
      notes: notes.trim(),
      page: typeof window !== "undefined" ? window.location.pathname : "",
      companyName: companyName || "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    };

    // Primary: save to Supabase via API
    let apiOk = false;
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      apiOk = res.ok;
    } catch {}

    // Secondary: sync to Google Sheets (non-blocking)
    syncToSheets("feedback", payload).catch(() => {});

    setSending(false);

    if (apiOk) {
      toast.success("Feedback sent!");
      setNotes("");
      setOpen(false);
    } else {
      // Fallback: if API failed but Sheets might work
      toast.error("Failed to save feedback. Please try again.");
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              setSection(currentTab || "General / Other");
              setOpen(true);
            }}
            className="fixed bottom-20 right-4 z-40 h-10 w-10 rounded-full shadow-lg bg-card border-border hover:bg-brand/20 hover:border-brand/30"
          >
            <MessageSquareHeart className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Send feedback</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareHeart className="h-5 w-5" />
              Send Feedback
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Section picker */}
            <div className="space-y-1.5">
              <Label>Section</Label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type picker */}
            <div className="space-y-1.5">
              <Label>Type</Label>
              <ToggleGroup
                type="single"
                value={feedbackType}
                onValueChange={(v) => v && setFeedbackType(v as FeedbackType)}
                className="justify-start"
              >
                {FEEDBACK_TYPES.map((ft) => {
                  const Icon = ft.icon;
                  return (
                    <ToggleGroupItem key={ft.id} value={ft.id} className="flex-1 gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${feedbackType === ft.id ? ft.color : ""}`} />
                      {ft.label}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What happened? What would be better?"
                rows={4}
              />
            </div>

            {/* Context info */}
            {companyName && (
              <p className="text-xs text-muted-foreground">
                Context: viewing {companyName}
              </p>
            )}

            {/* Submit */}
            <Button onClick={handleSubmit} disabled={sending || !notes.trim()} className="w-full">
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {sending ? "Sending..." : "Send Feedback"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
