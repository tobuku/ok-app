"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart3, Building2, CreditCard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface PlatformSidebarProps {
  userName: string;
}

const navItems = [
  { href: "/platform", label: "Metrics", icon: BarChart3 },
  { href: "/platform/orgs", label: "Organizations", icon: Building2 },
  { href: "/platform/plans", label: "Plans", icon: CreditCard },
];

export function PlatformSidebar({ userName }: PlatformSidebarProps) {
  const pathname = usePathname();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="hidden md:flex flex-col w-[240px] border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center h-14 px-4 border-b border-border">
        <span className="font-bold text-sm">JunkMint Platform</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/platform"
              ? pathname === "/platform"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate">{userName}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
