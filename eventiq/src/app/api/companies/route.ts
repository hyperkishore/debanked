import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * GET /api/companies
 * Returns all companies from Supabase, transforming DB schema back to client format.
 * Falls back to empty array if Supabase is not configured.
 */
export async function GET() {
  const supabase = getSupabaseServer();

  if (!supabase) {
    // Supabase not configured — return empty array
    // (client will fall back to any locally imported data)
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("priority", { ascending: true });

  if (error) {
    console.error("[API] Error fetching companies:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
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
    employees: row.employees,
    website: row.website,
    linkedinUrl: row.linkedin_url,
    source: row.source || [],
  }));

  return NextResponse.json(companies);
}
