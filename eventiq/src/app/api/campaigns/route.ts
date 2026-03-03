import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

/**
 * /api/campaigns
 *
 * CRUD for marketing campaigns.
 * GET  → list all campaigns
 * POST {name, campaign_type} → create campaign
 * PATCH {id, status} → update campaign status
 */

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("marketing_campaigns")
    .select("id, name, campaign_type, status, start_date, end_date, target_audience, metrics, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // Table may not exist yet
  if (error) {
    return NextResponse.json({ campaigns: [], total: 0 });
  }

  return NextResponse.json({
    campaigns: data || [],
    total: (data || []).length,
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  let body: { name?: string; campaign_type?: string; target_audience?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("marketing_campaigns")
    .insert({
      name: body.name,
      campaign_type: body.campaign_type || "email_sequence",
      target_audience: body.target_audience || null,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  let body: { id?: string; status?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) updates.status = body.status;
  if (body.name) updates.name = body.name;

  const { error } = await supabase
    .from("marketing_campaigns")
    .update(updates)
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
