import Link from "next/link";
import { cn } from "@/lib/utils";

interface HandleBadgeProps {
  handle: string;
  size?: "sm" | "md" | "lg";
  linked?: boolean;
  className?: string;
}

export function HandleBadge({ handle, size = "md", linked = true, className }: HandleBadgeProps) {
  const raw = handle.replace(/^@/, "");
  const label = `@${raw}`;

  const classes = cn(
    "inline-flex items-center font-mono font-semibold rounded-full transition-colors",
    {
      "text-xs px-2 py-0.5 bg-blue-600/10 text-blue-300 border border-blue-500/20": size === "sm",
      "text-sm px-3 py-1 bg-blue-600/10 text-blue-400 border border-blue-500/20": size === "md",
      "text-base px-4 py-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/20": size === "lg",
    },
    linked && "hover:bg-blue-600/20 hover:text-blue-300 cursor-pointer",
    className
  );

  if (linked) {
    return (
      <Link href={`/u/${raw}`} className={classes}>
        {label}
      </Link>
    );
  }

  return <span className={classes}>{label}</span>;
}
