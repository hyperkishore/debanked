#!/usr/bin/env node
/**
 * phantom-enrich.js — Batch-enrich EventIQ companies via PhantomBuster
 *
 * Standalone CLI script. No TypeScript, no imports from src/lib.
 * Directly calls PhantomBuster API using fetch.
 *
 * Usage:
 *   node scripts/phantom-enrich.js search [options]     Search for leaders at companies
 *   node scripts/phantom-enrich.js scrape [options]     Scrape LinkedIn profiles
 *   node scripts/phantom-enrich.js email  [options]     Find emails for leaders
 *   node scripts/phantom-enrich.js merge  [options]     Merge results into all-companies.json
 *
 * Options:
 *   --companies "Name1,Name2"   Specific company names (comma-separated)
 *   --priority 1,2              Company priority levels (comma-separated)
 *   --limit N                   Max companies to process (default: 10)
 *   --input file.json           Input file (for scrape/email/merge modes)
 *   --output file.json          Output file (default: scripts/phantom-{mode}-results.json)
 *   --titles "CEO,CTO,COO"     Title keywords for search
 *   --max-results N             Max LinkedIn results per search (default: 25)
 *   --timeout N                 Polling timeout in seconds (default: 300)
 *   --dry-run                   Preview what would be done without launching
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENT_IDS = {
  SEARCH_EXPORT: "838622632619544",
  PROFILE_SCRAPER: "791859282480955",
  EMAIL_FINDER: "8670599088931508",
};

const PB_BASE = "https://api.phantombuster.com";

const DEFAULT_TITLES = [
  "CEO", "CTO", "COO", "CFO", "CRO",
  "VP", "President", "Founder", "Director", "Head",
];

const DATA_PATH = path.join(process.cwd(), "src/data/all-companies.json");
const ENV_PATH = path.join(process.cwd(), ".env.local");

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

const C = {
  green:   (s) => `\x1b[32m${s}\x1b[0m`,
  yellow:  (s) => `\x1b[33m${s}\x1b[0m`,
  red:     (s) => `\x1b[31m${s}\x1b[0m`,
  cyan:    (s) => `\x1b[36m${s}\x1b[0m`,
  bold:    (s) => `\x1b[1m${s}\x1b[0m`,
  dim:     (s) => `\x1b[2m${s}\x1b[0m`,
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadEnvKey(key) {
  if (!fs.existsSync(ENV_PATH)) {
    console.error(C.red(`Error: ${ENV_PATH} not found.`));
    console.error(C.dim("Create .env.local with PHANTOMBUSTER_API_KEY=your_key"));
    process.exit(1);
  }
  const content = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eqIdx = trimmed.indexOf("=");
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (k === key) return v;
  }
  return null;
}

function loadCompanies() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(C.red(`Error: ${DATA_PATH} not found.`));
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
}

function parseArgs(argv) {
  const args = { _: [] };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      // Boolean flags (no value follows)
      if (key === "dry-run") {
        args.dryRun = true;
        i++;
        continue;
      }
      // Key-value pairs
      const val = argv[i + 1];
      if (val === undefined || val.startsWith("--")) {
        args[key] = true;
        i++;
      } else {
        args[key] = val;
        i += 2;
      }
    } else {
      args._.push(arg);
      i++;
    }
  }
  return args;
}

function normalizeCompanyName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(llc|inc|corp|ltd|co|company|group|capital|funding|financial|holdings|partners|solutions|services|technologies|tech)\b/gi, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeName(name) {
  if (!name) return "";
  return name.toLowerCase().trim().replace(/[^a-z ]/g, "").replace(/\s+/g, " ");
}

function formatElapsed(startMs) {
  const sec = Math.round((Date.now() - startMs) / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

// ---------------------------------------------------------------------------
// PhantomBuster API helpers
// ---------------------------------------------------------------------------

let PB_KEY = null;

function pbHeaders() {
  return {
    "X-Phantombuster-Key": PB_KEY,
    "Content-Type": "application/json",
  };
}

async function pbGet(endpoint, params = {}) {
  const url = new URL(PB_BASE + endpoint);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { headers: pbHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PB GET ${endpoint} failed (${res.status}): ${body}`);
  }
  return res.json();
}

async function pbPost(endpoint, body) {
  const res = await fetch(PB_BASE + endpoint, {
    method: "POST",
    headers: pbHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PB POST ${endpoint} failed (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Fetch agent metadata — returns { argument, s3Folder, orgS3Folder, ... }
 */
async function fetchAgent(agentId) {
  return pbGet("/api/v2/agents/fetch", { id: agentId });
}

