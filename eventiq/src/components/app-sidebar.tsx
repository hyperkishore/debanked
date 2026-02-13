"use client";

import { TabType } from "@/lib/types";
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
import { Building2, Clock, Layers, CheckSquare, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenSearch: () => void;
  metCount: number;
  totalCount: number;
}

const navItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; shortcut: string }[] = [
  { id: "companies", label: "Companies", icon: Building2, shortcut: "1" },
  { id: "schedule", label: "Schedule", icon: Clock, shortcut: "2" },
  { id: "pitch", label: "Pitch", icon: Layers, shortcut: "3" },
  { id: "checklist", label: "Checklist", icon: CheckSquare, shortcut: "4" },
];

export function AppSidebar({
  activeTab,
  onTabChange,
  onOpenSearch,
  metCount,
  totalCount,
}: AppSidebarProps) {
  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">EQ</span>
          </div>
          <div>
            <h1 className="text-sm font-bold">EventIQ</h1>
            <p className="text-[10px] text-muted-foreground">MCA Market Intelligence</p>
          </div>
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
                  <kbd className="ml-auto text-[10px] bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                    ⌘K
                  </kbd>
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
                <span className="font-mono text-[10px]">j/k</span>
              </div>
              <div className="flex justify-between">
                <span>Open detail</span>
                <span className="font-mono text-[10px]">Enter</span>
              </div>
              <div className="flex justify-between">
                <span>Close detail</span>
                <span className="font-mono text-[10px]">Esc</span>
              </div>
              <div className="flex justify-between">
                <span>Search</span>
                <span className="font-mono text-[10px]">/ or ⌘K</span>
              </div>
              <div className="flex justify-between">
                <span>Toggle met</span>
                <span className="font-mono text-[10px]">m</span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {metCount}/{totalCount} met
          </span>
          <span className="opacity-50">v2.0.01</span>
        </div>
        <div className="w-full bg-muted/30 rounded-full h-1.5 mt-1">
          <div
            className="bg-primary/60 h-1.5 rounded-full transition-all"
            style={{ width: `${totalCount > 0 ? (metCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
