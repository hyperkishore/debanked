import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { runSignalIngestion } from "@/lib/signal-ingest";

/**
 * POST /api/signals/ingest
 *
 * Triggers the signal ingestion pipeline.
 * Designed to be called by:
 * - AWS EventBridge (daily cron at 8AM UTC)
 * - Manual trigger from the UI
 *
 * Requires either:
 * - A valid bearer token matching SIGNAL_INGEST_SECRET env var
 * - Or being called from an authenticated session
 */
export async function POST(request: NextRequest) {
  // Auth: check bearer token or skip in dev
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.SIGNAL_INGEST_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  try {
    const results = await runSignalIngestion(supabase);

    const summary = {
      totalSignalsFound: results.reduce((s, r) => s + r.signalsFound, 0),
      totalSignalsNew: results.reduce((s, r) => s + r.signalsNew, 0),
      totalDurationMs: results.reduce((s, r) => s + r.durationMs, 0),
      sources: results,
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error("[Ingest] Fatal error:", err);
    return NextResponse.json(
      { error: "Ingestion failed", details: String(err) },
      { status: 500 }
    );
  }
}
