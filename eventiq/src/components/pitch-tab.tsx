"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { ExternalLink } from "lucide-react";

const PITCH_TEXT = `"We're HyperVerge \u2014 we built an AI Co-Pilot that cuts small business underwriting from 40 minutes to under 5. We automate application intake, cash flow analysis, risk/CLEAR report review, and industry classification. Already deployed with 450+ financial services enterprises. We work with MCA funders across the industry and seeing incredible results."`;

const valueProps = [
  { from: "Manual bank statement review", to: "AI cash flow analysis", impact: "15m \u2192 sec" },
  { from: "50+ page CLEAR report", to: "AI risk report parsing", impact: "15m \u2192 sec" },
  { from: "Inconsistent ISO apps", to: "Automated intake & classification", impact: "5m \u2192 sec" },
  { from: "Subjective industry tags", to: "AI SIC/NAICS classification", impact: "5m \u2192 sec" },
  { from: "Stips collection delays", to: "Automated verification", impact: "Days \u2192 hrs" },
  { from: "Scaling = hiring", to: "AI Co-Pilot multiplies capacity", impact: "5-8x" },
];

const socialProof = [
  "450+ banking & financial services enterprises across 10+ countries",
  "Deployed with leading MCA funders and equipment finance companies",
  "Working with Fundfi & FundKite as existing clients",
  "SOC 2 compliant, enterprise-grade data security",
];

const objections = [
  {
    q: '"We built our own system"',
    a: "That's great \u2014 we're not here to replace it. We complement proprietary systems by handling the upstream extraction work: bank statement parsing, CLEAR report analysis, stips verification. Your scoring model stays yours \u2014 we just feed it cleaner data, faster. FundKite built their own stack too and uses us for exactly this.",
  },
  {
    q: '"We\'re not ready for AI yet"',
    a: "That's what most of our 450+ clients said initially. The beauty is there's no rip-and-replace \u2014 we sit alongside your existing workflow. Your underwriters still make the final call, they just get there 8x faster. Think of it as giving them a co-pilot, not replacing the pilot.",
  },
  {
    q: '"What does it cost?"',
    a: "We price per application processed, so it scales with your volume. For most funders doing 50+ deals/day, the ROI is 10-20x within the first month \u2014 you're saving 35 min of underwriter time per deal. Happy to run a specific ROI calculation for your volume in a quick demo call.",
  },
  {
    q: '"We tried AI before and it didn\'t work"',
    a: "I hear that a lot \u2014 usually from funders who tried generic OCR or chatbot tools. We're purpose-built for MCA/lending underwriting. Our models are trained on millions of bank statements, CLEAR reports, and applications specifically in this industry. That's why we have 450+ financial enterprises using us, not 450 failed pilots.",
  },
  {
    q: '"Our underwriters are fast enough"',
    a: "Fast is relative \u2014 if your competitors are closing deals in 2 hours and you're at 4, ISOs route deals to them first. But it's not just speed. It's also consistency: our AI catches things human reviewers miss at 4 PM on a Friday. And it never calls in sick. How many deals per day are your underwriters handling right now?",
  },
];

const collateral = [
  { title: "CLEAR Report", subtitle: "High level", url: "https://drive.google.com/file/d/16sW_NUacuxh-xmTbPpoGDVWH2CW0tewD/view" },
  { title: "CLEAR Report", subtitle: "Detailed", url: "https://drive.google.com/file/d/1LLfcCXV4PeDHESEgdj_EyCRh1x8MKU0B/view" },
  { title: "Cashflow Analysis", subtitle: "Demo video", url: "https://drive.google.com/file/d/1pzREwBBB2c3yf8jUTc3Td-esxpZXwtY1/view" },
  { title: "Industry Classification", subtitle: "Demo video", url: "https://drive.google.com/file/d/1fPsXDfd3PDNN49kyHRj4GGTF2SJlPPga/view" },
  { title: "Email to CRM", subtitle: "High level", url: "https://drive.google.com/file/d/1UNxRWYTAIG7YK0ZOdV7i88PeMLkNSW3g/view" },
  { title: "Email to CRM", subtitle: "Detailed", url: "https://drive.google.com/file/d/1Jdluk9TQlY56k3bES4aCMdFT5TY29Zyl/view" },
  { title: "Builder Demo", subtitle: "YouTube", url: "https://www.youtube.com/watch?v=fLbtk4uty-s" },
];

