"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, LayoutDashboard, Activity, Beaker, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/send", label: "Enviar", icon: Send },
  { href: "/app/feed", label: "Feed", icon: Activity },
  { href: "/demo", label: "Demo", icon: Beaker },
];

export function Topbar({ userName, userHandle }: { userName?: string; userHandle?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="lg:hidden sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-slate-800/60">
      <div className="flex items-center justify-between px-4 h-14">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
            SP
          </div>
          <span className="font-bold text-white">SocialPay</span>
        </Link>

        <div className="flex items-center gap-3">
          {userHandle && (
            <span className="text-xs font-mono text-blue-400">@{userHandle}</span>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="px-3 pb-3 space-y-1 border-t border-slate-800/60 pt-2">
          {navItems.map((item) => {
            const active =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-600/15 text-blue-400"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                )}
              >
                <item.icon size={16} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
