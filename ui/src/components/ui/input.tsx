import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full border-2 border-inset border-[rgb(51,51,51)] bg-[rgb(255,255,255)] px-3 py-2 text-sm placeholder:text-muted-foreground transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[rgb(40,40,40)] dark:border-[rgb(100,100,100)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
