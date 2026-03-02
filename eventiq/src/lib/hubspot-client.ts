/**
 * Server-side HubSpot API client.
 * Handles bidirectional sync between EventIQ and HubSpot CRM.
 */

const HUBSPOT_API_BASE = "https://api.hubapi.com";

function getApiKey(): string | null {
  return process.env.HUBSPOT_API_KEY || null;
}

async function hubspotFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("HUBSPOT_API_KEY not configured");

  return fetch(`${HUBSPOT_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export interface HubSpotCompany {
  id: string;
  name: string;
  domain: string;
  industry: string;
  numberofemployees: number;
  city: string;
  state: string;
}

export interface HubSpotDeal {
  id: string;
  dealname: string;
  dealstage: string;
  amount: number;
  closedate: string;
  companyId: string;
}

/**
 * Pull companies from HubSpot.
 */
export async function pullCompanies(
  limit = 100
): Promise<HubSpotCompany[]> {
  const res = await hubspotFetch(
    `/crm/v3/objects/companies?limit=${limit}&properties=name,domain,industry,numberofemployees,city,state`
  );
  if (!res.ok) throw new Error(`HubSpot error: ${res.status}`);
  const data = await res.json();
  return (data.results || []).map(
    (r: { id: string; properties: Record<string, string> }) => ({
      id: r.id,
      name: r.properties.name || "",
      domain: r.properties.domain || "",
      industry: r.properties.industry || "",
      numberofemployees: parseInt(r.properties.numberofemployees || "0"),
      city: r.properties.city || "",
      state: r.properties.state || "",
    })
  );
}

/**
 * Pull deals from HubSpot (basic, limited).
 */
export async function pullDeals(limit = 100): Promise<HubSpotDeal[]> {
  const res = await hubspotFetch(
    `/crm/v3/objects/deals?limit=${limit}&properties=dealname,dealstage,amount,closedate&associations=companies`
  );
  if (!res.ok) throw new Error(`HubSpot error: ${res.status}`);
  const data = await res.json();
  return (data.results || []).map(
    (r: {
      id: string;
      properties: Record<string, string>;
      associations?: { companies?: { results?: Array<{ id: string }> } };
    }) => ({
      id: r.id,
      dealname: r.properties.dealname || "",
      dealstage: r.properties.dealstage || "",
      amount: parseFloat(r.properties.amount || "0"),
      closedate: r.properties.closedate || "",
      companyId: r.associations?.companies?.results?.[0]?.id || "",
    })
  );
}

// --- Pipeline Deal Sync (US GTM Pipeline) ---

export const US_GTM_PIPELINE_ID = "749665394";

export interface PipelineStageDef {
  id: string;
  label: string;
}

export interface PipelineDealRecord {
  dealId: string;
  dealName: string;
  stage: string;
  stageLabel: string;
  amount: number | null;
  closeDate: string | null;
  lastModified: string | null;
  product: string | null;
}

/**
 * Fetch all stage definitions for a pipeline.
 */
export async function pullPipelineStages(
  pipelineId: string = US_GTM_PIPELINE_ID
): Promise<PipelineStageDef[]> {
  const res = await hubspotFetch(
    `/crm/v3/pipelines/deals/${pipelineId}/stages`
  );
  if (!res.ok) throw new Error(`HubSpot stages error: ${res.status}`);
  const data = await res.json();
  return (data.results || []).map(
    (r: { id: string; label: string }) => ({ id: r.id, label: r.label })
  );
}

/**
 * Fetch ALL deals from a specific pipeline (paginated via search API).
 */
export async function pullAllPipelineDeals(
  pipelineId: string = US_GTM_PIPELINE_ID,
  stageMap: Map<string, string> = new Map()
): Promise<PipelineDealRecord[]> {
  const allDeals: PipelineDealRecord[] = [];
  let after: string | undefined;

  while (true) {
    const body: Record<string, unknown> = {
      filterGroups: [{
        filters: [{
          propertyName: "pipeline",
          operator: "EQ",
          value: pipelineId,
        }],
      }],
      properties: ["dealname", "dealstage", "amount", "closedate", "hs_lastmodifieddate"],
      limit: 100,
    };
    if (after) body.after = after;

    const res = await hubspotFetch("/crm/v3/objects/deals/search", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`HubSpot deal search error: ${res.status}`);
    const data = await res.json();

    for (const r of data.results || []) {
      const props = r.properties || {};
      const dealName = props.dealname || "";
      const stageId = props.dealstage || "";
      const stageLabel = stageMap.get(stageId) || stageId;

      // Parse product from deal name (e.g. "Kapitus - Clear" → "Clear")
      const dashParts = dealName.split(/\s*-\s*/);
      const product = dashParts.length >= 2 ? dashParts[dashParts.length - 1].trim() : null;

      allDeals.push({
        dealId: r.id,
        dealName,
        stage: stageId,
        stageLabel,
        amount: props.amount ? parseFloat(props.amount) : null,
        closeDate: props.closedate || null,
        lastModified: props.hs_lastmodifieddate
          ? props.hs_lastmodifieddate.split("T")[0]
          : null,
        product,
      });
    }

    if (data.paging?.next?.after) {
      after = data.paging.next.after;
    } else {
      break;
    }
  }

  return allDeals;
}

/**
 * Fuzzy matching utilities for deal-to-company matching.
 */
const STRIP_SUFFIXES = /\b(llc|inc|corp|ltd|co|company|group|capital|funding|financial|holdings|partners|solutions|services|technologies|tech)\b/gi;

export function normalizeCompanyName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(STRIP_SUFFIXES, "")
    .replace(/[^a-z0-9]/g, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function similarityScore(name1: string, name2: string): number {
  const norm1 = normalizeCompanyName(name1);
  const norm2 = normalizeCompanyName(name2);
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = Math.min(norm1.length, norm2.length);
    const longer = Math.max(norm1.length, norm2.length);
    return 0.8 + (0.2 * shorter / longer);
  }
  const dist = levenshtein(norm1, norm2);
  const maxLen = Math.max(norm1.length, norm2.length);
  return Math.max(0, 1 - dist / maxLen);
}

/** Manual override mappings for known mismatches */
const MANUAL_OVERRIDES: Record<string, number> = {
  ecg: 114,   // Expansion Capital Group
  kcg: 1067,  // Kalamata Capital Group
};

const NAME_OVERRIDES: Record<string, string> = {
  "breakout finance": "Breakout Capital Finance",
  "good funding": "GOOD FUNDING LLC",
  "newco": "NewCo Capital Group",
  "prime ft": "Prime Financial Technologies",
};

/**
 * Match a deal to a company using overrides + exact + fuzzy matching.
 */
export function matchDealToCompany(
  dealName: string,
  companiesByNorm: Map<string, { id: number; name: string }>,
  allCompanies: Array<{ id: number; name: string }>,
  threshold = 0.85
): { companyId: number; matchType: string } | null {
  if (!dealName) return null;

  // Parse base name from deal
  const dashParts = dealName.split(/\s*-\s*/);
  const baseName = dashParts.length >= 2
    ? dashParts.slice(0, -1).join(" - ").trim()
    : dealName.trim();
  const lowerBase = baseName.toLowerCase();

  // Check prefix overrides
  for (const [prefix, companyId] of Object.entries(MANUAL_OVERRIDES)) {
    if (lowerBase.startsWith(prefix) || dealName.toLowerCase().startsWith(prefix)) {
      return { companyId, matchType: `override:${prefix}` };
    }
  }

  // Check name overrides
  for (const [trigger, targetName] of Object.entries(NAME_OVERRIDES)) {
    if (lowerBase === trigger || dealName.toLowerCase().includes(trigger)) {
      const match = companiesByNorm.get(normalizeCompanyName(targetName));
      if (match) return { companyId: match.id, matchType: `override:${trigger}` };
    }
  }

  // Exact normalized match
  const normBase = normalizeCompanyName(baseName);
  if (!normBase) return null;
  if (companiesByNorm.has(normBase)) {
    return { companyId: companiesByNorm.get(normBase)!.id, matchType: "exact" };
  }

  // Fuzzy match
  let bestScore = 0;
  let bestCompany: { id: number; name: string } | null = null;
  for (const c of allCompanies) {
    const score = similarityScore(baseName, c.name);
    if (score > bestScore) {
      bestScore = score;
      bestCompany = c;
    }
  }

  if (bestScore >= threshold && bestCompany) {
    return { companyId: bestCompany.id, matchType: `fuzzy(${bestScore.toFixed(2)})` };
  }

  return null;
}

/**
 * Push a pipeline stage update to HubSpot (update deal stage).
 */
export async function pushDealStage(
  dealId: string,
  stage: string
): Promise<boolean> {
  const res = await hubspotFetch(`/crm/v3/objects/deals/${dealId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: { dealstage: stage } }),
  });
  return res.ok;
}

