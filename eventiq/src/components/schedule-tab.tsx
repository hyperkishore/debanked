"use client";

import { useState } from "react";
import { CompanyType } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  MessageCircle,
  Newspaper,
  User,
  Target,
  Zap,
  Link2,
  AlertTriangle,
  Bookmark,
} from "lucide-react";

interface ScheduleTabProps {
  onJumpToCompany: (name: string) => void;
}

interface Attendee {
  name: string;
  title: string;
  company: string;
  companyType?: CompanyType;
  companyLookup?: string;
  bg: string;
  hooks: string[];
  talkingPoints: string[];
  recentNews: string[];
  icebreakers: string[];
  hvAngle?: { priority: string; title: string; pitch: string; painPoint?: string };
  note?: string;
  li?: string;
  isInternal?: boolean;
}

interface ConversationTopic {
  title: string;
  why: string;
  players: string;
  starter: string;
  context: string[];
}

// ─── CONVERSATION TOPICS ────────────────────────────────────────────────────

const conversationTopics: ConversationTopic[] = [
  {
    title: "Yellowstone Capital Fallout & MCA Regulation",
    why: "NY AG secured $1.065B judgment — largest consumer protection settlement in state history. $534M in balances cancelled, Yellowstone banned from MCA permanently.",
    players: "Adam Madar (former Yellowstone advisor), Jay Avigdor, Nabil Aziz, Herk Christie, Gerard Lucero (all face heightened scrutiny), David Tilis (built compliance at Cross River/FinWise)",
    starter: "With Yellowstone's billion-dollar judgment, are we going to see a wave of AG investigations into other funders, or was Yellowstone a one-off?",
    context: [
      "NY FAIR Business Practices Act now allows AG to scrutinize MCA collection tactics under consumer-level standards",
      "~12 states now have dedicated MCA regulation on the books",
      "CA SB 1235 and NY CFDL mandate pre-funding APR-equivalent disclosures",
      "Texas HB 700 (Apr 2025) would regulate auto-debiting from business accounts",
      "Federal judge upheld CFPB small business lending data collection rule — MCAs should be regulated as credit transactions",
    ],
  },
  {
    title: "AI Underwriting — Hype vs. Reality",
    why: "Multiple people at the table are building or buying AI underwriting — but regulatory walls are closing in fast.",
    players: "Jay Avigdor (93% accuracy claim), Aakanksha Jadhav (GenAI at Mastercard Foundry), Aman Mahajan (Biz2X AI Agent: 30-40% faster), Kos Joshi (LenderAI: 1,200+ apps/day), Rohan Sriram (Plaid LendScore)",
    starter: "Jay, you've claimed 93% accuracy on default prediction. Aakanksha, you're building GenAI models at Mastercard. With Massachusetts just settling a disparate impact case against AI underwriting — how do you prove your models don't discriminate?",
    context: [
      "MA AG settled fair lending action (Jul 2025) — AI underwriting model created disparate impact based on race and immigration status",
      "Colorado SB 24-205 (effective Feb 1, 2026) requires lenders to disclose how AI decisions are made",
      "EU AI Act high-risk provisions for credit scoring take effect Aug 2026",
      "CFPB requires specific adverse action reasons — 'the AI said no' is not legally sufficient",
    ],
  },
  {
    title: "MCA Stacking & Document Fraud Epidemic",
    why: "Business identity theft up 30% YoY (FTC 2024). Fraudsters buy bank statement templates for $10 and customize with GenAI to create synthetic documents.",
    players: "Brian Mullins (SYNQ API fraud challenge), Nabil Aziz (Head of Risk — his job), Adam Madar (UW catches fakes daily), Gerard Lucero (revenue verification), Rohan Sriram (Plaid anti-fraud tools)",
    starter: "How many of you have caught AI-generated fake bank statements in the last 6 months? Rohan, Plaid launched anti-fraud tools for income verification — is that solving the problem or just the beginning?",
    context: [
      "Businesses take multiple MCAs simultaneously ('stacking'), hiding positions from new funders — single biggest loss driver",
      "GenAI-generated synthetic financial documents bypass traditional document checks",
      "Plaid invested heavily in anti-fraud for income verification after study showed 50%+ of lenders experienced document fraud",
    ],
  },
  {
    title: "CFPB Section 1071 — Data Collection Reshaping Industry",
    why: "New compliance deadlines: Jul 2026 (2,500+ txns), Jan 2027 (500+), Oct 2027 (100+). CFPB proposed raising threshold from 100 to 1,000 originations.",
    players: "Herk Christie (ECG $1B+ = high-volume), Aman Mahajan (Biz2Credit $8B+ clearly in scope), Kos Joshi (SBA lending covered), David Tilis (built compliance at Cross River/FinWise)",
    starter: "CFPB just proposed raising the 1071 threshold from 100 to 1,000 originations. Herk, does ECG even need to worry about this now? David, you built compliance at Cross River — what does implementation actually look like?",
    context: [
      "Federal judge upheld that MCAs should be regulated as credit transactions under this rule",
      "CFPB proposed revisions (Nov 2025) to raise coverage threshold and push to single Jan 2028 compliance date",
      "Is this a reprieve for MCA funders, or just delaying the inevitable?",
    ],
  },
  {
    title: "Embedded Finance & the Battle for SMB Distribution",
    why: "Instead of brokers sending deals, funding is embedded directly into platforms merchants already use (ERPs, payment processors, marketplaces).",
    players: "Angel Murudumbay (Raistone $10B+ embedded), Aakanksha Jadhav (Mastercard embedded SME products), Kos Joshi (built Goldman-Amazon lending), David Tilis (30+ fintech partnerships at FinWise), Brian Mullins (SYNQ API for embedded deal submission)",
    starter: "Angel, Raistone crossed $10B in embedded financing. Kos, you built the Amazon-Goldman lending program. Is the broker model dying, or does embedded finance just add another distribution layer?",
    context: [
      "Raistone partnered with SAP, NetSuite, Coupa, Mastercard to embed financing into ERP workflows",
      "Goldman-Amazon: lines of credit up to $1M for Amazon merchants",
      "Vox SYNQ + Cloudsquare Salesforce integration = embedded deal submission",
      "Mastercard Agent Suite (Jan 2026) = agentic AI for embedded enterprise services",
    ],
  },
];

// ─── CONNECTIONS MAP ────────────────────────────────────────────────────────

const connections = [
  { type: "Alumni", label: "Goldman Sachs Alumni", people: "Kos Joshi + Aman Mahajan", detail: "Kos was Head of Product for Embedded Business Financing (built Amazon partnership). Aman was in risk at Goldman. They almost certainly know each other." },
  { type: "Alumni", label: "Citibank Alumni", people: "Herk Christie + Aman Mahajan", detail: "Both worked at Citibank. Herk went to Capital One then ECG. Aman went to Goldman then Biz2Credit." },
  { type: "Partner", label: "Mastercard-Raistone Partnership", people: "Aakanksha Jadhav + Angel Murudumbay", detail: "Formal partnership since 2022 on virtual card payments for SMBs. Finovate Award finalists together. May have directly interacted." },
  { type: "Sensitive", label: "Yellowstone Capital", people: "Adam Madar (former Funding Advisor)", detail: "Adam worked at Yellowstone 2014-2016, before the problematic period. $1B judgment is fresh. Let him bring it up first." },
  { type: "Compete", label: "MCA Funders (Compete)", people: "Vox, Velocity, ECG, Smarter Merchant, Aspire", detail: "5 direct MCA funders competing for the same merchant deals through ISOs/brokers." },
  { type: "Vendor", label: "Plaid → All Funders", people: "Rohan Sriram → Vox, Velocity, ECG, Smarter Merchant, Aspire, Fundfi", detail: "All MCA funders need bank account connectivity for underwriting. Plaid API widely used for real-time cash flow analysis." },
  { type: "Vendor", label: "Mastercard → All", people: "Aakanksha Jadhav → Every funder", detail: "Mastercard's SME credit risk models, transaction data, and AI products relevant to every funder at the table." },
];

