import { Company } from "./types";
import { FeedItem, SignalType } from "./feed-helpers";

/**
 * SIGNAL HEATMAP HELPERS
 *
 * Computes signal density, velocity, and visual encoding for
 * overlaying on the market map. Shows which companies are
 * "active NOW" vs dormant.
 */

export interface SignalHeatData {
  companyId: number;
  signalCount: number;          // Total signals in last 180 days
  recentSignalCount: number;    // Signals in last 30 days
  signalVelocity: number;       // Positive = accelerating, negative = decelerating
  dominantSignalType: SignalType;
  heatIntensity: number;        // 0-1 normalized for visual encoding
  lastSignalAge: number;        // Days since last signal
  isActive: boolean;            // Had signal in last 90 days
  pulsing: boolean;             // Signal in last 7 days = animated pulse
}

export function computeSignalHeatmap(
  companies: Company[],
  feedItems: FeedItem[]
): Map<number, SignalHeatData> {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const thirtyDaysAgo = now - 30 * 86400000;
  const ninetyDaysAgo = now - 90 * 86400000;
  const sixMonthsAgo = now - 180 * 86400000;

  // Group feed items by company
  const signalsByCompany = new Map<number, FeedItem[]>();
  for (const item of feedItems) {
    if (item.dateEstimate < sixMonthsAgo) continue;
    const existing = signalsByCompany.get(item.companyId) || [];
    existing.push(item);
    signalsByCompany.set(item.companyId, existing);
  }

  // Find max signal count for normalization
  let maxSignals = 1;
  for (const signals of signalsByCompany.values()) {
    if (signals.length > maxSignals) maxSignals = signals.length;
  }

  const heatmap = new Map<number, SignalHeatData>();

  for (const company of companies) {
    const signals = signalsByCompany.get(company.id) || [];
    const recentSignals = signals.filter(s => s.dateEstimate > thirtyDaysAgo);
    const olderSignals = signals.filter(s => s.dateEstimate <= thirtyDaysAgo);

    // Velocity: are signals accelerating or decelerating?
    // Compare recent 30d count vs. older 30-180d monthly average
    const olderMonths = Math.max(1, 5); // 5 months of older data
    const olderMonthlyAvg = olderSignals.length / olderMonths;
    const velocity = recentSignals.length - olderMonthlyAvg;

    // Dominant signal type
    const typeCounts: Record<string, number> = {};
    for (const s of signals) {
      typeCounts[s.signalType] = (typeCounts[s.signalType] || 0) + 1;
    }
    let dominantType: SignalType = "general";
    let maxCount = 0;
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type as SignalType;
      }
    }

    // Last signal age
    const lastSignalAge = signals.length > 0
      ? Math.round((now - Math.max(...signals.map(s => s.dateEstimate))) / 86400000)
      : 999;

    // Heat intensity: weighted combination of count + recency + velocity
    const countFactor = signals.length / maxSignals; // 0-1
    const recencyFactor = recentSignals.length > 0 ? 1 : signals.some(s => s.dateEstimate > ninetyDaysAgo) ? 0.5 : 0.1;
    const velocityFactor = velocity > 0 ? Math.min(velocity / 3, 1) : 0;
    const heatIntensity = Math.min(1, countFactor * 0.3 + recencyFactor * 0.5 + velocityFactor * 0.2);

    heatmap.set(company.id, {
      companyId: company.id,
      signalCount: signals.length,
      recentSignalCount: recentSignals.length,
      signalVelocity: Math.round(velocity * 10) / 10,
      dominantSignalType: dominantType,
      heatIntensity,
      lastSignalAge,
      isActive: lastSignalAge <= 90,
      pulsing: signals.some(s => s.dateEstimate > sevenDaysAgo),
    });
  }

  return heatmap;
}

/** Get heatmap opacity for dot rendering (0.1 = dormant, 1.0 = hot) */
export function getHeatmapOpacity(intensity: number): number {
  return 0.1 + intensity * 0.9;
}

/** Scale dot radius based on intensity (1x to 2.5x base radius) */
export function getHeatmapRadius(intensity: number, baseRadius: number): number {
  return baseRadius * (1 + intensity * 1.5);
}

/** CSS glow for hot dots */
export function getHeatmapGlow(intensity: number): string {
  if (intensity < 0.3) return "none";
  const spread = Math.round(intensity * 8);
  const alpha = Math.round(intensity * 0.6 * 100) / 100;
  return `0 0 ${spread}px rgba(239, 68, 68, ${alpha})`;
}

/** Color gradient from blue (cold) through yellow to red (hot) */
export function getHeatmapColor(intensity: number): string {
  if (intensity < 0.2) return "rgb(100, 116, 139)"; // slate-500 (dormant)
  if (intensity < 0.4) return "rgb(59, 130, 246)";  // blue-500
  if (intensity < 0.6) return "rgb(234, 179, 8)";   // yellow-500
  if (intensity < 0.8) return "rgb(249, 115, 22)";  // orange-500
  return "rgb(239, 68, 68)";                          // red-500
}
