import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseServer } from "@/lib/supabase-server";
import {
  isHubSpotConfigured,
  pullCompanies,
  pullDeals,
  pushDealStage,
} from "@/lib/hubspot-client";

/**
 * POST /api/hubspot/sync
 * Bidirectional sync between EventIQ and HubSpot CRM.
 * Body: { direction: "pull" | "push" | "both" }
 *
 * Pull: Import companies + deals from HubSpot → Supabase
 * Push: Export pipeline stage changes from Supabase → HubSpot
 */
export async function POST(request: NextRequest) {
  if (!isHubSpotConfigured()) {
    return NextResponse.json(
      { error: "HUBSPOT_API_KEY not configured" },
      { status: 503 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {},
    },
  });

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = await request.json();
  const direction: string = body.direction || "pull";

  const results: {
    pulled?: { companies: number; deals: number };
    pushed?: { stageUpdates: number };
    errors: string[];
  } = { errors: [] };

  // --- PULL: HubSpot → Supabase ---
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
          // Update existing company with HubSpot data
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

      results.pulled = {
        companies: matchedCount,
        deals: hsDeals.length,
      };
    } catch (err) {
      results.errors.push(`Pull error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // --- PUSH: Supabase → HubSpot ---
  if (direction === "push" || direction === "both") {
    try {
      // Get pipeline records that have a HubSpot deal ID
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
          // Rate limit
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      results.pushed = { stageUpdates: pushCount };
    } catch (err) {
      results.errors.push(`Push error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json(results);
}
