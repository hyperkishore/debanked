import { Company } from "./types";
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
      socialProof: "PIRS Capital runs their entire underwriting on HyperVerge with 99.9% uptime.",
      category: 'trust',
    });
  }

  if (company.type === 'ICP' || company.type === 'SQO') {
    cards.push({
      trigger: "We've built our own underwriting system in-house.",
      response: "Many of our best customers started with in-house tools. The challenge is maintaining and scaling them. HyperVerge plugs into your existing stack via API — you keep your logic, we handle document extraction, identity verification, and bank statement analysis at scale.",
      socialProof: "FundKite uses their own proprietary stack alongside HyperVerge for document extraction — best of both worlds.",
      category: 'competition',
    });
  }

  if (company.type === 'TAM') {
    cards.push({
      trigger: "Who is HyperVerge? We haven't heard of you.",
      response: "We're an AI company powering 450+ financial services enterprises globally. Our underwriting AI Co-Pilot cuts decision time from 40 minutes to under 5. We work with MCA lenders, equipment finance, SBA — the full spectrum.",
      socialProof: "450+ lenders on the platform including PIRS Capital, with $10B+ in applications processed.",
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

  // Deduplicate by trigger (in case rules overlap)
  const seen = new Set<string>();
  return cards.filter((c) => {
    if (seen.has(c.trigger)) return false;
    seen.add(c.trigger);
    return true;
  });
}
