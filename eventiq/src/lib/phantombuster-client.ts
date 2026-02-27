/**
 * Standalone PhantomBuster API client.
 *
 * Independent of EventIQ runtime integration:
 * - No UI coupling
 * - No Supabase coupling
 * - Supports injected fetch for unit testing
 */

export const PHANTOMBUSTER_API_BASE = "https://api.phantombuster.com";
export const PHANTOMBUSTER_S3_BASE = "https://phantombuster.s3.amazonaws.com";

export interface PhantomBusterClientConfig {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface LaunchAgentParams {
  id: number;
  argument?: unknown;
  saveArgument?: boolean;
}

export interface SaveAgentPayload {
  id?: number;
  name?: string;
  [key: string]: unknown;
}

export interface ResultPointers {
  orgS3Folder?: string | null;
  s3Folder?: string | null;
}

export interface ResultFileUrls {
  json: string;
  csv: string;
}

export class PhantomBusterApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "PhantomBusterApiError";
    this.status = status;
    this.payload = payload;
  }
}

function getDefaultApiKey(): string | null {
  return (
    process.env.PHANTOMBUSTER_API_KEY ||
    process.env.PHANTOM_BUSTER_API_KEY ||
    process.env.PHANTOMBUSTER_KEY ||
    null
  );
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function normalizeFolder(folder: string): string {
  return folder.replace(/^\/+/, "").replace(/\/+$/, "");
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path, `${PHANTOMBUSTER_API_BASE}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export function isPhantomBusterConfigured(): boolean {
  return !!getDefaultApiKey();
}

export function buildResultFileUrls(
  pointers: ResultPointers,
  s3BaseUrl: string = PHANTOMBUSTER_S3_BASE
): ResultFileUrls | null {
  if (!pointers.orgS3Folder || !pointers.s3Folder) return null;

  const org = normalizeFolder(pointers.orgS3Folder);
  const folder = normalizeFolder(pointers.s3Folder);
  const base = normalizeBaseUrl(s3BaseUrl);

  return {
    json: `${base}/${org}/${folder}/result.json`,
    csv: `${base}/${org}/${folder}/result.csv`,
  };
}

export function createPhantomBusterClient(config: PhantomBusterClientConfig = {}) {
  const apiKey = config.apiKey ?? getDefaultApiKey();
  const fetchImpl = config.fetchImpl ?? fetch;
  const baseUrl = normalizeBaseUrl(config.baseUrl || PHANTOMBUSTER_API_BASE);

  async function request<T>(
    path: string,
    options: {
      method?: "GET" | "POST";
      query?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
    } = {}
  ): Promise<T> {
    if (!apiKey) {
      throw new Error("PHANTOMBUSTER_API_KEY not configured");
    }

    const url = new URL(path, `${baseUrl}/`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined) continue;
        url.searchParams.set(k, String(v));
      }
    }

    const response = await fetchImpl(url.toString(), {
      method: options.method || "GET",
      headers: {
        "X-Phantombuster-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const payload = await parseResponsePayload(response);

    if (!response.ok) {
      throw new PhantomBusterApiError(
        `PhantomBuster API request failed: ${response.status}`,
        response.status,
        payload
      );
    }

    return payload as T;
  }

  return {
    // Core agent lifecycle
    launchAgent: (params: LaunchAgentParams) =>
      request("/api/v2/agents/launch", { method: "POST", body: params }),
    fetchAgent: (id: number) =>
      request("/api/v2/agents/fetch", { query: { id } }),
    fetchAllAgents: () => request("/api/v2/agents/fetch-all"),
    fetchAgentOutput: (id: number) =>
      request("/api/v2/agents/fetch-output", { query: { id } }),
    saveAgent: (payload: SaveAgentPayload) =>
      request("/api/v2/agents/save", { method: "POST", body: payload }),

    // Container/run inspection
    fetchContainer: (id: number) =>
      request("/api/v2/containers/fetch", { query: { id } }),
    fetchAllContainers: () => request("/api/v2/containers/fetch-all"),
    fetchContainerOutput: (id: number) =>
      request("/api/v2/containers/fetch-output", { query: { id } }),

    // Org storage (beta)
    fetchOrgList: (id: number) =>
      request("/api/v2/org-storage/lists/fetch", { query: { id } }),
    fetchAllOrgLists: () =>
      request("/api/v2/org-storage/lists/fetch-all"),
    saveOrgList: (payload: Record<string, unknown>) =>
      request("/api/v2/org-storage/lists/save", { method: "POST", body: payload }),
    saveOrgLeads: (payload: Record<string, unknown>) =>
      request("/api/v2/org-storage/leads/save", { method: "POST", body: payload }),
    fetchOrgLeadsByList: (listId: number, payload: Record<string, unknown> = {}) =>
      request(`/api/v2/org-storage/leads/by-list/${listId}`, { method: "POST", body: payload }),
    searchOrgLeadObjects: (payload: Record<string, unknown>) =>
      request("/api/v2/org-storage/leads-objects/search", { method: "POST", body: payload }),

    // Utilities
    buildResultFileUrls,
    buildUrl,
  };
}

export const phantomBusterUrl = buildUrl;
