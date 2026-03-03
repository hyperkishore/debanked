"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Linkedin, MessageSquare, Share2, Heart } from "lucide-react";

interface ActivityItem {
  id: string;
  leader_name: string;
  company_id: number;
  activity_type: string;
  content_summary: string;
  original_url: string;
  extracted_at: string;
}

interface ActivityFeedProps {
  limit?: number;
}

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  post: MessageSquare,
  share: Share2,
  comment: MessageSquare,
  reaction: Heart,
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = Date.now();
  const diffDays = Math.floor((now - d.getTime()) / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ActivityFeed({ limit = 10 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(`/api/linkedin-feed?limit=${limit}`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data.items || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
  }, [limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Linkedin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No LinkedIn activity tracked yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Configure PhantomBuster to start tracking leader activity
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((item) => {
        const Icon = ACTIVITY_ICONS[item.activity_type] || MessageSquare;
        return (
          <Card
            key={item.id}
            className="p-3 gap-2 shadow-none hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className="shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-[var(--tam)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-medium">{item.leader_name}</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-muted-foreground">
                    {item.activity_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground/60 ml-auto shrink-0">
                    {formatDate(item.extracted_at)}
                  </span>
                </div>
                {item.content_summary && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.content_summary}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
