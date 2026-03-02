import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { classifyTitle, FunctionalRole } from "@/lib/ricp-taxonomy";
import { searchPeopleAtCompany, isApolloConfigured } from "@/lib/enrichment/apollo";

/**
 * GET /api/cron/enrich-contacts
 *
 * Vercel Cron job — runs daily at 10:00 UTC (after signals at 8:00, before briefing at 12:00).
 * Fills RICP role gaps for P0+P1 companies using Apollo People Search.
 *
 * Rate limit: Max 10 companies per run to respect Apollo API limits.
 */

const RICP_ROLES = new Set<FunctionalRole>(["operations", "risk", "underwriting", "finance"]);
const MAX_COMPANIES_PER_RUN = 10;

interface EnrichmentLog {
  companyId: number;
  companyName: string;
  missingRoles: string[];
  contactsFound: number;
  contactsAdded: number;
  rolesFilledByEnrichment: string[];
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  if (!isApolloConfigured()) {
    return NextResponse.json({ error: "Apollo API not configured" }, { status: 503 });
  }

  try {
    // 1. Fetch P0+P1 companies from Supabase
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id, name, type, priority, leaders, website")
      .in("priority", [1, 2])
      .order("priority", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json({ message: "No P0/P1 companies found", enriched: 0 });
    }

    // 2. Find companies with >=2 missing RICP roles
    const companiesNeedingEnrichment: Array<{
      id: number;
      name: string;
      website: string | null;
      leaders: Array<{ n: string; t: string; [key: string]: unknown }>;
      missingRoles: FunctionalRole[];
    }> = [];

    for (const company of companies) {
      const leaders = (company.leaders as Array<{ n: string; t: string }>) || [];
      const filledRoles = new Set<FunctionalRole>();

      for (const leader of leaders) {
        const { role, weight } = classifyTitle(leader.t || "");
        if (RICP_ROLES.has(role) && weight >= 4) {
          filledRoles.add(role);
        }
      }

      const missingRoles = Array.from(RICP_ROLES).filter((r) => !filledRoles.has(r)) as FunctionalRole[];

      if (missingRoles.length >= 2) {
        companiesNeedingEnrichment.push({
          id: company.id,
          name: company.name,
          website: company.website as string | null,
          leaders: leaders as Array<{ n: string; t: string; [key: string]: unknown }>,
          missingRoles,
        });
      }
    }

    // 3. Process up to MAX_COMPANIES_PER_RUN
    const batch = companiesNeedingEnrichment.slice(0, MAX_COMPANIES_PER_RUN);
    const results: EnrichmentLog[] = [];
    let totalAdded = 0;

    for (const company of batch) {
      // Extract domain from website URL
      const domain = extractDomain(company.website);
      if (!domain) {
        results.push({
          companyId: company.id,
          companyName: company.name,
          missingRoles: company.missingRoles,
          contactsFound: 0,
          contactsAdded: 0,
          rolesFilledByEnrichment: [],
        });
        continue;
      }

      // Search Apollo for people at this company
      const apolloContacts = await searchPeopleAtCompany(domain, company.name);

      // Match Apollo results to missing RICP roles
      const newLeaders: Array<{
        n: string;
        t: string;
        bg: string;
        email?: string;
        phone?: string;
        li?: string;
        functionalRole: string;
        sourceUrls?: string[];
        verifiedAt: string;
        confidence: number;
      }> = [];
      const rolesFilledByEnrichment: string[] = [];

      for (const contact of apolloContacts) {
        const { role, weight } = classifyTitle(contact.title);
        if (!RICP_ROLES.has(role) || weight < 4) continue;
        if (!company.missingRoles.includes(role)) continue;

        // Check for duplicate names
        const existingNames = new Set(
          company.leaders.map((l) => l.n.toLowerCase().trim())
        );
        if (existingNames.has(contact.name.toLowerCase().trim())) continue;

        newLeaders.push({
          n: contact.name,
          t: contact.title,
          bg: `Enriched via Apollo (${new Date().toISOString().slice(0, 10)})`,
          email: contact.email || undefined,
          phone: contact.phone || undefined,
          li: contact.linkedinUrl || undefined,
          functionalRole: role,
          verifiedAt: new Date().toISOString(),
          confidence: contact.confidence,
        });

        if (!rolesFilledByEnrichment.includes(role)) {
          rolesFilledByEnrichment.push(role);
        }
      }

      // Update Supabase if we found new leaders
      if (newLeaders.length > 0) {
        const updatedLeaders = [...company.leaders, ...newLeaders];
        const { error: updateError } = await supabase
          .from("companies")
          .update({ leaders: updatedLeaders })
          .eq("id", company.id);

        if (updateError) {
          console.error(`[Cron:EnrichContacts] Failed to update ${company.name}:`, updateError);
        } else {
          totalAdded += newLeaders.length;
        }
      }

      results.push({
        companyId: company.id,
        companyName: company.name,
        missingRoles: company.missingRoles,
        contactsFound: apolloContacts.length,
        contactsAdded: newLeaders.length,
        rolesFilledByEnrichment,
      });

      // Small delay between API calls
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const summary = {
      timestamp: new Date().toISOString(),
      totalCompaniesWithGaps: companiesNeedingEnrichment.length,
      companiesProcessed: batch.length,
      totalContactsAdded: totalAdded,
      results,
    };

    console.log("[Cron:EnrichContacts]", JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[Cron:EnrichContacts] Fatal error:", err);
    return NextResponse.json(
      { error: "Enrichment failed", details: String(err) },
      { status: 500 }
    );
  }
}

function extractDomain(website: string | null): string | null {
  if (!website) return null;
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
