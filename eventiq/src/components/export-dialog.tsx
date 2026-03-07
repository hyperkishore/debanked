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
import { Download, Check, FileText } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";

type ExportFormat = "csv" | "markdown";

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

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generateMarkdownBriefing(companies: Company[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `# EventIQ Company Briefing`,
    `> Generated ${today} | ${companies.length} companies`,
    "",
    "---",
    "",
  ];

  for (const c of companies) {
    const subV = inferSubVertical(c);
    lines.push(`## ${c.name}`);
    lines.push("");

    // Meta line
    const meta: string[] = [`**${c.type}**`, `P${c.priority - 1}`, subV];
    if (c.location) meta.push(c.location);
    if (c.employees) meta.push(`${c.employees.toLocaleString()} employees`);
    lines.push(meta.join(" | "));
    lines.push("");

    if (c.website) lines.push(`Website: ${c.website}`);
    if (c.linkedinUrl) lines.push(`LinkedIn: ${c.linkedinUrl}`);
    if (c.website || c.linkedinUrl) lines.push("");

    // Description
    if (c.desc) {
      lines.push("### About");
      lines.push(c.desc);
      lines.push("");
    }

    // Leaders
    const leaders = c.leaders || [];
    if (leaders.length > 0) {
      lines.push("### Key People");
      for (const l of leaders) {
        lines.push(`- **${l.n}** — ${l.t}`);
        if (l.bg) lines.push(`  ${l.bg}`);
        if (l.hooks && l.hooks.length > 0) lines.push(`  Hooks: ${l.hooks.join(", ")}`);
        if (l.email) lines.push(`  Email: ${l.email}`);
        if (l.li) lines.push(`  LinkedIn: ${l.li}`);
      }
      lines.push("");
    }

    // News
    if (c.news.length > 0) {
      lines.push("### Recent News");
      for (const n of c.news.slice(0, 4)) {
        lines.push(`- **${n.h}** (${n.s})`);
        if (n.d) lines.push(`  ${n.d}`);
      }
      lines.push("");
    }

    // Icebreaker & Talking Points
    if (c.ice) {
      lines.push("### Icebreaker");
      lines.push(c.ice);
      lines.push("");
    }

    if (c.tp && c.tp.length > 0) {
      lines.push("### Talking Points");
      for (const tp of c.tp) lines.push(`- ${tp}`);
      lines.push("");
    }

    if (c.ask) {
      lines.push("### The Ask");
      lines.push(c.ask);
      lines.push("");
    }

    if (c.notes) {
      lines.push("### Notes");
      lines.push(c.notes);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  companies: Company[];
}

export function ExportDialog({ open, onClose, companies }: ExportDialogProps) {
  const [selected, setSelected] = useState<Set<FieldGroupId>>(new Set(ALL_GROUP_IDS));
  const [format, setFormat] = useState<ExportFormat>("csv");

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
    const today = new Date().toISOString().slice(0, 10);
    if (format === "markdown") {
      const md = generateMarkdownBriefing(companies);
      downloadFile(md, `eventiq-briefing-${today}.md`, "text/markdown;charset=utf-8;");
      toast.success(`Exported ${companies.length} companies as Markdown briefing`);
    } else {
      if (selected.size === 0) {
        toast.error("Select at least one field group to export");
        return;
      }
      const csv = generateCSV(companies, selected);
      downloadFile(csv, `eventiq-export-${today}.csv`, "text/csv;charset=utf-8;");
      toast.success(`Exported ${companies.length} companies to CSV`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Companies
          </DialogTitle>
        </DialogHeader>

        {/* Format toggle */}
        <ToggleGroup
          type="single"
          value={format}
          onValueChange={(v) => v && setFormat(v as ExportFormat)}
          className="justify-start"
        >
          <ToggleGroupItem value="csv" className="text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </ToggleGroupItem>
          <ToggleGroupItem value="markdown" className="text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Briefing (Markdown)
          </ToggleGroupItem>
        </ToggleGroup>

        {format === "csv" ? (
          <>
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
          </>
        ) : (
          <div className="py-4 text-center space-y-2">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Generates a formatted Markdown briefing with all company details,
              leaders, news, talking points, and icebreakers.
            </p>
            <p className="text-xs text-muted-foreground">
              {companies.length} companies &middot; Open in any Markdown viewer or print to PDF
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={format === "csv" && selected.size === 0}>
            <Download className="h-4 w-4 mr-2" />
            {format === "csv" ? "Download CSV" : "Download Briefing"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
