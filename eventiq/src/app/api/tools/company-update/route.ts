import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * POST /api/tools/company-update
 * Write endpoint for company data updates.
 * Used by EC2 research worker and Kiket agent.
 *
 * Body: {
 *   companyId: number,
 *   updates: {
 *     desc?: string,
 *     news?: Array<{h, s, d, p?, u?}>,
 *     leaders?: Array<{n, t, bg?, hooks?, li?}>,
 *     contacts?: Array<{n, t}>,
 *     notes_append?: string,
 *     ice?: string,
 *     icebreakers?: string[],
 *     tp?: string[],
 *     ask?: string,
 *     source_tag?: string,
 *     location?: string,
 *     full_address?: string,
 *     website?: string,
 *     employees?: number,
 *     category?: string,
 *   },
 *   mode: "merge" | "replace"
 * }
 */
export async function POST(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  let body: { companyId?: number; updates?: Record<string, unknown>; mode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { companyId, updates, mode = "merge" } = body;

  if (!companyId || !Number.isFinite(companyId)) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "updates object is required" }, { status: 400 });
  }

  // Fetch current company data for merge mode
  const { data: existing, error: fetchErr } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Build the update payload with field name mapping
  const dbUpdates: Record<string, unknown> = {};
  const updatedFields: string[] = [];

  // Scalar field mappings: input key → DB column
  const scalarMap: Record<string, string> = {
    desc: "desc_text",
    ice: "ice",
    ask: "ask",
    location: "location",
    full_address: "full_address",
    website: "website",
    employees: "employees",
    category: "category",
  };

  for (const [inputKey, dbCol] of Object.entries(scalarMap)) {
    if (updates[inputKey] !== undefined) {
      dbUpdates[dbCol] = updates[inputKey];
      updatedFields.push(inputKey);
    }
  }

  // Array fields: input key → DB column
  const arrayMap: Record<string, string> = {
    tp: "talking_points",
    icebreakers: "icebreakers",
  };

  for (const [inputKey, dbCol] of Object.entries(arrayMap)) {
    if (updates[inputKey] !== undefined) {
      if (mode === "merge" && Array.isArray(existing[dbCol]) && Array.isArray(updates[inputKey])) {
        // Merge: replace entirely for talking points/icebreakers (they're full sets)
        dbUpdates[dbCol] = updates[inputKey];
      } else {
        dbUpdates[dbCol] = updates[inputKey];
      }
      updatedFields.push(inputKey);
    }
  }

  // News: merge appends to existing, replace overwrites
  if (updates.news !== undefined && Array.isArray(updates.news)) {
    if (mode === "merge") {
      const existingNews = Array.isArray(existing.news) ? existing.news : [];
      const existingHeadlines = new Set(
        existingNews.map((n: { h?: string }) => n.h?.toLowerCase())
      );
      const newItems = (updates.news as Array<{ h?: string }>).filter(
        (n) => !existingHeadlines.has(n.h?.toLowerCase())
      );
      dbUpdates.news = [...newItems, ...existingNews];
    } else {
      dbUpdates.news = updates.news;
    }
    updatedFields.push("news");
  }

  // Leaders: merge by name (update existing, add new), replace overwrites
  if (updates.leaders !== undefined && Array.isArray(updates.leaders)) {
    if (mode === "merge") {
      const existingLeaders = Array.isArray(existing.leaders) ? [...existing.leaders] : [];
      const leadersByName = new Map(
        existingLeaders.map((l: { n?: string }, i: number) => [(l.n || "").toLowerCase(), i])
      );

      for (const newLeader of updates.leaders as Array<{ n?: string; [key: string]: unknown }>) {
        const name = (newLeader.n || "").toLowerCase();
        const existingIdx = leadersByName.get(name);
        if (existingIdx !== undefined) {
          // Update existing leader — merge fields
          existingLeaders[existingIdx] = { ...existingLeaders[existingIdx], ...newLeader };
        } else {
          existingLeaders.push(newLeader);
        }
      }
      dbUpdates.leaders = existingLeaders;
    } else {
      dbUpdates.leaders = updates.leaders;
    }
    updatedFields.push("leaders");
  }

  // Contacts: merge by name, replace overwrites
  if (updates.contacts !== undefined && Array.isArray(updates.contacts)) {
    if (mode === "merge") {
      const existingContacts = Array.isArray(existing.contacts) ? [...existing.contacts] : [];
      const contactNames = new Set(
        existingContacts.map((c: { n?: string }) => (c.n || "").toLowerCase())
      );
      for (const newContact of updates.contacts as Array<{ n?: string }>) {
        if (!contactNames.has((newContact.n || "").toLowerCase())) {
          existingContacts.push(newContact);
        }
      }
      dbUpdates.contacts = existingContacts;
    } else {
      dbUpdates.contacts = updates.contacts;
    }
    updatedFields.push("contacts");
  }

  // Notes: append mode adds to existing notes
  if (updates.notes_append && typeof updates.notes_append === "string") {
    const existingNotes = existing.notes || "";
    dbUpdates.notes = existingNotes
      ? `${existingNotes}\n\n${updates.notes_append}`
      : updates.notes_append;
    updatedFields.push("notes");
  }

  // Source tag: add to source array
  if (updates.source_tag && typeof updates.source_tag === "string") {
    const existingSource = Array.isArray(existing.source) ? [...existing.source] : [];
    // Remove old refresh tags if adding a new one
    if (updates.source_tag.startsWith("refreshed-")) {
      const filtered = existingSource.filter(
        (s: string) => !s.startsWith("refreshed-")
      );
      filtered.push(updates.source_tag);
      dbUpdates.source = filtered;
    } else if (!existingSource.includes(updates.source_tag)) {
      existingSource.push(updates.source_tag);
      dbUpdates.source = existingSource;
    }
    updatedFields.push("source");
  }

  if (Object.keys(dbUpdates).length === 0) {
    return NextResponse.json({ success: true, updated_fields: [], message: "No changes" });
  }

  const { error: updateErr } = await supabase
    .from("companies")
    .update(dbUpdates)
    .eq("id", companyId);

  if (updateErr) {
    return NextResponse.json(
      { error: "Failed to update company: " + updateErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    updated_fields: updatedFields,
    company_id: companyId,
  });
}
