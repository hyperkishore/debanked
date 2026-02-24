import "server-only";
import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Send an email via Resend.
 * Returns { success: true, id } or { success: false, error }.
 */
export async function sendEmail(payload: EmailPayload) {
  const resend = getResend();
  if (!resend) {
    return { success: false as const, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "EventIQ <briefing@eventiq.hyperverge.co>",
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
    });

    if (error) {
      return { success: false as const, error: error.message };
    }

    return { success: true as const, id: data?.id };
  } catch (err) {
    return { success: false as const, error: String(err) };
  }
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
