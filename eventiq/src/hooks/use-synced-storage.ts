"use client";

/**
 * useSyncedStorage — drop-in replacement for useLocalStorage.
 *
 * 1. Reads from localStorage immediately (same as useLocalStorage)
 * 2. When online + logged in: fetches from Supabase, merges (Supabase wins via updated_at)
 * 3. On write: localStorage first, then queues Supabase upsert
 * 4. On reconnect: flushes pending writes via sync-queue
 *
 * Returns [value, setValue, isHydrated] — identical signature to useLocalStorage.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import { enqueue, flushSyncQueue } from "@/lib/sync-queue";

// Maps localStorage key → Supabase table + shape config
interface TableMapping {
  table: string;
  /** How this localStorage data maps to rows. */
  shape: "record" | "array" | "scalar";
  /** Supabase conflict column for upsert (unique constraint). */
  conflict: string;
  /** Transform localStorage value → Supabase row(s). */
  toRows: (value: unknown, userId: string) => Record<string, unknown>[];
  /** Transform Supabase rows → localStorage value. */
  fromRows: (rows: Record<string, unknown>[]) => unknown;
}

// Helper to build column-keyed record rows (met, ratings, notes, pipeline, tags, checks)
function recordToRows(
  table: string,
  value: Record<string, unknown>,
  userId: string,
  buildRow: (key: string, val: unknown) => Record<string, unknown>
): Record<string, unknown>[] {
  return Object.entries(value).map(([key, val]) => ({
    user_id: userId,
    ...buildRow(key, val),
  }));
}

