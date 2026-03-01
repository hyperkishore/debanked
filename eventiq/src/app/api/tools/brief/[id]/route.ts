import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * GET /api/tools/brief/[id]
 * Formatted outreach brief for a company.
 *
 * Query params:
 *   format     - "short" | "full" | "email-draft" (default: "full")
 *   leaderName - Target a specific leader by name
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

  const format = request.nextUrl.searchParams.get("format") || "full";
  const leaderName = request.nextUrl.searchParams.get("leaderName")?.toLowerCase();

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const leaders = data.leaders || [];
  const targetLeader = leaderName
    ? leaders.find((l: { n: string }) => l.n.toLowerCase().includes(leaderName))
    : leaders[0];

  if (format === "short") {
    return NextResponse.json({
      company: data.name,
      category: data.category,
      location: data.location,
      contact: targetLeader ? `${targetLeader.n} — ${targetLeader.t}` : "No leader on file",
      icebreaker: data.ice || "",
      ask: data.ask || "",
    });
  }

  if (format === "email-draft") {
    const firstName = targetLeader ? targetLeader.n.split(" ")[0] : "there";
    const tp = data.talking_points || [];
    const ice = data.ice || "";

    const emailBody = [
      `Hi ${firstName},`,
      "",
      ice ? `${ice}` : `I've been following ${data.name}'s work in the space.`,
      "",
      tp[0] || "HyperVerge helps 450+ MCA companies automate underwriting with AI.",
      "",
      data.ask || `Would a 15-minute demo be worth exploring?`,
      "",
      "Best,",
      "[Your name]",
    ].join("\n");

    return NextResponse.json({
      to: targetLeader?.email || null,
      toName: targetLeader?.n || null,
      subject: `${data.name} + HyperVerge — Quick question`,
      body: emailBody,
    });
  }

  // Full brief
  const brief = {
    company: {
      name: data.name,
      category: data.category,
      priority: data.priority,
      location: data.location,
      full_address: data.full_address,
      employees: data.employees,
      website: data.website,
      desc: data.desc_text || "",
    },
    targetContact: targetLeader
      ? {
          name: targetLeader.n,
          title: targetLeader.t,
          email: targetLeader.email || null,
          phone: targetLeader.phone || null,
          linkedin: targetLeader.li || null,
          background: targetLeader.bg || "",
          hooks: targetLeader.hooks || [],
        }
      : null,
    outreach: {
      icebreaker: data.ice || "",
      icebreakers: data.icebreakers || [],
      talkingPoints: data.talking_points || [],
      ask: data.ask || "",
    },
    recentNews: (data.news || []).slice(0, 3),
    notes: data.notes || "",
  };

  return NextResponse.json(brief);
}
