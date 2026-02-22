import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service role key.
 * Use this for API routes where we need to bypass RLS
 * (e.g., reading the shared companies table).
 *
 * The `server-only` import above ensures a build error if this
 * module is accidentally imported from a client component.
 */
export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? "";

  if (!url || !serviceKey || url.includes("YOUR_PROJECT")) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
