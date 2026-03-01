import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * GET /api/tools/search
 * Full-text search across companies.
 *
 * Query params:
 *   q          - Text search (name, desc, location, leaders, news)
 *   category   - Filter by category (funder, iso, marketplace, etc.)
 *   priority   - Filter by priority (1-7)
 *   location   - Filter by location substring
 *   minEmployees - Minimum employee count
 *   hasEmail   - If "true", only companies with leaders that have email
 *   limit      - Max results (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim() || "";
  const category = params.get("category");
  const priority = params.get("priority");
  const location = params.get("location");
  const minEmployees = params.get("minEmployees");
  const hasEmail = params.get("hasEmail");
  const limit = Math.min(parseInt(params.get("limit") || "20", 10) || 20, 100);

  let query = supabase
    .from("companies")
    .select("id, name, category, priority, location, employees, website, desc_text, leaders, contacts, news, ice");

  if (category) {
    query = query.eq("category", category.toLowerCase());
  }
  if (priority) {
    query = query.eq("priority", parseInt(priority, 10));
  }
  if (location) {
    query = query.ilike("location", `%${location}%`);
  }
  if (minEmployees) {
    query = query.gte("employees", parseInt(minEmployees, 10));
  }

  // When text search is active, fetch all matching rows and filter in-app
  // (Supabase free tier doesn't have full-text search).
  // When no text search, apply SQL limit for efficiency.
  query = query.order("priority", { ascending: true });
  if (!q) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Tools/Search] Error:", error.message);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  // Apply text search filter in-app (Supabase free tier doesn't have full-text)
  let results = data || [];

  if (q) {
    const terms = q.toLowerCase().split(/\s+/);
    results = results.filter((row) => {
      const searchable = [
        row.name,
        row.desc_text,
        row.location,
        row.category,
        row.website,
        // Search within leaders
        ...(row.leaders || []).flatMap((l: { n?: string; t?: string; bg?: string }) => [l.n, l.t, l.bg]),
        // Search within contacts
        ...(row.contacts || []).flatMap((c: { n?: string; t?: string }) => [c.n, c.t]),
        // Search within news
        ...(row.news || []).flatMap((n: { h?: string; d?: string }) => [n.h, n.d]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return terms.every((term) => searchable.includes(term));
    });
  }

  // Filter by hasEmail
  if (hasEmail === "true") {
    results = results.filter((row) =>
      (row.leaders || []).some((l: { email?: string }) => l.email)
    );
  }

  // Apply limit after all filters
  results = results.slice(0, limit);

  // Transform to summary format
  const companies = results.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    priority: row.priority,
    location: row.location,
    employees: row.employees,
    website: row.website,
    desc: row.desc_text?.substring(0, 200) || "",
    leaderCount: (row.leaders || []).length,
    topLeader: (row.leaders || [])[0]
      ? { n: (row.leaders as { n: string; t: string }[])[0].n, t: (row.leaders as { n: string; t: string }[])[0].t }
      : null,
    hasEmail: (row.leaders || []).some((l: { email?: string }) => l.email),
    newsCount: (row.news || []).length,
    ice: row.ice,
  }));

  return NextResponse.json({ results: companies, total: companies.length });
}
