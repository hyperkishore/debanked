/**
 * PhantomBuster pipeline orchestration.
 *
 * Chains PhantomBuster agents (LinkedIn Search Export, Profile Scraper,
 * Email Finder, Activity Extractor) for company enrichment workflows.
 *
 * Independent of UI and Supabase — usable from CLI scripts and server routes.
 */

import { createPhantomBusterClient, buildResultFileUrls } from "./phantombuster-client";
import type { PhantomProfile } from "./phantombuster-enrichment";

// ---------------------------------------------------------------------------
// Agent IDs (verified working on the account)
// ---------------------------------------------------------------------------

export const PHANTOM_AGENTS = {
  SEARCH_EXPORT: 838622632619544,
  PROFILE_SCRAPER: 791859282480955,
  EMAIL_FINDER: 8670599088931508,
  ACTIVITY_EXTRACTOR: 4809884505465873,
} as const;

// ---------------------------------------------------------------------------
// Public result interfaces
// ---------------------------------------------------------------------------

/** Raw row returned by LinkedIn Search Export agent. */
export interface SearchResult {
  query?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  companyName?: string;
  location?: string;
  profileUrl?: string;
  linkedinUrl?: string;
  connectionDegree?: string;
  summary?: string;
  vmid?: string;
  [key: string]: unknown;
}

/** Raw row returned by LinkedIn Profile Scraper agent. */
export interface ProfileResult {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  title?: string;
  description?: string;
  summary?: string;
  linkedinUrl?: string;
  profileUrl?: string;
  imgUrl?: string;
  email?: string;
  phoneNumber?: string;
  phone?: string;
  company?: string;
  companyUrl?: string;
  location?: string;
  connectionDegree?: string;
  vmid?: string;
  [key: string]: unknown;
}

/** Raw row returned by Professional Email Finder agent. */
export interface EmailResult {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  emailStatus?: string;
  linkedinUrl?: string;
  company?: string;
  [key: string]: unknown;
}

/** State snapshot of an agent after polling. */
export interface AgentState {
  id: number;
  name?: string;
  runningContainerId?: number | null;
  lastEndMessage?: string;
  lastStatus?: string;
  s3Folder?: string;
  orgS3Folder?: string;
  [key: string]: unknown;
}

/** Options for {@link pollUntilDone}. */
export interface PollOptions {
  /** Maximum time to wait in ms (default: 300_000 = 5 min). */
  timeoutMs?: number;
  /** Interval between polls in ms (default: 5_000 = 5 s). */
  intervalMs?: number;
  /** Optional callback invoked on each poll tick. */
  onTick?: (agent: AgentState, elapsed: number) => void;
}

// ---------------------------------------------------------------------------
// Client type helper
// ---------------------------------------------------------------------------

export type PhantomClient = ReturnType<typeof createPhantomBusterClient>;

// ---------------------------------------------------------------------------
// LinkedIn search URL builder
// ---------------------------------------------------------------------------

/**
 * Build a LinkedIn people-search URL for a company name with optional title
 * keywords.  The URL points to the public LinkedIn search page.
 *
 * @example
 *   buildSearchUrl("Acme Corp", ["COO", "CRO"])
 *   // https://www.linkedin.com/search/results/people/?keywords=Acme%20Corp%20COO%20OR%20CRO
 */
export function buildSearchUrl(companyName: string, titles?: string[]): string {
  // Quote company name for exact matching to avoid generic results
  let keywords = `"${companyName}"`;
  if (titles && titles.length > 0) {
    keywords += " " + titles.join(" OR ");
  }
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}

// ---------------------------------------------------------------------------
// Saved-argument merge helper
// ---------------------------------------------------------------------------

/**
 * Fetch the agent's current saved argument, parse it, merge overrides,
 * and return a JSON string ready to pass as `argument` to `launchAgent`.
 */
async function mergeArgument(
  client: PhantomClient,
  agentId: number,
  overrides: Record<string, unknown>
): Promise<string> {
  const agent = (await client.fetchAgent(agentId)) as Record<string, unknown>;
  let saved: Record<string, unknown> = {};
  if (typeof agent.argument === "string") {
    try {
      saved = JSON.parse(agent.argument);
    } catch {
      // If the saved argument is not valid JSON, start from scratch.
      saved = {};
    }
  } else if (agent.argument && typeof agent.argument === "object") {
    saved = agent.argument as Record<string, unknown>;
  }
  return JSON.stringify({ ...saved, ...overrides });
}

