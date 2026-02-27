import { Company, HubSpotDeal, CompanyCategory } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductModule {
  id: string;
  name: string;
  description: string;
  iconHint: string; // lucide-react icon name
}

export type ProductStatusLevel = "active" | "negotiation" | "prospect" | "not_applicable";

export interface ProductStatus {
  product: ProductModule;
  status: ProductStatusLevel;
  dealInfo?: {
    dealName: string;
    stage: string;
    amount?: number;
  };
  source: "hubspot" | "inferred";
}

// ---------------------------------------------------------------------------
// Product Catalog
// ---------------------------------------------------------------------------

export const PRODUCT_CATALOG: ProductModule[] = [
  {
    id: "bsa",
    name: "BSA",
    description: "AI-powered bank statement parsing and cash flow analysis",
    iconHint: "FileSpreadsheet",
  },
  {
    id: "clear",
    name: "Clear",
    description: "Automated CLEAR report analysis for credit and fraud checks",
    iconHint: "ShieldCheck",
  },
  {
    id: "application_pdf",
    name: "Application PDF",
    description: "AI intake and parsing of loan application documents",
    iconHint: "FileText",
  },
  {
    id: "identity_verification",
    name: "Identity Verification",
    description: "KYC/IDV with face match and document verification",
    iconHint: "ScanFace",
  },
  {
    id: "sic_naics",
    name: "SIC/NAICS Classification",
    description: "Industry classification for underwriting decisions",
    iconHint: "Tags",
  },
  {
    id: "stips_collection",
    name: "Stips Collection",
    description: "Stipulation document collection and verification",
    iconHint: "ClipboardCheck",
  },
  {
    id: "fraud_detection",
    name: "Fraud Detection",
    description: "Synthetic identity, document tampering, application stacking detection",
    iconHint: "AlertTriangle",
  },
  {
    id: "copilot",
    name: "Co-Pilot",
    description: "Full underwriting automation platform with AI-powered decisions",
    iconHint: "Bot",
  },
];

const PRODUCT_BY_ID: Record<string, ProductModule> = {};
for (const p of PRODUCT_CATALOG) {
  PRODUCT_BY_ID[p.id] = p;
}

export function getProductById(id: string): ProductModule | undefined {
  return PRODUCT_BY_ID[id];
}

// ---------------------------------------------------------------------------
// Deal name -> product ID mapping
// ---------------------------------------------------------------------------

/**
 * Maps raw product strings (from deal names or the `product` field) to catalog IDs.
 * Handles common variations, abbreviations, and compound products ("BSA + Clear").
 */
const PRODUCT_ALIASES: Record<string, string> = {
  // BSA
  bsa: "bsa",
  "bank statement": "bsa",
  "bank statement analysis": "bsa",
  // Clear
  clear: "clear",
  "clear report": "clear",
  "clear parsing": "clear",
  // Application PDF
  "application pdf": "application_pdf",
  "app pdf": "application_pdf",
  "pdf parsing": "application_pdf",
  // Identity Verification
  "identity verification": "identity_verification",
  idv: "identity_verification",
  kyc: "identity_verification",
  "face match": "identity_verification",
  // SIC/NAICS
  "sic/naics": "sic_naics",
  "sic naics": "sic_naics",
  sic: "sic_naics",
  naics: "sic_naics",
  "industry classification": "sic_naics",
  // Stips
  stips: "stips_collection",
  "stips collection": "stips_collection",
  stipulation: "stips_collection",
  stipulations: "stips_collection",
  // Fraud Detection
  fraud: "fraud_detection",
  "fraud detection": "fraud_detection",
  // Co-Pilot
  copilot: "copilot",
  "co-pilot": "copilot",
  "ai copilot": "copilot",
  "underwriting copilot": "copilot",
  // MCA is not a product but a vertical — map to BSA as the primary product sold to MCA companies
  mca: "bsa",
};

function resolveProductIds(raw: string): string[] {
  if (!raw) return [];

  const lower = raw.toLowerCase().trim();

  // Handle compound products: "BSA + Clear", "BSA & Clear", "BSA, Clear"
  const parts = lower.split(/\s*[+&,]\s*/);
  const ids = new Set<string>();

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const mapped = PRODUCT_ALIASES[trimmed];
    if (mapped) {
      ids.add(mapped);
    } else {
      // Partial match: check if any alias key is contained in the part
      for (const [alias, productId] of Object.entries(PRODUCT_ALIASES)) {
        if (trimmed.includes(alias) || alias.includes(trimmed)) {
          ids.add(productId);
          break;
        }
      }
    }
  }

  return Array.from(ids);
}