/**
 * Launch agent with argument override (saveArgument: false = one-time override)
 */
async function launchAgent(agentId, argumentObj) {
  return pbPost("/api/v2/agents/launch", {
    id: agentId,
    argument: JSON.stringify(argumentObj),
    saveArgument: false,
  });
}

/**
 * Fetch container status — returns { status, ... }
 */
async function fetchContainer(containerId) {
  return pbGet("/api/v2/containers/fetch", { id: containerId });
}

/**
 * Download result.json from S3
 */
async function fetchResultFile(orgS3Folder, s3Folder) {
  const url = `https://phantombuster.s3.amazonaws.com/${orgS3Folder}/${s3Folder}/result.json`;
  const res = await fetch(url);
  if (!res.ok) {
    // Try result.csv fallback
    const csvUrl = `https://phantombuster.s3.amazonaws.com/${orgS3Folder}/${s3Folder}/result.csv`;
    const csvRes = await fetch(csvUrl);
    if (!csvRes.ok) {
      throw new Error(`Failed to fetch result file from S3 (tried JSON and CSV): ${url}`);
    }
    // Parse CSV manually
    const csvText = await csvRes.text();
    return parseSimpleCsv(csvText);
  }
  return res.json();
}

/**
 * Minimal CSV parser — handles quoted fields, returns array of objects
 */
function parseSimpleCsv(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] || "";
    });
    rows.push(obj);
  }
  return rows;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Create org-storage list and return listId
 */
async function createOrgStorageList(name) {
  const res = await pbPost("/api/v2/org-storage/lists/save", { name });
  return res.id;
}

/**
 * Add leads to org-storage list
 */
async function addLeadsToList(listId, leads) {
  return pbPost("/api/v2/org-storage/leads/save", { listId, leads });
}

/**
 * Poll container until finished or error, with timeout
 */
async function pollContainer(containerId, timeoutSec = 300) {
  const startMs = Date.now();
  const deadlineMs = startMs + timeoutSec * 1000;

  while (Date.now() < deadlineMs) {
    const container = await fetchContainer(containerId);
    const status = container.status;
    const elapsed = formatElapsed(startMs);

    process.stdout.write(`\r  ${C.dim(`Polling... [${status}] ${elapsed}`)}`);

    if (status === "finished") {
      process.stdout.write(`\r  ${C.green(`Finished`)} in ${elapsed}            \n`);
      return container;
    }
    if (status === "error") {
      process.stdout.write(`\r  ${C.red(`Error`)} after ${elapsed}            \n`);
      throw new Error(`Container ${containerId} finished with error`);
    }

    await sleep(5000);
  }

  process.stdout.write("\n");
  throw new Error(`Polling timed out after ${timeoutSec}s for container ${containerId}`);
}

// ---------------------------------------------------------------------------
// Mode: search
// ---------------------------------------------------------------------------

