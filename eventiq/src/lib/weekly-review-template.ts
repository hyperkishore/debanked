import "server-only";

// ---------- Data Interfaces ----------

export interface PipelineStageSummary {
  stage: string;
  label: string;
  count: number;
  dealValue: number;
}

export interface StaleDeal {
  companyName: string;
  companyId: number;
  daysSinceEngagement: number;
  stage: string;
  lastChannel: string;
  lastContactName: string;
}

export interface WeeklySignal {
  companyName: string;
  companyId: number;
  headline: string;
  source: string;
  publishedAt: string;
  inPipeline: boolean;
}

export interface ThreadingGap {
  companyName: string;
  companyId: number;
  stage: string;
  engagedContacts: number;
  totalLeaders: number;
}

export interface RecommendedAction {
  priority: number;
  action: string;
  companyName: string;
  companyId: number;
  reason: string;
}

export interface WeeklyReviewData {
  weekOf: string;
  pipelineSummary: PipelineStageSummary[];
  totalPipelineValue: number;
  totalActiveDeals: number;
  signals: WeeklySignal[];
  staleDeals: StaleDeal[];
  threadingGaps: ThreadingGap[];
  recommendedActions: RecommendedAction[];
  appUrl: string;
}

// ---------- Helpers ----------

const STAGE_COLORS: Record<string, string> = {
  researched: "#6b7280",
  contacted: "#5b8def",
  engaged: "#22c55e",
  demo: "#eab308",
  proposal: "#a855f7",
  won: "#10b981",
  lost: "#ef4444",
};

const STAGE_ICONS: Record<string, string> = {
  researched: "&#128269;",   // magnifying glass
  contacted: "&#128232;",    // outbox
  engaged: "&#128172;",      // speech bubble
  demo: "&#128187;",         // laptop
  proposal: "&#128196;",     // document
  won: "&#127942;",          // trophy
  lost: "&#10060;",          // cross
};

function stageBar(s: PipelineStageSummary, maxCount: number): string {
  const pct = maxCount > 0 ? Math.round((s.count / maxCount) * 100) : 0;
  const color = STAGE_COLORS[s.stage] || "#6b7280";
  const icon = STAGE_ICONS[s.stage] || "";
  const valueStr = s.dealValue > 0
    ? ` &middot; $${formatValue(s.dealValue)}`
    : "";

  return `
    <tr>
      <td style="padding:8px 16px;border-bottom:1px solid #1e1e3a;font-size:13px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="color:${color};font-weight:600;min-width:100px">${icon} ${s.label}</span>
          <span style="color:#e2e8f0;font-weight:700;font-size:15px">${s.count}</span>
          <span style="color:#6b7280;font-size:12px">${valueStr}</span>
        </div>
        <div style="background:#1a1a2e;border-radius:4px;height:6px;overflow:hidden">
          <div style="background:${color};height:6px;width:${Math.max(pct, 2)}%;border-radius:4px"></div>
        </div>
      </td>
    </tr>`;
}

function formatValue(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toFixed(0);
}

function staleDealRow(d: StaleDeal, appUrl: string): string {
  const urgencyColor = d.daysSinceEngagement >= 14 ? "#ef4444" : d.daysSinceEngagement >= 10 ? "#f97316" : "#eab308";
  return `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1e1e3a;font-size:13px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <a href="${appUrl}?company=${d.companyId}" style="color:#e2e8f0;font-weight:600;text-decoration:none">${d.companyName}</a>
            <span style="color:#6b7280"> &middot; ${d.stage}</span>
          </div>
          <span style="display:inline-block;background:${urgencyColor}20;color:${urgencyColor};font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;border:1px solid ${urgencyColor}40">${d.daysSinceEngagement}d silent</span>
        </div>
        <div style="color:#9ca3af;font-size:12px;margin-top:2px">Last: ${d.lastContactName || "unknown"} via ${d.lastChannel}</div>
      </td>
    </tr>`;
}

function signalRow(s: WeeklySignal, appUrl: string): string {
  const pipelineBadge = s.inPipeline
    ? `<span style="display:inline-block;background:#22c55e20;color:#22c55e;font-size:10px;font-weight:600;padding:1px 6px;border-radius:8px;border:1px solid #22c55e40;margin-left:6px">PIPELINE</span>`
    : "";
  return `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1e1e3a;font-size:13px">
        <div>
          <a href="${appUrl}?company=${s.companyId}" style="color:#e2e8f0;font-weight:600;text-decoration:none">${s.companyName}</a>${pipelineBadge}
        </div>
        <div style="color:#d1d5db;margin-top:4px;padding:4px 8px;background:#1a1a2e;border-radius:4px">
          ${s.headline}
          <span style="color:#6b7280"> &mdash; ${s.source}</span>
        </div>
      </td>
    </tr>`;
}

function threadingGapRow(g: ThreadingGap, appUrl: string): string {
  return `
    <tr>
      <td style="padding:8px 16px;border-bottom:1px solid #1e1e3a;font-size:13px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <a href="${appUrl}?company=${g.companyId}" style="color:#e2e8f0;font-weight:600;text-decoration:none">${g.companyName}</a>
            <span style="color:#6b7280"> &middot; ${g.stage}</span>
          </div>
          <span style="color:#f97316;font-size:12px;font-weight:600">${g.engagedContacts}/${g.totalLeaders} contacts</span>
        </div>
      </td>
    </tr>`;
}

