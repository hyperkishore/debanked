import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { renderPreCallBriefingEmail } from "@/lib/precall-briefing-email";
import {
  generateBriefing,
  type PreCallBriefing,
} from "@/lib/briefing-helpers";
import type { Company, Leader, EngagementEntry } from "@/lib/types";
import type { PipelineRecord } from "@/lib/pipeline-helpers";

/**
 * POST /api/calendar/briefing-email
 *
 * Generates a pre-call briefing for a company/leader and sends it to the user's email.
 * Body: { companyId, leaderName?, userEmail }
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  if (!isEmailConfigured()) {
    return apiError("Email not configured. Set RESEND_API_KEY.", 503);
  }

  let body: { companyId: number; leaderName?: string; userEmail: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { companyId, leaderName, userEmail } = body;
  if (!companyId || !userEmail) {
    return apiError("Missing required fields: companyId, userEmail", 400);
  }

  // Fetch company
  const { data: row } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (!row) {
    return apiError("Company not found", 404);
  }

  // Transform DB row to Company shape (matching /api/companies pattern)
  const company: Company = {
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
    hubspotDeals: row.hubspot_deals || [],
  };

  // Find leader
  const leaders: Leader[] = company.leaders || [];
  let leader: Leader | undefined;
  if (leaderName) {
    leader = leaders.find(
      (l) => l.n.toLowerCase() === leaderName.toLowerCase()
    );
  }
  if (!leader) {
    leader = leaders[0]; // fallback to first leader
  }
  if (!leader) {
    return apiError("No leader found for this company", 404);
  }

  // Fetch user engagements for this company
  const { data: engRows } = await supabase
    .from("engagements")
    .select("*")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .order("timestamp", { ascending: false })
    .limit(10);

  const engagements: EngagementEntry[] = (engRows || []).map(
    (e: Record<string, unknown>) => ({
      id: e.id as string,
      companyId: e.company_id as number,
      companyName: (e.company_name as string) || "",
      contactName: e.contact_name as string,
      channel: e.channel as EngagementEntry["channel"],
      action: e.action as string,
      notes: (e.notes as string) || "",
      timestamp: e.timestamp as string,
      source: (e.source as EngagementEntry["source"]) || "manual",
    })
  );

  // Fetch pipeline state
  const { data: pipeRow } = await supabase
    .from("pipeline_records")
    .select("*")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .single();

  const pipelineState: Record<string, PipelineRecord> = {};
  if (pipeRow) {
    pipelineState[String(companyId)] = {
      stage: pipeRow.stage,
      movedAt: pipeRow.updated_at || new Date().toISOString(),
    } as PipelineRecord;
  }

  // Generate briefing
  let briefing: PreCallBriefing;
  try {
    briefing = generateBriefing(company, leader, engagements, pipelineState);
  } catch (err) {
    console.error("[calendar/briefing-email] Briefing generation error:", err);
    return apiError("Failed to generate briefing", 500);
  }

  // Render email HTML
  const html = renderPreCallBriefingEmail(briefing, company.name);

  // Send
  const result = await sendEmail({
    to: userEmail,
    subject: `Pre-Call Briefing: ${company.name} - ${leader.n}`,
    html,
  });

  if (!result.success) {
    return apiError(`Email send failed: ${result.error}`, 500);
  }

  // Log to enrichment_log
  await supabase
    .from("enrichment_log")
    .insert({
      company_id: companyId,
      company_name: company.name,
      enrichment_type: "briefing_email_sent",
      summary: `Pre-call briefing for ${leader.n} sent to ${userEmail}`,
      data: { leaderName: leader.n, userEmail, resendId: result.id },
    })
    .then(() => {});

  return NextResponse.json({
    success: true,
    id: result.id,
    message: `Briefing for ${company.name} sent to ${userEmail}`,
  });
}
