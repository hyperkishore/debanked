import * as React from "react"
import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 items-center rounded border border-border bg-muted/50 px-1.5 font-mono text-xs text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Kbd }