const connectionColors: Record<string, string> = {
  Alumni: "text-brand border-brand/30",
  Partner: "text-[var(--icp)] border-[var(--icp)]/30",
  Sensitive: "text-[var(--sqo)] border-[var(--sqo)]/30",
  Compete: "text-[var(--client)] border-[var(--client)]/30",
  Vendor: "text-[var(--tam)] border-[var(--tam)]/30",
};

// ─── QUICK REFERENCE ────────────────────────────────────────────────────────

const seatingTargets = [
  { name: "Kos Joshi", reason: "Highest partnership potential. LenderAI processes 1,200+ apps/day. Enterprise buyer." },
  { name: "Herk Christie", reason: "Large funder ($1.2B+), tech-enabled, enterprise procurement mindset from Capital One/Citi." },
  { name: "Brian Mullins", reason: "CTO, API thinker, just built SYNQ. Most likely to understand and champion a technical integration." },
];

const doLeadWith = [
  "Document fraud detection (every funder has been burned by fake bank statements)",
  "Speed-to-decision (MCA is a speed game — whoever funds first gets the deal)",
  "API integration (this audience builds and buys tech; they want plug-and-play)",
  "Audit trail / defensibility (post-Yellowstone, everyone thinking about AG investigations)",
];

const dontLeadWith = [
  "Generic identity verification pitch (everyone thinks they've solved KYC)",
  "Compliance scare tactics (regulators are the enemy at this table, not the motivation)",
  "India-centric examples (this is a US MCA audience; use US-relevant use cases)",
];

const keyStats = [
  "We've verified over a billion identities globally",
  "Under 5 seconds per document, 80%+ straight-through processing",
  "Bank statement fraud up 30% YoY — we detect tampered docs that look perfect to human reviewers",
  "We work with lenders across 195 countries",
];

// ─── ATTENDEE DATA ──────────────────────────────────────────────────────────

