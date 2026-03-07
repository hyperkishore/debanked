"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Loader2,
  Copy,
  Send,
  Check,
  Mail,
  Linkedin,
} from "lucide-react";
import { toast } from "sonner";

interface OutreachDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signalType: string;
  headline: string;
  companyId: number;
  companyName: string;
  leaderName?: string;
}

interface OutreachResponse {
  subject: string;
  body: string;
  channel: "email" | "linkedin";
  leaderName: string;
  leaderEmail: string | null;
  leaderLinkedin: string | null;
}

export function OutreachDraftDialog({
  open,
  onOpenChange,
  signalType,
  headline,
  companyId,
  companyName,
  leaderName,
}: OutreachDraftDialogProps) {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<OutreachResponse | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const [channel, setChannel] = useState<"email" | "linkedin">("email");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function generateDraft(ch: "email" | "linkedin") {
    setLoading(true);
    setGenerated(false);
    try {
      const res = await fetch("/api/generate-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signalType,
          headline,
          companyId,
          companyName,
          leaderName,
          channel: ch,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        toast.error(err.error || "Failed to generate outreach");
        return;
      }
      const data: OutreachResponse = await res.json();
      setDraft(data);
      setEditedBody(data.body);
      setEditedSubject(data.subject);
      setChannel(data.channel);
      setGenerated(true);
    } catch {
      toast.error("Failed to generate outreach draft");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && !generated && !loading) {
      generateDraft(channel);
    }
    if (!nextOpen) {
      setDraft(null);
      setGenerated(false);
      setCopied(false);
    }
    onOpenChange(nextOpen);
  }

  function handleChannelChange(value: string) {
    if (value === "email" || value === "linkedin") {
      setChannel(value);
      generateDraft(value);
    }
  }

  async function handleCopy() {
    const text =
      channel === "email"
        ? `Subject: ${editedSubject}\n\n${editedBody}`
        : editedBody;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSend() {
    if (!draft?.leaderEmail) {
      toast.error("No email address found for this leader");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: draft.leaderEmail,
          subject: editedSubject,
          body: editedBody,
          companyId,
          contactName: draft.leaderName,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        toast.error(err.error || "Failed to send email");
        return;
      }
      toast.success(`Email sent to ${draft.leaderEmail}`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium flex items-center gap-2">
            Draft Outreach
            <Badge variant="outline" className="text-xs font-normal">
              {companyName}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Generating personalized message...
            </p>
          </div>
        ) : draft ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">To:</span>
                <span className="text-xs font-medium">{draft.leaderName}</span>
                {draft.leaderEmail && channel === "email" && (
                  <span className="text-xs text-muted-foreground">
                    ({draft.leaderEmail})
                  </span>
                )}
              </div>
              <ToggleGroup
                type="single"
                value={channel}
                onValueChange={handleChannelChange}
                size="sm"
              >
                <ToggleGroupItem value="email" className="h-7 px-2 text-xs gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </ToggleGroupItem>
                <ToggleGroupItem value="linkedin" className="h-7 px-2 text-xs gap-1">
                  <Linkedin className="h-3 w-3" />
                  LinkedIn
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {channel === "email" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Subject
                </label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Message
              </label>
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={10}
                className="text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {editedBody.split(/\s+/).filter(Boolean).length} words
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              {channel === "email" && draft.leaderEmail && (
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={sending}
                  className="gap-1.5"
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Send
                </Button>
              )}
              {channel === "email" && !draft.leaderEmail && (
                <span className="text-xs text-muted-foreground">
                  No email on file — copy and send manually
                </span>
              )}
              {channel === "linkedin" && (
                <span className="text-xs text-muted-foreground">
                  Copy and paste into LinkedIn message
                </span>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
