"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar, FileText, Linkedin, MessageSquare, Pencil } from "lucide-react";

interface ContentItem {
  id: string;
  day: string; // "Mon" | "Tue" | "Wed" | "Thu" | "Fri"
  type: "linkedin_post" | "blog" | "industry_comment" | "case_study" | "thought_leadership";
  topic: string;
  status: "planned" | "drafted" | "published";
  template?: string;
}

const DEFAULT_CALENDAR: ContentItem[] = [
  { id: "1", day: "Mon", type: "linkedin_post", topic: "Industry insight — share recent news from MCA/lending space", status: "planned" },
  { id: "2", day: "Tue", type: "industry_comment", topic: "Engage with 3 target leaders' LinkedIn posts", status: "planned" },
  { id: "3", day: "Wed", type: "linkedin_post", topic: "Product value — how HyperVerge solves a specific pain", status: "planned" },
  { id: "4", day: "Thu", type: "blog", topic: "Long-form content — industry analysis or customer story", status: "planned" },
  { id: "5", day: "Fri", type: "linkedin_post", topic: "Thought leadership — perspective on industry trend", status: "planned" },
  { id: "6", day: "Fri", type: "industry_comment", topic: "Weekend engagement — comment on 2 industry posts", status: "planned" },
];

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  linkedin_post: { label: "LinkedIn Post", icon: Linkedin, color: "text-[var(--tam)]" },
  blog: { label: "Blog/Article", icon: FileText, color: "text-brand" },
  industry_comment: { label: "Engagement", icon: MessageSquare, color: "text-[var(--icp)]" },
  case_study: { label: "Case Study", icon: FileText, color: "text-[var(--client)]" },
  thought_leadership: { label: "Thought Leadership", icon: Pencil, color: "text-[var(--sqo)]" },
};

const STATUS_COLORS: Record<string, string> = {
  planned: "text-muted-foreground border-muted-foreground/30",
  drafted: "text-[var(--client)] border-[var(--client)]/30",
  published: "text-[var(--icp)] border-[var(--icp)]/30",
};

export function ContentCalendar() {
  const [items, setItems] = useState<ContentItem[]>(DEFAULT_CALENDAR);

  const cycleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = item.status === "planned" ? "drafted" : item.status === "drafted" ? "published" : "planned";
        return { ...item, status: next };
      })
    );
  };

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-semibold">Weekly Content Calendar</h3>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {days.map((day) => (
          <div key={day}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
              {day}
            </p>
            <div className="space-y-2">
              {items
                .filter((item) => item.day === day)
                .map((item) => {
                  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.linkedin_post;
                  const Icon = config.icon;
                  return (
                    <Card
                      key={item.id}
                      className="p-2 gap-1 shadow-none hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => cycleStatus(item.id)}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn("h-3.5 w-3.5", config.color)} />
                        <Badge
                          variant="outline"
                          className={cn("text-xs px-1 py-0 h-4", STATUS_COLORS[item.status])}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {item.topic}
                      </p>
                    </Card>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-2">
        Click items to cycle status: planned → drafted → published
      </p>
    </div>
  );
}
