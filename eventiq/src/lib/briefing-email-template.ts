import "server-only";

interface BriefingCompany {
  companyId: number;
  companyName: string;
  type: string;
  score: number;
  reasons: string[];
  nextAction: string;
  leader?: { name: string; title: string; linkedin?: string };
  latestNews?: { headline: string; source: string };
}

interface StaleWarning {
  companyName: string;
  daysSince: number;
  stage: string;
  lastChannel: string;
}

interface BriefingData {
  date: string;
  userName: string;
  topCompanies: BriefingCompany[];
  staleWarnings: StaleWarning[];
  quickWins: BriefingCompany[];
  totalSignalsToday: number;
  appUrl: string;
}

const TYPE_COLORS: Record<string, string> = {
  SQO: "#ef4444",
  Client: "#eab308",
  ICP: "#22c55e",
  TAM: "#6b7280",
};

function badge(type: string): string {
  const color = TYPE_COLORS[type] || "#6b7280";
  return `<span style="display:inline-block;background:${color}20;color:${color};font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;border:1px solid ${color}40">${type}</span>`;
}

function companyRow(c: BriefingCompany, appUrl: string): string {
  const leaderLine = c.leader
    ? `<div style="font-size:12px;color:#9ca3af;margin-top:2px">${c.leader.name} &middot; ${c.leader.title}${c.leader.linkedin ? ` &middot; <a href="${c.leader.linkedin}" style="color:#5b8def;text-decoration:none">LinkedIn</a>` : ""}</div>`
    : "";

  const newsLine = c.latestNews
    ? `<div style="font-size:12px;color:#d1d5db;margin-top:4px;padding:4px 8px;background:#1a1a2e;border-radius:4px">📰 ${c.latestNews.headline} <span style="color:#6b7280">&mdash; ${c.latestNews.source}</span></div>`
    : "";

  return `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #1e1e3a">
        <div style="display:flex;align-items:center;gap:8px">
          <a href="${appUrl}?company=${c.companyId}" style="color:#e2e8f0;font-weight:600;font-size:14px;text-decoration:none">${c.companyName}</a>
          ${badge(c.type)}
        </div>
        ${leaderLine}
        ${newsLine}
        <div style="margin-top:6px;font-size:13px;color:#5b8def;font-weight:500">→ ${c.nextAction}</div>
      </td>
    </tr>`;
}

function staleRow(w: StaleWarning): string {
  return `
    <tr>
      <td style="padding:8px 16px;border-bottom:1px solid #1e1e3a;font-size:13px">
        <span style="color:#ef4444;font-weight:600">${w.companyName}</span>
        <span style="color:#9ca3af"> &middot; ${w.daysSince}d silent &middot; ${w.stage} &middot; Last: ${w.lastChannel}</span>
      </td>
    </tr>`;
}

export function renderBriefingEmail(data: BriefingData): string {
  const topSection = data.topCompanies.length > 0
    ? `
      <div style="margin-bottom:24px">
        <h2 style="color:#e2e8f0;font-size:16px;margin:0 0 12px 0;font-weight:600">🎯 Top Companies to Work Today</h2>
        <table style="width:100%;border-collapse:collapse;background:#12122a;border-radius:8px;overflow:hidden">
          ${data.topCompanies.map((c) => companyRow(c, data.appUrl)).join("")}
        </table>
      </div>`
    : "";

  const staleSection = data.staleWarnings.length > 0
    ? `
      <div style="margin-bottom:24px">
        <h2 style="color:#e2e8f0;font-size:16px;margin:0 0 12px 0;font-weight:600">⚠️ Stale Deals — Need Attention</h2>
        <table style="width:100%;border-collapse:collapse;background:#12122a;border-radius:8px;overflow:hidden">
          ${data.staleWarnings.map(staleRow).join("")}
        </table>
      </div>`
    : "";

  const quickWinSection = data.quickWins.length > 0
    ? `
      <div style="margin-bottom:24px">
        <h2 style="color:#e2e8f0;font-size:16px;margin:0 0 12px 0;font-weight:600">⚡ Quick Wins — High Score, Never Contacted</h2>
        <table style="width:100%;border-collapse:collapse;background:#12122a;border-radius:8px;overflow:hidden">
          ${data.quickWins.map((c) => companyRow(c, data.appUrl)).join("")}
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
      <h1 style="color:#e2e8f0;font-size:20px;margin:8px 0 4px 0;font-weight:600">Morning Briefing</h1>
      <p style="color:#9ca3af;font-size:13px;margin:0">${data.date} &middot; ${data.totalSignalsToday} fresh signals</p>
    </div>

    <!-- Greeting -->
    <p style="color:#d1d5db;font-size:14px;margin:0 0 20px 0">
      Good morning${data.userName ? `, ${data.userName}` : ""}. Here's what needs attention today.
    </p>

    ${topSection}
    ${staleSection}
    ${quickWinSection}

    <!-- CTA -->
    <div style="text-align:center;margin:32px 0">
      <a href="${data.appUrl}" style="display:inline-block;background:#5b8def;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none">Open EventIQ</a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;border-top:1px solid #1e1e3a;padding-top:16px;margin-top:24px">
      <p style="color:#6b7280;font-size:11px;margin:0">
        EventIQ &middot; HyperVerge MCA Market Intelligence
      </p>
    </div>
  </div>
</body>
</html>`;
}
