import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";

/**
 * GET /api/companies
 * Returns all companies from Supabase, transforming DB schema back to client format.
 * Requires authenticated session. Returns 503 on misconfiguration instead of empty array.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("priority", { ascending: true });

  if (error) {
    console.error("[API] Error fetching companies:", error.message);
    return apiError("Failed to fetch companies", 500);
  }

  // Transform DB rows back to the client Company interface
  const companies = (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    priority: row.priority,
    phase: row.phase,
    booth: row.booth,
    clear: row.clear,
    contacts: row.contacts || [],
    leaders: row.leaders || [],
    desc: row.desc_text || "",
    notes: row.notes || "",
    news: row.news || [],
    ice: row.ice || "",
    icebreakers: row.icebreakers || [],
    tp: row.talking_points || [],
    ask: row.ask || "",
    location: row.location,
    full_address: row.full_address || undefined,
    employees: row.employees,
    website: row.website,
    linkedinUrl: row.linkedin_url,
    source: row.source || [],
    category: row.category || undefined,
    outreachHistory: row.outreach_history || undefined,
    hubspotDeals: row.hubspot_deals || [],
  }));

  return NextResponse.json(companies);
}
