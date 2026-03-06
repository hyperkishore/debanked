/**
 * PhantomBuster API client for EC2 research worker.
 * Ported from eventiq/src/lib/phantombuster-client.ts (plain Node.js ES module).
 */

const PHANTOMBUSTER_API_BASE = "https://api.phantombuster.com";
const PHANTOMBUSTER_S3_BASE = "https://phantombuster.s3.amazonaws.com";

class PhantomBusterApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "PhantomBusterApiError";
    this.status = status;
    this.payload = payload;
  }
}

function getDefaultApiKey() {
  return (
    process.env.PHANTOMBUSTER_API_KEY ||
    process.env.PHANTOM_BUSTER_API_KEY ||
    process.env.PHANTOMBUSTER_KEY ||
    null
  );
}

function normalizeFolder(folder) {
  return folder.replace(/^\/+/, "").replace(/\/+$/, "");
}

export function isPhantomBusterConfigured() {
  return !!getDefaultApiKey();
}

export function buildResultFileUrls(pointers) {
  if (!pointers.orgS3Folder || !pointers.s3Folder) return null;

  const org = normalizeFolder(pointers.orgS3Folder);
  const folder = normalizeFolder(pointers.s3Folder);

  return {
    json: `${PHANTOMBUSTER_S3_BASE}/${org}/${folder}/result.json`,
    csv: `${PHANTOMBUSTER_S3_BASE}/${org}/${folder}/result.csv`,
  };
}

export function createPhantomBusterClient(config = {}) {
  const apiKey = config.apiKey ?? getDefaultApiKey();
  const baseUrl = (config.baseUrl || PHANTOMBUSTER_API_BASE).replace(/\/+$/, "");

  async function request(path, options = {}) {
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

    const response = await fetch(url.toString(), {
      method: options.method || "GET",
      headers: {
        "X-Phantombuster-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new PhantomBusterApiError(
        `PhantomBuster API request failed: ${response.status}`,
        response.status,
        payload
      );
    }

    return payload;
  }

  return {
    // Core agent lifecycle
    launchAgent: (params) =>
      request("/api/v2/agents/launch", { method: "POST", body: params }),
    fetchAgent: (id) =>
      request("/api/v2/agents/fetch", { query: { id } }),
    fetchAllAgents: () =>
      request("/api/v2/agents/fetch-all"),
    fetchAgentOutput: (id) =>
      request("/api/v2/agents/fetch-output", { query: { id } }),
    saveAgent: (payload) =>
      request("/api/v2/agents/save", { method: "POST", body: payload }),

    // Container/run inspection
    fetchContainer: (id) =>
      request("/api/v2/containers/fetch", { query: { id } }),
    fetchAllContainers: () =>
      request("/api/v2/containers/fetch-all"),
    fetchContainerOutput: (id) =>
      request("/api/v2/containers/fetch-output", { query: { id } }),

    // Org storage (beta)
    fetchOrgList: (id) =>
      request("/api/v2/org-storage/lists/fetch", { query: { id } }),
    fetchAllOrgLists: () =>
      request("/api/v2/org-storage/lists/fetch-all"),
    saveOrgList: (payload) =>
      request("/api/v2/org-storage/lists/save", { method: "POST", body: payload }),
    saveOrgLeads: (payload) =>
      request("/api/v2/org-storage/leads/save", { method: "POST", body: payload }),
    fetchOrgLeadsByList: (listId, payload = {}) =>
      request(`/api/v2/org-storage/leads/by-list/${listId}`, { method: "POST", body: payload }),
    searchOrgLeadObjects: (payload) =>
      request("/api/v2/org-storage/leads-objects/search", { method: "POST", body: payload }),

    // Utilities
    buildResultFileUrls,
  };
}

export { PHANTOMBUSTER_API_BASE, PHANTOMBUSTER_S3_BASE, PhantomBusterApiError };
