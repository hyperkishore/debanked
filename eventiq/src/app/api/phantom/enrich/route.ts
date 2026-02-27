import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";
import {
  createPhantomBusterClient,
  isPhantomBusterConfigured,
} from "@/lib/phantombuster-client";

/**
 * PhantomBuster agent IDs for each enrichment mode.
 */
const AGENTS = {
  SEARCH_EXPORT: 838622632619544,
  PROFILE_SCRAPER: 791859282480955,
  EMAIL_FINDER: 8670599088931508,
} as const;

/**
 * Build a LinkedIn Sales Navigator search URL for a company + title filter.
 */
function buildLinkedInSearchUrl(
  companyName: string,
  titles: string[]
): string {
  const titleQuery = titles
    .map((t) => `"${t}"`)
    .join(" OR ");
  const query = encodeURIComponent(
    `"${companyName}" ${titleQuery}`
  );
  return `https://www.linkedin.com/search/results/people/?keywords=${query}`;
}

/**
 * POST /api/phantom/enrich
 *
 * Trigger PhantomBuster enrichment for companies.
 *
 * Body shapes by mode:
 *
 * "search" mode:
 *   { mode: "search", companyIds?: number[], companies?: { name: string }[], titles?: string[], maxResults?: number }
 *
 * "scrape" mode:
 *   { mode: "scrape", linkedinUrls: string[] }
 *
 * "email" mode:
 *   { mode: "email", contacts: { firstName: string, lastName: string, company: string }[] }
 */
