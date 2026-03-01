import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * GET /api/tools/news
 * Recent news across tracked companies.
 *
 * Query params:
 *   priority - Filter by priority (1-7)
 *   category - Filter by category
 *   limit    - Max results (default 20, max 50)
 */
export async function GET(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const params = request.nextUrl.searchParams;
  const priority = params.get("priority");
  const category = params.get("category");
  const limit = Math.min(parseInt(params.get("limit") || "20", 10) || 20, 50);

  let query = supabase
    .from("companies")
    .select("id, name, category, priority, news")
    .not("news", "is", null);

  if (priority) query = query.eq("priority", parseInt(priority, 10));
  if (category) query = query.eq("category", category.toLowerCase());

  query = query.order("priority", { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("[Tools/News] Error:", error.message);
    return NextResponse.json({ error: "News query failed" }, { status: 500 });
  }

  // Flatten news from all companies and sort by date (newest first)
  const newsItems: {
    headline: string;
    source: string;
    description: string;
    publishedAt?: string;
    url?: string;
    company: { id: number; name: string; category: string; priority: number };
  }[] = [];

  for (const row of data || []) {
    for (const item of row.news || []) {
      newsItems.push({
        headline: item.h,
        source: item.s,
        description: item.d,
        publishedAt: item.p,
        url: item.u,
        company: {
          id: row.id,
          name: row.name,
          category: row.category,
          priority: row.priority,
        },
      });
    }
  }

  // Sort: items with ISO dates first (newest), then the rest
  newsItems.sort((a, b) => {
    if (a.publishedAt && b.publishedAt) {
      return b.publishedAt.localeCompare(a.publishedAt);
    }
    if (a.publishedAt) return -1;
    if (b.publishedAt) return 1;
    return 0;
  });

  return NextResponse.json({
    news: newsItems.slice(0, limit),
    total: newsItems.length,
  });
}
