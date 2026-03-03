"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Linkedin, Target, Users, MessageSquare } from "lucide-react";

interface TargetSegment {
  persona: string;
  titles: string[];
  count: number;
  priority: string;
}

interface PostTemplate {
  category: string;
  description: string;
  frequency: string;
  example: string;
}

const TARGET_SEGMENTS: TargetSegment[] = [
  {
    persona: "Operations Leaders",
    titles: ["COO", "VP Operations", "Head of Operations", "Director of Operations"],
    count: 0,
    priority: "P0",
  },
  {
    persona: "Risk & Underwriting",
    titles: ["CRO", "Head of Underwriting", "VP Risk", "Chief Risk Officer"],
    count: 0,
    priority: "P0",
  },
  {
    persona: "C-Suite Decision Makers",
    titles: ["CEO", "President", "Managing Director", "Founder"],
    count: 0,
    priority: "P1",
  },
  {
    persona: "Technology Leaders",
    titles: ["CTO", "VP Engineering", "Head of Technology"],
    count: 0,
    priority: "P1",
  },
];

const POST_TEMPLATES: PostTemplate[] = [
  {
    category: "Thought Leadership",
    description: "Industry perspective, market trends, regulatory analysis",
    frequency: "1x/week",
    example: "3 trends reshaping MCA underwriting in 2026 — and what smart lenders are doing about it",
  },
  {
    category: "Product Value",
    description: "Specific pain points solved, ROI data, before/after comparisons",
    frequency: "1x/week",
    example: "How one lender cut underwriting time from 45 minutes to 3 minutes (with data)",
  },
  {
    category: "Case Study / Social Proof",
    description: "Customer stories, deployment results, 450+ lender stats",
    frequency: "1x/2 weeks",
    example: "Kapitus reduced document review costs by 60% — here's exactly how",
  },
  {
    category: "Industry Comment / Engagement",
    description: "Reply to target leaders' posts, share their content with added insight",
    frequency: "3x/week",
    example: "Great point about bank statement fraud detection. At HyperVerge, we see...",
  },
];

const ENGAGEMENT_PLAYBOOK = [
  "Comment on target leaders' posts with genuine insight (not sales pitches)",
  "Share industry news with your perspective — position as a thought leader",
  "React to posts from target accounts (keeps you visible in their feed)",
  "Accept connection requests promptly and send a brief, personal note",
  "Track which leaders are most active — they're most likely to engage back",
];

export function LinkedInStrategy() {
  return (
    <div className="space-y-6">
      {/* Target Audience */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-brand" />
          <h3 className="text-sm font-semibold">Target Audience Segments</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {TARGET_SEGMENTS.map((seg) => (
            <Card key={seg.persona} className="p-3 gap-2 shadow-none">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">{seg.persona}</span>
                <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 ml-auto">
                  {seg.priority}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {seg.titles.join(", ")}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Post Templates */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Linkedin className="h-4 w-4 text-brand" />
          <h3 className="text-sm font-semibold">Post Templates by Category</h3>
        </div>
        <div className="space-y-2">
          {POST_TEMPLATES.map((tmpl) => (
            <Card key={tmpl.category} className="p-3 gap-2 shadow-none">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{tmpl.category}</span>
                <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-muted-foreground ml-auto">
                  {tmpl.frequency}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{tmpl.description}</p>
              <p className="text-xs text-brand/80 italic mt-1">&ldquo;{tmpl.example}&rdquo;</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Engagement Playbook */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-brand" />
          <h3 className="text-sm font-semibold">Engagement Playbook</h3>
        </div>
        <Card className="p-3 shadow-none">
          <ol className="space-y-2">
            {ENGAGEMENT_PLAYBOOK.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="text-brand font-bold shrink-0">{i + 1}.</span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
