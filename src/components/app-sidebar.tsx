"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Calendar,
  Users,
  Map,
  Truck,
  Trash2,
  Route,
  BarChart3,
  DollarSign,
  Settings,
  Palette,
  CreditCard,
  BookOpen,
  Shield,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

interface AppSidebarProps {
  isAdmin: boolean;
  isDispatcherOrAdmin: boolean;
  orgName?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const opsItems: NavItem[] = [
  { href: "/app", label: "Jobs", icon: ClipboardList },
  { href: "/app/calendar", label: "Calendar", icon: Calendar },
  { href: "/app/customers", label: "Customers", icon: Users },
  { href: "/app/map", label: "Map", icon: Map },
  { href: "/app/trucks", label: "Trucks", icon: Truck },
  { href: "/app/dumpsites", label: "Dump Sites", icon: Trash2 },
  { href: "/app/dumpruns", label: "Dump Runs", icon: Route },
];

const adminItems: NavItem[] = [
  { href: "/app/reports", label: "Reports", icon: BarChart3 },
  { href: "/app/pricebook", label: "Price Book", icon: BookOpen },
  { href: "/app/users", label: "Team", icon: Users },
  { href: "/app/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/app/settings/branding", label: "Branding", icon: Palette },
  { href: "/app/settings/stripe", label: "Payments", icon: DollarSign },
  { href: "/app/settings/audit-log", label: "Audit Log", icon: Shield },
];

export function AppSidebar({ isAdmin, isDispatcherOrAdmin, orgName }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function NavLink({ item }: { item: NavItem }) {
    const isActive =
      item.href === "/app"
        ? pathname === "/app"
        : pathname.startsWith(item.href);

    const link = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return link;
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-[52px]" : "w-[240px]"
      )}
    >
      <div className={cn("flex items-center h-14 px-3 border-b border-border", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <span className="font-semibold text-sm truncate">{orgName || "JunkMint"}</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {!collapsed && (
          <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Operations
          </p>
        )}
        {isDispatcherOrAdmin &&
          opsItems.map((item) => <NavLink key={item.href} item={item} />)}
        {!isDispatcherOrAdmin && <NavLink item={opsItems[0]} />}

        {isAdmin && (
          <>
            <Separator className="my-2" />
            {!collapsed && (
              <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Admin
              </p>
            )}
            {adminItems.map((item) => <NavLink key={item.href} item={item} />)}
          </>
        )}
      </nav>
    </aside>
  );
}
