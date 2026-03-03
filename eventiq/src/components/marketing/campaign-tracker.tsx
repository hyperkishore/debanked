"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Plus,
  Mail,
  Linkedin,
  Calendar,
  FileText,
  Video,
  Package,
  Loader2,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  target_audience: string | null;
  metrics: Record<string, number>;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  email_sequence: { label: "Email", icon: Mail, color: "text-brand" },
  linkedin_sequence: { label: "LinkedIn", icon: Linkedin, color: "text-[var(--tam)]" },
  event: { label: "Event", icon: Calendar, color: "text-[var(--client)]" },
  content: { label: "Content", icon: FileText, color: "text-[var(--icp)]" },
  webinar: { label: "Webinar", icon: Video, color: "text-[var(--sqo)]" },
  direct_mail: { label: "Direct Mail", icon: Package, color: "text-muted-foreground" },
};

const STATUS_COLORS: Record<string, string> = {
  draft: "text-muted-foreground border-muted-foreground/30",
  active: "text-[var(--icp)] border-[var(--icp)]/30",
  paused: "text-[var(--client)] border-[var(--client)]/30",
  completed: "text-brand border-brand/30",
};

export function CampaignTracker() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("email_sequence");

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const res = await fetch("/api/campaigns");
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.campaigns || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchCampaigns();
  }, []);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), campaign_type: newType }),
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns((prev) => [data.campaign, ...prev]);
        setNewName("");
        setShowNew(false);
      }
    } catch {
      // Silently fail
    }
  }, [newName, newType]);

  const handleStatusCycle = useCallback(async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "draft" ? "active" : currentStatus === "active" ? "paused" : currentStatus === "paused" ? "completed" : "draft";
    // Optimistic update
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
    );
    try {
      await fetch("/api/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
    } catch {
      // Revert
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: currentStatus } : c))
      );
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Campaign Tracker</h3>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowNew(!showNew)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Campaign
        </Button>
      </div>

      {showNew && (
        <Card className="p-3 gap-2 shadow-none border-brand/20">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Campaign name..."
              className="text-sm h-8"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="h-8 text-xs rounded-md border border-input bg-background px-2"
            >
              {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
                <option key={key} value={key}>{conf.label}</option>
              ))}
            </select>
            <Button size="sm" className="h-8" onClick={handleCreate}>
              Create
            </Button>
          </div>
        </Card>
      )}

      {campaigns.length === 0 && !showNew && (
        <div className="text-center py-8">
          <Mail className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No campaigns yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Create your first campaign to start tracking outreach
          </p>
        </div>
      )}

      <div className="space-y-2">
        {campaigns.map((campaign) => {
          const config = TYPE_CONFIG[campaign.campaign_type] || TYPE_CONFIG.email_sequence;
          const Icon = config.icon;
          return (
            <Card
              key={campaign.id}
              className="p-3 gap-2 shadow-none hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{campaign.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs px-1.5 py-0 h-5 cursor-pointer",
                        STATUS_COLORS[campaign.status]
                      )}
                      onClick={() => handleStatusCycle(campaign.id, campaign.status)}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  {campaign.target_audience && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {campaign.target_audience}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground/60 shrink-0">
                  {new Date(campaign.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
