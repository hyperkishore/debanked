import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseServer } from "@/lib/supabase-server";
import { runSignalIngestion } from "@/lib/signal-ingest";

/**
 * POST /api/signals/ingest
 *
 * Triggers the signal ingestion pipeline.
 * Designed to be called by:
 * - AWS EventBridge (daily cron at 8AM UTC) — uses SIGNAL_INGEST_SECRET bearer token
 * - Manual trigger from the UI — uses authenticated session
 */
export async function POST(request: NextRequest) {
  // Auth: check bearer token OR authenticated session (must have one)
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.SIGNAL_INGEST_SECRET;

  let authorized = false;

  // Option 1: Valid bearer token
  if (expectedSecret && authHeader === `Bearer ${expectedSecret}`) {
    authorized = true;
  }

  // Option 2: Authenticated user session
  if (!authorized) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (user) authorized = true;
  }

  if (!authorized) {
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
