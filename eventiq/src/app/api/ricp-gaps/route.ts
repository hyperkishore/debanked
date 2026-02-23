import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { isRicpTitle, classifyTitle } from "@/lib/ricp-taxonomy";

/**
 * GET /api/ricp-gaps
 * Live RICP gap reconciler from Supabase.
 * Returns ranked gap list with coverage percentages per priority tier.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  // Fetch companies with their leaders
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, type, priority, leaders, contacts")
    .in("type", ["SQO", "Client", "ICP"])
    .order("priority", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  interface GapEntry {
    companyId: number;
    companyName: string;
    type: string;
    priority: number;
    hasRicp: boolean;
    ricpContacts: string[];
    missingRoles: string[];
  }

  const gaps: GapEntry[] = [];
  const desiredRoles = ["operations", "risk", "underwriting", "finance"];

  let totalCompanies = 0;
  let coveredCompanies = 0;

  const tierStats: Record<string, { total: number; covered: number }> = {
    SQO: { total: 0, covered: 0 },
    Client: { total: 0, covered: 0 },
    ICP: { total: 0, covered: 0 },
  };

  for (const company of companies || []) {
    totalCompanies++;
    const tier = tierStats[company.type] || { total: 0, covered: 0 };
    tier.total++;

    const people = [
      ...((company.leaders as Array<{ n: string; t: string }>) || []),
      ...((company.contacts as Array<{ n: string; t: string }>) || []),
    ];

    const ricpContacts: string[] = [];
    const foundRoles = new Set<string>();

    for (const person of people) {
      if (isRicpTitle(person.t || "")) {
        ricpContacts.push(`${person.n} (${person.t})`);
        const { role } = classifyTitle(person.t || "");
        foundRoles.add(role);
      }
    }

    const missingRoles = desiredRoles.filter((r) => !foundRoles.has(r));
    const hasRicp = ricpContacts.length > 0;

    if (hasRicp) {
      coveredCompanies++;
      tier.covered++;
    }

    if (!hasRicp || missingRoles.length > 0) {
      gaps.push({
        companyId: company.id,
        companyName: company.name,
        type: company.type,
        priority: company.priority,
        hasRicp,
        ricpContacts,
        missingRoles,
      });
    }

    tierStats[company.type] = tier;
  }

  // Rank: companies with zero RICP first, then by priority
  gaps.sort((a, b) => {
    if (a.hasRicp !== b.hasRicp) return a.hasRicp ? 1 : -1;
    return a.priority - b.priority;
  });

  const coveragePct = totalCompanies > 0 ? Math.round((coveredCompanies / totalCompanies) * 100) : 0;

  return NextResponse.json({
    totalCompanies,
    coveredCompanies,
    coveragePct,
    tierStats,
    gaps: gaps.slice(0, 100),
    totalGaps: gaps.length,
  });
}
