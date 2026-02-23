import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";
import { enrichCompanyViaApollo } from "@/lib/enrichment/apollo";

/**
 * POST /api/enrich
 * Enrich a company with external data (Apollo.io).
 * Body: { companyId: number } or { companyIds: number[] }
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const body = await request.json();
  const companyIds: number[] = body.companyIds || (body.companyId ? [body.companyId] : []);

  if (companyIds.length === 0) {
    return apiError("companyId or companyIds required", 400);
  }

  if (companyIds.length > 10) {
    return apiError("Max 10 companies per request", 400);
  }

  // Fetch companies to get their domains
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, website, employees")
    .in("id", companyIds);

  if (!companies || companies.length === 0) {
    return apiError("No companies found", 404);
  }

  const results: Array<{
    companyId: number;
    name: string;
    enriched: boolean;
    data?: Record<string, unknown>;
    error?: { code: string; message: string };
  }> = [];

  for (const company of companies) {
    const domain = company.website
      ? company.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
      : null;

    if (!domain) {
      results.push({
        companyId: company.id,
        name: company.name,
        enriched: false,
        error: { code: "NO_DOMAIN", message: "No website/domain available" },
      });
      continue;
    }

    const enrichResult = await enrichCompanyViaApollo(domain);
    if (!enrichResult) {
      results.push({
        companyId: company.id,
        name: company.name,
        enriched: false,
        error: { code: "ENRICH_FAILED", message: "Enrichment returned no data" },
      });
      continue;
    }

    if ("errorCode" in enrichResult && enrichResult.errorCode) {
      results.push({
        companyId: company.id,
        name: company.name,
        enriched: false,
        error: {
          code: enrichResult.errorCode as string,
          message: `Apollo API error: ${enrichResult.errorCode}`,
        },
      });
      continue;
    }

    // Update company record with enriched data
    const updates: Record<string, unknown> = {};
    if (enrichResult.employeeCount && !company.employees) {
      updates.employees = enrichResult.employeeCount;
    }
    if (enrichResult.industry) {
      updates.industry = enrichResult.industry;
    }
    if (enrichResult.socialLinks?.linkedin) {
      updates.linkedin_url = enrichResult.socialLinks.linkedin;
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await supabase.from("companies").update(updates).eq("id", company.id);
    }

    results.push({
      companyId: company.id,
      name: company.name,
      enriched: true,
      data: enrichResult as unknown as Record<string, unknown>,
    });

    // Rate limit between requests
    if (companies.length > 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return NextResponse.json({ results });
}
