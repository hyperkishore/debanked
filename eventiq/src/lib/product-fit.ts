import { Company, ProductFitSignal, CompanyCategory } from "./types";
import { PRODUCT_CATALOG, INFERENCE_RULES } from "./product-helpers";

/**
 * PRODUCT FIT ENGINE
 *
 * Goes beyond simple keyword inference to compute a scored product fit
 * for each company. Factors in:
 * - Category -> product mapping (MCA funders -> BSA + Fraud, equipment finance -> Application PDF)
 * - Company size/employees -> urgency (larger = more urgent need for automation)
 * - Description keywords -> pain points ("manual review" -> Co-Pilot, "compliance" -> IDV)
 * - News signals -> urgency boosts (funding round = scaling = BSA urgency)
 * - Sub-vertical alignment
 *
 * Returns sorted ProductFitSignal[] with top products first,
 * plus a recommendedProducts array (top 2-3 by combined score).
 */

// ---------------------------------------------------------------------------
// Category -> Product affinity weights (0-100 base applicability)
// ---------------------------------------------------------------------------

const CATEGORY_PRODUCT_AFFINITY: Record<string, Record<string, number>> = {
  funder: {
    bsa: 85,
    clear: 70,
    application_pdf: 75,
    fraud_detection: 75,
    stips_collection: 70,
    copilot: 65,
    identity_verification: 50,
    sic_naics: 55,
  },
  iso: {
    application_pdf: 80,
    clear: 60,
    bsa: 50,
    stips_collection: 55,
    identity_verification: 40,
    fraud_detection: 40,
    copilot: 30,
    sic_naics: 35,
  },
  marketplace: {
    identity_verification: 70,
    fraud_detection: 65,
    bsa: 55,
    application_pdf: 60,
    copilot: 40,
    clear: 35,
    sic_naics: 45,
    stips_collection: 30,
  },
  bank: {
    identity_verification: 80,
    fraud_detection: 75,
    bsa: 70,
    copilot: 60,
    clear: 55,
    application_pdf: 50,
    sic_naics: 45,
    stips_collection: 40,
  },
  technology: {
    identity_verification: 40,
    fraud_detection: 35,
    bsa: 25,
    copilot: 20,
    clear: 15,
    application_pdf: 20,
    sic_naics: 15,
    stips_collection: 10,
  },
  competitor: {
    // Low scores — competitors aren't buyers
    bsa: 5, clear: 5, application_pdf: 5, identity_verification: 5,
    sic_naics: 5, stips_collection: 5, fraud_detection: 5, copilot: 5,
  },
  service_provider: {
    identity_verification: 20,
    fraud_detection: 15,
    bsa: 10, clear: 10, application_pdf: 10,
    sic_naics: 10, stips_collection: 10, copilot: 10,
  },
};

// ---------------------------------------------------------------------------
// Sub-vertical product boosts (added on top of category base)
// ---------------------------------------------------------------------------

const SUB_VERTICAL_BOOSTS: Record<string, Record<string, number>> = {
  mca: { bsa: 15, fraud_detection: 15, stips_collection: 10, copilot: 10 },
  equipment_finance: { application_pdf: 15, identity_verification: 10, stips_collection: 10 },
  sba_lending: { application_pdf: 15, identity_verification: 15, sic_naics: 15, stips_collection: 10 },
  factoring: { bsa: 10, fraud_detection: 15, identity_verification: 10 },
  revenue_based: { bsa: 15, copilot: 10, fraud_detection: 10 },
  embedded_lending: { identity_verification: 15, fraud_detection: 15, bsa: 10 },
  commercial_real_estate: { application_pdf: 15, bsa: 10, stips_collection: 10 },
};

// ---------------------------------------------------------------------------
// Pain point keyword detection
// ---------------------------------------------------------------------------

interface PainPointRule {
  keywords: string[];
  productId: string;
  painPoint: string;
  applicabilityBoost: number;
}

