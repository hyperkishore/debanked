"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  ArrowRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Company } from "@/lib/types";
import { toast } from "sonner";

// --- Inline heuristic field mapper (browser-safe, no Node.js) ---

const SCHEMA_FIELDS: Record<string, { label: string; type: string }> = {
  name: { label: "Company Name", type: "string" },
  type: { label: "Company Type", type: "enum" },
  desc: { label: "Description", type: "string" },
  website: { label: "Website URL", type: "string" },
  linkedinUrl: { label: "LinkedIn URL", type: "string" },
  location: { label: "Location", type: "string" },
  employees: { label: "Employee Count", type: "number" },
  notes: { label: "Internal Notes", type: "string" },
  contact_name: { label: "Contact Name", type: "string" },
  contact_title: { label: "Contact Title", type: "string" },
  contact_email: { label: "Contact Email", type: "string" },
  contact_linkedin: { label: "Contact LinkedIn", type: "string" },
  _skip: { label: "(Skip)", type: "skip" },
};

const HEURISTIC_PATTERNS: { pattern: RegExp; field: string }[] = [
  { pattern: /^(company|org|organization|account|business|firm)\s*(name)?$/i, field: "name" },
  { pattern: /^name$/i, field: "name" },
  { pattern: /^(type|category|segment|tier)$/i, field: "type" },
  { pattern: /^(desc|description|about|summary|overview)$/i, field: "desc" },
  { pattern: /^(website|url|web|homepage|domain|site)$/i, field: "website" },
  { pattern: /^company\s*url$/i, field: "website" },
  { pattern: /^(linkedin|linkedin\s*url|company\s*linkedin)$/i, field: "linkedinUrl" },
  { pattern: /^(location|city|state|address|hq|headquarters|region)$/i, field: "location" },
  { pattern: /^(employees|employee\s*count|size|headcount|team\s*size)$/i, field: "employees" },
  { pattern: /^(contact|contact\s*name|first\s*name|full\s*name|person|lead)$/i, field: "contact_name" },
  { pattern: /^(title|job\s*title|role|position)$/i, field: "contact_title" },
  { pattern: /^(email|e-?mail|contact\s*email)$/i, field: "contact_email" },
  { pattern: /^(contact\s*linkedin|person\s*linkedin|linkedin\s*profile)$/i, field: "contact_linkedin" },
  { pattern: /^(notes|comments|remarks|memo)$/i, field: "notes" },
];

function heuristicMap(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();

  for (const h of headers) {
    let matched = false;
    for (const { pattern, field } of HEURISTIC_PATTERNS) {
      if (pattern.test(h.trim()) && !used.has(field)) {
        mapping[h] = field;
        used.add(field);
        matched = true;
        break;
      }
    }
    if (!matched) {
      const lower = h.trim().toLowerCase();
      if (!used.has("name") && (lower.includes("company") || lower.includes("account"))) {
        mapping[h] = "name";
        used.add("name");
      } else if (!used.has("contact_email") && lower.includes("email")) {
        mapping[h] = "contact_email";
        used.add("contact_email");
      } else {
        mapping[h] = "_skip";
      }
    }
  }
  return mapping;
}

// --- Inline CSV/JSON parser (browser-safe) ---

function autoParse(text: string): { headers: string[]; rows: Record<string, string>[]; format: string } {
  const trimmed = text.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed);
      const arr = Array.isArray(data) ? data : [data];
      const headerSet = new Set<string>();
      for (const obj of arr) {
        if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj)) headerSet.add(key);
        }
      }
      return { headers: Array.from(headerSet), rows: arr, format: "json" };
    } catch {
      // Fall through to CSV
    }
  }

  // CSV parse
  let csv = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (csv.charCodeAt(0) === 0xfeff) csv = csv.slice(1);

  const firstLine = csv.split("\n")[0];
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const delimiter = tabs > commas ? "\t" : ",";

  const rawRows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQ) {
      if (ch === '"') {
        if (csv[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === delimiter) {
      row.push(field.trim()); field = "";
    } else if (ch === "\n") {
      row.push(field.trim()); field = "";
      rawRows.push(row); row = [];
    } else {
      field += ch;
    }
  }
  if (field || row.length) { row.push(field.trim()); rawRows.push(row); }

  if (rawRows.length === 0) return { headers: [], rows: [], format: "csv" };

  const headers = rawRows[0];
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    if (rawRows[i].length === 1 && rawRows[i][0] === "") continue;
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = rawRows[i][j] || "";
    }
    rows.push(obj);
  }

  return { headers, rows, format: "csv" };
}