async function modeSearch(opts) {
  const companies = loadCompanies();
  const titles = opts.titles
    ? opts.titles.split(",").map((t) => t.trim())
    : DEFAULT_TITLES;
  const maxResults = parseInt(opts["max-results"] || "25", 10);
  const limit = parseInt(opts.limit || "10", 10);
  const timeoutSec = parseInt(opts.timeout || "300", 10);
  const outputPath = opts.output || path.join(process.cwd(), "scripts/phantom-search-results.json");

  // Filter companies
  let filtered = companies;
  if (opts.companies) {
    const names = opts.companies.split(",").map((n) => n.trim().toLowerCase());
    filtered = filtered.filter((c) =>
      names.some((n) => c.name.toLowerCase().includes(n))
    );
  }
  if (opts.priority) {
    const prios = opts.priority.split(",").map((p) => parseInt(p.trim(), 10));
    filtered = filtered.filter((c) => prios.includes(c.priority));
  }
  filtered = filtered.slice(0, limit);

  if (filtered.length === 0) {
    console.log(C.yellow("No companies matched the filter criteria."));
    return;
  }

  console.log(C.bold(`\n  PhantomBuster Search Export`));
  console.log(C.dim(`  Agent: ${AGENT_IDS.SEARCH_EXPORT}`));
  console.log(C.dim(`  Titles: ${titles.join(", ")}`));
  console.log(C.dim(`  Max results per search: ${maxResults}`));
  console.log(C.dim(`  Companies: ${filtered.length}\n`));

  // Preview companies
  for (const c of filtered) {
    const titleQuery = titles.join(" OR ");
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent('"' + c.name + '" ' + titleQuery)}&origin=GLOBAL_SEARCH_HEADER`;
    console.log(`  ${C.cyan(c.name)} ${C.dim(`(P${c.priority})`)}  `);
    console.log(`    ${C.dim(searchUrl.slice(0, 100) + "...")}\n`);
  }

  if (opts.dryRun) {
    console.log(C.yellow("\n  --dry-run: No agents launched.\n"));
    return;
  }

  // Fetch agent metadata once
  console.log(C.dim("  Fetching agent configuration..."));
  const agent = await fetchAgent(AGENT_IDS.SEARCH_EXPORT);
  const savedArg = agent.argument ? JSON.parse(agent.argument) : {};

  const allResults = [];
  let totalProfiles = 0;

  for (let i = 0; i < filtered.length; i++) {
    const company = filtered[i];
    const titleQuery = titles.join(" OR ");
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent('"' + company.name + '" ' + titleQuery)}&origin=GLOBAL_SEARCH_HEADER`;

    console.log(`\n  [${i + 1}/${filtered.length}] ${C.bold(company.name)}`);

    try {
      // Merge arguments: preserve saved identities/session, override search params
      const launchArg = {
        ...savedArg,
        linkedInSearchUrl: searchUrl,
        numberOfResultsPerLaunch: maxResults,
        numberOfResultsPerSearch: maxResults,
        numberOfLinesPerLaunch: 1,
      };

      // Launch the agent
      console.log(`  ${C.dim("Launching agent...")}`);
      const launchResult = await launchAgent(AGENT_IDS.SEARCH_EXPORT, launchArg);
      const containerId = launchResult.containerId;
      console.log(`  ${C.dim(`Container: ${containerId}`)}`);

      // Poll until done
      await pollContainer(containerId, timeoutSec);

      // Fetch results from S3
      console.log(`  ${C.dim("Fetching results from S3...")}`);
      const results = await fetchResultFile(agent.orgS3Folder, agent.s3Folder);
      const allProfiles = (Array.isArray(results) ? results : [])
        .filter((r) => !r.error) // Skip error entries
        .map((r) => ({
          fullName: r.fullName || r.name || `${r.firstName || ""} ${r.lastName || ""}`.trim(),
          title: r.title || r.headline || "",
          linkedinUrl: r.profileUrl || r.linkedInProfileUrl || r.url || "",
          headline: r.headline || r.title || "",
          location: r.location || "",
        }));

      // Post-filter: only keep profiles whose title/headline mentions the target company
      const companyLower = company.name.toLowerCase();
      const companyWords = companyLower.split(/\s+/).filter((w) => w.length > 2);
      const profiles = allProfiles.filter((p) => {
        const text = `${p.title} ${p.headline}`.toLowerCase();
        // Match if headline contains the full company name OR all significant words
        return text.includes(companyLower) || companyWords.every((w) => text.includes(w));
      });

      const filtered_out = allProfiles.length - profiles.length;
      if (filtered_out > 0) {
        console.log(`  ${C.dim(`Filtered out ${filtered_out} profiles from other companies`)}`);
      }

      allResults.push({
        companyName: company.name,
        companyId: company.id,
        profiles,
      });

      totalProfiles += profiles.length;
      console.log(`  ${C.green(`Found ${profiles.length} profiles`)}`);

      // Rate-limit between companies
      if (i < filtered.length - 1) {
        console.log(`  ${C.dim("Waiting 10s before next search...")}`);
        await sleep(10000);
      }
    } catch (err) {
      console.error(`  ${C.red(`Error: ${err.message}`)}`);
      allResults.push({
        companyName: company.name,
        companyId: company.id,
        profiles: [],
        error: err.message,
      });
    }
  }

  // Write results
  fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2), "utf8");
  console.log(`\n  ${C.green("Results written to:")} ${outputPath}`);

  // Summary table
  printSearchSummary(allResults, totalProfiles);
}

function printSearchSummary(results, totalProfiles) {
  console.log(C.bold("\n  ─── Search Summary ───────────────────────────────"));
  console.log(`  ${C.cyan("Companies searched:")}  ${results.length}`);
  console.log(`  ${C.cyan("Total profiles:")}      ${totalProfiles}`);
  console.log(`  ${C.cyan("Avg per company:")}     ${results.length ? (totalProfiles / results.length).toFixed(1) : 0}`);
  console.log("");

  const nameWidth = Math.max(12, ...results.map((r) => r.companyName.length)) + 2;
  console.log(
    `  ${C.bold("Company".padEnd(nameWidth))}  ${C.bold("Profiles".padStart(8))}  ${C.bold("Status")}`
  );
  console.log(`  ${"─".repeat(nameWidth)}  ${"─".repeat(8)}  ${"─".repeat(12)}`);
  for (const r of results) {
    const count = r.profiles.length.toString().padStart(8);
    const status = r.error ? C.red("error") : C.green("ok");
    console.log(`  ${r.companyName.padEnd(nameWidth)}  ${count}  ${status}`);
  }
  console.log("");
}

