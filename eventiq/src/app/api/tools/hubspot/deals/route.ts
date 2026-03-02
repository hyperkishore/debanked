import { NextResponse, type NextRequest } from "next/server";
import { validateToolKey } from "@/lib/tool-auth";
import { apiError } from "@/lib/api-helpers";
import {
  isHubSpotConfigured,
  pullAllPipelineDeals,
  pullPipelineStages,
  US_GTM_PIPELINE_ID,
} from "@/lib/hubspot-client";

/**
 * GET /api/tools/hubspot/deals
 * List all deals from the US GTM pipeline with stage labels and amounts.
 * Headers: X-Tool-Key
 */
export async function GET(request: NextRequest) {
  if (!validateToolKey(request)) {
    return apiError("Invalid or missing API key", 401);
  }

  if (!isHubSpotConfigured()) {
    return apiError("HubSpot not configured", 503);
  }

  try {
    const stages = await pullPipelineStages(US_GTM_PIPELINE_ID);
    const stageMap = new Map(stages.map((s) => [s.id, s.label]));
    const deals = await pullAllPipelineDeals(US_GTM_PIPELINE_ID, stageMap);

    return NextResponse.json({
      pipeline: "US GTM Pipeline",
      totalDeals: deals.length,
      deals: deals.map((d) => ({
        dealId: d.dealId,
        dealName: d.dealName,
        stage: d.stageLabel,
        amount: d.amount,
        closeDate: d.closeDate,
        lastModified: d.lastModified,
        product: d.product,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "HubSpot API error";
    return apiError(message, 502);
  }
}
