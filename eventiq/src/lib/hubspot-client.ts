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
 * Pull deals from HubSpot.
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
