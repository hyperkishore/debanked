import { describe, it, expect, vi } from "vitest";

// Mock server-only module (throws in non-RSC environments)
vi.mock("server-only", () => ({}));
// Mock supabase-server (depends on server-only)
vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServer: vi.fn(() => null),
}));
// Mock @supabase/ssr
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

import { validateInt } from "../api-helpers";

// Note: requireInt depends on NextResponse so we test validateInt directly.
// authenticateRequest/authenticateAdmin require Supabase mocking — covered by integration tests.

describe("validateInt", () => {
  it("parses valid positive integers", () => {
    expect(validateInt("42")).toBe(42);
    expect(validateInt("0")).toBe(0);
    expect(validateInt("1")).toBe(1);
    expect(validateInt("999999")).toBe(999999);
  });

  it("parses negative integers", () => {
    expect(validateInt("-1")).toBe(-1);
    expect(validateInt("-100")).toBe(-100);
  });

  it("returns null for null/undefined/empty", () => {
    expect(validateInt(null)).toBeNull();
    expect(validateInt(undefined)).toBeNull();
    expect(validateInt("")).toBeNull();
  });

  it("returns null for non-numeric strings", () => {
    expect(validateInt("abc")).toBeNull();
    expect(validateInt("12.5")).toBe(12); // parseInt truncates
    expect(validateInt("NaN")).toBeNull();
    expect(validateInt("Infinity")).toBeNull();
  });

  it("handles leading/trailing content", () => {
    // parseInt("42abc") returns 42 — that's valid JS behavior
    expect(validateInt("42abc")).toBe(42);
  });
});