export function isHubSpotConfigured(): boolean {
  return !!getApiKey();
}

/**
 * Get detailed deal info by ID, including associated contacts and companies.
 */
export async function getDealDetail(dealId: string): Promise<{
  id: string;
  dealName: string;
  stage: string;
  amount: number | null;
  closeDate: string | null;
  pipeline: string;
  contacts: Array<{ id: string; name: string; email: string; title: string }>;
  companies: Array<{ id: string; name: string }>;
} | null> {
  const res = await hubspotFetch(
    `/crm/v3/objects/deals/${dealId}?properties=dealname,dealstage,amount,closedate,pipeline&associations=contacts,companies`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const props = data.properties || {};

  const contactIds: string[] = (data.associations?.contacts?.results || []).map((r: { id: string }) => r.id);
  const companyIds: string[] = (data.associations?.companies?.results || []).map((r: { id: string }) => r.id);

  // Fetch associated contacts
  let contacts: Array<{ id: string; name: string; email: string; title: string }> = [];
  if (contactIds.length > 0) {
    const contactRes = await hubspotFetch(`/crm/v3/objects/contacts/batch/read`, {
      method: "POST",
      body: JSON.stringify({
        inputs: contactIds.map((id) => ({ id })),
        properties: ["email", "firstname", "lastname", "jobtitle"],
      }),
    });
    if (contactRes.ok) {
      const contactData = await contactRes.json();
      contacts = (contactData.results || []).map((r: { id: string; properties: Record<string, string> }) => ({
        id: r.id,
        name: [r.properties.firstname, r.properties.lastname].filter(Boolean).join(" "),
        email: r.properties.email || "",
        title: r.properties.jobtitle || "",
      }));
    }
  }

  // Fetch associated companies
  let companies: Array<{ id: string; name: string }> = [];
  if (companyIds.length > 0) {
    const companyRes = await hubspotFetch(`/crm/v3/objects/companies/batch/read`, {
      method: "POST",
      body: JSON.stringify({
        inputs: companyIds.map((id) => ({ id })),
        properties: ["name"],
      }),
    });
    if (companyRes.ok) {
      const companyData = await companyRes.json();
      companies = (companyData.results || []).map((r: { id: string; properties: Record<string, string> }) => ({
        id: r.id,
        name: r.properties.name || "",
      }));
    }
  }

  return {
    id: data.id,
    dealName: props.dealname || "",
    stage: props.dealstage || "",
    amount: props.amount ? parseFloat(props.amount) : null,
    closeDate: props.closedate || null,
    pipeline: props.pipeline || "",
    contacts,
    companies,
  };
}

// --- Contact Management ---

export interface HubSpotContact {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  jobtitle: string;
  phone: string;
  linkedinUrl: string;
}

/**
 * Pull contacts associated with a HubSpot company.
 */
export async function pullContacts(
  companyId: string
): Promise<HubSpotContact[]> {
  // Get associated contact IDs
  const assocRes = await hubspotFetch(
    `/crm/v3/objects/companies/${companyId}/associations/contacts`
  );
  if (!assocRes.ok) return [];
  const assocData = await assocRes.json();
  const contactIds: string[] = (assocData.results || []).map(
    (r: { id: string }) => r.id
  );

  if (contactIds.length === 0) return [];

  // Fetch contact details
  const res = await hubspotFetch(`/crm/v3/objects/contacts/batch/read`, {
    method: "POST",
    body: JSON.stringify({
      inputs: contactIds.map((id) => ({ id })),
      properties: [
        "email",
        "firstname",
        "lastname",
        "jobtitle",
        "phone",
        "hs_linkedin_url",
      ],
    }),
  });

  if (!res.ok) return [];
  const data = await res.json();

  return (data.results || []).map(
    (r: { id: string; properties: Record<string, string> }) => ({
      id: r.id,
      email: r.properties.email || "",
      firstname: r.properties.firstname || "",
      lastname: r.properties.lastname || "",
      jobtitle: r.properties.jobtitle || "",
      phone: r.properties.phone || "",
      linkedinUrl: r.properties.hs_linkedin_url || "",
    })
  );
}

/**
 * Create or update a contact in HubSpot.
 */
export async function createOrUpdateContact(
  email: string,
  properties: Record<string, string>
): Promise<{ id: string } | null> {
  // Try to find existing contact by email
  const searchRes = await hubspotFetch(`/crm/v3/objects/contacts/search`, {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            { propertyName: "email", operator: "EQ", value: email },
          ],
        },
      ],
      limit: 1,
    }),
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    const existing = searchData.results?.[0];

    if (existing) {
      // Update existing contact
      const updateRes = await hubspotFetch(
        `/crm/v3/objects/contacts/${existing.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ properties }),
        }
      );
      return updateRes.ok ? { id: existing.id } : null;
    }
  }

  // Create new contact
  const createRes = await hubspotFetch(`/crm/v3/objects/contacts`, {
    method: "POST",
    body: JSON.stringify({ properties: { email, ...properties } }),
  });

  if (!createRes.ok) return null;
  const createData = await createRes.json();
  return { id: createData.id };
}

/**
 * Search for a HubSpot company by domain.
 */
export async function searchCompanyByDomain(
  domain: string
): Promise<{ id: string; name: string } | null> {
  const res = await hubspotFetch(`/crm/v3/objects/companies/search`, {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            { propertyName: "domain", operator: "EQ", value: domain },
          ],
        },
      ],
      properties: ["name", "domain"],
      limit: 1,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const result = data.results?.[0];
  return result
    ? { id: result.id, name: result.properties.name || "" }
    : null;
}

// --- Engagement Management ---

export type HubSpotEngagementType = "EMAIL" | "CALL" | "MEETING" | "NOTE";

/**
 * Push an engagement activity to HubSpot timeline.
 */
export async function pushEngagement(
  dealId: string,
  type: HubSpotEngagementType,
  body: string,
  timestamp: string
): Promise<boolean> {
  const engagementType = type.toLowerCase();
  const ts = new Date(timestamp).getTime();

  const res = await hubspotFetch(`/crm/v3/objects/${engagementType}s`, {
    method: "POST",
    body: JSON.stringify({
      properties: {
        hs_timestamp: ts.toString(),
        ...(type === "EMAIL"
          ? {
              hs_email_direction: "SENT_BY_OWNER",
              hs_email_subject: "EventIQ Outreach",
              hs_email_text: body,
            }
          : type === "CALL"
            ? {
                hs_call_body: body,
                hs_call_status: "COMPLETED",
              }
            : type === "MEETING"
              ? {
                  hs_meeting_body: body,
                  hs_meeting_outcome: "COMPLETED",
                }
              : {
                  hs_note_body: body,
                }),
      },
      associations: [
        {
          to: { id: dealId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: type === "EMAIL" ? 210 : type === "CALL" ? 212 : type === "MEETING" ? 214 : 216,
            },
          ],
        },
      ],
    }),
  });

  return res.ok;
}

/**
 * Map EventIQ engagement channel to HubSpot engagement type.
 */
export function mapChannelToHubSpot(
  channel: string
): HubSpotEngagementType | null {
  switch (channel) {
    case "email":
      return "EMAIL";
    case "call":
      return "CALL";
    case "meeting":
      return "MEETING";
    case "linkedin":
    case "note":
    case "imessage":
      return "NOTE";
    default:
      return null;
  }
}
