"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import {
  Company,
  CompanyCategory,
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
import { FollowUpData, SentimentData } from "@/components/engagement-log";
import { SequenceProgress } from "@/lib/sequence-helpers";
import { Skeleton } from "@/components/ui/skeleton";
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
  InputCategory,
  InputContext,
  detectCategory,
  generateBotResponse,
  generateId,
  getPendingCount,
} from "@/lib/chat-helpers";
import { SheetsSettings } from "@/components/sheets-settings";
import { syncToSheets } from "@/lib/sheets-sync";
import { MobileNav } from "@/components/mobile-nav";
import { ResourcesTab } from "@/components/resources-tab";
import { MarketingIdeasTab } from "@/components/marketing-ideas-tab";
import { ScheduleTab } from "@/components/schedule-tab";
import { TaskQueueTab } from "@/components/task-queue-tab";
import { TaskQueueState, DEFAULT_TASK_QUEUE_STATE } from "@/lib/task-queue-helpers";
import { DashboardTab } from "@/components/dashboard-tab";
import { PipelineTab } from "@/components/pipeline-tab";
import { FeedTab } from "@/components/feed-tab";
import { MarketMapTab } from "@/components/market-map-tab";
import { useSyncedStorage } from "@/hooks/use-synced-storage";
import { useDeveloperMode } from "@/hooks/use-developer-mode";
import { useKeyboard } from "@/hooks/use-keyboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

