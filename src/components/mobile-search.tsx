"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, User, Briefcase } from "lucide-react";

type SearchResult = {
  id: string;
  label: string;
  sub?: string;
  href: string;
  icon: string;
};

/**
 * Mobile search overlay for leadman (/m) and dispatcher (/app) views.
 * Pass basePath="/m" for leadman or "/app" for dispatcher.
 */
export function MobileSearch({ basePath = "/m" }: { basePath?: "/m" | "/app" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/org/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data: SearchResult[] = await res.json();
        // Rewrite hrefs for the current basePath
        if (basePath === "/m") {
          for (const r of data) {
            if (r.icon === "job" && r.href.startsWith("/app/jobs/")) {
              r.href = r.href.replace("/app/jobs/", "/m/jobs/");
            }
          }
        }
        setResults(data);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, [basePath]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  function select(href: string) {
    setOpen(false);
    router.push(href);
  }

  const iconForType = (type: string) => {
    if (type === "customer") return <User className="h-4 w-4 text-muted-foreground shrink-0" />;
    return <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />;
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Search header */}
      <div className="flex items-center gap-2 h-14 px-4 border-b border-border">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers, jobs..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={() => setOpen(false)}
          className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {searching && (
          <p className="px-4 py-3 text-sm text-muted-foreground">Searching...</p>
        )}

        {!searching && query.length >= 2 && results.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No results found.
          </p>
        )}

        {results.length > 0 && (
          <ul className="divide-y divide-border">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => select(r.href)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent active:bg-accent transition-colors"
                >
                  {iconForType(r.icon)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.label}</p>
                    {r.sub && (
                      <p className="text-xs text-muted-foreground">{r.sub}</p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query.length < 2 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search.
          </p>
        )}
      </div>
    </div>
  );
}