// ---------------------------------------------------------------------------
// Mode: scrape
// ---------------------------------------------------------------------------

async function modeScrape(opts) {
  const inputPath = opts.input;
  if (!inputPath) {
    console.error(C.red("Error: --input is required for scrape mode."));
    console.error(C.dim("  Provide a search results file or JSON array of LinkedIn URLs."));
    process.exit(1);
  }

  const resolvedInput = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(C.red(`Error: Input file not found: ${resolvedInput}`));
    process.exit(1);
  }

  const timeoutSec = parseInt(opts.timeout || "300", 10);
  const outputPath = opts.output || path.join(process.cwd(), "scripts/phantom-scrape-results.json");

  const inputData = JSON.parse(fs.readFileSync(resolvedInput, "utf8"));

  // Collect LinkedIn profile URLs from input
  let profileUrls = [];
  if (Array.isArray(inputData)) {
    // Could be search results (array of { companyName, profiles }) or flat array of URLs/objects
    for (const item of inputData) {
      if (typeof item === "string") {
        // Plain URL
        profileUrls.push(item);
      } else if (item.profiles && Array.isArray(item.profiles)) {
        // Search result format
        for (const p of item.profiles) {
          if (p.linkedinUrl) profileUrls.push(p.linkedinUrl);
        }
      } else if (item.linkedinUrl) {
        profileUrls.push(item.linkedinUrl);
      } else if (item.profileUrl) {
        profileUrls.push(item.profileUrl);
      } else if (item.url) {
        profileUrls.push(item.url);
      }
    }
  }

  // Deduplicate
  profileUrls = [...new Set(profileUrls)].filter(Boolean);

  if (profileUrls.length === 0) {
    console.log(C.yellow("No LinkedIn profile URLs found in input file."));
    return;
  }

  console.log(C.bold(`\n  PhantomBuster Profile Scraper`));
  console.log(C.dim(`  Agent: ${AGENT_IDS.PROFILE_SCRAPER}`));
  console.log(C.dim(`  Profile URLs: ${profileUrls.length}`));
  console.log(C.dim(`  Input: ${resolvedInput}\n`));

  if (opts.dryRun) {
    console.log(C.dim("  Sample URLs:"));
    for (const url of profileUrls.slice(0, 5)) {
      console.log(`    ${C.cyan(url)}`);
    }
    if (profileUrls.length > 5) {
      console.log(C.dim(`    ... and ${profileUrls.length - 5} more`));
    }
    console.log(C.yellow("\n  --dry-run: No agents launched.\n"));
    return;
  }

  // Step 1: Create org-storage list
  const listName = `phantom-scrape-${Date.now()}`;
  console.log(C.dim(`  Creating org-storage list: ${listName}`));
  const listId = await createOrgStorageList(listName);
  console.log(C.dim(`  List ID: ${listId}`));

  // Step 2: Add profile URLs as leads
  const leads = profileUrls.map((url) => ({ profileLink: url }));
  console.log(C.dim(`  Adding ${leads.length} leads to list...`));
  await addLeadsToList(listId, leads);

  // Step 3: Fetch agent config and merge
  console.log(C.dim("  Fetching agent configuration..."));
  const agent = await fetchAgent(AGENT_IDS.PROFILE_SCRAPER);
  const savedArg = agent.argument ? JSON.parse(agent.argument) : {};

  const launchArg = {
    ...savedArg,
    spreadsheetUrl: `org-storage://leads/by-list/${listId}`,
    columnName: "profileLink",
    numberOfAddsPerLaunch: profileUrls.length,
  };

  // Step 4: Launch
  console.log(C.dim("  Launching agent..."));
  const launchResult = await launchAgent(AGENT_IDS.PROFILE_SCRAPER, launchArg);
  const containerId = launchResult.containerId;
  console.log(C.dim(`  Container: ${containerId}`));

  // Step 5: Poll until done
  await pollContainer(containerId, timeoutSec);

  // Step 6: Fetch results
  console.log(C.dim("  Fetching results from S3..."));
  const results = await fetchResultFile(agent.orgS3Folder, agent.s3Folder);
  const profiles = (Array.isArray(results) ? results : []).map((r) => ({
    fullName: r.fullName || r.name || `${r.firstName || ""} ${r.lastName || ""}`.trim(),
    title: r.title || r.currentJob || "",
    linkedinUrl: r.profileUrl || r.linkedInProfileUrl || r.url || "",
    summary: r.summary || r.about || "",
    location: r.location || "",
    company: r.companyName || r.company || "",
  }));

  const output = { profiles, scrapeDate: new Date().toISOString(), listId };
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`\n  ${C.green("Results written to:")} ${outputPath}`);

  // Summary
  console.log(C.bold("\n  ─── Scrape Summary ──────────────────────────────"));
  console.log(`  ${C.cyan("URLs submitted:")}      ${profileUrls.length}`);
  console.log(`  ${C.cyan("Profiles scraped:")}    ${profiles.length}`);
  console.log(`  ${C.cyan("With summaries:")}      ${profiles.filter((p) => p.summary).length}`);
  console.log(`  ${C.cyan("With titles:")}         ${profiles.filter((p) => p.title).length}`);
  console.log("");
}

