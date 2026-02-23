/**
 * Offline-first sync queue for Supabase writes.
 * Mirrors the existing sheets-sync.ts pattern: localStorage-backed queue,
 * exponential backoff, flush on reconnect.
 */

import { getSupabase } from "./supabase";

export interface SyncOp {
  id: string;
  table: string;
  operation: "upsert" | "insert" | "delete";
  data: Record<string, unknown>;
  conflict?: string; // column for upsert conflict
  timestamp: string;
  retries: number;
}

const QUEUE_KEY = "eventiq_sync_queue";
const MAX_RETRIES = 5;
const MAX_QUEUE = 500;

// ---- Queue persistence ----

function readQueue(): SyncOp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: SyncOp[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    // storage full — drop oldest
  }
}

// ---- Public API ----

export function enqueue(op: Omit<SyncOp, "id" | "timestamp" | "retries">): void {
  const queue = readQueue();
  queue.push({
    ...op,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    retries: 0,
  });
  writeQueue(queue);
}

export function queueSize(): number {
  return readQueue().length;
}

export type SyncStatus = "idle" | "syncing" | "pending" | "error";

let _status: SyncStatus = "idle";
let _listeners: Array<(s: SyncStatus) => void> = [];

export function getSyncStatus(): SyncStatus {
  return _status;
}

export function onSyncStatusChange(cb: (s: SyncStatus) => void): () => void {
  _listeners.push(cb);
  return () => {
    _listeners = _listeners.filter((l) => l !== cb);
  };
}

function setStatus(s: SyncStatus) {
  _status = s;
  for (const cb of _listeners) cb(s);
}

// ---- Flush queue ----

let _flushing = false;

export async function flushSyncQueue(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase || _flushing) return 0;

  const queue = readQueue();
  if (queue.length === 0) {
    setStatus("idle");
    return 0;
  }

  _flushing = true;
  setStatus("syncing");

  let sent = 0;
  const failed: SyncOp[] = [];

  for (const op of queue) {
    try {
      let result;
      if (op.operation === "upsert") {
        result = await supabase
          .from(op.table)
          .upsert(op.data, op.conflict ? { onConflict: op.conflict } : undefined);
      } else if (op.operation === "insert") {
        result = await supabase.from(op.table).insert(op.data);
      } else if (op.operation === "delete") {
        // Expects data to have filter keys, e.g. { id: "..." }
        const id = op.data.id;
        if (!id) {
          // Skip delete ops without an id — don't count as success
          continue;
        }
        result = await supabase.from(op.table).delete().eq("id", id);
      }

      if (result?.error) {
        throw new Error(result.error.message);
      }
      sent++;
    } catch {
      if (op.retries < MAX_RETRIES) {
        failed.push({ ...op, retries: op.retries + 1 });
      }
      // else: drop after max retries
    }
  }

  writeQueue(failed);
  _flushing = false;

  if (failed.length > 0) {
    setStatus("pending");
  } else {
    setStatus("idle");
  }

  // Persist sync stats to localStorage
  try {
    const stats = {
      lastFlush: new Date().toISOString(),
      sent,
      failed: failed.length,
      pending: failed.length,
    };
    localStorage.setItem("eventiq_sync_stats", JSON.stringify(stats));
  } catch {
    // ignore storage errors
  }

  return sent;
}

// ---- Auto-flush on reconnect ----

if (typeof window !== "undefined") {
  // Flush when coming back online
  window.addEventListener("online", () => {
    flushSyncQueue();
  });

  // Initial check
  if (readQueue().length > 0) {
    setStatus("pending");
  }
}