// --- Fuzzy matching (browser-safe) ---

function normalizeCompanyName(name: string): string {
  return name.toLowerCase().trim()
    .replace(/\b(llc|inc|corp|ltd|co|company|group|capital|funding|financial|holdings)\b/gi, "")
    .replace(/[^a-z0-9]/g, "");
}

function fuzzyScore(a: string, b: string): number {
  const na = normalizeCompanyName(a);
  const nb = normalizeCompanyName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) {
    return 0.8 + 0.2 * Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
  }
  return 0;
}

// --- Types ---

type ImportStep = "paste" | "map" | "preview" | "done";

interface ImportedCompany {
  name: string;
  type: string;
  desc: string;
  website: string;
  linkedinUrl: string;
  location: string;
  employees: number;
  notes: string;
  contacts: { n: string; t: string; li?: string }[];
  _matchedExistingId?: number;
  _matchedExistingName?: string;
  _matchScore?: number;
}

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  companies: Company[];
  onImport: (newCompanies: Company[], updatedCompanies: Company[]) => void;
}

export function ImportDialog({ open, onClose, companies, onImport }: ImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("paste");
  const [rawInput, setRawInput] = useState("");
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [format, setFormat] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportedCompany[]>([]);

  const resetState = useCallback(() => {
    setStep("paste");
    setRawInput("");
    setParsedHeaders([]);
    setParsedRows([]);
    setFormat("");
    setMapping({});
    setImportResult([]);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  // Step 1 → 2: Parse input
  const handleParse = useCallback(() => {
    if (!rawInput.trim()) return;
    try {
      const { headers, rows, format: fmt } = autoParse(rawInput);
      if (headers.length === 0 || rows.length === 0) {
        toast.error("No data found. Check your input format.");
        return;
      }
      setParsedHeaders(headers);
      setParsedRows(rows);
      setFormat(fmt);
      setMapping(heuristicMap(headers));
      setStep("map");
    } catch {
      toast.error("Failed to parse input. Check your format.");
    }
  }, [rawInput]);

  // Step 2 → 3: Convert and match
  const handlePreview = useCallback(() => {
    const hasName = Object.values(mapping).includes("name");
    if (!hasName) {
      toast.error("You must map at least one column to 'Company Name'.");
      return;
    }

    // Build reverse map
    const reverseMap: Record<string, string> = {};
    for (const [header, field] of Object.entries(mapping)) {
      if (field !== "_skip") reverseMap[field] = header;
    }

    const getValue = (row: Record<string, string>, field: string) => {
      const header = reverseMap[field];
      return header ? (row[header] || "").trim() : "";
    };

    // Group by company name
    const companyMap = new Map<string, ImportedCompany>();
    for (const row of parsedRows) {
      const companyName = getValue(row, "name");
      if (!companyName) continue;

      if (!companyMap.has(companyName)) {
        companyMap.set(companyName, {
          name: companyName,
          type: getValue(row, "type") || "TAM",
          desc: getValue(row, "desc"),
          website: getValue(row, "website"),
          linkedinUrl: getValue(row, "linkedinUrl"),
          location: getValue(row, "location"),
          employees: parseInt(getValue(row, "employees")) || 0,
          notes: getValue(row, "notes"),
          contacts: [],
        });
      }

      const company = companyMap.get(companyName)!;
      const contactName = getValue(row, "contact_name");
      if (contactName && !company.contacts.some(c => c.n === contactName)) {
        company.contacts.push({
          n: contactName,
          t: getValue(row, "contact_title") || "",
          li: getValue(row, "contact_linkedin") || undefined,
        });
      }
    }

    // Fuzzy match against existing
    const results = Array.from(companyMap.values());
    for (const imp of results) {
      const normImp = normalizeCompanyName(imp.name);
      let bestScore = 0;
      let bestMatch: Company | null = null;

      for (const existing of companies) {
        const score = fuzzyScore(imp.name, existing.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = existing;
        }
        // Also check normalized exact
        if (normalizeCompanyName(existing.name) === normImp) {
          bestScore = 1;
          bestMatch = existing;
          break;
        }
      }

      if (bestMatch && bestScore >= 0.75) {
        imp._matchedExistingId = bestMatch.id;
        imp._matchedExistingName = bestMatch.name;
        imp._matchScore = bestScore;
      }
    }

    setImportResult(results);
    setStep("preview");
  }, [mapping, parsedRows, companies]);

  // Step 3 → 4: Confirm import
  const handleConfirmImport = useCallback(() => {
    const maxExistingId = companies.reduce((max, c) => Math.max(max, c.id), 0);
    const newCompanies: Company[] = [];
    const updatedCompanies: Company[] = [];
    let nextId = maxExistingId + 1;

    for (const imp of importResult) {
      if (imp._matchedExistingId) {
        // Update existing — only fill empty fields
        const existing = companies.find(c => c.id === imp._matchedExistingId);
        if (existing) {
          const updated = { ...existing };
          let changed = false;
          if (imp.desc && !existing.desc) { updated.desc = imp.desc; changed = true; }
          if (imp.website && !existing.website) { updated.website = imp.website; changed = true; }
          if (imp.linkedinUrl && !existing.linkedinUrl) { updated.linkedinUrl = imp.linkedinUrl; changed = true; }
          if (imp.location && !existing.location) { updated.location = imp.location; changed = true; }
          if (imp.employees && !existing.employees) { updated.employees = imp.employees; changed = true; }

          // Add new contacts
          const updatedContacts = [...(existing.contacts || [])];
          for (const c of imp.contacts) {
            if (!updatedContacts.some(ec => ec.n.toLowerCase() === c.n.toLowerCase())) {
              updatedContacts.push({ n: c.n, t: c.t });
              changed = true;
            }
          }
          updated.contacts = updatedContacts;

          if (imp.notes) {
            updated.notes = existing.notes ? existing.notes + "\n[Import] " + imp.notes : "[Import] " + imp.notes;
            changed = true;
          }

          if (!updated.source) updated.source = [];
          if (!updated.source.includes("import")) {
            updated.source = [...updated.source, "import"];
            changed = true;
          }

          if (changed) updatedCompanies.push(updated);
        }
      } else {
        // New company
        newCompanies.push({
          id: nextId++,
          name: imp.name,
          type: (imp.type as Company["type"]) || "TAM",
          priority: 6,
          phase: 0,
          booth: false,
          contacts: imp.contacts.map(c => ({ n: c.n, t: c.t })),
          desc: imp.desc,
          notes: imp.notes ? "[Import] " + imp.notes : "",
          news: [],
          ice: "",
          icebreakers: [],
          tp: [],
          leaders: imp.contacts.map(c => ({
            n: c.n,
            t: c.t,
            bg: "",
            li: c.li,
          })),
          ask: "",
          location: imp.location,
          employees: imp.employees || 0,
          website: imp.website,
          linkedinUrl: imp.linkedinUrl,
          source: ["import"],
        });
      }
    }

    onImport(newCompanies, updatedCompanies);
    toast.success(`Imported ${newCompanies.length} new + ${updatedCompanies.length} updated companies`);
    setStep("done");
  }, [importResult, companies, onImport]);

  // Derived counts for preview
  const previewStats = useMemo(() => {
    const updates = importResult.filter(r => r._matchedExistingId);
    const newOnes = importResult.filter(r => !r._matchedExistingId);
    return { updates: updates.length, new: newOnes.length, total: importResult.length };
  }, [importResult]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data
          </DialogTitle>
          <DialogDescription>
            {step === "paste" && "Paste CSV, TSV, or JSON data to import companies and contacts."}
            {step === "map" && "Review field mapping. Adjust any incorrect mappings below."}
            {step === "preview" && `Preview: ${previewStats.new} new, ${previewStats.updates} updates out of ${previewStats.total} companies.`}
            {step === "done" && "Import complete!"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground px-1">
          {(["paste", "map", "preview", "done"] as ImportStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span className={step === s ? "text-primary font-medium" : s === "done" && step === "done" ? "text-green-400 font-medium" : ""}>
                {i + 1}. {s === "paste" ? "Paste" : s === "map" ? "Map" : s === "preview" ? "Preview" : "Done"}
              </span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Step content */}
        <div className="flex-1 min-h-0 overflow-auto">
          {step === "paste" && (
            <div className="space-y-3">
              <textarea
                className="w-full h-64 bg-muted/30 border border-border rounded-md p-3 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={`Paste your data here...\n\nSupported formats:\n- CSV (comma-separated)\n- TSV (tab-separated)\n- JSON (array of objects)\n\nExample CSV:\nCompany,Contact,Title,Email,Website\nAcme Corp,John Doe,CEO,john@acme.com,acme.com\nBeta Inc,Jane Smith,VP Sales,jane@beta.io,beta.io`}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                Tip: Export from HubSpot, Google Sheets, or any CRM as CSV.
              </div>
            </div>
          )}

          {step === "map" && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {format.toUpperCase()} detected. {parsedRows.length} rows, {parsedHeaders.length} columns.
              </div>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {parsedHeaders.map((header) => (
                    <div key={header} className="flex items-center gap-3 text-sm">
                      <span className="w-40 truncate font-mono text-xs text-muted-foreground" title={header}>
                        {header}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <select
                        className="flex-1 bg-muted/30 border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={mapping[header] || "_skip"}
                        onChange={(e) => setMapping(prev => ({ ...prev, [header]: e.target.value }))}
                      >
                        {Object.entries(SCHEMA_FIELDS).map(([key, info]) => (
                          <option key={key} value={key}>{info.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {/* Sample data preview */}
              <div className="text-xs text-muted-foreground">
                Sample: {parsedRows.slice(0, 2).map((row, i) => {
                  const nameField = Object.keys(mapping).find(k => mapping[k] === "name");
                  const name = nameField ? row[nameField] : "(no name mapped)";
                  return <Badge key={i} variant="outline" className="mr-1">{name}</Badge>;
                })}
              </div>
            </div>
          )}

          {step === "preview" && (
            <ScrollArea className="h-72">
              <div className="space-y-2">
                {importResult.map((imp, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted/20">
                    {imp._matchedExistingId ? (
                      <RefreshCw className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <Plus className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{imp.name}</div>
                      {imp._matchedExistingName && (
                        <div className="text-xs text-amber-400/80">
                          Matches: &quot;{imp._matchedExistingName}&quot; ({Math.round((imp._matchScore || 0) * 100)}%)
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-1 mt-0.5">
                        {imp.contacts.length > 0 && <span>{imp.contacts.length} contact{imp.contacts.length > 1 ? "s" : ""}</span>}
                        {imp.website && <span>website</span>}
                        {imp.location && <span>{imp.location}</span>}
                        {imp.employees > 0 && <span>{imp.employees} employees</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {imp._matchedExistingId ? "Update" : "New"}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-400" />
              </div>
              <div className="text-sm">
                <span className="font-medium">{previewStats.new} new</span> and{" "}
                <span className="font-medium">{previewStats.updates} updated</span> companies imported.
              </div>
              <div className="text-xs text-muted-foreground">
                Data stored in your browser. It will persist across page refreshes.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "paste" && (
            <Button onClick={handleParse} disabled={!rawInput.trim()}>
              Parse Data <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === "map" && (
            <>
              <Button variant="outline" onClick={() => setStep("paste")}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={handlePreview}>
                Preview Import <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("map")}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleConfirmImport} disabled={importResult.length === 0}>
                <Check className="mr-1 h-4 w-4" />
                Import {previewStats.total} Companies
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
