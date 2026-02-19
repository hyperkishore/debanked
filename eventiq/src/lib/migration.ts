/**
 * One-time migration: localStorage → Supabase.
 *
 * On first login, reads all 13 localStorage keys, batch-upserts to Supabase,
 * then sets `eventiq_migrated` flag. Idempotent (uses UPSERT, safe to re-run).
 */

import { getSupabase } from "./supabase";
import { TABLE_MAPPINGS } from "@/hooks/use-synced-storage";

const MIGRATED_KEY = "eventiq_migrated";

export function isMigrated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MIGRATED_KEY) === "true";
}

export async function migrateToSupabase(): Promise<{ migrated: number; errors: string[] }> {
  const supabase = getSupabase();
  if (!supabase) return { migrated: 0, errors: ["Supabase not configured"] };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { migrated: 0, errors: ["Not authenticated"] };

  const errors: string[] = [];
  let migrated = 0;

  for (const [lsKey, mapping] of Object.entries(TABLE_MAPPINGS)) {
    try {
      const raw = localStorage.getItem(lsKey);
      if (!raw) continue;

      const value = JSON.parse(raw);

      // Skip empty values
      if (value === null || value === undefined) continue;
      if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (typeof value === "string" && value.length === 0) continue;

      const rows = mapping.toRows(value, user.id);
      if (rows.length === 0) continue;

      // Batch upsert in chunks of 50 to avoid payload limits
      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase
          .from(mapping.table)
          .upsert(chunk, { onConflict: mapping.conflict });

        if (error) {
          errors.push(`${lsKey}: ${error.message}`);
        } else {
          migrated += chunk.length;
        }
      }
    } catch (err) {
      errors.push(`${lsKey}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Mark migration complete
  localStorage.setItem(MIGRATED_KEY, "true");

  return { migrated, errors };
}
