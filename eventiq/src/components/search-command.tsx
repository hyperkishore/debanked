"use client";

import { useState, useEffect, useMemo } from "react";
import { Company } from "@/lib/types";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SearchCommandProps {
  companies: Company[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (companyId: number) => void;
}

interface SearchResult {
  company: Company;
  matchField: string; // where the match was found
  matchSnippet: string; // short preview of matched text
}

function findMatchField(company: Company, query: string): { field: string; snippet: string } | null {
  const q = query.toLowerCase();

  // Name (highest priority)
  if (company.name.toLowerCase().includes(q)) {
    return { field: "name", snippet: "" };
  }

  // Contacts and leaders (people)
  for (const ct of company.contacts) {
    if (ct.n.toLowerCase().includes(q)) {
      return { field: "contact", snippet: ct.n };
    }
  }
  for (const l of (company.leaders || [])) {
    if (l.n.toLowerCase().includes(q)) {
      return { field: "leader", snippet: l.n };
    }
    if (l.bg && l.bg.toLowerCase().includes(q)) {
      return { field: "leader bio", snippet: extractSnippet(l.bg, q) };
    }
  }

  // Location
  if ((company.location || "").toLowerCase().includes(q)) {
    return { field: "location", snippet: company.location || "" };
  }

  // Description
  if (company.desc && company.desc.toLowerCase().includes(q)) {
    return { field: "description", snippet: extractSnippet(company.desc, q) };
  }

  // News
  for (const n of (company.news || [])) {
    if (n.h.toLowerCase().includes(q) || n.d.toLowerCase().includes(q)) {
      return { field: "news", snippet: extractSnippet(n.h + " — " + n.d, q) };
    }
  }

  // Icebreakers
  if (company.ice && company.ice.toLowerCase().includes(q)) {
    return { field: "icebreaker", snippet: extractSnippet(company.ice, q) };
  }
  for (const ib of (company.icebreakers || [])) {
    if (ib.toLowerCase().includes(q)) {
      return { field: "icebreaker", snippet: extractSnippet(ib, q) };
    }
  }

  // Talking points
  for (const tp of (company.tp || [])) {
    if (tp.toLowerCase().includes(q)) {
      return { field: "talking point", snippet: extractSnippet(tp, q) };
    }
  }

  // Notes
  if (company.notes && company.notes.toLowerCase().includes(q)) {
    return { field: "notes", snippet: extractSnippet(company.notes, q) };
  }

  // Website / LinkedIn URL
  if ((company.website || "").toLowerCase().includes(q)) {
    return { field: "website", snippet: company.website || "" };
  }

  return null;
}

function extractSnippet(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 60);
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + query.length + 40);
  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}

export function SearchCommand({ companies, open, onOpenChange, onSelect }: SearchCommandProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results: SearchResult[] = useMemo(() => {
    if (query.length === 0) {
      return companies.slice(0, 20).map(c => ({ company: c, matchField: "name", matchSnippet: "" }));
    }

    const matches: SearchResult[] = [];
    for (const c of companies) {
      const match = findMatchField(c, query);
      if (match) {
        matches.push({ company: c, matchField: match.field, matchSnippet: match.snippet });
      }
      if (matches.length >= 100) break;
    }
    return matches;
  }, [query, companies]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      SQO: [], Client: [], ICP: [], TAM: [],
    };
    for (const r of results) {
      const type = r.company.type;
      if (groups[type]) groups[type].push(r);
    }
    return groups;
  }, [results]);

  const badgeStyles: Record<string, string> = {
    SQO: "text-[var(--sqo)] border-[var(--sqo)]/30",
    Client: "text-[var(--client)] border-[var(--client)]/30",
    ICP: "text-[var(--icp)] border-[var(--icp)]/30",
    TAM: "text-[var(--tam)] border-[var(--tam)]/30",
  };

  const fieldBadgeColor: Record<string, string> = {
    name: "",
    contact: "text-blue-400",
    leader: "text-blue-400",
    "leader bio": "text-blue-300",
    location: "text-green-400",
    description: "text-muted-foreground",
    news: "text-amber-400",
    icebreaker: "text-purple-400",
    "talking point": "text-cyan-400",
    notes: "text-muted-foreground",
    website: "text-muted-foreground",
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search everything — names, news, descriptions, talking points..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {(Object.entries(grouped) as [string, SearchResult[]][]).map(
          ([type, items]) =>
            items.length > 0 && (
              <CommandGroup key={type} heading={`${type} (${items.length})`}>
                {items.slice(0, 50).map((result) => (
                  <CommandItem
                    key={result.company.id}
                    value={`${result.company.name} ${result.company.contacts.map((c) => c.n).join(" ")} ${result.company.location || ""} ${result.company.desc || ""}`}
                    onSelect={() => {
                      onSelect(result.company.id);
                      onOpenChange(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{result.company.name}</span>
                      {query.length > 0 && result.matchField !== "name" && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn("text-[10px] font-medium", fieldBadgeColor[result.matchField] || "text-muted-foreground")}>
                            {result.matchField}
                          </span>
                          {result.matchSnippet && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[300px]">
                              {result.matchSnippet}
                            </span>
                          )}
                        </div>
                      )}
                      {query.length === 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {result.company.contacts.map((c) => c.n).join(", ") || result.company.location || ""}
                        </span>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] ml-2 shrink-0", badgeStyles[type] || "")}
                    >
                      {type}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )
        )}
      </CommandList>
    </CommandDialog>
  );
}
