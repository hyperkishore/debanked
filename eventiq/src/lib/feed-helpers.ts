import { Company, NewsItem } from "./types";

export type SignalType = "funding" | "product" | "partnership" | "hiring" | "regulatory" | "milestone" | "general";
export type SignalHeat = "hot" | "warm" | "cool";

export interface FeedItem {
  id: string;
  companyId: number;
  companyName: string;
  companyType: string;
  headline: string;
  source: string;
  description: string;
  signalType: SignalType;
  heat: SignalHeat;
  dateEstimate: number; // timestamp for sorting
}

export interface MarketStat {
  label: string;
  value: string;
  subtext?: string;
}

export interface IndustryTheme {
  title: string;
  description: string;
  companies: string[];
  hvAngle: string; // HyperVerge positioning angle
}

// Parse date from news item — uses `p` (published_at ISO) if available, falls back to source string
function parseDateFromNews(news: NewsItem): number {
  // Prefer structured published_at field
  if (news.p) {
    const ts = new Date(news.p).getTime();
    if (!isNaN(ts)) return ts;
  }
  return parseDateFromSource(news.s || "");
}

// Fallback: parse date from source strings like "Yahoo Finance, Dec 2025"
function parseDateFromSource(source: string): number {
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  // Try "Mon YYYY" pattern
  const monthYearMatch = source.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})\b/i);
  if (monthYearMatch) {
    const month = months[monthYearMatch[1].toLowerCase().slice(0, 3)];
    const year = parseInt(monthYearMatch[2]);
    if (!isNaN(month) && !isNaN(year)) {
      return new Date(year, month, 15).getTime();
    }
  }

  // Try "YYYY" only
  const yearMatch = source.match(/\b(202[3-9])\b/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1]), 6, 1).getTime();
  }

  // Default to old date
  return new Date(2024, 0, 1).getTime();
}

// Classify news by signal type based on headline/description keywords
function classifySignal(headline: string, description: string): SignalType {
  const text = `${headline} ${description}`.toLowerCase();

  if (/securitiz|abs|credit facilit|funding round|raise|series [a-f]|warehouse|capital|million|billion|\$\d/.test(text)) return "funding";
  if (/partner|integrat|collaborat|alliance|joined|embedded|api/.test(text)) return "partnership";
  if (/launch|new product|new feature|platform|tool|service|division/.test(text)) return "product";
  if (/hire|appoint|ceo|cro|ciso|cmo|chief|new leadership|new head/.test(text)) return "hiring";
  if (/regulat|compliance|law|bill|act|fda|fcc|fdic|sba|ftc|settlement/.test(text)) return "regulatory";
  if (/milestone|surpass|\d+b|\d+m|record|award|ranked|best|fastest/.test(text)) return "milestone";

  return "general";
}

// Determine signal heat
function classifyHeat(company: Company, newsItem: NewsItem, dateEstimate: number): SignalHeat {
  const sixMonthsAgo = Date.now() - 180 * 86400000;
  const isRecent = dateEstimate > sixMonthsAgo;

  // SQO and Client companies are always hot
  if (company.type === "SQO" || company.type === "Client") return "hot";

  // Recent news from ICP companies
  if (company.type === "ICP" && isRecent) return "hot";

  // Recent news with funding/product signals
  const text = `${newsItem.h} ${newsItem.d}`.toLowerCase();
  if (isRecent && /securitiz|abs|million|billion|launch|ai|patent/.test(text)) return "hot";

  if (isRecent) return "warm";
  return "cool";
}

export function buildFeedItems(companies: Company[]): FeedItem[] {
  const items: FeedItem[] = [];

  for (const company of companies) {
    if (!company.news || company.news.length === 0) continue;

    for (const news of company.news) {
      if (!news.h || news.h.length < 5) continue;

      const dateEstimate = parseDateFromNews(news);
      const signalType = classifySignal(news.h, news.d || "");
      const heat = classifyHeat(company, news, dateEstimate);

      items.push({
        id: `${company.id}-${news.h.slice(0, 20)}`,
        companyId: company.id,
        companyName: company.name,
        companyType: company.type,
        headline: news.h,
        source: news.s,
        description: news.d || "",
        signalType,
        heat,
        dateEstimate,
      });
    }
  }

  // Sort by date descending (most recent first)
  items.sort((a, b) => b.dateEstimate - a.dateEstimate);

  return items;
}

