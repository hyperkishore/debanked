import { getSupabase } from "./supabase.js";
import { fetchCompanyNews } from "./news-fetcher.js";
import { fetchWebsiteText } from "./web-fetcher.js";
import { fetchHubSpotContext } from "./hubspot.js";
import { synthesizeResearch } from "./synthesizer.js";

// Read env lazily — .env is loaded in worker.js after module imports
function getToolConfig() {
  return {
    url: process.env.TOOL_API_URL || "https://us.hyperverge.space",
    key: process.env.TOOL_API_KEY,
  };
}

/**
 * Full research pipeline for a single company.
 * 1. Fetch current company data
 * 2. Gather fresh data in parallel (news, website, HubSpot)
 * 3. Synthesize via Claude Haiku
 * 4. Write updates via company-update API
 * 5. Write account memory
 */
export async function researchCompany(companyId, companyName) {
  const supabase = getSupabase();
  const log = (msg) => console.log(`[Research:${companyId}] ${msg}`);

  // 1. Fetch current company
  log(`Starting research for "${companyName}"`);
  const { data: company, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (error || !company) {
    throw new Error(`Company ${companyId} not found: ${error?.message}`);
  }

  // 2. Gather fresh data in parallel
  log("Gathering fresh data...");
  const domain = company.website
    ? company.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    : null;

  const [news, websiteText, hubspot] = await Promise.all([
    fetchCompanyNews(companyName),
    fetchWebsiteText(company.website),
    fetchHubSpotContext(domain),
  ]);

  log(
    `Gathered: ${news.length} news items, ${websiteText ? "website text" : "no website"}, ${hubspot ? "HubSpot data" : "no HubSpot"}`
  );

  // 3. Synthesize via Claude
  log("Synthesizing...");
  const existing = {
    name: company.name,
    desc: company.desc_text || "",
    leaders: company.leaders || [],
    contacts: company.contacts || [],
    news: company.news || [],
    notes: company.notes || "",
    category: company.category,
    location: company.location,
    website: company.website,
    employees: company.employees,
  };

  const synthesis = await synthesizeResearch(existing, {
    news,
    websiteText,
    hubspot,
  });

  if (
    synthesis.summary === "No significant updates found" &&
    !synthesis.news?.length &&
    !synthesis.leaders?.length &&
    !synthesis.desc
  ) {
    log("No significant updates found");
    // Still tag as refreshed
    await writeCompanyUpdate(companyId, {
      source_tag: `refreshed-${new Date().toISOString().slice(0, 7)}`,
    });
    return {
      summary: "No significant updates found",
      updated_fields: ["source"],
    };
  }

  // 4. Write updates via company-update API
  log("Writing updates...");
  const updates = {};
  if (synthesis.desc) updates.desc = synthesis.desc;
  if (synthesis.news?.length) {
    // Map synthesized news to the expected format
    updates.news = synthesis.news.map((n) => ({
      h: n.h || n.headline || "",
      s: n.s || n.source || "",
      d: n.d || n.description || "",
      p: n.p || n.publishedAt || "",
      u: n.u || n.url || "",
    }));
  }
  if (synthesis.leaders?.length) updates.leaders = synthesis.leaders;
  if (synthesis.contacts?.length) updates.contacts = synthesis.contacts;
  if (synthesis.notes_append) updates.notes_append = synthesis.notes_append;
  updates.source_tag = `refreshed-${new Date().toISOString().slice(0, 7)}`;

  const updateResult = await writeCompanyUpdate(companyId, updates);

  // 5. Write account memory
  if (synthesis.summary) {
    await writeAccountMemory(
      companyId,
      `RESEARCH REFRESH (${new Date().toISOString().slice(0, 10)}): ${synthesis.summary}`
    );
  }

  log(
    `Complete. Updated: ${updateResult.updated_fields?.join(", ") || "none"}`
  );

  return {
    summary: synthesis.summary || "Research updated",
    updated_fields: updateResult.updated_fields || [],
  };
}

async function writeCompanyUpdate(companyId, updates) {
  const { url: TOOL_API_URL, key: TOOL_API_KEY } = getToolConfig();
  if (!TOOL_API_KEY) throw new Error("TOOL_API_KEY is required");

  const res = await fetch(`${TOOL_API_URL}/api/tools/company-update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tool-Key": TOOL_API_KEY,
    },
    body: JSON.stringify({
      companyId,
      updates,
      mode: "merge",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`company-update failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function writeAccountMemory(companyId, content) {
  const { url: TOOL_API_URL, key: TOOL_API_KEY } = getToolConfig();
  if (!TOOL_API_KEY) return;

  try {
    await fetch(`${TOOL_API_URL}/api/tools/account-memory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tool-Key": TOOL_API_KEY,
      },
      body: JSON.stringify({
        companyId,
        memoryType: "insight",
        content,
        source: "research-worker",
      }),
    });
  } catch (err) {
    console.error(`[Research] Failed to write account memory:`, err.message);
  }
}
