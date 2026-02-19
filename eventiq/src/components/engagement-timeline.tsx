"use client";

import { useState } from "react";
import { EngagementEntry, EngagementChannel } from "@/lib/types";
import {
  getChannelConfig,
  formatEngagementTime,
  formatActionLabel,
} from "@/lib/engagement-helpers";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import {
  Mail,
  Linkedin,
  MessageCircle,
  Phone,
  Calendar,
  StickyNote,
  Plus,
  Trash2,
  Activity,
  ChevronDown,
} from "lucide-react";

interface EngagementTimelineProps {
  engagements: EngagementEntry[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}

const channelIcons: Record<EngagementChannel, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  linkedin: Linkedin,
  imessage: MessageCircle,
  call: Phone,
  meeting: Calendar,
  note: StickyNote,
};

const INITIAL_SHOW = 10;

export function EngagementTimeline({
  engagements,
  onAdd,
  onDelete,
}: EngagementTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visibleEngagements = expanded
    ? engagements
    : engagements.slice(0, INITIAL_SHOW);
  const hasMore = engagements.length > INITIAL_SHOW;

  const handleDelete = (id: string) => {
    if (deletingId === id) {
      onDelete(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      // Auto-reset after 3 seconds
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Engagement
          </h3>
          {engagements.length > 0 && (
            <span className="text-xs text-muted-foreground/60">
              ({engagements.length})
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
          onClick={onAdd}
          title="Log engagement (e)"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Empty state */}
      {engagements.length === 0 && (
        <div className="text-xs text-muted-foreground/60 bg-secondary/20 rounded-lg p-3 text-center">
          No interactions logged. Press <Kbd>e</Kbd> to log one.
        </div>
      )}

      {/* Timeline entries */}
      {visibleEngagements.length > 0 && (
        <div className="space-y-1">
          {visibleEngagements.map((entry) => {
            const config = getChannelConfig(entry.channel);
            const Icon = channelIcons[entry.channel];
            return (
              <div
                key={entry.id}
                className="group flex items-start gap-2 rounded-lg bg-secondary/20 px-2.5 py-2 hover:bg-secondary/30 transition-colors"
              >
                <div className={cn("mt-0.5 rounded-md p-1", config.colorClass)}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-medium truncate">
                      {formatActionLabel(entry.action)}
                    </span>
                    <span className="text-muted-foreground/60">with</span>
                    <span className="font-medium truncate">{entry.contactName}</span>
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">
                      {entry.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {entry.source !== "manual" && (
                    <span className="text-xs px-1 py-0.5 rounded bg-muted/50 text-muted-foreground/50 uppercase">
                      auto
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground/50">
                    {formatEngagementTime(entry.timestamp)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-5 w-5 rounded flex items-center justify-center transition-all",
                      deletingId === entry.id
                        ? "bg-destructive/20 text-destructive opacity-100"
                        : "opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                    )}
                    onClick={() => handleDelete(entry.id)}
                    title={deletingId === entry.id ? "Click again to confirm" : "Delete"}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Show more */}
      {hasMore && !expanded && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 mt-1 text-xs text-muted-foreground"
          onClick={() => setExpanded(true)}
        >
          <ChevronDown className="h-3 w-3 mr-1" />
          Show all ({engagements.length})
        </Button>
      )}
    </div>
  );
}
