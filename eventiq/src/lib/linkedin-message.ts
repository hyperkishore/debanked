import { Leader, Company } from "./types";

export interface LinkedInVariant {
  style: "connection-request" | "inmail";
  body: string;
}

export function generateLinkedInVariants(leader: Leader, company: Company): LinkedInVariant[] {
  const firstName = leader.n.split(" ")[0];
  const companyName = company.name;

  // Pick best hook
  const starredHook = leader.hooks?.find((h) => h.startsWith("*"))?.slice(1).trim();
  const bestHook = starredHook || leader.hooks?.[0]?.replace(/^\*/, "").trim() || "";

  // Shortest talking point for value prop
  const shortTP = company.tp?.length
    ? company.tp.reduce((a, b) => (a.length < b.length ? a : b))
    : "We help lenders automate underwriting with AI — 450+ companies on the platform.";

  const ask = company.ask || `Open to connecting?`;

  // --- Connection Request (~50 words, casual, references one hook) ---
  let connectionBody: string;
  if (bestHook) {
    connectionBody = `Hi ${firstName}, saw your work at ${companyName} — ${bestHook.toLowerCase()} caught my eye. I'm with HyperVerge, helping lenders cut underwriting from 40 min to under 5. Would love to connect and swap notes!`;
  } else {
    connectionBody = `Hi ${firstName}, great to come across ${companyName}. I'm at HyperVerge — we help lenders automate underwriting with AI (450+ companies on our platform). Would love to connect!`;
  }

  // --- InMail (~100-150 words, hook + talking point + CTA) ---
  const hookOpener = bestHook
    ? `Your background caught my eye — ${bestHook.toLowerCase()} is impressive.`
    : `I've been following ${companyName}'s growth — great trajectory.`;

  const latestNews = company.news?.[0];
  const newsLine = latestNews
    ? `\n\nSaw the recent news about "${latestNews.h}" — exciting times.`
    : "";

  const inmailBody = `Hi ${firstName},

${hookOpener}${newsLine}

${shortTP}

At HyperVerge, we've built an AI Co-Pilot that takes underwriting from 40 minutes to under 5. Already deployed with 450+ financial services companies.

${ask}

Best,
[Your Name]
HyperVerge`;

  return [
    { style: "connection-request", body: connectionBody },
    { style: "inmail", body: inmailBody },
  ];
}