const PAIN_POINT_RULES: PainPointRule[] = [
  // BSA-specific pains
  { keywords: ["manual review", "manual underwriting"], productId: "bsa", painPoint: "Manual bank statement review is a bottleneck", applicabilityBoost: 15 },
  { keywords: ["cash flow analysis", "cash flow"], productId: "bsa", painPoint: "Cash flow analysis is time-consuming", applicabilityBoost: 10 },
  { keywords: ["bank statement"], productId: "bsa", painPoint: "High volume of bank statements to process", applicabilityBoost: 10 },
  { keywords: ["high volume", "volume growth", "growing volume"], productId: "bsa", painPoint: "Growing application volume strains manual processes", applicabilityBoost: 12 },

  // Clear-specific pains
  { keywords: ["clear report", "lexisnexis"], productId: "clear", painPoint: "Manual CLEAR/LexisNexis report review", applicabilityBoost: 15 },
  { keywords: ["credit check", "bureau data"], productId: "clear", painPoint: "Credit bureau data needs automated parsing", applicabilityBoost: 10 },

  // Application PDF pains
  { keywords: ["iso submission", "broker submission", "deal submission"], productId: "application_pdf", painPoint: "ISO/broker submissions require manual intake", applicabilityBoost: 15 },
  { keywords: ["document intake", "application intake"], productId: "application_pdf", painPoint: "Application document intake is manual", applicabilityBoost: 12 },
  { keywords: ["pdf", "document processing"], productId: "application_pdf", painPoint: "PDF document processing needs automation", applicabilityBoost: 10 },

  // Identity verification pains
  { keywords: ["compliance", "aml", "kyc", "know your customer"], productId: "identity_verification", painPoint: "KYC/AML compliance requirements", applicabilityBoost: 15 },
  { keywords: ["identity fraud", "synthetic identity"], productId: "identity_verification", painPoint: "Identity fraud risk in applications", applicabilityBoost: 12 },
  { keywords: ["onboarding", "customer verification"], productId: "identity_verification", painPoint: "Customer onboarding verification needed", applicabilityBoost: 10 },

  // SIC/NAICS pains
  { keywords: ["industry classification", "merchant category"], productId: "sic_naics", painPoint: "Manual industry classification slows underwriting", applicabilityBoost: 12 },
  { keywords: ["restricted industry", "prohibited industry"], productId: "sic_naics", painPoint: "Restricted industry screening is critical", applicabilityBoost: 15 },

  // Stips collection pains
  { keywords: ["stipulation", "stips", "missing document", "document follow"], productId: "stips_collection", painPoint: "Stipulation collection delays closings", applicabilityBoost: 15 },
  { keywords: ["closing document", "closing delays"], productId: "stips_collection", painPoint: "Document collection delays deal closings", applicabilityBoost: 12 },

  // Fraud detection pains
  { keywords: ["fraud", "stacking", "duplicate application"], productId: "fraud_detection", painPoint: "Application stacking and fraud risk", applicabilityBoost: 15 },
  { keywords: ["document tampering", "altered document"], productId: "fraud_detection", painPoint: "Document tampering detection needed", applicabilityBoost: 15 },
  { keywords: ["risk management", "loss rate"], productId: "fraud_detection", painPoint: "High loss rates suggest fraud exposure", applicabilityBoost: 12 },

  // Co-Pilot pains
  { keywords: ["automation", "automate underwriting", "auto-decisioning"], productId: "copilot", painPoint: "Seeking full underwriting automation", applicabilityBoost: 15 },
  { keywords: ["straight-through processing", "stp"], productId: "copilot", painPoint: "Wants straight-through processing", applicabilityBoost: 15 },
  { keywords: ["underwriter capacity", "underwriter bottleneck", "hiring underwriters"], productId: "copilot", painPoint: "Underwriter capacity is a constraint", applicabilityBoost: 12 },
  { keywords: ["scaling", "scale operations"], productId: "copilot", painPoint: "Scaling operations without proportional hiring", applicabilityBoost: 10 },
];