export const TABLE_MAPPINGS: Record<string, TableMapping> = {
  eventiq_met: {
    table: "company_met",
    shape: "record",
    conflict: "user_id,company_id",
    toRows: (value, userId) =>
      recordToRows("company_met", value as Record<string, boolean>, userId, (key, val) => ({
        company_id: parseInt(key),
        met: !!val,
      })),
    fromRows: (rows) => {
      const result: Record<string, boolean> = {};
      for (const r of rows) result[String(r.company_id)] = !!r.met;
      return result;
    },
  },
  eventiq_ratings: {
    table: "company_ratings",
    shape: "record",
    conflict: "user_id,company_id",
    toRows: (value, userId) =>
      recordToRows("company_ratings", value as Record<string, unknown>, userId, (key, val) => {
        const v = val as { rating?: string; followUps?: string[]; careAbout?: string; promised?: string; personal?: string };
        return {
          company_id: parseInt(key),
          rating: v.rating || "",
          follow_ups: v.followUps || [],
          care_about: v.careAbout || "",
          promised: v.promised || "",
          personal: v.personal || "",
        };
      }),
    fromRows: (rows) => {
      const result: Record<string, unknown> = {};
      for (const r of rows) {
        result[String(r.company_id)] = {
          rating: r.rating || "",
          followUps: r.follow_ups || [],
          careAbout: r.care_about || "",
          promised: r.promised || "",
          personal: r.personal || "",
        };
      }
      return result;
    },
  },
  eventiq_notes: {
    table: "company_notes",
    shape: "record",
    conflict: "user_id,company_id",
    toRows: (value, userId) =>
      recordToRows("company_notes", value as Record<string, string>, userId, (key, val) => ({
        company_id: parseInt(key),
        notes: String(val || ""),
      })),
    fromRows: (rows) => {
      const result: Record<string, string> = {};
      for (const r of rows) result[String(r.company_id)] = String(r.notes || "");
      return result;
    },
  },
  eventiq_checks: {
    table: "checklist_state",
    shape: "record",
    conflict: "user_id,check_key",
    toRows: (value, userId) =>
      recordToRows("checklist_state", value as Record<string, boolean>, userId, (key, val) => ({
        check_key: key,
        checked: !!val,
      })),
    fromRows: (rows) => {
      const result: Record<string, boolean> = {};
      for (const r of rows) result[String(r.check_key)] = !!r.checked;
      return result;
    },
  },
  eventiq_engagements: {
    table: "engagements",
    shape: "array",
    conflict: "id",
    toRows: (value, userId) =>
      (value as Array<Record<string, unknown>>).map((e) => ({
        id: e.id,
        user_id: userId,
        company_id: e.companyId,
        contact_name: e.contactName || "",
        channel: e.channel || "",
        action: e.action || "",
        timestamp: e.timestamp,
        notes: e.notes || "",
        source: e.source || "manual",
        metadata: e.metadata || {},
      })),
    fromRows: (rows) =>
      rows.map((r) => ({
        id: r.id,
        companyId: r.company_id,
        contactName: r.contact_name || "",
        channel: r.channel || "",
        action: r.action || "",
        timestamp: r.timestamp,
        notes: r.notes || "",
        source: r.source || "manual",
        metadata: r.metadata || {},
      })),
  },
  eventiq_pipeline: {
    table: "pipeline_records",
    shape: "record",
    conflict: "user_id,company_id",
    toRows: (value, userId) =>
      recordToRows("pipeline_records", value as Record<string, unknown>, userId, (key, val) => {
        const v = val as { stage?: string; movedAt?: string; dealValue?: number; closeDate?: string };
        return {
          company_id: parseInt(key),
          stage: v.stage || "researched",
          moved_at: v.movedAt || new Date().toISOString(),
          deal_value: v.dealValue,
          close_date: v.closeDate,
        };
      }),
    fromRows: (rows) => {
      const result: Record<string, unknown> = {};
      for (const r of rows) {
        result[String(r.company_id)] = {
          stage: r.stage || "researched",
          movedAt: r.moved_at || new Date().toISOString(),
          dealValue: r.deal_value,
          closeDate: r.close_date,
        };
      }
      return result;
    },
  },
  eventiq_follow_ups: {
    table: "follow_ups",
    shape: "array",
    conflict: "id",
    toRows: (value, userId) =>
      (value as Array<Record<string, unknown>>).map((f) => ({
        id: f.id,
        user_id: userId,
        company_id: f.companyId,
        contact_name: f.contactName || "",
        due_date: f.dueDate,
        notes: f.notes || "",
        completed: !!f.completed,
      })),
    fromRows: (rows) =>
      rows.map((r) => ({
        id: r.id,
        companyId: r.company_id,
        contactName: r.contact_name || "",
        dueDate: r.due_date,
        notes: r.notes || "",
        createdAt: r.created_at || new Date().toISOString(),
        completed: !!r.completed,
      })),
  },
  eventiq_sequences: {
    table: "sequence_progress",
    shape: "record",
    conflict: "user_id,company_id",
    toRows: (value, userId) =>
      recordToRows("sequence_progress", value as Record<string, unknown>, userId, (key, val) => {
        const v = val as { sequenceType?: string; startedAt?: string; completedSteps?: string[] };
        return {
          company_id: parseInt(key),
          sequence_type: v.sequenceType || "cold",
          started_at: v.startedAt || new Date().toISOString(),
          completed_steps: v.completedSteps || [],
        };
      }),
    fromRows: (rows) => {
      const result: Record<number, unknown> = {};
      for (const r of rows) {
        result[Number(r.company_id)] = {
          companyId: r.company_id,
          sequenceType: r.sequence_type || "cold",
          startedAt: r.started_at || new Date().toISOString(),
          completedSteps: r.completed_steps || [],
        };
      }
      return result;
    },
  },
  eventiq_tags: {
    table: "company_tags",
    shape: "record",
    conflict: "user_id,company_id",
    toRows: (value, userId) =>
      recordToRows("company_tags", value as Record<string, unknown>, userId, (key, val) => ({
        company_id: parseInt(key),
        tags: (val as string[]) || [],
      })),
    fromRows: (rows) => {
      const result: Record<number, string[]> = {};
      for (const r of rows) result[Number(r.company_id)] = (r.tags as string[]) || [];
      return result;
    },
  },
  eventiq_task_queue: {
    table: "task_queue_state",
    shape: "scalar",
    conflict: "user_id",
    toRows: (value, userId) => [
      { user_id: userId, queue_data: value },
    ],
    fromRows: (rows) => {
      const r = rows[0];
      if (!r) return { completedTasks: [], dismissedTasks: [], snoozedTasks: {}, lastResetDate: new Date().toISOString().slice(0, 10) };
      return r.queue_data ?? { completedTasks: [], dismissedTasks: [], snoozedTasks: {}, lastResetDate: new Date().toISOString().slice(0, 10) };
    },
  },
  eventiq_user_inputs: {
    table: "chat_messages",
    shape: "array",
    conflict: "id",
    toRows: (value, userId) =>
      (value as Array<Record<string, unknown>>).map((m) => ({
        id: m.id,
        user_id: userId,
        role: m.role || "user",
        content: m.content || "",
        timestamp: m.timestamp,
        category: m.category,
        context: m.context || {},
        resolved: !!m.resolved,
      })),
    fromRows: (rows) =>
      rows.map((r) => ({
        id: r.id,
        role: r.role || "user",
        content: r.content || "",
        timestamp: r.timestamp,
        category: r.category,
        context: r.context || {},
        resolved: !!r.resolved,
      })),
  },
  eventiq_quick_notes: {
    table: "user_settings",
    shape: "scalar",
    conflict: "user_id,setting_key",
    toRows: (value, userId) => [
      { user_id: userId, setting_key: "quick_notes", setting_value: { value } },
    ],
    fromRows: (rows) => {
      const r = rows[0];
      if (!r) return "";
      const sv = r.setting_value as { value?: string };
      return sv?.value ?? "";
    },
  },
  eventiq_imported_companies: {
    table: "imported_companies",
    shape: "scalar",
    conflict: "user_id",
    toRows: (value, userId) => [
      { user_id: userId, company_data: value },
    ],
    fromRows: (rows) => {
      const r = rows[0];
      if (!r) return [];
      return r.company_data ?? [];
    },
  },
};