// ---------------------------------------------------------------------------
// Mode: email
// ---------------------------------------------------------------------------

async function modeEmail(opts) {
  const inputPath = opts.input;
  if (!inputPath) {
    console.error(C.red("Error: --input is required for email mode."));
    console.error(C.dim("  Provide a search or scrape results file."));
    process.exit(1);
  }

  const resolvedInput = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(C.red(`Error: Input file not found: ${resolvedInput}`));
    process.exit(1);
  }

  const timeoutSec = parseInt(opts.timeout || "300", 10);
  const outputPath = opts.output || path.join(process.cwd(), "scripts/phantom-email-results.json");

  const inputData = JSON.parse(fs.readFileSync(resolvedInput, "utf8"));

  // Collect names + companies from various input formats
  const people = [];
  if (Array.isArray(inputData)) {
    // Search results format: [{ companyName, profiles: [...] }]
    for (const item of inputData) {
      if (item.profiles && Array.isArray(item.profiles)) {
        for (const p of item.profiles) {
          const name = p.fullName || p.name || "";
          if (!name) continue;
          const parts = splitName(name);
          people.push({
            firstName: parts.first,
            lastName: parts.last,
            companyName: p.company || item.companyName || "",
            fullName: name,
          });
        }
      } else if (item.fullName || item.name) {
        const name = item.fullName || item.name;
        const parts = splitName(name);
        people.push({
          firstName: parts.first,
          lastName: parts.last,
          companyName: item.company || item.companyName || "",
          fullName: name,
        });
      }
    }
  } else if (inputData.profiles && Array.isArray(inputData.profiles)) {
    // Scrape results format: { profiles: [...] }
    for (const p of inputData.profiles) {
      const name = p.fullName || p.name || "";
      if (!name) continue;
      const parts = splitName(name);
      people.push({
        firstName: parts.first,
        lastName: parts.last,
        companyName: p.company || "",
        fullName: name,
      });
    }
  }

  if (people.length === 0) {
    console.log(C.yellow("No people found in input file."));
    return;
  }

  console.log(C.bold(`\n  PhantomBuster Email Finder`));
  console.log(C.dim(`  Agent: ${AGENT_IDS.EMAIL_FINDER}`));
  console.log(C.dim(`  People: ${people.length}`));
  console.log(C.dim(`  Input: ${resolvedInput}\n`));

  if (opts.dryRun) {
    console.log(C.dim("  Sample people:"));
    for (const p of people.slice(0, 5)) {
      console.log(`    ${C.cyan(p.fullName)} ${C.dim(`@ ${p.companyName || "unknown"}`)}`);
    }
    if (people.length > 5) {
      console.log(C.dim(`    ... and ${people.length - 5} more`));
    }
    console.log(C.yellow("\n  --dry-run: No agents launched.\n"));
    return;
  }

  // Step 1: Create org-storage list
  const listName = `phantom-email-${Date.now()}`;
  console.log(C.dim(`  Creating org-storage list: ${listName}`));
  const listId = await createOrgStorageList(listName);
  console.log(C.dim(`  List ID: ${listId}`));

  // Step 2: Add people as leads
  const leads = people.map((p) => ({
    firstName: p.firstName,
    lastName: p.lastName,
    companyName: p.companyName,
  }));
  console.log(C.dim(`  Adding ${leads.length} leads to list...`));
  await addLeadsToList(listId, leads);

  // Step 3: Fetch agent config and merge
  console.log(C.dim("  Fetching agent configuration..."));
  const agent = await fetchAgent(AGENT_IDS.EMAIL_FINDER);
  const savedArg = agent.argument ? JSON.parse(agent.argument) : {};

  const launchArg = {
    ...savedArg,
    spreadsheetUrl: `org-storage://leads/by-list/${listId}`,
  };

  // Step 4: Launch
  console.log(C.dim("  Launching agent..."));
  const launchResult = await launchAgent(AGENT_IDS.EMAIL_FINDER, launchArg);
  const containerId = launchResult.containerId;
  console.log(C.dim(`  Container: ${containerId}`));

  // Step 5: Poll
  await pollContainer(containerId, timeoutSec);

  // Step 6: Fetch results
  console.log(C.dim("  Fetching results from S3..."));
  const results = await fetchResultFile(agent.orgS3Folder, agent.s3Folder);
  const emails = (Array.isArray(results) ? results : []).map((r) => ({
    fullName: r.fullName || r.name || `${r.firstName || ""} ${r.lastName || ""}`.trim(),
    email: r.email || r.emailAddress || "",
    confidence: r.confidence || r.emailConfidence || null,
    company: r.companyName || r.company || "",
  }));

  const output = { emails, emailDate: new Date().toISOString(), listId };
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`\n  ${C.green("Results written to:")} ${outputPath}`);

  // Summary
  const foundCount = emails.filter((e) => e.email).length;
  console.log(C.bold("\n  ─── Email Finder Summary ────────────────────────"));
  console.log(`  ${C.cyan("People submitted:")}    ${people.length}`);
  console.log(`  ${C.cyan("Emails found:")}        ${foundCount}`);
  console.log(`  ${C.cyan("Hit rate:")}            ${people.length ? ((foundCount / people.length) * 100).toFixed(1) + "%" : "N/A"}`);
  console.log(`  ${C.cyan("High confidence:")}     ${emails.filter((e) => e.confidence && e.confidence >= 80).length}`);
  console.log("");
}

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

