import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Singleton — safe for client-side static export
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("YOUR_PROJECT")) {
    return null; // Not configured — app works without Supabase
  }
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return _client;
}

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseKey && !supabaseUrl.includes("YOUR_PROJECT"));
}
