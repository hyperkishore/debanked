"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Package,
  FileSpreadsheet,
  ShieldCheck,
  FileText,
  ScanFace,
  Tags,
  ClipboardCheck,
  AlertTriangle,
  Bot,
  Play,
  ExternalLink,
  BookOpen,
  TrendingUp,
  MessageSquare,
  Eye,
  ArrowRight,
  Swords,
  Lightbulb,
  Target,
  BarChart3,
} from "lucide-react";
import { PRODUCT_DOCS, type ProductDoc } from "@/data/product-docs";

// ---------------------------------------------------------------------------
// Icon mapping (matches product-helpers.ts iconHint values)
// ---------------------------------------------------------------------------

const PRODUCT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bsa: FileSpreadsheet,
  clear: ShieldCheck,
  application_pdf: FileText,
  identity_verification: ScanFace,
  sic_naics: Tags,
  stips_collection: ClipboardCheck,
  fraud_detection: AlertTriangle,
  copilot: Bot,
};

// ---------------------------------------------------------------------------
// Sub-sections for product detail
// ---------------------------------------------------------------------------

type ProductSection = "overview" | "demos" | "resources" | "sales";

const sections: { id: ProductSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: Eye },
  { id: "demos", label: "Demos", icon: Play },
  { id: "resources", label: "Resources", icon: BookOpen },
  { id: "sales", label: "Sales", icon: MessageSquare },
];

// ---------------------------------------------------------------------------
// Video Embed Component
// ---------------------------------------------------------------------------