const attendees: Attendee[] = [
  {
    name: "Brian Mullins",
    title: "CTO — Head of Technology, Data & Marketing",
    company: "Vox Funding",
    companyType: "ICP",
    companyLookup: "Vox Funding",
    bg: "20+ yr tech career. UPenn grad. Built SYNQ API at Vox from scratch — real-time broker deal submissions + automated workflow. Previously Global CIO/CTO at Apex 1 Group, co-founded SBF Finance & Technology (CTO/CMO), founded Digsites LLC (Philly web/software firm, 2005). Early Stage Tech Advisor at Fruitful Labs ($33M fintech startup). Joined Vox in Aug 2018 as triple-hat CTO overseeing tech + data + marketing.",
    hooks: [
      "* SYNQ API just integrated with Cloudsquare's Salesforce platform (Jan 2026) — real-time broker submissions + end-to-end funding visibility",
      "Founded Digsites LLC in 2005 — Philadelphia web/software dev firm in health, education, finance",
      "Triple-hat CTO (tech + data + marketing) — owns full acquisition-to-underwriting data pipeline",
      "UPenn grad with early career at Advanta financial services",
    ],
    talkingPoints: [
      "SYNQ API architecture — how real-time deal submission data informs instant decisioning",
      "As tech + marketing owner, unique insight into data flow from lead gen through underwriting",
      "Vox funded $750M+ with tech-first approach — practitioner view on API-driven alt lending scale",
    ],
    recentNews: [
      "May 2025: Vox secured $150M credit facility from Raven Capital",
      "Jan 2026: SYNQ API integrated with Cloudsquare Salesforce-native CRM for automated broker workflows",
    ],
    icebreakers: [
      "Brian, the SYNQ + Cloudsquare partnership just launched. How are ISOs responding to API-driven deal submission vs. the traditional email-and-PDF workflow?",
      "As CTO, how do you think about the build-vs-buy decision for fraud detection on incoming applications?",
      "You've been in fintech since the late '90s — what's the biggest technology shift you've seen in MCA over the past 5 years?",
    ],
    hvAngle: {
      priority: "HIGH",
      title: "API-native integration with SYNQ",
      pitch: "Brian, with SYNQ you've built the deal submission pipeline. The next bottleneck is what happens after submission — bank statement analysis, document verification, identity checks. HyperVerge's APIs can plug directly into SYNQ to automate the intake-to-decision pipeline. Under 5 seconds per document, 80%+ straight-through processing.",
      painPoint: "Vox receives applications via SYNQ but still needs manual review of bank statements and documents. HyperVerge eliminates that step.",
    },
    li: "https://www.linkedin.com/in/digsites",
  },
  {
    name: "Herk Christie",
    title: "Chief Operating Officer",
    company: "Expansion Capital Group",
    companyType: "TAM",
    companyLookup: "Expansion Capital Group",
    bg: "Operations exec with roots in consumer finance at Citibank, Capital One, and Resurgent Capital Services (debt purchasing/servicing). Joined ECG Mar 2016 on ops team, promoted to VP Ops, named COO Jun 2019. Oversees underwriting, IT, analytics, merchant support. Champion of cash-flow-first underwriting — presented with Ocrolus on prioritizing bank statement analysis over credit scores. ECG: Sioux Falls, SD-based specialty lender, $1B+ funded to 35K+ SMBs, secured $100M credit facility Jan 2025.",
    hooks: [
      "* Presented with Ocrolus on 'cash-flow-first underwriting' — ECG puts bank statement analysis BEFORE credit scores, a contrarian approach",
      "Citibank \u2192 Capital One \u2192 Resurgent Capital \u2192 ECG — has seen full credit lifecycle from origination to debt servicing",
      "ECG decisions 90% of submitted leads in under 45 mins with 80%+ contracts-signed-to-close ratio",
      "Building fintech talent in Sioux Falls, SD — 'putting Sioux Falls on the map for financial technology'",
    ],
    talkingPoints: [
      "Cash-flow-first methodology — how ECG weighs bank statement signals (NSFs, overdrafts, debt capacity) vs FICO",
      "$1B+ funded, 35K+ merchants = massive operational data — what separates good vs bad UW models at scale",
      "Bridges IT/analytics with underwriting — directly relevant to automated UW infrastructure",
    ],
    recentNews: [
      "Jan 2025: ECG secured $100M credit facility to accelerate growth",
      "Apr 2025: Tim Mages (ex-CFO/CSO) appointed CEO; Herk continues as COO",
      "Aug 2025: Inc. 5000 list (#4076) for fourth consecutive year",
    ],
    icebreakers: [
      "Herk, ECG crossed $1B in funding and then secured a $100M credit facility. What's the growth strategy — more volume, new products, or geographic expansion?",
      "You came from Capital One and Citi — how does risk management at a specialty lender compare to what you did at the big banks?",
      "ECG decisions 90% of leads in under 45 minutes. How much of that speed comes from data/analytics vs. process design?",
    ],
    hvAngle: {
      priority: "HIGH",
      title: "Scale 45-min decisions to under 10 min",
      pitch: "Herk, ECG's 45-minute turnaround is industry-leading, but imagine if the bank statement analysis and document verification happened in 5 seconds instead of 20 minutes. HyperVerge's bank statement analysis API can parse, reconcile, and flag anomalies — even from scanned PDFs — and feed structured data directly into your decisioning engine.",
      painPoint: "ECG's speed comes from process, not fully from automation. HyperVerge can be the automation layer. Herk comes from Capital One and Citi, where vendor procurement is structured — he understands enterprise integration pitches.",
    },
    li: "https://www.linkedin.com/in/herk-christie-913939",
  },
  {
    name: "Rohan Sriram",
    title: "Product Lead — Credit & Income",
    company: "Plaid",
    bg: "Product Lead at Plaid for Credit & Income products. Background spans PM, operations, risk, data science. Led evaluation + deployment of Inscribe's document fraud detection for income verification (found potential to automate 50%+ of doc review). Co-authored Plaid blog posts on ML-powered income verification, AI transaction categorization, anti-fraud. Writes Medium articles on payments value chains, lending mechanics, Plaid strategy. Plaid: $6.1B valuation (Apr 2025), 12K+ financial institutions.",
    hooks: [
      "* Owns Plaid income/credit products that serve alt lenders — team built ML models with 95% salary stream detection accuracy + 30+ document fraud signals",
      "* Led Inscribe integration for doc fraud detection — potential to automate 50%+ of applicant doc review",
      "Authored Medium analysis of Plaid's value chain after failed $5.3B Visa acquisition — deep strategic thinker",
      "Writes publicly about 'The Lending Triangle' — rare product leader who publishes his frameworks",
    ],
    talkingPoints: [
      "Plaid's bank income product could replace manual bank statement review in MCA underwriting",
      "LendScore (Oct 2025) — cash-flow-based credit score with 25% predictive lift over traditional scores, directly relevant to MCA",
      "30+ fraud signals for document manipulation — addresses major pain point in MCA UW (fake bank statements/paystubs)",
    ],
    recentNews: [
      "Oct 2025: Plaid launched LendScore — cash-flow credit risk score with 25% lift over traditional scores",
      "Apr 2025: Plaid raised $575M at $6.1B valuation (Franklin Templeton led)",
      "Fall 2025: Trust Index 2 fraud model + expanded income verification suite",
    ],
    icebreakers: [
      "Rohan, LendScore takes a cash-flow-first approach. How does that compare to what traditional MCA funders are doing with bank statement analysis?",
      "The Plaid-Experian partnership landed in 2025. How are lenders in the alternative space reacting — is cash-flow scoring replacing FICO, or supplementing it?",
      "You've seen fraud from the data layer. How sophisticated are the fake bank statements you're catching now vs. 2 years ago?",
    ],
    hvAngle: {
      priority: "PARTNERSHIP",
      title: "Complementary — Plaid does connectivity, HyperVerge does document intelligence",
      pitch: "Rohan, Plaid is the gold standard for account connectivity, but a huge chunk of MCA underwriting still runs on uploaded bank statement PDFs and scanned documents. HyperVerge handles the document layer — fraud detection on uploaded statements, OCR from messy scans, tampering detection. We're complementary: Plaid for live data, HyperVerge for document verification.",
      painPoint: "Explore partnership where Plaid recommends HyperVerge for document-based workflows, or co-sell into the same funders.",
    },
    li: "https://www.linkedin.com/in/rohansriram",
  },
  {
    name: "Akhilesh",
    title: "",
    company: "HyperVerge",
    isInternal: true,
    bg: "HyperVerge team.",
    hooks: [],
    talkingPoints: [],
    recentNews: [],
    icebreakers: [],
  },
  {
    name: "Nabil Aziz",
    title: "Head of Risk & Underwriting",
    company: "The Smarter Merchant",
    companyType: "TAM",
    companyLookup: "The Smarter Merchant",
    bg: "Fintech & commercial lending professional. Loughborough University (UK) — BA Accounting & Finance. 13+ years UW experience spanning government mortgage underwriting and MCA/alternative finance. Skills in credit & risk analysis, real estate valuation, financial analysis, market research. Has conducted 1,000+ real estate closings. The Smarter Merchant: NYC-based direct MCA funder (est. 2013), ISO-only model, ~20 employees, tech-driven UW evaluating real-time bank data + future sales.",
    hooks: [
      "* Loughborough University (UK) grad — unusual pedigree for NYC MCA, ask about UK-to-US alt lending transition",
      "13+ years underwriting across mortgage and MCA — rich perspective on how risk frameworks differ between regulated mortgage and unregulated MCA",
      "The Smarter Merchant: 'no backdoor practices, no sales floor' — how he enforces UW ethics in high-volume ISO model",
      "His ISO-only model means he evaluates risk without ever speaking to the merchant — pure data-driven UW",
    ],
    talkingPoints: [
      "Tech-driven UW (real-time bank data + future sales modeling) aligns with industry shift toward automated decisioning",
      "ISO-only model = evaluating risk without merchant contact — interesting lens on data-driven vs relationship-based UW",
      "Loughborough's quantitative finance program may inform more analytical, European-style approach to risk modeling",
    ],
    recentNews: [
      "Broader MCA industry in NY faces heightened regulatory scrutiny following Yellowstone Capital settlement in 2025",
      "The Smarter Merchant rated 4/5 stars in United Capital Source 2026 review — noted for strong ISO partner benefits + fast tech-driven approvals",
    ],
    icebreakers: [
      "Nabil, as head of risk, what's the #1 fraud pattern you're seeing in applications right now — stacking, synthetic IDs, or doctored bank statements?",
      "How does Smarter Merchant think about the balance between speed-to-fund and thorough underwriting?",
      "With AI-generated documents getting better, has your team had to completely rethink how you verify bank statements?",
    ],
    hvAngle: {
      priority: "HIGH",
      title: "AI-powered fraud detection for the risk team",
      pitch: "Nabil, you're seeing AI-generated fake bank statements that are getting harder to catch. HyperVerge's document fraud detection was built for exactly this — we detect tampered documents, check for inconsistent fonts, mismatched formatting, manipulated transaction histories. We've verified over a billion identities. Can we show you what we catch that manual review misses?",
      painPoint: "Fraudsters buy bank statement templates for $10 and customize with GenAI. Nabil's team is fighting an asymmetric war — HyperVerge levels the playing field.",
    },
    li: "https://www.linkedin.com/in/nabilaziz/",
  },
  {
    name: "Jay Avigdor",
    title: "President & CEO",
    company: "Velocity Capital Group",
    companyType: "ICP",
    companyLookup: "Velocity Capital Group",
    bg: "Started Velocity Feb 2018 from home with $50K savings at age 26. Touro University (finance/general studies) — started college at 16, graduated early. Spent ~5 years at Pearl Capital before founding VCG. Cold-called from yellow pages, closed $250K MCA deal with CA auto dealer. Grew 1 to 18 employees in under a year. $850M+ career sales, 15K+ clients, 40K+ broker relationships. $50M Arena Investors facility. Donates 10% of net proceeds per file to charity. Active TikTok (@jay_avigdor).",
    hooks: [
      "* 'From Broke to Boss' podcast (Cobalt Intelligence) — $17 in pocket to $850M+ career sales; 'Need It Don't Want It' philosophy drives deal selection",
      "* Claims 93% default prediction accuracy using AI + granular demographic data — far beyond traditional credit scoring",
      "First MCA funder to offer broker commissions via crypto (USDC/DAI, Aug 2021) — industry pioneer",
      "Active TikTok + frequent speaker: Broker Fair 2024, B2B Finance Expo 2025, multiple deBanked TV appearances",
    ],
    talkingPoints: [
      "93% default prediction via AI is bold benchmark — what data inputs drive it? How does it compare to traditional UW?",
      "Dragin software automates deal processing from application to CRM in minutes — case study in tech-enabled UW speed",
      "Pro-regulation stance — believes regulation legitimizes MCA industry and weeds out bad actors (unusual for MCA CEO)",
    ],
    recentNews: [
      "Aug 2024: Jesse Guzman hired as CRO (ex-Nexi) — aggressive growth push",
      "2025: Spoke at B2B Finance Expo, published 'AI and Finance' expert article on TMCnet",
      "Active social media presence sharing company culture and origin story",
    ],
    icebreakers: [
      "Jay, you've talked about your AI achieving 93% default accuracy. What data signals are driving that — is it mostly deposit patterns, or are you using alternative data like demographics?",
      "You started Velocity from your house in 2018 and built it to $850M in sales. What did the first year look like vs. now?",
      "With Colorado's AI disclosure law just taking effect in February 2026, does your AI underwriting model need to change how it explains decisions?",
    ],
    hvAngle: {
      priority: "MEDIUM-HIGH",
      title: "Feed clean, verified data into his AI model",
      pitch: "Jay, your AI is predicting defaults at 93% accuracy, but that model is only as good as the data going in. If a fraudulent bank statement gets past intake and into your training data, it corrupts the model. HyperVerge sits at the front of the pipeline — we verify that bank statements are authentic before your AI ever sees them. Clean data in, better predictions out.",
      painPoint: "Garbage in, garbage out. His 93% accuracy claim becomes meaningless if synthetic documents poison his training data.",
    },
    li: "https://www.linkedin.com/in/jay-avigdor-4b035247/",
  },
  {
    name: "TBD",
    title: "VP Risk Management",
    company: "Velocity Capital Group",
    companyType: "ICP",
    companyLookup: "Velocity Capital Group",
    bg: "Velocity has no Chief Risk Officer title. Risk function led by two VPs: David Slepoy (ex-EY, ex-RSM US, since 2019) and Michael Signoretti. Likely one of them attending.",
    hooks: [
      "Ask Jay to introduce — likely David Slepoy (EY/RSM audit background) or Michael Signoretti",
      "How do VPs of Risk work with Jay's AI-driven 93% default prediction model?",
    ],
    talkingPoints: [
      "Risk governance at a fast-growing MCA funder — how do they validate AI-driven credit decisions?",
      "EY/RSM audit background (if David Slepoy) — institutional risk perspective in alternative lending",
    ],
    recentNews: [],
    icebreakers: [],
  },
  {
    name: "Gerard Lucero",
    title: "Senior Underwriter",
    company: "Fundfi",
    companyType: "Client",
    companyLookup: "Fundfi",
    bg: "Senior UW at Fundfi Merchant Funding. Career progression through alt finance: started at Liquid Capital as Factor Support Admin, advanced to UW Assistant then Underwriter. Moved to FundThrough as UW on invoice financing platform. Proficient in Excel, Adobe Pro, CT Lien UCC services. Fundfi: Revenue-based financing (US + Canada), founded 2020, expanded credit facility twice in 2025, launched 2 new products Dec 2025, opened Alabama office.",
    hooks: [
      "* Career arc from factoring (Liquid Capital) \u2192 invoice financing (FundThrough) \u2192 MCA/RBF (Fundfi) — ask how UW frameworks differ across these three product types",
      "Fundfi expanded credit facility TWICE in 2025 + launched 2 new products — underwriting in hyper-growth",
      "UCC lien expertise (CT Lien services) — deep secured transaction mechanics knowledge",
      "Fundfi's new credit splits program — how does he underwrite split-payment structures tied to card processing revenues?",
    ],
    talkingPoints: [
      "Comparative UW across factoring vs invoice finance vs MCAs — rare cross-product perspective",
      "Fundfi's rapid 2025 growth means scaling UW processes — maintaining quality at speed",
      "Revenue-based repayment (pay more in strong months, less in slow) creates unique UW challenges vs fixed-payment MCAs",
    ],
    recentNews: [
      "Apr + Sep 2025: Fundfi expanded credit facility twice",
      "Dec 2025: Launched traditional loan product + credit splits program; opened Alabama office",
    ],
    icebreakers: [
      "Gerard, you've done factoring at Liquid Capital, invoice financing at FundThrough, and now revenue-based at Fundfi. How does underwriting differ across those three models?",
      "Fundfi expanded its credit facility recently. Is the growth coming from new merchant verticals or deeper penetration in existing ones?",
      "As an underwriter, what's the first thing you look at when a merchant application comes in — bank statements, processing volume, or something else?",
    ],
    hvAngle: {
      priority: "MEDIUM",
      title: "Revenue verification for revenue-based financing",
      pitch: "Gerard, revenue-based financing is directly tied to how accurately you can verify a merchant's actual revenue. HyperVerge can extract revenue trends from bank statements, invoices, and sales reports — and flag inconsistencies that suggest inflation or fabrication. We also auto-classify industries from transaction patterns, which feeds into your risk pricing.",
      painPoint: "Bad revenue data means the repayment schedule is wrong from day one.",
    },
    li: "https://www.linkedin.com/in/gerard-lucero-49227b87",
  },
  {
    name: "Angel Murudumbay",
    title: "Vice President, Operations",
    company: "Raistone",
    companyType: "TAM",
    companyLookup: "Raistone",
    bg: "Financial operations leader with 15+ years experience. Rose through Raistone from Associate to AVP to VP Operations. Prior: Trade Ops Associate at State Street, Account Manager (Finance) at TIAA Bank, third-party risk vendor management at Valley, Global Account Manager Operations at HP Enterprise. New Jersey City University (BS Finance). CRITICAL: Raistone shut down Jan 2026 after largest client First Brands collapsed in fraud scandal ('The $9 Billion Lie'). Angel likely in career transition. Handle sensitively but the experience is incredibly valuable.",
    hooks: [
      "* Lived through Raistone's rise ($10B+ financing, awards) and collapse (Jan 2026) — an extraordinary fintech story. Handle sensitively but he has rare lessons on client concentration risk",
      "* Raistone was a Mastercard partner (virtual cards for SMBs) — Aakanksha Jadhav at this table may know him professionally",
      "State Street trade ops \u2192 fintech VP — what drove shift from traditional finance to embedded finance?",
      "Raistone Connect API integrated with ERPs, treasury, B2B payments — deep knowledge of system-agnostic embedded finance operations",
    ],
    talkingPoints: [
      "Client concentration risk — Raistone had 80% revenue from First Brands. THE cautionary tale for every fintech at this table",
      "Embedded finance model (ERP, treasury, B2B ecommerce) was genuinely innovative — did the model fail or just the execution?",
      "Supply chain finance vs MCA — Angel comes from a different corner of alt finance than most at this table",
    ],
    recentNews: [
      "Jan 2026: Raistone shut down after failing to find a buyer; preparing Chapter 7 bankruptcy. Largest client First Brands collapsed in $9B fraud",
      "Oct 2025: Raistone cut staff from 105 to 31 after First Brands collapse. Potential buyer Marblegate backed out Jan 2026",
      "2025 (earlier): Named 'Best Overall FinTech' at FinTech Breakthrough Awards before collapse",
    ],
    icebreakers: [
      "Angel, Raistone crossed $10B in 5 years with a purely embedded model. What does operations look like at that scale — are you mostly managing tech integrations or capital deployment?",
      "The Mastercard partnership enables virtual card payments for accelerating working capital. How has adoption been with SMBs?",
      "You came up through State Street and TIAA Bank. How does running operations at a fintech compare to traditional financial services?",
    ],
    hvAngle: {
      priority: "MEDIUM",
      title: "KYB for embedded finance onboarding",
      pitch: "Angel, when Raistone embeds financing into SAP or NetSuite, every business going through that pipeline needs identity verification and business verification. HyperVerge handles KYB — company record verification, document extraction, identity checks — all via API that can be embedded directly into the onboarding flow.",
      painPoint: "Embedded finance means high volume, low touch. Manual verification doesn't scale. HyperVerge's API-first approach fits the embedded model.",
    },
    li: "https://www.linkedin.com/in/angel-murudumbay-3433a616/",
  },
  {
    name: "Kaustubh 'Kos' Joshi",
    title: "Chief Business Officer",
    company: "iBusiness Funding",
    companyType: "TAM",
    companyLookup: "iBusiness Funding",
    bg: "15+ yr financial services. At Goldman Sachs: Head of Product for Embedded Business Financing — launched + scaled embedded SMB financing including the Amazon lending partnership. Joined Funding Circle US (Nov 2023) as Head of Embedded Finance & Partnerships. Transitioned to iBusiness Funding as CBO after iBusiness acquired Funding Circle USA for $41.8M in 2024. UC Berkeley Haas educated. iBusiness: division of Ready Capital (NYSE: RC), top-1% SBA 7(a) lender, LenderAI processes 1,200+ daily apps, $7B+ SBA loans.",
    hooks: [
      "* Goldman Sachs embedded SMB financing architect — built the Amazon lending partnership from scratch",
      "* Lived through Funding Circle USA acquisition by iBusiness/Ready Capital — rare firsthand fintech M&A perspective",
      "LenderAI scaling from SBA to bridge lending to franchise financing (Benetrends, BLC, SBA WORX in 2025-2026)",
      "Berkeley Haas + Goldman + fintech — embedded lending from both bank and fintech side",
    ],
    talkingPoints: [
      "LenderAI = underwriting tech play — automating loan origination + credit decisioning at massive scale (1,200 apps/day)",
      "Goldman embedded finance background (Amazon partnership) connects to non-financial platforms offering lending",
      "Funding Circle USA acquisition + SBLC license dynamics = live case study in SBA lending consolidation",
    ],
    recentNews: [
      "Feb 2026: Partnered with Benetrends Financial for franchise financing via LenderAI",
      "Sep 2025: SBA WORX selected LenderAI for LSP business; Business Loan Capital chose LenderAI for bridge lending",
    ],
    icebreakers: [
      "Kos, you built the Goldman-Amazon lending program. What was the biggest lesson about embedded distribution that you're applying at iBusiness now?",
      "LenderAI just signed SBA WORX and Business Loan Capital. What's the pitch to lenders who are still using legacy loan origination systems?",
      "Goldman to Funding Circle to iBusiness — each one a different model. What do they all have in common about what makes SMB lending work?",
    ],
    hvAngle: {
      priority: "HIGH",
      title: "Document intelligence layer inside LenderAI",
      pitch: "Kos, LenderAI handles 1,200 applications a day. Every one of those comes with bank statements, tax returns, corporate documents. HyperVerge can be the document intelligence layer inside LenderAI — extracting, verifying, and flagging in under 5 seconds per document. We do 80%+ straight-through processing, meaning your human underwriters only see the exceptions.",
      painPoint: "At 1,200 apps/day, even a small percentage of manual document review creates a bottleneck. SBA loans have heavy documentation requirements — HyperVerge automates that. Kos comes from Goldman and understands enterprise platform deals.",
    },
    li: "https://www.linkedin.com/in/kaustubhmjoshi/",
  },
  {
    name: "Aman Mahajan",
    title: "Chief Risk Officer (CRO)",
    company: "Biz2Credit",
    companyType: "ICP",
    companyLookup: "Biz2Credit",
    bg: "Chartered Accountant (ICAI, India) + FRM (Financial Risk Manager) credential. Career through Citibank and Goldman Sachs before joining Biz2Credit as CRO. Oversees credit risk for platform that has facilitated $8B+ in SMB lending. NOTE: LinkedIn shows him as current CRO \u2014 'ex-CRO' designation may be premature. Biz2Credit: est. 2007, $8B+ SMB financing, Biz2X SaaS ($100M+ ARR), IPO planned early 2027, Deloitte Fast 500 (203% growth).",
    hooks: [
      "* Goldman Sachs + Citibank risk background in fintech lending — how do traditional bank risk frameworks translate (or break) in alt lending?",
      "* Biz2Credit's IPO path (early 2027, $15-20B valuation) — as CRO, what risk infrastructure needs to be institutional-grade for public markets?",
      "Biz2X AI-powered underwriting agent claims 30-40% reduction in loan approval time — how does the CRO validate AI-driven credit decisions?",
      "Chartered Accountant + FRM dual credential — Indian financial system perspective applied to American SMB lending",
    ],
    talkingPoints: [
      "At the intersection of AI-driven UW and institutional risk governance — the exact tension defining modern lending tech",
      "Biz2X powers UW for banks like HSBC — risk oversight spans both direct lending ($8B+) and SaaS platform enabling other lenders",
      "Biz2Credit's PPP experience (#1 fintech PPP lender) and FTC $33M settlement — cautionary tale on scaling lending ops too fast",
    ],
    recentNews: [
      "2025: Biz2Credit named to Deloitte Technology Fast 500 (203% growth, 7th consecutive year)",
      "2025: Biz2X launched AI-Powered Underwriting Agent + AI CRM — 30-40% reduction in loan approval time",
    ],
    icebreakers: [
      "Aman, the Biz2X AI Underwriting Agent claims 30-40% faster approvals. What were the hardest parts to automate — document ingestion, risk decisioning, or compliance checks?",
      "You've done risk at Goldman, Citi, and now Biz2Credit. How does risk management for a $8B SMB lending platform differ from risk at a bulge bracket bank?",
      "The Columbia University partnership is ambitious — using AI to unlock $750B in small business financing. What's the research focused on?",
    ],
    hvAngle: {
      priority: "HIGH",
      title: "Partnership — document layer or complementary fraud detection",
      pitch: "Aman, Biz2X has impressive AI underwriting capabilities. Where does your document parsing come from — is it built in-house? HyperVerge specializes in the document layer — bank statement fraud detection, OCR from scanned documents, identity verification. If Biz2X is looking for a best-in-class document intelligence partner, that's our sweet spot.",
      painPoint: "Biz2X may have built similar capabilities internally. Focus on fraud detection specifically — even if they have good OCR, do they have tamper detection? HyperVerge's fraud detection (inconsistent fonts, formatting anomalies, AI-generated document detection) may be additive.",
    },
    li: "https://www.linkedin.com/in/aman-mahajan-9b032aa/",
  },
  {
    name: "David Tilis",
    title: "Chief Strategy Officer",
    company: "Coral Capital Solutions",
    companyType: "TAM",
    companyLookup: "Coral Capital Solutions",
    bg: "20+ yr banking & fintech veteran. CUNY Brooklyn College + Baruch College (Finance & Investments). Built fintech partnerships division at Cross River Bank from inception through the Andreessen Horowitz raise (2016). Built FinWise Bank's FinTech Partnerships from scratch — 30+ partnerships (Upstart, Liberty Lending, Behalf, Elevate) cumulatively originating $12B+ in loans, integral to FinWise's IPO in 2021. Joined Coral Capital Jan 2025. Board Advisor at B9 (payroll fintech). Frequent speaker at LendIT, COMPLY Summit, Lend360.",
    hooks: [
      "* Built TWO fintech partnership divisions from scratch (Cross River Bank + FinWise Bank) — originating $12B+ in loans and contributing to FinWise's IPO",
      "Deep relationships with marketplace lenders (Upstart, Liberty Lending, Behalf, Elevate) — how these partnerships evaluate credit differently",
      "Joined Coral Capital weeks ago (Jan 2025) — ask about strategic vision for growing factoring/PO finance with tech",
      "Frequent speaker: LendIT, COMPLY Summit, Lend360, Hudson Cook Conference — very well-networked in lending compliance",
    ],
    talkingPoints: [
      "Cross River is one of the most prolific fintech bank partners (powers Affirm, Upstart) — David was there during formative years",
      "Experience building bank-fintech programs directly relevant to how tech reshapes UW in factoring/PO finance",
      "Coral Capital's AR factoring model depends on receivables quality + debtor creditworthiness — how can OCR/API/real-time data modernize this?",
    ],
    recentNews: [
      "Jan 2025: Joined Coral Capital as CSO to lead business development and strategic partnerships",
      "Jan 2025: Coral Capital closed $42M annual factoring facility for medical device manufacturer during M&A",
    ],
    icebreakers: [
      "David, you built fintech partnerships at both Cross River and FinWise — the two banks that power half the fintech lending industry. What made you move to the factoring side with Coral Capital?",
      "You helped take FinWise public. Now at Coral Capital, are you bringing that bank-fintech partnership model to factoring and ABL?",
      "With the OCC and FDIC scrutinizing bank-fintech partnerships, how do you see the regulatory landscape changing for partner-bank lending models?",
    ],
    hvAngle: {
      priority: "MEDIUM",
      title: "Document verification for factoring and ABL",
      pitch: "David, factoring depends on invoice authenticity. ABL depends on accurate asset documentation. HyperVerge extracts and verifies invoices, purchase orders, and financial documents — flagging fraud, inconsistencies, and duplicates. Given your experience building fintech partnerships at Cross River and FinWise, you know the value of plug-in verification layers.",
      painPoint: "David built 30+ fintech partnerships. He may be a connector to other lenders and platforms in his network, even if Coral Capital isn't the primary buyer.",
    },
    li: "https://www.linkedin.com/in/davidtilis",
  },
  {
    name: "Aakanksha Jadhav",
    title: "Director, Product Development",
    company: "Mastercard",
    bg: "Product leader at Mastercard (Purchase, NY) within The Foundry — Mastercard's innovation engine (280+ patents, $510M investment). Leads GenAI products for SMEs. IIT Madras (BTech Honors + MTech) + Olin MBA. Prior: JP Morgan, Deloitte, GEP, ran edtech startup 'Grasp'. Started as MBA Summer Associate (2019), now Director. Led AI credit risk models for SMEs + merchant solutions. Her team likely built Mastercard Agent Suite (agentic AI, launched Jan 2026). Was Raistone's Mastercard contact (virtual card partnership) \u2014 Angel at this table.",
    hooks: [
      "* Building GenAI credit risk models for SMEs using Mastercard's 1 trillion+ data points — how card transaction data enables better credit decisions than bureau data",
      "* Mastercard Agent Suite (Jan 2026) — agentic AI for enterprises. Ask what 'agentic' actually means in practice vs hype",
      "* Was Mastercard's partner contact for Raistone (now defunct) — she and Angel Murudumbay at this table may have worked together",
      "Ran edtech startup 'Grasp' before Mastercard — understands startup struggle, not just corporate PM",
    ],
    talkingPoints: [
      "Mastercard's 1T+ data points = massive UW advantage — real-time txn flow, merchant spending, cross-border patterns unavailable to bureaus",
      "Decision Intelligence Pro delivered 300% improvement in fraud detection — how does this translate to SME credit risk?",
      "Mastercard Agent Suite: autonomous systems that can pre-underwrite loans and manage fraud investigations without human input — the future of lending?",
    ],
    recentNews: [
      "Jan 2026: Mastercard launched Agent Suite — agentic AI tools for enterprises (banks, merchants). Available Q2 2026",
      "2025: Mastercard doubled fraud detection rate using Decision Intelligence Pro (GenAI on 1T+ data points)",
      "2025: Speaker at NexGen Banking Summit — keynotes on GenAI Products + AI-Powered Banking",
    ],
    icebreakers: [
      "Aakanksha, you're building GenAI credit risk models at Mastercard Foundry. How do you think about the difference between what Mastercard can see (transaction data) vs. what a traditional lender sees (bank statements)?",
      "Mastercard Foundry works on horizon 1 to horizon 3 projects. Where do AI credit models for SMEs fall on that spectrum — near-term product or long-term bet?",
      "You've worked at JP Morgan and Deloitte before Mastercard. What's unique about building financial products inside a payment network vs. inside a bank?",
    ],
    hvAngle: {
      priority: "STRATEGIC",
      title: "Complementary data for GenAI credit models",
      pitch: "Aakanksha, your GenAI credit models use Mastercard transaction data. But SMEs applying for credit also submit bank statements, tax returns, and business documents. HyperVerge extracts structured data from those documents — cash flow patterns, revenue trends, industry classification. That document-layer data could complement Mastercard's transaction data to improve model accuracy.",
      painPoint: "Long-term play: not a quick sale. Mastercard moves slowly but at massive scale. Share perspectives on model explainability given regulatory pressure from Colorado SB 24-205 and CFPB guidance.",
    },
  },
  {
    name: "Kishore",
    title: "",
    company: "HyperVerge",
    isInternal: true,
    bg: "HyperVerge.",
    hooks: [],
    talkingPoints: [],
    recentNews: [],
    icebreakers: [],
  },
  {
    name: "Adam Madar",
    title: "Head of Underwriting",
    company: "Aspire Funding",
    companyType: "ICP",
    companyLookup: "Aspire Funding",
    bg: "Brooklyn-based alt finance pro (BMCC, Business Admin). 8+ years in MCA. Early career as Funding Advisor at Yellowstone Capital (2014-2016) \u2014 NOTE: Yellowstone later received $1.065B NY AG settlement (Jan 2025), the largest MCA enforcement ever. Adam left well before the predatory practices in question (2017-2021+). Founded AMM Capital (2018, Jersey City) \u2014 his own revenue-based funding shop. Now leads UW at Aspire Funding Platform. Aspire uses API/OCR tech, same-day funding, up to 17-point ISO commissions.",
    hooks: [
      "* Self-made trajectory: BMCC to running own funding company (AMM Capital) to heading UW at Aspire — no Ivy League pedigree, built through hustle",
      "Aspire uses API/OCR for underwriting — how automated bank statement analysis changes MCA risk assessment vs manual",
      "Attended Broker Fair 2025 — discuss ISO/broker channel and how 17-point commissions affect deal quality",
      "NOTE: Yellowstone Capital background is a sensitive topic. He left in 2016 before problematic period. Let him bring it up \u2014 don't lead with it",
    ],
    talkingPoints: [
      "Firsthand insight into what data signals predict merchant repayment — connects to Aakanksha's AI models and Plaid's LendScore",
      "Post-Yellowstone compliance environment — how funders are restructuring MCA agreements to withstand regulatory scrutiny",
      "Aspire's API/OCR tech stack = practical implementation of fintech UW revolution at the ground level",
    ],
    recentNews: [
      "Jan 2025: Yellowstone Capital $1.065B settlement (NY AG) — largest MCA enforcement ever. $534M in merchant debt cancelled, firm banned from MCA business",
      "May 2025: Represented Aspire at Broker Fair 2025 in NYC",
    ],
    icebreakers: [
      "Adam, what's the biggest change you've seen in MCA underwriting over the past 8 years — is it technology, regulation, or the quality of deal flow?",
      "You were at Broker Fair 2025. What was the mood among brokers — optimistic, worried about regulation, or focused on technology?",
      "As head of underwriting at Aspire, what's the hardest part of the job right now — finding good deals, managing stacking risk, or keeping up with compliance?",
    ],
    hvAngle: {
      priority: "HIGH",
      title: "Post-Yellowstone compliance-forward underwriting",
      pitch: "Adam, in a post-Yellowstone world, every MCA funder needs to show regulators that their underwriting is thorough and documented. HyperVerge provides an automated audit trail — every bank statement analyzed, every document verified, every identity checked, all with timestamps and confidence scores. If an AG comes knocking, you have a complete, defensible paper trail.",
      painPoint: "Yellowstone's downfall was partly about documentation — contracts that didn't reflect reality. HyperVerge ensures the intake documents are authentic and the verification process is auditable.",
    },
    note: "Tread carefully around Yellowstone Capital connection. The $1B judgment is fresh. Adam may be open about it, or may prefer to focus on Aspire's current operations. Let him bring it up first.",
    li: "https://www.linkedin.com/in/adammmadar/",
  },
];

