import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseServer } from "@/lib/supabase-server";
import { isValidPasswordAuth } from "@/lib/password-auth";

/**
 * Shared API route helpers — DRY auth, validation, error responses.
 * Replaces duplicated Supabase auth boilerplate across all routes.
 */

// --- Error helpers ---

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// --- Validation helpers ---

/** Parse and validate an integer from a string. Returns null if invalid. */
export function validateInt(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

/** Require a valid integer, returning an error response if invalid. */
export function requireInt(
  value: string | null | undefined,
  fieldName: string
): { value: number } | { error: NextResponse } {
  const n = validateInt(value);
  if (n === null) {
    return { error: apiError(`${fieldName} must be a valid integer`, 400) };
  }
  return { value: n };
}

// --- Auth helpers ---

/** Extract authenticated user from request cookies. Returns user or null. */
async function getAuthUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  return user;
}

/**
 * Authenticate any logged-in user (Supabase OAuth or password cookie).
 * Returns { user, supabase } on success, or { error: NextResponse } on failure.
 */
export async function authenticateRequest(request: NextRequest) {
  // Check password-based auth first
  const passwordCookie = request.cookies.get("eventiq_password_auth")?.value;
  if (isValidPasswordAuth(passwordCookie)) {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return { error: apiError("Database not configured", 503) } as const;
    }
    // Return a synthetic user for password-based auth
    const passwordUser = { id: "password-auth", email: "shared@eventiq.app" } as import("@supabase/supabase-js").User;
    return { user: passwordUser, supabase } as const;
  }

  const user = await getAuthUser(request);
  if (!user) {
    return { error: apiError("Unauthorized", 401) } as const;
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return { error: apiError("Database not configured", 503) } as const;
  }

  return { user, supabase } as const;
}

/**
 * Authenticate an admin user (must have @hyperverge.co email).
 * Returns { user, supabase } on success, or { error: NextResponse } on failure.
 */
export async function authenticateAdmin(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || !user.email?.endsWith("@hyperverge.co")) {
    return { error: apiError("Unauthorized", 401) } as const;
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return { error: apiError("Database not configured", 503) } as const;
  }

  return { user, supabase } as const;
}
