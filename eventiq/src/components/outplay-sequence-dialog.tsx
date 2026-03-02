"use client";

import { Company, Leader } from "@/lib/types";
import { SequenceType, autoSelectSequence } from "@/lib/sequence-helpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Check, Send, AlertCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface OutplaySequence {
  id: string;
  name: string;
  status: string;
  prospectsCount: number;
}

interface OutplaySequenceDialogProps {
  company: Company;
  leader: Leader;
  open: boolean;
  onClose: () => void;
  suggestedSequence?: SequenceType;
}

export function OutplaySequenceDialog({
  company,
  leader,
  open,
  onClose,
  suggestedSequence,
}: OutplaySequenceDialogProps) {
  const [sequences, setSequences] = useState<OutplaySequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSequences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/outplay/add-to-sequence");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSequences(data.sequences || []);

      // Pre-select based on suggested sequence name match
      if (suggestedSequence && data.sequences?.length > 0) {
        const nameMatch = data.sequences.find((s: OutplaySequence) =>
          s.name.toLowerCase().includes(suggestedSequence.replace("-", " "))
        );
        if (nameMatch) setSelectedId(nameMatch.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load sequences";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [suggestedSequence]);

  useEffect(() => {
    if (open) {
      fetchSequences();
    }
  }, [open, fetchSequences]);

  const handleSubmit = async () => {
    if (!selectedId || !leader.email) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/outplay/add-to-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: leader.email,
          name: leader.n,
          title: leader.t,
          companyName: company.name,
          sequenceId: selectedId,
          talkingPoints: (company.tp || []).join(" | "),
          icebreaker: company.ice || "",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to add prospect");
      }

      toast.success(`Added ${leader.n} to Outplay sequence`);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add prospect";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSequence = sequences.find((s) => s.id === selectedId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Outplay Sequence</DialogTitle>
          <DialogDescription>
            Add {leader.n} ({leader.email}) to an email sequence
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading sequences...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && sequences.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No active sequences found in Outplay
          </p>
        )}

        {!loading && !error && sequences.length > 0 && (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {sequences.map((seq) => (
              <button
                key={seq.id}
                onClick={() => setSelectedId(seq.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-colors",
                  selectedId === seq.id
                    ? "border-brand bg-brand/10"
                    : "border-border hover:border-border/80 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{seq.name}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {seq.prospectsCount} prospects
                    </Badge>
                    {selectedId === seq.id && (
                      <Check className="h-3.5 w-3.5 text-brand" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedId || submitting || !leader.email}
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                Adding...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1" />
                Add to {selectedSequence?.name || "Sequence"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
