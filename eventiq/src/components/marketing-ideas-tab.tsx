"use client";

import { useMemo } from "react";
import { Company } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Target, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface MarketingIdeasTabProps {
  companies: Company[];
}

interface PrioritizedAccount {
  id: number;
  name: string;
  type: Company["type"];
  priority: number;
  score: number;
  signalScore: number;
  ricpContacts: string[];
}

const RICP_TITLE_RE =
  /chief operating officer|\bcoo\b|chief risk officer|\bcro\b|chief credit|credit officer|head of risk|risk management|underwrit/i;

const GTM_EXPERIMENTS = [
  {
    name: "Trigger-Based Gifting 2.0",
    channel: "Direct mail + email + LinkedIn",
    play:
      "Send personalized gifts only on hard triggers (facility raise, product launch, leadership move) and follow with a 3-touch sequence in 5 days.",
    kpi: "Gifted-account meeting rate and SQL rate",
  },
  {
    name: "Underwriting Leaders Roundtable",
    channel: "Virtual event + referrals",
    play:
      "Monthly 8-10 person invite-only session for CRO/COO/Head of Underwriting on fraud, verification, and turnaround-time benchmarks.",
    kpi: "Attendee-to-meeting conversion",
  },
  {
    name: "MCA Risk Benchmark Teardown",
    channel: "Content + outbound",
    play:
      "Publish a short benchmark note (approval latency, fraud vectors, docs error rates) and use it as outreach hook to top ICPs.",
    kpi: "Content-assisted meetings",
  },
  {
    name: "Partner Co-Marketing Pods",
    channel: "CRM/LOS/ISO ecosystems",
    play:
      "Joint webinars and account swaps with complementary vendors already selling into MCA lenders.",
    kpi: "Partner-sourced meetings and SQLs",
  },
  {
    name: "Exec Office-Hours CTA",
    channel: "Founder/leader-led outbound",
    play:
      "Offer 20-minute 'risk stack review' office-hours with CRO/COO targets on a fixed weekly slot.",
    kpi: "Office-hours booking rate",
  },
  {
    name: "Champion Referral Loop",
    channel: "Warm intro engine",
    play:
      "After every positive meeting, ask for 2 intros to peer operators and route to BDR queue immediately.",
    kpi: "Intro-sourced SQLs",
  },
  {
    name: "Event Follow-Up Sprint",
    channel: "Post-event multi-touch",
    play:
      "Run a 10-day post-event sprint with role-specific messaging, recap assets, and next-step asks.",
    kpi: "Event-contact SQL conversion in 30 days",
  },
  {
    name: "Account Pods by Sub-Vertical",
    channel: "ABM + outbound",
    play:
      "Create pods (MCA, factoring, equipment finance, embedded lending) and assign a dedicated sequence + collateral pack to each pod.",
    kpi: "Pod-level meeting and SQL velocity",
  },
];

function uniqueRicpContacts(company: Company): string[] {
  const people = [
    ...(company.leaders || []).map((p) => ({ n: p.n, t: p.t })),
    ...(company.contacts || []).map((p) => ({ n: p.n, t: p.t })),
  ];

  const matches = people.filter((p) => RICP_TITLE_RE.test(p.t || ""));
  const dedup = new Map<string, string>();

  for (const person of matches) {
    const key = `${person.n}|${person.t}`.toLowerCase();
    if (!dedup.has(key)) {
      dedup.set(key, `${person.n} (${person.t})`);
    }
  }

  return [...dedup.values()];
}

function signalScore(company: Company): number {
  const text = (company.news || [])
    .map((n) => `${n.h || ""} ${n.s || ""} ${n.d || ""} ${n.p || ""}`)
    .join(" ")
    .toLowerCase();

  let score = 0;
  if (/2026/.test(text)) score += 4;
  else if (/2025/.test(text)) score += 2;

  if (/credit facility|warehouse|abs|securit|raised|series|funding|billion|million/.test(text)) {
    score += 3;
  }
  if (/launch|new product|partnership|api|embedded|expansion|hiring|appointed/.test(text)) {
    score += 2;
  }

  return score;
}

function fitScore(company: Company): number {
  let score = 0;
  if (company.type === "SQO") score += 12;
  else if (company.type === "Client") score += 10;
  else if (company.type === "ICP") score += 8;
  else score += 3;

  if (company.priority <= 2) score += 4;
  if (company.clear) score += 2;
  if (company.booth) score += 1;

  return score;
}

