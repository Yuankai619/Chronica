import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { categoryPaletteIndex } from "@/lib/categories";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[0.7rem] font-medium",
  {
    variants: {
      variant: {
        default: "border-hairline text-muted",
        warning: "border-accent-dim text-accent",
        c0: "border-accent-dim text-accent",
        c1: "border-[#2b4a63] text-[#7cc0f5]",
        c2: "border-[#2c5241] text-[#6fd29c]",
        c3: "border-[#5a3a5e] text-[#d9a1e0]",
        c4: "border-[#5e3a3a] text-[#eba9a1]",
        c5: "border-[#31505a] text-[#8fd5e0]",
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

/** Stable color variant for a category id. */
export function categoryVariant(id: string): BadgeProps["variant"] {
  return `c${categoryPaletteIndex(id)}` as BadgeProps["variant"];
}

/**
 * A category name badge: uses the user-chosen color when set, otherwise
 * the stable auto palette.
 */
export function CategoryBadge({
  id,
  name,
  color = null,
  className,
}: {
  id: string;
  name: string;
  color?: string | null;
  className?: string;
}) {
  if (color) {
    return (
      <Badge
        variant="default"
        className={className}
        style={{ color, borderColor: `${color}66` }}
      >
        {name}
      </Badge>
    );
  }
  return (
    <Badge variant={categoryVariant(id)} className={className}>
      {name}
    </Badge>
  );
}