// ---------------------------------------------------------------------------
// News signal urgency detection
// ---------------------------------------------------------------------------

interface NewsSignal {
  pattern: RegExp;
  urgencyBoost: number;
  products: string[]; // which products get the urgency boost
}

const NEWS_SIGNALS: NewsSignal[] = [
  { pattern: /securitiz|raise|series|funding|capital|million|billion/i, urgencyBoost: 20, products: ["bsa", "copilot", "fraud_detection"] },
  { pattern: /hire|appoint|new.*chief|new.*head|new.*vp|expand.*team/i, urgencyBoost: 15, products: ["copilot", "bsa"] },
  { pattern: /regulat|compliance|law|enforcement/i, urgencyBoost: 20, products: ["identity_verification", "fraud_detection", "clear"] },
  { pattern: /launch|new product|expand.*product/i, urgencyBoost: 15, products: ["application_pdf", "bsa", "stips_collection"] },
  { pattern: /partner|acquisition|acquire/i, urgencyBoost: 12, products: ["bsa", "copilot", "fraud_detection"] },
  { pattern: /record.*volume|milestone|growth/i, urgencyBoost: 15, products: ["bsa", "copilot", "stips_collection"] },
];

// ---------------------------------------------------------------------------
// Competitor -> product mapping (what they use now)
// ---------------------------------------------------------------------------

const COMPETITOR_PRODUCT_MAP: Record<string, { productId: string; name: string }[]> = {
  ocrolus: [{ productId: "bsa", name: "Ocrolus (BSA)" }],
  plaid: [{ productId: "bsa", name: "Plaid (bank data)" }],
  onfido: [{ productId: "identity_verification", name: "Onfido (IDV)" }],
  jumio: [{ productId: "identity_verification", name: "Jumio (IDV)" }],
  alloy: [{ productId: "identity_verification", name: "Alloy (IDV)" }, { productId: "fraud_detection", name: "Alloy (fraud)" }],
  socure: [{ productId: "identity_verification", name: "Socure (IDV)" }, { productId: "fraud_detection", name: "Socure (fraud)" }],
  "data visor": [{ productId: "fraud_detection", name: "DataVisor (fraud)" }],
  emailage: [{ productId: "fraud_detection", name: "Emailage (fraud)" }],
  lexisnexis: [{ productId: "clear", name: "LexisNexis (CLEAR)" }],
};

// ---------------------------------------------------------------------------
// Product-specific talking point templates
// ---------------------------------------------------------------------------

const PRODUCT_TALKING_POINTS: Record<string, (company: Company) => string> = {
  bsa: (c) => {
    const vol = c.employees && c.employees > 50 ? "high" : "growing";
    return `At ${c.name}'s ${vol} origination volume, bank statement analysis likely takes significant underwriter time. HyperVerge cuts that to under 5 minutes per file with 98%+ extraction accuracy.`;
  },
  clear: (_c) => {
    return `Automated CLEAR report parsing eliminates manual data entry from 50+ page reports — your underwriters get structured risk data in seconds, not 15 minutes.`;
  },
  application_pdf: (c) => {
    const isISO = c.category === "iso";
    return isISO
      ? `Standardize every ISO submission into structured data automatically. No more inconsistent formats, missing fields, or manual re-entry.`
      : `AI-powered application intake extracts and validates all fields from loan applications — PDF, email, or fax — in seconds.`;
  },
  identity_verification: (c) => {
    const isBank = c.category === "bank";
    return isBank
      ? `Bank-grade KYC/IDV with face match, document verification, and OFAC screening — SOC 2 certified and fully auditable for regulatory compliance.`
      : `Real-time identity verification catches synthetic identities before they enter your pipeline — 94% catch rate on fraudulent IDs.`;
  },
  sic_naics: (_c) => {
    return `AI-powered SIC/NAICS classification in seconds — no more manual lookups or misclassified merchants slipping through restricted industry filters.`;
  },
  stips_collection: (c) => {
    const size = c.employees && c.employees > 50 ? "At your volume" : "For growing lenders";
    return `${size}, stips collection compressed from days to hours — automated follow-up, verification, and tracking until every stipulation is satisfied.`;
  },
  fraud_detection: (c) => {
    const vol = c.employees && c.employees > 100 ? "thousands of" : "hundreds of";
    return `With ${vol} applications, even a 2% synthetic identity rate costs tens of thousands. HyperVerge's AI catches 94% of fraudulent applications before funding.`;
  },
  copilot: (c) => {
    const name = c.name;
    return `Full underwriting automation for ${name}: 40 minutes per decision down to under 5. Your underwriters become reviewers, not data entry clerks — 5-8x throughput increase.`;
  },
};

