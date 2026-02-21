"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

interface DealEditPopoverProps {
  dealValue?: number;
  closeDate?: string;
  onSave: (dealValue: number | undefined, closeDate: string | undefined) => void;
  children?: React.ReactNode;
}

export function DealEditPopover({ dealValue, closeDate, onSave, children }: DealEditPopoverProps) {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(dealValue?.toString() || "");
  const [localDate, setLocalDate] = useState(closeDate || "");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalValue(dealValue?.toString() || "");
      setLocalDate(closeDate || "");
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    const numValue = localValue ? parseFloat(localValue.replace(/[^0-9.]/g, "")) : undefined;
    const dateValue = localDate || undefined;
    onSave(numValue && !isNaN(numValue) ? numValue : undefined, dateValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-brand transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3 space-y-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1.5">
          <Label className="text-xs">Deal Value ($)</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder="e.g. 50000"
            className="h-7 text-xs"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Close Date</Label>
          <Input
            type="date"
            value={localDate}
            onChange={(e) => setLocalDate(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleSave}>
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
