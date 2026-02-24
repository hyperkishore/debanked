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
