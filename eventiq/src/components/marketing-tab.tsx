"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ContentCalendar } from "@/components/marketing/content-calendar";
import { LinkedInStrategy } from "@/components/marketing/linkedin-strategy";
import { CampaignTracker } from "@/components/marketing/campaign-tracker";
import { Megaphone, Calendar, Linkedin, BarChart3 } from "lucide-react";

type MarketingSection = "calendar" | "linkedin" | "campaigns";

export function MarketingTab() {
  const [activeSection, setActiveSection] = useState<MarketingSection>("calendar");

  const sections: { id: MarketingSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "calendar", label: "Content Calendar", icon: Calendar },
    { id: "linkedin", label: "LinkedIn Strategy", icon: Linkedin },
    { id: "campaigns", label: "Campaigns", icon: BarChart3 },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-brand" />
              <h2 className="text-lg font-bold">Marketing</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Content strategy, LinkedIn playbook, and campaign tracking
            </p>
          </div>

          {/* Section tabs */}
          <div className="flex gap-2">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <Badge
                  key={sec.id}
                  variant={isActive ? "default" : "outline"}
                  className={`cursor-pointer text-xs px-3 py-1 ${
                    isActive
                      ? "bg-brand/20 text-brand border-brand/30 hover:bg-brand/30"
                      : "text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                  onClick={() => setActiveSection(sec.id)}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {sec.label}
                </Badge>
              );
            })}
          </div>

          <Separator />

          {/* Content */}
          {activeSection === "calendar" && <ContentCalendar />}
          {activeSection === "linkedin" && <LinkedInStrategy />}
          {activeSection === "campaigns" && <CampaignTracker />}
        </div>
      </ScrollArea>
    </div>
  );
}
