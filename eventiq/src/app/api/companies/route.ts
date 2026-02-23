import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * GET /api/companies
 * Returns all companies from Supabase, transforming DB schema back to client format.
 * Requires authenticated session.
 */
export async function GET(request: NextRequest) {
  // Auth check
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
    outreachHistory: row.outreach_history || undefined,
  }));

  return NextResponse.json(companies);
}
