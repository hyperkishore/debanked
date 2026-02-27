import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";
import {
  createPhantomBusterClient,
  buildResultFileUrls,
  isPhantomBusterConfigured,
} from "@/lib/phantombuster-client";

/**
 * GET /api/phantom/status?agentId={id}
 *
 * Check PhantomBuster agent enrichment status.
 *
 * Returns:
 *   { status: "running" | "finished" | "error", progress?: string, results?: object[] }
 */
export async function GET(request: NextRequest) {
  if (!isPhantomBusterConfigured()) {
    return apiError("PHANTOMBUSTER_API_KEY not configured", 503);
  }

  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;

  const agentIdParam = request.nextUrl.searchParams.get("agentId");
  if (!agentIdParam) {
    return apiError("agentId query parameter is required", 400);
  }

  const agentId = parseInt(agentIdParam, 10);
  if (!Number.isFinite(agentId)) {
    return apiError("agentId must be a valid integer", 400);
  }

  const pb = createPhantomBusterClient();

  try {
    // Fetch agent metadata (includes s3Folder pointers and last status)
    const agent = (await pb.fetchAgent(agentId)) as {
      id: number;
      name?: string;
      lastEndMessage?: string;
      lastEndStatus?: string;
      orgS3Folder?: string;
      s3Folder?: string;
      [key: string]: unknown;
    };

    // Fetch the most recent container (run) for this agent
    const container = (await pb.fetchContainer(agentId)) as {
      id: number;
      status?: string;
      progress?: string | null;
      exitCode?: number;
      executionTime?: number;
      [key: string]: unknown;
    };

    const containerStatus = container?.status?.toLowerCase() ?? "unknown";

    // Map PhantomBuster container states to our simplified status
    let status: "running" | "finished" | "error";

    if (containerStatus === "running" || containerStatus === "starting") {
      status = "running";
    } else if (
      containerStatus === "finished" &&
      (container.exitCode === 0 || agent.lastEndStatus === "success")
    ) {
      status = "finished";
    } else if (containerStatus === "finished") {
      // Finished but with a non-zero exit code or non-success status
      status = "error";
    } else {
      // Unknown / other states
      status = "error";
    }

    const response: {
      status: "running" | "finished" | "error";
      agentId: number;
      agentName?: string;
      progress?: string;
      exitCode?: number;
      executionTime?: number;
      lastEndMessage?: string;
      resultUrls?: { json: string; csv: string } | null;
      results?: unknown[];
    } = {
      status,
      agentId,
      agentName: agent.name,
      progress: container.progress ?? undefined,
      exitCode: container.exitCode,
      executionTime: container.executionTime,
      lastEndMessage: agent.lastEndMessage,
    };

    // If finished successfully, build result URLs and attempt to fetch results
    if (status === "finished") {
      const resultUrls = buildResultFileUrls({
        orgS3Folder: agent.orgS3Folder ?? null,
        s3Folder: agent.s3Folder ?? null,
      });

      response.resultUrls = resultUrls;

      if (resultUrls) {
        try {
          const resultResponse = await fetch(resultUrls.json);
          if (resultResponse.ok) {
            const contentType = resultResponse.headers.get("content-type") ?? "";
            if (contentType.includes("application/json")) {
              const results = await resultResponse.json();
              response.results = Array.isArray(results) ? results : [results];
            } else {
              // Some results come as newline-delimited JSON
              const text = await resultResponse.text();
              const lines = text
                .split("\n")
                .filter((line) => line.trim().length > 0);
              const parsed: unknown[] = [];
              for (const line of lines) {
                try {
                  parsed.push(JSON.parse(line));
                } catch {
                  // Skip malformed lines
                }
              }
              response.results = parsed;
            }
          }
        } catch (fetchErr) {
          // Result fetch failed — still return status info without results
          console.warn(
            "[phantom/status] Could not fetch result file:",
            fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
          );
        }
      }
    }

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[phantom/status] Error:", message);
    return NextResponse.json(
      { error: "Failed to fetch agent status", detail: message },
      { status: 502 }
    );
  }
}
