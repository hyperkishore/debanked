import { Leader, Company } from "./types";

export interface MessageVariant {
  style: "formal" | "casual" | "news-hook";
  subject: string;
  body: string;
}

export function generateMessageVariants(leader: Leader, company: Company): MessageVariant[] {
  const firstName = leader.n.split(" ")[0];
  const companyName = company.name;

  // Extract key data points
  const hookText = leader.hooks?.[0]?.replace(/^\*/, "").trim() || "";
  const starredHook = leader.hooks?.find((h) => h.startsWith("*"))?.slice(1).trim() || hookText;
  const latestNews = company.news?.[0];
  const shortTP = company.tp?.length
    ? company.tp.reduce((a, b) => (a.length < b.length ? a : b))
    : "We help companies automate underwriting decisions — currently powering 450+ lenders.";
  const ask = company.ask || `Would love to show you how we can help ${companyName}. Open to a quick chat?`;

  // --- Formal ---
  const formalSubject = `HyperVerge + ${companyName} — Underwriting Automation`;
  const formalBody = `Dear ${firstName},

I hope this message finds you well. I'm reaching out from HyperVerge, where we specialize in AI-powered underwriting automation for the small business lending industry.

${company.desc ? `Given ${companyName}'s position in the market, I believe there's a strong fit.` : ""}

${shortTP}

We're currently deployed with 450+ financial services enterprises, including partners like PIRS Capital in the MCA space. Our platform typically reduces underwriting time from 40 minutes to under 5.

${ask}

Best regards,
[Your Name]
HyperVerge`;

  // --- Casual ---
  const casualOpener = starredHook
    ? `Saw your background — ${starredHook.toLowerCase()} is impressive!`
    : leader.bg && leader.bg.length > 20
      ? `Came across your profile at ${companyName} — great to connect.`
      : `Hey — really interesting work at ${companyName}.`;

  const casualSubject = `Quick q for ${firstName}`;
  const casualBody = `Hey ${firstName},

${casualOpener}

Quick pitch: we built an AI co-pilot that takes underwriting from 40 min to under 5. Already working with 450+ lenders, including PIRS Capital in MCA.

${shortTP}

Any chance you'd be open to a 15-min chat? Would love to show you what we're doing.

Cheers,
[Your Name]
HyperVerge`;

  // --- News Hook ---
  const newsOpener = latestNews
    ? `Just saw the news: "${latestNews.h}" — exciting times at ${companyName}!`
    : `Been following ${companyName}'s growth — impressive trajectory.`;

  const newsHookSubject = latestNews
    ? `Re: ${latestNews.h.substring(0, 50)}${latestNews.h.length > 50 ? "..." : ""}`
    : `Congrats on ${companyName}'s momentum`;
  const newsHookBody = `Hi ${firstName},

${newsOpener}

${latestNews ? `With that kind of momentum, scaling underwriting efficiently becomes critical.` : `As you scale, underwriting speed becomes a competitive advantage.`}

That's exactly what we do at HyperVerge — our AI Co-Pilot cuts underwriting from 40 minutes to under 5. We're already deployed with 450+ financial services enterprises, including PIRS Capital.

${ask}

Best,
[Your Name]
HyperVerge`;

  return [
    { style: "formal", subject: formalSubject, body: formalBody },
    { style: "casual", subject: casualSubject, body: casualBody },
    { style: "news-hook", subject: newsHookSubject, body: newsHookBody },
  ];
}