/**
 * Drop-in replacement for useLocalStorage with Supabase sync.
 * Falls back to pure localStorage when not logged in or Supabase is not configured.
 */
export function useSyncedStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);
  const latestValue = useRef<T>(initialValue);
  // Track keys that have pending local writes — don't let Supabase overwrite them during merge
  const pendingWriteKeys = useRef<Set<string>>(new Set());

  // Load from localStorage on mount (same as useLocalStorage)
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item) as T;
        setStoredValue(parsed);
        latestValue.current = parsed;
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    setIsHydrated(true);
  }, [key]);

  // Pull from Supabase once after hydration (if logged in)
  useEffect(() => {
    if (!isHydrated) return;
    const mapping = TABLE_MAPPINGS[key];
    if (!mapping) return;

    const supabase = getSupabase();
    if (!supabase) return;

    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      let query = supabase.from(mapping.table).select("*").eq("user_id", user.id);

      // For scalar settings, filter by key
      if (key === "eventiq_quick_notes") {
        query = query.eq("setting_key", "quick_notes");
      }

      const { data: rows, error } = await query;
      if (error || !rows || rows.length === 0 || cancelled) return;

      const remoteValue = mapping.fromRows(rows) as T;

      // Merge strategy: for arrays, union by id; for records, Supabase wins
      if (mapping.shape === "array") {
        const local = latestValue.current as unknown as Array<{ id: string }>;
        const remote = remoteValue as unknown as Array<{ id: string }>;
        const merged = [...remote];
        const remoteIds = new Set(remote.map((r) => r.id));
        for (const item of local) {
          if (!remoteIds.has(item.id)) merged.push(item);
        }
        const mergedValue = merged as unknown as T;
        setStoredValue(mergedValue);
        latestValue.current = mergedValue;
        try {
          window.localStorage.setItem(key, JSON.stringify(mergedValue));
        } catch {}
      } else {
        // Record/scalar: Supabase wins (last-writer-wins), but protect pending local writes
        if (typeof remoteValue === "object" && remoteValue !== null && !Array.isArray(remoteValue)) {
          const local = latestValue.current as Record<string, unknown>;
          const remote = remoteValue as Record<string, unknown>;
          const merged: Record<string, unknown> = { ...local, ...remote };
          // For keys with pending writes, keep local value instead of remote
          for (const pendingKey of pendingWriteKeys.current) {
            if (pendingKey in local) {
              merged[pendingKey] = local[pendingKey];
            }
          }
          const mergedValue = merged as T;
          setStoredValue(mergedValue);
          latestValue.current = mergedValue;
          try {
            window.localStorage.setItem(key, JSON.stringify(mergedValue));
          } catch {}
        } else {
          setStoredValue(remoteValue);
          latestValue.current = remoteValue;
          try {
            window.localStorage.setItem(key, JSON.stringify(remoteValue));
          } catch {}
        }
      }

      // Flush any pending writes while we're at it
      flushSyncQueue();
    })();

    return () => { cancelled = true; };
  }, [isHydrated, key]);

  // Cross-tab sync: listen for storage events from other tabs
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === key && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue) as T;
          setStoredValue(parsed);
          latestValue.current = parsed;
        } catch {
          // ignore parse errors from external writes
        }
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key]);

  // Update function with auto-persistence + Supabase queue
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(latestValue.current) : value;
        setStoredValue(valueToStore);
        latestValue.current = valueToStore;

        // Write to localStorage immediately
        window.localStorage.setItem(key, JSON.stringify(valueToStore));

        // Queue Supabase write if mapping exists
        const mapping = TABLE_MAPPINGS[key];
        if (!mapping) return;

        // Track this key as having a pending write
        if (typeof valueToStore === "object" && valueToStore !== null && !Array.isArray(valueToStore)) {
          for (const k of Object.keys(valueToStore as Record<string, unknown>)) {
            pendingWriteKeys.current.add(k);
          }
        }

        const supabase = getSupabase();
        if (!supabase) return;

        // Fire-and-forget: check auth then queue
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user) return;
          const rows = mapping.toRows(valueToStore, user.id);
          for (const row of rows) {
            enqueue({
              table: mapping.table,
              operation: "upsert",
              data: row,
              conflict: mapping.conflict,
            });
          }
          // Try to flush immediately (non-blocking), then clear pending keys
          flushSyncQueue().then(() => {
            pendingWriteKeys.current.clear();
          });
        });
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key]
  );

  return [storedValue, setValue, isHydrated] as const;
}
