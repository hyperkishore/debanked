"use client";

import { Company, RatingData, EngagementEntry } from "@/lib/types";
import { isResearched } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { EngagementTimeline } from "@/components/engagement-timeline";
import { cn } from "@/lib/utils";
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
  Check,
  Shuffle,
  MapPin,
  Globe,
  Building2,
} from "lucide-react";
import { useState, useCallback } from "react";

interface CompanyDetailProps {
  company: Company;
  isMet: boolean;
  rating: RatingData | null;
  notes: string;
  engagements: EngagementEntry[];
  onToggleMet: (id: number) => void;
  onSaveNotes: (id: number, notes: string) => void;
  onClose?: () => void;
  onOpenRating: (id: number) => void;
  onAddEngagement: () => void;
  onDeleteEngagement: (id: string) => void;
}

const typeBadgeStyles: Record<string, string> = {
  SQO: "bg-[var(--sqo)]/10 text-[var(--sqo)] border-[var(--sqo)]/30",
  Client: "bg-[var(--client)]/10 text-[var(--client)] border-[var(--client)]/30",
  ICP: "bg-[var(--icp)]/10 text-[var(--icp)] border-[var(--icp)]/30",
  TAM: "bg-[var(--tam)]/10 text-[var(--tam)] border-[var(--tam)]/30",
};

export function CompanyDetail({
  company,
  isMet,
  rating,
  notes,
  engagements,
  onToggleMet,
  onSaveNotes,
  onClose,
  onOpenRating,
  onAddEngagement,
  onDeleteEngagement,
}: CompanyDetailProps) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [iceIndex, setIceIndex] = useState(0);
  const researched = isResearched(company);

  const shuffleIce = useCallback(() => {
    if (company.icebreakers && company.icebreakers.length > 0) {
      setIceIndex((prev) => (prev + 1) % company.icebreakers!.length);
    }
  }, [company.icebreakers]);

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    onSaveNotes(company.id, value);
  };

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
                <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30">
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
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe className="h-3 w-3" /> Website
                </a>
              )}
              {company.linkedinUrl && (
                <a
                  href={company.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Linkedin className="h-3 w-3" /> LinkedIn
                </a>
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
                rating.rating === "cold" && "bg-primary/20 text-primary",
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
              <textarea
                value={localNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add notes about this company..."
                className="w-full h-24 bg-secondary/30 border border-border rounded-lg p-3 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Section>
          </div>
        ) : (
          /* Full researched content */
          <>
            {/* Contacts */}
            <Section icon={Users} title="Contacts">
              <div className="space-y-2">
                {(company.leaders || []).map((leader, i) => (
                  <div key={i} className="rounded-lg bg-secondary/30 p-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{leader.n}</span>
                        <span className="text-xs text-muted-foreground ml-2">{leader.t}</span>
                      </div>
                      {leader.li && (
                        <a
                          href={leader.li}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Linkedin className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{leader.bg}</p>
                    {leader.hooks && leader.hooks.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {leader.hooks.map((hook, j) => (
                          <span
                            key={j}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full",
                              hook.startsWith("*")
                                ? "bg-primary/15 text-primary"
                                : "bg-muted/50 text-muted-foreground"
                            )}
                          >
                            {hook.startsWith("*") ? hook.slice(1) : hook}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
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

            {/* Icebreakers */}
            <Section icon={Lightbulb} title="Icebreakers">
              <div className="space-y-2">
                <div className="text-sm leading-relaxed text-foreground/90 bg-secondary/30 rounded-lg p-3">
                  {company.icebreakers && company.icebreakers.length > 0
                    ? company.icebreakers[iceIndex % company.icebreakers.length]
                    : company.ice || "No icebreakers available"}
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
              <p className="text-sm leading-relaxed text-muted-foreground">{company.desc}</p>
              {company.notes && (
                <p className="text-xs text-primary/80 mt-2 italic">{company.notes}</p>
              )}
            </Section>

            {/* News */}
            {company.news && company.news.length > 0 && (
              <Section icon={Newspaper} title="Recent News">
                <div className="space-y-2">
                  {company.news.map((item, i) => (
                    <div key={i} className="rounded-lg bg-secondary/30 p-2.5">
                      <h4 className="text-sm font-medium leading-snug">{item.h}</h4>
                      <p className="text-[11px] text-primary/70 mt-0.5">{item.s}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.d}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Talking Points */}
            {company.tp && company.tp.length > 0 && (
              <Section icon={MessageSquare} title="Talking Points">
                <div className="space-y-1.5">
                  {company.tp.map((point, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="text-primary shrink-0 mt-0.5">•</span>
                      <span className="text-muted-foreground leading-relaxed">{point}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* The Ask */}
            {company.ask && (
              <Section icon={Target} title="The Ask">
                <div className="text-sm bg-primary/5 border border-primary/20 rounded-lg p-3 leading-relaxed">
                  {company.ask}
                </div>
              </Section>
            )}

            {/* Engagement Timeline */}
            <EngagementTimeline
              engagements={engagements}
              onAdd={onAddEngagement}
              onDelete={onDeleteEngagement}
            />

            {/* Notes */}
            <Section icon={MessageSquare} title="Your Notes">
              <textarea
                value={localNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add notes about your conversation..."
                className="w-full h-24 bg-secondary/30 border border-border rounded-lg p-3 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Section>
          </>
        )}
      </div>
    </ScrollArea>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}
