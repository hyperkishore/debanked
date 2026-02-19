"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface ChecklistTabProps {
  checkState: Record<string, boolean>;
  onToggleCheck: (key: string) => void;
  quickNotes: string;
  onQuickNotesChange: (notes: string) => void;
  allNotes: string;
}

const checklistItems = [
  { key: "chk1", label: "Collect business cards / scan LinkedIn QR codes" },
  { key: "chk2", label: "Note key follow-ups for each conversation" },
  { key: "chk3", label: 'Send same-day "great meeting you" emails to top 5' },
  { key: "chk4", label: "Schedule demo calls for interested prospects within 48h" },
  { key: "chk5", label: "Debrief with team on strongest-interest companies" },
  { key: "chk6", label: "Update CRM with all new contacts & conversation notes" },
];

export function ChecklistTab({
  checkState,
  onToggleCheck,
  quickNotes,
  onQuickNotesChange,
  allNotes,
}: ChecklistTabProps) {
  const completedCount = checklistItems.filter((item) => checkState[item.key]).length;

  const handleExport = () => {
    navigator.clipboard.writeText(allNotes).then(
      () => toast.success("Notes copied to clipboard!"),
      () => toast.error("Failed to copy notes")
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* End-of-Day Checklist */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              End-of-Day Checklist
            </h3>
            <span className="text-xs text-muted-foreground">
              {completedCount}/{checklistItems.length}
            </span>
          </div>
          <div className="space-y-1">
            {checklistItems.map((item) => (
              <Button
                key={item.key}
                variant="ghost"
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left h-auto justify-start",
                  checkState[item.key]
                    ? "bg-brand/5 opacity-60"
                    : "bg-card hover:bg-secondary/30"
                )}
                onClick={() => onToggleCheck(item.key)}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all",
                    checkState[item.key]
                      ? "bg-brand border-brand"
                      : "border-border"
                  )}
                >
                  {checkState[item.key] && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span
                  className={cn(
                    "text-sm",
                    checkState[item.key] && "line-through"
                  )}
                >
                  {item.label}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Quick Notes */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quick Notes
          </h3>
          <Textarea
            value={quickNotes}
            onChange={(e) => onQuickNotesChange(e.target.value)}
            placeholder="Jot down notes during the event..."
            className="w-full h-32 bg-card resize-y"
          />
        </div>

        {/* Export */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Export
          </h3>
          <Button onClick={handleExport} variant="outline" className="w-full">
            <Copy className="h-4 w-4 mr-2" />
            Copy All Notes to Clipboard
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
