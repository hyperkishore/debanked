import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";

interface OutreachRequest {
  signalType: string;
  headline: string;
  companyId: number;
  companyName: string;
  leaderName?: string;
  channel?: "email" | "linkedin";
}

interface LeaderData {
  n: string;
  t: string;
  bg: string;
  hooks?: string[];
  personal?: string;
  email?: string;
  li?: string;
}

interface CompanyData {
  name: string;
  desc: string;
  tp: string[];
  ask: string;
  leaders?: LeaderData[];
}

function pickHook(leader: LeaderData): string {
  if (!leader.hooks || leader.hooks.length === 0) return "";
  const starred = leader.hooks.find((h) => h.startsWith("*"));
  return starred ? starred.slice(1).trim() : leader.hooks[0];
}

function buildSignalReference(signalType: string, headline: string): string {
  const clean = headline.replace(/<[^>]+>/g, "").trim();
  const typeIntros: Record<string, string> = {
    funding: `I saw the news about ${clean} — congrats on the raise.`,
    partnership: `Noticed the announcement about ${clean} — exciting move.`,
    product: `Saw the update on ${clean} — looks like you're scaling fast.`,
    hiring: `I saw ${clean} — sounds like the team is growing.`,
    regulatory: `With ${clean}, I imagine compliance is top of mind.`,
    milestone: `Congrats on ${clean} — impressive momentum.`,
    general: `I came across ${clean} and wanted to reach out.`,
  };
  return typeIntros[signalType] || typeIntros.general;
}

function generateSubject(
  signalType: string,
  companyName: string,
  headline: string
): string {
  const clean = headline.replace(/<[^>]+>/g, "").trim();
  if (clean.length <= 60) return `Re: ${clean}`;
  const typeSubjects: Record<string, string> = {
    funding: `Congrats on the funding, ${companyName}`,
    partnership: `Re: ${companyName} partnership news`,
    product: `${companyName} — scaling fast`,
    hiring: `${companyName} team growth`,
    regulatory: `Compliance + ${companyName}`,
    milestone: `Congrats, ${companyName}`,
    general: `Quick note for ${companyName}`,
  };
  return typeSubjects[signalType] || typeSubjects.general;
}

function generateEmailBody(
  leader: LeaderData,
  company: CompanyData,
  signalType: string,
  headline: string
): string {
  const firstName = leader.n.split(" ")[0];
  const signalRef = buildSignalReference(signalType, headline);
  const hook = pickHook(leader);

  let personalBridge = "";
  if (hook) {
    personalBridge = `Side note — ${hook.toLowerCase()} caught my eye. Always great to connect with people who have interesting backgrounds.`;
  }

  let valueProp =
    "We help lenders like you automate underwriting decisions — currently powering 450+ MCA companies with AI-driven document analysis and verification.";
  if (company.tp && company.tp.length > 0) {
    const shortest = company.tp.reduce((a, b) =>
      a.length < b.length ? a : b
    );
    valueProp = shortest;
  }

  let cta = `Would love to show you how we could help ${company.name}. Open to a quick 15-min chat this week?`;
  if (company.ask) {
    cta = company.ask;
  }

  const parts = [
    `Hi ${firstName},`,
    "",
    signalRef,
    "",
    personalBridge,
    personalBridge ? "" : null,
    valueProp,
    "",
    cta,
    "",
    "Best,",
    "[Your Name]",
    "HyperVerge",
  ].filter((line) => line !== null);

  return parts.join("\n");
}

function generateLinkedInBody(
  leader: LeaderData,
  company: CompanyData,
  signalType: string,
  headline: string
): string {
  const firstName = leader.n.split(" ")[0];
  const signalRef = buildSignalReference(signalType, headline);
  const hook = pickHook(leader);

  let opener = signalRef;
  if (hook) {
    opener = `${signalRef} Also — ${hook.toLowerCase()} is a great background.`;
  }

  let pitch = `We work with 450+ lenders on AI-powered underwriting — thought there might be a fit with ${company.name}.`;
  if (company.tp && company.tp.length > 0) {
    pitch = company.tp[0];
  }

  return `Hi ${firstName},\n\n${opener}\n\n${pitch}\n\nWorth a quick chat?`;
}

/**
 * POST /api/generate-outreach
 *
 * Generates a personalized outreach message based on a signal/news item.
 * Uses template-based generation with company and leader data.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  let body: OutreachRequest;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  const { signalType, headline, companyId, companyName, leaderName, channel } =
    body;

  if (!headline || !companyId || !companyName) {
    return apiError("Missing required fields: headline, companyId, companyName", 400);
  }

  const { data: companyRow } = await supabase
    .from("companies")
    .select("data")
    .eq("id", companyId)
    .single();

  const companyData: CompanyData | null = companyRow?.data ?? null;

  let leader: LeaderData | null = null;
  if (companyData?.leaders && companyData.leaders.length > 0) {
    if (leaderName) {
      leader =
        companyData.leaders.find(
          (l) => l.n.toLowerCase() === leaderName.toLowerCase()
        ) || companyData.leaders[0];
    } else {
      leader = companyData.leaders[0];
    }
  }

  if (!leader) {
    leader = {
      n: leaderName || "there",
      t: "",
      bg: "",
    };
  }

  const effectiveCompany: CompanyData = companyData || {
    name: companyName,
    desc: "",
    tp: [],
    ask: "",
  };

  const effectiveChannel = channel || (leader.email ? "email" : "linkedin");

  const emailBody =
    effectiveChannel === "email"
      ? generateEmailBody(
          leader,
          effectiveCompany,
          signalType || "general",
          headline
        )
      : generateLinkedInBody(
          leader,
          effectiveCompany,
          signalType || "general",
          headline
        );

  const subject = generateSubject(
    signalType || "general",
    companyName,
    headline
  );

  return NextResponse.json({
    subject,
    body: emailBody,
    channel: effectiveChannel,
    leaderName: leader.n,
    leaderEmail: leader.email || null,
    leaderLinkedin: leader.li || null,
  });
}
