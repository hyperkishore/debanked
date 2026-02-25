"use client";

import { Company, CompanyCategory, Leader, RatingData, EngagementEntry, EngagementChannel, OutreachHistory } from "@/lib/types";
import { isResearched, generateOutreachMessage, generateQuickLinks } from "@/lib/types";
import { generateMessageVariants, MessageVariant } from "@/lib/message-variants";
import { generateLinkedInVariants, LinkedInVariant } from "@/lib/linkedin-message";
import { PipelineRecord, PipelineStage, PIPELINE_STAGES } from "@/lib/pipeline-helpers";
import { detectPersona, getPersonaConfig } from "@/lib/persona-helpers";
import { generateBattlecards, getCategoryStyle } from "@/lib/battlecard-helpers";
import { computeReadinessScore, getReadinessLabel, getReadinessColor, getReadinessBgColor } from "@/lib/readiness-score";
import { generateTriggerCards, TriggerCard } from "@/lib/trigger-card-helpers";
import { buildFeedItems, FeedItem } from "@/lib/feed-helpers";
import { detectCompetitors, CompetitiveContext } from "@/lib/competitive-intel-helpers";
import { SequenceProgress } from "@/lib/sequence-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { EngagementTimeline } from "@/components/engagement-timeline";
import { CopyButton } from "@/components/copy-button";
import { PreCallBriefingDialog } from "@/components/pre-call-briefing";
import { SequencePanel } from "@/components/sequence-panel";
import { AIBriefingCard } from "@/components/ai-briefing-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ExternalLink,
  Linkedin,
  Newspaper,
  MessageSquare,
  Target,
  Users,
  Lightbulb,
  Info,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
  MapPin,
  Globe,
  Building2,
  Copy,
  Link,
  Search,
  Mail,
  Shield,
  BookOpen,
  Tag,
  X,
  Plus,
  Phone,
  FileText,
  Send,
  ClipboardCopy,
  Zap,
  Swords,
  BarChart3,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";

interface CompanyDetailProps {
  company: Company;
  isMet: boolean;
  rating: RatingData | null;
  notes: string;
  engagements: EngagementEntry[];
  pipelineState: Record<string, PipelineRecord>;
  sequenceProgress?: SequenceProgress;
  tags?: string[];
  onToggleMet: (id: number) => void;
  onSaveNotes: (id: number, notes: string) => void;
  onClose?: () => void;
  onOpenRating: (id: number) => void;
  onAddEngagement: () => void;
  onDeleteEngagement: (id: string) => void;
  onQuickLog?: (contactName: string, channel: EngagementChannel, action: string) => void;
  onSequenceStep?: (companyId: number, stepId: string, channel: EngagementChannel, action: string) => void;
  onAddTag?: (companyId: number, tag: string) => void;
  onRemoveTag?: (companyId: number, tag: string) => void;
  onPipelineStageChange?: (companyId: number, stage: PipelineStage) => void;
}

const TAG_SUGGESTIONS = [
  "hot-lead", "partnership", "competitor", "decision-maker-met",
  "needs-followup", "referral-source", "mca", "sba",
  "equipment-finance", "revenue-based", "high-volume",
  "early-stage", "enterprise",
];

const typeBadgeStyles: Record<string, string> = {
  SQO: "bg-[var(--sqo)]/10 text-[var(--sqo)] border-[var(--sqo)]/30",
  Client: "bg-[var(--client)]/10 text-[var(--client)] border-[var(--client)]/30",
  ICP: "bg-[var(--icp)]/10 text-[var(--icp)] border-[var(--icp)]/30",
  TAM: "bg-[var(--tam)]/10 text-[var(--tam)] border-[var(--tam)]/30",
};

