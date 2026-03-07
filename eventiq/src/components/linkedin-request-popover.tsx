"use client";

import { useState, useMemo } from "react";
import { Leader, Company } from "@/lib/types";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";
import { Linkedin, ExternalLink, UserPlus } from "lucide-react";

const LINKEDIN_CHAR_LIMIT = 300;

function generateConnectionRequest(leader: Leader, company: Company): string {
  const firstName = leader.n.split(" ")[0];
  const category = company.category || "funder";

  // Determine value prop based on company category
  const valueProps: Record<string, string> = {
    funder: "underwriting automation",
    iso: "deal processing speed",
    marketplace: "lending platform operations",
    bank: "loan decisioning",
    technology: "lending infrastructure",
    competitor: "industry trends",
    service_provider: "lending ecosystem insights",
  };
  const value = valueProps[category] || "lending technology";

  // Try personal hook first, then professional
  const personalHook = leader.personal
    ? leader.personal.split(/[.!?]/)[0].trim()
    : null;

  const starredHook = leader.hooks?.find((h) => h.startsWith("*"))?.slice(1).trim();
  const firstHook = leader.hooks?.[0]?.replace(/^\*/, "").trim();
  const bestHook = starredHook || firstHook;

  let draft: string;

  if (personalHook && personalHook.length < 120) {
    // Personal hook path
    draft = `Hi ${firstName}, ${personalHook.charAt(0).toLowerCase() + personalHook.slice(1)} really resonated with me. I work with ${company.category === "funder" ? "lenders" : company.category === "iso" ? "ISOs" : "companies"} like ${company.name} on ${value}. Would love to connect.`;
  } else if (bestHook) {
    // Professional hook path
    draft = `Hi ${firstName}, ${bestHook.toLowerCase()} caught my eye. I'm at HyperVerge, working with companies in the space on ${value}. Would love to connect and exchange ideas.`;
  } else {
    // Fallback
    draft = `Hi ${firstName}, I've been following ${company.name}'s work in the space. I'm with HyperVerge, helping ${company.category === "funder" ? "lenders" : "companies"} streamline ${value}. Would love to connect.`;
  }

  // Trim to fit within 300 chars
  if (draft.length > LINKEDIN_CHAR_LIMIT) {
    draft = draft.slice(0, LINKEDIN_CHAR_LIMIT - 3).replace(/\s+\S*$/, "...");
  }

  return draft;
}

interface LinkedInRequestPopoverProps {
  leader: Leader;
  company: Company;
}

export function LinkedInRequestPopover({ leader, company }: LinkedInRequestPopoverProps) {
  const [open, setOpen] = useState(false);
  const initialDraft = useMemo(
    () => generateConnectionRequest(leader, company),
    [leader, company]
  );
  const [text, setText] = useState(initialDraft);

  // Reset text when popover opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setText(generateConnectionRequest(leader, company));
    }
    setOpen(nextOpen);
  };

  const charCount = text.length;
  const isOverLimit = charCount > LINKEDIN_CHAR_LIMIT;

  const linkedInUrl =
    leader.li ||
    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(leader.n + " " + company.name)}`;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center text-xs h-auto p-1 rounded-md transition-colors text-sky-400/70 hover:bg-sky-400/10 hover:text-sky-400"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Draft LinkedIn connection request</TooltipContent>
      </Tooltip>
      <PopoverContent
        className="w-80 p-3"
        align="end"
        side="bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Connection Request
            </span>
            <span
              className={cn(
                "text-xs tabular-nums",
                isOverLimit ? "text-red-400 font-semibold" : "text-muted-foreground/60"
              )}
            >
              {charCount}/{LINKEDIN_CHAR_LIMIT}
            </span>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className={cn(
              "text-xs resize-none leading-relaxed",
              isOverLimit && "border-red-400/50 focus-visible:ring-red-400/30"
            )}
          />
          {isOverLimit && (
            <p className="text-xs text-red-400">
              Over limit by {charCount - LINKEDIN_CHAR_LIMIT} chars
            </p>
          )}
          <div className="flex items-center gap-2">
            <CopyButton text={text} variant="button" label="Copy" size="sm" />
            <a
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7"
              >
                <Linkedin className="h-3 w-3" />
                Open LinkedIn
                <ExternalLink className="h-2.5 w-2.5" />
              </Button>
            </a>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