function VideoEmbed({ video }: { video: ProductDoc["demoVideos"][number] }) {
  return (
    <div className="space-y-2">
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={video.embedUrl}
          title={video.title}
          className="absolute inset-0 w-full h-full rounded-lg border border-border"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{video.title}</span>
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-brand hover:underline"
        >
          Open in new tab
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Section
// ---------------------------------------------------------------------------

function OverviewSection({ product }: { product: ProductDoc }) {
  return (
    <div className="space-y-6">
      {/* Description */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</h4>
        <div className="text-sm leading-relaxed whitespace-pre-line">{product.description}</div>
      </div>

      {/* Key Features */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Features</h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {product.keyFeatures.map((feat, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-2" />
              {feat}
            </li>
          ))}
        </ul>
      </div>

      {/* Metrics */}
      {product.metrics.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Metrics</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {product.metrics.map((m, i) => (
              <Card key={i} className="p-3 text-center shadow-none">
                <div className="text-lg font-bold text-brand">{m.value}</div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Use Cases */}
      {product.useCases.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Use Cases</h4>
          <div className="space-y-2">
            {product.useCases.map((uc, i) => (
              <Card key={i} className="p-3 shadow-none">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span className="text-xs font-semibold text-brand">{uc.persona}</span>
                </div>
                <p className="text-sm text-muted-foreground">{uc.scenario}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demos Section
// ---------------------------------------------------------------------------

function DemosSection({ product }: { product: ProductDoc }) {
  const hasContent = product.demoVideos.length > 0 || product.liveDemoUrl;

  if (!hasContent) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No demos available for this product yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Demos */}
      {product.demoVideos.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Demo Videos</h4>
          <div className="space-y-4">
            {product.demoVideos.map((video, i) => (
              <VideoEmbed key={i} video={video} />
            ))}
          </div>
        </div>
      )}

      {/* Live Demo */}
      {product.liveDemoUrl && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Live Demo</h4>
          <a
            href={product.liveDemoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="p-3 shadow-none hover:border-brand/30 transition-colors group">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-brand/10 flex items-center justify-center shrink-0">
                  <Play className="h-4 w-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Try Live Demo</div>
                  <div className="text-xs text-muted-foreground truncate">{product.liveDemoUrl}</div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </Card>
          </a>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resources Section
// ---------------------------------------------------------------------------

function ResourcesSection({ product }: { product: ProductDoc }) {
  return (
    <div className="space-y-6">
      {/* Notion Pages */}
      {product.notionPages.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notion Pages</h4>
          <div className="grid grid-cols-1 gap-2">
            {product.notionPages.map((page, i) => (
              <a key={i} href={page.url} target="_blank" rel="noopener noreferrer" className="block">
                <Card className="p-3 shadow-none hover:border-brand/30 transition-colors group">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium flex-1">{page.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Collateral */}
      {product.collateral.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Collateral</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {product.collateral.map((item, i) => (
              <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                <Card className="p-3 shadow-none hover:border-brand/30 transition-colors group">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground capitalize">{item.type.replace("-", " ")}</div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sales Section
// ---------------------------------------------------------------------------

function SalesSection({ product }: { product: ProductDoc }) {
  return (
    <div className="space-y-6">
      {/* Value Props */}
      {product.valueProps.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Value Propositions</h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {product.valueProps.map((vp, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-b-0">
                    <td className="py-2.5 px-3 text-muted-foreground">{vp.from}</td>
                    <td className="py-2.5 px-1">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </td>
                    <td className="py-2.5 px-3 font-medium">{vp.to}</td>
                    <td className="py-2.5 px-3 text-right text-brand font-semibold whitespace-nowrap">{vp.impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Talking Points */}
      {product.talkingPoints.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Talking Points</h4>
          <div className="space-y-2">
            {product.talkingPoints.map((tp, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Lightbulb className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                <span>{tp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pain Points */}
      {product.painPoints.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pain Points to Probe</h4>
          <div className="flex flex-wrap gap-1.5">
            {product.painPoints.map((pp, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {pp}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Objections */}
      {product.objections.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Objection Handling</h4>
          <div className="space-y-2">
            {product.objections.map((obj, i) => (
              <details key={i} className="group rounded-lg bg-card border border-border overflow-hidden">
                <summary className="flex items-center gap-2 p-3 cursor-pointer list-none">
                  <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">!</span>
                  <span className="text-sm font-medium flex-1">&ldquo;{obj.question}&rdquo;</span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-90">&rsaquo;</span>
                </summary>
                <div className="px-3 pb-3 pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed pl-7">{obj.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Competitors Replaced */}
      {product.competitorsReplaced.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Competitors Replaced</h4>
          <div className="flex flex-wrap gap-1.5">
            {product.competitorsReplaced.map((comp, i) => (
              <Badge key={i} variant="outline" className="text-xs border-red-500/30 text-red-400">
                <Swords className="h-3 w-3 mr-1" />
                {comp}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Category Affinity */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Category Fit</h4>
        <div className="space-y-1.5">
          {Object.entries(product.categoryAffinity)
            .sort(([, a], [, b]) => b - a)
            .filter(([, score]) => score >= 20)
            .map(([category, score]) => (
              <div key={category} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-24 capitalize">{category.replace("_", " ")}</span>
                <div className="flex-1 bg-muted/30 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${score}%`,
                      backgroundColor: score >= 70 ? "var(--icp)" : score >= 50 ? "var(--brand)" : "var(--client)",
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{score}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product List Item (Left Sidebar)
// ---------------------------------------------------------------------------

function ProductListItem({
  product,
  isActive,
  onClick,
}: {
  product: ProductDoc;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = PRODUCT_ICONS[product.id] || Package;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isActive
          ? "border-brand/50 bg-brand/5"
          : "border-border hover:border-brand/20 hover:bg-muted/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
            isActive ? "bg-brand/20" : "bg-muted/50"
          }`}
        >
          <Icon className={`h-4 w-4 ${isActive ? "text-brand" : "text-muted-foreground"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-medium truncate ${isActive ? "text-brand" : ""}`}>
            {product.name}
          </div>
          <div className="text-xs text-muted-foreground truncate">{product.tagline}</div>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Product Detail (Right Content Area)
// ---------------------------------------------------------------------------

function ProductDetail({ product }: { product: ProductDoc }) {
  const [activeSection, setActiveSection] = useState<ProductSection>("overview");
  const Icon = PRODUCT_ICONS[product.id] || Package;

  return (
    <div className="h-full flex flex-col">
      {/* Product Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/15 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h3 className="text-lg font-bold">{product.name}</h3>
            <p className="text-xs text-muted-foreground">{product.tagline}</p>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-2 mt-3">
          {sections.map((sec) => {
            const SIcon = sec.icon;
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
                <SIcon className="h-3 w-3 mr-1" />
                {sec.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Section Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeSection === "overview" && <OverviewSection product={product} />}
          {activeSection === "demos" && <DemosSection product={product} />}
          {activeSection === "resources" && <ResourcesSection product={product} />}
          {activeSection === "sales" && <SalesSection product={product} />}
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Products Tab
// ---------------------------------------------------------------------------

export function ProductsTab() {
  const [selectedId, setSelectedId] = useState<string>(PRODUCT_DOCS[0]?.id ?? "bsa");
  const selectedProduct = PRODUCT_DOCS.find((p) => p.id === selectedId) || PRODUCT_DOCS[0];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 pb-0 md:p-6 md:pb-0">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-brand" />
          <h2 className="text-lg font-bold">Products</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          HyperVerge product catalog with demos, collateral, and sales material
        </p>
      </div>

      <Separator className="mt-4" />

      {/* Two-column layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar — product list */}
        <div className="w-64 shrink-0 border-r border-border">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1.5">
              {PRODUCT_DOCS.map((product) => (
                <ProductListItem
                  key={product.id}
                  product={product}
                  isActive={selectedId === product.id}
                  onClick={() => setSelectedId(product.id)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right content — product detail */}
        <div className="flex-1 min-w-0">
          {selectedProduct && <ProductDetail key={selectedProduct.id} product={selectedProduct} />}
        </div>
      </div>
    </div>
  );
}
