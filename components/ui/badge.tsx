import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-blue-600/20 text-blue-400 border border-blue-500/30",
        success: "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30",
        destructive: "bg-red-600/20 text-red-400 border border-red-500/30",
        warning: "bg-amber-600/20 text-amber-400 border border-amber-500/30",
        secondary: "bg-slate-700 text-slate-300 border border-slate-600/30",
        outline: "border border-slate-600 text-slate-400",
        org: "bg-violet-600/20 text-violet-400 border border-violet-500/30",
        handle: "bg-blue-600/10 text-blue-300 border border-blue-500/20 font-mono",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
