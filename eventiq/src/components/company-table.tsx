"use client";

import { Company, RatingData } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CompanyTableProps {
  companies: Company[];
  selectedId: number | null;
  metState: Record<string, boolean>;
  ratingState: Record<string, RatingData>;
  onSelect: (id: number) => void;
  onToggleMet: (id: number) => void;
}

const typeBadgeStyles: Record<string, string> = {
  SQO: "text-[var(--sqo)] border-[var(--sqo)]/30 bg-[var(--sqo)]/10",
  Client: "text-[var(--client)] border-[var(--client)]/30 bg-[var(--client)]/10",
  ICP: "text-[var(--icp)] border-[var(--icp)]/30 bg-[var(--icp)]/10",
  TAM: "text-[var(--tam)] border-[var(--tam)]/30 bg-[var(--tam)]/10",
};

export function CompanyTable({
  companies,
  selectedId,
  metState,
  ratingState,
  onSelect,
  onToggleMet,
}: CompanyTableProps) {
  const displayed = companies.slice(0, 200);
  const hasMore = companies.length > 200;

  return (
    <div className="w-full">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background border-b border-border">
          <tr className="text-xs text-muted-foreground">
            <th className="text-left py-2 px-3 font-medium">Company</th>
            <th className="text-left py-2 px-2 font-medium w-16">Type</th>
            <th className="text-left py-2 px-2 font-medium hidden md:table-cell">Contacts</th>
            <th className="text-left py-2 px-2 font-medium hidden lg:table-cell w-24">Location</th>
            <th className="text-right py-2 px-2 font-medium hidden lg:table-cell w-16">Size</th>
            <th className="text-center py-2 px-2 font-medium w-14">Met</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((company) => {
            const isMet = !!metState[company.id];
            return (
              <tr
                key={company.id}
                className={cn(
                  "cursor-pointer border-b border-border/50 transition-colors hover:bg-secondary/30",
                  selectedId === company.id && "bg-secondary/50"
                )}
                onClick={() => onSelect(company.id)}
              >
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{company.name}</span>
                    {company.clear && (
                      <Badge variant="outline" className="text-xs px-1 py-0 h-3.5 text-primary border-primary/30">
                        CLEAR
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="py-2 px-2">
                  <Badge variant="outline" className={cn("text-xs px-1.5 py-0.5 h-5", typeBadgeStyles[company.type] || "")}>
                    {company.type}
                  </Badge>
                </td>
                <td className="py-2 px-2 text-muted-foreground text-xs hidden md:table-cell truncate max-w-[200px]">
                  {company.contacts.map((c) => c.n).join(", ") || company.location || "—"}
                </td>
                <td className="py-2 px-2 text-muted-foreground text-xs hidden lg:table-cell truncate">
                  {company.location || "—"}
                </td>
                <td className="py-2 px-2 text-right text-xs text-muted-foreground hidden lg:table-cell">
                  {company.employees ? company.employees : "—"}
                </td>
                <td className="py-2 px-2 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6 rounded-full text-xs mx-auto",
                      isMet
                        ? "bg-primary/20 text-primary"
                        : "bg-muted/30 text-muted-foreground hover:bg-primary/20 hover:text-primary"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMet(company.id);
                    }}
                  >
                    {isMet ? "✓" : "○"}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hasMore && (
        <div className="text-center py-3 text-xs text-muted-foreground">
          Showing 200 of {companies.length} companies. Use card view for full virtual scrolling.
        </div>
      )}
    </div>
  );
}
