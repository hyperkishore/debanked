"use client";

import { Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  label?: string;
  variant?: "icon" | "button";
  size?: "sm" | "md";
  className?: string;
  onAfterCopy?: () => void;
}

export function CopyButton({
  text,
  label,
  variant = "icon",
  size = "sm",
  className,
  onAfterCopy,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
      onAfterCopy?.();
    });
  }, [text, onAfterCopy]);

  if (variant === "button") {
    return (
      <button
        onClick={handleCopy}
        className={cn(
          "flex items-center gap-1 rounded-md font-medium transition-colors",
          size === "sm" ? "text-[10px] px-2 py-1" : "text-xs px-3 py-1.5",
          copied
            ? "bg-[var(--icp)] text-white"
            : "bg-primary/10 text-primary hover:bg-primary/20",
          className
        )}
      >
        {copied ? (
          <><Check className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} /> Copied</>
        ) : (
          <><Copy className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} /> {label || "Copy"}</>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "shrink-0 rounded-md transition-colors",
        size === "sm" ? "p-1" : "p-1.5",
        copied
          ? "text-[var(--icp)]"
          : "text-muted-foreground/40 hover:text-muted-foreground",
        className
      )}
      title={label || "Copy to clipboard"}
    >
      {copied ? (
        <Check className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      ) : (
        <Copy className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      )}
    </button>
  );
}
