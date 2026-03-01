"use client";

import { TabType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Building2, ListChecks, BarChart3, Map, Rocket, MessageCircle } from "lucide-react";

interface MobileNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  metCount: number;
  totalCount: number;
  streakCount: number;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
}

const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "mission_control", label: "Mission", icon: Rocket },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "pipeline", label: "Pipeline", icon: BarChart3 },
  { id: "map", label: "Map", icon: Map },
  { id: "schedule", label: "Today", icon: ListChecks },
];

export function MobileNav({ activeTab, onTabChange, metCount, totalCount, streakCount, onToggleChat, isChatOpen }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant="ghost"
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative h-auto rounded-none p-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              onClick={() => onTabChange(tab.id)}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {/* Streak flame badge on mission control icon */}
                {tab.id === "mission_control" && streakCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 text-xs font-bold bg-[var(--sqo)]/20 text-[var(--sqo)] rounded-full w-4 h-4 flex items-center justify-center streak-flame-mini">
                    {streakCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold tracking-wide">
                {tab.label}
              </span>
            </Button>
          );
        })}
        {/* Kiket Chat — opens right panel */}
        <Button
          variant="ghost"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative h-auto rounded-none p-0",
            isChatOpen ? "text-primary" : "text-muted-foreground"
          )}
          onClick={onToggleChat}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-xs font-semibold tracking-wide">Kiket</span>
        </Button>
      </div>
    </nav>
  );
}
