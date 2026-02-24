import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import {
  isHubSpotConfigured,
  pullCompanies,
  pullDeals,
  pushDealStage,
  pullContacts,
  pushEngagement,
  mapChannelToHubSpot,
  searchCompanyByDomain,
} from "@/lib/hubspot-client";

/**
 * POST /api/hubspot/sync
 * Bidirectional sync between EventIQ and HubSpot CRM.
 * Body: { direction: "pull" | "push" | "both" }
 *
 * Pull: Import companies + deals from HubSpot -> Supabase
 * Push: Export pipeline stage changes from Supabase -> HubSpot
 */
export async function POST(request: NextRequest) {
  if (!isHubSpotConfigured()) {
    return NextResponse.json(
      { error: "HUBSPOT_API_KEY not configured" },
      { status: 503 }
    );
  }

  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await request.json();
  const direction: string = body.direction || "pull";

  const results: {
    pulled?: { companies: number; deals: number; contacts: number };
    pushed?: { stageUpdates: number; engagements: number };
    errors: string[];
  } = { errors: [] };

  // --- PULL: HubSpot -> Supabase ---
  if (direction === "pull" || direction === "both") {
    try {
      const hsCompanies = await pullCompanies(200);

      // Match HubSpot companies to existing Supabase companies by domain/name
      const { data: existingCompanies } = await supabase
        .from("companies")
        .select("id, name, website");

      let matchedCount = 0;
      for (const hsc of hsCompanies) {
        const match = (existingCompanies || []).find((ec) => {
          if (hsc.domain && ec.website) {
            const ecDomain = ec.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
            return ecDomain.toLowerCase() === hsc.domain.toLowerCase();
          }
          return ec.name.toLowerCase() === hsc.name.toLowerCase();
        });

        if (match) {
          const updates: Record<string, unknown> = {};
          if (hsc.numberofemployees && hsc.numberofemployees > 0) {
            updates.employees = hsc.numberofemployees;
          }
          if (hsc.city || hsc.state) {
            updates.location = [hsc.city, hsc.state].filter(Boolean).join(", ");
          }
          if (Object.keys(updates).length > 0) {
            updates.updated_at = new Date().toISOString();
            await supabase.from("companies").update(updates).eq("id", match.id);
            matchedCount++;
          }
        }
      }

      const hsDeals = await pullDeals(200);

      // Pull contacts from HubSpot companies and update leader emails/phones
      let contactCount = 0;
      for (const hsc of hsCompanies) {
        if (!hsc.id) continue;
        const match = (existingCompanies || []).find((ec) => {
          if (hsc.domain && ec.website) {
            const ecDomain = ec.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
            return ecDomain.toLowerCase() === hsc.domain.toLowerCase();
          }
          return ec.name.toLowerCase() === hsc.name.toLowerCase();
        });

        if (match) {
          try {
            const contacts = await pullContacts(hsc.id);
            if (contacts.length > 0) {
              // Fetch full company data to get leaders
              const { data: fullCompany } = await supabase
                .from("companies")
                .select("leaders")
                .eq("id", match.id)
                .single();

              const leaders = (fullCompany?.leaders || []) as Array<{
                n: string; t: string; bg: string;
                email?: string; phone?: string; li?: string;
              }>;

              let leaderUpdated = false;
              for (const contact of contacts) {
                const leaderMatch = leaders.find((l) => {
                  const contactName = `${contact.firstname} ${contact.lastname}`.toLowerCase().trim();
                  return l.n.toLowerCase().trim() === contactName;
                });

                if (leaderMatch) {
                  if (contact.email && !leaderMatch.email) {
                    leaderMatch.email = contact.email;
                    leaderUpdated = true;
                  }
                  if (contact.phone && !leaderMatch.phone) {
                    leaderMatch.phone = contact.phone;
                    leaderUpdated = true;
                  }
                  if (contact.linkedinUrl && !leaderMatch.li) {
                    leaderMatch.li = contact.linkedinUrl;
                    leaderUpdated = true;
                  }
                }
              }

              if (leaderUpdated) {
                await supabase
                  .from("companies")
                  .update({ leaders, updated_at: new Date().toISOString() })
                  .eq("id", match.id);
                contactCount++;
              }
            }
            await new Promise((r) => setTimeout(r, 100));
          } catch {
            // Skip contact pull errors silently
          }
        }
      }

      results.pulled = {
        companies: matchedCount,
        deals: hsDeals.length,
        contacts: contactCount,
      };
    } catch (err) {
      results.errors.push(`Pull error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // --- PUSH: Supabase -> HubSpot ---
  if (direction === "push" || direction === "both") {
    try {
      const { data: pipelineRecords } = await supabase
        .from("pipeline_records")
        .select("company_id, stage, hubspot_deal_id")
        .eq("user_id", user.id)
        .not("hubspot_deal_id", "is", null);

      let pushCount = 0;
      for (const record of pipelineRecords || []) {
        if (record.hubspot_deal_id) {
          const success = await pushDealStage(record.hubspot_deal_id, record.stage);
          if (success) pushCount++;
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // Push engagements to HubSpot
      let engagementCount = 0;
      const { data: engagements } = await supabase
        .from("engagements")
        .select("*")
        .eq("user_id", user.id)
        .is("hubspot_synced_at", null)
        .limit(50);

      for (const engagement of engagements || []) {
        const hsType = mapChannelToHubSpot(engagement.channel);
        if (!hsType) continue;

        // Find deal ID for this company
        const pipelineRecord = (pipelineRecords || []).find(
          (r) => r.company_id === engagement.company_id
        );
        if (!pipelineRecord?.hubspot_deal_id) continue;

        const body = `[EventIQ] ${engagement.channel}: ${engagement.action}${engagement.notes ? ` — ${engagement.notes}` : ""}`;
        const success = await pushEngagement(
          pipelineRecord.hubspot_deal_id,
          hsType,
          body,
          engagement.timestamp
        );

        if (success) {
          await supabase
            .from("engagements")
            .update({ hubspot_synced_at: new Date().toISOString() })
            .eq("id", engagement.id);
          engagementCount++;
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      results.pushed = { stageUpdates: pushCount, engagements: engagementCount };
    } catch (err) {
      results.errors.push(`Push error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json(results);
}
