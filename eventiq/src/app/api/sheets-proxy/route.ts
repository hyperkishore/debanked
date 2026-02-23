import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";

/**
 * POST /api/sheets-proxy
 * Server-side proxy for Google Apps Script.
 * Replaces no-cors client-side fetch that can't read responses.
 * Body: { url: string, event: object }
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { url, event } = body;

  if (!url || !event) {
    return apiError("url and event required", 400);
  }

  // Validate URL is a Google Apps Script endpoint
  if (!url.startsWith("https://script.google.com/")) {
    return apiError("Only Google Apps Script URLs are allowed", 400);
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      data,
    });
  } catch (err) {
    return apiError(
      `Proxy fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      502
    );
  }
}
