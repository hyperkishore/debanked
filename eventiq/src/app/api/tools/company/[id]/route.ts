import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * GET /api/tools/company/[id]
 * Full company profile by ID.
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

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const company = {
    id: data.id,
    name: data.name,
    type: data.type,
    priority: data.priority,
    category: data.category,
    location: data.location,
    full_address: data.full_address,
    employees: data.employees,
    website: data.website,
    linkedinUrl: data.linkedin_url,
    desc: data.desc_text || "",
    notes: data.notes || "",
    leaders: data.leaders || [],
    contacts: data.contacts || [],
    news: data.news || [],
    ice: data.ice || "",
    icebreakers: data.icebreakers || [],
    tp: data.talking_points || [],
    ask: data.ask || "",
    source: data.source || [],
  };

  return NextResponse.json(company);
}
