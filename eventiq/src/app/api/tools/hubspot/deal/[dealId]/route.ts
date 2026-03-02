import { NextResponse, type NextRequest } from "next/server";
import { validateToolKey } from "@/lib/tool-auth";
import { apiError } from "@/lib/api-helpers";
import { isHubSpotConfigured, getDealDetail } from "@/lib/hubspot-client";

/**
 * GET /api/tools/hubspot/deal/:dealId
 * Get detailed deal info including associated contacts and companies.
 * Headers: X-Tool-Key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  if (!validateToolKey(request)) {
    return apiError("Invalid or missing API key", 401);
  }

  if (!isHubSpotConfigured()) {
    return apiError("HubSpot not configured", 503);
  }

  const { dealId } = await params;
  if (!dealId) {
    return apiError("dealId is required", 400);
  }

  try {
    const deal = await getDealDetail(dealId);
    if (!deal) {
      return apiError("Deal not found", 404);
    }
    return NextResponse.json(deal);
  } catch (err) {
    const message = err instanceof Error ? err.message : "HubSpot API error";
    return apiError(message, 502);
  }
}
