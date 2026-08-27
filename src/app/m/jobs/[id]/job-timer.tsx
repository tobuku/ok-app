"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export function JobTimer({ onSiteAt }: { onSiteAt: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const start = new Date(onSiteAt).getTime();

    function update() {
      const diff = Math.max(0, Date.now() - start);
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(
        hrs > 0
          ? `${hrs}h ${String(mins).padStart(2, "0")}m`
          : `${mins}m ${String(secs).padStart(2, "0")}s`
      );
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [onSiteAt]);

  return (
    <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-md border border-indigo-200 dark:border-indigo-800">
      <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      <span className="text-sm font-mono font-medium text-indigo-700 dark:text-indigo-300">
        {elapsed}
      </span>
      <span className="text-xs text-indigo-500 dark:text-indigo-400">on site</span>
    </div>
  );
}
