"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Send,
  Activity,
  Beaker,
  LogOut,
  ArrowDownCircle,
  ArrowUpCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/send", label: "Enviar", icon: Send },
  { href: "/app/deposit", label: "Depositar (Pix)", icon: ArrowDownCircle },
  { href: "/app/withdraw", label: "Sacar (Pix)", icon: ArrowUpCircle },
  { href: "/app/feed", label: "Feed", icon: Activity },
  { href: "/app/premium", label: "Premium (x402)", icon: Zap },
  { href: "/demo", label: "Demo", icon: Beaker },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-slate-950 border-r border-slate-800/60 h-screen sticky top-0">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
            SP
          </div>
          <span className="font-bold text-white text-lg tracking-tight">SocialPay</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600/15 text-blue-400"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800/60">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-red-400 transition-colors"
        >
          <LogOut size={18} className="shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );
}
