"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Activity,
  Linkedin,
  MessageSquare,
  Building2,
  Clock,
} from "lucide-react";

interface EnrichmentEvent {
  id: string;
  companyId: number;
  companyName: string;
  leaderName: string | null;
  type: string;
  summary: string;
  createdAt: string;
}

interface LinkedInActivity {
  id: string;
  leader_name: string;
  company_id: number;
  activity_type: string;
  content_summary: string;
  original_url: string;
  extracted_at: string;
}

interface EnrichmentStatusProps {
  companyId: number;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; Icon: typeof Activity }> = {
  linkedin_activity: { label: "Activity", color: "text-blue-400", Icon: Linkedin },
  profile_hooks: { label: "Hooks", color: "text-purple-400", Icon: MessageSquare },
  company_intel: { label: "Intel", color: "text-emerald-400", Icon: Building2 },
  email_found: { label: "Email", color: "text-cyan-400", Icon: Activity },
};

export function EnrichmentStatus({ companyId }: EnrichmentStatusProps) {
  const [enrichments, setEnrichments] = useState<EnrichmentEvent[]>([]);
  const [activities, setActivities] = useState<LinkedInActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const [enrichRes, activityRes] = await Promise.allSettled([
        fetch(`/api/enrichment-feed?limit=10&companyId=${companyId}`).then(r => r.ok ? r.json() : { items: [] }),
        fetch(`/api/linkedin-feed?limit=5&companyId=${companyId}`).then(r => r.ok ? r.json() : { items: [] }),
      ]);

      if (!mounted) return;

      if (enrichRes.status === "fulfilled") {
        // Filter to this company (API may not support companyId filter yet)
        const items = (enrichRes.value.items || []).filter(
          (e: EnrichmentEvent) => e.companyId === companyId
        );
        setEnrichments(items);
      }

      if (activityRes.status === "fulfilled") {
        const items = (activityRes.value.items || []).filter(
          (a: LinkedInActivity) => a.company_id === companyId
        );
        setActivities(items);
      }

      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [companyId]);

  if (loading) return null;

  const hasData = enrichments.length > 0 || activities.length > 0;
  if (!hasData) return null;

  return (
    <div className="space-y-2">
      {/* LinkedIn Activity */}
      {activities.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Linkedin className="h-3 w-3 text-blue-400" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</span>
          </div>
          <div className="space-y-1">
            {activities.slice(0, 3).map((a) => (
              <Card key={a.id} className="p-2 shadow-none border-blue-500/10 bg-blue-500/5">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground">{a.leader_name}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-blue-400 border-blue-400/30">
                        {a.activity_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground/50 ml-auto">
                        {formatTimeAgo(a.extracted_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.content_summary}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Enrichment Events */}
      {enrichments.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="h-3 w-3 text-purple-400" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrichment Log</span>
          </div>
          <div className="space-y-1">
            {enrichments.slice(0, 5).map((e) => {
              const config = TYPE_CONFIG[e.type] || TYPE_CONFIG.linkedin_activity;
              return (
                <div key={e.id} className="flex items-start gap-2 text-xs py-1">
                  <config.Icon className={`h-3 w-3 ${config.color} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <span className={`font-medium ${config.color}`}>{config.label}</span>
                    {e.leaderName && <span className="text-foreground ml-1">{e.leaderName}</span>}
                    <p className="text-muted-foreground line-clamp-1">{e.summary}</p>
                  </div>
                  <span className="text-muted-foreground/50 shrink-0 text-[10px]">
                    {formatTimeAgo(e.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
