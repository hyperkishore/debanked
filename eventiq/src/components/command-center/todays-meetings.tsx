"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Mail,
  Loader2,
  ExternalLink,
  User,
  Building2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { getSupabase } from "@/lib/supabase";

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

interface TodaysMeetingsProps {
  onSelectCompany: (id: number) => void;
}

export function TodaysMeetings({ onSelectCompany }: TodaysMeetingsProps) {
  const { session, user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingBriefing, setSendingBriefing] = useState<string | null>(null);
  const [sentBriefings, setSentBriefings] = useState<Set<string>>(new Set());

  const fetchEvents = useCallback(async () => {
    // Get fresh provider_token from Supabase session
    const supabase = getSupabase();
    if (!supabase) {
      setError("Auth not configured");
      setLoading(false);
      return;
    }

    const {
      data: { session: freshSession },
    } = await supabase.auth.getSession();

    const providerToken = freshSession?.provider_token;
    if (!providerToken) {
      setError("calendar_not_connected");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/calendar/upcoming", {
        headers: { "X-Google-Token": providerToken },
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 403) {
          setError("calendar_not_connected");
        } else {
          setError(data.error || "Failed to load calendar");
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      setEvents(data.events || []);
      setError(null);
    } catch {
      setError("Failed to connect to calendar");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSendBriefing = async (evt: CalendarEvent) => {
    if (!evt.matchedCompanyId || !user?.email) return;

    setSendingBriefing(evt.id);
    try {
      const res = await fetch("/api/calendar/briefing-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: evt.matchedCompanyId,
          leaderName: evt.matchedLeaderName,
          userEmail: user.email,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to send briefing");
        return;
      }

      toast.success(`Briefing for ${evt.matchedCompanyName} sent to your email`);
      setSentBriefings((prev) => new Set(prev).add(evt.id));
    } catch {
      toast.error("Failed to send briefing");
    } finally {
      setSendingBriefing(null);
    }
  };

  function formatTime(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function timeUntil(iso: string): string {
    if (!iso) return "";
    const diff = new Date(iso).getTime() - Date.now();
    if (diff < 0) return "now";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `in ${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `in ${hrs}h ${mins % 60}m`;
  }

  // Calendar not connected state
  if (error === "calendar_not_connected") {
    return (
      <Card className="p-4 border-blue-500/20 bg-blue-500/5">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-blue-400">
            Today&apos;s Meetings
          </h3>
        </div>
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-blue-400" />
          <div>
            <p>
              Calendar not connected. Sign out and sign back in to grant Google
              Calendar access.
            </p>
            <p className="text-xs mt-1 text-muted-foreground/60">
              This will request read-only access to your Google Calendar to show
              upcoming meetings.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card className="p-4 border-blue-500/20 bg-blue-500/5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading calendar...
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-4 border-red-500/20 bg-red-500/5">
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      </Card>
    );
  }

  // No events
  if (events.length === 0) {
    return (
      <Card className="p-4 border-blue-500/20 bg-blue-500/5">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-blue-400">
            Today&apos;s Meetings
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          No meetings in the next 24 hours.
        </p>
      </Card>
    );
  }

  const matchedCount = events.filter((e) => e.matchedCompanyId).length;

  return (
    <Card className="p-4 border-blue-500/20 bg-blue-500/5">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-blue-400">
          Today&apos;s Meetings
        </h3>
        <Badge
          variant="outline"
          className="text-xs ml-auto bg-blue-500/10 text-blue-400 border-blue-500/30"
        >
          {events.length} meetings
          {matchedCount > 0 && ` / ${matchedCount} matched`}
        </Badge>
      </div>

      <div className="space-y-2">
        {events.map((evt) => {
          const isMatched = !!evt.matchedCompanyId;
          const isSent = sentBriefings.has(evt.id);
          const isSending = sendingBriefing === evt.id;
          const externalAttendees = evt.attendees.filter(
            (a) => !a.self && !a.email.endsWith("@hyperverge.co")
          );

          return (
            <div
              key={evt.id}
              className={`p-3 rounded-lg border transition-colors ${
                isMatched
                  ? "border-brand/30 bg-brand/5 hover:bg-brand/10"
                  : "border-border/50 hover:bg-secondary/50"
              }`}
            >
              {/* Time + Title row */}
              <div className="flex items-center gap-2">
                <div className="shrink-0 w-16 text-right">
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatTime(evt.startTime)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">
                      {evt.title}
                    </span>
                    {isMatched && (
                      <Badge
                        variant="outline"
                        className="text-xs px-1.5 py-0 h-4 bg-brand/10 text-brand border-brand/30 shrink-0 cursor-pointer"
                        onClick={() =>
                          evt.matchedCompanyId &&
                          onSelectCompany(evt.matchedCompanyId)
                        }
                      >
                        <Building2 className="h-2.5 w-2.5 mr-0.5" />
                        {evt.matchedCompanyName}
                      </Badge>
                    )}
                  </div>

                  {/* Attendees + meta */}
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground/60">
                      <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                      {timeUntil(evt.startTime)}
                    </span>
                    {evt.matchedLeaderName && (
                      <span className="text-xs text-brand/80">
                        <User className="h-2.5 w-2.5 inline mr-0.5" />
                        {evt.matchedLeaderName}
                      </span>
                    )}
                    {externalAttendees.length > 0 && !evt.matchedLeaderName && (
                      <span className="text-xs text-muted-foreground/60">
                        {externalAttendees.length} external{" "}
                        {externalAttendees.length === 1
                          ? "attendee"
                          : "attendees"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isMatched && (
                    <Button
                      size="sm"
                      variant={isSent ? "outline" : "default"}
                      className="h-7 px-2.5 text-xs"
                      disabled={isSending || isSent}
                      onClick={() => handleSendBriefing(evt)}
                    >
                      {isSending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Mail className="h-3 w-3 mr-1" />
                      )}
                      {isSent ? "Sent" : "Get Briefing"}
                    </Button>
                  )}
                  {evt.htmlLink && (
                    <a
                      href={evt.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-brand"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
