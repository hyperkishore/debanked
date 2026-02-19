"use client";

import { CompanyType } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ScheduleTabProps {
  onJumpToCompany: (name: string) => void;
}

interface ProgramSpeaker {
  name: string;
  company: string;
  type?: CompanyType;
}

interface ProgramSession {
  tag: "keynote" | "panel" | "demo";
  title: string;
  speakers: ProgramSpeaker[];
}

interface PhaseItem {
  company: string;
  contact: string;
  type?: CompanyType;
}

interface Phase {
  id: number;
  time: string;
  title: string;
  desc: string;
  items: PhaseItem[];
}

const programSessions: ProgramSession[] = [
  {
    tag: "keynote",
    title: "Guest Speakers",
    speakers: [
      { name: "Robby Birnbaum", company: "Greenspoon Marder PA" },
      { name: "Cheryl Tibbs", company: "Commercial Capital Connect" },
    ],
  },
  {
    tag: "panel",
    title: "Funder & Broker Panel",
    speakers: [
      { name: "Louis Calderone", company: "Vox Funding", type: "ICP" },
      { name: "Daniel Dames", company: "Bitty", type: "SQO" },
      { name: "Seth Denison", company: "Optimum Bank" },
      { name: "Frankie DiAntonio", company: "Lexington Capital Holdings" },
      { name: "Steven Edisis", company: "Dynamic Capital" },
      { name: "Efraim Kandinov", company: "Fundfi", type: "Client" },
      { name: "Arieh Kaplan", company: "Barclays Advance" },
      { name: "Jim Noel", company: "BriteCap Financial", type: "SQO" },
      { name: "Vinnie Rodriguez", company: "Tip Top Capital" },
      { name: "Alex Shvarts", company: "FundKite", type: "Client" },
    ],
  },
  {
    tag: "demo",
    title: "Show Floor Tech Demos",
    speakers: [
      { name: "Motti Dahan", company: "Smart MCA" },
      { name: "Matt Donofrio", company: "Figure" },
      { name: "Garrett Kuhlman", company: "OnyxIQ" },
      { name: "Dennis Mikhailov", company: "Cloudsquare" },
      { name: "David Snitkof", company: "Ocrolus" },
    ],
  },
];

const phases: Phase[] = [
  {
    id: 1,
    time: "11:00 AM – 1:00 PM",
    title: "High-Value Booth Visits",
    desc: "SQOs, Clients & Funder Panel speakers with booths",
    items: [
      { company: "Bitty", contact: "Craig Hecker (CEO) & Daniel Dames", type: "SQO" },
      { company: "Fundfi", contact: "Brian Kandinov & Natasha Dillon", type: "Client" },
      { company: "FundKite", contact: "Alex Shvarts, CEO", type: "Client" },
      { company: "BriteCap Financial", contact: "Henderson (CEO), Lafferty (CCO), Noel", type: "SQO" },
      { company: "Vox Funding", contact: "Louis Calderone, CEO", type: "ICP" },
      { company: "PIRS Capital", contact: "Andrew Mallinger (COO) & team", type: "SQO" },
    ],
  },
  {
    id: 2,
    time: "1:00 PM – 2:30 PM",
    title: "Named-Contact Booth Visits",
    desc: "Hit booths with known decision-makers",
    items: [
      { company: "CAN Capital", contact: "Mark Cisco & Chris Holland", type: "ICP" },
      { company: "Dexly Finance", contact: "Burkay Kaplan, CEO", type: "ICP" },
      { company: "Aspire Funding", contact: "Daniel Lenefsky, CEO", type: "ICP" },
      { company: "Simply Funding", contact: "Jacob Kleinberger, Head Ops", type: "ICP" },
      { company: "MonetaFi", contact: "Steve Kahmi, Exec Dir", type: "ICP" },
      { company: "Elevate Funding", contact: "Heather Francis (CEO) & Ken Peng", type: "ICP" },
    ],
  },
  {
    id: 3,
    time: "2:30 PM – 3:30 PM",
    title: "Additional Booth Sweep",
    desc: "Named contacts + walk-in intros at remaining booths",
    items: [
      { company: "idea Financial", contact: "Justin Leto (CEO), Chris Ryan", type: "ICP" },
      { company: "Gulf Coast Business Credit", contact: "Hladky (CEO), Wrba (VP BD)", type: "ICP" },
      { company: "Spartan Capital", contact: "Frank Ebanks (CEO), Connor Leppzer (UW)", type: "ICP" },
      { company: "The LCF Group / Reliant Funding", contact: "Andy Parker (CEO), Kerri Brancato (VP UW)", type: "ICP" },
      { company: "World Business Lenders", contact: "Doug Naidus (CEO), Reilly (SVP Ops)", type: "ICP" },
      { company: "Reliance Financial", contact: "Aryeh Miller, CEO", type: "ICP" },
      { company: "Credibly", contact: "Ryan Rosett & Edan King (Co-CEOs)", type: "ICP" },
    ],
  },
  {
    id: 4,
    time: "3:30 PM – 4:30 PM",
    title: "Hunt Attendees",
    desc: "No booths — find them on the floor",
    items: [
      { company: "Wing Lake Capital Partners", contact: "Shaya Baum (CEO), Eli Golshteyn (UW Dir)", type: "SQO" },
      { company: "Rapid Finance", contact: "Will Tumulty (CEO), Cerminaro (CRO)", type: "ICP" },
      { company: "Forward Financing", contact: "Mullins (CEO), Capadanno, Akhigbe", type: "ICP" },
      { company: "Likety", contact: "Nima Shamsili, CEO", type: "ICP" },
      { company: "United Capital Source", contact: "Jared Weitz, CEO", type: "ICP" },
      { company: "Big Think Capital", contact: "Tom Forsberg, CRO", type: "ICP" },
    ],
  },
  {
    id: 5,
    time: "4:30 PM – 5:00 PM",
    title: "Dinner Roundtable Prep",
    desc: "Prepare for evening networking",
    items: [
      { company: "Velocity Capital Group", contact: "Jay Avigdor, CEO", type: "ICP" },
    ],
  },
];

