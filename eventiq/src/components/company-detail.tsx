"use client";

import { Company, Leader, RatingData, EngagementEntry, EngagementChannel } from "@/lib/types";
import { isResearched, generateOutreachMessage, generateQuickLinks } from "@/lib/types";
import { generateMessageVariants, MessageVariant } from "@/lib/message-variants";
import { generateLinkedInVariants, LinkedInVariant } from "@/lib/linkedin-message";
import { PipelineRecord } from "@/lib/pipeline-helpers";
import { detectPersona, getPersonaConfig } from "@/lib/persona-helpers";
import { generateBattlecards, getCategoryStyle } from "@/lib/battlecard-helpers";
import { buildThreadingMap, STATUS_STYLES } from "@/lib/threading-helpers";
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
import { DocumentVault } from "@/components/document-vault";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  Shuffle,
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
}: CompanyDetailProps) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [iceIndex, setIceIndex] = useState(0);
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

  // Threading map
  const threadingMap = useMemo(
    () => buildThreadingMap(company, engagements),
    [company, engagements]
  );

  const shuffleIce = useCallback(() => {
    if (company.icebreakers && company.icebreakers.length > 0) {
      setIceIndex((prev) => (prev + 1) % company.icebreakers!.length);
    }
  }, [company.icebreakers]);

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    onSaveNotes(company.id, value);
  };

  // Current icebreaker text for copy
  const currentIcebreaker = company.icebreakers && company.icebreakers.length > 0
    ? company.icebreakers[iceIndex % company.icebreakers.length]
    : company.ice || "";

  // All talking points as copyable text
  const allTalkingPoints = (company.tp || []).join("\n\n");

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {onClose && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 md:hidden" onClick={onClose}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <h2 className="text-lg font-bold truncate">{company.name}</h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={cn("text-xs font-semibold", typeBadgeStyles[company.type] || "")}>
                {company.type}
              </Badge>
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

          <div className="flex items-center gap-2 mt-2">
            <Button
              variant={isMet ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onToggleMet(company.id);
                if (!isMet) onOpenRating(company.id);
              }}
            >
              <Check className="h-3 w-3 mr-1" />
              {isMet ? "Met" : "Mark Met"}
            </Button>
            {isMet && rating && rating.rating && (
              <Badge className={cn(
                "text-xs",
                rating.rating === "hot" && "bg-[var(--sqo)]/20 text-[var(--sqo)]",
                rating.rating === "warm" && "bg-[var(--client)]/20 text-[var(--client)]",
                rating.rating === "cold" && "bg-brand/20 text-brand",
              )}>
                {rating.rating.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        <Separator />

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

            {/* Account Coverage (Multi-Threading Map) */}
            {threadingMap.totalCount > 0 && (
              <Section icon={Users} title="Account Coverage">
                <div className="space-y-3">
                  {/* Coverage bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          threadingMap.coveragePct >= 75 ? "bg-green-500" :
                          threadingMap.coveragePct >= 50 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${threadingMap.coveragePct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {threadingMap.engagedCount} of {threadingMap.totalCount} ({threadingMap.coveragePct}%)
                    </span>
                  </div>

                  {/* Leader threads */}
                  {threadingMap.threads.map((thread, i) => {
                    const personaConfig = getPersonaConfig(thread.persona);
                    const statusStyle = STATUS_STYLES[thread.status];
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="font-medium min-w-0 truncate flex-1">{thread.leader.n}</span>
                        <Badge variant="outline" className={cn("text-xs px-1 py-0.5 h-5", personaConfig.colorClass)}>
                          {personaConfig.label}
                        </Badge>
                        <Badge variant="outline" className={cn("text-xs px-1 py-0.5 h-5", statusStyle.colorClass)}>
                          {statusStyle.label}
                        </Badge>
                        {thread.engagementCount > 0 && (
                          <span className="text-xs text-muted-foreground">{thread.engagementCount}x</span>
                        )}
                      </div>
                    );
                  })}

                  {/* Suggestion */}
                  {threadingMap.suggestion && (
                    <p className="text-xs text-brand/80 bg-brand/5 rounded-lg p-2 mt-1">
                      {threadingMap.suggestion}
                    </p>
                  )}
                </div>
              </Section>
            )}

            {/* AI Briefing */}
            <AIBriefingCard companyId={company.id} />

            {/* Document Vault */}
            <DocumentVault companyId={company.id} />

            {/* Icebreakers */}
            <Section icon={Lightbulb} title="Icebreakers">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 text-sm leading-relaxed text-foreground/90 bg-secondary/30 rounded-lg p-3">
                    {currentIcebreaker || "No icebreakers available"}
                  </div>
                  {currentIcebreaker && <CopyButton text={currentIcebreaker} />}
                </div>
                {company.icebreakers && company.icebreakers.length > 1 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={shuffleIce}>
                    <Shuffle className="h-3 w-3 mr-1" />
                    Next icebreaker ({iceIndex + 1}/{company.icebreakers.length})
                  </Button>
                )}
              </div>
            </Section>

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

            {/* News */}
            {company.news && company.news.length > 0 && (
              <Section icon={Newspaper} title="Recent News">
                <div className="space-y-3">
                  {company.news.map((item, i) => (
                    <Card key={i} className="bg-secondary/30 p-3 gap-2 shadow-none border-0">
                      <h4 className="text-sm font-medium leading-snug">{item.h}</h4>
                      <p className="text-xs text-brand/70 mt-0.5">{item.s}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.d}</p>
                    </Card>
                  ))}
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
                    <a href={`mailto:${leader.email}`} className="text-xs text-blue-400 hover:underline truncate max-w-[180px]">
                      {leader.email}
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>{leader.email}</TooltipContent>
                </Tooltip>
              )}
              {leader.phone && (
                <a href={`tel:${leader.phone}`} className="text-xs text-green-400 hover:underline">
                  {leader.phone}
                </a>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
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
                  "flex items-center gap-1 text-xs h-auto px-2 py-1 rounded-md transition-colors",
                  expandedPanel === "email"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                )}
              >
                <Mail className="h-3 w-3" /> Email
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
                  "flex items-center gap-1 text-xs h-auto px-2 py-1 rounded-md transition-colors",
                  expandedPanel === "linkedin"
                    ? "bg-sky-400/20 text-sky-400"
                    : "bg-sky-400/10 text-sky-400 hover:bg-sky-400/20"
                )}
              >
                <Linkedin className="h-3 w-3" /> LinkedIn
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
