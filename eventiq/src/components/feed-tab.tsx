"use client";

import { useMemo, useState } from "react";
import { Company } from "@/lib/types";
import {
  buildFeedItems,
  getHotSignals,
  getFundingActivity,
  getProductLaunches,
  getMarketStats,
  getIndustryThemes,
  FeedItem,
  SignalType,
  SIGNAL_TYPE_CONFIG,
} from "@/lib/feed-helpers";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FeedTabProps {
  companies: Company[];
  onSelectCompany: (id: number) => void;
}

type FeedSection = "all" | "hot" | "funding" | "products" | "themes";

const TYPE_COLORS: Record<string, string> = {
  SQO: "bg-[var(--sqo)]/15 text-[var(--sqo)]",
  Client: "bg-[var(--client)]/15 text-[var(--client)]",
  ICP: "bg-[var(--icp)]/15 text-[var(--icp)]",
  TAM: "bg-muted/50 text-muted-foreground",
};

function SignalIcon({ type }: { type: SignalType }) {
  const config = SIGNAL_TYPE_CONFIG[type];
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${config.color} bg-current/10`}>
      {config.icon}
    </span>
  );
}

function FeedCard({ item, onSelect }: { item: FeedItem; onSelect: (id: number) => void }) {
  const config = SIGNAL_TYPE_CONFIG[item.signalType];

  return (
    <button
      onClick={() => onSelect(item.companyId)}
      className="w-full text-left p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all group"
    >
      <div className="flex items-start gap-2.5">
        <SignalIcon type={item.signalType} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {item.companyName}
            </span>
            <Badge variant="outline" className={`text-[9px] px-1 py-0 h-3.5 ${TYPE_COLORS[item.companyType] || ""}`}>
              {item.companyType}
            </Badge>
            {item.heat === "hot" && (
              <span className="text-[9px] text-[var(--sqo)] font-semibold">HOT</span>
            )}
          </div>
          <p className="text-[11px] text-foreground/90 leading-snug mb-1">{item.headline}</p>
          {item.description && (
            <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[9px] font-medium ${config.color}`}>{config.label}</span>
            {item.source && (
              <span className="text-[9px] text-muted-foreground/60">{item.source}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function StatCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="flex-1 min-w-[140px] p-3 rounded-lg border border-border/50 bg-card/30">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {subtext && <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>}
    </div>
  );
}

function ThemeCard({ title, description, companies, hvAngle, onSelectCompany, allCompanies }: {
  title: string;
  description: string;
  companies: string[];
  hvAngle: string;
  onSelectCompany: (id: number) => void;
  allCompanies: Company[];
}) {
  return (
    <div className="p-3 rounded-lg border border-border/50 bg-card/30">
      <h4 className="text-xs font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-[10px] text-muted-foreground leading-snug mb-2">{description}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {companies.map((name) => {
          const match = allCompanies.find((c) => c.name.toLowerCase().includes(name.toLowerCase()));
          return (
            <button
              key={name}
              onClick={() => match && onSelectCompany(match.id)}
              className={`text-[9px] px-1.5 py-0.5 rounded ${match ? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer" : "bg-muted/30 text-muted-foreground cursor-default"} transition-colors`}
            >
              {name}
            </button>
          );
        })}
      </div>
      <div className="flex items-start gap-1.5 p-2 rounded bg-primary/5 border border-primary/10">
        <span className="text-[10px] font-medium text-primary shrink-0">HV Angle:</span>
        <span className="text-[10px] text-foreground/80 leading-snug">{hvAngle}</span>
      </div>
    </div>
  );
}

export function FeedTab({ companies, onSelectCompany }: FeedTabProps) {
  const [activeSection, setActiveSection] = useState<FeedSection>("all");
  const [signalFilter, setSignalFilter] = useState<SignalType | "all">("all");

  const allItems = useMemo(() => buildFeedItems(companies), [companies]);
  const hotSignals = useMemo(() => getHotSignals(allItems), [allItems]);
  const fundingActivity = useMemo(() => getFundingActivity(allItems), [allItems]);
  const productLaunches = useMemo(() => getProductLaunches(allItems), [allItems]);
  const marketStats = useMemo(() => getMarketStats(companies), [companies]);
  const themes = useMemo(() => getIndustryThemes(), []);

  const filteredItems = useMemo(() => {
    let items = allItems;
    if (signalFilter !== "all") {
      items = items.filter((i) => i.signalType === signalFilter);
    }
    return items.slice(0, 50);
  }, [allItems, signalFilter]);

  // Signal type counts for filter pills
  const signalCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allItems.length };
    for (const item of allItems) {
      counts[item.signalType] = (counts[item.signalType] || 0) + 1;
    }
    return counts;
  }, [allItems]);

  const sections: { id: FeedSection; label: string }[] = [
    { id: "all", label: "All Intel" },
    { id: "hot", label: `Hot Signals (${hotSignals.length})` },
    { id: "funding", label: "Funding" },
    { id: "products", label: "Products" },
    { id: "themes", label: "Themes" },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-base font-bold text-foreground">Market Intelligence Feed</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            MCA/Alternative lending market signals across {companies.length} companies
          </p>
        </div>

        {/* Market Stats */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {marketStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`shrink-0 text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                activeSection === s.id
                  ? "bg-primary/20 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Hot Signals Section */}
        {activeSection === "hot" && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span className="text-[var(--sqo)]">&#x25CF;</span> Hottest Signals for BDR/AE Team
            </h3>
            {hotSignals.map((item) => (
              <FeedCard key={item.id} item={item} onSelect={onSelectCompany} />
            ))}
            {hotSignals.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">No hot signals detected</p>
            )}
          </div>
        )}

        {/* Funding Section */}
        {activeSection === "funding" && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span className="text-green-400">$</span> Funding & Capital Activity
            </h3>
            {fundingActivity.map((item) => (
              <FeedCard key={item.id} item={item} onSelect={onSelectCompany} />
            ))}
            {fundingActivity.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">No funding activity detected</p>
            )}
          </div>
        )}

        {/* Products Section */}
        {activeSection === "products" && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span className="text-blue-400">&#x25CF;</span> Product Launches & Partnerships
            </h3>
            {productLaunches.map((item) => (
              <FeedCard key={item.id} item={item} onSelect={onSelectCompany} />
            ))}
            {productLaunches.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">No product launches detected</p>
            )}
          </div>
        )}

        {/* Themes Section */}
        {activeSection === "themes" && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-foreground">Industry Themes & HyperVerge Positioning</h3>
            {themes.map((theme) => (
              <ThemeCard
                key={theme.title}
                {...theme}
                onSelectCompany={onSelectCompany}
                allCompanies={companies}
              />
            ))}
          </div>
        )}

        {/* All Intel Section */}
        {activeSection === "all" && (
          <div className="space-y-2">
            {/* Signal type filter pills */}
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setSignalFilter("all")}
                className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                  signalFilter === "all" ? "bg-foreground/10 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({signalCounts.all || 0})
              </button>
              {(Object.keys(SIGNAL_TYPE_CONFIG) as SignalType[]).map((type) => {
                const config = SIGNAL_TYPE_CONFIG[type];
                const count = signalCounts[type] || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={type}
                    onClick={() => setSignalFilter(type)}
                    className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                      signalFilter === type ? `${config.color} font-medium bg-current/10` : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {config.label} ({count})
                  </button>
                );
              })}
            </div>

            {filteredItems.map((item) => (
              <FeedCard key={item.id} item={item} onSelect={onSelectCompany} />
            ))}
            {filteredItems.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">No intel items match your filter</p>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