// ---------------------------------------------------------------------------
// Mode: merge
// ---------------------------------------------------------------------------

async function modeMerge(opts) {
  const inputPath = opts.input;
  if (!inputPath) {
    console.error(C.red("Error: --input is required for merge mode."));
    console.error(C.dim("  Provide a search, scrape, or email results file."));
    process.exit(1);
  }

  const resolvedInput = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(C.red(`Error: Input file not found: ${resolvedInput}`));
    process.exit(1);
  }

  const companies = loadCompanies();
  const inputData = JSON.parse(fs.readFileSync(resolvedInput, "utf8"));

  console.log(C.bold(`\n  Merge PhantomBuster Results`));
  console.log(C.dim(`  Input: ${resolvedInput}`));
  console.log(C.dim(`  Companies in dataset: ${companies.length}\n`));

  // Build company index for fuzzy matching
  const companyIndex = new Map();
  for (const c of companies) {
    companyIndex.set(normalizeCompanyName(c.name), c);
  }

  let stats = { matched: 0, unmatched: 0, leadersAdded: 0, leadersUpdated: 0, emailsFound: 0 };

  // Determine input type and process accordingly
  if (Array.isArray(inputData) && inputData.length > 0 && inputData[0].profiles) {
    // Search results format
    console.log(C.dim("  Detected: search results format\n"));
    for (const result of inputData) {
      const match = fuzzyFindCompany(result.companyName, companyIndex);
      if (!match) {
        console.log(`  ${C.yellow("?")} ${result.companyName} ${C.dim("— no match in dataset")}`);
        stats.unmatched++;
        continue;
      }
      stats.matched++;
      const mergeResult = mergeProfiles(match, result.profiles);
      stats.leadersAdded += mergeResult.added;
      stats.leadersUpdated += mergeResult.updated;
      console.log(`  ${C.green("+")} ${result.companyName} ${C.dim(`-> ${match.name}`)} — ${mergeResult.added} added, ${mergeResult.updated} updated`);
    }
  } else if (inputData.profiles && Array.isArray(inputData.profiles)) {
    // Scrape results format — match by company field in each profile
    console.log(C.dim("  Detected: scrape results format\n"));
    const byCompany = {};
    for (const p of inputData.profiles) {
      const co = p.company || "Unknown";
      if (!byCompany[co]) byCompany[co] = [];
      byCompany[co].push(p);
    }
    for (const [coName, profiles] of Object.entries(byCompany)) {
      const match = fuzzyFindCompany(coName, companyIndex);
      if (!match) {
        console.log(`  ${C.yellow("?")} ${coName} ${C.dim("— no match in dataset")}`);
        stats.unmatched++;
        continue;
      }
      stats.matched++;
      const mergeResult = mergeProfiles(match, profiles);
      stats.leadersAdded += mergeResult.added;
      stats.leadersUpdated += mergeResult.updated;
      console.log(`  ${C.green("+")} ${coName} ${C.dim(`-> ${match.name}`)} — ${mergeResult.added} added, ${mergeResult.updated} updated`);
    }
  } else if (inputData.emails && Array.isArray(inputData.emails)) {
    // Email results format
    console.log(C.dim("  Detected: email results format\n"));
    const byCompany = {};
    for (const e of inputData.emails) {
      const co = e.company || "Unknown";
      if (!byCompany[co]) byCompany[co] = [];
      byCompany[co].push(e);
    }
    for (const [coName, emailRecords] of Object.entries(byCompany)) {
      const match = fuzzyFindCompany(coName, companyIndex);
      if (!match) {
        console.log(`  ${C.yellow("?")} ${coName} ${C.dim("— no match in dataset")}`);
        stats.unmatched++;
        continue;
      }
      stats.matched++;
      for (const er of emailRecords) {
        if (!er.email) continue;
        const leaderMatch = findLeaderByName(match, er.fullName);
        if (leaderMatch) {
          // Update existing leader's email in notes (emails not in leader schema directly)
          if (!match.notes) match.notes = "";
          if (!match.notes.includes(er.email)) {
            match.notes += `\nEMAIL: ${er.fullName} — ${er.email}`;
            stats.emailsFound++;
            stats.leadersUpdated++;
          }
        } else {
          // Add as contact if not found as leader
          if (!match.contacts) match.contacts = [];
          const existingContact = match.contacts.find(
            (c) => normalizeName(c.n) === normalizeName(er.fullName)
          );
          if (!existingContact) {
            match.contacts.push({ n: er.fullName, t: "" });
          }
          if (!match.notes) match.notes = "";
          if (!match.notes.includes(er.email)) {
            match.notes += `\nEMAIL: ${er.fullName} — ${er.email}`;
            stats.emailsFound++;
          }
        }
      }
      console.log(
        `  ${C.green("+")} ${coName} ${C.dim(`-> ${match.name}`)} — ${emailRecords.filter((e) => e.email).length} emails`
      );
    }
  } else {
    console.error(C.red("Error: Unrecognized input format."));
    console.error(C.dim("  Expected: search results, scrape results, or email results."));
    process.exit(1);
  }

  if (opts.dryRun) {
    console.log(C.yellow("\n  --dry-run: No changes written to disk.\n"));
    printMergeSummary(stats);
    return;
  }

  // Write updated companies back
  fs.writeFileSync(DATA_PATH, JSON.stringify(companies, null, 2), "utf8");
  console.log(`\n  ${C.green("Updated:")} ${DATA_PATH}`);
  printMergeSummary(stats);
}

