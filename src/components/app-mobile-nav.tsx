"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Calendar,
  Users,
  Map,
  Settings,
  Menu,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { UserNav } from "@/components/user-nav";
import { useState } from "react";

interface AppMobileNavProps {
  isAdmin: boolean;
  isDispatcherOrAdmin: boolean;
  userName: string;
  userRole: string;
  orgName?: string;
}

const bottomTabs = [
  { href: "/app", label: "Jobs", icon: ClipboardList },
  { href: "/app/calendar", label: "Calendar", icon: Calendar },
  { href: "/app/customers", label: "Clients", icon: Users },
  { href: "/app/map", label: "Map", icon: Map },
];

export function AppMobileNav({ isAdmin, isDispatcherOrAdmin, userName, userRole, orgName }: AppMobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top bar */}
      <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-background">
        <span className="font-semibold text-sm">{orgName || "JunkMint"}</span>
        <div className="flex items-center gap-2">
          <UserNav name={userName} role={userRole} />
          {isDispatcherOrAdmin && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[260px] p-4">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-4 space-y-1">
                  {[
                    { href: "/app/trucks", label: "Trucks" },
                    { href: "/app/dumpsites", label: "Dump Sites" },
                    { href: "/app/dumpruns", label: "Dump Runs" },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                      {item.label}
                    </Link>
                  ))}
                  {isAdmin && (
                    <>
                      <Separator className="my-2" />
                      {[
                        { href: "/app/reports", label: "Reports" },
                        { href: "/app/pricebook", label: "Price Book" },
                        { href: "/app/users", label: "Team" },
                        { href: "/app/settings/billing", label: "Billing" },
                        { href: "/app/settings/branding", label: "Branding" },
                        { href: "/app/settings/stripe", label: "Payments" },
                        { href: "/app/settings/audit-log", label: "Audit Log" },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </>
                  )}
                  <Separator className="my-2" />
                  <button
                    onClick={() => {
                      setOpen(false);
                      window.dispatchEvent(new CustomEvent("start-tour"));
                    }}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent w-full"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Show Guide
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      {/* Bottom tab bar */}
      {isDispatcherOrAdmin && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background">
          <div className="flex items-center justify-around h-14">
            {bottomTabs.map((tab) => {
              const isActive =
                tab.href === "/app" ? pathname === "/app" : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex flex-col items-center gap-1 py-1 px-3 text-xs transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setOpen(true)}
              className="flex flex-col items-center gap-1 py-1 px-3 text-xs text-muted-foreground"
            >
              <Settings className="h-5 w-5" />
              <span>More</span>
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
