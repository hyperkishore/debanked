import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import {
  createPhantomBusterClient,
  isPhantomBusterConfigured,
} from "@/lib/phantombuster-client";

/**
 * GET /api/cron/phantom-enrich
 *
 * @deprecated Moved to EC2 research-worker (research-worker/lib/profile-enrichment.js).
 * EC2 worker runs daily with no timeout constraint and includes Claude hook synthesis.
 * This Vercel cron version was limited by the 60-second Pro timeout.
 * Kept for manual trigger compatibility but should not be relied upon.
 *
 * Vercel Cron job — runs weekly (Wednesday 6 AM UTC).
 * Enriches P0/P1 company leaders using PhantomBuster:
 *   1. Find leaders missing emails (but have LinkedIn URLs)
 *   2. Launch Email Finder agent in batch
 *   3. Poll for results (max 5 minutes)
 *   4. Update leader records in Supabase
 *
 * Rate limits: Max 20 leaders per run to respect PhantomBuster quotas.
 */

const EMAIL_FINDER_AGENT_ID = 8670599088931508;
const MAX_LEADERS_PER_RUN = 20;
const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 30; // 5 minutes

interface LeaderTarget {
  companyId: number;
  companyName: string;
  leaderIndex: number;
  firstName: string;
  lastName: string;
  linkedinUrl: string;
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPhantomBusterConfigured()) {
    return NextResponse.json(
      { error: "PHANTOMBUSTER_API_KEY not configured" },
      { status: 503 }
    );
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    // 1. Fetch P0+P1 companies with leaders
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id, name, leaders")
      .in("priority", [1, 2])
      .order("priority", { ascending: true });

    if (error || !companies) {
      return NextResponse.json({ error: error?.message || "No companies" }, { status: 500 });
    }

    // 2. Find leaders missing emails but having LinkedIn URLs
    const targets: LeaderTarget[] = [];

    for (const company of companies) {
      const leaders = (company.leaders as Array<{
        n: string;
        t: string;
        li?: string;
        email?: string;
        [key: string]: unknown;
      }>) || [];

      for (let i = 0; i < leaders.length; i++) {
        const leader = leaders[i];
        if (leader.li && !leader.email) {
          const nameParts = leader.n.trim().split(/\s+/);
          if (nameParts.length < 2) continue;

          targets.push({
            companyId: company.id,
            companyName: company.name,
            leaderIndex: i,
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(" "),
            linkedinUrl: leader.li,
          });
        }
      }

      if (targets.length >= MAX_LEADERS_PER_RUN) break;
    }

    const batch = targets.slice(0, MAX_LEADERS_PER_RUN);

    if (batch.length === 0) {
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        message: "No P0/P1 leaders need email enrichment",
        totalCompanies: companies.length,
        leadersEnriched: 0,
      });
    }

    console.log(
      `[Cron:PhantomEnrich] Found ${batch.length} leaders needing emails across ${companies.length} P0/P1 companies`
    );

    // 3. Launch Email Finder via PhantomBuster
    const pb = createPhantomBusterClient();

    // Fetch agent config to preserve saved session/cookies
    const agent = (await pb.fetchAgent(EMAIL_FINDER_AGENT_ID)) as {
      argument?: string;
      [key: string]: unknown;
    };

    let baseArg: Record<string, unknown> = {};
    if (agent.argument) {
      try {
        baseArg = JSON.parse(agent.argument);
      } catch {
        // Start fresh
      }
    }

    // Create org-storage list for this batch
    const listName = `cron-email-${new Date().toISOString().slice(0, 10)}`;
    const listResult = (await pb.saveOrgList({ name: listName })) as {
      id?: number;
      [key: string]: unknown;
    };

    const listId = listResult?.id;

    if (listId) {
      await pb.saveOrgLeads({
        listId,
        leads: batch.map((t) => ({
          firstName: t.firstName,
          lastName: t.lastName,
          companyName: t.companyName,
          linkedinUrl: t.linkedinUrl,
        })),
      });
    }

    const launchArg = {
      ...baseArg,
      ...(listId ? { spreadsheetUrl: `phantom://org-list/${listId}` } : {}),
    };

    const launchResult = (await pb.launchAgent({
      id: EMAIL_FINDER_AGENT_ID,
      argument: JSON.stringify(launchArg),
      saveArgument: false,
    })) as { containerId?: string; [key: string]: unknown };

    const containerId = launchResult?.containerId;
    if (!containerId) {
      return NextResponse.json({
        error: "PhantomBuster launch returned no containerId",
        launchResult,
      }, { status: 502 });
    }

    console.log(`[Cron:PhantomEnrich] Launched Email Finder, container: ${containerId}`);

    // 4. Poll for completion
    let results: Array<{
      firstName?: string;
      lastName?: string;
      email?: string;
      linkedinUrl?: string;
      [key: string]: unknown;
    }> = [];

    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const container = (await pb.fetchContainer(
        parseInt(containerId, 10)
      )) as { status?: string; [key: string]: unknown };

      if (container.status === "finished") {
        try {
          const output = await pb.fetchContainerOutput(parseInt(containerId, 10));
          results = Array.isArray(output) ? output : [];
        } catch {
          console.warn("[Cron:PhantomEnrich] Failed to fetch container output");
        }
        break;
      }

      if (container.status === "error") {
        console.error("[Cron:PhantomEnrich] PhantomBuster agent errored");
        break;
      }
    }

    // 5. Match results back to leaders and update Supabase
    let emailsFound = 0;
    let emailsUpdated = 0;

    // Group targets by company for batch updates
    const byCompany = new Map<number, LeaderTarget[]>();
    for (const t of batch) {
      const existing = byCompany.get(t.companyId) || [];
      existing.push(t);
      byCompany.set(t.companyId, existing);
    }

    for (const [companyId, companyTargets] of byCompany) {
      // Refetch current leaders to avoid stale data
      const { data: company } = await supabase
        .from("companies")
        .select("leaders")
        .eq("id", companyId)
        .single();

      if (!company) continue;

      const leaders = (company.leaders as Array<{
        n: string;
        email?: string;
        [key: string]: unknown;
      }>) || [];

      let updated = false;

      for (const target of companyTargets) {
        // Find matching result by name
        const match = results.find((r) => {
          const rFirst = (r.firstName || "").toLowerCase();
          const rLast = (r.lastName || "").toLowerCase();
          return (
            rFirst === target.firstName.toLowerCase() &&
            rLast === target.lastName.toLowerCase() &&
            r.email
          );
        });

        if (match?.email) {
          emailsFound++;
          if (target.leaderIndex < leaders.length) {
            leaders[target.leaderIndex] = {
              ...leaders[target.leaderIndex],
              email: match.email,
            };
            updated = true;
            emailsUpdated++;
          }
        }
      }

      if (updated) {
        const { error: updateErr } = await supabase
          .from("companies")
          .update({ leaders })
          .eq("id", companyId);

        if (updateErr) {
          console.error(
            `[Cron:PhantomEnrich] Failed to update company ${companyId}:`,
            updateErr.message
          );
        }
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      totalCompanies: companies.length,
      leadersTargeted: batch.length,
      agentResults: results.length,
      emailsFound,
      emailsUpdated,
      containerId,
    };

    console.log("[Cron:PhantomEnrich]", JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[Cron:PhantomEnrich] Fatal error:", err);
    return NextResponse.json(
      { error: "Enrichment failed", details: String(err) },
      { status: 500 }
    );
  }
}
