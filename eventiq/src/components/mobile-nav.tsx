"use client";

import { useState } from "react";
import { TabType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Building2,
  BarChart3,
  Map,
  Rocket,
  MessageCircle,
  MoreHorizontal,
  Kanban,
  BookOpen,
  Package,
  FileText,
  Megaphone,
  Wrench,
  UtensilsCrossed,
  X,
} from "lucide-react";

interface MobileNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  metCount: number;
  totalCount: number;
  streakCount: number;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
}

const primaryTabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "mission_control", label: "Command", icon: Rocket },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
];

const moreTabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "map", label: "Market Map", icon: Map },
  { id: "db_health", label: "Database Health", icon: BarChart3 },
  { id: "resources", label: "Resources", icon: BookOpen },
  { id: "products", label: "Products", icon: Package },
  { id: "research", label: "Research", icon: FileText },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "dinner", label: "Dinner", icon: UtensilsCrossed },
];

export function MobileNav({ activeTab, onTabChange, metCount, totalCount, streakCount, onToggleChat, isChatOpen }: MobileNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreTabActive = moreTabs.some((t) => t.id === activeTab);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-14">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative h-auto rounded-none p-0 min-h-[48px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                onClick={() => onTabChange(tab.id)}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {tab.id === "mission_control" && streakCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 text-xs font-bold bg-[var(--sqo)]/20 text-[var(--sqo)] rounded-full w-4 h-4 flex items-center justify-center streak-flame-mini">
                      {streakCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold tracking-wide">
                  {tab.label}
                </span>
              </Button>
            );
          })}

          {/* More tab */}
          <Button
            variant="ghost"
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative h-auto rounded-none p-0 min-h-[48px]",
              isMoreTabActive ? "text-primary" : "text-muted-foreground"
            )}
            onClick={() => setMoreOpen(true)}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-semibold tracking-wide">More</span>
          </Button>

          {/* Kiket Chat */}
          <Button
            variant="ghost"
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative h-auto rounded-none p-0 min-h-[48px]",
              isChatOpen ? "text-primary" : "text-muted-foreground"
            )}
            onClick={onToggleChat}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-[10px] font-semibold tracking-wide">Kiket</span>
          </Button>
        </div>
      </nav>

      {/* More tabs sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[60vh] pb-[env(safe-area-inset-bottom)]">
          <SheetTitle className="text-sm font-semibold mb-3">More</SheetTitle>
          <SheetDescription className="sr-only">
            Navigate to additional sections of EventIQ.
          </SheetDescription>
          <div className="grid grid-cols-4 gap-3">
            {moreTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    setMoreOpen(false);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors min-h-[64px]",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>{metCount}/{totalCount} met</span>
            <span className="opacity-50">EventIQ v3.2.10</span>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