const tagStyles = {
  keynote: "bg-primary/20 text-primary",
  panel: "bg-[var(--client)]/20 text-[var(--client)]",
  demo: "bg-[var(--icp)]/20 text-[var(--icp)]",
} as const;

const dotStyles: Record<string, string> = {
  SQO: "bg-[var(--sqo)]",
  Client: "bg-[var(--client)]",
  ICP: "bg-[var(--icp)]",
  TAM: "bg-[var(--tam)]",
};

export function ScheduleTab({ onJumpToCompany }: ScheduleTabProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Official Event Program */}
        <div>
          <h2 className="text-sm font-bold mb-1">Official Event Program</h2>
          <p className="text-xs text-muted-foreground mb-3">deBanked CONNECT panels & demos — speakers you should catch</p>

          <div className="space-y-3">
            {programSessions.map((session, i) => (
              <Card key={i} className="gap-0 py-0 shadow-none overflow-hidden">
                <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
                  <Badge className={cn("text-xs px-1.5 py-0 h-4", tagStyles[session.tag])}>
                    {session.tag.toUpperCase()}
                  </Badge>
                  <span className="text-sm font-medium">{session.title}</span>
                </div>
                <div className="divide-y divide-border/30">
                  {session.speakers.map((speaker, j) => (
                    <Button
                      key={j}
                      variant="ghost"
                      size="sm"
                      className="w-full flex items-center justify-between px-3 py-2 h-auto rounded-none hover:bg-secondary/30 text-left"
                      onClick={() => onJumpToCompany(speaker.company)}
                    >
                      <div>
                        <span className="text-sm font-medium">{speaker.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{speaker.company}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {speaker.type && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs px-1 py-0 h-3.5",
                              speaker.type === "SQO" && "text-[var(--sqo)] border-[var(--sqo)]/30",
                              speaker.type === "Client" && "text-[var(--client)] border-[var(--client)]/30",
                              speaker.type === "ICP" && "text-[var(--icp)] border-[var(--icp)]/30"
                            )}
                          >
                            {speaker.type}
                          </Badge>
                        )}
                        <span className="text-muted-foreground text-xs">›</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Booth Visit Plan */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Booth Visit Plan</h3>

          <div className="space-y-4">
            {phases.map((phase) => (
              <Card key={phase.id} className="p-3 gap-0 py-0 shadow-none">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-primary/80 font-medium">{phase.time}</span>
                </div>
                <h4 className="text-sm font-semibold mb-0.5">{phase.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">{phase.desc}</p>
                <div className="space-y-1">
                  {phase.items.map((item, j) => (
                    <Button
                      key={j}
                      variant="ghost"
                      size="sm"
                      className="w-full flex items-center gap-2 py-1.5 px-2 h-auto rounded-md hover:bg-secondary/30 text-left justify-start"
                      onClick={() => onJumpToCompany(item.company)}
                    >
                      <span className={cn("w-2 h-2 rounded-full shrink-0", item.type ? dotStyles[item.type] : "bg-muted-foreground")} />
                      <span className="text-sm font-medium min-w-0 truncate">{item.company}</span>
                      <span className="text-xs text-muted-foreground truncate ml-auto">{item.contact}</span>
                    </Button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