const typeColors: Record<string, string> = {
  SQO: "text-[var(--sqo)] border-[var(--sqo)]/30",
  Client: "text-[var(--client)] border-[var(--client)]/30",
  ICP: "text-[var(--icp)] border-[var(--icp)]/30",
  TAM: "text-[var(--tam)] border-[var(--tam)]/30",
};

const priorityColors: Record<string, string> = {
  HIGH: "bg-[var(--sqo)]/15 text-[var(--sqo)]",
  "MEDIUM-HIGH": "bg-[var(--client)]/15 text-[var(--client)]",
  MEDIUM: "bg-[var(--tam)]/15 text-[var(--tam)]",
  PARTNERSHIP: "bg-brand/15 text-brand",
  STRATEGIC: "bg-[var(--icp)]/15 text-[var(--icp)]",
};

// ─── COLLAPSIBLE SECTION ────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon: Icon,
  iconColor,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="gap-0 py-0 shadow-none overflow-hidden">
      <Button
        variant="ghost"
        className="w-full flex items-center gap-2 px-3 py-2.5 h-auto rounded-none text-left justify-start"
        onClick={() => setOpen(!open)}
      >
        <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
        <span className="text-sm font-semibold flex-1">{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </Button>
      {open && (
        <div className="px-3 pb-3 border-t border-border/50">{children}</div>
      )}
    </Card>
  );
}

