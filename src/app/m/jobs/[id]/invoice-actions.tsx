"use client";

import { Button } from "@/components/ui/button";
import { Share2, Printer, FileText } from "lucide-react";
import { showError } from "@/lib/toast";

export function InvoiceActions({
  jobId,
  orgName,
}: {
  jobId: string;
  orgName: string;
}) {
  const invoiceUrl = `/api/org/jobs/${jobId}/invoice`;

  async function handleShare() {
    try {
      const res = await fetch(invoiceUrl);
      if (!res.ok) {
        showError("Failed to generate invoice");
        return;
      }
      const blob = await res.blob();
      const file = new File([blob], `${orgName.replace(/\s+/g, "-")}-invoice.html`, {
        type: "text/html",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Invoice — ${orgName}`,
          files: [file],
        });
      } else if (navigator.share) {
        // Fallback: share URL if file sharing not supported
        await navigator.share({
          title: `Invoice — ${orgName}`,
          url: invoiceUrl,
        });
      } else {
        // Desktop fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // User cancelled share — not an error
    }
  }

  function handlePrint() {
    const win = window.open(invoiceUrl, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print());
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase">Invoice</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 min-h-[44px]"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 min-h-[44px]"
          onClick={handlePrint}
        >
          <Printer className="h-4 w-4 mr-1" />
          Print
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 min-h-[44px]"
          asChild
        >
          <a href={invoiceUrl} target="_blank" rel="noopener noreferrer">
            <FileText className="h-4 w-4 mr-1" />
            View
          </a>
        </Button>
      </div>
    </div>
  );
}
