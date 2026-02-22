"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Sparkles, Copy, ChevronDown, RefreshCw, Mail, Phone, Linkedin, Calendar } from "lucide-react";
import { toast } from "sonner";
import type { BriefingData } from "@/lib/ai-briefing";

interface AIBriefingCardProps {
  companyId: number;
}

const actionIcons: Record<string, typeof Mail> = {
  email: Mail,
  call: Phone,
  linkedin: Linkedin,
  meeting: Calendar,
};

export function AIBriefingCard({ companyId }: AIBriefingCardProps) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [cached, setCached] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/briefing/company/${companyId}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to generate briefing");
        return;
      }

      const data = await res.json();
      setBriefing(data.briefing);
      setCached(data.cached);
      setOpen(true);
    } catch (err) {
      toast.error("Failed to generate briefing");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }, []);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border rounded-lg bg-card/50">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <span className="text-sm font-medium">AI Briefing</span>
              {briefing && (
                <Badge variant="outline" className="text-xs">
                  Score: {briefing.priorityScore}/10
                </Badge>
              )}
              {cached && (
                <span className="text-xs text-muted-foreground">cached</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!briefing && !loading && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    generate();
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  Generate
                </Button>
              )}
              {briefing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    generate();
                  }}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 border-t border-border/50 pt-2">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : briefing ? (
              <div className="space-y-3 text-sm">
                {/* Trigger */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Why call today?
                  </div>
                  <p className="text-foreground">{briefing.trigger}</p>
                </div>

                {/* Opener */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Opening line
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => copyToClipboard(briefing.opener)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-foreground italic">
                    &ldquo;{briefing.opener}&rdquo;
                  </p>
                </div>

                {/* Talking points */}
                {briefing.talkingPoints.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Talking points
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() =>
                          copyToClipboard(
                            briefing.talkingPoints
                              .map((tp, i) => `${i + 1}. ${tp}`)
                              .join("\n")
                          )
                        }
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <ul className="space-y-1">
                      {briefing.talkingPoints.map((tp, i) => (
                        <li
                          key={i}
                          className="text-foreground pl-3 border-l-2 border-brand/30"
                        >
                          {tp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Contact + Action */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Contact: </span>
                    <span className="font-medium">{briefing.contact.name}</span>
                    {briefing.contact.title && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({briefing.contact.title})
                      </span>
                    )}
                  </div>
                  {(() => {
                    const ActionIcon = actionIcons[briefing.recommendedAction] || Mail;
                    return (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <ActionIcon className="h-3 w-3" />
                        {briefing.recommendedAction}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click &ldquo;Generate&rdquo; to create an AI-powered briefing
                with outreach recommendations.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