function fuzzyFindCompany(name, index) {
  const norm = normalizeCompanyName(name);
  if (!norm) return null;

  // Exact match
  if (index.has(norm)) return index.get(norm);

  // Fuzzy: check all entries for best match
  let best = null;
  let bestScore = 0;
  for (const [indexNorm, company] of index) {
    let score = 0;
    if (indexNorm === norm) {
      return company;
    }
    if (indexNorm.includes(norm) || norm.includes(indexNorm)) {
      const shorter = Math.min(indexNorm.length, norm.length);
      const longer = Math.max(indexNorm.length, norm.length);
      score = 0.8 + (0.2 * shorter / longer);
    } else {
      // Simple character overlap ratio
      const maxLen = Math.max(indexNorm.length, norm.length);
      let common = 0;
      const used = new Set();
      for (const ch of norm) {
        const idx = indexNorm.indexOf(ch, 0);
        if (idx !== -1 && !used.has(idx)) {
          common++;
          used.add(idx);
        }
      }
      score = common / maxLen;
    }
    if (score > bestScore) {
      bestScore = score;
      best = company;
    }
  }

  return bestScore >= 0.75 ? best : null;
}

function findLeaderByName(company, fullName) {
  const norm = normalizeName(fullName);
  if (!norm) return null;

  for (const l of company.leaders || []) {
    if (normalizeName(l.n) === norm) return l;
  }
  for (const c of company.contacts || []) {
    if (normalizeName(c.n) === norm) return c;
  }
  return null;
}

