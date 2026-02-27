import { describe, it, expect } from "vitest";
import companies from "@/data/all-companies.json";
import type { Company } from "../types";
import { isRicpTitle } from "../ricp-taxonomy";
import {
  applyPhantomEnrichment,
  buildRicpSearchArgument,
  findRicpGapAccounts,
  mapPhantomProfileToLeader,
} from "../phantombuster-enrichment";

describe("phantombuster-enrichment independent feasibility", () => {
  const dataset = companies as Company[];

  it("finds real RICP gap accounts from EventIQ dataset", () => {
    const gaps = findRicpGapAccounts(dataset, 20);
    expect(gaps.length).toBeGreaterThan(0);

    // At least one high-priority gap should be visible.
    expect(gaps.some((g) => g.company.priority <= 2)).toBe(true);
  });

  it("maps Phantom profile into EventIQ leader format with RICP metadata", () => {
    const leader = mapPhantomProfileToLeader({
      fullName: "Test Risk Leader",
      title: "Chief Risk Officer",
      summary: "Seasoned risk executive leading credit and portfolio controls.",
      linkedinUrl: "https://www.linkedin.com/in/test-risk-leader",
      sourceUrl: "https://example.com/leadership",
      email: "test@example.com",
    });

    expect(leader.n).toBe("Test Risk Leader");
    expect(leader.functionalRole).toBe("risk");
    expect(leader.confidence).toBeGreaterThan(0);
    expect(leader.sourceUrls?.length).toBeGreaterThan(0);
    expect(isRicpTitle(leader.t)).toBe(true);
  });

  it("applies enrichment in-memory and reduces missing RICP roles", () => {
    const target = findRicpGapAccounts(dataset, 1)[0];
    expect(target).toBeTruthy();

    const result = applyPhantomEnrichment(target.company, [
      {
        fullName: "Test Operations Leader",
        title: "Chief Operating Officer",
        linkedinUrl: "https://www.linkedin.com/in/test-ops-leader",
        sourceUrl: "https://example.com/ops",
        summary: "Operations executive responsible for scaling lending operations.",
      },
      {
        fullName: "Test Underwriting Leader",
        title: "Head of Underwriting",
        linkedinUrl: "https://www.linkedin.com/in/test-underwriting-leader",
        sourceUrl: "https://example.com/uw",
        summary: "Leads underwriting policy, exception handling, and credit standards.",
      },
    ]);

    expect(result.addedLeaders.length).toBeGreaterThan(0);
    expect(result.afterMissingRoles.length).toBeLessThanOrEqual(
      result.beforeMissingRoles.length
    );
    expect((result.enrichedCompany.leaders || []).some((l) => isRicpTitle(l.t))).toBe(true);
  });

  it("builds generic search argument that can feed Phantom launch payloads", () => {
    const arg = buildRicpSearchArgument("Credibly");
    expect(arg.company).toBe("Credibly");
    expect(arg.roleKeywords.length).toBeGreaterThan(3);
    expect(arg.searches.some((s) => s.includes("COO"))).toBe(true);
  });
});
