import { NextResponse, type NextRequest } from "next/server";
import { validateToolKey } from "@/lib/tool-auth";
import { apiError } from "@/lib/api-helpers";
import { isHubSpotConfigured, searchCompanyByDomain } from "@/lib/hubspot-client";

/**
 * GET /api/tools/hubspot/company-search?domain=X
 * Search for a HubSpot company by domain.
 * Headers: X-Tool-Key
 */
export async function GET(request: NextRequest) {
  if (!validateToolKey(request)) {
    return apiError("Invalid or missing API key", 401);
  }

  if (!isHubSpotConfigured()) {
    return apiError("HubSpot not configured", 503);
  }

  const domain = request.nextUrl.searchParams.get("domain");
  if (!domain) {
    return apiError("domain parameter is required", 400);
  }

  try {
    const result = await searchCompanyByDomain(domain);
    if (!result) {
      return NextResponse.json({ found: false, domain });
    }
    return NextResponse.json({
      found: true,
      domain,
      company: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "HubSpot API error";
    return apiError(message, 502);
  }
}