// ---------------------------------------------------------------------------
// Launch helpers
// ---------------------------------------------------------------------------

/**
 * Launch the LinkedIn Search Export agent.
 *
 * Fetches the agent's saved argument, merges the `linkedInSearchUrl` and
 * optional `numberOfResultsPerSearch` overrides, then launches with
 * `saveArgument: false` so the saved config is preserved.
 */
export async function launchSearchExport(
  client: PhantomClient,
  searchUrl: string,
  maxResults = 25
): Promise<unknown> {
  const argument = await mergeArgument(client, PHANTOM_AGENTS.SEARCH_EXPORT, {
    linkedInSearchUrl: searchUrl,
    numberOfResultsPerSearch: maxResults,
  });
  return client.launchAgent({
    id: PHANTOM_AGENTS.SEARCH_EXPORT,
    argument,
    saveArgument: false,
  });
}

/**
 * Launch the LinkedIn Profile Scraper agent.
 *
 * Creates an org-storage list, pushes the profile URLs as leads, then
 * launches the agent with `spreadsheetUrl` pointed at the org-storage
 * list and `columnName` set to `"profileUrl"`.
 */
export async function launchProfileScraper(
  client: PhantomClient,
  profileUrls: string[]
): Promise<unknown> {
  // 1. Create an org-storage list for this run
  const list = (await client.saveOrgList({
    name: `profile-scraper-input-${Date.now()}`,
  })) as { id: number };

  // 2. Push leads — each lead has a `profileUrl` field
  const leads = profileUrls.map((url) => ({ profileUrl: url }));
  await client.saveOrgLeads({ listId: list.id, leads });

  // 3. Merge argument and launch
  const spreadsheetUrl = `org-storage://leads/by-list/${list.id}`;
  const argument = await mergeArgument(client, PHANTOM_AGENTS.PROFILE_SCRAPER, {
    spreadsheetUrl,
    columnName: "profileUrl",
  });
  return client.launchAgent({
    id: PHANTOM_AGENTS.PROFILE_SCRAPER,
    argument,
    saveArgument: false,
  });
}

/**
 * Launch the Professional Email Finder agent.
 *
 * Creates an org-storage list, pushes contacts (firstName, lastName,
 * company) as leads, then launches the agent with `spreadsheetUrl`
 * pointed at the org-storage list.
 */
export async function launchEmailFinder(
  client: PhantomClient,
  contacts: { firstName: string; lastName: string; company: string }[]
): Promise<unknown> {
  // 1. Create an org-storage list
  const list = (await client.saveOrgList({
    name: `email-finder-input-${Date.now()}`,
  })) as { id: number };

  // 2. Push leads
  await client.saveOrgLeads({ listId: list.id, leads: contacts });

  // 3. Merge argument and launch
  const spreadsheetUrl = `org-storage://leads/by-list/${list.id}`;
  const argument = await mergeArgument(client, PHANTOM_AGENTS.EMAIL_FINDER, {
    spreadsheetUrl,
  });
  return client.launchAgent({
    id: PHANTOM_AGENTS.EMAIL_FINDER,
    argument,
    saveArgument: false,
  });
}

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------

/**
 * Poll an agent until it is no longer running.
 *
 * Checks `agent.runningContainerId` — when it becomes `null` the agent
 * has finished (or errored). Also inspects `container.status` when a
 * running container exists.
 *
 * @returns The final agent state after the run completes.
 * @throws If the timeout is exceeded.
 */
export async function pollUntilDone(
  client: PhantomClient,
  agentId: number,
  options: PollOptions = {}
): Promise<AgentState> {
  const {
    timeoutMs = 300_000,
    intervalMs = 5_000,
    onTick,
  } = options;

  const start = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const agent = (await client.fetchAgent(agentId)) as AgentState;
    const elapsed = Date.now() - start;

    onTick?.(agent, elapsed);

    // If there is no running container, the run has finished (or never started).
    if (!agent.runningContainerId) {
      return agent;
    }

    // Double-check container status for more granular state.
    try {
      const container = (await client.fetchContainer(
        agent.runningContainerId
      )) as { status?: string; [key: string]: unknown };
      if (
        container.status === "finished" ||
        container.status === "error" ||
        container.status === "stopped"
      ) {
        // Re-fetch agent to get updated post-run state.
        return (await client.fetchAgent(agentId)) as AgentState;
      }
    } catch {
      // Container fetch can fail if the ID is stale; fall through to re-poll.
    }

    if (elapsed >= timeoutMs) {
      throw new Error(
        `pollUntilDone: agent ${agentId} did not finish within ${timeoutMs}ms`
      );
    }

    await sleep(intervalMs);
  }
}

