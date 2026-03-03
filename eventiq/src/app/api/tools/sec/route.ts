import { NextResponse, type NextRequest } from "next/server";
import { validateToolKey } from "@/lib/tool-auth";
import { apiError } from "@/lib/api-helpers";
import {
  searchSecCompanyWithFinancials,
  type SecCompanyResult,
} from "@/lib/sec-client";

/**
 * GET /api/tools/sec?name=<company>
 * Get public company financial data from SEC EDGAR (revenue, net income, assets).
 * Headers: X-Tool-Key
 */
export async function GET(request: NextRequest) {
  if (!validateToolKey(request)) {
    return apiError("Invalid or missing API key", 401);
  }

  const name = request.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return apiError("name parameter required", 400);
  }

  try {
    const result: SecCompanyResult = await searchSecCompanyWithFinancials(name);

    if (!result.found) {
      return NextResponse.json({ found: false, name });
    }

    return NextResponse.json({
      found: true,
      company: result.company,
      financials: result.financials,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "SEC EDGAR API error";
    console.error("[Tools/SEC] Error:", message);
    return apiError(message, 502);
  }
}
