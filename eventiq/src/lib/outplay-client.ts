/**
 * Outplay API client for email sequence management.
 * Requires OUTPLAY_API_KEY env var.
 */

const OUTPLAY_API_BASE = "https://api.outplayhq.com/api/v1";

function getApiKey(): string | null {
  return process.env.OUTPLAY_API_KEY || null;
}

export function isOutplayConfigured(): boolean {
  return !!getApiKey();
}

async function outplayFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("OUTPLAY_API_KEY not configured");

  return fetch(`${OUTPLAY_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

// --- Types ---

export interface OutplaySequence {
  id: string;
  name: string;
  status: string;
  prospectsCount: number;
}

export interface OutplayProspect {
  id: string;
  email: string;
  name: string;
  status: string;
  sequenceId: string;
  currentStep: number;
}

// --- Functions ---

/**
 * List available sequences for the picker.
 */
export async function listSequences(): Promise<OutplaySequence[]> {
  try {
    const res = await outplayFetch("/sequences?status=active&limit=50");
    if (!res.ok) {
      console.error(`[Outplay] List sequences failed: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data.data || data.sequences || []).map(
      (s: { id: string; name: string; status: string; prospects_count?: number }) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        prospectsCount: s.prospects_count || 0,
      })
    );
  } catch (err) {
    console.error("[Outplay] Error listing sequences:", err);
    return [];
  }
}

/**
 * Add a prospect to an Outplay sequence.
 */
export async function addProspectToSequence(
  email: string,
  name: string,
  sequenceId: string,
  customFields?: {
    companyName?: string;
    title?: string;
    talkingPoints?: string;
    icebreaker?: string;
  }
): Promise<{ success: boolean; prospectId?: string; error?: string }> {
  try {
    const [firstName, ...lastParts] = name.split(" ");
    const lastName = lastParts.join(" ");

    const res = await outplayFetch("/prospects", {
      method: "POST",
      body: JSON.stringify({
        email,
        first_name: firstName,
        last_name: lastName,
        company: customFields?.companyName || "",
        title: customFields?.title || "",
        sequence_id: sequenceId,
        custom_fields: {
          talking_points: customFields?.talkingPoints || "",
          icebreaker: customFields?.icebreaker || "",
        },
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const errorMsg = errorData.message || `HTTP ${res.status}`;
      console.error(`[Outplay] Add prospect failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    const data = await res.json();
    return {
      success: true,
      prospectId: data.id || data.prospect?.id,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Outplay] Error adding prospect:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Check if a contact is already in a sequence.
 */
export async function getProspectStatus(
  email: string
): Promise<OutplayProspect | null> {
  try {
    const res = await outplayFetch(
      `/prospects?email=${encodeURIComponent(email)}&limit=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const prospect = (data.data || data.prospects || [])[0];
    if (!prospect) return null;
    return {
      id: prospect.id,
      email: prospect.email,
      name: `${prospect.first_name || ""} ${prospect.last_name || ""}`.trim(),
      status: prospect.status || "unknown",
      sequenceId: prospect.sequence_id || "",
      currentStep: prospect.current_step || 0,
    };
  } catch {
    return null;
  }
}
