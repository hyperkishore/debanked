"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Bug, Lightbulb, HelpCircle, Send, Loader2 } from "lucide-react";
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
    const success = await syncToSheets("feedback", {
      section,
      feedbackType,
      notes: notes.trim(),
      page: typeof window !== "undefined" ? window.location.pathname : "",
      companyName: companyName || "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    });

    setSending(false);

    if (success) {
      toast.success("Feedback sent!");
      setNotes("");
      setOpen(false);
    } else {
      toast.error("Sync not configured. Go to Settings → Google Sheets to set up.");
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setSection(currentTab || "General / Other");
          setOpen(true);
        }}
        className="fixed bottom-20 right-4 z-40 w-10 h-10 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary transition-colors"
        title="Send feedback"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5" />
              Send Feedback
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Section picker */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Section</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Type picker */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
              <div className="flex gap-2">
                {FEEDBACK_TYPES.map((ft) => {
                  const Icon = ft.icon;
                  return (
                    <button
                      key={ft.id}
                      onClick={() => setFeedbackType(ft.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md border text-sm transition-colors ${
                        feedbackType === ft.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-input bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${feedbackType === ft.id ? ft.color : ""}`} />
                      {ft.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What happened? What would be better?"
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Context info */}
            {companyName && (
              <p className="text-[10px] text-muted-foreground">
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
