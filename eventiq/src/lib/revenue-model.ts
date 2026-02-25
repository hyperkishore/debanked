import { Company, NewsItem } from "./types";

/**
 * REVENUE EXTRAPOLATION ENGINE
 * 
 * Based on 10 validated HubSpot deals, this model estimates the 
 * "Potential Deal Value" for companies in the pipeline.
 */

interface ModelWeights {
  baseACV: number;
  avgClientEmployees: number;
}

const DEFAULT_WEIGHTS: ModelWeights = {
  baseACV: 50000,           // Default ACV if no other data exists
  avgClientEmployees: 45,   // Average size of the 10-client cohort
};

// --- Multipliers ---
const MULTIPLIERS = {
  DIRECT_FUNDER: 1.8,
  ISO_BROKER: 0.8,
  HIGH_POSITION: 1.25,      // 3rd/4th position funders
  ENTERPRISE_TIER: 2.0,     // Mention of $1B+ or "National"
  COMPLIANCE_SIGNAL: 1.15,  // Regulatory triggers
};

/**
 * Extracts numeric volume from text (e.g., "$420M in funding")
 */
function extractVolume(text: string): number | null {
  const billionMatch = text.match(/\$(\d+(?:\.\d+)?)\s*B/i);
  if (billionMatch) return parseFloat(billionMatch[1]) * 1000000000;
  
  const millionMatch = text.match(/\$(\d+(?:\.\d+)?)\s*M/i);
  if (millionMatch) return parseFloat(millionMatch[1]) * 1000000;
  
  return null;
}

/**
 * Main Estimation Function
 */
export function estimateCompanyValue(company: Company): number {
  let value = DEFAULT_WEIGHTS.baseACV;
  const fullText = (company.desc + " " + (company.news || []).map(n => n.d).join(" ")).toLowerCase();

  // 1. Employee Scaling (Method 1)
  if (company.employees && company.employees > 0) {
    // Logarithmic scaling to prevent massive companies from breaking the chart
    // A 200 person company isn't 10x more valuable than a 20 person one, but maybe 3x.
    // Floor at log10(2)≈0.3 so companies with 1-2 employees still get ~18% of baseline, not zero
    const sizeRatio = Math.max(Math.log10(company.employees), 0.3) / Math.log10(DEFAULT_WEIGHTS.avgClientEmployees);
    value *= sizeRatio;
  }

  // 2. Volume Tiers (Method 2)
  const volume = extractVolume(fullText);
  if (volume && volume >= 1000000000) {
    value *= MULTIPLIERS.ENTERPRISE_TIER;
  } else if (fullText.includes("national") || fullText.includes("major")) {
    value *= 1.3;
  }

  // 3. Underwriting Model (Method 3)
  if (fullText.includes("direct funder") || fullText.includes("balance sheet")) {
    value *= MULTIPLIERS.DIRECT_FUNDER;
  } else if (fullText.includes("broker") || /\biso\b/.test(fullText)) {
    value *= MULTIPLIERS.ISO_BROKER;
  }

  // 4. Position/Complexity (Method 4)
  if (fullText.includes("4th position") || fullText.includes("3rd position") || fullText.includes("reverse consolidation")) {
    value *= MULTIPLIERS.HIGH_POSITION;
  }

  // 5. Compliance/Signals (Method 5)
  const hasComplianceSignal = (company.news || []).some(n => 
    n.h.toLowerCase().includes("texas") || 
    n.h.toLowerCase().includes("regulation") || 
    n.h.toLowerCase().includes("lawsuit")
  );
  if (hasComplianceSignal) {
    value *= MULTIPLIERS.COMPLIANCE_SIGNAL;
  }

  // Hard caps for realistic forecasting
  return Math.min(Math.max(value, 15000), 250000);
}

/**
 * Aggregate Value for a set of companies
 */
export function calculateTotalPotential(companies: Company[]): number {
  return companies.reduce((sum, c) => sum + estimateCompanyValue(c), 0);
}
