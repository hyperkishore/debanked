"use client";

import { useState } from "react";
import { Rating, FollowUp, RatingData } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface RatingDialogProps {
  open: boolean;
  companyName: string;
  onClose: () => void;
  onSave: (data: RatingData) => void;
}

const ratingOptions: { value: Rating; label: string; color: string }[] = [
  { value: "hot", label: "Hot", color: "bg-[var(--sqo)]/20 text-[var(--sqo)] border-[var(--sqo)]/30 data-[active=true]:bg-[var(--sqo)]/30" },
  { value: "warm", label: "Warm", color: "bg-[var(--client)]/20 text-[var(--client)] border-[var(--client)]/30 data-[active=true]:bg-[var(--client)]/30" },
  { value: "cold", label: "Cold", color: "bg-primary/20 text-primary border-primary/30 data-[active=true]:bg-primary/30" },
];

const followUpOptions: { value: FollowUp; label: string }[] = [
  { value: "demo", label: "Schedule Demo" },
  { value: "email", label: "Send Email" },
  { value: "intro", label: "Got Intro" },
  { value: "none", label: "No Action" },
];

export function RatingDialog({ open, companyName, onClose, onSave }: RatingDialogProps) {
  const [rating, setRating] = useState<Rating>("");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [careAbout, setCareAbout] = useState("");
  const [promised, setPromised] = useState("");
  const [personal, setPersonal] = useState("");

  const toggleFollowUp = (fu: FollowUp) => {
    setFollowUps((prev) =>
      prev.includes(fu) ? prev.filter((f) => f !== fu) : [...prev, fu]
    );
  };

  const handleSave = () => {
    onSave({ rating, followUps, careAbout, promised, personal });
    setRating("");
    setFollowUps([]);
    setCareAbout("");
    setPromised("");
    setPersonal("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Meeting: {companyName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Rating */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Temperature
            </label>
            <div className="flex gap-2 mt-1.5">
              {ratingOptions.map((opt) => (
                <button
                  key={opt.value}
                  data-active={rating === opt.value}
                  className={cn(
                    "flex-1 py-2 rounded-lg border text-sm font-medium transition-all",
                    opt.color,
                    rating === opt.value && "ring-1 ring-offset-1 ring-offset-background"
                  )}
                  onClick={() => setRating(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Follow-ups */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Follow-up Actions
            </label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {followUpOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    followUps.includes(opt.value)
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"
                  )}
                  onClick={() => toggleFollowUp(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Capture fields */}
          <div className="space-y-2">
            <Input
              placeholder="What do they care about?"
              value={careAbout}
              onChange={(e) => setCareAbout(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="What did you promise?"
              value={promised}
              onChange={(e) => setPromised(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Personal detail to remember"
              value={personal}
              onChange={(e) => setPersonal(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Skip
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
