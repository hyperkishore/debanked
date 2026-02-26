"use client";

import { useState } from "react";
import { Company, inferSubVertical } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Check } from "lucide-react";
import { toast } from "sonner";

const FIELD_GROUPS = [
  {
    id: "basic",
    label: "Basic Info",
    fields: ["name", "type", "priority", "location", "employees", "website", "linkedinUrl"],
  },
  {
    id: "description",
    label: "Description",
    fields: ["desc"],
  },
  {
    id: "contacts",
    label: "Contacts",
    fields: ["contacts"],
  },
  {
    id: "leaders",
    label: "Leaders",
    fields: ["leaders"],
  },
  {
    id: "news",
    label: "News",
    fields: ["news"],
  },
  {
    id: "icebreakers",
    label: "Icebreakers",
    fields: ["ice", "icebreakers"],
  },
  {
    id: "talkingPoints",
    label: "Talking Points",
    fields: ["tp"],
  },
  {
    id: "ask",
    label: "The Ask",
    fields: ["ask"],
  },
  {
    id: "tags",
    label: "Tags / Category",
    fields: ["category", "subVertical"],
  },
  {
    id: "hubspot",
    label: "HubSpot Deals",
    fields: ["hubspotDeals"],
  },
  {
    id: "outreach",
    label: "Outreach History",
    fields: ["outreachHistory"],
  },
] as const;

type FieldGroupId = (typeof FIELD_GROUPS)[number]["id"];

const ALL_GROUP_IDS = new Set<FieldGroupId>(FIELD_GROUPS.map((g) => g.id));

function escapeCSV(value: string): string {
  if (!value) return "";
  const s = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildHeaders(selected: Set<FieldGroupId>): string[] {
  const headers: string[] = [];

  if (selected.has("basic")) {
    headers.push("Name", "Type", "Priority", "Location", "Employees", "Website", "LinkedIn URL");
  }
  if (selected.has("description")) {
    headers.push("Description");
  }
  if (selected.has("contacts")) {
    headers.push("Contacts");
  }
  if (selected.has("leaders")) {
    headers.push("Leader Names", "Leader Titles", "Leader Bios", "Leader LinkedIn URLs", "Leader Emails");
  }
  if (selected.has("news")) {
    headers.push("News Headlines", "News Sources");
  }
  if (selected.has("icebreakers")) {
    headers.push("Primary Icebreaker", "Icebreaker Variants");
  }
  if (selected.has("talkingPoints")) {
    headers.push("Talking Points");
  }
  if (selected.has("ask")) {
    headers.push("The Ask");
  }
  if (selected.has("tags")) {
    headers.push("Category", "Sub-Vertical");
  }
  if (selected.has("hubspot")) {
    headers.push("Deal Names", "Deal Stages", "Deal Amounts", "Deal Products");
  }
  if (selected.has("outreach")) {
    headers.push("Outreach Status", "Total Outbound", "Total Inbound", "Last Activity");
  }

  return headers;
}

function buildRow(company: Company, selected: Set<FieldGroupId>): string[] {
  const SEP = " | ";
  const row: string[] = [];

  if (selected.has("basic")) {
    row.push(
      company.name,
      company.type,
      String(company.priority),
      company.location || "",
      company.employees ? String(company.employees) : "",
      company.website || "",
      company.linkedinUrl || "",
    );
  }
  if (selected.has("description")) {
    row.push(company.desc || "");
  }
  if (selected.has("contacts")) {
    row.push(
      company.contacts.map((c) => `${c.n} (${c.t})`).join(SEP),
    );
  }
  if (selected.has("leaders")) {
    const leaders = company.leaders || [];
    row.push(
      leaders.map((l) => l.n).join(SEP),
      leaders.map((l) => l.t).join(SEP),
      leaders.map((l) => l.bg).join(SEP),
      leaders.map((l) => l.li || "").join(SEP),
      leaders.map((l) => l.email || "").join(SEP),
    );
  }
  if (selected.has("news")) {
    row.push(
      company.news.map((n) => n.h).join(SEP),
      company.news.map((n) => n.s).join(SEP),
    );
  }
  if (selected.has("icebreakers")) {
    row.push(
      company.ice || "",
      (company.icebreakers || []).join(SEP),
    );
  }
  if (selected.has("talkingPoints")) {
    row.push((company.tp || []).join(SEP));
  }
  if (selected.has("ask")) {
    row.push(company.ask || "");
  }
  if (selected.has("tags")) {
    row.push(
      company.category || "",
      inferSubVertical(company),
    );
  }
  if (selected.has("hubspot")) {
    const deals = company.hubspotDeals || [];
    row.push(
      deals.map((d) => d.dealName).join(SEP),
      deals.map((d) => d.stageLabel).join(SEP),
      deals.map((d) => (d.amount != null ? String(d.amount) : "")).join(SEP),
      deals.map((d) => d.product || "").join(SEP),
    );
  }
  if (selected.has("outreach")) {
    const oh = company.outreachHistory;
    row.push(
      oh?.status || "",
      oh ? String(oh.totalOutbound) : "",
      oh ? String(oh.totalInbound) : "",
      oh?.lastActivityDate || "",
    );
  }

  return row;
}

function generateCSV(companies: Company[], selected: Set<FieldGroupId>): string {
  const headers = buildHeaders(selected);
  const rows = companies.map((c) => buildRow(c, selected));
  const lines = [
    headers.map(escapeCSV).join(","),
    ...rows.map((r) => r.map(escapeCSV).join(",")),
  ];
  return lines.join("\n");
}

function downloadCSV(csvContent: string) {
  const today = new Date().toISOString().slice(0, 10);
  const filename = `eventiq-export-${today}.csv`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  companies: Company[];
}

export function ExportDialog({ open, onClose, companies }: ExportDialogProps) {
  const [selected, setSelected] = useState<Set<FieldGroupId>>(new Set(ALL_GROUP_IDS));

  const allSelected = selected.size === FIELD_GROUPS.length;

  function toggleGroup(id: FieldGroupId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(ALL_GROUP_IDS));
    }
  }

  function handleExport() {
    if (selected.size === 0) {
      toast.error("Select at least one field group to export");
      return;
    }
    const csv = generateCSV(companies, selected);
    downloadCSV(csv);
    toast.success(`Exported ${companies.length} companies to CSV`);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export to CSV
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {companies.length} companies &middot; {selected.size} of {FIELD_GROUPS.length} field groups
          </p>
          <Button variant="ghost" size="sm" onClick={toggleAll}>
            {allSelected ? "Deselect All" : "Select All"}
          </Button>
        </div>

        <ScrollArea className="max-h-[320px] pr-3">
          <div className="flex flex-col gap-3 py-1">
            {FIELD_GROUPS.map((group) => (
              <label
                key={group.id}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <Checkbox
                  checked={selected.has(group.id)}
                  onCheckedChange={() => toggleGroup(group.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium group-hover:text-foreground transition-colors">
                    {group.label}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {group.fields.map((f) => (
                      <Badge key={f} variant="secondary" className="text-xs font-normal">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={selected.size === 0}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
