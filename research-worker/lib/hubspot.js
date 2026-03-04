const HUBSPOT_API_BASE = "https://api.hubapi.com";

/**
 * Fetch HubSpot context for a company: deals, contacts, engagements.
 * Returns null if HubSpot is not configured or company not found.
 */
export async function fetchHubSpotContext(companyDomain) {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey || !companyDomain) return null;

  try {
    // Search for company by domain
    const company = await searchCompanyByDomain(apiKey, companyDomain);
    if (!company) return null;

    // Fetch deals and contacts in parallel
    const [deals, contacts] = await Promise.all([
      fetchDeals(apiKey, company.id),
      fetchContacts(apiKey, company.id),
    ]);

    return {
      hubspotCompanyId: company.id,
      companyName: company.name,
      deals: deals.map((d) => ({
        name: d.dealname,
        stage: d.dealstage,
        amount: d.amount,
        closeDate: d.closedate,
      })),
      contacts: contacts.map((c) => ({
        name: `${c.firstname || ""} ${c.lastname || ""}`.trim(),
        email: c.email,
        title: c.jobtitle,
      })),
    };
  } catch (err) {
    console.error(`[HubSpot] Failed for "${companyDomain}":`, err.message);
    return null;
  }
}

async function hubspotFetch(apiKey, path, options = {}) {
  const res = await fetch(`${HUBSPOT_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`HubSpot API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function searchCompanyByDomain(apiKey, domain) {
  // Strip protocol/path from domain
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");

  const data = await hubspotFetch(
    apiKey,
    "/crm/v3/objects/companies/search",
    {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "domain",
                operator: "CONTAINS_TOKEN",
                value: cleanDomain,
              },
            ],
          },
        ],
        properties: ["name", "domain"],
        limit: 1,
      }),
    }
  );

  const result = data.results?.[0];
  if (!result) return null;

  return {
    id: result.id,
    name: result.properties?.name || "",
  };
}

async function fetchDeals(apiKey, companyId) {
  try {
    // Get associated deals
    const assocData = await hubspotFetch(
      apiKey,
      `/crm/v3/objects/companies/${companyId}/associations/deals`
    );

    const dealIds = (assocData.results || []).map((r) => r.id);
    if (dealIds.length === 0) return [];

    // Batch read deal details
    const dealData = await hubspotFetch(apiKey, "/crm/v3/objects/deals/batch/read", {
      method: "POST",
      body: JSON.stringify({
        inputs: dealIds.map((id) => ({ id })),
        properties: ["dealname", "dealstage", "amount", "closedate"],
      }),
    });

    return (dealData.results || []).map((r) => r.properties);
  } catch {
    return [];
  }
}

async function fetchContacts(apiKey, companyId) {
  try {
    const assocData = await hubspotFetch(
      apiKey,
      `/crm/v3/objects/companies/${companyId}/associations/contacts`
    );

    const contactIds = (assocData.results || []).map((r) => r.id);
    if (contactIds.length === 0) return [];

    const contactData = await hubspotFetch(
      apiKey,
      "/crm/v3/objects/contacts/batch/read",
      {
        method: "POST",
        body: JSON.stringify({
          inputs: contactIds.map((id) => ({ id })),
          properties: ["firstname", "lastname", "email", "jobtitle"],
        }),
      }
    );

    return (contactData.results || []).map((r) => r.properties);
  } catch {
    return [];
  }
}
