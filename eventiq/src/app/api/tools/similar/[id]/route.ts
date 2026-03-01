import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * GET /api/tools/similar/[id]
 * Find companies similar to a given company.
 * Similarity based on: same category, similar employee count, same location state.
 *
 * Query params:
 *   limit - Max results (default 5, max 20)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { id } = await params;
  const companyId = parseInt(id, 10);
  if (!Number.isFinite(companyId)) {
    return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
  }

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "5", 10) || 5, 20);

  // Get the source company
  const { data: source, error: sourceError } = await supabase
    .from("companies")
    .select("id, name, category, priority, location, employees")
    .eq("id", companyId)
    .single();

  if (sourceError || !source) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Get candidates (same category, exclude self)
  let query = supabase
    .from("companies")
    .select("id, name, category, priority, location, employees, website, desc_text, ice")
    .neq("id", companyId);

  if (source.category) {
    query = query.eq("category", source.category);
  }

  const { data: candidates, error: candError } = await query;

  if (candError) {
    console.error("[Tools/Similar] Error:", candError.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  // Score similarity
  const sourceState = source.location?.split(",").pop()?.trim().toUpperCase() || "";
  const sourceEmp = source.employees || 0;

  const scored = (candidates || []).map((c) => {
    let score = 0;

    // Same state
    const cState = c.location?.split(",").pop()?.trim().toUpperCase() || "";
    if (cState && cState === sourceState) score += 3;

    // Similar employee count (within 2x)
    const cEmp = c.employees || 0;
    if (sourceEmp > 0 && cEmp > 0) {
      const ratio = Math.max(sourceEmp, cEmp) / Math.min(sourceEmp, cEmp);
      if (ratio <= 2) score += 2;
      else if (ratio <= 5) score += 1;
    }

    // Same priority tier
    if (c.priority === source.priority) score += 1;

    return { ...c, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const results = scored.slice(0, limit).map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    priority: c.priority,
    location: c.location,
    employees: c.employees,
    website: c.website,
    desc: c.desc_text?.substring(0, 200) || "",
    ice: c.ice,
    similarityScore: c.score,
  }));

  return NextResponse.json({
    source: { id: source.id, name: source.name, category: source.category },
    similar: results,
  });
}
