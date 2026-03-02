import { NextResponse, type NextRequest } from "next/server";
import { validateToolKey } from "@/lib/tool-auth";
import { apiError } from "@/lib/api-helpers";
import { isHubSpotConfigured, pullContacts } from "@/lib/hubspot-client";

/**
 * GET /api/tools/hubspot/contacts?companyId=X
 * Get contacts associated with a HubSpot company.
 * Headers: X-Tool-Key
 */
export async function GET(request: NextRequest) {
  if (!validateToolKey(request)) {
    return apiError("Invalid or missing API key", 401);
  }

  if (!isHubSpotConfigured()) {
    return apiError("HubSpot not configured", 503);
  }

  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return apiError("companyId parameter is required", 400);
  }

  try {
    const contacts = await pullContacts(companyId);
    return NextResponse.json({
      companyId,
      totalContacts: contacts.length,
      contacts: contacts.map((c) => ({
        id: c.id,
        name: [c.firstname, c.lastname].filter(Boolean).join(" "),
        email: c.email,
        phone: c.phone,
        title: c.jobtitle,
        linkedinUrl: c.linkedinUrl,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "HubSpot API error";
    return apiError(message, 502);
  }
}
