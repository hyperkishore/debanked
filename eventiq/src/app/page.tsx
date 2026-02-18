"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Company,
  FilterType,
  SortType,
  ViewType,
  TabType,
  RatingData,
  EngagementEntry,
  EngagementChannel,
} from "@/lib/types";
import { computeStreak, checkMilestone, checkStreakMilestone, StreakData, DEFAULT_STREAK } from "@/lib/streak-helpers";
import { PipelineStage, PipelineRecord, inferStage } from "@/lib/pipeline-helpers";
import { FollowUpReminder } from "@/lib/follow-up-helpers";
import { FollowUpData } from "@/components/engagement-log";
import companiesData from "@/data/all-companies.json";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app-sidebar";
import { CompanyList } from "@/components/company-list";
import { CompanyDetail } from "@/components/company-detail";
import { SearchCommand } from "@/components/search-command";
import { RatingDialog } from "@/components/rating-dialog";
import { EngagementLog } from "@/components/engagement-log";
import { getCompanyEngagements, deduplicateEngagements } from "@/lib/engagement-helpers";
import { ImportDialog } from "@/components/import-dialog";
import { ChatWidget, ChatFab } from "@/components/chat-widget";
import {
  ChatMessage,
  InputContext,
  detectCategory,
  generateBotResponse,
  generateId,
  getPendingCount,
} from "@/lib/chat-helpers";
import { MobileNav } from "@/components/mobile-nav";
import { PitchTab } from "@/components/pitch-tab";
import { ScheduleTab } from "@/components/schedule-tab";
import { ChecklistTab } from "@/components/checklist-tab";
import { DashboardTab } from "@/components/dashboard-tab";
import { PipelineTab } from "@/components/pipeline-tab";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useKeyboard } from "@/hooks/use-keyboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

const buildTimeCompanies = companiesData as Company[];

