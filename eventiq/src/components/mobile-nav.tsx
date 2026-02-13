"use client";

import { TabType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Building2, Clock, Layers, CheckSquare } from "lucide-react";

interface MobileNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  metCount: number;
  totalCount: number;
}

const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "schedule", label: "Schedule", icon: Clock },
  { id: "pitch", label: "Pitch", icon: Layers },
  { id: "checklist", label: "Checklist", icon: CheckSquare },
];

export function MobileNav({ activeTab, onTabChange, metCount, totalCount }: MobileNavProps) {
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
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              onClick={() => onTabChange(tab.id)}
            >
              <Icon className="h-5 w-5" />
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