export async function POST(request: NextRequest) {
  if (!isPhantomBusterConfigured()) {
    return apiError("PHANTOMBUSTER_API_KEY not configured", 503);
  }

  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const body = await request.json();
  const { mode } = body;

  if (!mode || !["search", "scrape", "email"].includes(mode)) {
    return apiError(
      'mode is required and must be one of: "search", "scrape", "email"',
      400
    );
  }

  const pb = createPhantomBusterClient();

  try {
    // -------------------------------------------------------------------
    // SEARCH mode: build LinkedIn search URLs, launch Search Export agent
    // -------------------------------------------------------------------
    if (mode === "search") {
      const titles: string[] = body.titles ?? [
        "CEO",
        "COO",
        "CRO",
        "Chief Risk Officer",
        "Head of Underwriting",
        "VP Operations",
      ];
      const maxResults: number = body.maxResults ?? 10;

      // Resolve company list: either from body or from Supabase
      let companies: { id?: number; name: string }[] = [];

      if (body.companies && Array.isArray(body.companies)) {
        companies = body.companies;
      } else if (body.companyIds && Array.isArray(body.companyIds)) {
        const ids: number[] = body.companyIds.slice(0, 50);
        const { data, error } = await supabase
          .from("companies")
          .select("id, name")
          .in("id", ids);

        if (error) {
          return apiError(`Supabase query failed: ${error.message}`, 500);
        }
        companies = data ?? [];
      } else {
        return apiError(
          "search mode requires companyIds or companies array",
          400
        );
      }

      if (companies.length === 0) {
        return apiError("No companies resolved for search", 400);
      }

      // Build search URLs for each company
      const searchUrls = companies.map((c) =>
        buildLinkedInSearchUrl(c.name, titles)
      );

      // Fetch the agent's current argument to use as base (preserves cookies/session)
      const agent = (await pb.fetchAgent(AGENTS.SEARCH_EXPORT)) as {
        argument?: string;
        [key: string]: unknown;
      };

      let baseArg: Record<string, unknown> = {};
      if (agent.argument) {
        try {
          baseArg = JSON.parse(agent.argument);
        } catch {
          // If parse fails, start fresh
        }
      }

      // Merge overrides: set search URLs and result limit
      const launchArg = {
        ...baseArg,
        searches: searchUrls,
        numberOfResultsPerSearch: maxResults,
      };

      const result = await pb.launchAgent({
        id: AGENTS.SEARCH_EXPORT,
        argument: JSON.stringify(launchArg),
        saveArgument: false,
      });

      return NextResponse.json({
        status: "launched",
        agentId: AGENTS.SEARCH_EXPORT,
        companies: companies.map((c) => c.name),
        searchUrls,
        launchResult: result,
      });
    }

    // -------------------------------------------------------------------
    // SCRAPE mode: create org-storage list, launch Profile Scraper
    // -------------------------------------------------------------------
    if (mode === "scrape") {
      const linkedinUrls: string[] = body.linkedinUrls;

      if (!Array.isArray(linkedinUrls) || linkedinUrls.length === 0) {
        return apiError(
          "scrape mode requires a non-empty linkedinUrls array",
          400
        );
      }

      // Create an org-storage list for this scrape batch
      const listName = `scrape-batch-${Date.now()}`;
      const listResult = (await pb.saveOrgList({
        name: listName,
      })) as { id?: number; [key: string]: unknown };

      const listId = listResult?.id;

      // Add LinkedIn URLs as leads to the list
      if (listId) {
        await pb.saveOrgLeads({
          listId,
          leads: linkedinUrls.map((url) => ({
            linkedinUrl: url,
          })),
        });
      }

      // Fetch the agent's current argument to preserve session config
      const agent = (await pb.fetchAgent(AGENTS.PROFILE_SCRAPER)) as {
        argument?: string;
        [key: string]: unknown;
      };

      let baseArg: Record<string, unknown> = {};
      if (agent.argument) {
        try {
          baseArg = JSON.parse(agent.argument);
        } catch {
          // Start fresh on parse failure
        }
      }

      const launchArg = {
        ...baseArg,
        ...(listId
          ? { spreadsheetUrl: `phantom://org-list/${listId}` }
          : { spreadsheetUrl: linkedinUrls }),
      };

      const result = await pb.launchAgent({
        id: AGENTS.PROFILE_SCRAPER,
        argument: JSON.stringify(launchArg),
        saveArgument: false,
      });

      return NextResponse.json({
        status: "launched",
        agentId: AGENTS.PROFILE_SCRAPER,
        listId,
        listName,
        urlCount: linkedinUrls.length,
        launchResult: result,
      });
    }

    // -------------------------------------------------------------------
    // EMAIL mode: create org-storage list, launch Email Finder
    // -------------------------------------------------------------------
    if (mode === "email") {
      const contacts: { firstName: string; lastName: string; company: string }[] =
        body.contacts;

      if (!Array.isArray(contacts) || contacts.length === 0) {
        return apiError(
          "email mode requires a non-empty contacts array with { firstName, lastName, company }",
          400
        );
      }

      // Validate each contact has the required fields
      for (let i = 0; i < contacts.length; i++) {
        const c = contacts[i];
        if (!c.firstName || !c.lastName || !c.company) {
          return apiError(
            `contacts[${i}] missing required fields: firstName, lastName, company`,
            400
          );
        }
      }

      // Create an org-storage list for this email batch
      const listName = `email-batch-${Date.now()}`;
      const listResult = (await pb.saveOrgList({
        name: listName,
      })) as { id?: number; [key: string]: unknown };

      const listId = listResult?.id;

      // Add contacts as leads to the list
      if (listId) {
        await pb.saveOrgLeads({
          listId,
          leads: contacts.map((c) => ({
            firstName: c.firstName,
            lastName: c.lastName,
            companyName: c.company,
          })),
        });
      }

      // Fetch the agent's current argument to preserve session config
      const agent = (await pb.fetchAgent(AGENTS.EMAIL_FINDER)) as {
        argument?: string;
        [key: string]: unknown;
      };

      let baseArg: Record<string, unknown> = {};
      if (agent.argument) {
        try {
          baseArg = JSON.parse(agent.argument);
        } catch {
          // Start fresh on parse failure
        }
      }

      const launchArg = {
        ...baseArg,
        ...(listId
          ? { spreadsheetUrl: `phantom://org-list/${listId}` }
          : {}),
      };

      const result = await pb.launchAgent({
        id: AGENTS.EMAIL_FINDER,
        argument: JSON.stringify(launchArg),
        saveArgument: false,
      });

      return NextResponse.json({
        status: "launched",
        agentId: AGENTS.EMAIL_FINDER,
        listId,
        listName,
        contactCount: contacts.length,
        launchResult: result,
      });
    }

    // Should not reach here due to mode validation above
    return apiError("Unhandled mode", 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[phantom/enrich] Launch error:", message);
    return NextResponse.json(
      { error: "PhantomBuster launch failed", detail: message },
      { status: 502 }
    );
  }
}