export default function Home() {
  const isMobile = useIsMobile();

  // State
  const [activeTab, setActiveTab] = useState<TabType>("companies");
  const [selectedId, setSelectedId] = useState<number | null>(buildTimeCompanies[0]?.id ?? null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeSort, setActiveSort] = useState<SortType>("priority");
  const [activeView, setActiveView] = useState<ViewType>("cards");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery] = useState("");
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingCompanyId, setRatingCompanyId] = useState<number | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Persistent state
  const [metState, setMetState] = useLocalStorage<Record<string, boolean>>(
    "eventiq_met",
    {}
  );
  const [ratingState, setRatingState] = useLocalStorage<
    Record<string, RatingData>
  >("eventiq_ratings", {});
  const [notesState, setNotesState] = useLocalStorage<Record<string, string>>(
    "eventiq_notes",
    {}
  );
  const [checkState, setCheckState] = useLocalStorage<Record<string, boolean>>(
    "eventiq_checks",
    {}
  );
  const [quickNotes, setQuickNotes] = useLocalStorage<string>(
    "eventiq_quick_notes",
    ""
  );
  const [engagements, setEngagements] = useLocalStorage<EngagementEntry[]>(
    "eventiq_engagements",
    []
  );
  const [engagementDialogOpen, setEngagementDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Chat widget state
  const [chatMessages, setChatMessages] = useLocalStorage<ChatMessage[]>(
    "eventiq_user_inputs",
    []
  );

  // Pipeline state
  const [pipelineState, setPipelineState] = useLocalStorage<Record<string, PipelineRecord>>(
    "eventiq_pipeline",
    {}
  );

  // Follow-up reminders state
  const [followUps, setFollowUps] = useLocalStorage<FollowUpReminder[]>(
    "eventiq_follow_ups",
    []
  );

  // Imported companies from localStorage (merged at runtime with build-time data)
  const [importedCompanies, setImportedCompanies] = useLocalStorage<Company[]>(
    "eventiq_imported_companies",
    []
  );

  // Merge build-time + imported companies (imported updates override build-time fields)
  const companies = useMemo(() => {
    if (importedCompanies.length === 0) return buildTimeCompanies;

    const merged = [...buildTimeCompanies];
    const existingById = new Map(merged.map((c, idx) => [c.id, idx]));

    for (const imp of importedCompanies) {
      const existingIdx = existingById.get(imp.id);
      if (existingIdx !== undefined) {
        // Merge: imported fields override existing empty fields
        const existing = merged[existingIdx];
        merged[existingIdx] = {
          ...existing,
          desc: imp.desc || existing.desc,
          website: imp.website || existing.website,
          linkedinUrl: imp.linkedinUrl || existing.linkedinUrl,
          location: imp.location || existing.location,
          employees: imp.employees || existing.employees,
          contacts: imp.contacts.length > existing.contacts.length ? imp.contacts : existing.contacts,
          notes: imp.notes || existing.notes,
          source: Array.from(new Set([...(existing.source || []), ...(imp.source || [])])),
        };
      } else {
        merged.push(imp);
      }
    }
    return merged;
  }, [importedCompanies]);

  // Compute streak data from engagements
  const streakData = useMemo<StreakData>(() => computeStreak(engagements), [engagements]);

  // Auto-infer pipeline stages on first load (only if pipeline state is empty)
  useEffect(() => {
    if (Object.keys(pipelineState).length > 0) return;
    const inferred: Record<string, PipelineRecord> = {};
    for (const c of companies) {
      inferred[c.id] = {
        stage: inferStage(c, metState, ratingState, engagements),
        movedAt: new Date().toISOString(),
      };
    }
    setPipelineState(inferred);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/debanked/sw.js").catch(() => {});
    }
  }, []);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedId) || null,
    [selectedId, companies]
  );

  const metCount = useMemo(
    () => Object.values(metState).filter(Boolean).length,
    [metState]
  );

  // Handlers
  const handleSelect = useCallback(
    (id: number) => {
      setSelectedId(id);
      setActiveTab("companies");
      if (isMobile) {
        setMobileDetailOpen(true);
      }
    },
    [isMobile]
  );

  const handleToggleMet = useCallback(
    (id: number) => {
      const wasMet = metState[id];
      setMetState((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
      if (!wasMet) {
        setRatingCompanyId(id);
        setRatingDialogOpen(true);
      }
    },
    [metState, setMetState]
  );

  const handleSaveNotes = useCallback(
    (id: number, notes: string) => {
      setNotesState((prev) => ({ ...prev, [id]: notes }));
    },
    [setNotesState]
  );

  const handleSaveRating = useCallback(
    (data: RatingData) => {
      if (ratingCompanyId !== null) {
        setRatingState((prev) => ({ ...prev, [ratingCompanyId]: data }));
      }
    },
    [ratingCompanyId, setRatingState]
  );

  const handleToggleCheck = useCallback(
    (key: string) => {
      setCheckState((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [setCheckState]
  );

  const handleJumpToCompany = useCallback(
    (name: string) => {
      const company = companies.find(
        (c) =>
          c.name.toLowerCase() === name.toLowerCase() ||
          c.name.toLowerCase().includes(name.toLowerCase())
      );
      if (company) {
        handleSelect(company.id);
      }
    },
    [handleSelect]
  );

  const selectedCompanyEngagements = useMemo(
    () => (selectedId ? getCompanyEngagements(engagements, selectedId) : []),
    [engagements, selectedId]
  );

  const handleAddEngagement = useCallback(
    (entry: EngagementEntry, followUp?: FollowUpData) => {
      const prevTotal = engagements.length;
      const prevStreak = streakData.currentStreak;

      setEngagements((prev) => [...prev, entry]);

      // Create follow-up if provided
      if (followUp) {
        const reminder: FollowUpReminder = {
          id: crypto.randomUUID(),
          companyId: entry.companyId,
          contactName: entry.contactName,
          dueDate: followUp.dueDate,
          notes: followUp.notes,
          createdAt: new Date().toISOString(),
        };
        setFollowUps((prev) => [...prev, reminder]);
      }

      // Check milestones after adding
      const newTotal = prevTotal + 1;
      const milestone = checkMilestone(prevTotal, newTotal);
      if (milestone) {
        toast.success(`${milestone.emoji} ${milestone.label}`, {
          duration: 4000,
        });
      }

      // Check streak milestones after a brief delay (streak recomputes async)
      setTimeout(() => {
        const newStreak = computeStreak([...engagements, entry]);
        const streakMilestone = checkStreakMilestone(prevStreak, newStreak.currentStreak);
        if (streakMilestone) {
          toast.success(`${streakMilestone.emoji} ${streakMilestone.label}`, {
            duration: 4000,
          });
        }
      }, 100);
    },
    [setEngagements, setFollowUps, engagements, streakData]
  );

  const handleDeleteEngagement = useCallback(
    (id: string) => {
      setEngagements((prev) => prev.filter((e) => e.id !== id));
    },
    [setEngagements]
  );

  // Quick-log from message draft copy toast
  const handleQuickLog = useCallback(
    (contactName: string, channel: EngagementChannel, action: string) => {
      if (!selectedId) return;
      const entry: EngagementEntry = {
        id: crypto.randomUUID(),
        companyId: selectedId,
        contactName,
        channel,
        action,
        timestamp: new Date().toISOString(),
        notes: "",
        source: "manual",
      };
      handleAddEngagement(entry);
      toast.success("Engagement logged");
    },
    [selectedId, handleAddEngagement]
  );

  // Follow-up handlers
  const handleSnooze = useCallback(
    (followUpId: string, newDate: string) => {
      setFollowUps((prev) =>
        prev.map((f) => (f.id === followUpId ? { ...f, dueDate: newDate } : f))
      );
      toast.success("Snoozed");
    },
    [setFollowUps]
  );

  const handleCompleteFollowUp = useCallback(
    (followUpId: string) => {
      setFollowUps((prev) =>
        prev.map((f) => (f.id === followUpId ? { ...f, completed: true } : f))
      );
      toast.success("Follow-up completed");
    },
    [setFollowUps]
  );

  // Open engagement from action feed / TodayActions (select company first, then open dialog)
  const handleOpenEngagementForCompany = useCallback(
    (companyId: number) => {
      setSelectedId(companyId);
      setActiveTab("companies");
      if (isMobile) {
        setMobileDetailOpen(true);
      }
      // Slight delay so company selection propagates
      setTimeout(() => setEngagementDialogOpen(true), 100);
    },
    [isMobile]
  );

  const handleImportCompanies = useCallback(
    (newCompanies: Company[], updatedCompanies: Company[]) => {
      setImportedCompanies((prev) => {
        const all = [...prev];
        const existingById = new Map(all.map((c, idx) => [c.id, idx]));

        // Add/update updated companies
        for (const u of updatedCompanies) {
          const idx = existingById.get(u.id);
          if (idx !== undefined) {
            all[idx] = u;
          } else {
            all.push(u);
          }
        }

        // Add new companies
        for (const n of newCompanies) {
          all.push(n);
        }

        return all;
      });
    },
    [setImportedCompanies]
  );

  // Chat widget handlers
  const chatContext = useMemo<InputContext>(
    () => ({
      tab: activeTab,
      companyId: selectedCompany?.id,
      companyName: selectedCompany?.name,
      companyType: selectedCompany?.type,
    }),
    [activeTab, selectedCompany]
  );

  const handleSendChatMessage = useCallback(
    (content: string) => {
      const category = detectCategory(content);
      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date().toISOString(),
        category,
        context: { ...chatContext },
        resolved: false,
      };

      // Count pending including this new message
      const newPending = getPendingCount(chatMessages) + 1;

      const botMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: generateBotResponse(content, category, chatContext, newPending),
        timestamp: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, userMsg, botMsg]);
    },
    [chatContext, chatMessages, setChatMessages]
  );

  const handleClearChat = useCallback(() => {
    setChatMessages([]);
  }, [setChatMessages]);

  // Pipeline move handler
  const handlePipelineMove = useCallback(
    (companyId: number, newStage: PipelineStage) => {
      setPipelineState((prev) => ({
        ...prev,
        [companyId]: { stage: newStage, movedAt: new Date().toISOString() },
      }));
    },
    [setPipelineState]
  );

  const allNotesExport = useMemo(() => {
    const lines: string[] = ["EventIQ Notes Export", "=".repeat(40), ""];
    companies.forEach((c) => {
      const met = metState[c.id];
      const rating = ratingState[c.id];
      const notes = notesState[c.id];
      const companyEngagements = getCompanyEngagements(engagements, c.id);
      if (met || notes || companyEngagements.length > 0) {
        lines.push(`## ${c.name} (${c.type})`);
        if (met)
          lines.push(
            `Status: Met${rating?.rating ? ` - ${rating.rating.toUpperCase()}` : ""}`
          );
        if (rating?.followUps?.length)
          lines.push(`Follow-up: ${rating.followUps.join(", ")}`);
        if (rating?.careAbout) lines.push(`Care about: ${rating.careAbout}`);
        if (rating?.promised) lines.push(`Promised: ${rating.promised}`);
        if (rating?.personal) lines.push(`Personal: ${rating.personal}`);
        if (notes) lines.push(`Notes: ${notes}`);
        if (companyEngagements.length > 0) {
          lines.push("Engagement Log:");
          companyEngagements.forEach((e) => {
            const date = new Date(e.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const action = e.action.split("_").join(" ");
            const detail = e.notes ? ` — ${e.notes}` : "";
            lines.push(`- ${date}: ${e.channel} / ${action} with ${e.contactName}${detail}`);
          });
        }
        lines.push("");
      }
    });
    if (quickNotes) {
      lines.push("## Quick Notes", quickNotes, "");
    }
    return lines.join("\n");
  }, [metState, ratingState, notesState, quickNotes, engagements]);

  // Keyboard navigation
  const sortedCompanyIds = useMemo(() => {
    return [...companies]
      .sort((a, b) => a.priority - b.priority || a.phase - b.phase)
      .map((c) => c.id);
  }, []);

  useKeyboard({
    onNavigateDown: () => {
      if (activeTab !== "companies") return;
      const currentIdx = selectedId
        ? sortedCompanyIds.indexOf(selectedId)
        : -1;
      const nextIdx = Math.min(currentIdx + 1, sortedCompanyIds.length - 1);
      setSelectedId(sortedCompanyIds[nextIdx]);
    },
    onNavigateUp: () => {
      if (activeTab !== "companies") return;
      const currentIdx = selectedId
        ? sortedCompanyIds.indexOf(selectedId)
        : 0;
      const prevIdx = Math.max(currentIdx - 1, 0);
      setSelectedId(sortedCompanyIds[prevIdx]);
    },
    onSelect: () => {
      if (selectedId && isMobile) setMobileDetailOpen(true);
    },
    onEscape: () => {
      if (mobileDetailOpen) setMobileDetailOpen(false);
      else if (searchOpen) setSearchOpen(false);
      else setSelectedId(null);
    },
    onSearch: () => setSearchOpen(true),
    onToggleMet: () => {
      if (selectedId) handleToggleMet(selectedId);
    },
    onLogEngagement: () => {
      if (selectedId) setEngagementDialogOpen(true);
    },
  });

  // Content rendering based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardTab
            companies={companies}
            metState={metState}
            engagements={engagements}
            ratingState={ratingState}
            streakData={streakData}
            onOpenEngagement={handleOpenEngagementForCompany}
          />
        );
      case "schedule":
        return <ScheduleTab onJumpToCompany={handleJumpToCompany} />;
      case "pitch":
        return <PitchTab />;
      case "checklist":
        return (
          <ChecklistTab
            checkState={checkState}
            onToggleCheck={handleToggleCheck}
            quickNotes={quickNotes}
            onQuickNotesChange={setQuickNotes}
            allNotes={allNotesExport}
          />
        );
      case "pipeline":
        return (
          <PipelineTab
            companies={companies}
            pipelineState={pipelineState}
            ratingState={ratingState}
            engagements={engagements}
            onPipelineMove={handlePipelineMove}
            onOpenCompany={handleSelect}
          />
        );
      default:
        return null;
    }
  };

  const ratingCompany = companies.find((c) => c.id === ratingCompanyId);

  return (
    <SidebarProvider>
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <AppSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenImport={() => setImportDialogOpen(true)}
          metCount={metCount}
          totalCount={companies.length}
          streakData={streakData}
        />
      </div>

      <SidebarInset className="h-screen flex flex-col">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border md:hidden">
          <h1 className="text-sm font-bold">EventIQ</h1>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {metCount}/{companies.length} met
            </span>
            <button
              onClick={() => setSearchOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary/50 text-muted-foreground"
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="7" cy="7" r="5" />
                <path d="m11 11 2 2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === "companies" ? (
            <>
              {/* Desktop: Resizable panels */}
              <div className="hidden md:block h-full">
                <ResizablePanelGroup
                  orientation="horizontal"
                  className="h-full"
                >
                  <ResizablePanel
                    defaultSize={40}
                    minSize={25}
                  >
                    <CompanyList
                      companies={companies}
                      selectedId={selectedId}
                      metState={metState}
                      ratingState={ratingState}
                      engagements={engagements}
                      pipelineState={pipelineState}
                      activeFilter={activeFilter}
                      activeSort={activeSort}
                      activeView={activeView}
                      searchQuery={searchQuery}
                      onSelect={handleSelect}
                      onToggleMet={handleToggleMet}
                      onFilterChange={setActiveFilter}
                      onSortChange={setActiveSort}
                      onViewChange={setActiveView}
                      followUps={followUps}
                      onSnooze={handleSnooze}
                      onCompleteFollowUp={handleCompleteFollowUp}
                      onQuickLog={handleOpenEngagementForCompany}
                    />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={60} minSize={30}>
                    {selectedCompany ? (
                      <CompanyDetail
                        company={selectedCompany}
                        isMet={!!metState[selectedCompany.id]}
                        rating={ratingState[selectedCompany.id] || null}
                        notes={notesState[selectedCompany.id] || ""}
                        engagements={selectedCompanyEngagements}
                        onToggleMet={handleToggleMet}
                        onSaveNotes={handleSaveNotes}
                        onOpenRating={(id) => {
                          setRatingCompanyId(id);
                          setRatingDialogOpen(true);
                        }}
                        onAddEngagement={() => setEngagementDialogOpen(true)}
                        onDeleteEngagement={handleDeleteEngagement}
                        onQuickLog={handleQuickLog}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Select a company to view details
                      </div>
                    )}
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>

              {/* Mobile: Single column */}
              <div className="md:hidden h-full pb-14">
                <CompanyList
                  companies={companies}
                  selectedId={selectedId}
                  metState={metState}
                  ratingState={ratingState}
                  engagements={engagements}
                  pipelineState={pipelineState}
                  activeFilter={activeFilter}
                  activeSort={activeSort}
                  activeView={activeView}
                  searchQuery={searchQuery}
                  onSelect={handleSelect}
                  onToggleMet={handleToggleMet}
                  onFilterChange={setActiveFilter}
                  onSortChange={setActiveSort}
                  onViewChange={setActiveView}
                  followUps={followUps}
                  onSnooze={handleSnooze}
                  onCompleteFollowUp={handleCompleteFollowUp}
                  onQuickLog={handleOpenEngagementForCompany}
                />
              </div>

              {/* Mobile: Detail Sheet */}
              <Sheet
                open={mobileDetailOpen}
                onOpenChange={setMobileDetailOpen}
              >
                <SheetContent side="bottom" className="h-[85vh] p-0">
                  <SheetTitle className="sr-only">Company Detail</SheetTitle>
                  <SheetDescription className="sr-only">
                    View detailed company information, contacts, and engagement tools.
                  </SheetDescription>
                  {selectedCompany && (
                    <CompanyDetail
                      company={selectedCompany}
                      isMet={!!metState[selectedCompany.id]}
                      rating={ratingState[selectedCompany.id] || null}
                      notes={notesState[selectedCompany.id] || ""}
                      engagements={selectedCompanyEngagements}
                      onToggleMet={handleToggleMet}
                      onSaveNotes={handleSaveNotes}
                      onClose={() => setMobileDetailOpen(false)}
                      onOpenRating={(id) => {
                        setRatingCompanyId(id);
                        setRatingDialogOpen(true);
                      }}
                      onAddEngagement={() => setEngagementDialogOpen(true)}
                      onDeleteEngagement={handleDeleteEngagement}
                      onQuickLog={handleQuickLog}
                    />
                  )}
                </SheetContent>
              </Sheet>
            </>
          ) : (
            /* Non-company tabs */
            <div className="h-full pb-14 md:pb-0 overflow-auto">{renderContent()}</div>
          )}
        </div>

        {/* Mobile bottom nav */}
        <MobileNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          metCount={metCount}
          totalCount={companies.length}
          streakCount={streakData.currentStreak}
        />
      </SidebarInset>

      {/* Global overlays */}
      <SearchCommand
        companies={companies}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={handleSelect}
      />

      <RatingDialog
        open={ratingDialogOpen}
        companyName={ratingCompany?.name || ""}
        onClose={() => {
          setRatingDialogOpen(false);
          setRatingCompanyId(null);
        }}
        onSave={handleSaveRating}
      />

      {selectedCompany && (
        <EngagementLog
          open={engagementDialogOpen}
          company={selectedCompany}
          onClose={() => setEngagementDialogOpen(false)}
          onSave={handleAddEngagement}
        />
      )}

      <ImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        companies={companies}
        onImport={handleImportCompanies}
      />

      {/* Chat widget — floating input capture */}
      <ChatFab
        pendingCount={getPendingCount(chatMessages)}
        onClick={() => setChatOpen(true)}
      />
      <ChatWidget
        open={chatOpen}
        onOpenChange={setChatOpen}
        messages={chatMessages}
        onSendMessage={handleSendChatMessage}
        onClearMessages={handleClearChat}
        currentContext={chatContext}
      />
    </SidebarProvider>
  );
}
