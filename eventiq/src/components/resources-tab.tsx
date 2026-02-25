"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExternalLink, ChevronRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResourceItem {
  category: "GTM" | "Product" | "GTM/Product";
  title: string;
  link?: string;
  detail?: string;
  isCredential?: boolean;
}

interface CredentialData {
  id: string;
  title: string;
  username: string;
  password: string;
}

const resources: ResourceItem[] = [
  // GTM Resources
  { category: "GTM", title: "US Fintech Notion Page", link: "https://www.notion.so/hyperverge/US-Fintech-187b743dbaed4e2b9d38fb612b62e6fb" },
  { category: "GTM", title: "TAM List", link: "https://docs.google.com/spreadsheets/d/1a-v52TIX6xSwrqtnSl45_7x4hiykCW8r6aiApbonlpo/edit?gid=1800727960" },
  { category: "GTM", title: "ICP Conversations", link: "https://www.notion.so/hyperverge/ICP-Conversations-1117e7c237cb80f3a75ace79d1e26431" },
  { category: "GTM", title: "HubSpot US Pipeline", link: "https://app.hubspot.com/contacts/3800237/objects/0-3/views/my/board" },
  // Apollo & Lusha credentials are loaded from /api/credentials (server-side only)
  { category: "GTM", title: "Marketing Note: Industry Classification", link: "https://www.notion.so/hyperverge/Industry-Classification-Brief-Marketing-Note-1ba7e7c237cb80b4a336ed27c9a8c2f9" },
  { category: "GTM", title: "Marketing Note: Clear Analysis", link: "https://www.notion.so/hyperverge/Clear-Brief-Marketing-Note-1b87e7c237cb808cb8e3f437fc1615f0" },

  // Product Resources
  { category: "Product", title: "Kapitus Download from KV", detail: "Problem discovery document", link: "https://drive.google.com/file/d/1WsRK8_SDde_nRHhJRUVI0I2M-oGdNZ85/view?usp=drive_link" },
  { category: "Product", title: "Email to CRM (Demo Video)", link: "https://drive.google.com/file/d/1Jdluk9TQlY56k3bES4aCMdFT5TY29Zyl/view" },
  { category: "Product", title: "Cashflow Analysis (Demo Video)", link: "https://drive.google.com/file/d/1pzREwBBB2c3yf8jUTc3Td-esxpZXwtY1/view?usp=sharing" },
  { category: "Product", title: "Cashflow Analysis (Live Demo)", detail: "Login: hv / test", link: "https://mca-lending-space.vercel.app/operations/cash-flow-analysis" },
  { category: "Product", title: "Clear Analysis (Demo Video)", link: "https://drive.google.com/file/d/1N_uJUvs3pXnvoaBPVNRI_hQrG1ZykLMS/view?usp=sharing" },
  { category: "Product", title: "Clear Analysis (Live Demo)", detail: "Login: hv / test", link: "https://mca-lending-space.vercel.app/operations/clear-report" },
  { category: "Product", title: "TLO Analysis (Live Demo)", link: "https://bsa-demo.dev.hyperverge.co/tlo-report/" },
  { category: "Product", title: "Industry Classification (Demo Video)", link: "https://drive.google.com/file/d/1fPsXDfd3PDNN49kyHRj4GGTF2SJlPPga/view?usp=drive_link" },
  { category: "Product", title: "Industry Classification (Live Demo)", detail: "Login: vignesh@hyperverge.co / KVhvdashboard321! \u2014 Go to Applications \u2192 ECG \u2192 sic_codes_2 \u2192 Sep 1\u2013Oct 31 \u2192 ID: 1325110", link: "https://usa.dashboard.hyperverge.co/" },
  { category: "Product", title: "FY26 OKRs", detail: "Company-level goals including US", link: "https://www.notion.so/hyperverge/Company-Goals-FY-26-2ef7e7c237cb81de91b9f66ab764513e" },
  { category: "Product", title: "Kapitus BRDs", detail: "Initial sections relevant", link: "https://drive.google.com/drive/folders/1iMhcS9BlryPqsUT1ZvWpqPb4g6qmgKfa?usp=drive_link" },

  // GTM/Product
  { category: "GTM/Product", title: "Product Demos & Marketing Collaterals", detail: "Consolidated list of all demos and collaterals", link: "https://docs.google.com/spreadsheets/d/1a-v52TIX6xSwrqtnSl45_7x4hiykCW8r6aiApbonlpo/edit?gid=2080114931" },
];

function CredentialField({ credential }: { credential: CredentialData }) {
  const [visible, setVisible] = useState(false);
  const detail = `${credential.username} / ${credential.password}`;

  return (
    <Card className="p-3 shadow-none">
      <div className="text-sm font-medium mb-1">{credential.title}</div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-mono">
          {visible ? detail : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
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
    </Card>
  );
}

function CredentialSection({ credentials, loading }: { credentials: CredentialData[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground ml-6">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading credentials...</span>
      </div>
    );
  }

  if (credentials.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6 mt-2">
      {credentials.map((cred) => (
        <CredentialField key={cred.id} credential={cred} />
      ))}
    </div>
  );
}

function ResourceCard({ item }: { item: ResourceItem }) {
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

function CategorySection({
  category,
  items,
  credentials,
  credentialsLoading,
}: {
  category: string;
  items: ResourceItem[];
  credentials?: CredentialData[];
  credentialsLoading?: boolean;
}) {
  const credCount = credentials?.length || 0;
  const totalCount = items.length + credCount;

  return (
    <Collapsible defaultOpen={true}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full group mb-2">
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{category}</h3>
        <Badge variant="outline" className="text-xs ml-1">{totalCount}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6">
          {items.map((item, i) => (
            <ResourceCard key={i} item={item} />
          ))}
        </div>
        {credentials !== undefined && (
          <CredentialSection credentials={credentials} loading={credentialsLoading || false} />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ResourcesTab() {
  const [credentials, setCredentials] = useState<CredentialData[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/credentials")
      .then((res) => (res.ok ? res.json() : { credentials: [] }))
      .then((data) => setCredentials(data.credentials || []))
      .catch(() => setCredentials([]))
      .finally(() => setCredentialsLoading(false));
  }, []);

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

        <CategorySection
          category="GTM"
          items={gtmItems}
          credentials={credentials}
          credentialsLoading={credentialsLoading}
        />
        <CategorySection category="Product" items={productItems} />
        <CategorySection category="GTM / Product" items={crossItems} />
      </div>
    </ScrollArea>
  );
}
