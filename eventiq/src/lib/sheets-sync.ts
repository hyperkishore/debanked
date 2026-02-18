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
    const res = await fetch(config.url, {
      method: 'POST',
      mode: 'no-cors', // Apps Script doesn't support CORS preflight
      headers: { 'Content-Type': 'text/plain' }, // avoid preflight
      body: JSON.stringify(event),
    });
    // no-cors means we can't read the response, but if fetch didn't throw, it sent
    void res;
    return true;
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
        await fetch(config.url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(event),
        });
        sent++;
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
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ type: 'ping', payload: {}, timestamp: new Date().toISOString() }),
    });
    return true;
  } catch {
    return false;
  }
}
