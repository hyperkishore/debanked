/**
 * PRODUCT DOCUMENTATION
 *
 * Structured product knowledge for all 8 HyperVerge products.
 * Used by:
 * - Kiket AI agent (via /api/tools/products and /api/tools/product/[id])
 * - Products tab UI (browsable product catalog with demos, collateral, sales material)
 *
 * Data sourced from:
 * - product-helpers.ts PRODUCT_CATALOG
 * - product-fit.ts (CATEGORY_PRODUCT_AFFINITY, PAIN_POINT_RULES, PRODUCT_TALKING_POINTS, COMPETITOR_PRODUCT_MAP)
 * - pitch-tab.tsx (value props, objections, collateral links)
 * - resources-tab.tsx (demo videos, live demos, Notion pages)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductDoc {
  id: string;
  name: string;
  tagline: string;
  description: string;
  keyFeatures: string[];
  useCases: { persona: string; scenario: string }[];
  metrics: { value: string; label: string }[];
  demoVideos: { title: string; type: "google_drive" | "youtube" | "loom"; url: string; embedUrl: string; duration?: string }[];
  liveDemoUrl?: string;
  notionPages: { title: string; url: string }[];
  collateral: { title: string; type: "pdf" | "one-pager" | "case-study" | "marketing-note" | "brds"; url: string }[];
  valueProps: { from: string; to: string; impact: string }[];
  objections: { question: string; answer: string }[];
  competitorsReplaced: string[];
  talkingPoints: string[];
  painPoints: string[];
  categoryAffinity: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Shared resources (applicable to all/multiple products)
// ---------------------------------------------------------------------------

const SHARED_NOTION_PAGES = [
  { title: "US Fintech Notion Page", url: "https://www.notion.so/hyperverge/US-Fintech-187b743dbaed4e2b9d38fb612b62e6fb" },
  { title: "ICP Conversations", url: "https://www.notion.so/hyperverge/ICP-Conversations-1117e7c237cb80f3a75ace79d1e26431" },
  { title: "FY26 OKRs", url: "https://www.notion.so/hyperverge/Company-Goals-FY-26-2ef7e7c237cb81de91b9f66ab764513e" },
];

const SHARED_COLLATERAL = [
  { title: "Product Demos & Marketing Collaterals", type: "one-pager" as const, url: "https://docs.google.com/spreadsheets/d/1a-v52TIX6xSwrqtnSl45_7x4hiykCW8r6aiApbonlpo/edit?gid=2080114931" },
  { title: "TAM List", type: "one-pager" as const, url: "https://docs.google.com/spreadsheets/d/1a-v52TIX6xSwrqtnSl45_7x4hiykCW8r6aiApbonlpo/edit?gid=1800727960" },
];

const SHARED_OBJECTIONS: ProductDoc["objections"] = [
  {
    question: "We built our own system",
    answer: "We complement, not replace. We handle upstream extraction: bank statement parsing, CLEAR report analysis, stips verification. Your scoring model stays yours — we just feed it cleaner data, faster. FundKite built their own stack and uses us for exactly this.",
  },
  {
    question: "We're not ready for AI yet",
    answer: "No rip-and-replace needed. We sit alongside your existing workflow. Your underwriters still make the final call, they just get there 8x faster. Think of it as giving them a co-pilot, not replacing the pilot.",
  },
  {
    question: "What does it cost?",
    answer: "Per application pricing, scales with your volume. For most funders doing 50+ deals/day, the ROI is 10-20x within the first month — saving 35 min of underwriter time per deal. Happy to run a specific ROI calculation for your volume.",
  },
  {
    question: "We tried AI before and it didn't work",
    answer: "Purpose-built for MCA/lending underwriting. Our models are trained on millions of bank statements, CLEAR reports, and applications specifically in this industry. 450+ financial enterprises using us, not 450 failed pilots.",
  },
  {
    question: "Our underwriters are fast enough",
    answer: "If competitors are closing deals in 2 hours and you're at 4, ISOs route deals to them first. It's also consistency: our AI catches things human reviewers miss at 4 PM on a Friday. And it never calls in sick.",
  },
];

// ---------------------------------------------------------------------------
// Product Documentation
// ---------------------------------------------------------------------------

export const PRODUCT_DOCS: ProductDoc[] = [
  // =========================================================================
  // 1. BSA — Bank Statement Analysis
  // =========================================================================
  {
    id: "bsa",
    name: "BSA",
    tagline: "AI-powered bank statement parsing and cash flow analysis",
    description:
      "HyperVerge BSA (Bank Statement Analysis) transforms raw bank statements into structured cash flow intelligence in seconds. Instead of underwriters spending 15+ minutes manually reviewing each bank statement — highlighting deposits, calculating averages, flagging NSFs — the AI extracts and analyzes everything automatically with 98%+ accuracy.\n\nBSA handles statements from 10,000+ bank formats including PDFs, scanned images, and digital exports. It identifies revenue patterns, expense categories, negative days, average daily balances, and over 50 cash flow metrics that underwriters need for MCA and small business lending decisions.\n\nFor high-volume funders processing 50-200+ deals per day, BSA eliminates the single biggest bottleneck in the underwriting pipeline. The time savings compound: what took a team of 10 underwriters now takes 2, with better accuracy and consistency.",
    keyFeatures: [
      "98%+ extraction accuracy across 10,000+ bank formats",
      "50+ cash flow metrics calculated automatically",
      "PDF, scanned, and digital statement support",
      "Negative day detection and NSF flagging",
      "Average daily balance computation",
      "Revenue pattern and trend analysis",
      "Multi-month statement aggregation",
      "Customizable output format for LOS integration",
    ],
    useCases: [
      { persona: "Underwriter", scenario: "Process 50+ bank statements daily without manual data entry — get structured cash flow data in seconds instead of 15 minutes per file" },
      { persona: "Operations Manager", scenario: "Scale underwriting volume 5-8x without proportional hiring by automating the most time-intensive step" },
      { persona: "Risk Analyst", scenario: "Get consistent, accurate cash flow metrics across all applications — no more human variance in calculations" },
      { persona: "CTO/VP Engineering", scenario: "Integrate via API into existing LOS/CRM to eliminate manual handoffs between systems" },
    ],
    metrics: [
      { value: "98%+", label: "Extraction accuracy" },
      { value: "< 30s", label: "Processing time per statement" },
      { value: "10,000+", label: "Bank formats supported" },
      { value: "50+", label: "Cash flow metrics" },
      { value: "5-8x", label: "Underwriter throughput increase" },
    ],
    demoVideos: [
      {
        title: "Cashflow Analysis Demo",
        type: "google_drive",
        url: "https://drive.google.com/file/d/1pzREwBBB2c3yf8jUTc3Td-esxpZXwtY1/view",
        embedUrl: "https://drive.google.com/file/d/1pzREwBBB2c3yf8jUTc3Td-esxpZXwtY1/preview",
      },
    ],
    liveDemoUrl: "https://mca-lending-space.vercel.app/operations/cash-flow-analysis",
    notionPages: [...SHARED_NOTION_PAGES],
    collateral: [
      ...SHARED_COLLATERAL,
    ],
    valueProps: [
      { from: "Manual bank statement review", to: "AI cash flow analysis", impact: "15 min to seconds" },
      { from: "10 underwriters for 200 deals/day", to: "2 underwriters + BSA", impact: "5x cost reduction" },
      { from: "Inconsistent manual calculations", to: "Standardized 50+ metrics", impact: "Zero variance" },
    ],
    objections: SHARED_OBJECTIONS,
    competitorsReplaced: ["Ocrolus (BSA)", "Plaid (bank data)"],
    talkingPoints: [
      "Bank statement analysis is the single biggest time sink in MCA underwriting — 15 minutes per file, multiplied by 50-200 deals/day",
      "HyperVerge cuts that to under 30 seconds with 98%+ accuracy across 10,000+ bank formats",
      "Already deployed with 450+ financial services enterprises — proven at scale",
      "Per-application pricing means ROI is immediate: save 35 minutes of underwriter time per deal",
    ],
    painPoints: [
      "Manual bank statement review is a bottleneck",
      "Cash flow analysis is time-consuming",
      "High volume of bank statements to process",
      "Growing application volume strains manual processes",
    ],
    categoryAffinity: {
      funder: 85,
      iso: 50,
      marketplace: 55,
      bank: 70,
      technology: 25,
      competitor: 5,
      service_provider: 10,
    },
  },

  // =========================================================================
  // 2. Clear — CLEAR Report Analysis
  // =========================================================================
  {
    id: "clear",
    name: "Clear",
    tagline: "Automated CLEAR report analysis for credit and fraud checks",
    description:
      "HyperVerge Clear automates the analysis of CLEAR reports (from LexisNexis/Thomson Reuters) — 50+ page documents that underwriters currently review manually. The AI extracts structured risk data including criminal records, bankruptcies, liens, judgments, UCC filings, and identity verification results in seconds.\n\nInstead of an underwriter spending 15 minutes scrolling through a CLEAR report highlighting key risk factors, Clear delivers a structured risk summary with flagged items, severity scores, and recommended actions. This is critical for MCA funders where every hour of delay means lost deals to faster competitors.\n\nClear integrates with existing CLEAR/LexisNexis subscriptions — it reads the reports you already pull, just eliminates the manual review step.",
    keyFeatures: [
      "Automated 50+ page CLEAR report parsing",
      "Criminal record, bankruptcy, and lien extraction",
      "Judgment and UCC filing detection",
      "Identity verification cross-referencing",
      "Risk severity scoring and flagging",
      "Structured output for underwriting decisioning",
      "Works with existing LexisNexis subscriptions",
      "Batch processing for high-volume operations",
    ],
    useCases: [
      { persona: "Underwriter", scenario: "Get a structured risk summary from a 50-page CLEAR report in seconds instead of 15 minutes of manual review" },
      { persona: "Compliance Officer", scenario: "Ensure consistent CLEAR report review across all applications — no items missed due to human oversight" },
      { persona: "Operations Manager", scenario: "Eliminate the CLEAR review bottleneck that slows down the entire underwriting pipeline" },
    ],
    metrics: [
      { value: "< 15s", label: "Report processing time" },
      { value: "50+", label: "Page reports parsed" },
      { value: "15 min", label: "Saved per report" },
      { value: "99%+", label: "Risk item detection" },
    ],
    demoVideos: [
      {
        title: "Clear Analysis Demo",
        type: "google_drive",
        url: "https://drive.google.com/file/d/1N_uJUvs3pXnvoaBPVNRI_hQrG1ZykLMS/view",
        embedUrl: "https://drive.google.com/file/d/1N_uJUvs3pXnvoaBPVNRI_hQrG1ZykLMS/preview",
      },
    ],
    liveDemoUrl: "https://mca-lending-space.vercel.app/operations/clear-report",
    notionPages: [
      ...SHARED_NOTION_PAGES,
      { title: "Marketing Note: Clear Analysis", url: "https://www.notion.so/hyperverge/Clear-Brief-Marketing-Note-1b87e7c237cb808cb8e3f437fc1615f0" },
    ],
    collateral: [
      { title: "CLEAR Report — High Level", type: "one-pager", url: "https://drive.google.com/file/d/16sW_NUacuxh-xmTbPpoGDVWH2CW0tewD/view" },
      { title: "CLEAR Report — Detailed", type: "pdf", url: "https://drive.google.com/file/d/1LLfcCXV4PeDHESEgdj_EyCRh1x8MKU0B/view" },
      ...SHARED_COLLATERAL,
    ],
    valueProps: [
      { from: "50+ page CLEAR report manual review", to: "AI risk report parsing", impact: "15 min to seconds" },
      { from: "Missed risk items in manual review", to: "99%+ automated detection", impact: "Zero oversight" },
      { from: "Inconsistent risk flagging across underwriters", to: "Standardized severity scoring", impact: "Consistent decisions" },
    ],
    objections: SHARED_OBJECTIONS,
    competitorsReplaced: ["LexisNexis (CLEAR)"],
    talkingPoints: [
      "Automated CLEAR report parsing eliminates manual data entry from 50+ page reports — structured risk data in seconds, not 15 minutes",
      "Works with your existing LexisNexis subscription — we read the reports you already pull, just eliminate the manual review step",
      "99%+ risk item detection means no more missed bankruptcies, liens, or judgments buried on page 47",
    ],
    painPoints: [
      "Manual CLEAR/LexisNexis report review",
      "Credit bureau data needs automated parsing",
    ],
    categoryAffinity: {
      funder: 70,
      iso: 60,
      marketplace: 35,
      bank: 55,
      technology: 15,
      competitor: 5,
      service_provider: 10,
    },
  },

  // =========================================================================
  // 3. Application PDF — Email to CRM / Application Intake
  // =========================================================================
  {
    id: "application_pdf",
    name: "Application PDF",
    tagline: "AI intake and parsing of loan application documents",
    description:
      "HyperVerge Application PDF (also known as Email to CRM) automates the intake and parsing of loan applications from any source — email, fax, portal uploads, or ISO submissions. The AI extracts business information, owner details, requested amounts, and all application fields into structured data for your CRM or LOS.\n\nFor funders receiving hundreds of applications daily from dozens of ISOs, each in different formats, the manual re-entry and classification is a massive bottleneck. Application PDF standardizes everything automatically — no more inconsistent formats, missing fields, or manual data entry errors.\n\nThe system handles PDFs, scanned documents, email attachments, and even handwritten applications with high accuracy, routing extracted data directly into your underwriting pipeline.",
    keyFeatures: [
      "Multi-format intake: PDF, scanned, email, fax",
      "Automatic field extraction: business info, owner details, amounts",
      "ISO submission standardization",
      "Missing field detection and flagging",
      "Direct CRM/LOS integration via API",
      "Duplicate application detection",
      "Handwritten application support",
      "Batch processing for high-volume intake",
    ],
    useCases: [
      { persona: "Operations Manager", scenario: "Eliminate manual data entry from ISO submissions — 100+ applications/day automatically parsed and routed to underwriting" },
      { persona: "ISO/Broker", scenario: "Submit applications in any format and get instant confirmation with extracted fields for verification" },
      { persona: "Underwriter", scenario: "Start reviewing pre-structured application data immediately instead of waiting for manual intake processing" },
      { persona: "CTO/VP Engineering", scenario: "API integration eliminates the email-to-CRM manual handoff that creates a 2-4 hour lag in the pipeline" },
    ],
    metrics: [
      { value: "< 10s", label: "Per application processing" },
      { value: "95%+", label: "Field extraction accuracy" },
      { value: "5 min", label: "Saved per application" },
      { value: "100+", label: "Formats supported" },
    ],
    demoVideos: [
      {
        title: "Email to CRM — High Level",
        type: "google_drive",
        url: "https://drive.google.com/file/d/1UNxRWYTAIG7YK0ZOdV7i88PeMLkNSW3g/view",
        embedUrl: "https://drive.google.com/file/d/1UNxRWYTAIG7YK0ZOdV7i88PeMLkNSW3g/preview",
      },
      {
        title: "Email to CRM — Detailed",
        type: "google_drive",
        url: "https://drive.google.com/file/d/1Jdluk9TQlY56k3bES4aCMdFT5TY29Zyl/view",
        embedUrl: "https://drive.google.com/file/d/1Jdluk9TQlY56k3bES4aCMdFT5TY29Zyl/preview",
      },
    ],
    notionPages: [...SHARED_NOTION_PAGES],
    collateral: [
      ...SHARED_COLLATERAL,
    ],
    valueProps: [
      { from: "Inconsistent ISO apps in different formats", to: "Automated intake & classification", impact: "5 min to seconds" },
      { from: "Manual data entry from emails/faxes", to: "AI extraction to CRM", impact: "Zero manual entry" },
      { from: "2-4 hour intake lag", to: "Real-time processing", impact: "Instant pipeline entry" },
    ],
    objections: SHARED_OBJECTIONS,
    competitorsReplaced: [],
    talkingPoints: [
      "Standardize every ISO submission into structured data automatically — no more inconsistent formats, missing fields, or manual re-entry",
      "AI-powered application intake extracts and validates all fields from loan applications — PDF, email, or fax — in seconds",
      "Direct integration into your CRM/LOS eliminates the 2-4 hour lag between receiving an application and starting underwriting",
    ],
    painPoints: [
      "ISO/broker submissions require manual intake",
      "Application document intake is manual",
      "PDF document processing needs automation",
    ],
    categoryAffinity: {
      funder: 75,
      iso: 80,
      marketplace: 60,
      bank: 50,
      technology: 20,
      competitor: 5,
      service_provider: 10,
    },
  },

  // =========================================================================
  // 4. Identity Verification (KYC/IDV)
  // =========================================================================
  {
    id: "identity_verification",
    name: "Identity Verification",
    tagline: "KYC/IDV with face match and document verification",
    description:
      "HyperVerge Identity Verification provides bank-grade KYC/IDV for lending and financial services. The platform verifies government-issued IDs, matches faces against documents, screens against OFAC/sanctions lists, and catches synthetic identities — all in real-time during the application process.\n\nFor lenders, identity verification is the first line of defense against fraud. Synthetic identities are a growing problem in MCA and small business lending, with estimated losses in the billions annually. HyperVerge catches 94% of fraudulent IDs before they enter the pipeline.\n\nThe solution is SOC 2 certified, fully auditable, and supports 200+ countries and 5,000+ document types — making it suitable for banks, fintech lenders, and marketplace platforms with strict regulatory requirements.",
    keyFeatures: [
      "Government ID verification (200+ countries, 5,000+ doc types)",
      "Real-time face match against ID photos",
      "OFAC and sanctions list screening",
      "Synthetic identity detection",
      "Liveness detection (anti-spoofing)",
      "SOC 2 Type II certified",
      "Fully auditable verification trail",
      "API-first with SDK options for mobile/web",
    ],
    useCases: [
      { persona: "Compliance Officer", scenario: "Meet KYC/AML requirements with automated identity verification that produces a full audit trail for regulators" },
      { persona: "Risk Manager", scenario: "Stop synthetic identities at the door — 94% catch rate on fraudulent IDs before any underwriting work begins" },
      { persona: "Product Manager", scenario: "Embed seamless identity verification into the borrower onboarding flow with mobile SDK or web widget" },
      { persona: "Operations Manager", scenario: "Eliminate manual ID review and reduce onboarding time from hours to minutes" },
    ],
    metrics: [
      { value: "94%", label: "Fraudulent ID catch rate" },
      { value: "< 10s", label: "Verification time" },
      { value: "200+", label: "Countries supported" },
      { value: "5,000+", label: "Document types" },
      { value: "450+", label: "Enterprise customers" },
    ],
    demoVideos: [
      {
        title: "HyperVerge Builder Demo",
        type: "youtube",
        url: "https://www.youtube.com/watch?v=fLbtk4uty-s",
        embedUrl: "https://www.youtube.com/embed/fLbtk4uty-s",
      },
    ],
    notionPages: [...SHARED_NOTION_PAGES],
    collateral: [
      ...SHARED_COLLATERAL,
    ],
    valueProps: [
      { from: "Manual ID review during onboarding", to: "Real-time AI verification", impact: "Hours to seconds" },
      { from: "Synthetic identity losses", to: "94% catch rate at the door", impact: "Fraud prevention" },
      { from: "Regulatory compliance burden", to: "SOC 2 certified, fully auditable", impact: "Audit-ready" },
    ],
    objections: SHARED_OBJECTIONS,
    competitorsReplaced: ["Onfido (IDV)", "Jumio (IDV)", "Alloy (IDV)", "Socure (IDV)"],
    talkingPoints: [
      "Bank-grade KYC/IDV with face match, document verification, and OFAC screening — SOC 2 certified and fully auditable",
      "Real-time identity verification catches synthetic identities before they enter your pipeline — 94% catch rate on fraudulent IDs",
      "Supports 200+ countries and 5,000+ document types — enterprise-grade for regulated lending",
    ],
    painPoints: [
      "KYC/AML compliance requirements",
      "Identity fraud risk in applications",
      "Customer onboarding verification needed",
    ],
    categoryAffinity: {
      funder: 50,
      iso: 40,
      marketplace: 70,
      bank: 80,
      technology: 40,
      competitor: 5,
      service_provider: 20,
    },
  },

  // =========================================================================
  // 5. SIC/NAICS Classification
  // =========================================================================
  {
    id: "sic_naics",
    name: "SIC/NAICS Classification",
    tagline: "AI-powered industry classification for underwriting decisions",
    description:
      "HyperVerge SIC/NAICS Classification uses AI to automatically classify businesses by industry code — eliminating the manual lookup process that slows underwriting and introduces errors. The system analyzes business descriptions, websites, and application data to assign accurate SIC and NAICS codes in seconds.\n\nAccurate industry classification is critical for underwriting: it determines risk appetite, pricing, restricted industry screening, and portfolio diversification. Manual classification is subjective — one underwriter might code a business differently than another, leading to inconsistent risk decisions and potential compliance issues.\n\nThe AI model is trained on millions of business classifications and handles edge cases (multi-vertical businesses, DBA mismatches, vague descriptions) that trip up manual reviewers.",
    keyFeatures: [
      "AI-powered SIC and NAICS code assignment",
      "Restricted industry screening and flagging",
      "Multi-signal analysis (description, website, application data)",
      "Confidence scoring for edge cases",
      "Batch processing for portfolio classification",
      "Handles multi-vertical and DBA mismatches",
      "Integration with underwriting rules engines",
      "Audit trail for compliance",
    ],
    useCases: [
      { persona: "Underwriter", scenario: "Get instant, accurate SIC/NAICS codes instead of manual lookups — no more inconsistent classifications across the team" },
      { persona: "Risk Manager", scenario: "Automated restricted industry screening catches prohibited businesses before underwriting work begins" },
      { persona: "Compliance Officer", scenario: "Consistent, auditable industry classification with confidence scores for regulatory review" },
      { persona: "Portfolio Manager", scenario: "Batch-classify the entire portfolio for concentration risk analysis and diversification reporting" },
    ],
    metrics: [
      { value: "< 5s", label: "Classification time" },
      { value: "95%+", label: "Accuracy on first code" },
      { value: "5 min", label: "Saved per application" },
    ],
    demoVideos: [
      {
        title: "Industry Classification Demo",
        type: "google_drive",
        url: "https://drive.google.com/file/d/1fPsXDfd3PDNN49kyHRj4GGTF2SJlPPga/view",
        embedUrl: "https://drive.google.com/file/d/1fPsXDfd3PDNN49kyHRj4GGTF2SJlPPga/preview",
      },
    ],
    liveDemoUrl: "https://usa.dashboard.hyperverge.co/",
    notionPages: [
      ...SHARED_NOTION_PAGES,
      { title: "Marketing Note: Industry Classification", url: "https://www.notion.so/hyperverge/Industry-Classification-Brief-Marketing-Note-1ba7e7c237cb80b4a336ed27c9a8c2f9" },
    ],
    collateral: [
      ...SHARED_COLLATERAL,
    ],
    valueProps: [
      { from: "Subjective industry tags", to: "AI SIC/NAICS classification", impact: "5 min to seconds" },
      { from: "Inconsistent manual classification", to: "Standardized AI coding", impact: "Zero variance" },
      { from: "Missed restricted industries", to: "Automated screening", impact: "Compliance protection" },
    ],
    objections: SHARED_OBJECTIONS,
    competitorsReplaced: [],
    talkingPoints: [
      "AI-powered SIC/NAICS classification in seconds — no more manual lookups or misclassified merchants slipping through restricted industry filters",
      "Consistent classification eliminates the subjectivity problem — every underwriter gets the same code for the same business",
      "Restricted industry screening catches prohibited businesses before any underwriting work begins, saving time and reducing risk",
    ],
    painPoints: [
      "Manual industry classification slows underwriting",
      "Restricted industry screening is critical",
    ],
    categoryAffinity: {
      funder: 55,
      iso: 35,
      marketplace: 45,
      bank: 45,
      technology: 15,
      competitor: 5,
      service_provider: 10,
    },
  },

  // =========================================================================
  // 6. Stips Collection
  // =========================================================================
  {
    id: "stips_collection",
    name: "Stips Collection",
    tagline: "Automated stipulation document collection and verification",
    description:
      "HyperVerge Stips Collection automates the most frustrating part of the lending process: chasing down missing documents. After conditional approval, borrowers need to provide stipulations — bank statements, tax returns, proof of ownership, voided checks — and the back-and-forth of requesting, reminding, and verifying these documents delays closings by days.\n\nThe platform automates the entire stips lifecycle: sends personalized collection requests, tracks what's outstanding, sends intelligent follow-ups, verifies received documents against requirements, and notifies the team when everything is complete. What used to take days of email tag now happens in hours.\n\nFor high-volume funders, stips collection is often the difference between a 2-hour close and a 2-day close. Every day of delay is a day the borrower might take a competitor's offer.",
    keyFeatures: [
      "Automated collection request delivery",
      "Intelligent follow-up sequences",
      "Document verification against requirements",
      "Real-time status tracking dashboard",
      "Multi-channel outreach (email, SMS, portal)",
      "Customizable stip checklists per product",
      "Integration with LOS for auto-completion",
      "Borrower-facing upload portal",
    ],
    useCases: [
      { persona: "Closing Coordinator", scenario: "Stop manually tracking stips in spreadsheets — automated collection, follow-up, and verification across all pending deals" },
      { persona: "Operations Manager", scenario: "Reduce time-to-fund by compressing stips collection from days to hours with automated borrower outreach" },
      { persona: "Funder/Owner", scenario: "Stop losing deals to faster competitors because stips collection takes too long — close in hours, not days" },
    ],
    metrics: [
      { value: "Days to hours", label: "Collection time reduction" },
      { value: "3x", label: "Faster document turnaround" },
      { value: "80%+", label: "Auto-verification rate" },
    ],
    demoVideos: [],
    notionPages: [...SHARED_NOTION_PAGES],
    collateral: [
      ...SHARED_COLLATERAL,
    ],
    valueProps: [
      { from: "Stips collection delays (days)", to: "Automated verification", impact: "Days to hours" },
      { from: "Manual email follow-ups", to: "Intelligent automated sequences", impact: "Zero manual chasing" },
      { from: "Lost deals to faster competitors", to: "Same-day stips completion", impact: "Higher close rate" },
    ],
    objections: SHARED_OBJECTIONS,
    competitorsReplaced: [],
    talkingPoints: [
      "Stips collection compressed from days to hours — automated follow-up, verification, and tracking until every stipulation is satisfied",
      "For high-volume funders, every day of stips delay is a day the borrower might accept a competitor's offer",
      "Multi-channel outreach (email, SMS, portal) with intelligent sequencing gets documents in faster than manual email tag",
    ],
    painPoints: [
      "Stipulation collection delays closings",
      "Document collection delays deal closings",
    ],
    categoryAffinity: {
      funder: 70,
      iso: 55,
      marketplace: 30,
      bank: 40,
      technology: 10,
      competitor: 5,
      service_provider: 10,
    },
  },

  // =========================================================================
  // 7. Fraud Detection
  // =========================================================================
  {
    id: "fraud_detection",
    name: "Fraud Detection",
    tagline: "Synthetic identity, document tampering, and application stacking detection",
    description:
      "HyperVerge Fraud Detection catches fraudulent applications before they reach underwriting — preventing losses from synthetic identities, document tampering, and application stacking. The AI analyzes applications, documents, and behavioral patterns to flag high-risk submissions with specific fraud indicators.\n\nIn MCA and small business lending, fraud losses can be catastrophic. A single funded synthetic identity can cost $50,000-$200,000. Application stacking — where a borrower applies to multiple funders simultaneously — erodes the expected performance of the deal. Document tampering (altered bank statements, fabricated tax returns) bypasses traditional checks.\n\nHyperVerge's models are trained on millions of lending applications with known fraud patterns, catching 94% of fraudulent applications. The system provides specific fraud indicators (not just a score) so underwriters can make informed decisions.",
    keyFeatures: [
      "Synthetic identity detection",
      "Document tampering analysis (bank statements, tax returns)",
      "Application stacking detection across funders",
      "Behavioral pattern analysis",
      "Specific fraud indicator reporting (not just scores)",
      "TLO/public records cross-referencing",
      "Real-time screening during application intake",
      "Fraud ring detection across related applications",
    ],
    useCases: [
      { persona: "Risk Manager", scenario: "Catch synthetic identities and tampered documents before funding — prevent $50K-$200K losses per fraudulent deal" },
      { persona: "Underwriter", scenario: "Get specific fraud indicators (not just a score) to make informed approval/decline decisions with evidence" },
      { persona: "Operations Manager", scenario: "Automated pre-screening removes fraudulent applications before underwriters spend any time on them" },
      { persona: "CFO/Owner", scenario: "Reduce portfolio losses from fraud — even a 2% synthetic identity rate costs tens of thousands at scale" },
    ],
    metrics: [
      { value: "94%", label: "Fraud detection rate" },
      { value: "< 15s", label: "Screening time" },
      { value: "$50K-$200K", label: "Saved per caught fraud" },
    ],
    demoVideos: [],
    liveDemoUrl: "https://bsa-demo.dev.hyperverge.co/tlo-report/",
    notionPages: [...SHARED_NOTION_PAGES],
    collateral: [
      ...SHARED_COLLATERAL,
    ],
    valueProps: [
      { from: "Undetected synthetic identities", to: "AI catches 94% of fraud", impact: "Prevention > recovery" },
      { from: "Manual document review misses tampering", to: "Automated tampering detection", impact: "Zero false approvals" },
      { from: "Application stacking blind spots", to: "Cross-funder stacking detection", impact: "Portfolio protection" },
    ],
    objections: SHARED_OBJECTIONS,
    competitorsReplaced: ["Alloy (fraud)", "Socure (fraud)", "DataVisor (fraud)", "Emailage (fraud)"],
    talkingPoints: [
      "Even a 2% synthetic identity rate costs tens of thousands at scale — HyperVerge catches 94% of fraudulent applications before funding",
      "Specific fraud indicators, not just scores — underwriters see exactly what triggered the flag and can make informed decisions",
      "Document tampering detection catches altered bank statements and fabricated tax returns that manual review misses",
    ],
    painPoints: [
      "Application stacking and fraud risk",
      "Document tampering detection needed",
      "High loss rates suggest fraud exposure",
    ],
    categoryAffinity: {
      funder: 75,
      iso: 40,
      marketplace: 65,
      bank: 75,
      technology: 35,
      competitor: 5,
      service_provider: 15,
    },
  },

  // =========================================================================
  // 8. Co-Pilot — Full Underwriting Automation
  // =========================================================================
  {
    id: "copilot",
    name: "Co-Pilot",
    tagline: "Full underwriting automation platform with AI-powered decisions",
    description:
      "HyperVerge Co-Pilot is the full underwriting automation platform that ties all individual products together into a single AI-powered decisioning engine. Instead of using BSA, Clear, Application PDF, and Fraud Detection as separate tools, Co-Pilot orchestrates the entire underwriting workflow — from application intake to funding decision — reducing 40 minutes per deal to under 5.\n\nCo-Pilot doesn't replace underwriters — it transforms them from data entry clerks into decision reviewers. The AI handles extraction, analysis, risk scoring, and compliance checks, then presents a structured recommendation for the human underwriter to approve, modify, or decline. This multiplies underwriter capacity by 5-8x.\n\nFor funders doing 50+ deals/day, Co-Pilot is the difference between scaling by hiring more underwriters (expensive, slow) and scaling by multiplying the capacity of your existing team (immediate, cost-effective).",
    keyFeatures: [
      "End-to-end underwriting workflow automation",
      "Orchestrates BSA + Clear + Application PDF + Fraud Detection",
      "AI-powered funding recommendations with confidence scores",
      "Human-in-the-loop review and override",
      "Customizable decisioning rules and risk appetite",
      "Full audit trail for compliance",
      "LOS/CRM integration for seamless pipeline",
      "Real-time analytics on approval rates, time-to-decision",
    ],
    useCases: [
      { persona: "VP Operations", scenario: "Scale from 50 to 200+ deals/day without hiring — Co-Pilot multiplies underwriter capacity 5-8x" },
      { persona: "Underwriter", scenario: "Review AI-prepared decisions instead of doing manual data entry — focus on edge cases that need human judgment" },
      { persona: "CEO/Owner", scenario: "Compete on speed with larger funders — close deals in 2 hours instead of 4, winning more ISO deal flow" },
      { persona: "CTO", scenario: "Single API integration replaces 4-5 separate vendor integrations for a unified underwriting pipeline" },
    ],
    metrics: [
      { value: "40 min to 5 min", label: "Decision time reduction" },
      { value: "5-8x", label: "Underwriter throughput" },
      { value: "450+", label: "Enterprise customers" },
      { value: "10-20x", label: "First month ROI" },
    ],
    demoVideos: [
      {
        title: "HyperVerge Builder Demo",
        type: "youtube",
        url: "https://www.youtube.com/watch?v=fLbtk4uty-s",
        embedUrl: "https://www.youtube.com/embed/fLbtk4uty-s",
      },
    ],
    notionPages: [...SHARED_NOTION_PAGES],
    collateral: [
      { title: "Kapitus BRDs", type: "brds", url: "https://drive.google.com/drive/folders/1iMhcS9BlryPqsUT1ZvWpqPb4g6qmgKfa" },
      { title: "Kapitus Problem Discovery", type: "case-study", url: "https://drive.google.com/file/d/1WsRK8_SDde_nRHhJRUVI0I2M-oGdNZ85/view" },
      ...SHARED_COLLATERAL,
    ],
    valueProps: [
      { from: "Scaling = hiring more underwriters", to: "AI Co-Pilot multiplies capacity", impact: "5-8x throughput" },
      { from: "40 minutes per underwriting decision", to: "Under 5 minutes with AI", impact: "87% time reduction" },
      { from: "Multiple vendor integrations", to: "Single Co-Pilot platform", impact: "One integration" },
    ],
    objections: SHARED_OBJECTIONS,
    competitorsReplaced: [],
    talkingPoints: [
      "Full underwriting automation: 40 minutes per decision down to under 5. Underwriters become reviewers, not data entry clerks — 5-8x throughput increase",
      "Co-Pilot orchestrates BSA, Clear, Application PDF, and Fraud Detection into a single decisioning engine — one integration, not four",
      "Per application pricing with 10-20x ROI in the first month for funders doing 50+ deals/day",
      "Human-in-the-loop always — the AI recommends, the underwriter decides. No black-box auto-declines.",
    ],
    painPoints: [
      "Seeking full underwriting automation",
      "Wants straight-through processing",
      "Underwriter capacity is a constraint",
      "Scaling operations without proportional hiring",
    ],
    categoryAffinity: {
      funder: 65,
      iso: 30,
      marketplace: 40,
      bank: 60,
      technology: 20,
      competitor: 5,
      service_provider: 10,
    },
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const PRODUCT_DOC_BY_ID: Record<string, ProductDoc> = {};
for (const doc of PRODUCT_DOCS) {
  PRODUCT_DOC_BY_ID[doc.id] = doc;
}

export function getProductDocById(id: string): ProductDoc | undefined {
  return PRODUCT_DOC_BY_ID[id];
}
