import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";
import { searchPeopleAtCompany, isApolloConfigured } from "@/lib/enrichment/apollo";

/**
 * POST /api/enrich/contacts
 * Enrich company leaders with contact info from Apollo.io.
 * Body: { companyId: number } or { companyIds: number[] } (max 10)
 */
export async function POST(request: NextRequest) {
  if (!isApolloConfigured()) {
    return apiError("APOLLO_API_KEY not configured", 503);
  }

  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const body = await request.json();
  const companyIds: number[] = body.companyIds
    ? body.companyIds.slice(0, 10)
    : body.companyId
      ? [body.companyId]
      : [];

  if (companyIds.length === 0) {
    return apiError("companyId or companyIds required", 400);
  }

  const results: Array<{
    companyId: number;
    companyName: string;
    contactsFound: number;
    contactsUpdated: number;
    errors: string[];
  }> = [];

  for (const companyId of companyIds) {
    const entry: typeof results[0] = {
      companyId,
      companyName: "",
      contactsFound: 0,
      contactsUpdated: 0,
      errors: [],
    };

    try {
      // Fetch company from Supabase
      const { data: company, error: fetchError } = await supabase
        .from("companies")
        .select("id, name, website, leaders")
        .eq("id", companyId)
        .single();

      if (fetchError || !company) {
        entry.errors.push(`Company ${companyId} not found`);
        results.push(entry);
        continue;
      }

      entry.companyName = company.name;

      // Extract domain from website
      const domain = company.website
        ?.replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .replace(/^www\./, "");

      if (!domain) {
        entry.errors.push("No website domain to search");
        results.push(entry);
        continue;
      }

      // Search Apollo for people at this company
      const apolloContacts = await searchPeopleAtCompany(domain, company.name);
      entry.contactsFound = apolloContacts.length;

      if (apolloContacts.length === 0) {
        results.push(entry);
        continue;
      }

      // Match Apollo contacts to existing leaders and update
      const leaders = (company.leaders || []) as Array<{
        n: string;
        t: string;
        bg: string;
        hooks?: string[];
        li?: string;
        email?: string;
        phone?: string;
        confidence?: number;
        functionalRole?: string;
      }>;

      let updated = false;
      for (const apolloContact of apolloContacts) {
        // Try to match by name (fuzzy)
        const matchedLeader = leaders.find((l) => {
          const apolloName = apolloContact.name.toLowerCase().trim();
          const leaderName = l.n.toLowerCase().trim();
          // Exact match or first+last name match
          if (leaderName === apolloName) return true;
          const apolloParts = apolloName.split(" ");
          const leaderParts = leaderName.split(" ");
          return (
            apolloParts[0] === leaderParts[0] &&
            apolloParts[apolloParts.length - 1] === leaderParts[leaderParts.length - 1]
          );
        });

        if (matchedLeader) {
          // Update leader with Apollo data (don't overwrite existing data)
          if (apolloContact.email && !matchedLeader.email) {
            matchedLeader.email = apolloContact.email;
            matchedLeader.confidence = apolloContact.confidence;
            updated = true;
            entry.contactsUpdated++;
          }
          if (apolloContact.phone && !matchedLeader.phone) {
            matchedLeader.phone = apolloContact.phone;
            updated = true;
          }
          if (apolloContact.linkedinUrl && !matchedLeader.li) {
            matchedLeader.li = apolloContact.linkedinUrl;
            updated = true;
          }
        }
      }

      // Save updated leaders back to Supabase
      if (updated) {
        const { error: updateError } = await supabase
          .from("companies")
          .update({
            leaders,
            updated_at: new Date().toISOString(),
          })
          .eq("id", companyId);

        if (updateError) {
          entry.errors.push(`Update failed: ${updateError.message}`);
        }
      }
    } catch (err) {
      entry.errors.push(err instanceof Error ? err.message : String(err));
    }

    results.push(entry);

    // Rate limiting: 200ms between companies
    if (companyIds.indexOf(companyId) < companyIds.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const summary = {
    totalCompanies: results.length,
    totalContactsFound: results.reduce((a, r) => a + r.contactsFound, 0),
    totalContactsUpdated: results.reduce((a, r) => a + r.contactsUpdated, 0),
    results,
  };

  return NextResponse.json(summary);
}