// ---------------------------------------------------------------------------
// Main computation function
// ---------------------------------------------------------------------------

export interface ProductFitResult {
  signals: ProductFitSignal[];
  recommendedProducts: string[];
}

export function computeProductFit(company: Company): ProductFitResult {
  const category = company.category || "funder";
  const subVertical = company.subVertical;
  const desc = (company.desc || "").toLowerCase();
  const notes = (company.notes || "").toLowerCase();
  const corpus = [desc, notes, ...(company.tp || []).map(t => t.toLowerCase())].join(" ");

  // Gather news text
  const newsText = (company.news || []).map(n => `${n.h} ${n.d}`).join(" ").toLowerCase();

  const productScores: Map<string, {
    applicability: number;
    urgency: number;
    painPoints: string[];
    competitorProducts: string[];
  }> = new Map();

  // Initialize all products
  for (const product of PRODUCT_CATALOG) {
    productScores.set(product.id, {
      applicability: 0,
      urgency: 0,
      painPoints: [],
      competitorProducts: [],
    });
  }

  // 1. Category base scores
  const categoryAffinities = CATEGORY_PRODUCT_AFFINITY[category];
  if (categoryAffinities) {
    for (const [productId, score] of Object.entries(categoryAffinities)) {
      const existing = productScores.get(productId);
      if (existing) existing.applicability = score;
    }
  }

  // 2. Sub-vertical boosts
  if (subVertical && SUB_VERTICAL_BOOSTS[subVertical]) {
    for (const [productId, boost] of Object.entries(SUB_VERTICAL_BOOSTS[subVertical])) {
      const existing = productScores.get(productId);
      if (existing) existing.applicability = Math.min(100, existing.applicability + boost);
    }
  }

  // 3. Keyword inference (from existing INFERENCE_RULES)
  for (const rule of INFERENCE_RULES) {
    const keywordMatch = rule.keywords.some(kw => corpus.includes(kw));
    if (keywordMatch) {
      const existing = productScores.get(rule.productId);
      if (existing) {
        existing.applicability = Math.min(100, existing.applicability + 10);
      }
    }
  }

  // 4. Pain point detection
  for (const rule of PAIN_POINT_RULES) {
    const match = rule.keywords.some(kw => corpus.includes(kw));
    if (match) {
      const existing = productScores.get(rule.productId);
      if (existing) {
        existing.applicability = Math.min(100, existing.applicability + rule.applicabilityBoost);
        if (!existing.painPoints.includes(rule.painPoint)) {
          existing.painPoints.push(rule.painPoint);
        }
      }
    }
  }

  // 5. Employee count -> urgency scaling
  // Larger companies have more urgent need for automation
  const employees = company.employees || 0;
  if (employees > 0) {
    let sizeUrgency = 0;
    if (employees >= 500) sizeUrgency = 30;
    else if (employees >= 200) sizeUrgency = 25;
    else if (employees >= 100) sizeUrgency = 20;
    else if (employees >= 50) sizeUrgency = 15;
    else if (employees >= 20) sizeUrgency = 10;
    else sizeUrgency = 5;

    for (const [, scores] of productScores) {
      // Only boost urgency for products with some applicability
      if (scores.applicability > 20) {
        scores.urgency = Math.min(100, scores.urgency + sizeUrgency);
      }
    }
  }

  // 6. News signal urgency boosts
  for (const signal of NEWS_SIGNALS) {
    if (signal.pattern.test(newsText)) {
      for (const productId of signal.products) {
        const existing = productScores.get(productId);
        if (existing && existing.applicability > 20) {
          existing.urgency = Math.min(100, existing.urgency + signal.urgencyBoost);
        }
      }
    }
  }

  // 7. Company type urgency adjustments
  if (company.type === "SQO") {
    // SQOs are strategic — boost urgency across the board
    for (const [, scores] of productScores) {
      if (scores.applicability > 30) {
        scores.urgency = Math.min(100, scores.urgency + 20);
      }
    }
  } else if (company.type === "Client") {
    // Clients -> expansion urgency for products they don't already have
    for (const [, scores] of productScores) {
      if (scores.applicability > 30) {
        scores.urgency = Math.min(100, scores.urgency + 10);
      }
    }
  }

  // 8. Competitor product detection
  for (const [competitor, products] of Object.entries(COMPETITOR_PRODUCT_MAP)) {
    if (corpus.includes(competitor) || newsText.includes(competitor)) {
      for (const { productId, name } of products) {
        const existing = productScores.get(productId);
        if (existing) {
          if (!existing.competitorProducts.includes(name)) {
            existing.competitorProducts.push(name);
          }
          // Competitor usage validates the product need but lowers urgency slightly
          // (they have something, but we can displace it)
          existing.applicability = Math.min(100, existing.applicability + 5);
        }
      }
    }
  }

  // 9. Build sorted ProductFitSignal array
  const signals: ProductFitSignal[] = [];

  for (const product of PRODUCT_CATALOG) {
    const scores = productScores.get(product.id);
    if (!scores) continue;

    // Only include products with meaningful applicability
    if (scores.applicability < 25) continue;

    // Generate product-specific talking point
    const talkingPointFn = PRODUCT_TALKING_POINTS[product.id];
    const talkingPoint = talkingPointFn ? talkingPointFn(company) : product.description;

    signals.push({
      productId: product.id,
      productName: product.name,
      applicability: Math.round(scores.applicability),
      urgency: Math.round(scores.urgency),
      painPoints: scores.painPoints.slice(0, 3), // top 3 pain points
      competitorProducts: scores.competitorProducts,
      talkingPoint,
    });
  }

  // Sort by combined score (applicability + urgency), descending
  signals.sort((a, b) => (b.applicability + b.urgency) - (a.applicability + a.urgency));

  // Top 2-3 recommended products
  const recommendedProducts = signals
    .slice(0, Math.min(3, signals.length))
    .filter(s => s.applicability >= 40) // minimum threshold for recommendation
    .map(s => s.productId);

  return { signals, recommendedProducts };
}

// ---------------------------------------------------------------------------
// Product-specific talking points generator (for external use)
// ---------------------------------------------------------------------------

export function generateProductTalkingPoints(
  company: Company,
  productFit: ProductFitSignal[]
): string[] {
  return productFit
    .filter(pf => pf.applicability >= 40)
    .slice(0, 3)
    .map(pf => pf.talkingPoint);
}

// ---------------------------------------------------------------------------
// Get combined score label for display
// ---------------------------------------------------------------------------

export function getProductFitLabel(signal: ProductFitSignal): string {
  const combined = signal.applicability + signal.urgency;
  if (combined >= 150) return "Strong Fit";
  if (combined >= 100) return "Good Fit";
  if (combined >= 60) return "Moderate Fit";
  return "Possible Fit";
}

export function getProductFitColor(signal: ProductFitSignal): string {
  const combined = signal.applicability + signal.urgency;
  if (combined >= 150) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (combined >= 100) return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (combined >= 60) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-muted/50 text-muted-foreground border-border";
}

export function getProductFitBadgeColor(signal: ProductFitSignal): string {
  const combined = signal.applicability + signal.urgency;
  if (combined >= 150) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (combined >= 100) return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  return "bg-purple-500/15 text-purple-400 border-purple-500/30";
}
