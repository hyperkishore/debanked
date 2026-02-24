/**
 * Apollo.io API client for company + contact enrichment.
 * Free tier: 50 credits/month.
 */

// --- Types ---

export interface ApolloContact {
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  confidence: number;
}

export interface ApolloPersonEnrichment {
  name: string;
  title: string;
  email: string | null;
  emailConfidence: number;
  phone: string | null;
  linkedinUrl: string | null;
  city: string | null;
  state: string | null;
  headline: string | null;
}

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
  errorCode?: string;
}

/**
 * Enrich a company using Apollo.io API.
 * Requires APOLLO_API_KEY env var.
 * Returns { data, errorCode } discriminating 401/429/404/500.
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
      const errorCode =
        res.status === 401 ? "UNAUTHORIZED" :
        res.status === 429 ? "RATE_LIMITED" :
        res.status === 404 ? "NOT_FOUND" :
        `HTTP_${res.status}`;
      console.error(`[Apollo] HTTP ${res.status} for ${companyDomain}`);
      return {
        employeeCount: null,
        revenueEstimate: null,
        fundingRounds: [],
        techStack: [],
        socialLinks: { linkedin: null, twitter: null, facebook: null },
        industry: null,
        foundedYear: null,
        errorCode,
      };
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

// Target titles for small business lending decision-makers
const TARGET_TITLES = [
  "CEO", "COO", "CRO", "CTO", "CFO",
  "VP Risk", "VP Underwriting", "VP Operations", "VP Technology",
  "Head of Risk", "Head of Underwriting", "Head of Operations",
  "Director of Risk", "Director of Underwriting", "Director of Technology",
  "Chief Risk Officer", "Chief Operating Officer", "Chief Revenue Officer",
  "Managing Director", "President", "Founder", "Co-Founder",
  "SVP", "EVP",
];

/**
 * Search for people at a company using Apollo.io People Search API.
 * Returns contacts matching target decision-maker titles.
 */
export async function searchPeopleAtCompany(
  companyDomain: string,
  companyName: string
): Promise<ApolloContact[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      "https://api.apollo.io/v1/mixed_people/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          api_key: apiKey,
          q_organization_domains: companyDomain,
          person_titles: TARGET_TITLES,
          page: 1,
          per_page: 10,
        }),
      }
    );

    if (!res.ok) {
      console.error(`[Apollo People] HTTP ${res.status} for ${companyName}`);
      return [];
    }

    const data = await res.json();
    const people = data.people || [];

    return people.map((p: {
      name: string;
      title: string;
      email: string;
      phone_numbers?: Array<{ sanitized_number: string }>;
      linkedin_url: string;
      email_confidence?: number;
    }) => ({
      name: p.name || "",
      title: p.title || "",
      email: p.email || null,
      phone: p.phone_numbers?.[0]?.sanitized_number || null,
      linkedinUrl: p.linkedin_url || null,
      confidence: p.email_confidence ?? 0,
    }));
  } catch (err) {
    console.error(`[Apollo People] Error searching ${companyName}:`, err);
    return [];
  }
}

/**
 * Enrich a single person by email using Apollo.io People Match API.
 * Returns verified contact details.
 */
export async function enrichPerson(
  email: string
): Promise<ApolloPersonEnrichment | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      "https://api.apollo.io/v1/people/match",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          api_key: apiKey,
          email,
        }),
      }
    );

    if (!res.ok) {
      console.error(`[Apollo Enrich] HTTP ${res.status} for ${email}`);
      return null;
    }

    const data = await res.json();
    const person = data.person;
    if (!person) return null;

    return {
      name: person.name || "",
      title: person.title || "",
      email: person.email || null,
      emailConfidence: person.email_confidence ?? 0,
      phone: person.phone_numbers?.[0]?.sanitized_number || null,
      linkedinUrl: person.linkedin_url || null,
      city: person.city || null,
      state: person.state || null,
      headline: person.headline || null,
    };
  } catch (err) {
    console.error(`[Apollo Enrich] Error for ${email}:`, err);
    return null;
  }
}

export function isApolloConfigured(): boolean {
  return !!process.env.APOLLO_API_KEY;
}
