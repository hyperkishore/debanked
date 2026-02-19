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
  li?: string;
  isInternal?: boolean;
}

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
      "Citibank → Capital One → Resurgent Capital → ECG — has seen full credit lifecycle from origination to debt servicing",
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
    li: "https://www.linkedin.com/in/rohansriram",
  },
  {
    name: "Akhilesh",
    title: "",
    company: "HyperVerge",
    isInternal: true,
    bg: "HyperVerge team. Document verification and identity verification for lending workflows.",
    hooks: [],
    talkingPoints: [],
    recentNews: [],
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
  },
  {
    name: "Gerard Lucero",
    title: "Senior Underwriter",
    company: "Fundfi",
    companyType: "Client",
    companyLookup: "Fundfi",
    bg: "Senior UW at Fundfi Merchant Funding. Career progression through alt finance: started at Liquid Capital as Factor Support Admin, advanced to UW Assistant then Underwriter. Moved to FundThrough as UW on invoice financing platform. Proficient in Excel, Adobe Pro, CT Lien UCC services. Fundfi: Revenue-based financing (US + Canada), founded 2020, expanded credit facility twice in 2025, launched 2 new products Dec 2025, opened Alabama office.",
    hooks: [
      "* Career arc from factoring (Liquid Capital) → invoice financing (FundThrough) → MCA/RBF (Fundfi) — ask how UW frameworks differ across these three product types",
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
    li: "https://www.linkedin.com/in/gerard-lucero-49227b87",
  },
  {
    name: "Angel Murudumbay",
    title: "Vice President, Operations",
    company: "Raistone",
    companyType: "TAM",
    companyLookup: "Raistone",
    bg: "Financial operations leader with 15+ years experience. Rose through Raistone from Associate to AVP to VP Operations. Prior: Trade Ops Associate at State Street, Account Manager (Finance) at TIAA Bank, third-party risk vendor management at Valley, Global Account Manager Operations at HP Enterprise. New Jersey City University (BS Finance). Raistone: $10B+ B2B embedded finance, 6yr double-digit Y/Y growth, Mastercard virtual card partnership, backed by $30B family office.",
    hooks: [
      "* Scaling ops as Raistone grew from startup to $10B+ financing volume — ask about operational inflection points",
      "Raistone's Mastercard virtual card partnership for SMB working capital — how does ops manage the integration?",
      "State Street trade ops → fintech VP — what drove shift from traditional finance to embedded finance?",
      "Raistone Connect API integrates with ERPs, treasury, B2B payments — operational complexity of being system-agnostic",
    ],
    talkingPoints: [
      "Embedded finance model (ERP, treasury, B2B ecommerce) = where UW meets real-time transaction data",
      "Supply chain finance is inherently an UW challenge — Raistone approves $50K to $500M facilities using platform data",
      "1,028% revenue growth (2020-2023) required massive ops scaling — lessons for any fintech building UW tech at scale",
    ],
    recentNews: [
      "2025: Named 'Best Overall FinTech Company' at FinTech Breakthrough Awards + 'Best Embedded SME Financing Solution' at Banking Tech Awards USA",
      "2025: Partnered with Mastercard for virtual card working capital (including no-fee program for minority/women-owned businesses)",
    ],
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
    li: "https://www.linkedin.com/in/kaustubhmjoshi/",
  },
  {
    name: "Aman Mahajan",
    title: "Chief Risk Officer (CRO)",
    company: "Biz2Credit",
    companyType: "ICP",
    companyLookup: "Biz2Credit",
    bg: "Chartered Accountant (ICAI, India) + FRM (Financial Risk Manager) credential. Career through Citibank and Goldman Sachs before joining Biz2Credit as CRO. Oversees credit risk for platform that has facilitated $8B+ in SMB lending. NOTE: LinkedIn shows him as current CRO — 'ex-CRO' designation may be premature. Biz2Credit: est. 2007, $8B+ SMB financing, Biz2X SaaS ($100M+ ARR), IPO planned early 2027, Deloitte Fast 500 (203% growth).",
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
    li: "https://www.linkedin.com/in/davidtilis",
  },
  {
    name: "Aakanksha Jadhav",
    title: "Director, Product Development",
    company: "Mastercard",
    bg: "Product leader at Mastercard (Purchase, NY) within The Foundry — Mastercard's internal innovation engine (horizon 1-3 projects). Leads GenAI products for SMEs. IIT Madras (BTech Honors + MTech) + Washington University Olin MBA. Career: JP Morgan, Deloitte, GEP, ZTech before Mastercard. Started as MBA Summer Associate (2019), rose to PM, now Director. Led development of AI credit risk models for SMEs + comprehensive merchant solutions suite. Keynote speaker at NexGen Banking Summit.",
    hooks: [
      "* Building GenAI credit risk models specifically for SMEs at Mastercard — how Mastercard transaction data (spending patterns, merchant history) enables better SME credit decisions than bureau data",
      "* Keynote at NexGen Banking Summit: 'Building Gen-AI Products from 0 to 1' — practitioner view of taking AI to production in regulated env",
      "IIT Madras + Olin MBA = deep technical ML + business strategy — how she balances model accuracy vs explainability in credit risk",
      "AI-Powered Banking panel: 'Driving Personalization, Efficiency & Risk Management' — Mastercard data for alt lenders' UW",
    ],
    talkingPoints: [
      "Mastercard's SME AI credit models = massive data advantage — real-time transaction flow, merchant category spending, cross-border patterns unavailable to bureaus",
      "The Foundry horizon model (near-term vs speculative AI) — which AI lending applications are horizon 1 vs horizon 3?",
      "Mastercard merchant solutions + SMB lending intersection — how POS data and merchant analytics improve UW speed/accuracy",
    ],
    recentNews: [
      "2025: Speaker at NexGen Banking Summit USA — keynotes on Cloud Banking + GenAI Products + AI-Powered Banking panel",
      "Mastercard doubled fraud detection rate using generative AI in 2025",
    ],
  },
  {
    name: "Kishore",
    title: "",
    company: "HyperVerge",
    isInternal: true,
    bg: "HyperVerge. Document verification and identity verification for lending workflows.",
    hooks: [],
    talkingPoints: [],
    recentNews: [],
  },
  {
    name: "Adam Madar",
    title: "Head of Underwriting",
    company: "Aspire Funding",
    companyType: "ICP",
    companyLookup: "Aspire Funding",
    bg: "Brooklyn-based alt finance pro with 8+ years experience. Previously Funding Advisor at Yellowstone Capital (one of largest MCA funders). Founded AMM Capital (2018, Jersey City) — revenue-based funding for SMBs with 1-2 day turnaround. Now leads UW at Aspire Funding Platform. Represented Aspire at Broker Fair 2025 (NYC, May 2025). Aspire: MCA funder using API/OCR tech, same-day + 24-hour funding, up to 17-point ISO commissions.",
    hooks: [
      "* Path from Yellowstone Capital (biggest/most controversial MCA originator) to own shop (AMM Capital) to Aspire — ground-level view of MCA industry evolution",
      "Aspire uses API/OCR for underwriting — how automated bank statement analysis changes MCA risk assessment vs manual processes of 5 years ago",
      "Attended Broker Fair 2025 — discuss ISO/broker channel state and how 17-point commission structures affect deal quality + adverse selection",
      "Dual role (AMM Capital president + Aspire Head of UW) — deep ops knowledge of both funding and brokering sides",
    ],
    talkingPoints: [
      "Firsthand insight into what data signals actually predict merchant repayment — connects to Aakanksha's AI models and Plaid's LendScore",
      "Tension between speed (same-day funding) and risk management (disciplined UW) = core MCA challenge",
      "Aspire's API/OCR tech stack = practical implementation of fintech UW revolution",
    ],
    recentNews: [
      "May 2025: Represented Aspire at Broker Fair 2025 in NYC",
      "Aspire continuing to expand ISO network with competitive commissions + same-day funding",
    ],
    li: "https://www.linkedin.com/in/adammmadar/",
  },
];

