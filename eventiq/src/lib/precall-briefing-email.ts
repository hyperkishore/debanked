import "server-only";
import type { PreCallBriefing } from "./briefing-helpers";

/**
 * Renders a pre-call briefing as a nicely formatted HTML email.
 * Dark theme matching the existing EventIQ email style.
 */
export function renderPreCallBriefingEmail(
  briefing: PreCallBriefing,
  companyName: string
): string {
  const leader = briefing.who.leader;

  // WHO section
  const hooksHtml = briefing.who.topHooks.length > 0
    ? briefing.who.topHooks
        .map((h) => `<li style="margin-bottom:4px;color:#d1d5db">${h}</li>`)
        .join("")
    : "";

  const personalNote = briefing.who.personalNote
    ? `<div style="font-size:12px;color:#f59e0b;margin-top:6px;padding:6px 10px;background:#422006;border-radius:6px">Personal: ${briefing.who.personalNote}</div>`
    : "";

  // PERSON HOOKS section
  const personHooksHtml = briefing.personHooks.length > 0
    ? `<div style="margin-top:16px">
        <h3 style="color:#e2e8f0;font-size:13px;font-weight:600;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em">Person-Specific Hooks</h3>
        ${briefing.personHooks
          .map(
            (h) =>
              `<div style="padding:6px 10px;margin-bottom:4px;background:#1a1a2e;border-radius:6px;font-size:13px">
                <span style="color:#5b8def;font-weight:500">${h.hook}</span>
                <div style="color:#9ca3af;font-size:12px;margin-top:2px">${h.suggestedMention}</div>
              </div>`
          )
          .join("")}
      </div>`
    : "";

  // NEWS HOOK section
  const newsHookHtml = briefing.newsHook
    ? `<div style="margin-top:16px">
        <h3 style="color:#e2e8f0;font-size:13px;font-weight:600;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em">News Hook</h3>
        <div style="padding:8px 12px;background:#1a1a2e;border-radius:6px;border-left:3px solid #22c55e">
          <div style="color:#e2e8f0;font-size:13px;font-weight:500">${briefing.newsHook.headline}</div>
          <div style="color:#6b7280;font-size:11px;margin-top:2px">${briefing.newsHook.source}</div>
          <div style="color:#22c55e;font-size:13px;margin-top:6px;font-style:italic">"${briefing.newsHook.suggestedOpener}"</div>
        </div>
      </div>`
    : "";

  // ANGLE section
  const angleHtml = `
    <div style="margin-top:16px">
      <h3 style="color:#e2e8f0;font-size:13px;font-weight:600;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em">Your Angle</h3>
      <div style="padding:8px 12px;background:#1a1a2e;border-radius:6px;border-left:3px solid #5b8def">
        <div style="color:#d1d5db;font-size:13px">${briefing.yourAngle.talkingPoint}</div>
        <div style="color:#5b8def;font-size:13px;margin-top:6px;font-weight:500">CTA: ${briefing.yourAngle.cta}</div>
      </div>
    </div>`;

  // OBJECTION PREEMPTS
  const objectionsHtml = briefing.objectionPreempts.length > 0
    ? `<div style="margin-top:16px">
        <h3 style="color:#e2e8f0;font-size:13px;font-weight:600;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em">Objection Preempts</h3>
        ${briefing.objectionPreempts
          .map(
            (o) =>
              `<div style="padding:6px 10px;margin-bottom:6px;background:#1a1a2e;border-radius:6px;font-size:13px">
                <div style="color:#ef4444;font-weight:500">${o.objection}</div>
                <div style="color:#22c55e;margin-top:4px">${o.preempt}</div>
              </div>`
          )
          .join("")}
      </div>`
    : "";

  // THE ASKS
  const asksHtml = `
    <div style="margin-top:16px">
      <h3 style="color:#e2e8f0;font-size:13px;font-weight:600;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em">The Asks</h3>
      <div style="padding:8px 12px;background:#1a1a2e;border-radius:6px;font-size:13px">
        <div style="margin-bottom:6px"><span style="color:#5b8def;font-weight:500">Opening:</span> <span style="color:#d1d5db">${briefing.personalizedAsks.openingAsk}</span></div>
        <div style="margin-bottom:6px"><span style="color:#22c55e;font-weight:500">If going well:</span> <span style="color:#d1d5db">${briefing.personalizedAsks.closingAsk}</span></div>
        <div><span style="color:#f59e0b;font-weight:500">Fallback:</span> <span style="color:#d1d5db">${briefing.personalizedAsks.fallbackAsk}</span></div>
      </div>
    </div>`;

  // LAND MINES
  const landMinesHtml = briefing.landMines.length > 0
    ? `<div style="margin-top:16px">
        <h3 style="color:#ef4444;font-size:13px;font-weight:600;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em">Land Mines</h3>
        ${briefing.landMines
          .map(
            (m) =>
              `<div style="padding:4px 10px;margin-bottom:3px;font-size:13px;color:#fca5a5">- ${m}</div>`
          )
          .join("")}
      </div>`
    : "";

  // PRODUCT FIT
  const productFitHtml = briefing.productFit
    ? `<div style="margin-top:16px">
        <h3 style="color:#e2e8f0;font-size:13px;font-weight:600;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em">Product Fit</h3>
        <div style="padding:8px 12px;background:#1a1a2e;border-radius:6px;font-size:13px">
          <div style="color:#d1d5db">Products: <span style="color:#5b8def;font-weight:500">${briefing.productFit.recommendedProducts.join(", ")}</span></div>
          ${briefing.productFit.topTalkingPoint ? `<div style="color:#d1d5db;margin-top:4px">${briefing.productFit.topTalkingPoint}</div>` : ""}
        </div>
      </div>`
    : "";

  // LAST TOUCH
  const lastTouchHtml = briefing.lastTouch
    ? `<div style="font-size:12px;color:#9ca3af;margin-top:8px;padding:6px 10px;background:#1a1a2e;border-radius:6px">
        Last touch: ${briefing.lastTouch.action} via ${briefing.lastTouch.channel} (${briefing.lastTouch.when}) with ${briefing.lastTouch.contactName}
        ${briefing.lastTouch.notes ? `<br>Notes: ${briefing.lastTouch.notes}` : ""}
      </div>`
    : `<div style="font-size:12px;color:#f59e0b;margin-top:8px;padding:6px 10px;background:#422006;border-radius:6px">No previous contact — this is a first touch</div>`;

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
      <h1 style="color:#e2e8f0;font-size:20px;margin:8px 0 4px 0;font-weight:600">Pre-Call Briefing</h1>
      <p style="color:#9ca3af;font-size:13px;margin:0">${companyName}</p>
    </div>

    <!-- WHO -->
    <div style="background:#12122a;border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="color:#e2e8f0;font-size:16px;font-weight:600">${leader.n}</span>
        <span style="display:inline-block;background:#5b8def20;color:#5b8def;font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px">${briefing.who.persona.label}</span>
      </div>
      <div style="color:#9ca3af;font-size:13px;margin-bottom:4px">${leader.t}</div>
      <div style="color:#d1d5db;font-size:13px">${briefing.who.oneLiner}</div>
      ${personalNote}
      ${hooksHtml ? `<ul style="margin:8px 0 0 16px;padding:0;font-size:13px">${hooksHtml}</ul>` : ""}
      ${lastTouchHtml}
    </div>

    ${personHooksHtml}
    ${newsHookHtml}
    ${angleHtml}
    ${objectionsHtml}
    ${asksHtml}
    ${productFitHtml}
    ${landMinesHtml}

    <!-- Footer -->
    <div style="text-align:center;border-top:1px solid #1e1e3a;padding-top:16px;margin-top:24px">
      <p style="color:#6b7280;font-size:11px;margin:0">
        EventIQ Pre-Call Briefing &middot; Generated ${new Date().toLocaleDateString()}
      </p>
    </div>
  </div>
</body>
</html>`;
}
