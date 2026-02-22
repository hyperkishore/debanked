/**
 * Apollo.io API client for company enrichment.
 * Free tier: 50 credits/month.
 */

export interface ApolloEnrichment {
  employeeCount: number | null;
  revenueEstimate: string | null;
  fundingRounds: Array<{ date: string; amount: string; type: string }>;
  techStack: string[];
  socialLinks: {
    linkedin: string | null;
    twitter: string | null;
    facebook: string | null;
  };
  industry: string | null;
  foundedYear: number | null;
}

/**
 * Enrich a company using Apollo.io API.
 * Requires APOLLO_API_KEY env var.
 */
export async function enrichCompanyViaApollo(
  companyDomain: string
): Promise<ApolloEnrichment | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      "https://api.apollo.io/v1/organizations/enrich",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          api_key: apiKey,
          domain: companyDomain,
        }),
      }
    );

    if (!res.ok) {
      console.error(`[Apollo] HTTP ${res.status} for ${companyDomain}`);
      return null;
    }

    const data = await res.json();
    const org = data.organization;
    if (!org) return null;

    return {
      employeeCount: org.estimated_num_employees || null,
      revenueEstimate: org.annual_revenue_printed || null,
      fundingRounds: (org.funding_events || []).map(
        (f: { date: string; amount: string; type: string }) => ({
          date: f.date || "",
          amount: f.amount || "",
          type: f.type || "",
        })
      ),
      techStack: org.current_technologies?.map(
        (t: { name: string }) => t.name
      ) || [],
      socialLinks: {
        linkedin: org.linkedin_url || null,
        twitter: org.twitter_url || null,
        facebook: org.facebook_url || null,
      },
      industry: org.industry || null,
      foundedYear: org.founded_year || null,
    };
  } catch (err) {
    console.error(`[Apollo] Error enriching ${companyDomain}:`, err);
    return null;
  }
}
