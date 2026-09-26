"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MobileSearch } from "@/components/mobile-search";

const TAB_LABELS: Record<string, string> = {
  "/m": "Today",
  "/m/week": "This Week",
  "/m/history": "History",
  "/m/profile": "Profile",
  "/m/estimate": "New Estimate",
};

export function MobileHeader({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  // Tab pages — no back button needed
  const tabLabel = TAB_LABELS[pathname];
  if (tabLabel) {
    return (
      <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <span className="font-bold text-foreground">{tabLabel}</span>
        <div className="flex items-center gap-2">
          <MobileSearch basePath="/m" />
          <span className="text-xs text-muted-foreground">{userName}</span>
        </div>
      </header>
    );
  }

  // Detail pages — show back button + context label
  let label = "Back";
  let backHref = "/m";

  if (pathname.match(/^\/m\/jobs\/[^/]+\/present/)) {
    label = "Quote Presentation";
  } else if (pathname.match(/^\/m\/jobs\/[^/]+/)) {
    label = "Job Detail";
  }

  return (
    <header className="sticky top-0 z-40 flex items-center h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <button
        onClick={() => router.push(backHref)}
        className="flex items-center gap-1 text-sm text-primary hover:underline mr-auto"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </button>
      <span className="text-sm font-medium text-foreground absolute left-1/2 -translate-x-1/2">
        {label}
      </span>
      <span className="text-xs text-muted-foreground ml-auto">{userName}</span>
    </header>
  );
}
