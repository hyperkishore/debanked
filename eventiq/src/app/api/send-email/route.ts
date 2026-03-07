import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { sendEmail, isEmailConfigured } from "@/lib/email";

/**
 * POST /api/send-email
 *
 * Send a personalized email from EventIQ via Resend.
 * Used by the sequence panel to execute email steps.
 *
 * Body: { to, subject, body, companyId?, contactName? }
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email not configured. Set RESEND_API_KEY in environment." },
      { status: 503 }
    );
  }

  try {
    const { to, subject, body, companyId, contactName } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Convert plain text body to HTML (preserve line breaks)
    const htmlBody = body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");

    const result = await sendEmail({
      to,
      subject,
      html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">${htmlBody}</div>`,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to send email", details: result.error },
        { status: 500 }
      );
    }

    // Log to enrichment_log if companyId provided
    if (companyId) {
      const { supabase } = auth;
      await supabase.from("enrichment_log").insert({
        company_id: companyId,
        company_name: contactName ? `Email to ${contactName}` : undefined,
        enrichment_type: "email_sent",
        summary: `Sent "${subject}" to ${to}`,
        data: { to, subject, resendId: result.id },
      }).then(() => {});
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      message: `Email sent to ${to}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

/**
 * GET /api/send-email
 *
 * Returns email configuration status.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;

  return NextResponse.json({
    configured: isEmailConfigured(),
    fromEmail: process.env.RESEND_FROM_EMAIL || "EventIQ <briefing@eventiq.hyperverge.co>",
  });
}
