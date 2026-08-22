import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The standard page gutter: centered, capped width, comfortable padding.
 * Every route under (app) uses this except /agent, which wants to fill
 * the full content width like a dedicated chat surface.
 */
export function PageContainer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10",
        className,
      )}
      {...props}
    />
  );
}
