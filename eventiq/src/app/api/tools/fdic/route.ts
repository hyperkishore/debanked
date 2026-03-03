import { NextResponse, type NextRequest } from "next/server";
import { validateToolKey } from "@/lib/tool-auth";
import { apiError } from "@/lib/api-helpers";
import { searchBankByName, getBankByCert } from "@/lib/fdic-client";

/**
 * GET /api/tools/fdic?name=<bank>&cert=<optional>
 * Get FDIC bank financial data (assets, deposits, loans, income, regulatory ratios).
 * Headers: X-Tool-Key
 */
export async function GET(request: NextRequest) {
  if (!validateToolKey(request)) {
    return apiError("Invalid or missing API key", 401);
  }

  const params = request.nextUrl.searchParams;
  const name = params.get("name")?.trim();
  const certStr = params.get("cert")?.trim();

  if (!name && !certStr) {
    return apiError("name or cert parameter required", 400);
  }

  try {
    // Direct cert lookup if provided
    if (certStr) {
      const cert = parseInt(certStr, 10);
      if (!Number.isFinite(cert)) {
        return apiError("cert must be a valid integer", 400);
      }
      const bank = await getBankByCert(cert);
      if (!bank) {
        return NextResponse.json({ results: [], total: 0 });
      }
      return NextResponse.json({ results: [bank], total: 1 });
    }

    // Name search
    const results = await searchBankByName(name!, 10);
    return NextResponse.json({ results, total: results.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "FDIC API error";
    console.error("[Tools/FDIC] Error:", message);
    return apiError(message, 502);
  }
}
