import { Company, ProductFitSignal } from "./types";
import { PipelineRecord } from "./pipeline-helpers";

export type BattlecardCategory = 'budget' | 'competition' | 'timing' | 'trust' | 'technical';

export interface Battlecard {
  trigger: string;
  response: string;
  socialProof: string;
  category: BattlecardCategory;
}

const CATEGORY_STYLES: Record<BattlecardCategory, { label: string; colorClass: string }> = {
  budget: { label: 'Budget', colorClass: 'bg-amber-500/15 text-amber-400' },
  competition: { label: 'Competition', colorClass: 'bg-red-500/15 text-red-400' },
  timing: { label: 'Timing', colorClass: 'bg-blue-500/15 text-blue-400' },
  trust: { label: 'Trust', colorClass: 'bg-purple-500/15 text-purple-400' },
  technical: { label: 'Technical', colorClass: 'bg-green-500/15 text-green-400' },
};

export function getCategoryStyle(category: BattlecardCategory) {
  return CATEGORY_STYLES[category];
}

export function generateBattlecards(
  company: Company,
  pipelineState: Record<string, PipelineRecord>
): Battlecard[] {
  const cards: Battlecard[] = [];
  const record = pipelineState[company.id];
  const stage = record?.stage || 'researched';
  const desc = (company.desc || '').toLowerCase();
  const employeeCount = company.employees || 0;

  // --- By company type ---
  if (company.type === 'SQO') {
    cards.push({
      trigger: "We need enterprise-grade SLAs and uptime guarantees.",
      response: "Absolutely. We maintain 99.9% uptime with SOC 2 Type II certification. Our enterprise tier includes dedicated support, custom SLAs, and on-prem deployment options.",
      socialProof: "HyperVerge serves 450+ financial services enterprises with enterprise-grade SLAs.",
      category: 'trust',
    });
  }

  if (company.type === 'ICP' || company.type === 'SQO') {
    cards.push({
      trigger: "We've built our own underwriting system in-house.",
      response: "Many of our best customers started with in-house tools. The challenge is maintaining and scaling them. HyperVerge plugs into your existing stack via API — you keep your logic, we handle document extraction, identity verification, and bank statement analysis at scale.",
      socialProof: "Several MCA lenders run HyperVerge alongside their proprietary scoring models — best of both worlds.",
      category: 'competition',
    });
  }

  if (company.type === 'TAM') {
    cards.push({
      trigger: "Who is HyperVerge? We haven't heard of you.",
      response: "We're an AI company powering 450+ financial services enterprises globally. Our underwriting AI Co-Pilot cuts decision time from 40 minutes to under 5. We work with MCA lenders, equipment finance, SBA — the full spectrum.",
      socialProof: "450+ financial services enterprises on the platform processing millions of applications.",
      category: 'trust',
    });
  }

  // --- By size ---
  if (employeeCount > 200) {
    cards.push({
      trigger: "Integration with our existing systems is a concern.",
      response: "Our REST APIs integrate with any LOS, CRM, or core banking system. Average integration takes 2-3 weeks. We support Salesforce, HubSpot, and custom webhooks out of the box.",
      socialProof: "Enterprise clients with 500+ employees typically go live in under 3 weeks.",
      category: 'technical',
    });
  }

  if (employeeCount > 0 && employeeCount < 50) {
    cards.push({
      trigger: "We're too small for this kind of solution — budget is tight.",
      response: "Our platform is built for lenders of all sizes. Smaller teams actually see the biggest ROI because every hour of underwriting time saved is critical. We offer usage-based pricing so you only pay for what you process.",
      socialProof: "Teams as small as 5 people use HyperVerge to process 100+ applications per month.",
      category: 'budget',
    });
  }

  // --- By description keywords ---
  if (desc.includes('proprietary') || desc.includes('in-house') || desc.includes('own platform')) {
    cards.push({
      trigger: "We have our own proprietary technology.",
      response: "That's actually an advantage. HyperVerge isn't a replacement — we're an augmentation layer. Our AI handles the heavy lifting on document extraction and verification while your proprietary models handle the credit decision.",
      socialProof: "Several partners run HyperVerge alongside proprietary scoring models — we complement, not compete.",
      category: 'competition',
    });
  }

  if (desc.includes('regulatory') || desc.includes('compliance') || desc.includes('regulated')) {
    cards.push({
      trigger: "We have strict compliance requirements.",
      response: "Compliance is our strength. SOC 2 Type II certified, GDPR compliant, with full audit trails. Our AI decisions are explainable and auditable — critical for regulatory reviews.",
      socialProof: "Multiple regulated lenders use HyperVerge to strengthen their compliance posture, not weaken it.",
      category: 'trust',
    });
  }

  // --- By pipeline stage ---
  if (stage === 'proposal') {
    cards.push({
      trigger: "Your pricing is higher than alternatives.",
      response: "When you factor in the time savings (40 min to under 5 per application), the ROI is typically 10-15x. Most customers break even within the first month on volume alone.",
      socialProof: "Customers processing 500+ apps/month see 80%+ cost reduction in underwriting labor.",
      category: 'budget',
    });
  }

  if (stage === 'demo') {
    cards.push({
      trigger: "How does this compare to [competitor]?",
      response: "We're purpose-built for lending underwriting — not a generic OCR or document tool. Our models are trained on millions of bank statements, tax returns, and business documents specific to your industry.",
      socialProof: "Head-to-head, our extraction accuracy on bank statements is 98%+ vs. 85-90% for generic tools.",
      category: 'competition',
    });
  }

  // --- By company type: Client (expansion) ---
  if (company.type === 'Client') {
    cards.push({
      trigger: "We're happy with what we have, no need to expand.",
      response: "Glad to hear things are working well! Many clients find additional value in our newer capabilities — fraud detection, income verification, and real-time bank statement analysis. Happy to show you what's new since you came on board.",
      socialProof: "Existing customers who expand to additional modules see 30% improvement in overall efficiency.",
      category: 'timing',
    });
  }

  // Universal timing card for non-active pipeline
  if (stage === 'researched' || stage === 'contacted') {
    cards.push({
      trigger: "Now isn't the right time for us.",
      response: "Totally understand. Most lenders reach out when application volume spikes or when manual underwriting becomes a bottleneck. Happy to stay in touch and share some relevant case studies in the meantime.",
      socialProof: "60% of our customers started conversations 3-6 months before they were ready to buy.",
      category: 'timing',
    });
  }

  // --- Product-specific battlecards ---
  const recommendedProducts = company.recommendedProducts || [];
  if (recommendedProducts.length > 0) {
    const productCards = generateProductBattlecards(company, recommendedProducts);
    cards.push(...productCards);
  }

  // Deduplicate by trigger (in case rules overlap)
  const seen = new Set<string>();
  return cards.filter((c) => {
    if (seen.has(c.trigger)) return false;
    seen.add(c.trigger);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Product-specific battlecard generation
// ---------------------------------------------------------------------------

interface ProductBattlecardTemplate {
  inHouseTrigger: string;
  inHouseResponse: string;
  tooExpensiveTrigger: string;
  tooExpensiveResponse: string;
  competitorTrigger?: string;
  competitorResponse?: string;
  socialProof: string;
}

const PRODUCT_BATTLECARD_TEMPLATES: Record<string, ProductBattlecardTemplate> = {
  bsa: {
    inHouseTrigger: "We handle bank statement review internally.",
    inHouseResponse: "Most lenders start that way. The challenge is consistency and speed at scale — at 50+ statements/day, manual review misses patterns AI catches. HyperVerge parses bank statements with 98%+ accuracy in seconds, and your underwriters still make the final call.",
    tooExpensiveTrigger: "BSA parsing is too expensive for our volume.",
    tooExpensiveResponse: "At 15 minutes saved per bank statement, even 20 apps/day = 5 hours of underwriter time recovered. Our usage-based pricing means the ROI is typically 10-15x within the first month. Happy to run the math on your actual volume.",
    competitorTrigger: "We already use Ocrolus for bank statements.",
    competitorResponse: "Ocrolus is solid for OCR extraction. Where we differ: HyperVerge does BSA + fraud detection + identity verification in a single API call. No need to stitch together 3 vendors. Plus our accuracy on MCA-specific bank statement patterns is 98%+ versus generic parsing.",
    socialProof: "450+ lenders process bank statements through HyperVerge — including MCA funders handling 100+ apps/day.",
  },
  clear: {
    inHouseTrigger: "Our underwriters handle CLEAR reports manually.",
    inHouseResponse: "A 50+ page CLEAR report takes 15 minutes to manually review and extract key data points. Our AI does it in seconds, with structured output your underwriters can review in 30 seconds. That's 14.5 minutes back per application.",
    tooExpensiveTrigger: "Automated CLEAR parsing isn't worth the cost.",
    tooExpensiveResponse: "Consider the fully-loaded cost of an underwriter spending 15 minutes on each CLEAR report. At 30+ apps/day, that's 7.5 hours — nearly a full FTE just on CLEAR reports. HyperVerge costs a fraction of that FTE.",
    socialProof: "Lenders using HyperVerge CLEAR parsing report 80% reduction in per-application review time.",
  },
  application_pdf: {
    inHouseTrigger: "We have our own application intake process.",
    inHouseResponse: "Custom intake processes are great for standard submissions, but what about the 30% that come in non-standard formats? ISO submissions, faxed applications, emailed PDFs — HyperVerge normalizes everything into structured data automatically.",
    tooExpensiveTrigger: "PDF parsing tools are commoditized — why pay premium?",
    tooExpensiveResponse: "Generic PDF parsers extract text. HyperVerge understands lending applications — we know what a 'business name' field means vs. 'owner name', validate against bureau data, and flag inconsistencies. That intelligence is what prevents costly errors downstream.",
    socialProof: "ISO brokers using HyperVerge cut submission processing time by 75% — from 5 minutes to under 90 seconds per application.",
  },
  identity_verification: {
    inHouseTrigger: "We have our own KYC/verification process.",
    inHouseResponse: "How's your catch rate on synthetic identities? Industry average is 60-70%. HyperVerge catches 94% through multi-signal analysis — face match, document forensics, and database cross-reference in a single API call. Your existing process plus our verification layer = much stronger defense.",
    tooExpensiveTrigger: "Identity verification adds cost per application.",
    tooExpensiveResponse: "One funded synthetic identity costs $30,000-$50,000 in losses. Our verification costs under $2 per check. At even a 1% fraud rate on 100 monthly apps, you're saving $30K+ per incident prevented. The math is overwhelming.",
    competitorTrigger: "We already use Onfido / Jumio for identity checks.",
    competitorResponse: "Great that you have IDV in place. Where HyperVerge adds value: we combine identity verification with document fraud detection and bank statement analysis. One vendor, one API, one integration — instead of managing separate vendors for each capability.",
    socialProof: "Banks and fintechs using HyperVerge IDV report 94% synthetic identity catch rate — up from 65% with manual checks.",
  },
  sic_naics: {
    inHouseTrigger: "Our underwriters classify industries manually.",
    inHouseResponse: "Manual SIC/NAICS classification is inconsistent — different underwriters classify the same business differently. Our AI standardizes it with 95%+ accuracy, catches restricted industries automatically, and updates when businesses pivot. Consistency = compliance.",
    tooExpensiveTrigger: "Industry classification automation seems niche.",
    tooExpensiveResponse: "Misclassification is a silent risk — one restricted-industry merchant that slips through can cost more than a year of classification automation. It's insurance, not overhead.",
    socialProof: "Lenders using HyperVerge SIC/NAICS report 40% fewer restricted-industry incidents after deployment.",
  },
  stips_collection: {
    inHouseTrigger: "We handle stips collection through email and phone.",
    inHouseResponse: "Manual stips collection is the #1 cause of delayed closings. HyperVerge automates the entire workflow — automated reminders, document verification on receipt, status tracking — compressing days of back-and-forth into hours.",
    tooExpensiveTrigger: "Stips automation doesn't justify the cost for our volume.",
    tooExpensiveResponse: "Each day of delayed closing costs you in two ways: lost revenue and merchant frustration (they go to a competitor who funds faster). At even 5 delayed deals per month, the cost of slow stips collection far exceeds automation.",
    socialProof: "Funders using HyperVerge stips collection close 40% faster — from 3-5 days average to under 24 hours.",
  },
  fraud_detection: {
    inHouseTrigger: "We have fraud rules built into our system.",
    inHouseResponse: "Rule-based fraud detection catches known patterns. AI catches evolving ones. Synthetic identities, sophisticated document tampering, cross-application stacking — these require pattern recognition across millions of data points. HyperVerge layers on top of your existing rules, not replace them.",
    tooExpensiveTrigger: "Fraud detection tools are expensive for our loss rate.",
    tooExpensiveResponse: "What's your current loss rate? Industry average for MCA is 10-15%. Even a 1% improvement at $50K average funding amount saves $500 per 100 apps. HyperVerge typically reduces fraud losses by 40-60% — the ROI is usually measured in weeks, not months.",
    competitorTrigger: "We use Alloy / Socure for fraud prevention.",
    competitorResponse: "Alloy and Socure are strong on identity risk scoring. HyperVerge adds document-level fraud detection — we catch tampered bank statements, fabricated tax returns, and altered business documents that identity-focused tools miss. We're complementary, not competitive.",
    socialProof: "Lenders using HyperVerge fraud detection see 40-60% reduction in fraud losses within the first quarter.",
  },
  copilot: {
    inHouseTrigger: "We have our own underwriting workflow and don't need a co-pilot.",
    inHouseResponse: "The Co-Pilot doesn't replace your underwriting judgment — it eliminates the data grunt work. Your underwriters spend 30+ minutes per app on extraction and verification. Co-Pilot handles that in under 5 minutes, presenting a clean decision package. Your team becomes reviewers, not data entry clerks.",
    tooExpensiveTrigger: "Full automation is a big investment — we're not ready.",
    tooExpensiveResponse: "Co-Pilot is modular — start with bank statement analysis, add fraud detection later. No big-bang implementation required. Most customers start with one module and expand after seeing ROI in the first month. Usage-based pricing means you're never overpaying.",
    socialProof: "Lenders using HyperVerge Co-Pilot process 5-8x more applications per underwriter — 40 minutes down to under 5.",
  },
};

function generateProductBattlecards(company: Company, recommendedProducts: string[]): Battlecard[] {
  const cards: Battlecard[] = [];

  for (const productId of recommendedProducts.slice(0, 3)) {
    const template = PRODUCT_BATTLECARD_TEMPLATES[productId];
    if (!template) continue;

    // "We have our own system" variant
    cards.push({
      trigger: template.inHouseTrigger,
      response: template.inHouseResponse,
      socialProof: template.socialProof,
      category: 'competition',
    });

    // "Too expensive" variant
    cards.push({
      trigger: template.tooExpensiveTrigger,
      response: template.tooExpensiveResponse,
      socialProof: template.socialProof,
      category: 'budget',
    });

    // Competitor-specific variant (if applicable)
    if (template.competitorTrigger && template.competitorResponse) {
      const desc = (company.desc || '').toLowerCase();
      const notes = (company.notes || '').toLowerCase();
      const corpus = `${desc} ${notes}`;

      // Only show competitor card if there's evidence they use a competitor
      const hasCompetitorSignal = productId === 'bsa' && (corpus.includes('ocrolus') || corpus.includes('plaid'))
        || productId === 'identity_verification' && (corpus.includes('onfido') || corpus.includes('jumio') || corpus.includes('alloy') || corpus.includes('socure'))
        || productId === 'fraud_detection' && (corpus.includes('alloy') || corpus.includes('socure') || corpus.includes('datavisor'));

      if (hasCompetitorSignal) {
        cards.push({
          trigger: template.competitorTrigger,
          response: template.competitorResponse,
          socialProof: template.socialProof,
          category: 'competition',
        });
      }
    }
  }

  return cards;
}
