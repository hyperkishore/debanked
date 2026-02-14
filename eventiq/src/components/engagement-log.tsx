"use client";

import { useState, useMemo } from "react";
import { Company, EngagementChannel, EngagementEntry } from "@/lib/types";
import { CHANNELS, getAllContacts, getChannelConfig } from "@/lib/engagement-helpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Mail,
  Linkedin,
  MessageCircle,
  Phone,
  Calendar,
  StickyNote,
  ExternalLink,
} from "lucide-react";

interface EngagementLogProps {
  open: boolean;
  company: Company;
  onClose: () => void;
  onSave: (entry: EngagementEntry) => void;
}

const channelIcons: Record<EngagementChannel, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  linkedin: Linkedin,
  imessage: MessageCircle,
  call: Phone,
  meeting: Calendar,
  note: StickyNote,
};

export function EngagementLog({ open, company, onClose, onSave }: EngagementLogProps) {
  const [selectedChannel, setSelectedChannel] = useState<EngagementChannel>("email");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedContact, setSelectedContact] = useState("");
  const [notes, setNotes] = useState("");

  const contacts = useMemo(() => getAllContacts(company), [company]);
  const channelConfig = getChannelConfig(selectedChannel);

  // Pre-select first contact
  const effectiveContact = selectedContact || (contacts[0]?.name ?? "");

  // Find selected contact's LinkedIn
  const contactLinkedIn = contacts.find((c) => c.name === effectiveContact)?.linkedIn;

  const handleChannelChange = (channel: EngagementChannel) => {
    setSelectedChannel(channel);
    setSelectedAction(""); // reset action when channel changes
  };

  const handleSave = () => {
    const entry: EngagementEntry = {
      id: crypto.randomUUID(),
      companyId: company.id,
      contactName: effectiveContact,
      channel: selectedChannel,
      action: selectedAction || channelConfig.actions[0]?.value || "",
      timestamp: new Date().toISOString(),
      notes,
      source: "manual",
    };
    onSave(entry);
    // Reset
    setSelectedChannel("email");
    setSelectedAction("");
    setSelectedContact("");
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Log Engagement: {company.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Channel picker */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Channel
            </label>
            <div className="flex gap-1.5 mt-1.5">
              {CHANNELS.map((ch) => {
                const Icon = channelIcons[ch.id];
                return (
                  <button
                    key={ch.id}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-[10px] font-medium transition-all",
                      selectedChannel === ch.id
                        ? cn(ch.colorClass, "border-current/30 ring-1 ring-current/20")
                        : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50"
                    )}
                    onClick={() => handleChannelChange(ch.id)}
                  >
                    <Icon className="h-4 w-4" />
                    {ch.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact picker */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Contact
            </label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {contacts.map((c) => (
                <button
                  key={c.name}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    (effectiveContact === c.name)
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50"
                  )}
                  onClick={() => setSelectedContact(c.name)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Action picker */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Action
            </label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {channelConfig.actions.map((a) => (
                <button
                  key={a.value}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    (selectedAction === a.value || (!selectedAction && a.value === channelConfig.actions[0]?.value))
                      ? cn(channelConfig.colorClass, "border-current/30")
                      : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50"
                  )}
                  onClick={() => setSelectedAction(a.value)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional details..."
              className="w-full h-16 mt-1.5 bg-secondary/30 border border-border rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Quick links */}
          {(contactLinkedIn || selectedChannel === "email") && (
            <div className="flex gap-2">
              {contactLinkedIn && (
                <a
                  href={contactLinkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-400/10 text-sky-400 text-xs font-medium hover:bg-sky-400/20 transition-colors"
                >
                  <Linkedin className="h-3 w-3" />
                  Open LinkedIn
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Log</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