function mergeProfiles(company, profiles) {
  if (!company.leaders) company.leaders = [];
  let added = 0;
  let updated = 0;

  for (const p of profiles) {
    const name = p.fullName || p.name || "";
    if (!name) continue;

    const existing = findLeaderByName(company, name);
    if (existing) {
      // Update missing fields on existing leader
      if (!existing.li && p.linkedinUrl) { existing.li = p.linkedinUrl; updated++; }
      if (!existing.bg && p.summary) { existing.bg = p.summary; updated++; }
      if (!existing.t && (p.title || p.headline)) { existing.t = p.title || p.headline; updated++; }
    } else {
      // Add new leader
      const newLeader = {
        n: name,
        t: p.title || p.headline || "",
        bg: p.summary || `${name} — sourced via PhantomBuster.`,
        li: p.linkedinUrl || "",
      };
      if (p.location) newLeader.bg += ` Based in ${p.location}.`;
      company.leaders.push(newLeader);
      added++;
    }
  }

  return { added, updated };
}

function printMergeSummary(stats) {
  console.log(C.bold("\n  ─── Merge Summary ───────────────────────────────"));
  console.log(`  ${C.cyan("Companies matched:")}   ${stats.matched}`);
  console.log(`  ${C.cyan("Companies unmatched:")} ${stats.unmatched}`);
  console.log(`  ${C.cyan("Leaders added:")}       ${stats.leadersAdded}`);
  console.log(`  ${C.cyan("Leaders updated:")}     ${stats.leadersUpdated}`);
  console.log(`  ${C.cyan("Emails found:")}        ${stats.emailsFound}`);
  console.log("");
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

function printUsage() {
  console.log(`
${C.bold("phantom-enrich.js")} — Batch-enrich EventIQ companies via PhantomBuster

${C.bold("Usage:")}
  node scripts/phantom-enrich.js ${C.cyan("search")} [options]     Search for leaders at companies
  node scripts/phantom-enrich.js ${C.cyan("scrape")} [options]     Scrape LinkedIn profiles
  node scripts/phantom-enrich.js ${C.cyan("email")}  [options]     Find emails for leaders
  node scripts/phantom-enrich.js ${C.cyan("merge")}  [options]     Merge results into all-companies.json

${C.bold("Options:")}
  --companies "Name1,Name2"   Specific company names (comma-separated)
  --priority 1,2              Company priority levels (comma-separated)
  --limit N                   Max companies to process (default: 10)
  --input file.json           Input file (for scrape/email/merge modes)
  --output file.json          Output file (default: scripts/phantom-{mode}-results.json)
  --titles "CEO,CTO,COO"     Title keywords for search
  --max-results N             Max LinkedIn results per search (default: 25)
  --timeout N                 Polling timeout in seconds (default: 300)
  --dry-run                   Preview what would be done without launching

${C.bold("Examples:")}
  ${C.dim("# Search for leaders at P1 companies")}
  node scripts/phantom-enrich.js search --priority 1 --limit 5

  ${C.dim("# Search specific companies")}
  node scripts/phantom-enrich.js search --companies "Bitty,BriteCap" --titles "CEO,CTO"

  ${C.dim("# Scrape profiles from search results")}
  node scripts/phantom-enrich.js scrape --input scripts/phantom-search-results.json

  ${C.dim("# Find emails from scrape results")}
  node scripts/phantom-enrich.js email --input scripts/phantom-scrape-results.json

  ${C.dim("# Merge everything into all-companies.json")}
  node scripts/phantom-enrich.js merge --input scripts/phantom-search-results.json

  ${C.dim("# Dry run — preview without launching agents")}
  node scripts/phantom-enrich.js search --priority 1 --limit 3 --dry-run
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const rawArgs = process.argv.slice(2);
  const args = parseArgs(rawArgs);
  const mode = args._[0];

  if (!mode || !["search", "scrape", "email", "merge"].includes(mode)) {
    printUsage();
    process.exit(mode ? 1 : 0);
  }

  // Load API key (not needed for merge mode)
  if (mode !== "merge") {
    PB_KEY = loadEnvKey("PHANTOMBUSTER_API_KEY");
    if (!PB_KEY) {
      console.error(C.red("Error: PHANTOMBUSTER_API_KEY not found in .env.local"));
      process.exit(1);
    }
    console.log(C.dim(`  API key: ${PB_KEY.slice(0, 8)}...${PB_KEY.slice(-4)}`));
  }

  const startMs = Date.now();

  try {
    switch (mode) {
      case "search":
        await modeSearch(args);
        break;
      case "scrape":
        await modeScrape(args);
        break;
      case "email":
        await modeEmail(args);
        break;
      case "merge":
        await modeMerge(args);
        break;
    }
  } catch (err) {
    console.error(`\n  ${C.red("Fatal error:")} ${err.message}`);
    if (err.stack) {
      console.error(C.dim(err.stack.split("\n").slice(1, 4).join("\n")));
    }
    process.exit(1);
  }

  console.log(C.dim(`  Done in ${formatElapsed(startMs)}\n`));
}

main();