function actionRow(a: RecommendedAction): string {
  const priorityColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#6b7280"];
  const color = priorityColors[Math.min(a.priority - 1, 4)];
  return `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1e1e3a;font-size:13px">
        <div style="display:flex;align-items:flex-start;gap:8px">
          <span style="display:inline-block;background:${color}20;color:${color};font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;border:1px solid ${color}40;flex-shrink:0">#${a.priority}</span>
          <div>
            <div style="color:#e2e8f0;font-weight:600">${a.action}</div>
            <div style="color:#9ca3af;font-size:12px;margin-top:2px">${a.reason}</div>
          </div>
        </div>
      </td>
    </tr>`;
}

// ---------- Main Render ----------

export function renderWeeklyReviewEmail(data: WeeklyReviewData): string {
  const maxStageCount = Math.max(...data.pipelineSummary.map((s) => s.count), 1);

  // Pipeline snapshot section
  const pipelineSection = `
    <div style="margin-bottom:28px">
      <h2 style="color:#e2e8f0;font-size:16px;margin:0 0 4px 0;font-weight:600">Pipeline Snapshot</h2>
      <p style="color:#9ca3af;font-size:12px;margin:0 0 12px 0">${data.totalActiveDeals} active deals${data.totalPipelineValue > 0 ? ` &middot; $${formatValue(data.totalPipelineValue)} total value` : ""}</p>
      <table style="width:100%;border-collapse:collapse;background:#12122a;border-radius:8px;overflow:hidden">
        ${data.pipelineSummary.map((s) => stageBar(s, maxStageCount)).join("")}
      </table>
    </div>`;

  // Signals section
  const signalsSection = data.signals.length > 0
    ? `
      <div style="margin-bottom:28px">
        <h2 style="color:#e2e8f0;font-size:16px;margin:0 0 12px 0;font-weight:600">This Week's Signals</h2>
        <table style="width:100%;border-collapse:collapse;background:#12122a;border-radius:8px;overflow:hidden">
          ${data.signals.slice(0, 5).map((s) => signalRow(s, data.appUrl)).join("")}
        </table>
      </div>`
    : "";

  // Stale deals section
  const staleSection = data.staleDeals.length > 0
    ? `
      <div style="margin-bottom:28px">
        <h2 style="color:#e2e8f0;font-size:16px;margin:0 0 12px 0;font-weight:600">Stale Deals Alert</h2>
        <table style="width:100%;border-collapse:collapse;background:#12122a;border-radius:8px;overflow:hidden">
          ${data.staleDeals.slice(0, 5).map((d) => staleDealRow(d, data.appUrl)).join("")}
        </table>
      </div>`
    : "";

  // Threading gaps section
  const threadingSection = data.threadingGaps.length > 0
    ? `
      <div style="margin-bottom:28px">
        <h2 style="color:#e2e8f0;font-size:16px;margin:0 0 12px 0;font-weight:600">Threading Gaps</h2>
        <p style="color:#9ca3af;font-size:12px;margin:-8px 0 12px 0">Pipeline companies with single-thread risk (1 engaged contact)</p>
        <table style="width:100%;border-collapse:collapse;background:#12122a;border-radius:8px;overflow:hidden">
          ${data.threadingGaps.slice(0, 5).map((g) => threadingGapRow(g, data.appUrl)).join("")}
        </table>
      </div>`
    : "";

  // Recommended actions section
  const actionsSection = data.recommendedActions.length > 0
    ? `
      <div style="margin-bottom:28px">
        <h2 style="color:#e2e8f0;font-size:16px;margin:0 0 12px 0;font-weight:600">Top Recommended Actions</h2>
        <table style="width:100%;border-collapse:collapse;background:#12122a;border-radius:8px;overflow:hidden">
          ${data.recommendedActions.slice(0, 5).map(actionRow).join("")}
        </table>
      </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0c0c12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;background:#5b8def20;padding:8px 12px;border-radius:8px;margin-bottom:8px">
        <span style="color:#5b8def;font-weight:700;font-size:16px">EventIQ</span>
      </div>
      <h1 style="color:#e2e8f0;font-size:20px;margin:8px 0 4px 0;font-weight:600">Weekly Pipeline Review</h1>
      <p style="color:#9ca3af;font-size:13px;margin:0">Week of ${data.weekOf}</p>
    </div>

    ${pipelineSection}
    ${signalsSection}
    ${staleSection}
    ${threadingSection}
    ${actionsSection}

    <!-- CTA -->
    <div style="text-align:center;margin:32px 0">
      <a href="${data.appUrl}" style="display:inline-block;background:#5b8def;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none">Open EventIQ</a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;border-top:1px solid #1e1e3a;padding-top:16px;margin-top:24px">
      <p style="color:#6b7280;font-size:11px;margin:0">
        EventIQ Weekly Review &middot; HyperVerge MCA Market Intelligence
      </p>
    </div>
  </div>
</body>
</html>`;
}
