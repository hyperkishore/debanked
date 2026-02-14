"use client";

import { useState, useEffect } from "react";
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

export function SearchCommand({ companies, open, onOpenChange, onSelect }: SearchCommandProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = query.length > 0
    ? companies.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.contacts.some((ct) => ct.n.toLowerCase().includes(q)) ||
          (c.leaders || []).some((l) => l.n.toLowerCase().includes(q)) ||
          (c.location || "").toLowerCase().includes(q)
        );
      })
    : companies.slice(0, 20);

  const grouped: Record<string, Company[]> = {
    SQO: filtered.filter((c) => c.type === "SQO"),
    Client: filtered.filter((c) => c.type === "Client"),
    ICP: filtered.filter((c) => c.type === "ICP"),
    TAM: filtered.filter((c) => c.type === "TAM"),
  };

  const badgeStyles: Record<string, string> = {
    SQO: "text-[var(--sqo)] border-[var(--sqo)]/30",
    Client: "text-[var(--client)] border-[var(--client)]/30",
    ICP: "text-[var(--icp)] border-[var(--icp)]/30",
    TAM: "text-[var(--tam)] border-[var(--tam)]/30",
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search companies, contacts, or locations..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No companies found.</CommandEmpty>
        {(Object.entries(grouped) as [string, Company[]][]).map(
          ([type, items]) =>
            items.length > 0 && (
              <CommandGroup key={type} heading={`${type} (${items.length})`}>
                {items.slice(0, 50).map((company) => (
                  <CommandItem
                    key={company.id}
                    value={`${company.name} ${company.contacts.map((c) => c.n).join(" ")} ${company.location || ""}`}
                    onSelect={() => {
                      onSelect(company.id);
                      onOpenChange(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <span className="font-medium">{company.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {company.contacts.map((c) => c.n).join(", ") || company.location || ""}
                      </span>
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
