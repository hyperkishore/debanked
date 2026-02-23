// Google Sheets sync helper — POSTs data to a Google Apps Script web app

export type SyncEventType = 'feedback' | 'engagement' | 'pipeline' | 'met' | 'sequence' | 'ping';

export interface SyncEvent {
  type: SyncEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface SheetsConfig {
  url: string;
  enabled: boolean;
}

const STORAGE_KEY = 'eventiq_sheets_config';
const QUEUE_KEY = 'eventiq_sheets_queue';

export function getSheetsConfig(): SheetsConfig {
  if (typeof window === 'undefined') return { url: '', enabled: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { url: '', enabled: false };
}

export function saveSheetsConfig(config: SheetsConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** Send a sync event to Google Sheets. Non-blocking, queues on failure. */
export async function syncToSheets(type: SyncEventType, payload: Record<string, unknown>): Promise<boolean> {
  const config = getSheetsConfig();
  if (!config.enabled || !config.url) return false;

  const event: SyncEvent = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };

  try {
    // Use server-side proxy to avoid no-cors limitations
    const res = await fetch('/api/sheets-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: config.url, event }),
    });
    return res.ok;
  } catch {
    // Queue for retry
    queueEvent(event);
    return false;
  }
}

function queueEvent(event: SyncEvent): void {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue: SyncEvent[] = raw ? JSON.parse(raw) : [];
    queue.push(event);
    // Keep queue bounded
    if (queue.length > 100) queue.splice(0, queue.length - 100);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

/** Retry all queued events. Call periodically or on reconnect. */
export async function flushQueue(): Promise<number> {
  const config = getSheetsConfig();
  if (!config.enabled || !config.url) return 0;

  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return 0;
    const queue: SyncEvent[] = JSON.parse(raw);
    if (queue.length === 0) return 0;

    let sent = 0;
    const failed: SyncEvent[] = [];

    for (const event of queue) {
      try {
        const res = await fetch('/api/sheets-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: config.url, event }),
        });
        if (res.ok) sent++;
      } catch {
        failed.push(event);
      }
    }

    localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
    return sent;
  } catch {
    return 0;
  }
}

/** Test connection by sending a ping. Returns true if fetch didn't throw. */
export async function testConnection(url: string): Promise<boolean> {
  try {
    const event = { type: 'ping', payload: {}, timestamp: new Date().toISOString() };
    const res = await fetch('/api/sheets-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, event }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
