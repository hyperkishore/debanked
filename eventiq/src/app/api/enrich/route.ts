import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseServer } from "@/lib/supabase-server";
import { enrichCompanyViaApollo } from "@/lib/enrichment/apollo";

/**
 * POST /api/enrich
 * Enrich a company with external data (Apollo.io).
 * Body: { companyId: number } or { companyIds: number[] }
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {},
    },
  });

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = await request.json();
  const companyIds: number[] = body.companyIds || (body.companyId ? [body.companyId] : []);

  if (companyIds.length === 0) {
    return NextResponse.json({ error: "companyId or companyIds required" }, { status: 400 });
  }

  if (companyIds.length > 10) {
    return NextResponse.json({ error: "Max 10 companies per request" }, { status: 400 });
  }

  // Fetch companies to get their domains
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, website, employees")
    .in("id", companyIds);

  if (!companies || companies.length === 0) {
    return NextResponse.json({ error: "No companies found" }, { status: 404 });
  }

  const results: Array<{ companyId: number; name: string; enriched: boolean; data?: Record<string, unknown> }> = [];

  for (const company of companies) {
    const domain = company.website
      ? company.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
      : null;

    if (!domain) {
      results.push({ companyId: company.id, name: company.name, enriched: false });
      continue;
    }

    const enrichment = await enrichCompanyViaApollo(domain);
    if (!enrichment) {
      results.push({ companyId: company.id, name: company.name, enriched: false });
      continue;
    }

    // Update company record with enriched data
    const updates: Record<string, unknown> = {};
    if (enrichment.employeeCount && !company.employees) {
      updates.employees = enrichment.employeeCount;
    }
    if (enrichment.industry) {
      updates.industry = enrichment.industry;
    }
    if (enrichment.socialLinks?.linkedin) {
      updates.linkedin_url = enrichment.socialLinks.linkedin;
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await supabase.from("companies").update(updates).eq("id", company.id);
    }

    results.push({
      companyId: company.id,
      name: company.name,
      enriched: true,
      data: enrichment as unknown as Record<string, unknown>,
    });

    // Rate limit between requests
    if (companies.length > 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return NextResponse.json({ results });
}
