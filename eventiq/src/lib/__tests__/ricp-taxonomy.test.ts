import { describe, it, expect } from "vitest";
import { classifyTitle, isRicpTitle, normalizePersonName, deduplicatePeople } from "../ricp-taxonomy";

describe("classifyTitle", () => {
  it("classifies C-suite operations titles", () => {
    expect(classifyTitle("Chief Operating Officer").role).toBe("operations");
    expect(classifyTitle("COO").role).toBe("operations");
  });

  it("classifies risk titles", () => {
    expect(classifyTitle("Chief Risk Officer").role).toBe("risk");
    expect(classifyTitle("Head of Risk Management").role).toBe("risk");
    expect(classifyTitle("Risk Analyst").role).toBe("risk");
  });

  it("classifies underwriting titles", () => {
    expect(classifyTitle("Chief Credit Officer").role).toBe("underwriting");
    expect(classifyTitle("VP of Underwriting").role).toBe("underwriting");
    expect(classifyTitle("Underwriter").role).toBe("underwriting");
    expect(classifyTitle("Credit Manager").role).toBe("underwriting");
  });

  it("classifies finance titles", () => {
    expect(classifyTitle("CFO").role).toBe("finance");
    expect(classifyTitle("Chief Financial Officer").role).toBe("finance");
    expect(classifyTitle("VP of Finance").role).toBe("finance");
    expect(classifyTitle("Controller").role).toBe("finance");
  });

  it("classifies sales titles", () => {
    expect(classifyTitle("Chief Revenue Officer").role).toBe("sales");
    expect(classifyTitle("VP of Sales").role).toBe("sales");
    expect(classifyTitle("Account Executive").role).toBe("sales");
  });

  it("classifies technology titles", () => {
    expect(classifyTitle("CTO").role).toBe("technology");
    expect(classifyTitle("VP of Engineering").role).toBe("technology");
  });

  it("returns general for unrecognized titles", () => {
    expect(classifyTitle("Marketing Manager").role).toBe("general");
    expect(classifyTitle("Intern").role).toBe("general");
    expect(classifyTitle("").role).toBe("general");
  });

  it("returns higher weight for C-suite", () => {
    const coo = classifyTitle("COO");
    const opsManager = classifyTitle("Operations Manager");
    expect(coo.weight).toBeGreaterThan(opsManager.weight);
  });
});

describe("isRicpTitle", () => {
  it("returns true for RICP roles with sufficient weight", () => {
    expect(isRicpTitle("Chief Operating Officer")).toBe(true);
    expect(isRicpTitle("Chief Risk Officer")).toBe(true);
    expect(isRicpTitle("VP of Underwriting")).toBe(true);
    expect(isRicpTitle("CFO")).toBe(true);
    expect(isRicpTitle("Operations Manager")).toBe(true);
    expect(isRicpTitle("Underwriter")).toBe(true);
    expect(isRicpTitle("Credit Analyst")).toBe(true);
  });

  it("returns false for non-RICP roles", () => {
    expect(isRicpTitle("VP of Sales")).toBe(false);
    expect(isRicpTitle("CTO")).toBe(false);
    expect(isRicpTitle("Marketing Director")).toBe(false);
    expect(isRicpTitle("")).toBe(false);
  });
});

describe("normalizePersonName", () => {
  it("lowercases names", () => {
    expect(normalizePersonName("John Smith")).toBe("john smith");
  });

  it("strips suffixes", () => {
    expect(normalizePersonName("John Smith Jr.")).toBe("john smith");
    expect(normalizePersonName("Robert Jones III")).toBe("robert jones");
    expect(normalizePersonName("Dr. Jane Doe PhD")).toBe("dr jane doe");
  });

  it("removes punctuation", () => {
    expect(normalizePersonName("O'Brien")).toBe("obrien");
    expect(normalizePersonName("Smith, Jr.")).toBe("smith");
  });

  it("collapses whitespace", () => {
    expect(normalizePersonName("  John   Smith  ")).toBe("john smith");
  });
});

describe("deduplicatePeople", () => {
  it("removes exact duplicate names", () => {
    const people = [
      { n: "John Smith", t: "CEO", bg: "Short bio" },
      { n: "John Smith", t: "CEO", bg: "A much longer and more detailed biography" },
    ];
    const result = deduplicatePeople(people);
    expect(result).toHaveLength(1);
    expect(result[0].bg).toBe("A much longer and more detailed biography");
  });

  it("handles suffix variations as same person", () => {
    const people = [
      { n: "John Smith Jr.", t: "CEO", bg: "Bio 1" },
      { n: "John Smith", t: "CEO", bg: "Much longer biography text here for comparison" },
    ];
    const result = deduplicatePeople(people);
    expect(result).toHaveLength(1);
  });

  it("keeps distinct people", () => {
    const people = [
      { n: "John Smith", t: "CEO", bg: "Bio" },
      { n: "Jane Doe", t: "CFO", bg: "Bio" },
    ];
    const result = deduplicatePeople(people);
    expect(result).toHaveLength(2);
  });

  it("handles empty array", () => {
    expect(deduplicatePeople([])).toHaveLength(0);
  });
});
