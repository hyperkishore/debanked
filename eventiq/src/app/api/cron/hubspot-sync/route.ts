import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import {
  isHubSpotConfigured,
  pullCompanies,
  pullContacts,
  pushDealStage,
  pushEngagement,
  mapChannelToHubSpot,
  pullPipelineStages,
  pullAllPipelineDeals,
  normalizeCompanyName,
  matchDealToCompany,
  US_GTM_PIPELINE_ID,
  PipelineDealRecord,
} from "@/lib/hubspot-client";

/**
 * GET /api/cron/hubspot-sync
 * Weekly cron: Pull fresh data from HubSpot + push recent engagements.
 * Runs Monday at 7 AM UTC via Vercel cron.
 */
export async function GET() {
  if (!isHubSpotConfigured()) {
    return NextResponse.json({ skipped: "HUBSPOT_API_KEY not configured" });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const results: {
    pulled: { companies: number; contacts: number; deals: number };
    pushed: { stages: number; engagements: number };
    errors: string[];
    duration: number;
  } = {
    pulled: { companies: 0, contacts: 0, deals: 0 },
    pushed: { stages: 0, engagements: 0 },
    errors: [],
    duration: 0,
  };

  const startTime = Date.now();

  try {
    // --- PULL ---
    const hsCompanies = await pullCompanies(200);
    const { data: existingCompanies } = await supabase
      .from("companies")
      .select("id, name, website");

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
        if (hsc.numberofemployees > 0) updates.employees = hsc.numberofemployees;
        if (hsc.city || hsc.state) updates.location = [hsc.city, hsc.state].filter(Boolean).join(", ");
        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          await supabase.from("companies").update(updates).eq("id", match.id);
          results.pulled.companies++;
        }

        // Pull contacts for matched companies
        try {
          const contacts = await pullContacts(hsc.id);
          if (contacts.length > 0) {
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
              results.pulled.contacts++;
            }
          }
          await new Promise((r) => setTimeout(r, 100));
        } catch {
          // Skip individual contact pull errors
        }
      }
    }

    // --- DEAL SYNC (US GTM Pipeline → hubspot_deals JSONB) ---
    try {
      const stages = await pullPipelineStages(US_GTM_PIPELINE_ID);
      const stageMap = new Map(stages.map((s) => [s.id, s.label]));
      const allDeals = await pullAllPipelineDeals(US_GTM_PIPELINE_ID, stageMap);

      // Build company lookup indices
      const companiesByNorm = new Map<string, { id: number; name: string }>();
      const allCompanyList: { id: number; name: string }[] = [];
      for (const ec of existingCompanies || []) {
        const norm = normalizeCompanyName(ec.name);
        if (norm) companiesByNorm.set(norm, { id: ec.id, name: ec.name });
        allCompanyList.push({ id: ec.id, name: ec.name });
      }

      // Match deals → group by company → update hubspot_deals
      const dealsByCompany = new Map<number, PipelineDealRecord[]>();
      for (const deal of allDeals) {
        const match = matchDealToCompany(deal.dealName, companiesByNorm, allCompanyList);
        if (match) {
          if (!dealsByCompany.has(match.companyId)) {
            dealsByCompany.set(match.companyId, []);
          }
          dealsByCompany.get(match.companyId)!.push(deal);
        }
      }

      for (const [companyId, deals] of dealsByCompany) {
        const hubspotDeals = deals.map((d) => ({
          dealId: d.dealId,
          dealName: d.dealName,
          stage: d.stageLabel,
          stageId: d.stage,
          amount: d.amount,
          closeDate: d.closeDate,
          lastModified: d.lastModified,
          product: d.product,
        }));

        await supabase
          .from("companies")
          .update({ hubspot_deals: hubspotDeals, updated_at: new Date().toISOString() })
          .eq("id", companyId);
      }

      results.pulled.deals = allDeals.length;
    } catch (dealErr) {
      results.errors.push(`Deal sync: ${dealErr instanceof Error ? dealErr.message : String(dealErr)}`);
    }

    // --- PUSH ---
    // Push pipeline stage changes
    const { data: pipelineRecords } = await supabase
      .from("pipeline_records")
      .select("company_id, stage, hubspot_deal_id")
      .not("hubspot_deal_id", "is", null);

    for (const record of pipelineRecords || []) {
      if (record.hubspot_deal_id) {
        const success = await pushDealStage(record.hubspot_deal_id, record.stage);
        if (success) results.pushed.stages++;
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // Push recent engagements (last 7 days, not yet synced)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: engagements } = await supabase
      .from("engagements")
      .select("*")
      .gte("timestamp", sevenDaysAgo)
      .is("hubspot_synced_at", null)
      .limit(100);

    for (const engagement of engagements || []) {
      const hsType = mapChannelToHubSpot(engagement.channel);
      if (!hsType) continue;

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
        results.pushed.engagements++;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  } catch (err) {
    results.errors.push(err instanceof Error ? err.message : String(err));
  }

  results.duration = Date.now() - startTime;

  // Log to signal_ingestion_log
  try {
    await supabase.from("signal_ingestion_log").insert({
      source: "hubspot_sync",
      status: results.errors.length > 0 ? "partial" : "success",
      records_processed:
        results.pulled.companies + results.pulled.contacts + results.pushed.stages + results.pushed.engagements,
      metadata: results,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Don't fail the cron if logging fails
  }

  return NextResponse.json(results);
}
