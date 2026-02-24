import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { runSignalIngestion } from "@/lib/signal-ingest";

/**
 * GET /api/cron/ingest-signals
 *
 * Vercel Cron job — runs daily at 8 AM UTC.
 * Ingests signals from Google News, Bing News, and deBanked RSS.
 *
 * Auth: Vercel cron sends Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const results = await runSignalIngestion(supabase);

    const summary = {
      timestamp: new Date().toISOString(),
      totalSignalsFound: results.reduce((s, r) => s + r.signalsFound, 0),
      totalSignalsNew: results.reduce((s, r) => s + r.signalsNew, 0),
      totalDurationMs: results.reduce((s, r) => s + r.durationMs, 0),
      sources: results.map((r) => ({
        source: r.source,
        signalsFound: r.signalsFound,
        signalsNew: r.signalsNew,
        durationMs: r.durationMs,
      })),
    };

    console.log("[Cron:IngestSignals]", JSON.stringify(summary));

    return NextResponse.json(summary);
  } catch (err) {
    console.error("[Cron:IngestSignals] Fatal error:", err);
    return NextResponse.json(
      { error: "Ingestion failed", details: String(err) },
      { status: 500 }
    );
  }
}
