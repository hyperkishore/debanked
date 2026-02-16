"use client";

import { TabType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Building2, Clock, Layers, CheckSquare, BarChart3, Kanban } from "lucide-react";

interface MobileNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  metCount: number;
  totalCount: number;
  streakCount: number;
}

const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "pitch", label: "Pitch", icon: Layers },
  { id: "checklist", label: "Checklist", icon: CheckSquare },
];

export function MobileNav({ activeTab, onTabChange, metCount, totalCount, streakCount }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              onClick={() => onTabChange(tab.id)}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {/* Streak flame badge on dashboard icon */}
                {tab.id === "dashboard" && streakCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 text-[8px] font-bold bg-[var(--sqo)]/20 text-[var(--sqo)] rounded-full w-4 h-4 flex items-center justify-center streak-flame-mini">
                    {streakCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-semibold tracking-wide">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
