"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  ChevronRight,
  Copy,
  Check,
  Globe,
  Lock,
  Database,
  Brain,
  Activity,
  BarChart3,
  Users,
  FileText,
  Briefcase,
  Building2,
  Newspaper,
  Target,
  Play,
  Loader2,
  Calendar,
  Package,
  Landmark,
  Shield,
  ScrollText,
  Bell,
  PenLine,
  GitBranch,
  MessageSquare,
  Sparkles,
  MessageCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Skill / Tool definitions
// ---------------------------------------------------------------------------

type ToolCategory = "read" | "write" | "intelligence" | "regulatory" | "enrichment";

interface ToolParam {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

interface ToolDef {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  method: "GET" | "POST" | "DELETE" | "PATCH";
  path: string;
  auth: "tool-key" | "none";
  params?: ToolParam[];
  responseHint?: string;
  icon: React.ComponentType<{ className?: string }>;
  kiketTriggers?: string[];
}

const TOOLS: ToolDef[] = [
  // --- Read tools ---
  {
    id: "search",
    name: "Search Companies",
    description: "Find companies by text query, category, priority, or location.",
    category: "read",
    method: "GET",
    path: "/api/tools/search",
    auth: "tool-key",
    icon: Search,
    params: [
      { name: "q", type: "string", description: "Text search query" },
      { name: "category", type: "string", description: "funder|iso|marketplace|bank|technology|competitor|service_provider" },
      { name: "priority", type: "number", description: "1-4 (1=P0, 4=TAM)" },
      { name: "location", type: "string", description: "City or state filter" },
      { name: "hasEmail", type: "boolean", description: "Filter to companies with email contacts" },
      { name: "limit", type: "number", description: "Max results (default 10)" },
    ],
    kiketTriggers: ["search for companies", "find funders in", "companies with"],
  },
  {
    id: "company",
    name: "Get Company Profile",
    description: "Full company profile by ID including leaders, news, icebreakers, and notes.",
    category: "read",
    method: "GET",
    path: "/api/tools/company/{id}",
    auth: "tool-key",
    icon: Building2,
    params: [
      { name: "id", type: "number", required: true, description: "Company ID from search results" },
    ],
    kiketTriggers: ["tell me about", "company profile", "what do we know about"],
  },
  {
    id: "leader",
    name: "Search Leaders",
    description: "Search for leaders/executives by name across all companies.",
    category: "read",
    method: "GET",
    path: "/api/tools/leader",
    auth: "tool-key",
    icon: Users,
    params: [
      { name: "q", type: "string", required: true, description: "Leader name to search" },
    ],
    kiketTriggers: ["find leader", "who is", "search for person"],
  },
  {
    id: "brief",
    name: "Get Outreach Brief",
    description: "Formatted outreach brief for a company with optional personalization.",
    category: "read",
    method: "GET",
    path: "/api/tools/brief/{id}",
    auth: "tool-key",
    icon: Briefcase,
    params: [
      { name: "id", type: "number", required: true, description: "Company ID" },
      { name: "format", type: "string", description: "short|full|email-draft" },
      { name: "leaderName", type: "string", description: "Personalize for this leader" },
    ],
    kiketTriggers: ["outreach brief", "prepare for meeting", "email draft for"],
  },
  {
    id: "stats",
    name: "Get Market Stats",
    description: "Aggregate statistics across the company database.",
    category: "read",
    method: "GET",
    path: "/api/tools/stats",
    auth: "tool-key",
    icon: BarChart3,
    params: [
      { name: "category", type: "string", description: "Filter by category" },
      { name: "priority", type: "number", description: "Filter by priority" },
      { name: "location", type: "string", description: "Filter by location" },
    ],
    kiketTriggers: ["market stats", "how many companies", "breakdown by"],
  },
  {
    id: "news",
    name: "Get Recent News",
    description: "Recent news headlines across tracked companies.",
    category: "read",
    method: "GET",
    path: "/api/tools/news",
    auth: "tool-key",
    icon: Newspaper,
    params: [
      { name: "limit", type: "number", description: "Max results (default 10)" },
      { name: "priority", type: "number", description: "Filter by company priority" },
      { name: "category", type: "string", description: "Filter by company category" },
    ],
    kiketTriggers: ["recent news", "what's happening", "latest headlines"],
  },
  {
    id: "similar",
    name: "Find Similar Companies",
    description: "Companies similar to a given company based on category, size, and location.",
    category: "read",
    method: "GET",
    path: "/api/tools/similar/{id}",
    auth: "tool-key",
    icon: Target,
    params: [
      { name: "id", type: "number", required: true, description: "Company ID" },
      { name: "limit", type: "number", description: "Max results (default 5)" },
    ],
    kiketTriggers: ["similar to", "companies like", "find more like"],
  },
  {
    id: "team-notes",
    name: "Get Team Notes",
    description: "Chat notes and engagement records for a company.",
    category: "read",
    method: "GET",
    path: "/api/tools/team-notes/{companyId}",
    auth: "tool-key",
    icon: MessageSquare,
    params: [
      { name: "companyId", type: "number", required: true, description: "Company ID" },
    ],
    kiketTriggers: ["team notes for", "what have we discussed about"],
  },
  {
    id: "account-memory-get",
    name: "Get Account Memory",
    description: "Retrieve persistent memories (strategies, interactions, insights) for a company.",
    category: "read",
    method: "GET",
    path: "/api/tools/account-memory",
    auth: "tool-key",
    icon: Brain,
    params: [
      { name: "companyId", type: "number", required: true, description: "Company ID" },
    ],
    kiketTriggers: ["what do I remember about", "account memory for"],
  },
  {
    id: "morning-briefing",
    name: "Get Morning Briefing",
    description: "Today's prioritized action items: follow-ups, stale deals, hot signals, LinkedIn activity.",
    category: "read",
    method: "GET",
    path: "/api/tools/morning-briefing",
    auth: "tool-key",
    icon: Calendar,
    responseHint: "summary text, actions array (high/medium/low priority)",
    kiketTriggers: ["morning briefing", "what should I do today", "action items"],
  },
  {
    id: "products",
    name: "Get Products",
    description: "HyperVerge product catalog with features, metrics, demos, and collateral.",
    category: "read",
    method: "GET",
    path: "/api/tools/products",
    auth: "tool-key",
    icon: Package,
    kiketTriggers: ["our products", "product catalog", "what do we sell"],
  },
  {
    id: "pipeline-status",
    name: "Get Pipeline Status",
    description: "Pipeline stage and deal status for a specific company.",
    category: "read",
    method: "GET",
    path: "/api/tools/pipeline-status",
    auth: "tool-key",
    icon: GitBranch,
    params: [
      { name: "companyId", type: "number", required: true, description: "Company ID" },
    ],
    kiketTriggers: ["pipeline status for", "what stage is", "deal status"],
  },
  {
    id: "daily-brief",
    name: "Get Daily Brief",
    description: "Today's intelligence digest: LinkedIn activity, company news, hooks updated, recommended actions.",
    category: "intelligence",
    method: "GET",
    path: "/api/tools/daily-brief",
    auth: "tool-key",
    icon: Sparkles,
    params: [
      { name: "date", type: "string", description: "YYYY-MM-DD (defaults to today)" },
    ],
    kiketTriggers: ["what happened today", "daily update", "intelligence brief"],
  },
  {
    id: "enrichment-feed",
    name: "Get Enrichment Feed",
    description: "Recent enrichment events: LinkedIn activity, hook updates, company intelligence changes.",
    category: "enrichment",
    method: "GET",
    path: "/api/enrichment-feed",
    auth: "none",
    icon: Activity,
    params: [
      { name: "limit", type: "number", description: "Max items (default 20, max 100)" },
      { name: "since", type: "string", description: "YYYY-MM-DD filter" },
    ],
    kiketTriggers: ["enrichment activity", "what profiles were updated", "recent LinkedIn activity"],
  },
  {
    id: "enrichment-health",
    name: "Enrichment Health",
    description: "Pipeline health monitoring: last run times, event counts, freshness alerts.",
    category: "enrichment",
    method: "GET",
    path: "/api/enrichment-health",
    auth: "none",
    icon: Activity,
    responseHint: "status (healthy/warning), alerts, today/48h stats, lastRuns",
  },

  // --- Regulatory ---
  {
    id: "sba",
    name: "Search SBA Lenders",
    description: "Check if a company is an SBA 7(a) approved lender with lending volume data.",
    category: "regulatory",
    method: "GET",
    path: "/api/tools/sba",
    auth: "tool-key",
    icon: Landmark,
    params: [
      { name: "name", type: "string", required: true, description: "Lender name" },
    ],
    responseHint: "totalLoans, totalVolume, avgLoanSize, latestFiscalYear",
    kiketTriggers: ["SBA lender", "SBA volume for", "is this an SBA lender"],
  },
  {
    id: "fdic",
    name: "Search FDIC Banks",
    description: "FDIC-insured bank financial data: assets, deposits, loans, income, regulatory ratios.",
    category: "regulatory",
    method: "GET",
    path: "/api/tools/fdic",
    auth: "tool-key",
    icon: Shield,
    params: [
      { name: "name", type: "string", description: "Bank name" },
      { name: "cert", type: "string", description: "FDIC certificate number" },
    ],
    responseHint: "total assets, deposits, regulatory status",
    kiketTriggers: ["FDIC data", "bank financials", "is this bank regulated"],
  },
  {
    id: "sec",
    name: "Search SEC Filings",
    description: "Public company financial data from SEC EDGAR: revenue, net income, assets, filings.",
    category: "regulatory",
    method: "GET",
    path: "/api/tools/sec",
    auth: "tool-key",
    icon: ScrollText,
    params: [
      { name: "name", type: "string", required: true, description: "Company name" },
    ],
    responseHint: "revenue, net income, total assets, recent filings",
    kiketTriggers: ["SEC filings", "public company financials", "revenue for"],
  },

  // --- Write tools ---
  {
    id: "company-update",
    name: "Update Company",
    description: "Update a company's data: description, news, leaders, notes, contacts, etc.",
    category: "write",
    method: "POST",
    path: "/api/tools/company-update",
    auth: "tool-key",
    icon: PenLine,
    params: [
      { name: "companyId", type: "number", required: true, description: "Company ID" },
      { name: "updates", type: "object", required: true, description: "Fields to update (desc, news[], leaders[], notes_append, etc.)" },
      { name: "mode", type: "string", description: "merge (append arrays) | replace (overwrite)" },
    ],
    kiketTriggers: ["update company", "add note to", "change description"],
  },
  {
    id: "account-memory-set",
    name: "Store Account Memory",
    description: "Save a persistent memory about a company (strategy, interaction, insight, preference).",
    category: "write",
    method: "POST",
    path: "/api/tools/account-memory",
    auth: "tool-key",
    icon: Brain,
    params: [
      { name: "companyId", type: "number", required: true, description: "Company ID" },
      { name: "memoryType", type: "string", required: true, description: "strategy|interaction|insight|preference" },
      { name: "content", type: "string", required: true, description: "Memory content" },
      { name: "source", type: "string", description: "Source (defaults to 'kiket')" },
    ],
    kiketTriggers: ["remember that", "save insight about", "note for next time"],
  },
  {
    id: "account-memory-delete",
    name: "Delete Account Memory",
    description: "Remove a stale or incorrect memory entry.",
    category: "write",
    method: "DELETE",
    path: "/api/tools/account-memory",
    auth: "tool-key",
    icon: Brain,
    params: [
      { name: "id", type: "string", required: true, description: "Memory UUID" },
    ],
    kiketTriggers: ["forget about", "remove memory"],
  },
  {
    id: "log-engagement",
    name: "Log Engagement",
    description: "Record a contact-level engagement (email, call, meeting, LinkedIn, etc.).",
    category: "write",
    method: "POST",
    path: "/api/tools/log-engagement",
    auth: "tool-key",
    icon: MessageSquare,
    params: [
      { name: "companyId", type: "number", required: true, description: "Company ID" },
      { name: "channel", type: "string", required: true, description: "email|linkedin|call|meeting|imessage|note" },
      { name: "contactName", type: "string", description: "Person contacted" },
      { name: "notes", type: "string", description: "Engagement details" },
    ],
    kiketTriggers: ["log a call with", "I just emailed", "record meeting"],
  },
  {
    id: "update-pipeline",
    name: "Update Pipeline",
    description: "Move a company to a new pipeline stage.",
    category: "write",
    method: "POST",
    path: "/api/tools/update-pipeline",
    auth: "tool-key",
    icon: GitBranch,
    params: [
      { name: "companyId", type: "number", required: true, description: "Company ID" },
      { name: "stage", type: "string", required: true, description: "researched|contacted|engaged|demo|proposal|won|lost" },
    ],
    kiketTriggers: ["move to demo stage", "update pipeline for", "mark as contacted"],
  },
  {
    id: "set-reminder",
    name: "Set Reminder",
    description: "Create a follow-up reminder for a company.",
    category: "write",
    method: "POST",
    path: "/api/tools/set-reminder",
    auth: "tool-key",
    icon: Bell,
    params: [
      { name: "companyId", type: "number", required: true, description: "Company ID" },
      { name: "dueDate", type: "string", required: true, description: "YYYY-MM-DD" },
      { name: "note", type: "string", description: "Reminder description" },
    ],
    kiketTriggers: ["remind me to", "follow up with", "set reminder for"],
  },
  {
    id: "add-note",
    name: "Add Note",
    description: "Append a note to a company's record.",
    category: "write",
    method: "POST",
    path: "/api/tools/add-note",
    auth: "tool-key",
    icon: FileText,
    params: [
      { name: "companyId", type: "number", required: true, description: "Company ID" },
      { name: "note", type: "string", required: true, description: "Note content" },
    ],
    kiketTriggers: ["add note to", "note about"],
  },
  {
    id: "research-request",
    name: "Request Research Refresh",
    description: "Queue a background research refresh. EC2 worker gathers fresh news, website data, and synthesizes updates.",
    category: "write",
    method: "POST",
    path: "/api/research-requests",
    auth: "tool-key",
    icon: Database,
    params: [
      { name: "companyId", type: "number", required: true, description: "Company ID" },
      { name: "triggerType", type: "string", description: "manual|scheduled|signal" },
      { name: "priority", type: "number", description: "1-5 (lower = higher priority)" },
    ],
    kiketTriggers: ["refresh research for", "update data on", "re-research"],
  },
  {
    id: "chat-history",
    name: "Chat History",
    description: "Read recent Kiket chat history for a user. Returns conversations with summaries and recent messages.",
    category: "read",
    method: "GET",
    path: "/api/tools/chat-history",
    auth: "tool-key",
    icon: MessageCircle,
    params: [
      { name: "user_email", type: "string", required: true, description: "User email address" },
      { name: "limit", type: "number", description: "Max conversations (default 10)" },
    ],
    kiketTriggers: ["what did we talk about", "our last conversation", "chat history"],
  },
  {
    id: "chat-summarize",
    name: "Summarize Chat",
    description: "Trigger summarization of unsummarized messages in a conversation. Returns existing summary + unsummarized messages for Kiket to process.",
    category: "write",
    method: "POST",
    path: "/api/tools/chat-history",
    auth: "tool-key",
    icon: MessageCircle,
    params: [
      { name: "conversation_id", type: "string", required: true, description: "Conversation UUID" },
    ],
    kiketTriggers: ["summarize our chat", "recap conversation"],
  },
];

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

const CATEGORIES: { id: ToolCategory; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: "read", label: "Read", icon: Globe, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { id: "write", label: "Write", icon: PenLine, color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  { id: "intelligence", label: "Intelligence", icon: Sparkles, color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  { id: "regulatory", label: "Regulatory", icon: Landmark, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  { id: "enrichment", label: "Enrichment", icon: Activity, color: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
];

// ---------------------------------------------------------------------------
// Helper: copy curl example
// ---------------------------------------------------------------------------

function buildCurl(tool: ToolDef): string {
  const base = "https://us.hyperverge.space";
  const method = tool.method === "GET" ? "" : `-X ${tool.method} `;
  const authHeader = tool.auth === "tool-key" ? `\\\n  -H "X-Tool-Key: $EVENTIQ_API_KEY" ` : "";
  const path = tool.path.replace(/\{(\w+)\}/g, ":$1");

  if (tool.method === "GET") {
    const qp = tool.params?.filter(p => !tool.path.includes(`{${p.name}}`)).map(p => `${p.name}=...`).join("&");
    const qs = qp ? `?${qp}` : "";
    return `curl -s "${base}${path}${qs}" ${authHeader}`.trim();
  }
  const bodyFields = tool.params?.reduce((acc, p) => {
    acc[p.name] = p.type === "number" ? 0 : p.type === "object" ? {} : "...";
    return acc;
  }, {} as Record<string, unknown>);
  return `curl -s ${method}"${base}${path}" ${authHeader}\\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(bodyFields, null, 2)}'`.trim();
}

// ---------------------------------------------------------------------------
// ToolCard component
// ---------------------------------------------------------------------------

function ToolCard({ tool }: { tool: ToolDef }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tryItOpen, setTryItOpen] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [tryResult, setTryResult] = useState<string | null>(null);
  const [tryLoading, setTryLoading] = useState(false);
  const Icon = tool.icon;
  const cat = CATEGORIES.find(c => c.id === tool.category)!;

  const handleCopy = () => {
    navigator.clipboard.writeText(buildCurl(tool));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTryIt = async () => {
    setTryLoading(true);
    setTryResult(null);
    try {
      const base = "";
      let url = base + tool.path.replace(/\{(\w+)\}/g, (_, k) => paramValues[k] || "");

      if (tool.method === "GET") {
        const qp = (tool.params || [])
          .filter(p => !tool.path.includes(`{${p.name}}`) && paramValues[p.name])
          .map(p => `${p.name}=${encodeURIComponent(paramValues[p.name])}`)
          .join("&");
        if (qp) url += `?${qp}`;
        const res = await fetch(url);
        const data = await res.json();
        setTryResult(JSON.stringify(data, null, 2));
      } else {
        const body: Record<string, unknown> = {};
        for (const p of tool.params || []) {
          if (paramValues[p.name]) {
            body[p.name] = p.type === "number" ? Number(paramValues[p.name]) : paramValues[p.name];
          }
        }
        const res = await fetch(url, {
          method: tool.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        setTryResult(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setTryResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTryLoading(false);
    }
  };

  return (
    <Card className="p-0 shadow-none overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 hover:bg-accent/50 transition-colors text-left">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${cat.color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{tool.name}</span>
              <Badge variant="outline" className="text-xs px-1.5 py-0 font-mono">
                {tool.method}
              </Badge>
              {tool.auth === "tool-key" && (
                <Lock className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
            {/* Endpoint */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Endpoint</div>
              <code className="text-xs bg-muted/50 px-2 py-1 rounded block font-mono">
                {tool.method} {tool.path}
              </code>
            </div>

            {/* Parameters */}
            {tool.params && tool.params.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Parameters</div>
                <div className="space-y-1">
                  {tool.params.map(p => (
                    <div key={p.name} className="flex items-start gap-2 text-xs">
                      <code className="font-mono text-foreground bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
                        {p.name}
                      </code>
                      <Badge variant="outline" className="text-xs px-1 py-0 shrink-0 font-mono">
                        {p.type}
                      </Badge>
                      {p.required && (
                        <span className="text-amber-400 text-xs shrink-0">req</span>
                      )}
                      <span className="text-muted-foreground">{p.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response hint */}
            {tool.responseHint && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Response</div>
                <p className="text-xs text-muted-foreground">{tool.responseHint}</p>
              </div>
            )}

            {/* Kiket triggers */}
            {tool.kiketTriggers && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Kiket understands</div>
                <div className="flex flex-wrap gap-1">
                  {tool.kiketTriggers.map(t => (
                    <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0">
                      &ldquo;{t}&rdquo;
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* cURL example */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">cURL</span>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto font-mono whitespace-pre-wrap break-all">
                {buildCurl(tool)}
              </pre>
            </div>

            {/* Try It */}
            {tool.auth !== "tool-key" && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => setTryItOpen(!tryItOpen)}
                >
                  <Play className="h-3 w-3" />
                  Try It
                </Button>

                {tryItOpen && (
                  <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-2">
                    {(tool.params || []).map(p => (
                      <div key={p.name} className="flex items-center gap-2">
                        <label className="text-xs font-mono w-28 shrink-0 text-muted-foreground">{p.name}</label>
                        <Input
                          className="h-7 text-xs font-mono"
                          placeholder={p.description}
                          value={paramValues[p.name] || ""}
                          onChange={(e) => setParamValues({ ...paramValues, [p.name]: e.target.value })}
                        />
                      </div>
                    ))}
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={handleTryIt}
                      disabled={tryLoading}
                    >
                      {tryLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                      Execute
                    </Button>
                    {tryResult && (
                      <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-48 font-mono border border-border">
                        {tryResult}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SkillsTab
// ---------------------------------------------------------------------------

export function SkillsTab() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ToolCategory | "all">("all");

  const filtered = TOOLS.filter(t => {
    if (activeCategory !== "all" && t.category !== activeCategory) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.path.toLowerCase().includes(q) ||
      t.kiketTriggers?.some(tr => tr.toLowerCase().includes(q))
    );
  });

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    tools: filtered.filter(t => t.category === cat.id),
  })).filter(g => g.tools.length > 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-3 border-b border-border/50 space-y-3">
        <div>
          <h2 className="text-lg font-bold">Kiket Skills</h2>
          <p className="text-xs text-muted-foreground">
            {TOOLS.length} API tools that power Kiket&apos;s intelligence
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tools, endpoints, or triggers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={activeCategory === "all" ? "default" : "outline"}
            className={`cursor-pointer text-xs px-2 py-0.5 ${
              activeCategory === "all"
                ? "bg-brand/20 text-brand border-brand/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveCategory("all")}
          >
            All ({TOOLS.length})
          </Badge>
          {CATEGORIES.map(cat => {
            const count = TOOLS.filter(t => t.category === cat.id).length;
            const CatIcon = cat.icon;
            return (
              <Badge
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                className={`cursor-pointer text-xs px-2 py-0.5 gap-1 ${
                  activeCategory === cat.id
                    ? cat.color
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <CatIcon className="h-3 w-3" />
                {cat.label} ({count})
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Tools list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {grouped.map(group => (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-2">
                <group.icon className={`h-4 w-4 ${group.color.split(" ")[0]}`} />
                <h3 className="text-sm font-semibold">{group.label}</h3>
                <span className="text-xs text-muted-foreground">({group.tools.length})</span>
              </div>
              <div className="space-y-2">
                {group.tools.map(tool => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tools match your search</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
