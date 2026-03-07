"use client";

import { useState } from "react";
import { Company, getResearchScore, inferSubVertical } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Plus,
  Building2,
  Users,
  MapPin,
  Globe,
  BarChart3,
  FileText,
  Newspaper,
  Target,
  Search,
} from "lucide-react";

interface CompanyCompareProps {
  open: boolean;
  onClose: () => void;
  companies: Company[];
  initialCompanyIds?: number[];
}

const TYPE_COLORS: Record<string, string> = {
  SQO: "bg-red-500/20 text-red-400 border-red-500/30",
  Client: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ICP: "bg-green-500/20 text-green-400 border-green-500/30",
  TAM: "bg-muted text-muted-foreground border-border",
};

function CompareField({ label, values }: { label: string; values: (string | number | null)[] }) {
  return (
    <div className="grid gap-0" style={{ gridTemplateColumns: `140px repeat(${values.length}, 1fr)` }}>
      <div className="text-xs text-muted-foreground py-2 px-2 font-medium border-b border-border/50">
        {label}
      </div>
      {values.map((v, i) => (
        <div key={i} className="text-xs py-2 px-3 border-b border-border/50 border-l border-border/30">
          {v ?? <span className="text-muted-foreground/50">—</span>}
        </div>
      ))}
    </div>
  );
}

function CompareListField({ label, values }: { label: string; values: string[][] }) {
  return (
    <div className="grid gap-0" style={{ gridTemplateColumns: `140px repeat(${values.length}, 1fr)` }}>
      <div className="text-xs text-muted-foreground py-2 px-2 font-medium border-b border-border/50">
        {label}
      </div>
      {values.map((items, i) => (
        <div key={i} className="text-xs py-2 px-3 border-b border-border/50 border-l border-border/30 space-y-1">
          {items.length > 0 ? items.map((item, j) => (
            <div key={j} className="truncate">{item}</div>
          )) : <span className="text-muted-foreground/50">—</span>}
        </div>
      ))}
    </div>
  );
}

export function CompanyCompare({ open, onClose, companies, initialCompanyIds = [] }: CompanyCompareProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>(initialCompanyIds);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const selected = selectedIds
    .map((id) => companies.find((c) => c.id === id))
    .filter(Boolean) as Company[];

  const addCompany = (id: number) => {
    if (!selectedIds.includes(id) && selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
    setShowPicker(false);
    setSearchQuery("");
  };

  const removeCompany = (id: number) => {
    setSelectedIds(selectedIds.filter((i) => i !== id));
  };

  const filtered = searchQuery.length >= 2
    ? companies
        .filter((c) => !selectedIds.includes(c.id))
        .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 10)
    : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[90vw] w-full max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Compare Companies
            <Badge variant="outline" className="ml-2 text-xs">{selected.length}/4</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Company selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {selected.map((c) => (
            <Badge key={c.id} variant="secondary" className="flex items-center gap-1.5 py-1 px-2">
              {c.name}
              <button onClick={() => removeCompany(c.id)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selected.length < 4 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowPicker(!showPicker)}
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
              {showPicker && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg z-50 p-2">
                  <Input
                    placeholder="Search companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs mb-2"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {filtered.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => addCompany(c.id)}
                        className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent flex items-center gap-2"
                      >
                        <Badge variant="outline" className={`text-[10px] px-1 ${TYPE_COLORS[c.type] || ""}`}>
                          {c.type}
                        </Badge>
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))}
                    {searchQuery.length >= 2 && filtered.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">No matches</p>
                    )}
                    {searchQuery.length < 2 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Type 2+ characters</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comparison table */}
        {selected.length >= 2 ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="border border-border rounded-lg overflow-hidden">
              {/* Header row */}
              <div className="grid gap-0 bg-muted/30" style={{ gridTemplateColumns: `140px repeat(${selected.length}, 1fr)` }}>
                <div className="p-2 text-xs font-semibold border-b border-border">Field</div>
                {selected.map((c) => (
                  <div key={c.id} className="p-2 border-b border-border border-l border-border/30">
                    <div className="text-sm font-semibold truncate">{c.name}</div>
                    <Badge variant="outline" className={`text-[10px] mt-1 ${TYPE_COLORS[c.type] || ""}`}>
                      {c.type}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Basic info */}
              <CompareField label="Category" values={selected.map((c) => inferSubVertical(c))} />
              <CompareField label="Employees" values={selected.map((c) => c.employees ? c.employees.toLocaleString() : null)} />
              <CompareField label="Location" values={selected.map((c) => c.location || null)} />
              <CompareField label="Priority" values={selected.map((c) => `P${c.priority - 1}`)} />
              <CompareField label="Research Score" values={selected.map((c) => `${getResearchScore(c)}/100`)} />

              {/* Description */}
              <div className="grid gap-0" style={{ gridTemplateColumns: `140px repeat(${selected.length}, 1fr)` }}>
                <div className="text-xs text-muted-foreground py-2 px-2 font-medium border-b border-border/50">
                  Description
                </div>
                {selected.map((c) => (
                  <div key={c.id} className="text-xs py-2 px-3 border-b border-border/50 border-l border-border/30 max-h-32 overflow-y-auto">
                    {c.desc ? c.desc.slice(0, 300) + (c.desc.length > 300 ? "..." : "") : <span className="text-muted-foreground/50">—</span>}
                  </div>
                ))}
              </div>

              {/* Leaders */}
              <CompareListField
                label="Key Leaders"
                values={selected.map((c) =>
                  (c.leaders || []).slice(0, 3).map((l) => `${l.n} — ${l.t}`)
                )}
              />

              {/* Contacts */}
              <CompareField
                label="Contacts"
                values={selected.map((c) => `${c.contacts.length} contacts, ${(c.leaders || []).length} leaders`)}
              />

              {/* News */}
              <CompareListField
                label="Recent News"
                values={selected.map((c) =>
                  (c.news || []).slice(0, 3).map((n) => `${n.h} (${n.s})`)
                )}
              />

              {/* Talking Points */}
              <CompareListField
                label="Talking Points"
                values={selected.map((c) => c.tp || [])}
              />

              {/* Icebreaker */}
              <CompareField label="Icebreaker" values={selected.map((c) => c.ice || null)} />

              {/* The Ask */}
              <CompareField label="The Ask" values={selected.map((c) => c.ask || null)} />

              {/* Website / LinkedIn */}
              <CompareField label="Website" values={selected.map((c) => c.website || null)} />
              <CompareField label="LinkedIn" values={selected.map((c) => c.linkedinUrl ? "Yes" : "No")} />

              {/* Intel */}
              <CompareField label="Founded" values={selected.map((c) => c.intel?.foundedYear || null)} />
              <CompareField label="LinkedIn Followers" values={selected.map((c) => c.intel?.linkedinFollowers?.toLocaleString() || null)} />
              <CompareField label="Growth (6mo)" values={selected.map((c) => c.intel?.growth6mo != null ? `${c.intel.growth6mo}%` : null)} />
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select at least 2 companies to compare</p>
              <p className="text-xs mt-1">Add up to 4 companies side by side</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
