import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * GET /api/cron/linkedin-activity
 *
 * @deprecated Moved to EC2 research-worker (research-worker/lib/linkedin-activity.js).
 * EC2 worker runs daily at 6 AM UTC with no timeout constraint.
 * This Vercel cron version was limited by the 60-second Pro timeout.
 * Kept for manual trigger compatibility but should not be relied upon.
 *
 * Auth: Vercel cron sends Authorization: Bearer <CRON_SECRET>
 */

const PHANTOM_API_KEY = process.env.PHANTOMBUSTER_API_KEY || "";
const ACTIVITY_AGENT_ID = process.env.PHANTOM_ACTIVITY_AGENT_ID || "";

interface PhantomResult {
  profileUrl?: string;
  postUrl?: string;
  postContent?: string;
  type?: string; // "post", "share", "comment", "reaction"
  timestamp?: string;
}

async function launchPhantomAgent(linkedinUrls: string[]): Promise<PhantomResult[]> {
  if (!PHANTOM_API_KEY || !ACTIVITY_AGENT_ID) {
    console.log("[LinkedInActivity] PhantomBuster not configured, skipping");
    return [];
  }

  try {
    // Launch the activity extractor agent
    const launchRes = await fetch(
      `https://api.phantombuster.com/api/v2/agents/launch`,
      {
        method: "POST",
        headers: {
          "X-Phantombuster-Key": PHANTOM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: ACTIVITY_AGENT_ID,
          argument: { linkedinUrls },
        }),
      }
    );

    if (!launchRes.ok) {
      console.error("[LinkedInActivity] PhantomBuster launch failed:", await launchRes.text());
      return [];
    }

    const { containerId } = await launchRes.json();

    // Poll for completion (max 5 minutes)
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 10000)); // 10s intervals

      const statusRes = await fetch(
        `https://api.phantombuster.com/api/v2/containers/fetch?id=${containerId}`,
        { headers: { "X-Phantombuster-Key": PHANTOM_API_KEY } }
      );

      if (!statusRes.ok) continue;
      const status = await statusRes.json();

      if (status.status === "finished") {
        // Fetch results
        const outputRes = await fetch(
          `https://api.phantombuster.com/api/v2/containers/fetch-output?id=${containerId}`,
          { headers: { "X-Phantombuster-Key": PHANTOM_API_KEY } }
        );

        if (outputRes.ok) {
          const output = await outputRes.json();
          return Array.isArray(output) ? output : [];
        }
        return [];
      }

      if (status.status === "error") {
        console.error("[LinkedInActivity] PhantomBuster agent error");
        return [];
      }
    }

    console.warn("[LinkedInActivity] PhantomBuster timed out after 5 minutes");
    return [];
  } catch (err) {
    console.error("[LinkedInActivity] PhantomBuster error:", err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
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
    // Get P0 + P1 companies with leaders who have LinkedIn URLs
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, leaders")
      .lte("priority", 3)
      .order("priority", { ascending: true })
      .limit(100);

    if (!companies || companies.length === 0) {
      return NextResponse.json({ message: "No priority companies found" });
    }

    // Extract LinkedIn URLs from leaders
    const leadersWithUrls: { name: string; companyId: number; url: string }[] = [];
    for (const company of companies) {
      const leaders = (company.leaders as Array<{ n: string; li?: string }>) || [];
      for (const leader of leaders) {
        if (leader.li) {
          leadersWithUrls.push({
            name: leader.n,
            companyId: company.id,
            url: leader.li,
          });
        }
      }
    }

    // Limit to top 50 leaders
    const targetLeaders = leadersWithUrls.slice(0, 50);
    const urls = targetLeaders.map((l) => l.url);

    // Launch PhantomBuster extraction
    const results = await launchPhantomAgent(urls);

    // Store results in linkedin_activity table
    let stored = 0;
    if (results.length > 0) {
      const rows = results
        .map((r) => {
          // Match result back to a leader
          const leader = targetLeaders.find(
            (l) => r.profileUrl && l.url.includes(r.profileUrl)
          );

          return {
            leader_name: leader?.name || "Unknown",
            company_id: leader?.companyId || null,
            activity_type: r.type || "post",
            content_summary: (r.postContent || "").slice(0, 2000),
            original_url: r.postUrl || "",
            extracted_at: new Date().toISOString(),
          };
        })
        .filter((r) => r.content_summary.length > 0);

      if (rows.length > 0) {
        const { data, error } = await supabase
          .from("linkedin_activity")
          .insert(rows)
          .select("id");

        if (error) {
          console.error("[LinkedInActivity] Insert error:", error.message);
        } else {
          stored = data?.length || 0;
        }
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      leadersTargeted: targetLeaders.length,
      activitiesFound: results.length,
      activitiesStored: stored,
    };

    console.log("[Cron:LinkedInActivity]", JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[Cron:LinkedInActivity] Fatal error:", err);
    return NextResponse.json(
      { error: "Extraction failed", details: String(err) },
      { status: 500 }
    );
  }
}
