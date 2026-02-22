#!/usr/bin/env node
/**
 * merge-dinner-research.js
 *
 * Merges dinner roundtable research from schedule-tab.tsx into Supabase companies table.
 * - Adds missing leaders to existing companies
 * - Creates 3 missing companies (Plaid, Mastercard, The Smarter Merchant)
 * - Enriches existing leaders with deeper research
 *
 * Usage:
 *   node --env-file=.env.local scripts/merge-dinner-research.js [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── DINNER ATTENDEE → LEADER FORMAT ─────────────────────────────────────────
// Transform schedule-tab attendee format to the Company.leaders schema:
// { n: name, t: title, bg: background, hooks: string[], li: linkedinUrl }

const dinnerLeaders = {
  // Company name → array of leaders to add/update
  "Vox Funding": [
    {
      n: "Brian Mullins",
      t: "CTO — Head of Technology, Data & Marketing",
      bg: "20+ yr tech career. UPenn grad. Built SYNQ API at Vox from scratch — real-time broker deal submissions + automated workflow. Previously Global CIO/CTO at Apex 1 Group, co-founded SBF Finance & Technology (CTO/CMO), founded Digsites LLC (Philly web/software firm, 2005). Early Stage Tech Advisor at Fruitful Labs ($33M fintech startup). Joined Vox in Aug 2018 as triple-hat CTO overseeing tech + data + marketing.",
      hooks: [
        "* SYNQ API just integrated with Cloudsquare's Salesforce platform (Jan 2026)",
        "Founded Digsites LLC in 2005 — Philadelphia web/software dev firm",
        "Triple-hat CTO (tech + data + marketing) — owns full acquisition-to-underwriting pipeline",
        "UPenn grad with early career at Advanta financial services",
      ],
      li: "https://www.linkedin.com/in/digsites",
    },
  ],
  "Expansion Capital Group": [
    {
      n: "Herk Christie",
      t: "Chief Operating Officer",
      bg: "Operations exec with roots in consumer finance at Citibank, Capital One, and Resurgent Capital Services (debt purchasing/servicing). Joined ECG Mar 2016 on ops team, promoted to VP Ops, named COO Jun 2019. Oversees underwriting, IT, analytics, merchant support. Champion of cash-flow-first underwriting — presented with Ocrolus on prioritizing bank statement analysis over credit scores. ECG: Sioux Falls, SD-based specialty lender, $1B+ funded to 35K+ SMBs, secured $100M credit facility Jan 2025.",
      hooks: [
        "* Presented with Ocrolus on 'cash-flow-first underwriting' — puts bank statement analysis BEFORE credit scores",
        "Citibank → Capital One → Resurgent Capital → ECG — full credit lifecycle experience",
        "ECG decisions 90% of submitted leads in under 45 mins with 80%+ contracts-signed-to-close ratio",
        "Building fintech talent in Sioux Falls, SD",
      ],
      li: "https://www.linkedin.com/in/herk-christie-913939",
    },
  ],
  Fundfi: [
    {
      n: "Gerard Lucero",
      t: "Senior Underwriter",
      bg: "Senior UW at Fundfi Merchant Funding. Career progression through alt finance: started at Liquid Capital as Factor Support Admin, advanced to UW Assistant then Underwriter. Moved to FundThrough as UW on invoice financing platform. Proficient in Excel, Adobe Pro, CT Lien UCC services. Fundfi: Revenue-based financing (US + Canada), founded 2020, expanded credit facility twice in 2025, launched 2 new products Dec 2025, opened Alabama office.",
      hooks: [
        "* Career arc from factoring (Liquid Capital) → invoice financing (FundThrough) → MCA/RBF (Fundfi)",
        "Fundfi expanded credit facility TWICE in 2025 + launched 2 new products",
        "UCC lien expertise (CT Lien services) — deep secured transaction mechanics",
        "Fundfi's new credit splits program — underwriting split-payment structures",
      ],
      li: "https://www.linkedin.com/in/gerard-lucero-49227b87",
    },
  ],
  Raistone: [
    {
      n: "Angel Murudumbay",
      t: "Vice President, Operations",
      bg: "Financial operations leader with 15+ years experience. Rose through Raistone from Associate to AVP to VP Operations. Prior: Trade Ops Associate at State Street, Account Manager (Finance) at TIAA Bank, third-party risk vendor management at Valley, Global Account Manager Operations at HP Enterprise. New Jersey City University (BS Finance). CRITICAL: Raistone shut down Jan 2026 after largest client First Brands collapsed in fraud scandal ('The $9 Billion Lie'). Angel likely in career transition.",
      hooks: [
        "* Lived through Raistone's rise ($10B+ financing) and collapse (Jan 2026) — extraordinary fintech story",
        "* Raistone was a Mastercard partner (virtual cards for SMBs)",
        "State Street trade ops → fintech VP — drove shift from traditional finance to embedded finance",
        "Raistone Connect API integrated with ERPs, treasury, B2B payments",
      ],
      li: "https://www.linkedin.com/in/angel-murudumbay-3433a616/",
    },
  ],
  "iBusiness Funding": [
    {
      n: "Kaustubh 'Kos' Joshi",
      t: "Chief Business Officer",
      bg: "15+ yr financial services. At Goldman Sachs: Head of Product for Embedded Business Financing — launched + scaled embedded SMB financing including the Amazon lending partnership. Joined Funding Circle US (Nov 2023) as Head of Embedded Finance & Partnerships. Transitioned to iBusiness Funding as CBO after iBusiness acquired Funding Circle USA for $41.8M in 2024. UC Berkeley Haas educated. iBusiness: division of Ready Capital (NYSE: RC), top-1% SBA 7(a) lender, LenderAI processes 1,200+ daily apps, $7B+ SBA loans.",
      hooks: [
        "* Goldman Sachs embedded SMB financing architect — built the Amazon lending partnership",
        "* Lived through Funding Circle USA acquisition by iBusiness/Ready Capital",
        "LenderAI scaling from SBA to bridge lending to franchise financing (2025-2026)",
        "Berkeley Haas + Goldman + fintech — embedded lending from both bank and fintech side",
      ],
      li: "https://www.linkedin.com/in/kaustubhmjoshi/",
    },
  ],
  "Biz2Credit": [
    {
      n: "Aman Mahajan",
      t: "Chief Risk Officer (CRO)",
      bg: "Chartered Accountant (ICAI, India) + FRM (Financial Risk Manager) credential. Career through Citibank and Goldman Sachs before joining Biz2Credit as CRO. Oversees credit risk for platform that has facilitated $8B+ in SMB lending. Biz2Credit: est. 2007, $8B+ SMB financing, Biz2X SaaS ($100M+ ARR), IPO planned early 2027, Deloitte Fast 500 (203% growth).",
      hooks: [
        "* Goldman Sachs + Citibank risk background in fintech lending",
        "* Biz2Credit's IPO path (early 2027, $15-20B valuation) — building institutional-grade risk infrastructure",
        "Biz2X AI-powered underwriting agent claims 30-40% reduction in loan approval time",
        "Chartered Accountant + FRM dual credential — Indian financial system perspective in American SMB lending",
      ],
      li: "https://www.linkedin.com/in/aman-mahajan-9b032aa/",
    },
  ],
  "Coral Capital Solutions": [
    {
      n: "David Tilis",
      t: "Chief Strategy Officer",
      bg: "20+ yr banking & fintech veteran. CUNY Brooklyn College + Baruch College (Finance & Investments). Built fintech partnerships division at Cross River Bank from inception through the Andreessen Horowitz raise (2016). Built FinWise Bank's FinTech Partnerships from scratch — 30+ partnerships (Upstart, Liberty Lending, Behalf, Elevate) cumulatively originating $12B+ in loans, integral to FinWise's IPO in 2021. Joined Coral Capital Jan 2025. Board Advisor at B9 (payroll fintech). Frequent speaker at LendIT, COMPLY Summit, Lend360.",
      hooks: [
        "* Built TWO fintech partnership divisions from scratch (Cross River Bank + FinWise Bank) — originating $12B+ in loans",
        "Deep relationships with marketplace lenders (Upstart, Liberty Lending, Behalf, Elevate)",
        "Joined Coral Capital weeks ago (Jan 2025) — ask about strategic vision",
        "Frequent speaker: LendIT, COMPLY Summit, Lend360 — very well-networked",
      ],
      li: "https://www.linkedin.com/in/davidtilis",
    },
  ],
  "Velocity Capital Group": [
    {
      n: "Jay Avigdor",
      t: "President & CEO",
      bg: "Started Velocity Feb 2018 from home with $50K savings at age 26. Touro University (finance/general studies) — started college at 16, graduated early. Spent ~5 years at Pearl Capital before founding VCG. Cold-called from yellow pages, closed $250K MCA deal with CA auto dealer. Grew 1 to 18 employees in under a year. $850M+ career sales, 15K+ clients, 40K+ broker relationships. $50M Arena Investors facility. Donates 10% of net proceeds per file to charity. Active TikTok (@jay_avigdor).",
      hooks: [
        "* 'From Broke to Boss' podcast — $17 in pocket to $850M+ career sales; 'Need It Don't Want It' philosophy",
        "* Claims 93% default prediction accuracy using AI + granular demographic data",
        "First MCA funder to offer broker commissions via crypto (USDC/DAI, Aug 2021)",
        "Active TikTok + frequent speaker: Broker Fair 2024, B2B Finance Expo 2025",
      ],
      li: "https://www.linkedin.com/in/jay-avigdor-4b035247/",
    },
  ],
  "The Smarter Merchant": [
    {
      n: "Nabil Aziz",
      t: "Head of Risk & Underwriting",
      bg: "Fintech & commercial lending professional. Loughborough University (UK) — BA Accounting & Finance. 13+ years UW experience spanning government mortgage underwriting and MCA/alternative finance. Skills in credit & risk analysis, real estate valuation, financial analysis, market research. Has conducted 1,000+ real estate closings. The Smarter Merchant: NYC-based direct MCA funder (est. 2013), ISO-only model, ~20 employees, tech-driven UW evaluating real-time bank data + future sales.",
      hooks: [
        "* Loughborough University (UK) grad — unusual pedigree for NYC MCA",
        "13+ years underwriting across mortgage and MCA — rich cross-product risk perspective",
        "The Smarter Merchant: 'no backdoor practices, no sales floor' — enforces UW ethics in ISO model",
        "ISO-only model means evaluating risk without ever speaking to the merchant — pure data-driven UW",
      ],
      li: "https://www.linkedin.com/in/nabilaziz/",
    },
  ],
  "Aspire Funding": [
    {
      n: "Adam Madar",
      t: "Head of Underwriting",
      bg: "Brooklyn-based alt finance pro (BMCC, Business Admin). 8+ years in MCA. Early career as Funding Advisor at Yellowstone Capital (2014-2016) — NOTE: Yellowstone later received $1.065B NY AG settlement (Jan 2025), the largest MCA enforcement ever. Adam left well before the predatory practices in question. Founded AMM Capital (2018, Jersey City) — his own revenue-based funding shop. Now leads UW at Aspire Funding Platform. Aspire uses API/OCR tech, same-day funding, up to 17-point ISO commissions.",
      hooks: [
        "* Self-made trajectory: BMCC to running own funding company (AMM Capital) to heading UW at Aspire",
        "Aspire uses API/OCR for underwriting — automated bank statement analysis",
        "Attended Broker Fair 2025 — active in ISO/broker channel",
        "NOTE: Yellowstone Capital background is sensitive. He left in 2016 before problematic period",
      ],
      li: "https://www.linkedin.com/in/adammmadar/",
    },
  ],
};

// ── NEW COMPANIES TO INSERT ──────────────────────────────────────────────────

const newCompanies = [
  {
    name: "Plaid",
    type: "TAM",
    priority: 4,
    phase: 0,
    booth: false,
    clear: false,
    contacts: [
      { n: "Rohan Sriram", t: "Product Lead — Credit & Income" },
    ],
    leaders: [
      {
        n: "Rohan Sriram",
        t: "Product Lead — Credit & Income",
        bg: "Product Lead at Plaid for Credit & Income products. Background spans PM, operations, risk, data science. Led evaluation + deployment of Inscribe's document fraud detection for income verification (found potential to automate 50%+ of doc review). Co-authored Plaid blog posts on ML-powered income verification, AI transaction categorization, anti-fraud. Writes Medium articles on payments value chains, lending mechanics, Plaid strategy. Plaid: $6.1B valuation (Apr 2025), 12K+ financial institutions.",
        hooks: [
          "* Owns Plaid income/credit products — ML models with 95% salary stream detection accuracy + 30+ fraud signals",
          "* Led Inscribe integration for doc fraud detection — potential to automate 50%+ of applicant doc review",
          "Authored Medium analysis of Plaid's value chain after failed $5.3B Visa acquisition",
          "Writes publicly about 'The Lending Triangle' — rare product leader who publishes frameworks",
        ],
        li: "https://www.linkedin.com/in/rohansriram",
      },
    ],
    desc_text:
      "Plaid is a financial infrastructure company that powers fintech and banking apps by connecting them to users' bank accounts. $6.1B valuation (Apr 2025, Franklin Templeton-led $575M raise). 12,000+ financial institution connections. Products include bank income verification, identity verification, and LendScore (cash-flow credit score launched Oct 2025 with 25% predictive lift over traditional scores). Trust Index 2 fraud model for document manipulation detection. Key infrastructure for virtually all MCA funders doing bank account connectivity and verification.",
    notes: "Dinner roundtable attendee: Rohan Sriram. PARTNERSHIP opportunity — Plaid does connectivity, HyperVerge does document intelligence. Complementary, not competitive.",
    news: [
      { h: "Plaid launched LendScore — cash-flow credit risk score", s: "TechCrunch, Oct 2025", d: "25% predictive lift over traditional credit scores, directly relevant to MCA underwriting" },
      { h: "Plaid raised $575M at $6.1B valuation", s: "Bloomberg, Apr 2025", d: "Franklin Templeton-led round solidifies Plaid as dominant financial data infrastructure" },
      { h: "Trust Index 2 fraud model + expanded income verification", s: "Plaid Blog, Fall 2025", d: "30+ fraud signals for document manipulation detection" },
    ],
    ice: "Rohan, LendScore takes a cash-flow-first approach to credit scoring. How are MCA funders reacting — is this replacing bank statement analysis or supplementing it?",
    icebreakers: [
      "Rohan, LendScore takes a cash-flow-first approach. How does that compare to what traditional MCA funders are doing with bank statement analysis?",
      "The Plaid-Experian partnership landed in 2025. How are lenders in the alternative space reacting — is cash-flow scoring replacing FICO, or supplementing it?",
      "You've seen fraud from the data layer. How sophisticated are the fake bank statements you're catching now vs. 2 years ago?",
      "You led the Inscribe integration for document fraud. What percentage of income documents have some form of manipulation?",
    ],
    talking_points: [
      "Plaid's bank income product could replace manual bank statement review in MCA underwriting",
      "LendScore (Oct 2025) — cash-flow-based credit score with 25% lift, directly relevant to MCA",
      "30+ fraud signals for document manipulation — addresses major pain point in MCA UW",
    ],
    ask: "Rohan, we'd love to explore a complementary integration — Plaid for live bank data, HyperVerge for document verification on uploaded statements. Could we set up a technical call?",
    location: "San Francisco, CA",
    employees: 1500,
    website: "https://plaid.com",
    linkedin_url: "https://www.linkedin.com/company/plaid-/",
    source: ["dinner-research"],
  },
  {
    name: "Mastercard",
    type: "TAM",
    priority: 4,
    phase: 0,
    booth: false,
    clear: false,
    contacts: [
      { n: "Aakanksha Jadhav", t: "Director, Product Development" },
    ],
    leaders: [
      {
        n: "Aakanksha Jadhav",
        t: "Director, Product Development",
        bg: "Product leader at Mastercard (Purchase, NY) within The Foundry — Mastercard's innovation engine (280+ patents, $510M investment). Leads GenAI products for SMEs. IIT Madras (BTech Honors + MTech) + Olin MBA. Prior: JP Morgan, Deloitte, GEP, ran edtech startup 'Grasp'. Started as MBA Summer Associate (2019), now Director. Led AI credit risk models for SMEs + merchant solutions. Her team likely built Mastercard Agent Suite (agentic AI, launched Jan 2026). Was Raistone's Mastercard contact (virtual card partnership).",
        hooks: [
          "* Building GenAI credit risk models for SMEs using Mastercard's 1 trillion+ data points",
          "* Mastercard Agent Suite (Jan 2026) — agentic AI for enterprises",
          "* Was Mastercard's partner contact for Raistone (now defunct)",
          "Ran edtech startup 'Grasp' before Mastercard — understands startup struggle",
        ],
        li: null,
      },
    ],
    desc_text:
      "Mastercard is a global payments technology company. The Foundry is Mastercard's innovation engine (280+ patents, $510M investment). Relevant products: Decision Intelligence Pro (300% improvement in fraud detection using GenAI on 1T+ data points), SME credit risk models leveraging real-time transaction data, and Mastercard Agent Suite (agentic AI for enterprises, launched Jan 2026). Key ecosystem player — transaction data provides underwriting signals unavailable to credit bureaus.",
    notes: "Dinner roundtable attendee: Aakanksha Jadhav. STRATEGIC long-term play — Mastercard moves slowly but at massive scale. Complementary data angle: Mastercard transaction data + HyperVerge document intelligence = more complete credit picture. Aakanksha was Raistone's Mastercard contact — she and Angel Murudumbay at the table may know each other.",
    news: [
      { h: "Mastercard launched Agent Suite — agentic AI tools for enterprises", s: "Mastercard Newsroom, Jan 2026", d: "Autonomous systems for pre-underwriting loans and managing fraud investigations. Available Q2 2026" },
      { h: "Mastercard doubled fraud detection rate using Decision Intelligence Pro", s: "Mastercard, 2025", d: "GenAI on 1T+ transaction data points" },
      { h: "Aakanksha Jadhav spoke at NexGen Banking Summit", s: "NexGen, 2025", d: "Keynotes on GenAI Products + AI-Powered Banking" },
    ],
    ice: "Aakanksha, you're building GenAI credit risk models at Mastercard Foundry. How do you think about what Mastercard can see (transaction data) vs. what a lender sees (bank statements)?",
    icebreakers: [
      "Aakanksha, you're building GenAI credit risk models at Mastercard Foundry. How do you think about the difference between transaction data vs. bank statement data?",
      "Mastercard Foundry works on horizon 1 to horizon 3 projects. Where do AI credit models for SMEs fall on that spectrum?",
      "You've worked at JP Morgan and Deloitte before Mastercard. What's unique about building financial products inside a payment network vs. inside a bank?",
      "The Mastercard Agent Suite just launched — what does 'agentic AI' actually mean in practice for enterprise banking?",
    ],
    talking_points: [
      "Mastercard's 1T+ data points = massive UW advantage — real-time txn flow, merchant spending, cross-border patterns",
      "Decision Intelligence Pro delivered 300% improvement in fraud detection — how does this translate to SME credit risk?",
      "Mastercard Agent Suite: autonomous systems that can pre-underwrite loans — the future of lending?",
    ],
    ask: "Aakanksha, your GenAI credit models use Mastercard transaction data. HyperVerge extracts structured data from bank statements, tax returns, and business documents. Could we explore how document-layer data complements your transaction data for better model accuracy?",
    location: "Purchase, NY",
    employees: 33000,
    website: "https://www.mastercard.com",
    linkedin_url: "https://www.linkedin.com/company/mastercard/",
    source: ["dinner-research"],
  },
];

// ── MERGE LOGIC ──────────────────────────────────────────────────────────────

async function mergeLeadersIntoCompany(companyName, newLeaders) {
  // Fetch current company record
  const { data: rows, error: fetchErr } = await supabase
    .from("companies")
    .select("id, name, leaders")
    .ilike("name", companyName)
    .limit(1);

  if (fetchErr) {
    console.error(`  ✗ Error fetching "${companyName}":`, fetchErr.message);
    return false;
  }

  if (!rows || rows.length === 0) {
    console.error(`  ✗ Company "${companyName}" not found in database`);
    return false;
  }

  const company = rows[0];
  const existingLeaders = company.leaders || [];

  // For each new leader, check if they already exist (by name)
  let updated = false;
  const mergedLeaders = [...existingLeaders];

  for (const newLeader of newLeaders) {
    const existingIdx = mergedLeaders.findIndex(
      (l) => l.n && l.n.toLowerCase() === newLeader.n.toLowerCase()
    );

    if (existingIdx >= 0) {
      // Leader exists — update with richer data if dinner research is more detailed
      const existing = mergedLeaders[existingIdx];
      const existingBgLen = (existing.bg || "").length;
      const newBgLen = (newLeader.bg || "").length;

      if (newBgLen > existingBgLen) {
        mergedLeaders[existingIdx] = {
          ...existing,
          ...newLeader,
          // Keep existing LinkedIn if new one is missing
          li: newLeader.li || existing.li,
          // Merge hooks: use the longer set
          hooks:
            (newLeader.hooks || []).length >= (existing.hooks || []).length
              ? newLeader.hooks
              : existing.hooks,
        };
        console.log(
          `  ↑ Updated "${newLeader.n}" in "${companyName}" (bg: ${existingBgLen} → ${newBgLen} chars)`
        );
        updated = true;
      } else {
        // Still fill in missing fields
        let fieldsAdded = [];
        if (!existing.li && newLeader.li) {
          mergedLeaders[existingIdx].li = newLeader.li;
          fieldsAdded.push("li");
        }
        if ((!existing.hooks || existing.hooks.length === 0) && newLeader.hooks?.length > 0) {
          mergedLeaders[existingIdx].hooks = newLeader.hooks;
          fieldsAdded.push("hooks");
        }
        if (fieldsAdded.length > 0) {
          console.log(
            `  ↑ Added missing fields (${fieldsAdded.join(", ")}) for "${newLeader.n}" in "${companyName}"`
          );
          updated = true;
        } else {
          console.log(
            `  = "${newLeader.n}" already exists in "${companyName}" with equal or better data — skipped`
          );
        }
      }
    } else {
      // Leader doesn't exist — add them
      mergedLeaders.push(newLeader);
      console.log(`  + Added "${newLeader.n}" to "${companyName}"`);
      updated = true;
    }
  }

  if (!updated) {
    return true;
  }

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would update "${companyName}" leaders (${existingLeaders.length} → ${mergedLeaders.length})`);
    return true;
  }

  // Update in Supabase
  const { error: updateErr } = await supabase
    .from("companies")
    .update({ leaders: mergedLeaders })
    .eq("id", company.id);

  if (updateErr) {
    console.error(`  ✗ Error updating "${companyName}":`, updateErr.message);
    return false;
  }

  console.log(
    `  ✓ Updated "${companyName}" leaders (${existingLeaders.length} → ${mergedLeaders.length})`
  );
  return true;
}

async function insertNewCompany(company) {
  // Check if company already exists
  const { data: existing } = await supabase
    .from("companies")
    .select("id, name")
    .ilike("name", company.name)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`  = "${company.name}" already exists (id: ${existing[0].id}) — skipping insert`);
    return true;
  }

  // Get the next available ID
  const { data: maxRow } = await supabase
    .from("companies")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);

  const nextId = (maxRow && maxRow[0] ? maxRow[0].id : 2000) + 1;
  const row = { id: nextId, ...company };

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would insert "${company.name}" with id ${nextId}`);
    return true;
  }

  const { error } = await supabase.from("companies").insert(row);

  if (error) {
    console.error(`  ✗ Error inserting "${company.name}":`, error.message);
    return false;
  }

  console.log(`  ✓ Inserted "${company.name}" (id: ${nextId})`);
  return true;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    DRY_RUN
      ? "=== DINNER RESEARCH MERGE (DRY RUN) ==="
      : "=== DINNER RESEARCH MERGE ==="
  );
  console.log();

  // Step 1: Merge leaders into existing companies
  console.log("── Merging leaders into existing companies ──");
  let successCount = 0;
  let failCount = 0;

  for (const [companyName, leaders] of Object.entries(dinnerLeaders)) {
    console.log(`\n${companyName}:`);
    const ok = await mergeLeadersIntoCompany(companyName, leaders);
    if (ok) successCount++;
    else failCount++;
  }

  console.log(`\nLeader merges: ${successCount} succeeded, ${failCount} failed`);

  // Step 2: Insert new companies
  console.log("\n── Inserting new companies ──");
  let insertSuccess = 0;
  let insertFail = 0;

  for (const company of newCompanies) {
    console.log(`\n${company.name}:`);
    const ok = await insertNewCompany(company);
    if (ok) insertSuccess++;
    else insertFail++;
  }

  console.log(
    `\nNew companies: ${insertSuccess} succeeded, ${insertFail} failed`
  );
  console.log("\n=== DONE ===");
}

main().catch(console.error);
