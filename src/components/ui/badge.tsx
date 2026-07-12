import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { CategoryGroup } from "@/lib/database.types";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[0.65rem] font-medium tracking-[0.08em] uppercase",
  {
    variants: {
      variant: {
        default: "border-hairline text-muted",
        core: "border-accent-dim text-accent",
        supportive: "border-[#2b4a63] text-[#7cc0f5]",
        social: "border-[#2c5241] text-[#6fd29c]",
        rest: "border-hairline text-muted",
        warning: "border-accent-dim text-accent",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export function groupBadgeVariant(group: CategoryGroup) {
  return group;
}