const referralMap = [
  { from: "Alex Shvarts", fromCo: "FundKite (Client)", to: "Louis Calderone", toCo: "Vox Funding", reason: "Both on Funder Panel together" },
  { from: "Jim Noel", fromCo: "BriteCap (SQO)", to: "Mark Cisco", toCo: "CAN Capital", reason: "Jim was VP at CAN Capital previously" },
  { from: "Brian Kandinov", fromCo: "Fundfi (Client)", to: "Steven Edisis", toCo: "Dynamic Capital", reason: "Both on Funder Panel, NYC funders" },
  { from: "Richard Henderson", fromCo: "BriteCap (SQO)", to: "Mark Cerminaro", toCo: "Rapid Finance", reason: "Henderson was CRO at CAN, Cerminaro CRO at Rapid" },
  { from: "Alex Shvarts", fromCo: "FundKite (Client)", to: "Shaya Baum", toCo: "Wing Lake Capital", reason: "Both MCA-focused NYC funders" },
  { from: "Alex Shvarts", fromCo: "FundKite (Client)", to: "Jay Avigdor", toCo: "Velocity Capital Group", reason: "Both NYC MCA veterans, dinner roundtable" },
  { from: "Brian Kandinov", fromCo: "Fundfi (Client)", to: "Jill Capadanno", toCo: "Forward Financing", reason: "Both fintech-forward lenders" },
];

export function PitchTab() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* 30-Second Pitch */}
        <Card className="border-l-[3px] border-l-brand p-4 gap-3 shadow-none">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-brand uppercase tracking-wider">30-Second Pitch</h3>
            <CopyButton text={PITCH_TEXT} variant="button" label="Copy" size="sm" />
          </div>
          <p className="text-sm leading-relaxed">
            &ldquo;We&rsquo;re <span className="text-brand font-semibold">HyperVerge</span> &mdash; we built an AI Co-Pilot that cuts small business underwriting from{" "}
            <span className="text-brand font-semibold">40 minutes to under 5</span>. We automate application intake, cash flow analysis, risk/CLEAR report review, and industry classification. Already deployed with{" "}
            <span className="text-brand font-semibold">450+ financial services enterprises</span>. We&rsquo;re working with{" "}
            <span className="text-brand font-semibold">MCA funders and equipment finance companies</span> and seeing incredible results.&rdquo;
          </p>
        </Card>

        {/* Value Propositions */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Value Propositions</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {valueProps.map((vp, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-b-0 group">
                    <td className="py-2.5 px-3 text-muted-foreground">{vp.from}</td>
                    <td className="py-2.5 px-3 font-medium">{vp.to}</td>
                    <td className="py-2.5 px-3 text-right text-brand font-semibold whitespace-nowrap">{vp.impact}</td>
                    <td className="py-2.5 pr-2 w-8">
                      <CopyButton
                        text={`${vp.from} \u2192 ${vp.to} (${vp.impact})`}
                        className="opacity-0 group-hover:opacity-100"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Social Proof */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Social Proof</h3>
            <CopyButton
              text={socialProof.join("\n")}
              variant="button"
              label="Copy All"
              size="sm"
            />
          </div>
          <ul className="space-y-2">
            {socialProof.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm group">
                <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />
                <span className="flex-1">{item}</span>
                <CopyButton text={item} className="opacity-0 group-hover:opacity-100" />
              </li>
            ))}
          </ul>
        </div>

        {/* Objection Responses */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Objection Responses</h3>
          <div className="space-y-2">
            {objections.map((obj, i) => (
              <details key={i} className="group rounded-lg bg-card border border-border overflow-hidden">
                <summary className="flex items-center gap-2 p-3 cursor-pointer list-none">
                  <span className="w-5 h-5 rounded-full bg-[var(--client)]/20 text-[var(--client)] flex items-center justify-center text-xs font-bold shrink-0">!</span>
                  <span className="text-sm font-medium flex-1">{obj.q}</span>
                  <CopyButton
                    text={`Q: ${obj.q}\n\nA: ${obj.a}`}
                    className="opacity-0 group-open:opacity-100"
                  />
                  <span className="text-muted-foreground transition-transform group-open:rotate-90">&rsaquo;</span>
                </summary>
                <div className="px-3 pb-3 pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed pl-7">{obj.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Demo Videos & Collateral */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Demo Videos & Collateral</h3>
          <div className="grid grid-cols-2 gap-2">
            {collateral.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border hover:border-brand/30 transition-colors"
              >
                <span className="w-7 h-7 rounded-md bg-[var(--sqo)]/12 text-[var(--sqo)] flex items-center justify-center text-xs shrink-0">&blacktriangleright;</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Referral Map */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Referral Map</h3>
          <p className="text-xs text-muted-foreground mb-3">Warm contacts who can introduce you to cold targets</p>
          <div className="space-y-2">
            {referralMap.map((ref, i) => (
              <Card key={i} className="flex-row items-center gap-3 p-3 shadow-none group">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{ref.from}</div>
                  <div className="text-xs text-muted-foreground">{ref.fromCo}</div>
                </div>
                <span className="text-muted-foreground shrink-0">&rarr;</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{ref.to}</div>
                  <div className="text-xs text-muted-foreground">{ref.toCo}</div>
                  <div className="text-xs text-brand/70 mt-0.5">{ref.reason}</div>
                </div>
                <CopyButton
                  text={`Hi ${ref.from.split(" ")[0]}, would you be open to introducing me to ${ref.to} at ${ref.toCo.split(" (")[0]}? ${ref.reason}. I'd love to show them how HyperVerge can help.`}
                  className="opacity-0 group-hover:opacity-100 shrink-0"
                />
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
