export type PersonaType = 'executive' | 'operations' | 'technical' | 'growth' | 'finance' | 'unknown';

export interface PersonaConfig {
  type: PersonaType;
  label: string;
  strategy: string;
  colorClass: string;
  talkingPointAngle: string;
  keywords: string[];
}

const PERSONA_CONFIGS: Record<PersonaType, PersonaConfig> = {
  executive: {
    type: 'executive',
    label: 'Executive',
    strategy: 'ROI & market positioning',
    colorClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    talkingPointAngle: 'market leadership and competitive advantage',
    keywords: ['ceo', 'founder', 'co-founder', 'president', 'owner', 'managing partner', 'managing director', 'principal', 'chairman', 'chairwoman'],
  },
  operations: {
    type: 'operations',
    label: 'Operations',
    strategy: 'Efficiency & automation',
    colorClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    talkingPointAngle: 'operational efficiency and process automation',
    keywords: ['vp ops', 'vp operations', 'coo', 'chief operating', 'underwriting', 'operations', 'head of ops', 'director of operations', 'svp operations'],
  },
  technical: {
    type: 'technical',
    label: 'Technical',
    strategy: 'API & platform capabilities',
    colorClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    talkingPointAngle: 'API integration and technical capabilities',
    keywords: ['cto', 'vp engineering', 'chief technology', 'head of engineering', 'director of engineering', 'vp technology', 'chief information', 'cio', 'architect'],
  },
  growth: {
    type: 'growth',
    label: 'Growth',
    strategy: 'Scale & competitive edge',
    colorClass: 'bg-green-500/15 text-green-400 border-green-500/30',
    talkingPointAngle: 'scaling revenue and competitive differentiation',
    keywords: ['vp sales', 'vp business development', 'chief revenue', 'cro', 'head of sales', 'director of sales', 'bd', 'business development', 'marketing', 'cmo', 'chief marketing', 'head of growth', 'vp growth', 'chief commercial'],
  },
  finance: {
    type: 'finance',
    label: 'Finance',
    strategy: 'Cost reduction & compliance',
    colorClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    talkingPointAngle: 'cost savings, risk mitigation, and compliance',
    keywords: ['cfo', 'chief financial', 'controller', 'vp finance', 'head of finance', 'director of finance', 'treasurer', 'chief risk', 'compliance'],
  },
  unknown: {
    type: 'unknown',
    label: 'Contact',
    strategy: 'General value prop',
    colorClass: 'bg-muted/50 text-muted-foreground border-border',
    talkingPointAngle: 'overall platform value',
    keywords: [],
  },
};

export function detectPersona(title: string): PersonaType {
  const lower = title.toLowerCase();

  // Check each persona type in priority order
  const order: PersonaType[] = ['executive', 'operations', 'technical', 'growth', 'finance'];
  for (const type of order) {
    const config = PERSONA_CONFIGS[type];
    if (config.keywords.some((kw) => lower.includes(kw))) {
      return type;
    }
  }

  return 'unknown';
}

export function getPersonaConfig(type: PersonaType): PersonaConfig {
  return PERSONA_CONFIGS[type];
}

/** Priority ranking for suggestion logic (lower = higher priority) */
export function getPersonaPriority(type: PersonaType): number {
  const priorities: Record<PersonaType, number> = {
    executive: 0,
    operations: 1,
    growth: 2,
    finance: 3,
    technical: 4,
    unknown: 5,
  };
  return priorities[type];
}