function buildPrioritizedAccounts(companies: Company[]): PrioritizedAccount[] {
  return companies
    .filter((c) => ["SQO", "Client", "ICP"].includes(c.type) && c.priority <= 3)
    .map((company) => {
      const ricpContacts = uniqueRicpContacts(company);
      const signal = signalScore(company);
      const score =
        fitScore(company) +
        signal +
        (ricpContacts.length > 0 ? 4 : 0) +
        Math.min((company.leaders || []).length, 4);

      return {
        id: company.id,
        name: company.name,
        type: company.type,
        priority: company.priority,
        score,
        signalScore: signal,
        ricpContacts,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function typeClass(type: Company["type"]): string {
  if (type === "SQO") return "text-[var(--sqo)] border-[var(--sqo)]/40 bg-[var(--sqo)]/10";
  if (type === "Client") return "text-[var(--client)] border-[var(--client)]/40 bg-[var(--client)]/10";
  if (type === "ICP") return "text-[var(--icp)] border-[var(--icp)]/40 bg-[var(--icp)]/10";
  return "text-[var(--tam)] border-[var(--tam)]/40 bg-[var(--tam)]/10";
}

export function MarketingIdeasTab({ companies }: MarketingIdeasTabProps) {
  const prioritized = useMemo(() => buildPrioritizedAccounts(companies), [companies]);
  const goNow = useMemo(() => prioritized.slice(0, 25), [prioritized]);
  const tamBreakout = useMemo(
    () =>
      companies
        .filter((c) => c.type === "TAM" && c.priority <= 2)
        .map((company) => {
          const ricpContacts = uniqueRicpContacts(company);
          const signal = signalScore(company);
          const score =
            fitScore(company) +
            signal +
            (ricpContacts.length > 0 ? 4 : 0) +
            Math.min((company.leaders || []).length, 4);
          return {
            id: company.id,
            name: company.name,
            type: company.type,
            priority: company.priority,
            score,
            signalScore: signal,
            ricpContacts,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 20),
    [companies]
  );
  const ricpGaps = useMemo(
    () => prioritized.filter((a) => a.ricpContacts.length === 0).slice(0, 30),
    [prioritized]
  );

  const ricpCoverage = useMemo(() => {
    if (prioritized.length === 0) return 0;
    const covered = prioritized.filter((a) => a.ricpContacts.length > 0).length;
    return Math.round((covered / prioritized.length) * 100);
  }, [prioritized]);

  const handleCopyGoNow = async () => {
    const text = goNow
      .map(
        (a, i) =>
          `${i + 1}. ${a.name} (${a.type}, P${a.priority}) | score ${a.score} | signal ${a.signalScore} | ${a.ricpContacts.length > 0 ? a.ricpContacts[0] : "RICP missing"}`
      )
      .join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Copied top target accounts");
  };

  const handleCopyRicpGaps = async () => {
    const text = ricpGaps
      .map((a, i) => `${i + 1}. ${a.name} (${a.type}, P${a.priority}) | score ${a.score}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Copied RICP research queue");
  };

  const handleCopyTamBreakout = async () => {
    const text = tamBreakout
      .map(
        (a, i) =>
          `${i + 1}. ${a.name} (TAM, P${a.priority}) | score ${a.score} | signal ${a.signalScore} | ${a.ricpContacts.length > 0 ? a.ricpContacts[0] : "RICP missing"}`
      )
      .join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Copied TAM breakout list");
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Marketing Ideas and Account Priorities</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Optimized for meetings booked and SQL generation across the full account universe.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {companies.length} companies analyzed
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card className="p-3 shadow-none">
            <div className="text-xs text-muted-foreground">Go-Now Accounts</div>
            <div className="text-xl font-bold mt-1">{goNow.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Highest fit + signal + reachable RICP mix
            </div>
          </Card>
          <Card className="p-3 shadow-none">
            <div className="text-xs text-muted-foreground">RICP Coverage</div>
            <div className="text-xl font-bold mt-1">{ricpCoverage}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              Coverage over SQO/Client/ICP priority cohorts
            </div>
          </Card>
          <Card className="p-3 shadow-none">
            <div className="text-xs text-muted-foreground">Research Queue</div>
            <div className="text-xl font-bold mt-1">{ricpGaps.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              High-priority accounts missing COO/CRO/underwriting roles
            </div>
          </Card>
        </div>

        <Card className="p-3 shadow-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-brand" />
              <h3 className="text-sm font-semibold">Top Accounts to Go After Now</h3>
            </div>
            <Button size="sm" variant="outline" onClick={handleCopyGoNow}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy List
            </Button>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {goNow.map((a) => (
              <div key={a.id} className="rounded-md border border-border/60 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      score {a.score} | signal {a.signalScore}
                    </div>
                  </div>
                  <Badge variant="outline" className={typeClass(a.type)}>
                    {a.type}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {a.ricpContacts.length > 0
                    ? `RICP: ${a.ricpContacts.slice(0, 2).join(" | ")}`
                    : "RICP: Missing (needs COO/CRO/Underwriting research)"}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-3 shadow-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-brand" />
              <h3 className="text-sm font-semibold">TAM Breakout (Expansion Targets)</h3>
            </div>
            <Button size="sm" variant="outline" onClick={handleCopyTamBreakout}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy List
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            High-signal TAM accounts with potential for near-term meeting conversion.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {tamBreakout.map((a) => (
              <div key={a.id} className="rounded-md border border-border/60 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      score {a.score} | signal {a.signalScore}
                    </div>
                  </div>
                  <Badge variant="outline" className={typeClass(a.type)}>
                    TAM
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {a.ricpContacts.length > 0
                    ? `RICP: ${a.ricpContacts.slice(0, 2).join(" | ")}`
                    : "RICP: Missing (research before outreach)"}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-3 shadow-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-brand" />
              <h3 className="text-sm font-semibold">RICP Research Queue</h3>
            </div>
            <Button size="sm" variant="outline" onClick={handleCopyRicpGaps}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy Queue
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Prioritize these accounts for missing COO, CRO, Chief Credit, or underwriter contacts.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {ricpGaps.map((a) => (
              <div key={a.id} className="rounded-md border border-border/60 p-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{a.name}</div>
                  <div className="text-xs text-muted-foreground">
                    P{a.priority} | score {a.score} | signal {a.signalScore}
                  </div>
                </div>
                <Badge variant="outline" className={typeClass(a.type)}>
                  {a.type}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-3 shadow-none">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-semibold">Marketing Ideas to Run Now</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Built for BDR + marketing-attributed pipeline growth (beyond gifts and events).
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {GTM_EXPERIMENTS.map((idea) => (
              <div key={idea.name} className="rounded-md border border-border/60 p-2">
                <div className="text-sm font-medium">{idea.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Channel: {idea.channel}
                </div>
                <div className="text-xs mt-1">{idea.play}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  KPI: {idea.kpi}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ScrollArea>
  );
}
