import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-md border border-hairline bg-panel px-3 text-sm text-foreground placeholder:text-muted/70 focus:border-muted focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-hairline bg-panel px-3 py-2 text-sm text-foreground placeholder:text-muted/70 focus:border-muted focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full cursor-pointer appearance-none rounded-md border border-hairline bg-panel px-3 text-sm text-foreground focus:border-muted focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
