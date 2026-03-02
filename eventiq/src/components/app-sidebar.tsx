"use client";

import { FilterType, TabType } from "@/lib/types";
import { StreakData } from "@/lib/streak-helpers";
import { useAuth } from "@/contexts/auth-context";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Building2, ListChecks, BarChart3, Kanban, Map, UtensilsCrossed, Upload, Download, Settings2, LogOut, Cloud, Code2, ChevronRight, BookOpen, Zap, MessageCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface AppSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenSearch: () => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  metCount: number;
  totalCount: number;
  streakData: StreakData;
  devMode: boolean;
  onToggleDevMode: () => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
}

type NavItem = { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; shortcut: string };

const coreNavItems: NavItem[] = [
  { id: "mission_control", label: "Mission Control", icon: Zap, shortcut: "1" },
  { id: "companies", label: "Companies", icon: Building2, shortcut: "2" },
  { id: "pipeline", label: "Pipeline", icon: Kanban, shortcut: "3" },
  { id: "map", label: "Market Map", icon: Map, shortcut: "4" },
  { id: "schedule", label: "Today", icon: ListChecks, shortcut: "5" },
  { id: "db_health", label: "Database Health", icon: BarChart3, shortcut: "6" },
  { id: "resources", label: "Resources", icon: BookOpen, shortcut: "7" },
  { id: "dinner", label: "Dinner", icon: UtensilsCrossed, shortcut: "8" },
];

const devNavItems: NavItem[] = [];

const filterOptions: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "SQO", label: "SQO" },
  { value: "Client", label: "Client" },
  { value: "ICP", label: "ICP" },
  { value: "TAM", label: "TAM" },
  { value: "Met", label: "Met" },
  { value: "CLEAR", label: "CLEAR" },
  { value: "FollowUp", label: "Follow-up" },
  { value: "ReadyToSend", label: "Ready" },
];

export function AppSidebar({
  activeTab,
  onTabChange,
  onOpenSearch,
  onOpenImport,
  onOpenExport,
  onOpenSettings,
  metCount,
  totalCount,
  streakData,
  devMode,
  onToggleDevMode,
  activeFilter,
  onFilterChange,
  onToggleChat,
  isChatOpen,
}: AppSidebarProps) {
  const { user, isConfigured, isPasswordAuth, signIn, signOut } = useAuth();
  const { toggleSidebar } = useSidebar();

  const navItems = devMode ? [...coreNavItems, ...devNavItems] : coreNavItems;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center shrink-0 cursor-pointer hover:bg-brand/30 transition-colors"
            onClick={toggleSidebar}
            title="Toggle sidebar"
          >
            <span className="text-brand font-bold text-sm">EQ</span>
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <h1 className="text-sm font-bold">EventIQ</h1>
            <p className="text-xs text-muted-foreground">MCA Market Intelligence</p>
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <SidebarTrigger />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeTab === item.id}
                      onClick={() => onTabChange(item.id)}
                      tooltip={item.label}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.id === "companies" && activeTab === "companies" && (
                      <div className="ml-7 mt-1 mb-1 flex flex-wrap gap-1 group-data-[collapsible=icon]:hidden">
                        {filterOptions.map((f) => (
                          <Badge
                            key={f.value}
                            variant={activeFilter === f.value ? "default" : "outline"}
                            className={`cursor-pointer text-xs px-2 py-0.5 ${
                              activeFilter === f.value
                                ? "bg-brand/20 text-brand border-brand/30 hover:bg-brand/30"
                                : "text-muted-foreground hover:text-foreground hover:border-foreground/30"
                            }`}
                            onClick={() => onFilterChange(f.value)}
                          >
                            {f.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Kiket Chat — opens right panel */}
        <SidebarGroup>
          <SidebarGroupLabel>AI Assistant</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isChatOpen}
                  onClick={onToggleChat}
                  tooltip="Kiket Chat"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Kiket</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="p-4">
        {/* Keyboard Shortcuts — collapsed by default */}
        <div className="group-data-[collapsible=icon]:hidden mb-3 pb-3 border-b border-border/30">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex items-center w-full px-1 py-1 rounded-md hover:bg-accent transition-colors">
              <span className="text-xs font-medium text-muted-foreground flex-1 text-left">
                Keyboard Shortcuts
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-1.5 text-xs text-muted-foreground px-1">
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
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* User dropdown menu */}
        {isConfigured && (
          <div className="mb-3 pb-3 border-b border-border/30">
            {(user || isPasswordAuth) ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 w-full rounded-md px-1 py-1 hover:bg-accent transition-colors outline-none">
                  <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                    <span className="text-brand font-bold text-xs">
                      {isPasswordAuth ? "G" : (user?.user_metadata?.full_name || user?.email || "U")[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-foreground truncate flex-1 text-left group-data-[collapsible=icon]:hidden">
                    {isPasswordAuth ? "Guest" : (user?.user_metadata?.full_name || user?.email?.split("@")[0])}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-48">
                  <DropdownMenuItem onClick={onOpenSettings}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenImport}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onToggleDevMode}>
                    <Code2 className="h-4 w-4 mr-2" />
                    Developer Mode
                    <span className={`ml-auto text-xs ${devMode ? "text-brand" : "text-muted-foreground"}`}>
                      {devMode ? "ON" : "OFF"}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={signIn}
                className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground px-1 py-1 rounded-md hover:bg-accent transition-colors"
              >
                <Cloud className="h-3.5 w-3.5" />
                <span className="group-data-[collapsible=icon]:hidden">Sign in to sync</span>
              </button>
            )}
          </div>
        )}

        {/* Streak display */}
        <div className="group-data-[collapsible=icon]:hidden">
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
              <span className="opacity-50">v3.1.82</span>
            </div>
          </div>
          <div className="w-full bg-muted/30 rounded-full h-1.5 mt-1">
            <div
              className="bg-brand/60 h-1.5 rounded-full transition-all"
              style={{ width: `${totalCount > 0 ? (metCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