// ---------------------------------------------------------------------------
// Result fetching
// ---------------------------------------------------------------------------

/**
 * Fetch the JSON result file for a given agent.
 *
 * Reads `orgS3Folder` and `s3Folder` from the agent, builds the S3 URL
 * via {@link buildResultFileUrls}, fetches and parses the JSON array.
 */
export async function fetchResults<T = unknown>(
  client: PhantomClient,
  agentId: number
): Promise<T[]> {
  const agent = (await client.fetchAgent(agentId)) as AgentState;
  const urls = buildResultFileUrls({
    orgS3Folder: agent.orgS3Folder ?? null,
    s3Folder: agent.s3Folder ?? null,
  });

  if (!urls) {
    throw new Error(
      `fetchResults: agent ${agentId} has no S3 folder pointers — run may not have produced output`
    );
  }

  const response = await fetch(urls.json);
  if (!response.ok) {
    throw new Error(
      `fetchResults: failed to fetch ${urls.json} — ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [data];
}

// ---------------------------------------------------------------------------
// Result mappers
// ---------------------------------------------------------------------------

/**
 * Map raw LinkedIn Search Export rows to the canonical {@link PhantomProfile}
 * format used by the enrichment layer.
 */
export function mapSearchToProfiles(results: SearchResult[]): PhantomProfile[] {
  return results
    .filter((r) => r.fullName || r.firstName || r.lastName)
    .map((r) => ({
      fullName:
        r.fullName ||
        [r.firstName, r.lastName].filter(Boolean).join(" "),
      title: r.title || "",
      summary: r.summary,
      linkedinUrl: r.profileUrl || r.linkedinUrl,
      sourceUrl: r.profileUrl || r.linkedinUrl,
    }));
}

/**
 * Map raw LinkedIn Profile Scraper rows to {@link PhantomProfile}.
 */
export function mapScrapedToProfiles(results: ProfileResult[]): PhantomProfile[] {
  return results
    .filter((r) => r.fullName || r.firstName || r.lastName)
    .map((r) => ({
      fullName:
        r.fullName ||
        [r.firstName, r.lastName].filter(Boolean).join(" "),
      title: r.headline || r.title || "",
      summary: r.description || r.summary,
      linkedinUrl: r.linkedinUrl || r.profileUrl,
      sourceUrl: r.linkedinUrl || r.profileUrl,
      email: r.email,
      phone: r.phoneNumber || r.phone,
    }));
}

/**
 * Merge email-finder results into an existing set of profiles.
 *
 * Matches by normalized full name. If a matching profile already has an
 * email, the existing value is kept (email-finder results act as backfill).
 */
export function applyEmailResults(
  profiles: PhantomProfile[],
  emails: EmailResult[]
): PhantomProfile[] {
  // Build a lookup from normalized name to the best email hit.
  const emailMap = new Map<string, EmailResult>();
  for (const e of emails) {
    if (!e.email) continue;
    const name =
      e.fullName ||
      [e.firstName, e.lastName].filter(Boolean).join(" ");
    if (!name) continue;
    const key = normalizeName(name);
    // Prefer results with a verified status.
    const existing = emailMap.get(key);
    if (
      !existing ||
      (e.emailStatus === "verified" && existing.emailStatus !== "verified")
    ) {
      emailMap.set(key, e);
    }
  }

  return profiles.map((p) => {
    if (p.email) return p; // Already has email — no overwrite.
    const hit = emailMap.get(normalizeName(p.fullName));
    if (!hit || !hit.email) return p;
    return { ...p, email: hit.email };
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize a person name for fuzzy matching: lowercase, collapse
 * whitespace, strip common suffixes.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv|phd|md|esq|cpa)\.?\b/gi, "")
    .trim();
}
