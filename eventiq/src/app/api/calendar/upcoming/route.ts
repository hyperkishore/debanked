import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";

/**
 * GET /api/calendar/upcoming
 *
 * Fetches the authenticated user's Google Calendar events for the next 24 hours
 * and matches attendees/titles against companies in our dataset.
 *
 * Requires the Google OAuth provider_token passed via X-Google-Token header
 * (Supabase doesn't store provider tokens server-side).
 */

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  matchedCompanyId?: number;
  matchedCompanyName?: string;
  matchedLeaderName?: string;
  attendees: Array<{ email: string; name?: string; self?: boolean }>;
  location?: string;
  htmlLink?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{
    email: string;
    displayName?: string;
    self?: boolean;
  }>;
  location?: string;
  htmlLink?: string;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  // Get Google OAuth token from header (client passes it from session.provider_token)
  const googleToken = request.headers.get("X-Google-Token");
  if (!googleToken) {
    return apiError(
      "Google Calendar not connected. Sign out and sign back in to grant calendar access.",
      403
    );
  }

  // Fetch events for the next 24 hours from Google Calendar API
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const calendarUrl = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  );
  calendarUrl.searchParams.set("timeMin", now.toISOString());
  calendarUrl.searchParams.set("timeMax", tomorrow.toISOString());
  calendarUrl.searchParams.set("singleEvents", "true");
  calendarUrl.searchParams.set("orderBy", "startTime");
  calendarUrl.searchParams.set("maxResults", "20");

  const calRes = await fetch(calendarUrl.toString(), {
    headers: { Authorization: `Bearer ${googleToken}` },
  });

  if (!calRes.ok) {
    const errBody = await calRes.text();
    console.error("[calendar/upcoming] Google API error:", calRes.status, errBody);

    if (calRes.status === 401 || calRes.status === 403) {
      return apiError(
        "Calendar access expired or not granted. Sign out and sign back in to reconnect.",
        403
      );
    }
    return apiError("Failed to fetch calendar events", 502);
  }

  const calData = await calRes.json();
  const googleEvents: GoogleCalendarEvent[] = calData.items || [];

  // Load companies for matching
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, website, leaders");

  const companyList = (companies || []).map(
    (c: { id: number; name: string; website?: string; leaders?: Array<{ n: string; email?: string }> }) => ({
      id: c.id,
      name: c.name,
      domain: c.website
        ? c.website
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .split("/")[0]
            .toLowerCase()
        : null,
      leaders: (c.leaders || []) as Array<{ n: string; email?: string }>,
    })
  );

  // Match events against companies
  const events: CalendarEvent[] = googleEvents.map((evt) => {
    const title = evt.summary || "(No title)";
    const attendees = (evt.attendees || []).map((a) => ({
      email: a.email,
      name: a.displayName,
      self: a.self,
    }));

    // Try matching by attendee email domain or company name in title
    let matchedCompanyId: number | undefined;
    let matchedCompanyName: string | undefined;
    let matchedLeaderName: string | undefined;

    // 1. Match by attendee email domain against company website domains
    const externalAttendees = attendees.filter(
      (a) => !a.self && !a.email.endsWith("@hyperverge.co")
    );

    for (const attendee of externalAttendees) {
      const attendeeDomain = attendee.email.split("@")[1]?.toLowerCase();
      if (!attendeeDomain) continue;

      const match = companyList.find(
        (c) => c.domain && c.domain === attendeeDomain
      );
      if (match) {
        matchedCompanyId = match.id;
        matchedCompanyName = match.name;
        // Check if the attendee is a known leader
        const leader = match.leaders.find(
          (l) =>
            l.email?.toLowerCase() === attendee.email.toLowerCase() ||
            (attendee.name &&
              l.n.toLowerCase().includes(attendee.name.split(" ")[0].toLowerCase()))
        );
        if (leader) matchedLeaderName = leader.n;
        break;
      }
    }

    // 2. If no domain match, try matching company name in event title
    if (!matchedCompanyId) {
      const titleLower = title.toLowerCase();
      const match = companyList.find((c) => {
        const nameLower = c.name.toLowerCase();
        // Exact word boundary match to avoid false positives
        return (
          titleLower.includes(nameLower) &&
          nameLower.length >= 3 // avoid matching tiny names
        );
      });
      if (match) {
        matchedCompanyId = match.id;
        matchedCompanyName = match.name;
      }
    }

    // 3. Try matching attendee names against known leaders
    if (!matchedLeaderName && matchedCompanyId) {
      const company = companyList.find((c) => c.id === matchedCompanyId);
      if (company) {
        for (const attendee of externalAttendees) {
          if (!attendee.name) continue;
          const leader = company.leaders.find((l) =>
            l.n.toLowerCase() === attendee.name!.toLowerCase()
          );
          if (leader) {
            matchedLeaderName = leader.n;
            break;
          }
        }
      }
    }

    return {
      id: evt.id,
      title,
      startTime: evt.start?.dateTime || evt.start?.date || "",
      endTime: evt.end?.dateTime || evt.end?.date || "",
      matchedCompanyId,
      matchedCompanyName,
      matchedLeaderName,
      attendees,
      location: evt.location,
      htmlLink: evt.htmlLink,
    };
  });

  return NextResponse.json({ events });
}