const typeColors: Record<string, string> = {
  SQO: "text-[var(--sqo)] border-[var(--sqo)]/30",
  Client: "text-[var(--client)] border-[var(--client)]/30",
  ICP: "text-[var(--icp)] border-[var(--icp)]/30",
  TAM: "text-[var(--tam)] border-[var(--tam)]/30",
};

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
          {/* Background */}
          <div className="pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {attendee.bg}
            </p>
          </div>

          {/* Hooks — Conversation Starters */}
          {attendee.hooks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="h-3 w-3 text-brand" />
                <span className="text-xs font-semibold text-brand">
                  Conversation Starters
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
                      \u2022
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

export function ScheduleTab({ onJumpToCompany }: ScheduleTabProps) {
  const [expandAll, setExpandAll] = useState(false);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold">
              Dinner Roundtable
            </h2>
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
            deBanked CONNECT 2026 — {attendees.filter((a) => !a.isInternal).length} external guests + 2 HyperVerge. Tap each person for intel.
          </p>
        </div>

        {/* Key Themes Banner */}
        <Card className="p-3 gap-2 shadow-none bg-brand/5 border-brand/20">
          <span className="text-xs font-semibold text-brand">
            Cross-Table Themes
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              "AI in Underwriting (Jay 93% accuracy, Aakanksha GenAI, Biz2X agent)",
              "Bank Data vs Alt Data (Plaid LendScore, ECG cash-flow-first, Mastercard txn data)",
              "Embedded Finance (Raistone, Goldman/iBusiness, Mastercard)",
              "Goldman Sachs alumni (Kos Joshi + Aman Mahajan — shared vocabulary)",
              "MCA Regulation & Compliance (David Tilis Cross River/FinWise, Jay pro-regulation)",
              "Scaling UW Tech (Vox SYNQ, Aspire API/OCR, LenderAI 1,200 apps/day)",
            ].map((theme, i) => (
              <div
                key={i}
                className="text-xs text-muted-foreground flex gap-1.5"
              >
                <span className="text-brand shrink-0">\u2022</span>
                <span>{theme}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Attendee List */}
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
    </ScrollArea>
  );
}