const categoryBadgeStyles: Record<CompanyCategory, { label: string; className: string }> = {
  funder: { label: "Funder", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  broker: { label: "Broker", className: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  bank: { label: "Bank", className: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  technology: { label: "Technology", className: "bg-violet-500/10 text-violet-400 border-violet-500/30" },
  marketplace: { label: "Marketplace", className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
  service_provider: { label: "Service Provider", className: "bg-pink-500/10 text-pink-400 border-pink-500/30" },
};

const VARIANT_LABELS: Record<MessageVariant["style"], string> = {
  formal: "Formal",
  casual: "Casual",
  "news-hook": "News Hook",
};

const LINKEDIN_LABELS: Record<LinkedInVariant["style"], string> = {
  "connection-request": "Connection Request",
  inmail: "InMail",
};

export function CompanyDetail({
  company,
  isMet,
  rating,
  notes,
  engagements,
  pipelineState,
  sequenceProgress,
  tags = [],
  onToggleMet,
  onSaveNotes,
  onClose,
  onOpenRating,
  onAddEngagement,
  onDeleteEngagement,
  onQuickLog,
  onSequenceStep,
  onAddTag,
  onRemoveTag,
  onPipelineStageChange,
}: CompanyDetailProps) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [tagInput, setTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [expandedLeader, setExpandedLeader] = useState<{ name: string; panel: "email" | "linkedin" } | null>(null);
  const [activeVariant, setActiveVariant] = useState<MessageVariant["style"]>("casual");
  const [activeLinkedInVariant, setActiveLinkedInVariant] = useState<LinkedInVariant["style"]>("connection-request");
  const [briefingLeader, setBriefingLeader] = useState<Leader | null>(null);
  const [battlecardsOpen, setBattlecardsOpen] = useState(false);
  const researched = isResearched(company);
  const quickLinks = generateQuickLinks(company);

  // Battlecards
  const battlecards = useMemo(
    () => generateBattlecards(company, pipelineState),
    [company, pipelineState]
  );

  // Feed items for this company (used by readiness + trigger cards)
  const feedItems = useMemo(() => buildFeedItems([company]), [company]);

  // Readiness score
  const readiness = useMemo(
    () => computeReadinessScore(company, feedItems, engagements),
    [company, feedItems, engagements]
  );
  const readinessLabel = getReadinessLabel(readiness.total);

  // Trigger cards
  const triggerCards = useMemo(
    () => generateTriggerCards(company, feedItems),
    [company, feedItems]
  );

  // Competitive intel
  const competitiveContexts = useMemo(
    () => detectCompetitors(company),
    [company]
  );

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    onSaveNotes(company.id, value);
  };

  // All talking points as copyable text
  const allTalkingPoints = (company.tp || []).join("\n\n");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed Header */}
      <div className="bg-background border-b border-border p-4 pb-3 shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {onClose && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 md:hidden" onClick={onClose}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-lg font-bold truncate">{company.name}</h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className={cn("text-xs font-semibold", typeBadgeStyles[company.type] || "")}>
              {company.type}
            </Badge>
            {company.category && (
              <Badge variant="outline" className={cn("text-xs font-semibold", categoryBadgeStyles[company.category].className)}>
                {categoryBadgeStyles[company.category].label}
              </Badge>
            )}
            {company.clear && (
              <Badge variant="outline" className="text-xs font-semibold text-brand border-brand/30">
                CLEAR
              </Badge>
            )}
            {company.booth && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                BOOTH
              </Badge>
            )}
          </div>
        </div>

        {/* Readiness Score Breakdown — compact inline */}
        <ReadinessScoreBadge readiness={readiness} label={readinessLabel} />

        {/* Meta info row */}
        {(company.location || company.employees || company.website) && (
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            {company.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {company.location}
              </span>
            )}
            {company.employees !== undefined && company.employees > 0 && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {company.employees} employees
              </span>
            )}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-brand hover:underline"
              >
                <Globe className="h-3 w-3" /> Website
              </a>
            )}
            {company.linkedinUrl && (
              <a
                href={company.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-brand hover:underline"
              >
                <Linkedin className="h-3 w-3" /> LinkedIn
              </a>
            )}
          </div>
        )}

        {/* Enrichment status badges */}
        {company.leaders && company.leaders.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {(() => {
              const leaderWithVerifiedEmail = company.leaders!.find(l => l.email && (l.confidence ?? 0) >= 0.8);
              const leaderWithEmail = company.leaders!.find(l => l.email);
              const leaderWithPhone = company.leaders!.some(l => l.phone);
              return (
                <>
                  {leaderWithVerifiedEmail ? (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 bg-green-500/10 text-green-400 border-green-500/30">
                      <Check className="h-2.5 w-2.5 mr-0.5" />Email verified
                    </Badge>
                  ) : leaderWithEmail ? (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                      <Mail className="h-2.5 w-2.5 mr-0.5" />Email unverified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 bg-muted/50 text-muted-foreground border-border">
                      <Mail className="h-2.5 w-2.5 mr-0.5" />No email
                    </Badge>
                  )}
                  {leaderWithPhone && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 bg-green-500/10 text-green-400 border-green-500/30">
                      <Phone className="h-2.5 w-2.5 mr-0.5" />Phone
                    </Badge>
                  )}
                </>
              );
            })()}
            {(company.hubspotDeals || []).length > 0 ? (
              <a
                href={`https://app.hubspot.com/contacts/3800237/deal/${company.hubspotDeals![0].dealId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 bg-orange-500/10 text-orange-400 border-orange-500/30 cursor-pointer hover:bg-orange-500/20">
                  <ExternalLink className="h-2.5 w-2.5 mr-0.5" />HubSpot ({company.hubspotDeals!.length})
                </Badge>
              </a>
            ) : pipelineState[company.id]?.hubspot_deal_id ? (
              <a
                href={`https://app.hubspot.com/contacts/3800237/deal/${pipelineState[company.id].hubspot_deal_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 bg-orange-500/10 text-orange-400 border-orange-500/30 cursor-pointer hover:bg-orange-500/20">
                  <ExternalLink className="h-2.5 w-2.5 mr-0.5" />HubSpot
                </Badge>
              </a>
            ) : null}
          </div>
        )}

        {/* Custom tags */}
        {onAddTag && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-brand/10 text-brand"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
                {onRemoveTag && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:text-red-400 transition-colors ml-0.5"
                    onClick={() => onRemoveTag(company.id, tag)}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                )}
              </span>
            ))}
            {showTagInput ? (
              <div className="relative inline-flex items-center">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const t = tagInput.trim().toLowerCase();
                    if (t && !tags.includes(t)) {
                      onAddTag(company.id, t);
                    }
                    setTagInput("");
                    setShowTagInput(false);
                    setShowTagSuggestions(false);
                  }}
                  className="inline-flex items-center"
                >
                  <Input
                    autoFocus
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setShowTagSuggestions(true);
                    }}
                    onFocus={() => setShowTagSuggestions(true)}
                    onBlur={() => {
                      // Delay to allow click on suggestion
                      setTimeout(() => {
                        setShowTagInput(false);
                        setTagInput("");
                        setShowTagSuggestions(false);
                      }, 150);
                    }}
                    placeholder="tag..."
                    className="w-28 h-5 text-xs px-1 py-0.5"
                  />
                </form>
                {showTagSuggestions && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-48 max-h-40 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
                    {TAG_SUGGESTIONS
                      .filter((s) => !tags.includes(s) && s.includes(tagInput.toLowerCase()))
                      .map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="w-full text-left text-xs px-2 py-1 rounded hover:bg-brand/10 hover:text-brand transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onAddTag(company.id, suggestion);
                            setTagInput("");
                            setShowTagInput(false);
                            setShowTagSuggestions(false);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTagInput(true)}
                className="inline-flex items-center gap-0.5 text-xs h-5 px-1.5 py-0.5 rounded border-dashed text-muted-foreground hover:text-brand hover:border-brand/30 transition-colors"
              >
                <Plus className="h-2.5 w-2.5" /> tag
              </Button>
            )}
          </div>
        )}

        {/* Pipeline stage selector */}
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {PIPELINE_STAGES.filter(s => s.id !== "lost").map((stage) => {
            const currentStage = pipelineState[company.id]?.stage || "researched";
            const currentIdx = PIPELINE_STAGES.findIndex(s => s.id === currentStage);
            const stageIdx = PIPELINE_STAGES.findIndex(s => s.id === stage.id);
            const isActive = stage.id === currentStage;
            const isPast = stageIdx < currentIdx;
            return (
              <button
                key={stage.id}
                onClick={() => {
                  if (onPipelineStageChange) {
                    onPipelineStageChange(company.id, stage.id);
                  }
                  if (stage.id === "contacted" && !isMet) {
                    onToggleMet(company.id);
                    onOpenRating(company.id);
                  }
                }}
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full border transition-colors",
                  isActive
                    ? "border-brand bg-brand/15 text-brand font-medium"
                    : isPast
                    ? "border-brand/30 bg-brand/5 text-brand/60"
                    : "border-border text-muted-foreground hover:border-brand/30 hover:text-brand/60"
                )}
              >
                {isActive && <Check className="h-2.5 w-2.5 inline mr-0.5 -mt-px" />}
                {stage.label}
              </button>
            );
          })}
          {isMet && rating && rating.rating && (
            <Badge className={cn(
              "text-xs ml-1",
              rating.rating === "hot" && "bg-[var(--sqo)]/20 text-[var(--sqo)]",
              rating.rating === "warm" && "bg-[var(--client)]/20 text-[var(--client)]",
              rating.rating === "cold" && "bg-brand/20 text-brand",
            )}>
              {rating.rating.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Quick outreach actions */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {company.leaders?.[0]?.li && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs px-2 gap-1 text-muted-foreground hover:text-[#0077b5] hover:border-[#0077b5]/40"
              onClick={() => {
                window.open(company.leaders![0].li, "_blank");
                if (onQuickLog) {
                  onQuickLog(company.leaders![0].n, "linkedin", "sent_connection");
                }
              }}
            >
              <Linkedin className="h-3 w-3" />
              LinkedIn
            </Button>
          )}
          {(() => {
            const leaderWithEmail = company.leaders?.find(l => l.email);
            const leader = leaderWithEmail || company.leaders?.[0];
            const firstName = leader?.n.split(" ")[0] || "there";
            const recipient = leader?.email || "";
            const subject = `${company.name} + HyperVerge — Quick Question`;
            const body = company.ask
              || `Hi ${firstName},\n\n${company.ice || company.tp?.[0] || `I'd love to connect about how HyperVerge can help ${company.name}.`}\n\nBest,\n`;
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2 gap-1 text-muted-foreground hover:text-brand hover:border-brand/40"
                    onClick={() => {
                      const mailto = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      window.open(mailto);
                      if (onQuickLog && leader) {
                        onQuickLog(leader.n, "email", "sent_intro");
                      }
                    }}
                  >
                    <Mail className="h-3 w-3" />
                    Draft Email
                    {leader && <span className="text-muted-foreground/50 ml-0.5">({firstName})</span>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {recipient ? `Email ${leader?.n} (${recipient})` : "No email on file — add via Apollo enrichment"}
                </TooltipContent>
              </Tooltip>
            );
          })()}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs px-2 gap-1 text-muted-foreground hover:text-brand hover:border-brand/40"
                onClick={() => {
                  const leader = company.leaders?.find(l => l.email) || company.leaders?.[0];
                  const firstName = leader?.n.split(" ")[0] || "there";
                  const subject = `${company.name} + HyperVerge — Quick Question`;
                  const body = company.ask
                    || `Hi ${firstName},\n\n${company.ice || company.tp?.[0] || `I'd love to connect about how HyperVerge can help ${company.name}.`}\n\nBest,\n`;
                  const clipboardText = [
                    leader?.email ? `To: ${leader.email}` : "",
                    `Subject: ${subject}`,
                    "",
                    body,
                  ].filter(Boolean).join("\n");
                  navigator.clipboard.writeText(clipboardText);
                  toast.success("Email copied — paste into Outplay");
                }}
              >
                <Send className="h-3 w-3" />
                Outplay
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy email content for Outplay</TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs px-2 gap-1 text-muted-foreground hover:text-brand hover:border-brand/40"
            onClick={() => {
              const parts = [
                company.ice,
                ...(company.tp || []),
                company.ask,
              ].filter(Boolean);
              const text = parts.join("\n\n");
              navigator.clipboard.writeText(text);
              toast.success("Talking points copied");
            }}
          >
            <Copy className="h-3 w-3" />
            Copy Points
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs px-2 gap-1 text-muted-foreground hover:text-brand hover:border-brand/40"
            onClick={() => {
              const leader = company.leaders?.[0];
              const brief = [
                `COMPANY: ${company.name} (${company.type})`,
                leader ? `CONTACT: ${leader.n} — ${leader.t}` : "",
                leader ? `EMAIL: ${leader.email || "Not on file"}` : "",
                leader ? `LINKEDIN: ${leader.li || "Not on file"}` : "",
                leader?.phone ? `PHONE: ${leader.phone}` : "",
                "",
                company.ice ? `ICEBREAKER: ${company.ice}` : "",
                "",
                company.tp?.length ? `TALKING POINTS:\n${company.tp.map((tp, i) => `${i + 1}. ${tp}`).join("\n")}` : "",
                "",
                company.ask ? `ASK: ${company.ask}` : "",
                "",
                company.news?.[0] ? `RECENT NEWS: ${company.news[0].h} — ${company.news[0].s}` : "",
              ].filter(Boolean).join("\n");
              navigator.clipboard.writeText(brief);
              toast.success("Full outreach brief copied");
            }}
          >
            <FileText className="h-3 w-3" />
            Copy Brief
          </Button>
          {company.website && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs px-2 gap-1 text-muted-foreground hover:text-brand hover:border-brand/40"
              onClick={() => window.open(company.website!.startsWith("http") ? company.website : `https://${company.website}`, "_blank")}
            >
              <Globe className="h-3 w-3" />
              Website
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0">
      <ScrollArea className="h-full">
      <div className="p-4 space-y-5">

        {!researched && company.type === "TAM" ? (
          /* Unresearched TAM placeholder */
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Not yet researched</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Contacts, icebreakers, and talking points will be added when this company is researched.
              </p>
            </div>

            {/* Notes still available for unresearched companies */}
            <Section icon={MessageSquare} title="Your Notes">
              <Textarea
                value={localNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add notes about this company..."
                className="w-full h-24 bg-secondary/30 text-sm resize-y"
              />
            </Section>
          </div>
        ) : (
          /* Full researched content */
          <>
            {/* About */}
            <Section icon={Info} title="About">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-sm leading-relaxed text-muted-foreground">{company.desc}</p>
                  {company.notes && (
                    <p className="text-xs text-brand/80 mt-2 italic">{company.notes}</p>
                  )}
                </div>
                {company.desc && <CopyButton text={company.desc} />}
              </div>
            </Section>

            {/* HubSpot Deals */}
            {(company.hubspotDeals || []).length > 0 && (
              <Section icon={Building2} title={`HubSpot Deals (${company.hubspotDeals!.length})`}>
                <div className="space-y-2">
                  {company.hubspotDeals!.map((deal) => {
                    const isWon = (deal.stageLabel || "").toLowerCase().includes("closed won");
                    const isLost = (deal.stageLabel || "").toLowerCase().includes("closed lost");
                    const isActive = !isWon && !isLost;
                    return (
                      <a
                        key={deal.dealId}
                        href={`https://app.hubspot.com/contacts/3800237/deal/${deal.dealId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Card className={cn(
                          "p-2.5 shadow-none hover:border-orange-500/30 transition-colors group",
                          isWon && "border-green-500/20",
                          isLost && "border-muted-foreground/10 opacity-60",
                        )}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium truncate">{deal.dealName}</span>
                                <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs px-1.5 py-0 h-4",
                                    isActive && "bg-orange-500/10 text-orange-400 border-orange-500/30",
                                    isWon && "bg-green-500/10 text-green-400 border-green-500/30",
                                    isLost && "bg-muted/50 text-muted-foreground border-border",
                                  )}
                                >
                                  {deal.stageLabel}
                                </Badge>
                                {deal.product && (
                                  <span className="text-xs text-muted-foreground">{deal.product}</span>
                                )}
                                {deal.closeDate && (
                                  <span className="text-xs text-muted-foreground/60">
                                    Close: {new Date(deal.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </span>
                                )}
                              </div>
                            </div>
                            {deal.amount && deal.amount > 0 && (
                              <span className="text-sm font-semibold text-muted-foreground tabular-nums shrink-0">
                                ${deal.amount.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </Card>
                      </a>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Contacts with Persona Badges + Brief Me */}
            <Section icon={Users} title="Contacts">
              <div className="space-y-3">
                {(company.leaders || []).map((leader, i) => (
                  <LeaderCard
                    key={i}
                    leader={leader}
                    company={company}
                    expandedPanel={expandedLeader?.name === leader.n ? expandedLeader.panel : null}
                    onToggleExpand={(panel) =>
                      setExpandedLeader(
                        expandedLeader?.name === leader.n && expandedLeader.panel === panel
                          ? null
                          : { name: leader.n, panel }
                      )
                    }
                    activeVariant={activeVariant}
                    onVariantChange={setActiveVariant}
                    activeLinkedInVariant={activeLinkedInVariant}
                    onLinkedInVariantChange={setActiveLinkedInVariant}
                    onQuickLog={onQuickLog}
                    onBriefMe={() => setBriefingLeader(leader)}
                  />
                ))}
                {(!company.leaders || company.leaders.length === 0) &&
                  company.contacts.map((c, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium">{c.n}</span>
                      <span className="text-muted-foreground ml-2">{c.t}</span>
                    </div>
                  ))}
              </div>
            </Section>

            {/* AI Briefing */}
            <AIBriefingCard companyId={company.id} />

            {/* Trigger Cards */}
            {triggerCards.length > 0 && (
              <TriggerCardsSection triggerCards={triggerCards} />
            )}

            {/* Icebreakers */}
            <Section icon={Lightbulb} title="Icebreakers">
              <div className="space-y-2">
                {company.icebreakers && company.icebreakers.length > 0 ? (
                  company.icebreakers.map((ice, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex-1 text-sm leading-relaxed text-foreground/90 bg-secondary/30 rounded-lg p-3">
                        {ice}
                      </div>
                      <CopyButton text={ice} />
                    </div>
                  ))
                ) : company.ice ? (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 text-sm leading-relaxed text-foreground/90 bg-secondary/30 rounded-lg p-3">
                      {company.ice}
                    </div>
                    <CopyButton text={company.ice} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No icebreakers available</p>
                )}
              </div>
            </Section>

            {/* News */}
            {company.news && company.news.length > 0 && (
              <Section icon={Newspaper} title="Recent News">
                <div className="space-y-3">
                  {company.news.map((item, i) => {
                    const newsUrl = item.u || `https://www.google.com/search?q=${encodeURIComponent(item.h + " " + company.name)}`;
                    return (
                      <a
                        key={i}
                        href={newsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Card className="bg-secondary/30 p-3 gap-2 shadow-none border-0 hover:bg-secondary/50 transition-colors cursor-pointer">
                          <div className="flex items-start gap-2">
                            <h4 className="text-sm font-medium leading-snug text-brand hover:underline flex-1">{item.h}</h4>
                            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                          </div>
                          <p className="text-xs text-brand/70 mt-0.5">{item.s}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.d}</p>
                        </Card>
                      </a>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Sources / Quick Links */}
            <Section icon={Link} title="Sources">
              <div className="flex flex-wrap gap-1.5">
                {quickLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-secondary/50 text-muted-foreground hover:text-brand hover:bg-brand/10 transition-colors"
                  >
                    {link.icon === 'globe' && <Globe className="h-3 w-3" />}
                    {link.icon === 'linkedin' && <Linkedin className="h-3 w-3" />}
                    {link.icon === 'search' && <Search className="h-3 w-3" />}
                    {link.icon === 'news' && <Newspaper className="h-3 w-3" />}
                    {link.label}
                    <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                  </a>
                ))}
              </div>
            </Section>

            {/* Talking Points */}
            {company.tp && company.tp.length > 0 && (
              <Section icon={MessageSquare} title="Talking Points" action={
                allTalkingPoints ? <CopyButton text={allTalkingPoints} variant="button" label="Copy All" /> : undefined
              }>
                <div className="space-y-1.5">
                  {company.tp.map((point, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm group">
                      <span className="text-brand shrink-0 mt-0.5">&bull;</span>
                      <span className="text-muted-foreground leading-relaxed flex-1">{point}</span>
                      <CopyButton text={point} className="opacity-0 group-hover:opacity-100" />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Battlecards */}
            {battlecards.length > 0 && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBattlecardsOpen(!battlecardsOpen)}
                  className="flex items-center gap-2 mb-2 w-full text-left h-auto p-0 hover:bg-transparent"
                >
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
                    Battlecards
                  </h3>
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5">
                    {battlecards.length}
                  </Badge>
                  {battlecardsOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </Button>
                {battlecardsOpen && (
                  <div className="space-y-3">
                    {battlecards.map((card, i) => {
                      const catStyle = getCategoryStyle(card.category);
                      return (
                        <Card key={i} className="bg-secondary/20 p-3 gap-2 shadow-none border-0 space-y-1.5">
                          <div className="flex items-start gap-2">
                            <Badge className={cn("text-xs px-1.5 py-0.5 h-5 shrink-0", catStyle.colorClass)}>
                              {catStyle.label}
                            </Badge>
                            <p className="text-xs font-medium text-foreground/90 flex-1">
                              &ldquo;{card.trigger}&rdquo;
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                              {card.response}
                            </p>
                            <CopyButton text={card.response} />
                          </div>
                          <p className="text-xs text-brand/60 italic">
                            {card.socialProof}
                          </p>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Competitive Intel */}
            {competitiveContexts.length > 0 && (
              <CompetitiveIntelSection contexts={competitiveContexts} />
            )}

            {/* The Ask */}
            {company.ask && (
              <Section icon={Target} title="The Ask">
                <div className="flex items-start gap-2">
                  <div className="flex-1 text-sm bg-brand/5 border border-brand/20 rounded-lg p-3 leading-relaxed">
                    {company.ask}
                  </div>
                  <CopyButton text={company.ask} />
                </div>
              </Section>
            )}

            {/* Sequence Panel */}
            {onSequenceStep && (
              <SequencePanel
                company={company}
                engagements={engagements}
                pipelineState={pipelineState}
                sequenceProgress={sequenceProgress}
                onStepComplete={onSequenceStep}
              />
            )}

            {/* Engagement Timeline */}
            <EngagementTimeline
              engagements={engagements}
              onAdd={onAddEngagement}
              onDelete={onDeleteEngagement}
            />

            {/* Email Outreach History */}
            {company.outreachHistory && company.outreachHistory.status !== "no_history" && (
              <EmailHistorySection outreachHistory={company.outreachHistory} />
            )}

            {/* Notes */}
            <Section icon={MessageSquare} title="Your Notes">
              <Textarea
                value={localNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add notes about your conversation..."
                className="w-full h-24 bg-secondary/30 text-sm resize-y"
              />
            </Section>
          </>
        )}
      </div>

      {/* Pre-Call Briefing Dialog */}
      {briefingLeader && (
        <PreCallBriefingDialog
          open={!!briefingLeader}
          onClose={() => setBriefingLeader(null)}
          company={company}
          leader={briefingLeader}
          engagements={engagements}
          pipelineState={pipelineState}
        />
      )}
    </ScrollArea>
    </div>
    </div>
  );
}

// --- Leader Card with email + linkedin message variants ---

function LeaderCard({
  leader,
  company,
  expandedPanel,
  onToggleExpand,
  activeVariant,
  onVariantChange,
  activeLinkedInVariant,
  onLinkedInVariantChange,
  onQuickLog,
  onBriefMe,
}: {
  leader: Leader;
  company: Company;
  expandedPanel: "email" | "linkedin" | null;
  onToggleExpand: (panel: "email" | "linkedin") => void;
  activeVariant: MessageVariant["style"];
  onVariantChange: (style: MessageVariant["style"]) => void;
  activeLinkedInVariant: LinkedInVariant["style"];
  onLinkedInVariantChange: (style: LinkedInVariant["style"]) => void;
  onQuickLog?: (contactName: string, channel: EngagementChannel, action: string) => void;
  onBriefMe: () => void;
}) {
  const emailVariants = useMemo(() => generateMessageVariants(leader, company), [leader, company]);
  const linkedInVariants = useMemo(() => generateLinkedInVariants(leader, company), [leader, company]);
  const currentEmail = emailVariants.find((v) => v.style === activeVariant) || emailVariants[0];
  const currentLinkedIn = linkedInVariants.find((v) => v.style === activeLinkedInVariant) || linkedInVariants[0];
  const [bioExpanded, setBioExpanded] = useState(false);
  const [hooksExpanded, setHooksExpanded] = useState(false);
  const bioRef = useRef<HTMLParagraphElement>(null);
  const [bioTruncated, setBioTruncated] = useState(false);

  // Persona detection
  const persona = useMemo(() => detectPersona(leader.t), [leader.t]);
  const personaConfig = useMemo(() => getPersonaConfig(persona), [persona]);

  useEffect(() => {
    if (bioRef.current) {
      setBioTruncated(bioRef.current.scrollHeight > bioRef.current.clientHeight + 2);
    }
  }, [leader.bg]);

  const MAX_VISIBLE_HOOKS = 3;
  const hooks = leader.hooks || [];
  const visibleHooks = hooksExpanded ? hooks : hooks.slice(0, MAX_VISIBLE_HOOKS);
  const hiddenHookCount = hooks.length - MAX_VISIBLE_HOOKS;

  const handleCopyWithLog = useCallback(
    (channel: EngagementChannel, action: string) => {
      if (onQuickLog) {
        toast("Log this outreach?", {
          action: {
            label: "Log it",
            onClick: () => onQuickLog(leader.n, channel, action),
          },
          duration: 5000,
        });
      }
    },
    [onQuickLog, leader.n]
  );

  return (
    <Card className="bg-secondary/30 p-3 gap-2 shadow-none border-0">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium">{leader.n}</span>
          <span className="text-xs text-muted-foreground ml-2">{leader.t}</span>
          {persona !== 'unknown' && (
            <Badge variant="outline" className={cn("text-xs px-1 py-0.5 h-5 ml-1.5", personaConfig.colorClass)}>
              {personaConfig.label}
            </Badge>
          )}
          {/* Email & phone inline */}
          {(leader.email || leader.phone) && (
            <div className="flex items-center gap-2 mt-0.5">
              {leader.email && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a href={`mailto:${leader.email}`} className="text-xs text-blue-400 hover:underline truncate max-w-[180px] flex items-center gap-0.5">
                      <Mail className="h-2.5 w-2.5 shrink-0" />
                      {leader.email}
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>{leader.email}</TooltipContent>
                </Tooltip>
              )}
              {leader.phone && (
                <a href={`tel:${leader.phone}`} className="text-xs text-green-400 hover:underline flex items-center gap-0.5">
                  <Phone className="h-2.5 w-2.5 shrink-0" />
                  {leader.phone}
                </a>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {leader.email && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`mailto:${leader.email}?subject=${encodeURIComponent(`${company.name} + HyperVerge`)}&body=${encodeURIComponent(currentEmail.body)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onQuickLog) {
                      onQuickLog(leader.n, "email", "sent_intro");
                    }
                  }}
                  className="flex items-center gap-1 text-xs h-auto px-2 py-1 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors font-medium"
                >
                  <Mail className="h-3 w-3" /> Email {leader.n.split(" ")[0]}
                </a>
              </TooltipTrigger>
              <TooltipContent>Open mailto with {leader.email}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onBriefMe();
                }}
                className="flex items-center gap-1 text-xs h-auto px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
              >
                <BookOpen className="h-3 w-3" /> Brief
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pre-call briefing</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand("email");
                }}
                className={cn(
                  "flex items-center text-xs h-auto p-1 rounded-md transition-colors",
                  expandedPanel === "email"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Mail className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Draft email</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand("linkedin");
                }}
                className={cn(
                  "flex items-center text-xs h-auto p-1 rounded-md transition-colors",
                  expandedPanel === "linkedin"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Linkedin className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Draft LinkedIn message</TooltipContent>
          </Tooltip>
          {leader.li && (
            <a
              href={leader.li}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand/80"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
      {leader.bg && (
        <div>
          <p
            ref={bioRef}
            className={cn(
              "text-xs text-muted-foreground mt-1 leading-relaxed",
              !bioExpanded && "line-clamp-2"
            )}
          >
            {leader.bg}
          </p>
          {bioTruncated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBioExpanded(!bioExpanded)}
              className="text-xs text-brand/70 hover:text-brand h-auto p-0 mt-0.5"
            >
              {bioExpanded ? "Show less" : "Show more"}
            </Button>
          )}
        </div>
      )}
      {hooks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          {visibleHooks.map((hook, j) => (
            <span
              key={j}
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 group/hook",
                hook.startsWith("*")
                  ? "bg-brand/15 text-brand"
                  : "bg-muted/50 text-muted-foreground"
              )}
            >
              {hook.startsWith("*") ? hook.slice(1) : hook}
              <CopyButton
                text={hook.startsWith("*") ? hook.slice(1) : hook}
                size="sm"
                className="opacity-0 group-hover/hook:opacity-100 !p-0"
              />
            </span>
          ))}
          {!hooksExpanded && hiddenHookCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHooksExpanded(true)}
              className="text-xs h-auto px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground hover:text-brand transition-colors"
            >
              +{hiddenHookCount} more
            </Button>
          )}
          {hooksExpanded && hiddenHookCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHooksExpanded(false)}
              className="text-xs h-auto px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground hover:text-brand transition-colors"
            >
              Show less
            </Button>
          )}
        </div>
      )}

      {/* Expanded Email variants */}
      {expandedPanel === "email" && (
        <div className="mt-2 rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1">
              {(["formal", "casual", "news-hook"] as const).map((style) => (
                <Button
                  key={style}
                  variant="ghost"
                  size="sm"
                  onClick={() => onVariantChange(style)}
                  className={cn(
                    "text-xs h-auto px-2 py-1 rounded-md transition-colors font-medium",
                    activeVariant === style
                      ? "bg-blue-500 text-white hover:bg-blue-500/90"
                      : "bg-blue-500/10 text-blue-400/70 hover:bg-blue-500/20"
                  )}
                >
                  {VARIANT_LABELS[style]}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {leader.email && (
                <a
                  href={`mailto:${leader.email}?subject=${encodeURIComponent(currentEmail.subject)}&body=${encodeURIComponent(currentEmail.body)}`}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyWithLog("email", "sent_intro");
                  }}
                >
                  <Mail className="h-3 w-3" /> Gmail
                </a>
              )}
              <CopyButton
                text={`Subject: ${currentEmail.subject}\n\n${currentEmail.body}`}
                variant="button"
                label="Copy"
                size="sm"
                onAfterCopy={() => handleCopyWithLog("email", "sent_intro")}
              />
            </div>
          </div>
          <div className="text-xs text-blue-400/60 mb-1 font-medium">
            Subject: {currentEmail.subject}
          </div>
          <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
            {currentEmail.body}
          </pre>
        </div>
      )}

      {/* Expanded LinkedIn variants */}
      {expandedPanel === "linkedin" && (
        <div className="mt-2 rounded-md border border-sky-400/20 bg-sky-400/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1">
              {(["connection-request", "inmail"] as const).map((style) => (
                <Button
                  key={style}
                  variant="ghost"
                  size="sm"
                  onClick={() => onLinkedInVariantChange(style)}
                  className={cn(
                    "text-xs h-auto px-2 py-1 rounded-md transition-colors font-medium",
                    activeLinkedInVariant === style
                      ? "bg-sky-400 text-white hover:bg-sky-400/90"
                      : "bg-sky-400/10 text-sky-300/70 hover:bg-sky-400/20"
                  )}
                >
                  {LINKEDIN_LABELS[style]}
                </Button>
              ))}
            </div>
            <CopyButton
              text={currentLinkedIn.body}
              variant="button"
              label="Copy"
              size="sm"
              onAfterCopy={() =>
                handleCopyWithLog(
                  "linkedin",
                  activeLinkedInVariant === "connection-request" ? "sent_connection" : "sent_message"
                )
              }
            />
          </div>
          {activeLinkedInVariant === "connection-request" && (
            <p className="text-xs text-sky-400/50 mb-1">~300 char limit for connection requests</p>
          )}
          <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
            {currentLinkedIn.body}
          </pre>
        </div>
      )}
    </Card>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// --- Readiness Score Badge (compact header widget) ---

const READINESS_SUB_SCORES: { key: "hookScore" | "contactScore" | "painPointScore" | "intelScore"; label: string; abbr: string }[] = [
  { key: "hookScore", label: "Hook / Trigger", abbr: "Hook" },
  { key: "contactScore", label: "Contact Reachability", abbr: "Contact" },
  { key: "painPointScore", label: "Pain Point / Value", abbr: "Pain" },
  { key: "intelScore", label: "Intel Freshness", abbr: "Intel" },
];

function ReadinessScoreBadge({
  readiness,
  label,
}: {
  readiness: { total: number; hookScore: number; contactScore: number; painPointScore: number; intelScore: number; missingPieces: string[] };
  label: "ready" | "almost" | "needs-work" | "not-ready";
}) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = getReadinessColor(label);
  const bgClass = getReadinessBgColor(label);
  const labelText = label === "ready" ? "Ready" : label === "almost" ? "Almost" : label === "needs-work" ? "Needs Work" : "Not Ready";

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 group"
      >
        <Badge variant="outline" className={cn("text-xs px-1.5 py-0.5 h-5 font-semibold border", bgClass, colorClass)}>
          <BarChart3 className="h-2.5 w-2.5 mr-0.5" />
          {readiness.total.toFixed(1)}/10
        </Badge>
        <span className={cn("text-xs font-medium", colorClass)}>{labelText}</span>
        <div className="flex items-center gap-0.5">
          {READINESS_SUB_SCORES.map(({ key }) => {
            const val = readiness[key];
            const barColor = val >= 7 ? "bg-green-500" : val >= 5 ? "bg-yellow-500" : val >= 3 ? "bg-orange-500" : "bg-red-500";
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <div className="w-6 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${(val / 10) * 100}%` }} />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {READINESS_SUB_SCORES.find(s => s.key === key)?.label}: {val}/10
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {/* Sub-score bars */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {READINESS_SUB_SCORES.map(({ key, label: scoreLabel, abbr }) => {
              const val = readiness[key];
              const barColor = val >= 7 ? "bg-green-500" : val >= 5 ? "bg-yellow-500" : val >= 3 ? "bg-orange-500" : "bg-red-500";
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12 shrink-0">{abbr}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${(val / 10) * 100}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">{val}</span>
                </div>
              );
            })}
          </div>
          {/* Missing pieces */}
          {readiness.missingPieces.length > 0 && (
            <div className="space-y-0.5 mt-1">
              {readiness.missingPieces.map((piece, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-orange-400/80">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{piece}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Trigger Cards Section ---

const TRIGGER_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  funding: { label: "Funding", color: "text-green-400", icon: "$" },
  leadership_hire: { label: "New Leader", color: "text-yellow-400", icon: "U" },
  regulatory: { label: "Regulatory", color: "text-red-400", icon: "R" },
  product_launch: { label: "Product", color: "text-blue-400", icon: "P" },
  partnership: { label: "Partnership", color: "text-purple-400", icon: "H" },
  milestone: { label: "Milestone", color: "text-orange-400", icon: "M" },
};

function TriggerCardsSection({ triggerCards }: { triggerCards: TriggerCard[] }) {
  return (
    <Section icon={Zap} title={`Trigger Cards (${triggerCards.length})`}>
      <div className="space-y-3">
        {triggerCards.map((card) => (
          <TriggerCardItem key={card.id} card={card} />
        ))}
      </div>
    </Section>
  );
}

function TriggerCardItem({ card }: { card: TriggerCard }) {
  const [open, setOpen] = useState(false);
  const config = TRIGGER_TYPE_LABELS[card.triggerType] || { label: card.triggerType, color: "text-muted-foreground", icon: "?" };
  const daysAgo = Math.round((Date.now() - card.signalDate) / 86400000);

  return (
    <Card className="bg-secondary/20 p-3 gap-0 shadow-none border-0 space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={cn("text-xs px-1.5 py-0.5 h-5 shrink-0 font-semibold", config.color)}>
              {config.label}
            </Badge>
            <Badge variant="outline" className={cn(
              "text-xs px-1.5 py-0.5 h-5 shrink-0",
              card.heat === "hot" ? "bg-red-500/10 text-red-400 border-red-500/30"
                : card.heat === "warm" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                : "bg-muted/50 text-muted-foreground border-border"
            )}>
              {card.heat}
            </Badge>
            {card.expiresInDays <= 7 && (
              <span className="text-xs text-red-400 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" /> {card.expiresInDays}d left
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-foreground/90 leading-snug">{card.signalHeadline}</p>
          <p className="text-xs text-muted-foreground/60">{card.signalSource} &middot; {daysAgo}d ago</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded bg-brand/10 text-brand">
                {card.urgency}/10
              </div>
            </TooltipTrigger>
            <TooltipContent>Urgency score</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Why Now */}
      <p className="text-xs text-muted-foreground leading-relaxed italic">{card.whyNow}</p>

      {/* Target contact */}
      {card.targetContact && (
        <div className="flex items-center gap-2 text-xs">
          <Users className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="font-medium">{card.targetContact.name}</span>
          <span className="text-muted-foreground">{card.targetContact.title}</span>
          <span className="text-muted-foreground/50">({card.targetContact.rationale})</span>
        </div>
      )}

      {/* Hook line with copy */}
      <div className="flex items-start gap-2">
        <p className="text-xs text-brand/80 flex-1 leading-relaxed">{card.hookLine}</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 p-0 shrink-0 text-muted-foreground hover:text-brand"
          onClick={() => {
            navigator.clipboard.writeText(card.hookLine);
            toast.success("Hook line copied");
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>

      {/* Expandable outreach package */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground gap-1 w-full justify-start"
          >
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Outreach Package
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          {/* Email */}
          <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-400 flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email Draft
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-xs text-muted-foreground hover:text-blue-400 gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(`Subject: ${card.outreachPackage.emailSubject}\n\n${card.outreachPackage.emailBody}`);
                  toast.success("Email copied");
                }}
              >
                <Copy className="h-2.5 w-2.5" /> Copy
              </Button>
            </div>
            <p className="text-xs text-blue-400/60 font-medium">Subject: {card.outreachPackage.emailSubject}</p>
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">{card.outreachPackage.emailBody}</pre>
          </div>

          {/* LinkedIn */}
          <div className="rounded-md border border-sky-400/20 bg-sky-400/5 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-sky-400 flex items-center gap-1">
                <Linkedin className="h-3 w-3" /> LinkedIn Message
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-xs text-muted-foreground hover:text-sky-400 gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(card.outreachPackage.linkedInMessage);
                  toast.success("LinkedIn message copied");
                }}
              >
                <Copy className="h-2.5 w-2.5" /> Copy
              </Button>
            </div>
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">{card.outreachPackage.linkedInMessage}</pre>
          </div>

          {/* Talking Points */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Talking Points
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-xs text-muted-foreground hover:text-brand gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(card.outreachPackage.talkingPoints.join("\n\n"));
                  toast.success("Talking points copied");
                }}
              >
                <Copy className="h-2.5 w-2.5" /> Copy
              </Button>
            </div>
            {card.outreachPackage.talkingPoints.map((tp, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-brand shrink-0 mt-0.5">&bull;</span>
                <span className="text-muted-foreground leading-relaxed">{tp}</span>
              </div>
            ))}
          </div>

          {/* Objection preempt */}
          <div className="rounded-md bg-yellow-500/5 border border-yellow-500/20 p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-yellow-400 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Objection Preempt
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-xs text-muted-foreground hover:text-yellow-400 gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(card.outreachPackage.objectionPreempt);
                  toast.success("Objection preempt copied");
                }}
              >
                <Copy className="h-2.5 w-2.5" /> Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{card.outreachPackage.objectionPreempt}</p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// --- Competitive Intel Section ---

const CONFIDENCE_STYLES: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "bg-green-500/10 text-green-400 border-green-500/30" },
  likely: { label: "Likely", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  possible: { label: "Possible", color: "bg-muted/50 text-muted-foreground border-border" },
};

const SOURCE_LABELS: Record<string, string> = {
  description: "Company description",
  news: "News article",
  leader_background: "Leader bio",
  leader_hooks: "Leader hooks",
};

function CompetitiveIntelSection({ contexts }: { contexts: CompetitiveContext[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-2 w-full text-left h-auto p-0 hover:bg-transparent"
      >
        <Swords className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
          Competitive Intel
        </h3>
        <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5">
          {contexts.length}
        </Badge>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>
      {expanded && (
        <div className="space-y-3">
          {contexts.map((ctx, i) => {
            const confStyle = CONFIDENCE_STYLES[ctx.confidence] || CONFIDENCE_STYLES.possible;
            return (
              <Card key={i} className="bg-secondary/20 p-3 gap-0 shadow-none border-0 space-y-2">
                {/* Competitor header */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">{ctx.competitor.name}</span>
                  <Badge variant="outline" className={cn("text-xs px-1.5 py-0.5 h-5", confStyle.color)}>
                    {confStyle.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground/50">
                    via {SOURCE_LABELS[ctx.mentionSource] || ctx.mentionSource}
                  </span>
                </div>

                {/* Mention context */}
                <p className="text-xs text-muted-foreground/70 italic leading-relaxed">
                  &ldquo;{ctx.mentionText}&rdquo;
                </p>

                {/* Battlecard */}
                <div className="space-y-2 pt-1">
                  {/* Situation */}
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Situation</span>
                    <p className="text-xs text-foreground/80 leading-relaxed mt-0.5">{ctx.battlecard.situation}</p>
                  </div>
                  {/* Response */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-brand">Response</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-brand"
                        onClick={() => {
                          navigator.clipboard.writeText(ctx.battlecard.response);
                          toast.success("Response copied");
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed mt-0.5">{ctx.battlecard.response}</p>
                  </div>
                  {/* Proof Point */}
                  <div>
                    <span className="text-xs font-medium text-green-400">Proof Point</span>
                    <p className="text-xs text-foreground/80 leading-relaxed mt-0.5">{ctx.battlecard.proofPoint}</p>
                  </div>
                  {/* Avoid Saying */}
                  <div className="rounded bg-red-500/5 border border-red-500/15 p-2">
                    <span className="text-xs font-medium text-red-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Avoid Saying
                    </span>
                    <p className="text-xs text-red-400/70 leading-relaxed mt-0.5">{ctx.battlecard.avoidSaying}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Email Outreach History Section ---

const outreachStatusLabels: Record<string, { label: string; color: string }> = {
  engaged: { label: "Engaged", color: "text-green-400" },
  contacted: { label: "Contacted", color: "text-blue-400" },
  responded: { label: "Responded", color: "text-orange-400" },
};

function EmailHistorySection({ outreachHistory }: { outreachHistory: OutreachHistory }) {
  const [expanded, setExpanded] = useState(false);
  const statusInfo = outreachStatusLabels[outreachHistory.status];

  return (
    <Section icon={Mail} title="Email History">
      <Card className="p-3 shadow-none space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs font-semibold", statusInfo?.color || "")}>
              {statusInfo?.label || outreachHistory.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {outreachHistory.totalOutbound} sent &middot; {outreachHistory.totalInbound} received
            </span>
          </div>
          {outreachHistory.lastActivityDate && (
            <span className="text-xs text-muted-foreground">
              Last: {new Date(outreachHistory.lastActivityDate).toLocaleDateString()}
            </span>
          )}
        </div>

        {outreachHistory.matchedContacts.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground gap-1"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {outreachHistory.matchedContacts.length} matched contacts
            </Button>

            {expanded && (
              <div className="space-y-1.5">
                {outreachHistory.matchedContacts.map((contact) => (
                  <div key={contact.email} className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <span className="font-medium">{contact.name || contact.email}</span>
                      {contact.title && (
                        <span className="text-muted-foreground ml-1">({contact.title})</span>
                      )}
                      {contact.name && (
                        <span className="text-muted-foreground/60 ml-1 font-mono text-[10px]">{contact.email}</span>
                      )}
                    </div>
                    <div className="text-muted-foreground shrink-0 ml-2 tabular-nums">
                      {contact.outbound > 0 && <span className="text-blue-400">{contact.outbound} out</span>}
                      {contact.outbound > 0 && contact.inbound > 0 && <span> / </span>}
                      {contact.inbound > 0 && <span className="text-green-400">{contact.inbound} in</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </Section>
  );
}
