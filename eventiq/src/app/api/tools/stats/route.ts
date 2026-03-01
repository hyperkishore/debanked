import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * GET /api/tools/stats
 * Aggregate market statistics.
 *
 * Query params:
 *   category - Filter by category
 *   priority - Filter by priority
 *   location - Filter by location substring
 */
export async function GET(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const params = request.nextUrl.searchParams;
  const category = params.get("category");
  const priority = params.get("priority");
  const location = params.get("location");

  let query = supabase
    .from("companies")
    .select("id, name, category, priority, location, employees, leaders, website");

  if (category) query = query.eq("category", category.toLowerCase());
  if (priority) query = query.eq("priority", parseInt(priority, 10));
  if (location) query = query.ilike("location", `%${location}%`);

  const { data, error } = await query;

  if (error) {
    console.error("[Tools/Stats] Error:", error.message);
    return NextResponse.json({ error: "Stats query failed" }, { status: 500 });
  }

  const rows = data || [];

  // Category breakdown
  const byCategory: Record<string, number> = {};
  for (const row of rows) {
    const cat = row.category || "uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  // Priority breakdown
  const byPriority: Record<string, number> = {};
  for (const row of rows) {
    const p = `P${row.priority}`;
    byPriority[p] = (byPriority[p] || 0) + 1;
  }

  // Location top 10
  const byLocation: Record<string, number> = {};
  for (const row of rows) {
    if (row.location) {
      const loc = row.location.split(",").pop()?.trim() || row.location;
      byLocation[loc] = (byLocation[loc] || 0) + 1;
    }
  }
  const topLocations = Object.entries(byLocation)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([location, count]) => ({ location, count }));

  // Leader stats
  let totalLeaders = 0;
  let leadersWithEmail = 0;
  let leadersWithLinkedIn = 0;
  for (const row of rows) {
    const leaders = row.leaders || [];
    totalLeaders += leaders.length;
    for (const l of leaders) {
      if (l.email) leadersWithEmail++;
      if (l.li) leadersWithLinkedIn++;
    }
  }

  // Employee stats
  const withEmployees = rows.filter((r) => r.employees && r.employees > 0);
  const totalEmployees = withEmployees.reduce((sum, r) => sum + (r.employees || 0), 0);

  return NextResponse.json({
    totalCompanies: rows.length,
    byCategory,
    byPriority,
    topLocations,
    leaders: {
      total: totalLeaders,
      withEmail: leadersWithEmail,
      withLinkedIn: leadersWithLinkedIn,
    },
    employees: {
      companiesReporting: withEmployees.length,
      total: totalEmployees,
      average: withEmployees.length > 0 ? Math.round(totalEmployees / withEmployees.length) : 0,
    },
  });
}