// ─── ATTENDEE CARD ──────────────────────────────────────────────────────────

function AttendeeCard({
  attendee,
  onJumpToCompany,
  forceExpand,
}: {
  attendee: Attendee;
  onJumpToCompany: (name: string) => void;
  forceExpand?: boolean;
}) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = forceExpand || localExpanded;

  if (attendee.isInternal) {
    return (
      <Card className="p-3 gap-0 shadow-none opacity-60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
            <span className="text-brand font-bold text-xs">
              {attendee.name[0]}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium">{attendee.name}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {attendee.company}
            </span>
          </div>
          <Badge className="ml-auto bg-brand/20 text-brand text-xs px-1.5 py-0 h-5">
            US
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-0 py-0 shadow-none overflow-hidden">
      <Button
        variant="ghost"
        className="w-full flex items-center gap-2 px-3 py-2.5 h-auto rounded-none text-left justify-start"
        onClick={() => setLocalExpanded(!localExpanded)}
      >
        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate">
              {attendee.name}
            </span>
            {attendee.companyType && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-1 py-0 h-3.5 shrink-0",
                  typeColors[attendee.companyType]
                )}
              >
                {attendee.companyType}
              </Badge>
            )}
            {attendee.hvAngle && (
              <Badge
                className={cn(
                  "text-xs px-1 py-0 h-3.5 shrink-0 border-0 hidden sm:inline-flex",
                  priorityColors[attendee.hvAngle.priority]
                )}
              >
                {attendee.hvAngle.priority}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {attendee.title}
            {attendee.title && " — "}
            {attendee.company}
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </Button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/50">
          {/* Note / Warning */}
          {attendee.note && (
            <div className="pt-2 flex gap-1.5 rounded-md bg-[var(--sqo)]/5 px-2 py-2 mt-2">
              <AlertTriangle className="h-3 w-3 text-[var(--sqo)] shrink-0 mt-0.5" />
              <span className="text-xs text-[var(--sqo)]">{attendee.note}</span>
            </div>
          )}

          {/* Background */}
          <div className="pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {attendee.bg}
            </p>
          </div>

          {/* Icebreakers — Detailed Conversation Starters */}
          {attendee.icebreakers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Zap className="h-3 w-3 text-[var(--sqo)]" />
                <span className="text-xs font-semibold text-[var(--sqo)]">
                  Icebreakers
                </span>
              </div>
              <ul className="space-y-1.5">
                {attendee.icebreakers.map((ib, i) => (
                  <li key={i} className="text-xs leading-relaxed flex gap-1.5">
                    <span className="text-[var(--sqo)] shrink-0 mt-0.5 font-semibold">{i + 1}.</span>
                    <span className="text-foreground italic">&ldquo;{ib}&rdquo;</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Hooks — Quick Conversation Starters */}
          {attendee.hooks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="h-3 w-3 text-brand" />
                <span className="text-xs font-semibold text-brand">
                  Quick Hooks
                </span>
              </div>
              <ul className="space-y-1">
                {attendee.hooks.map((hook, i) => (
                  <li key={i} className="text-xs leading-relaxed flex gap-1.5">
                    <span className="text-brand shrink-0 mt-0.5">
                      {hook.startsWith("*") ? "\u2605" : "\u2022"}
                    </span>
                    <span
                      className={
                        hook.startsWith("*")
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {hook.startsWith("* ") ? hook.slice(2) : hook}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* HyperVerge Angle */}
          {attendee.hvAngle && (
            <div className="bg-brand/5 rounded-md px-2 py-2 border border-brand/20">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target className="h-3 w-3 text-brand" />
                <span className="text-xs font-semibold text-brand">
                  HyperVerge Angle: {attendee.hvAngle.title}
                </span>
              </div>
              <p className="text-xs text-foreground leading-relaxed mb-1.5">
                {attendee.hvAngle.pitch}
              </p>
              {attendee.hvAngle.painPoint && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-brand">Pain point:</span>{" "}
                  {attendee.hvAngle.painPoint}
                </p>
              )}
            </div>
          )}

          {/* Talking Points */}
          {attendee.talkingPoints.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <MessageCircle className="h-3 w-3 text-[var(--icp)]" />
                <span className="text-xs font-semibold text-[var(--icp)]">
                  Talking Points
                </span>
              </div>
              <ul className="space-y-1">
                {attendee.talkingPoints.map((tp, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground leading-relaxed flex gap-1.5"
                  >
                    <span className="text-[var(--icp)] shrink-0 mt-0.5">
                      {i + 1}.
                    </span>
                    <span>{tp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent News */}
          {attendee.recentNews.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Newspaper className="h-3 w-3 text-[var(--client)]" />
                <span className="text-xs font-semibold text-[var(--client)]">
                  Recent News
                </span>
              </div>
              <ul className="space-y-1">
                {attendee.recentNews.map((news, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground leading-relaxed flex gap-1.5"
                  >
                    <span className="text-[var(--client)] shrink-0 mt-0.5">
                      {"\u2022"}
                    </span>
                    <span>{news}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {attendee.companyLookup && (
              <Button
                variant="outline"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToCompany(attendee.companyLookup!);
                }}
              >
                View Company
              </Button>
            )}
            {attendee.li && (
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(attendee.li, "_blank");
                }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                LinkedIn
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── MAIN TAB ───────────────────────────────────────────────────────────────

export function ScheduleTab({ onJumpToCompany }: ScheduleTabProps) {
  const [expandAll, setExpandAll] = useState(false);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-w-2xl mx-auto overflow-hidden">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold">Dinner Roundtable</h2>
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              onClick={() => setExpandAll(!expandAll)}
            >
              {expandAll ? "Collapse All" : "Expand All"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            deBanked CONNECT 2026 — Fontainebleau, Miami —{" "}
            {attendees.filter((a) => !a.isInternal).length} external guests + 2
            HyperVerge
          </p>
        </div>

        {/* Quick Reference */}
        <CollapsibleSection
          title="Quick Reference — Seating & Playbook"
          icon={Bookmark}
          iconColor="text-brand"
        >
          <div className="pt-2 space-y-3">
            {/* Seating targets */}
            <div>
              <span className="text-xs font-semibold text-brand">
                Priority Seating Targets
              </span>
              <div className="space-y-1.5 mt-1.5">
                {seatingTargets.map((t, i) => (
                  <div key={i} className="text-xs flex gap-1.5">
                    <span className="text-brand font-bold shrink-0">
                      {i + 1}.
                    </span>
                    <span>
                      <span className="font-semibold text-foreground">
                        {t.name}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        — {t.reason}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key stats */}
            <div>
              <span className="text-xs font-semibold text-[var(--icp)]">
                Stats to Drop Casually
              </span>
              <ul className="mt-1.5 space-y-1">
                {keyStats.map((s, i) => (
                  <li key={i} className="text-xs flex gap-1.5">
                    <span className="text-[var(--icp)] shrink-0">{"\u2022"}</span>
                    <span className="text-foreground italic">&ldquo;{s}&rdquo;</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Do / Don't */}
            <div className="space-y-2">
              <div>
                <span className="text-xs font-semibold text-[var(--icp)]">
                  DO Lead With
                </span>
                <ul className="mt-1 space-y-0.5">
                  {doLeadWith.map((d, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1">
                      <span className="text-[var(--icp)] shrink-0">{"\u2713"}</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-xs font-semibold text-[var(--sqo)]">
                  DON&apos;T Lead With
                </span>
                <ul className="mt-1 space-y-0.5">
                  {dontLeadWith.map((d, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1">
                      <span className="text-[var(--sqo)] shrink-0">{"\u2717"}</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Conversation Topics */}
        <CollapsibleSection
          title="5 Conversation Topics"
          icon={MessageCircle}
          iconColor="text-[var(--client)]"
        >
          <div className="pt-2 space-y-3">
            {conversationTopics.map((topic, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex gap-1.5">
                  <span className="text-xs font-bold text-[var(--client)] shrink-0">
                    {i + 1}.
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {topic.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed ml-4">
                  {topic.why}
                </p>
                <p className="text-xs text-muted-foreground ml-4">
                  <span className="font-semibold text-foreground">
                    Players:
                  </span>{" "}
                  {topic.players}
                </p>
                <p className="text-xs ml-4 text-foreground italic">
                  &ldquo;{topic.starter}&rdquo;
                </p>
                <ul className="ml-4 space-y-0.5">
                  {topic.context.map((c, j) => (
                    <li
                      key={j}
                      className="text-xs text-muted-foreground flex gap-1"
                    >
                      <span className="text-[var(--client)] shrink-0">
                        {"\u2022"}
                      </span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
                {i < conversationTopics.length - 1 && (
                  <div className="border-b border-border/30 pt-1" />
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Connections Map */}
        <CollapsibleSection
          title="Cross-Attendee Connections"
          icon={Link2}
          iconColor="text-[var(--icp)]"
        >
          <div className="pt-2 space-y-2">
            {connections.map((conn, i) => (
              <div
                key={i}
                className="text-xs space-y-0.5"
              >
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs px-1.5 py-0 h-4 shrink-0",
                      connectionColors[conn.type]
                    )}
                  >
                    {conn.type}
                  </Badge>
                  <span className="font-semibold text-foreground">
                    {conn.label}
                  </span>
                </div>
                <p className="text-muted-foreground ml-0.5">
                  <span className="font-medium text-foreground">
                    {conn.people}
                  </span>{" "}
                  — {conn.detail}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Attendee List */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-foreground">
              Attendees ({attendees.filter((a) => !a.isInternal).length})
            </span>
            <div className="hidden sm:flex gap-1 ml-auto">
              {["HIGH", "PARTNERSHIP", "STRATEGIC"].map((p) => (
                <Badge
                  key={p}
                  className={cn(
                    "text-xs px-1 py-0 h-3.5 border-0",
                    priorityColors[p]
                  )}
                >
                  {p}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {attendees.map((attendee, i) => (
              <AttendeeCard
                key={i}
                attendee={attendee}
                onJumpToCompany={onJumpToCompany}
                forceExpand={expandAll}
              />
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