// ---------------------------------------------------------------------------
// HubSpot stage -> ProductStatusLevel mapping
// ---------------------------------------------------------------------------

const STAGE_TO_STATUS: Record<string, ProductStatusLevel | "skip"> = {
  // Active
  "agreement signed & go live ready": "active",
  "closed won (gone live)": "active",
  "scaled up": "active",
  "closed won": "active",
  "gone live": "active",
  // Negotiation
  "poc & tech evaluation": "negotiation",
  "commercial negotiation": "negotiation",
  implementation: "negotiation",
  "poc": "negotiation",
  "tech evaluation": "negotiation",
  // Prospect
  "discovery ongoing": "prospect",
  "pre qualified opportunity": "prospect",
  "qualified opportunity": "prospect",
  "yet to contact": "prospect",
  // Skip (don't show)
  "closed lost": "skip",
  "revisit later": "skip",
};

function mapStageToStatus(stageLabel: string): ProductStatusLevel | "skip" {
  const lower = stageLabel.toLowerCase().trim();

  // Exact match first
  if (STAGE_TO_STATUS[lower] !== undefined) {
    return STAGE_TO_STATUS[lower];
  }

  // Partial match: check if the stage contains key phrases
  if (lower.includes("closed won") || lower.includes("go live") || lower.includes("scaled")) {
    return "active";
  }
  if (lower.includes("poc") || lower.includes("evaluation") || lower.includes("negotiation") || lower.includes("implementation")) {
    return "negotiation";
  }
  if (lower.includes("closed lost") || lower.includes("revisit")) {
    return "skip";
  }
  if (lower.includes("discovery") || lower.includes("qualified") || lower.includes("contact")) {
    return "prospect";
  }

  // Default: treat unknown stages as prospect
  return "prospect";
}

// ---------------------------------------------------------------------------
// Detect products from HubSpot deals
// ---------------------------------------------------------------------------

/**
 * Parses HubSpot deals to determine which products are sold/in-pipeline.
 * Returns one ProductStatus per unique product, using the "best" status
 * when multiple deals reference the same product (active > negotiation > prospect).
 */
export function detectProductsFromDeals(deals: HubSpotDeal[]): ProductStatus[] {
  if (!deals || deals.length === 0) return [];

  // Accumulate: productId -> best ProductStatus
  const bestByProduct = new Map<string, ProductStatus>();

  const statusPriority: Record<ProductStatusLevel, number> = {
    active: 3,
    negotiation: 2,
    prospect: 1,
    not_applicable: 0,
  };

  for (const deal of deals) {
    const stage = deal.stageLabel || deal.stage || "";
    const statusLevel = mapStageToStatus(stage);
    if (statusLevel === "skip") continue;

    // Determine product IDs from the deal
    const rawProduct = deal.product || "";
    let productIds = resolveProductIds(rawProduct);

    // If no product field, try parsing from deal name (after the dash)
    if (productIds.length === 0 && deal.dealName) {
      const dashParts = deal.dealName.split(/\s*-\s*/);
      if (dashParts.length >= 2) {
        const suffix = dashParts[dashParts.length - 1].trim();
        productIds = resolveProductIds(suffix);
      }
    }

    // If still nothing, skip this deal for product detection
    if (productIds.length === 0) continue;

    for (const productId of productIds) {
      const product = PRODUCT_BY_ID[productId];
      if (!product) continue;

      const existing = bestByProduct.get(productId);
      const newPriority = statusPriority[statusLevel];
      const existingPriority = existing ? statusPriority[existing.status] : -1;

      if (newPriority > existingPriority) {
        bestByProduct.set(productId, {
          product,
          status: statusLevel,
          dealInfo: {
            dealName: deal.dealName,
            stage,
            amount: deal.amount,
          },
          source: "hubspot",
        });
      }
    }
  }

  // Sort: active first, then negotiation, then prospect
  return Array.from(bestByProduct.values()).sort(
    (a, b) => statusPriority[b.status] - statusPriority[a.status]
  );
}

// ---------------------------------------------------------------------------
// Infer applicable products from company profile
// ---------------------------------------------------------------------------

/**
 * Keyword rules: if company description, talking points, or category suggest
 * a product could be relevant, include it as a "prospect" with source "inferred".
 * Skips products already detected from deals.
 */
interface InferenceRule {
  productId: string;
  keywords: string[];
  categories?: CompanyCategory[];
}

