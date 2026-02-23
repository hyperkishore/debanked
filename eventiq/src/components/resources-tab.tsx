"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExternalLink, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResourceItem {
  category: "GTM" | "Product" | "GTM/Product";
  title: string;
  link?: string;
  detail?: string;
  isCredential?: boolean;
}

const resources: ResourceItem[] = [
  // GTM Resources
  { category: "GTM", title: "GTM Strategy & Playbook", link: "https://www.notion.so/hyperverge/GTM-Strategy-Playbook-MCA-1c6fd39b4d2780a48c72c4d1cc13f5cb" },
  { category: "GTM", title: "Prospect List (Master)", link: "https://docs.google.com/spreadsheets/d/1lQz4rH8y8W7P3a1Zr9zO2bGwZ7RQj1nKQpJqz0fWZvY/edit" },
  { category: "GTM", title: "Email Templates & Sequences", link: "https://www.notion.so/hyperverge/Email-Templates-Sequences-1c6fd39b4d2780b6b6bfe6aafe93e8e0" },
  { category: "GTM", title: "Competitive Analysis", link: "https://www.notion.so/hyperverge/Competitive-Landscape-1c6fd39b4d2780b0a9bdf5d7f73b0a31" },
  { category: "GTM", title: "Pricing & Packaging", link: "https://www.notion.so/hyperverge/Pricing-Packaging-1c6fd39b4d2780a3a6f4d2e5c1b0d9e8" },
  { category: "GTM", title: "Apollo Credentials", detail: "kishore@hyperverge.co / HV-apollo-2026!", isCredential: true },
  { category: "GTM", title: "Lusha Credentials", detail: "kishore@hyperverge.co / HV-lusha-2026!", isCredential: true },
  { category: "GTM", title: "Conference / Event Calendar", link: "https://www.notion.so/hyperverge/Conference-Calendar-1c6fd39b4d2780b5b9d7e3f4a2c1b0d9" },
  { category: "GTM", title: "Partnership Tracker", link: "https://docs.google.com/spreadsheets/d/1kR3s5x7y8Z9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5/edit" },

  // Product Resources
  { category: "Product", title: "Product Demo — MCA Underwriting", link: "https://demo.hyperverge.co/mca-underwriting" },
  { category: "Product", title: "CLEAR Report Analysis Demo", link: "https://drive.google.com/file/d/16sW_NUacuxh-xmTbPpoGDVWH2CW0tewD/view" },
  { category: "Product", title: "Cashflow Analysis Demo Video", link: "https://drive.google.com/file/d/1pzREwBBB2c3yf8jUTc3Td-esxpZXwtY1/view" },
  { category: "Product", title: "Industry Classification Demo", link: "https://drive.google.com/file/d/1fPsXDfd3PDNN49kyHRj4GGTF2SJlPPga/view" },
  { category: "Product", title: "Builder Platform Demo", link: "https://www.youtube.com/watch?v=fLbtk4uty-s" },
  { category: "Product", title: "Email to CRM — Overview", link: "https://drive.google.com/file/d/1UNxRWYTAIG7YK0ZOdV7i88PeMLkNSW3g/view" },
  { category: "Product", title: "Email to CRM — Detailed", link: "https://drive.google.com/file/d/1Jdluk9TQlY56k3bES4aCMdFT5TY29Zyl/view" },
  { category: "Product", title: "Product Roadmap", link: "https://www.notion.so/hyperverge/Product-Roadmap-MCA-1c6fd39b4d2780c4b8e9f0a1b2c3d4e5" },
  { category: "Product", title: "Technical Documentation", link: "https://docs.hyperverge.co" },

  // GTM/Product
  { category: "GTM/Product", title: "Marketing Collateral Library", link: "https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j" },
  { category: "GTM/Product", title: "Case Studies & Testimonials", link: "https://www.notion.so/hyperverge/Case-Studies-1c6fd39b4d2780d5c9f0a1b2c3d4e5f6" },
  { category: "GTM/Product", title: "SOC 2 & Compliance Docs", link: "https://www.notion.so/hyperverge/Compliance-Center-1c6fd39b4d2780e6d0a1b2c3d4e5f6g7" },
];

function CredentialField({ detail }: { detail: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-mono">
        {visible ? detail : "••••••••••••••••"}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0"
        onClick={() => setVisible(!visible)}
      >
        {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </Button>
    </div>
  );
}

function ResourceCard({ item }: { item: ResourceItem }) {
  if (item.isCredential) {
    return (
      <Card className="p-3 shadow-none">
        <div className="text-sm font-medium mb-1">{item.title}</div>
        <CredentialField detail={item.detail || ""} />
      </Card>
    );
  }

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <Card className="p-3 shadow-none hover:border-brand/30 transition-colors group">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium flex-1">{item.title}</span>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
        {item.detail && (
          <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
        )}
      </Card>
    </a>
  );
}

function CategorySection({ category, items }: { category: string; items: ResourceItem[] }) {
  return (
    <Collapsible defaultOpen={true}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full group mb-2">
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{category}</h3>
        <Badge variant="outline" className="text-xs ml-1">{items.length}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6">
          {items.map((item, i) => (
            <ResourceCard key={i} item={item} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ResourcesTab() {
  const gtmItems = resources.filter((r) => r.category === "GTM");
  const productItems = resources.filter((r) => r.category === "Product");
  const crossItems = resources.filter((r) => r.category === "GTM/Product");

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        <div>
          <h2 className="text-sm font-bold mb-1">Resources</h2>
          <p className="text-xs text-muted-foreground">
            Quick access to GTM tools, product demos, marketing collateral, and credentials.
          </p>
        </div>

        <CategorySection category="GTM" items={gtmItems} />
        <CategorySection category="Product" items={productItems} />
        <CategorySection category="GTM / Product" items={crossItems} />
      </div>
    </ScrollArea>
  );
}
