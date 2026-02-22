import { Company, CompanyType } from "./types";

/**
 * Sub-vertical classification for market map segmentation.
 */
export type SubVertical =
  | "MCA Funder"
  | "SBA Lender"
  | "Equipment Finance"
  | "Revenue-Based Finance"
  | "Factoring/Invoice"
  | "Fintech Infrastructure"
  | "Real Estate Lending"
  | "General Lending";

const SUB_VERTICAL_PATTERNS: { vertical: SubVertical; patterns: RegExp }[] = [
  { vertical: "MCA Funder", patterns: /\b(mca|merchant cash advance|cash advance|working capital advance)\b/i },
  { vertical: "SBA Lender", patterns: /\b(sba|small business administration|7\(a\)|504 loan)\b/i },
  { vertical: "Equipment Finance", patterns: /\b(equipment\s+(financ|leas|loan|fund))\b/i },
  { vertical: "Revenue-Based Finance", patterns: /\b(revenue[- ]based|rbf|revenue financ)\b/i },
  { vertical: "Factoring/Invoice", patterns: /\b(factor|invoice\s+(financ|fund|discount))\b/i },
  { vertical: "Fintech Infrastructure", patterns: /\b(fintech|platform|infrastruc|saas|underwriting|origination|servicing)\b/i },
  { vertical: "Real Estate Lending", patterns: /\b(real estate|commercial real|cre\b|mortgage|bridge loan)\b/i },
];

export function classifySubVertical(company: Company): SubVertical {
  const text = `${company.desc} ${company.name} ${(company.news || []).map(n => n.h).join(" ")}`;

  for (const { vertical, patterns } of SUB_VERTICAL_PATTERNS) {
    if (patterns.test(text)) {
      return vertical;
    }
  }
  return "General Lending";
}

/**
 * Signal heat classification for visual encoding.
 */
export type HeatLevel = "hot" | "warm" | "cool";

export function classifyCompanyHeat(company: Company): HeatLevel {
  // SQO/Client are always hot
  if (company.type === "SQO" || company.type === "Client") return "hot";

  // Check for recent news
  const hasRecentNews = (company.news || []).some((n) => {
    if (!n.p) return false;
    const pub = new Date(n.p);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return pub > sixMonthsAgo;
  });

  if (company.type === "ICP" && hasRecentNews) return "hot";
  if (hasRecentNews) return "warm";
  return "cool";
}

/**
 * Color mapping for company types and heat levels.
 */
export const TYPE_COLORS: Record<CompanyType, string> = {
  SQO: "hsl(0, 75%, 55%)",     // red
  Client: "hsl(38, 85%, 55%)", // gold
  ICP: "hsl(142, 55%, 45%)",   // green
  TAM: "hsl(215, 15%, 50%)",   // gray-blue
};

export const HEAT_COLORS: Record<HeatLevel, string> = {
  hot: "hsl(0, 75%, 55%)",
  warm: "hsl(38, 85%, 55%)",
  cool: "hsl(215, 15%, 50%)",
};

/**
 * Treemap hierarchy node structure (for nivo).
 */
export interface TreemapNode {
  id: string;
  name: string;
  value?: number;
  color?: string;
  children?: TreemapNode[];
  // Leaf-level company data
  companyId?: number;
  companyType?: CompanyType;
  heat?: HeatLevel;
  subVertical?: SubVertical;
  employees?: number;
}

/**
 * Build a hierarchy for the treemap:
 * Root → CompanyType → SubVertical → Company (leaf)
 */
export function buildTreemapHierarchy(
  companies: Company[],
  colorBy: "type" | "heat" = "type"
): TreemapNode {
  // Group companies by type, then by sub-vertical
  const typeGroups: Record<string, Record<string, Company[]>> = {};

  for (const company of companies) {
    const type = company.type;
    const subVertical = classifySubVertical(company);

    if (!typeGroups[type]) typeGroups[type] = {};
    if (!typeGroups[type][subVertical]) typeGroups[type][subVertical] = [];
    typeGroups[type][subVertical].push(company);
  }

  // Build tree
  const typeOrder: CompanyType[] = ["SQO", "Client", "ICP", "TAM"];
  const children: TreemapNode[] = [];

  for (const type of typeOrder) {
    const subGroups = typeGroups[type];
    if (!subGroups) continue;

    const subChildren: TreemapNode[] = [];

    for (const [subVertical, comps] of Object.entries(subGroups)) {
      const leafNodes: TreemapNode[] = comps.map((c) => {
        const heat = classifyCompanyHeat(c);
        return {
          id: `company-${c.id}`,
          name: c.name,
          value: Math.max(c.employees || 1, 1), // min 1 for visibility
          color: colorBy === "type" ? TYPE_COLORS[c.type] : HEAT_COLORS[heat],
          companyId: c.id,
          companyType: c.type,
          heat,
          subVertical: subVertical as SubVertical,
          employees: c.employees,
        };
      });

      subChildren.push({
        id: `${type}-${subVertical}`,
        name: subVertical,
        children: leafNodes,
      });
    }

    children.push({
      id: type,
      name: `${type} (${Object.values(subGroups).flat().length})`,
      children: subChildren,
    });
  }

  return {
    id: "root",
    name: "Market",
    children,
  };
}

/**
 * Filter companies for the market map.
 */
export interface MarketMapFilters {
  types: CompanyType[];
  heatLevels: HeatLevel[];
  subVerticals: SubVertical[];
}

export const DEFAULT_FILTERS: MarketMapFilters = {
  types: ["SQO", "Client", "ICP", "TAM"],
  heatLevels: ["hot", "warm", "cool"],
  subVerticals: [],
};

export function filterCompaniesForMap(
  companies: Company[],
  filters: MarketMapFilters
): Company[] {
  return companies.filter((c) => {
    // Type filter
    if (!filters.types.includes(c.type)) return false;

    // Heat filter
    const heat = classifyCompanyHeat(c);
    if (!filters.heatLevels.includes(heat)) return false;

    // Sub-vertical filter (if any selected)
    if (filters.subVerticals.length > 0) {
      const sv = classifySubVertical(c);
      if (!filters.subVerticals.includes(sv)) return false;
    }

    return true;
  });
}

/**
 * Get all unique sub-verticals from a set of companies.
 */
export function getSubVerticals(companies: Company[]): SubVertical[] {
  const set = new Set<SubVertical>();
  for (const c of companies) {
    set.add(classifySubVertical(c));
  }
  return Array.from(set).sort();
}