export default function Home() {
  const isMobile = useIsMobile();
  const { devMode, toggleDevMode } = useDeveloperMode();

  // Companies loaded from API
  const [apiCompanies, setApiCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  const fetchCompanies = useCallback(() => {
    setCompaniesLoading(true);
    setCompaniesError(null);
    fetch("/api/companies")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setApiCompanies(data);
        } else if (data?.error) {
          setCompaniesError(data.error);
        }
      })
      .catch((err) => {
        console.warn("[EventIQ] Failed to fetch companies from API:", err);
        setCompaniesError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setCompaniesLoading(false));
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // State
  const [activeTab, setActiveTab] = useState<TabType>("companies");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeSort, setActiveSort] = useState<SortType>("priority");
  const [activeView, setActiveView] = useState<ViewType>("cards");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<CompanyCategory | null>(null);
  const [activeHubSpotStageFilter, setActiveHubSpotStageFilter] = useState<string | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingCompanyId, setRatingCompanyId] = useState<number | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Persistent state
  const [metState, setMetState] = useSyncedStorage<Record<string, boolean>>(
    "eventiq_met",
    {}
  );
  const [ratingState, setRatingState] = useSyncedStorage<
    Record<string, RatingData>
  >("eventiq_ratings", {});
  const [notesState, setNotesState] = useSyncedStorage<Record<string, string>>(
    "eventiq_notes",
    {}
  );
  const [engagements, setEngagements] = useSyncedStorage<EngagementEntry[]>(
    "eventiq_engagements",
    []
  );
  const [engagementDialogOpen, setEngagementDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Chat widget state
  const [chatMessages, setChatMessages] = useSyncedStorage<ChatMessage[]>(
    "eventiq_user_inputs",
    []
  );

  // Pipeline state
  const [pipelineState, setPipelineState] = useSyncedStorage<Record<string, PipelineRecord>>(
    "eventiq_pipeline",
    {}
  );

  // Follow-up reminders state
  const [followUps, setFollowUps] = useSyncedStorage<FollowUpReminder[]>(
    "eventiq_follow_ups",
    []
  );

  // Sequence progress state
  const [sequences, setSequences] = useSyncedStorage<Record<number, SequenceProgress>>(
    "eventiq_sequences",
    {}
  );

  // Custom tags per company
  const [tagsState, setTagsState] = useSyncedStorage<Record<number, string[]>>(
    "eventiq_tags",
    {}
  );

  // Task queue state (daily task management)
  const [taskQueueState, setTaskQueueState] = useSyncedStorage<TaskQueueState>(
    "eventiq_task_queue",
    DEFAULT_TASK_QUEUE_STATE
  );

  // Imported companies from localStorage (merged at runtime with build-time data)
  const [importedCompanies, setImportedCompanies] = useSyncedStorage<Company[]>(
    "eventiq_imported_companies",
    []
  );

  // Merge API + imported companies (imported updates override API fields)
  const companies = useMemo(() => {
    if (importedCompanies.length === 0) return apiCompanies;

    const merged = [...apiCompanies];
    const existingById = new Map(merged.map((c, idx) => [c.id, idx]));

    for (const imp of importedCompanies) {
      const existingIdx = existingById.get(imp.id);
      if (existingIdx !== undefined) {
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
  }, [importedCompanies, apiCompanies]);

  // Select first company once data loads
  useEffect(() => {
    if (companies.length > 0 && selectedId === null) {
      setSelectedId(companies[0].id);
    }
  }, [companies, selectedId]);

  // Compute streak data from engagements
  const streakData = useMemo<StreakData>(() => computeStreak(engagements), [engagements]);

  // Auto-infer pipeline stages on first load (only if pipeline state is empty and companies loaded)
  useEffect(() => {
    if (Object.keys(pipelineState).length > 0 || companies.length === 0) return;
    const inferred: Record<string, PipelineRecord> = {};
    for (const c of companies) {
      inferred[c.id] = {
        stage: inferStage(c, metState, ratingState, engagements),
        movedAt: new Date().toISOString(),
      };
    }
    setPipelineState(inferred);
  }, [companies.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
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
      const companyName = companies.find((c) => c.id === id)?.name || '';
      syncToSheets('met', { companyId: id, companyName, met: !wasMet });
    },
    [metState, setMetState, companies]
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

  // Tag handlers
  const handleAddTag = useCallback(
    (companyId: number, tag: string) => {
      setTagsState((prev) => {
        const existing = prev[companyId] || [];
        if (existing.includes(tag)) return prev;
        return { ...prev, [companyId]: [...existing, tag] };
      });
    },
    [setTagsState]
  );

  const handleRemoveTag = useCallback(
    (companyId: number, tag: string) => {
      setTagsState((prev) => {
        const existing = prev[companyId] || [];
        return { ...prev, [companyId]: existing.filter((t) => t !== tag) };
      });
    },
    [setTagsState]
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
    (entry: EngagementEntry, followUp?: FollowUpData, sentimentData?: SentimentData) => {
      const prevTotal = engagements.length;
      const prevStreak = streakData.currentStreak;

      setEngagements((prev) => [...prev, entry]);

      const companyName = companies.find((c) => c.id === entry.companyId)?.name || '';
      syncToSheets('engagement', {
        companyId: entry.companyId,
        companyName,
        contactName: entry.contactName,
        channel: entry.channel,
        action: entry.action,
        notes: entry.notes,
        source: entry.source,
      });

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

      if (sentimentData) {
        const currentRecord = pipelineState[entry.companyId];
        const currentStage = currentRecord?.stage || 'researched';
        const stageOrder = ['researched', 'contacted', 'engaged', 'demo', 'proposal', 'won', 'lost'];
        const currentIdx = stageOrder.indexOf(currentStage);
        const newIdx = stageOrder.indexOf(sentimentData.pipelineStage);
        if (newIdx > currentIdx) {
          setPipelineState((prev) => ({
            ...prev,
            [entry.companyId]: {
              stage: sentimentData.pipelineStage as PipelineStage,
              movedAt: new Date().toISOString(),
              dealValue: currentRecord?.dealValue,
              closeDate: currentRecord?.closeDate,
            },
          }));
        }
      }

      const newTotal = prevTotal + 1;
      const milestone = checkMilestone(prevTotal, newTotal);
      if (milestone) {
        toast.success(`${milestone.emoji} ${milestone.label}`, { duration: 4000 });
      }

      setTimeout(() => {
        const newStreak = computeStreak([...engagements, entry]);
        const streakMilestone = checkStreakMilestone(prevStreak, newStreak.currentStreak);
        if (streakMilestone) {
          toast.success(`${streakMilestone.emoji} ${streakMilestone.label}`, { duration: 4000 });
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

  const handleSequenceStep = useCallback(
    (companyId: number, stepId: string, channel: EngagementChannel, action: string) => {
      setSequences((prev) => {
        const existing = prev[companyId];
        const completedSteps = existing?.completedSteps || [];
        if (completedSteps.includes(stepId)) return prev;
        return {
          ...prev,
          [companyId]: {
            companyId,
            sequenceType: existing?.sequenceType || 'cold',
            startedAt: existing?.startedAt || new Date().toISOString(),
            completedSteps: [...completedSteps, stepId],
          },
        };
      });

      const company = companies.find((c) => c.id === companyId);
      const contactName = company?.leaders?.[0]?.n || company?.contacts?.[0]?.n || 'Unknown';
      const entry: EngagementEntry = {
        id: crypto.randomUUID(),
        companyId,
        contactName,
        channel,
        action,
        timestamp: new Date().toISOString(),
        notes: `Sequence step: ${stepId}`,
        source: 'manual',
      };
      handleAddEngagement(entry);
      syncToSheets('sequence', {
        companyId,
        companyName: company?.name || '',
        sequenceType: sequences[companyId]?.sequenceType || 'cold',
        stepId,
        channel,
        action,
      });
      toast.success("Step completed + engagement logged");
    },
    [setSequences, companies, handleAddEngagement]
  );

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

  const handleOpenEngagementForCompany = useCallback(
    (companyId: number) => {
      setSelectedId(companyId);
      setActiveTab("companies");
      if (isMobile) {
        setMobileDetailOpen(true);
      }
      setTimeout(() => setEngagementDialogOpen(true), 100);
    },
    [isMobile]
  );

  const handleImportCompanies = useCallback(
    (newCompanies: Company[], updatedCompanies: Company[]) => {
      setImportedCompanies((prev) => {
        const all = [...prev];
        const existingById = new Map(all.map((c, idx) => [c.id, idx]));

        for (const u of updatedCompanies) {
          const idx = existingById.get(u.id);
          if (idx !== undefined) {
            all[idx] = u;
          } else {
            all.push(u);
          }
        }

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

  // Fire-and-forget: persist every sidebar input to Supabase feedback table
  const persistInputToSupabase = useCallback(
    (content: string, category: InputCategory, ctx: InputContext) => {
      const TAB_SECTION: Record<string, string> = {
        companies: "Companies List",
        dashboard: "Dashboard",
        pipeline: "Pipeline",
        schedule: "Schedule",
        resources: "Resources",
        marketing: "Marketing Ideas",
        feed: "Feed",
        map: "Market Map",
        dinner: "Dinner",
      };
      const feedbackType = category === "bug" ? "bug" : "suggestion";
      const section = TAB_SECTION[ctx.tab] || "General / Other";

      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          feedbackType,
          notes: content,
          page: typeof window !== "undefined" ? window.location.pathname : "",
          companyName: ctx.companyName || "",
        }),
      }).catch(() => {
        // Non-blocking — silently ignore network errors
      });
    },
    []
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

      const newPending = getPendingCount(chatMessages) + 1;

      const botMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: generateBotResponse(content, category, chatContext, newPending),
        timestamp: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, userMsg, botMsg]);

      // Persist to Supabase (non-blocking)
      persistInputToSupabase(content, category, chatContext);
    },
    [chatContext, chatMessages, setChatMessages, persistInputToSupabase]
  );

  const handleClearChat = useCallback(() => {
    setChatMessages([]);
  }, [setChatMessages]);

  const handlePipelineMove = useCallback(
    (companyId: number, newStage: PipelineStage) => {
      const oldStage = pipelineState[companyId]?.stage || 'researched';
      const existing = pipelineState[companyId];
      setPipelineState((prev) => ({
        ...prev,
        [companyId]: {
          stage: newStage,
          movedAt: new Date().toISOString(),
          dealValue: existing?.dealValue,
          closeDate: existing?.closeDate,
        },
      }));
      const companyName = companies.find((c) => c.id === companyId)?.name || '';
      syncToSheets('pipeline', { companyId, companyName, oldStage, newStage });
    },
    [setPipelineState, pipelineState, companies]
  );

  const handleUpdateDeal = useCallback(
    (companyId: number, dealValue: number | undefined, closeDate: string | undefined) => {
      setPipelineState((prev) => {
        const existing = prev[companyId] || { stage: 'researched' as PipelineStage, movedAt: new Date().toISOString() };
        return {
          ...prev,
          [companyId]: {
            ...existing,
            dealValue,
            closeDate,
          },
        };
      });
    },
    [setPipelineState]
  );

  // Keyboard navigation
  const sortedCompanyIds = useMemo(() => {
    return [...companies]
      .sort((a, b) => a.priority - b.priority || a.phase - b.phase)
      .map((c) => c.id);
  }, [companies]);

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
            pipelineState={pipelineState}
            onOpenEngagement={handleOpenEngagementForCompany}
          />
        );
      case "schedule":
        return (
          <TaskQueueTab
            companies={companies}
            engagements={engagements}
            pipelineState={pipelineState}
            metState={metState}
            followUps={followUps}
            sequences={sequences}
            queueState={taskQueueState}
            onUpdateQueueState={setTaskQueueState}
            onOpenCompany={handleSelect}
            onCompleteFollowUp={handleCompleteFollowUp}
            onSequenceStep={handleSequenceStep}
            onOpenEngagement={handleOpenEngagementForCompany}
          />
        );
      case "dinner":
        return <ScheduleTab onJumpToCompany={handleJumpToCompany} />;
      case "resources":
        return <ResourcesTab />;
      case "marketing":
        return <MarketingIdeasTab companies={companies} />;
      case "pipeline":
        return (
          <PipelineTab
            companies={companies}
            pipelineState={pipelineState}
            ratingState={ratingState}
            engagements={engagements}
            onPipelineMove={handlePipelineMove}
            onOpenCompany={handleSelect}
            onUpdateDeal={handleUpdateDeal}
          />
        );
      case "feed":
        return (
          <FeedTab
            companies={companies}
            onSelectCompany={handleSelect}
          />
        );
      case "map":
        return (
          <MarketMapTab
            companies={companies}
            onSelectCompany={handleSelect}
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
          onOpenSettings={() => setSettingsOpen(true)}
          metCount={metCount}
          totalCount={companies.length}
          streakData={streakData}
          devMode={devMode}
          onToggleDevMode={toggleDevMode}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </div>

      <SidebarInset className="h-screen flex flex-col">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border md:hidden">
          <h1 className="text-sm font-bold">EventIQ</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {metCount}/{companies.length} met
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="h-8 w-8 rounded-lg bg-secondary/50 text-muted-foreground"
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {companiesError && (
          <div className="mx-4 mt-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center justify-between gap-3">
            <p className="text-xs text-destructive">
              Failed to load companies: {companiesError}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchCompanies}
              className="shrink-0 text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {companiesLoading ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-8 w-24" />
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "companies" ? (
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
                      onSelect={handleSelect}
                      onToggleMet={handleToggleMet}
                      onFilterChange={setActiveFilter}
                      onSortChange={setActiveSort}
                      onViewChange={setActiveView}
                      followUps={followUps}
                      onSnooze={handleSnooze}
                      onCompleteFollowUp={handleCompleteFollowUp}
                      onQuickLog={handleOpenEngagementForCompany}
                      tagsState={tagsState}
                      activeTagFilter={activeTagFilter}
                      onTagFilterChange={setActiveTagFilter}
                      activeCategoryFilter={activeCategoryFilter}
                      onCategoryFilterChange={setActiveCategoryFilter}
                      activeHubSpotStageFilter={activeHubSpotStageFilter}
                      onHubSpotStageFilterChange={setActiveHubSpotStageFilter}
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
                        pipelineState={pipelineState}
                        sequenceProgress={sequences[selectedCompany.id]}
                        tags={tagsState[selectedCompany.id] || []}
                        onToggleMet={handleToggleMet}
                        onSaveNotes={handleSaveNotes}
                        onOpenRating={(id) => {
                          setRatingCompanyId(id);
                          setRatingDialogOpen(true);
                        }}
                        onAddEngagement={() => setEngagementDialogOpen(true)}
                        onDeleteEngagement={handleDeleteEngagement}
                        onQuickLog={handleQuickLog}
                        onSequenceStep={handleSequenceStep}
                        onAddTag={handleAddTag}
                        onRemoveTag={handleRemoveTag}
                        onPipelineStageChange={handlePipelineMove}
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
                  onSelect={handleSelect}
                  onToggleMet={handleToggleMet}
                  onFilterChange={setActiveFilter}
                  onSortChange={setActiveSort}
                  onViewChange={setActiveView}
                  followUps={followUps}
                  onSnooze={handleSnooze}
                  onCompleteFollowUp={handleCompleteFollowUp}
                  onQuickLog={handleOpenEngagementForCompany}
                  tagsState={tagsState}
                  activeTagFilter={activeTagFilter}
                  onTagFilterChange={setActiveTagFilter}
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
                      pipelineState={pipelineState}
                      sequenceProgress={sequences[selectedCompany.id]}
                      tags={tagsState[selectedCompany.id] || []}
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
                      onSequenceStep={handleSequenceStep}
                      onAddTag={handleAddTag}
                      onRemoveTag={handleRemoveTag}
                      onPipelineStageChange={handlePipelineMove}
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

      {/* Chat widget — dev mode only */}
      {devMode && (
        <>
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
        </>
      )}

      {/* Sheets sync settings */}
      <SheetsSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </SidebarProvider>
  );
}
