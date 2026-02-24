#!/usr/bin/env node
/**
 * Batch contact enrichment via Apollo.io
 * Usage: node scripts/enrich-contacts.js --priority 1,2,3 --limit 50
 *
 * Requires: APOLLO_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require("@supabase/supabase-js");

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
}

const priorityArg = getArg("priority") || "1,2,3";
const limitArg = parseInt(getArg("limit") || "50", 10);
const dryRun = args.includes("--dry-run");

const priorities = priorityArg.split(",").map(Number);

async function main() {
  // Validate env vars
  const apiKey = process.env.APOLLO_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) {
    console.error("Error: APOLLO_API_KEY not set");
    process.exit(1);
  }
  if (!supabaseUrl || !supabaseKey) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch companies by priority
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, website, leaders, priority")
    .in("priority", priorities)
    .order("priority", { ascending: true })
    .limit(limitArg);

  if (error) {
    console.error("Error fetching companies:", error.message);
    process.exit(1);
  }

  console.log(`Found ${companies.length} companies (priorities: ${priorities.join(",")})`);

  if (dryRun) {
    console.log("\n[DRY RUN] Would enrich:");
    for (const c of companies) {
      const hasEmail = (c.leaders || []).some((l) => l.email);
      console.log(`  - ${c.name} (P${c.priority}) ${hasEmail ? "[has email]" : "[no email]"}`);
    }
    return;
  }

  // Filter to companies without emails
  const needsEnrichment = companies.filter(
    (c) => !(c.leaders || []).some((l) => l.email)
  );

  console.log(`${needsEnrichment.length} companies need email enrichment\n`);

  const TARGET_TITLES = [
    "CEO", "COO", "CRO", "CTO", "CFO",
    "VP Risk", "VP Underwriting", "VP Operations",
    "Head of Risk", "Head of Underwriting",
    "Chief Risk Officer", "Managing Director", "President",
    "Founder", "Co-Founder",
  ];

  let totalFound = 0;
  let totalUpdated = 0;
  let errors = 0;

  // Process in batches of 5
  for (let i = 0; i < needsEnrichment.length; i += 5) {
    const batch = needsEnrichment.slice(i, i + 5);
    console.log(`\nBatch ${Math.floor(i / 5) + 1}/${Math.ceil(needsEnrichment.length / 5)}`);

    for (const company of batch) {
      const domain = company.website
        ?.replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .replace(/^www\./, "");

      if (!domain) {
        console.log(`  [SKIP] ${company.name} — no domain`);
        continue;
      }

      try {
        // Search Apollo for people
        const res = await fetch("https://api.apollo.io/v1/mixed_people/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            q_organization_domains: domain,
            person_titles: TARGET_TITLES,
            page: 1,
            per_page: 10,
          }),
        });

        if (!res.ok) {
          console.log(`  [ERR] ${company.name} — HTTP ${res.status}`);
          errors++;
          continue;
        }

        const data = await res.json();
        const people = data.people || [];
        totalFound += people.length;

        if (people.length === 0) {
          console.log(`  [0] ${company.name} — no contacts found`);
          continue;
        }

        // Match to existing leaders
        const leaders = company.leaders || [];
        let updatedCount = 0;

        for (const person of people) {
          const matched = leaders.find((l) => {
            const pName = (person.name || "").toLowerCase().trim();
            const lName = l.n.toLowerCase().trim();
            if (lName === pName) return true;
            const pParts = pName.split(" ");
            const lParts = lName.split(" ");
            return pParts[0] === lParts[0] && pParts[pParts.length - 1] === lParts[lParts.length - 1];
          });

          if (matched && person.email && !matched.email) {
            matched.email = person.email;
            matched.confidence = person.email_confidence || 0;
            if (person.phone_numbers?.[0]?.sanitized_number && !matched.phone) {
              matched.phone = person.phone_numbers[0].sanitized_number;
            }
            if (person.linkedin_url && !matched.li) {
              matched.li = person.linkedin_url;
            }
            updatedCount++;
          }
        }

        if (updatedCount > 0) {
          await supabase
            .from("companies")
            .update({ leaders, updated_at: new Date().toISOString() })
            .eq("id", company.id);
          totalUpdated += updatedCount;
        }

        console.log(
          `  [${people.length}] ${company.name} — ${updatedCount} leaders updated`
        );

        // Rate limit: 500ms between requests
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.log(`  [ERR] ${company.name} — ${err.message}`);
        errors++;
      }
    }

    // Pause between batches
    if (i + 5 < needsEnrichment.length) {
      console.log("  (pausing 2s between batches...)");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Companies processed: ${needsEnrichment.length}`);
  console.log(`Contacts found: ${totalFound}`);
  console.log(`Leaders updated: ${totalUpdated}`);
  console.log(`Errors: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