const INFERENCE_RULES: InferenceRule[] = [
  {
    productId: "bsa",
    keywords: [
      "bank statement", "cash flow", "underwriting", "mca", "merchant cash advance",
      "origination", "funding volume", "applications per", "loan processing",
      "revenue based", "working capital", "small business lending",
    ],
    categories: ["funder"],
  },
  {
    productId: "clear",
    keywords: [
      "clear report", "credit check", "fraud check", "background check",
      "risk assessment", "credit analysis", "lexisnexis", "bureau",
    ],
    categories: ["funder", "iso"],
  },
  {
    productId: "application_pdf",
    keywords: [
      "application", "intake", "loan application", "pdf", "document processing",
      "iso", "broker submission", "submissions", "deal submission",
    ],
    categories: ["funder", "iso"],
  },
  {
    productId: "identity_verification",
    keywords: [
      "kyc", "identity", "verification", "fraud prevention", "onboarding",
      "compliance", "aml", "know your customer", "id verification",
    ],
  },
  {
    productId: "sic_naics",
    keywords: [
      "industry classification", "sic", "naics", "business classification",
      "merchant category", "mcc", "underwriting criteria",
    ],
  },
  {
    productId: "stips_collection",
    keywords: [
      "stipulation", "stips", "document collection", "missing documents",
      "document follow-up", "closing documents",
    ],
    categories: ["funder"],
  },
  {
    productId: "fraud_detection",
    keywords: [
      "fraud", "stacking", "synthetic identity", "document tampering",
      "duplicate application", "risk management", "suspicious",
    ],
    categories: ["funder"],
  },
  {
    productId: "copilot",
    keywords: [
      "automation", "ai underwriting", "automated decisioning", "auto-decisioning",
      "underwriting automation", "full automation", "straight-through processing",
      "high volume", "scale underwriting",
    ],
    categories: ["funder"],
  },
];

export function inferApplicableProducts(
  company: Company,
  existingProductIds?: Set<string>
): ProductStatus[] {
  const skipIds = existingProductIds || new Set<string>();
  const results: ProductStatus[] = [];

  // Build a searchable text corpus from the company
  const corpus = [
    company.desc || "",
    ...(company.tp || []),
    company.notes || "",
    company.ice || "",
    ...(company.icebreakers || []),
  ]
    .join(" ")
    .toLowerCase();

  const category = company.category;

  for (const rule of INFERENCE_RULES) {
    if (skipIds.has(rule.productId)) continue;

    const product = PRODUCT_BY_ID[rule.productId];
    if (!product) continue;

    // Check keyword match
    const keywordMatch = rule.keywords.some((kw) => corpus.includes(kw));

    // Check category match (if rule has categories defined)
    const categoryMatch = rule.categories && category
      ? rule.categories.includes(category)
      : false;

    if (keywordMatch || categoryMatch) {
      results.push({
        product,
        status: "prospect",
        source: "inferred",
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Combined: get all product statuses for a company
// ---------------------------------------------------------------------------

/**
 * Returns the full product module view for a company:
 * 1. Products detected from HubSpot deals (with real status)
 * 2. Products inferred from company profile (as prospects)
 *
 * Products from deals take precedence over inferred ones.
 */
export function getCompanyProducts(company: Company): ProductStatus[] {
  const dealProducts = detectProductsFromDeals(company.hubspotDeals || []);
  const dealProductIds = new Set(dealProducts.map((ps) => ps.product.id));
  const inferredProducts = inferApplicableProducts(company, dealProductIds);

  return [...dealProducts, ...inferredProducts];
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

export function getStatusColor(status: ProductStatusLevel): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "negotiation":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "prospect":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "not_applicable":
      return "bg-muted/50 text-muted-foreground border-border";
  }
}

export function getStatusLabel(status: ProductStatusLevel): string {
  switch (status) {
    case "active":
      return "Active";
    case "negotiation":
      return "In Negotiation";
    case "prospect":
      return "Prospect";
    case "not_applicable":
      return "Not Applicable";
  }
}

export function getSourceLabel(source: "hubspot" | "inferred"): string {
  return source === "hubspot" ? "HubSpot Deal" : "AI Suggested";
}

/**
 * Summary counts for quick display: how many products are active, negotiating, etc.
 */
export function getProductSummary(statuses: ProductStatus[]): {
  active: number;
  negotiation: number;
  prospect: number;
  total: number;
} {
  let active = 0;
  let negotiation = 0;
  let prospect = 0;

  for (const ps of statuses) {
    switch (ps.status) {
      case "active":
        active++;
        break;
      case "negotiation":
        negotiation++;
        break;
      case "prospect":
        prospect++;
        break;
    }
  }

  return { active, negotiation, prospect, total: statuses.length };
}
