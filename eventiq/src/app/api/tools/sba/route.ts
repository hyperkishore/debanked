import { NextResponse, type NextRequest } from "next/server";
import { validateToolKey } from "@/lib/tool-auth";
import { apiError } from "@/lib/api-helpers";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * GET /api/tools/sba?name=<lender>
 * Check if a company is an SBA-approved lender and get lending volume.
 * Data sourced from pre-processed SBA 7(a) CSV (scripts/sba-lender-summary.js).
 * Headers: X-Tool-Key
 */

interface SbaLender {
  lenderName: string;
  totalLoans: number;
  totalVolume: number;
  avgLoanSize: number;
  latestFiscalYear: number;
}

let lenderCache: SbaLender[] | null = null;

async function loadLenders(): Promise<SbaLender[]> {
  if (lenderCache) return lenderCache;

  try {
    const filePath = join(process.cwd(), "src/data/sba-lenders.json");
    const raw = await readFile(filePath, "utf-8");
    lenderCache = JSON.parse(raw) as SbaLender[];
    return lenderCache;
  } catch {
    // File doesn't exist yet — return empty
    return [];
  }
}

function fuzzyMatch(needle: string, haystack: string): number {
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  if (h === n) return 100;
  if (h.startsWith(n)) return 80;
  if (h.includes(n)) return 60;
  // Check individual words
  const words = n.split(/\s+/);
  const matched = words.filter((w) => h.includes(w));
  if (matched.length === words.length) return 50;
  if (matched.length > 0) return 20 + (matched.length / words.length) * 20;
  return 0;
}

export async function GET(request: NextRequest) {
  if (!validateToolKey(request)) {
    return apiError("Invalid or missing API key", 401);
  }

  const name = request.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return apiError("name parameter required", 400);
  }

  try {
    const lenders = await loadLenders();

    if (lenders.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
        note: "SBA lender data not yet generated. Run: node scripts/sba-lender-summary.js",
      });
    }

    const scored = lenders
      .map((l) => ({ lender: l, score: fuzzyMatch(name, l.lenderName) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return NextResponse.json({
      results: scored.map((s) => s.lender),
      total: scored.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "SBA data error";
    console.error("[Tools/SBA] Error:", message);
    return apiError(message, 502);
  }
}
