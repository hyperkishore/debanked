import { PipelineStage } from "./pipeline-helpers";

export type Sentiment = 'interested' | 'neutral' | 'objection' | 'ghosting';

export interface SentimentConfig {
  label: string;
  emoji: string;
  colorClass: string;
  bgClass: string;
  suggestedNextStep: string;
  followUpDays: number;
  suggestedAction: string;
  pipelineStage: PipelineStage;
}

const SENTIMENT_CONFIGS: Record<Sentiment, SentimentConfig> = {
  interested: {
    label: 'Interested',
    emoji: '🟢',
    colorClass: 'text-green-400',
    bgClass: 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20',
    suggestedNextStep: 'Send proposal',
    followUpDays: 2,
    suggestedAction: 'completed',
    pipelineStage: 'engaged',
  },
  neutral: {
    label: 'Neutral',
    emoji: '🟡',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20',
    suggestedNextStep: 'Send case study',
    followUpDays: 5,
    suggestedAction: 'completed',
    pipelineStage: 'contacted',
  },
  objection: {
    label: 'Objection',
    emoji: '🟠',
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20',
    suggestedNextStep: 'Send battlecard',
    followUpDays: 3,
    suggestedAction: 'completed',
    pipelineStage: 'contacted',
  },
  ghosting: {
    label: 'Ghosting',
    emoji: '🔴',
    colorClass: 'text-red-400',
    bgClass: 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20',
    suggestedNextStep: 'Try different channel',
    followUpDays: 7,
    suggestedAction: 'no_show',
    pipelineStage: 'contacted',
  },
};

export function getSentimentConfig(sentiment: Sentiment): SentimentConfig {
  return SENTIMENT_CONFIGS[sentiment];
}

export const ALL_SENTIMENTS: Sentiment[] = ['interested', 'neutral', 'objection', 'ghosting'];

export function getFollowUpDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
