"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Briefcase,
  Users,
  Calendar,
  Map,
  BarChart3,
  Truck,
  MapPin,
  Trash2,
  Settings,
  CreditCard,
  Shield,
  Search,
  BookOpen,
} from "lucide-react";

type SearchResult = {
  id: string;
  label: string;
  sub?: string;
  href: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: SearchResult[] = [
  { id: "nav-jobs", label: "Job Board", href: "/app", icon: <Briefcase className="h-4 w-4" /> },
  { id: "nav-calendar", label: "Calendar", href: "/app/calendar", icon: <Calendar className="h-4 w-4" /> },
  { id: "nav-customers", label: "Customers", href: "/app/customers", icon: <Users className="h-4 w-4" /> },
  { id: "nav-map", label: "Dispatch Map", href: "/app/map", icon: <Map className="h-4 w-4" /> },
  { id: "nav-reports", label: "Reports", href: "/app/reports", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "nav-trucks", label: "Trucks", href: "/app/trucks", icon: <Truck className="h-4 w-4" /> },
  { id: "nav-dumpsites", label: "Dump Sites", href: "/app/dumpsites", icon: <MapPin className="h-4 w-4" /> },
  { id: "nav-dumpruns", label: "Dump Runs", href: "/app/dumpruns", icon: <Trash2 className="h-4 w-4" /> },
  { id: "nav-pricebook", label: "Price Book", href: "/app/pricebook", icon: <BookOpen className="h-4 w-4" /> },
  { id: "nav-users", label: "Team", href: "/app/users", icon: <Users className="h-4 w-4" /> },
  { id: "nav-branding", label: "Branding", href: "/app/settings/branding", icon: <Settings className="h-4 w-4" /> },
  { id: "nav-stripe", label: "Stripe Connection", href: "/app/settings/stripe", icon: <CreditCard className="h-4 w-4" /> },
  { id: "nav-billing", label: "Billing & Plan", href: "/app/settings/billing", icon: <CreditCard className="h-4 w-4" /> },
  { id: "nav-audit", label: "Audit Log", href: "/app/settings/audit-log", icon: <Shield className="h-4 w-4" /> },
];

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q });
      const res = await fetch(`/api/org/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  function select(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 bg-muted/50 transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          Ctrl K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
          <Command shouldFilter={false} className="border-none">
            <div className="flex items-center border-b border-border px-3">
              <Search className="h-4 w-4 text-muted-foreground shrink-0 mr-2" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search jobs, customers, pages..."
                className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <Command.List className="max-h-[300px] overflow-y-auto p-1">
              {searching && (
                <Command.Loading>
                  <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
                </Command.Loading>
              )}

              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                No results found.
              </Command.Empty>

              {/* Dynamic search results */}
              {results.length > 0 && (
                <Command.Group heading="Results" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
                  {results.map((r) => (
                    <Command.Item
                      key={r.id}
                      value={r.id}
                      onSelect={() => select(r.href)}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer data-[selected=true]:bg-accent"
                    >
                      {r.icon}
                      <div className="flex flex-col">
                        <span>{r.label}</span>
                        {r.sub && <span className="text-xs text-muted-foreground">{r.sub}</span>}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Navigation shortcuts — always visible */}
              <Command.Group heading="Pages" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
                {NAV_ITEMS.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    onSelect={() => select(item.href)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer data-[selected=true]:bg-accent"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
