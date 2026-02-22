"use client";

import { TabType } from "@/lib/types";
import { StreakData } from "@/lib/streak-helpers";
import { useAuth } from "@/contexts/auth-context";
import { SyncIndicator } from "@/components/sync-indicator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2, ListChecks, Users, Layers, CheckSquare, Search, BarChart3, Upload, Kanban, Settings2, Rss, LogIn, LogOut, Cloud, Map, UtensilsCrossed } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface AppSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenSearch: () => void;
  onOpenImport: () => void;
  onOpenSettings: () => void;
  metCount: number;
  totalCount: number;
  streakData: StreakData;
}

const navItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; shortcut: string }[] = [
  { id: "companies", label: "Companies", icon: Building2, shortcut: "1" },
  { id: "map", label: "Market Map", icon: Map, shortcut: "8" },
  { id: "feed", label: "Market Intel", icon: Rss, shortcut: "7" },
  { id: "dashboard", label: "Dashboard", icon: BarChart3, shortcut: "5" },
  { id: "pipeline", label: "Pipeline", icon: Kanban, shortcut: "6" },
  { id: "schedule", label: "Today", icon: ListChecks, shortcut: "2" },
  { id: "dinner", label: "Dinner", icon: UtensilsCrossed, shortcut: "9" },
  { id: "pitch", label: "Pitch", icon: Layers, shortcut: "3" },
  { id: "checklist", label: "Checklist", icon: CheckSquare, shortcut: "4" },
];

export function AppSidebar({
  activeTab,
  onTabChange,
  onOpenSearch,
  onOpenImport,
  onOpenSettings,
  metCount,
  totalCount,
  streakData,
}: AppSidebarProps) {
  const { user, isConfigured, signIn, signOut } = useAuth();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center">
            <span className="text-brand font-bold text-sm">EQ</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold">EventIQ</h1>
            <p className="text-xs text-muted-foreground">MCA Market Intelligence</p>
          </div>
          <SyncIndicator />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Search */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onOpenSearch}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                  <Kbd className="ml-auto">
                    &#x2318;K
                  </Kbd>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Import */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onOpenImport}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import Data</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Settings */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onOpenSettings}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Settings2 className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeTab === item.id}
                      onClick={() => onTabChange(item.id)}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Keyboard Shortcuts</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Navigate list</span>
                <Kbd>j/k</Kbd>
              </div>
              <div className="flex justify-between">
                <span>Open detail</span>
                <Kbd>Enter</Kbd>
              </div>
              <div className="flex justify-between">
                <span>Close detail</span>
                <Kbd>Esc</Kbd>
              </div>
              <div className="flex justify-between">
                <span>Search</span>
                <Kbd>/ or &#x2318;K</Kbd>
              </div>
              <div className="flex justify-between">
                <span>Toggle met</span>
                <Kbd>m</Kbd>
              </div>
              <div className="flex justify-between">
                <span>Log engagement</span>
                <Kbd>e or &#x2318;E</Kbd>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {/* Auth section */}
        {isConfigured && (
          <div className="mb-3 pb-3 border-b border-border/30">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                  <span className="text-brand font-bold text-xs">
                    {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-foreground truncate flex-1">
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={signOut}
                      className="h-6 w-6 text-muted-foreground"
                    >
                      <LogOut className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sign out</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={signIn}
                className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground h-auto px-1 py-1"
              >
                <Cloud className="h-3.5 w-3.5" />
                <span>Sign in to sync</span>
              </Button>
            )}
          </div>
        )}

        {/* Streak display */}
        {streakData.currentStreak > 0 && (
          <div className="flex items-center gap-2 mb-2" title={`Longest streak: ${streakData.longestStreak} days`}>
            <span className="streak-flame text-sm">&#x1F525;</span>
            <span className="text-xs font-semibold text-foreground">{streakData.currentStreak}d streak</span>
            <div className="flex-1 bg-muted/30 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min((streakData.currentStreak / 30) * 100, 100)}%`,
                  backgroundColor: streakData.currentStreak >= 14 ? "var(--icp)" : streakData.currentStreak >= 7 ? "var(--client)" : "var(--brand)",
                }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {metCount}/{totalCount} met
          </span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <span className="opacity-50">v3.0.00</span>
          </div>
        </div>
        <div className="w-full bg-muted/30 rounded-full h-1.5 mt-1">
          <div
            className="bg-brand/60 h-1.5 rounded-full transition-all"
            style={{ width: `${totalCount > 0 ? (metCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
