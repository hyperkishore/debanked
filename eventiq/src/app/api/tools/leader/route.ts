import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * GET /api/tools/leader
 * Search leaders by name across all companies.
 *
 * Query params:
 *   q - Leader name to search for
 */
export async function GET(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
  if (!q) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  // Fetch companies that might have matching leaders
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, category, priority, location, leaders, website");

  if (error) {
    console.error("[Tools/Leader] Error:", error.message);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  const results: {
    leader: { n: string; t: string; bg: string; hooks?: string[]; li?: string; email?: string; phone?: string };
    company: { id: number; name: string; category: string; priority: number; location: string; website: string };
  }[] = [];

  for (const row of data || []) {
    for (const leader of row.leaders || []) {
      const name = (leader.n || "").toLowerCase();
      if (name.includes(q)) {
        results.push({
          leader: {
            n: leader.n,
            t: leader.t,
            bg: leader.bg || "",
            hooks: leader.hooks,
            li: leader.li,
            email: leader.email,
            phone: leader.phone,
          },
          company: {
            id: row.id,
            name: row.name,
            category: row.category,
            priority: row.priority,
            location: row.location,
            website: row.website,
          },
        });
      }
    }
  }

  return NextResponse.json({ results, total: results.length });
}