export function getHotSignals(items: FeedItem[], limit = 15): FeedItem[] {
  return items.filter((i) => i.heat === "hot").slice(0, limit);
}

export function getFundingActivity(items: FeedItem[], limit = 12): FeedItem[] {
  return items.filter((i) => i.signalType === "funding").slice(0, limit);
}

export function getProductLaunches(items: FeedItem[], limit = 10): FeedItem[] {
  return items.filter((i) => i.signalType === "product" || i.signalType === "partnership").slice(0, limit);
}

export function getMarketStats(companies: Company[]): MarketStat[] {
  const total = companies.length;
  const sqo = companies.filter((c) => c.type === "SQO").length;
  const client = companies.filter((c) => c.type === "Client").length;
  const icp = companies.filter((c) => c.type === "ICP").length;
  const tam = companies.filter((c) => c.type === "TAM").length;
  const withNews = companies.filter((c) => c.news && c.news.length > 0).length;
  const totalLeaders = companies.reduce((sum, c) => sum + (c.leaders?.length || 0), 0);
  const totalNews = companies.reduce((sum, c) => sum + (c.news?.length || 0), 0);

  return [
    { label: "Market Size", value: "$25.4B", subtext: "projected 2029 (6.6% CAGR)" },
    { label: "Companies Tracked", value: total.toLocaleString(), subtext: `${sqo} SQO, ${client} Client, ${icp} ICP, ${tam} TAM` },
    { label: "Decision-Makers", value: totalLeaders.toLocaleString(), subtext: "researched leaders with backgrounds" },
    { label: "Intel Items", value: totalNews.toLocaleString(), subtext: `across ${withNews} companies` },
  ];
}

export function getIndustryThemes(): IndustryTheme[] {
  return [
    {
      title: "ABS/Securitization Wave",
      description: "Multiple companies completed record securitizations in 2025. ABS investors require institutional-grade underwriting documentation and verification audit trails.",
      companies: ["Forward Financing", "Kapitus", "BHG Financial", "Mulligan Funding", "Libertas"],
      hvAngle: "Position as enabling 'ABS-ready' underwriting with compliant document verification",
    },
    {
      title: "AI Underwriting Arms Race",
      description: "Companies are building or patenting AI lending systems. These systems are only as good as their input data quality.",
      companies: ["ByzFunder", "Credibly", "OnDeck", "Clearco"],
      hvAngle: "OCR and verification as the 'data quality layer' for AI decisioning",
    },
    {
      title: "Regulatory Compliance Pressure",
      description: "Texas HB 700, North Dakota expansions, FTC enforcement. Companies need verified documentation to survive regulatory scrutiny.",
      companies: ["Biz2Credit", "Kapitus", "Fundbox"],
      hvAngle: "Compliance-grade verification that satisfies state-level disclosure requirements",
    },
    {
      title: "Embedded Lending Growth",
      description: "Companies are embedding capital directly into SaaS/platform workflows. Each new platform integration requires automated onboarding verification.",
      companies: ["Fundbox", "Wayflyer", "Lendio", "ClickLease", "Revenued"],
      hvAngle: "Embedded verification APIs that plug into platform partner integrations",
    },
    {
      title: "Fraud Prevention Priority",
      description: "Identity verification and document authenticity are top priorities. MCA CRMs now integrate with TruePic, Heron Data, Plaid, Ocrolus.",
      companies: ["CAN Capital", "OnDeck", "ByzFunder"],
      hvAngle: "Compete/complement existing verification stack (Ocrolus, Plaid) with superior OCR accuracy",
    },
  ];
}

export const SIGNAL_TYPE_CONFIG: Record<SignalType, { label: string; color: string; icon: string }> = {
  funding: { label: "Funding", color: "text-green-400", icon: "$" },
  product: { label: "Product", color: "text-blue-400", icon: "P" },
  partnership: { label: "Partnership", color: "text-purple-400", icon: "H" },
  hiring: { label: "Hiring", color: "text-yellow-400", icon: "U" },
  regulatory: { label: "Regulatory", color: "text-red-400", icon: "R" },
  milestone: { label: "Milestone", color: "text-orange-400", icon: "M" },
  general: { label: "News", color: "text-gray-400", icon: "N" },
};
