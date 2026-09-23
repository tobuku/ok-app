"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Printer, FileText, Download } from "lucide-react";
import { showError, showSuccess } from "@/lib/toast";

export function QuoteActions({
  jobId,
  customerEmail,
}: {
  jobId: string;
  customerEmail?: string | null;
}) {
  const [emailTo, setEmailTo] = useState(customerEmail ?? "");
  const [emailing, setEmailing] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const estimateUrl = `/api/org/jobs/${jobId}/estimate`;

  function handlePrint() {
    const win = window.open(estimateUrl, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print());
    }
  }

  async function handleShare() {
    try {
      const res = await fetch(estimateUrl);
      if (!res.ok) {
        showError("Failed to generate estimate");
        return;
      }
      const blob = await res.blob();
      const file = new File([blob], `estimate-${jobId}.html`, {
        type: "text/html",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Estimate", files: [file] });
      } else if (navigator.share) {
        await navigator.share({ title: "Estimate", url: estimateUrl });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // User cancelled share
    }
  }

  async function sendEmail() {
    if (!emailTo) return;
    setEmailing(true);
    try {
      const res = await fetch(`/api/org/jobs/${jobId}/quote/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTo }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Failed to send email");
      } else {
        setEmailSent(true);
        showSuccess("Estimate sent");
      }
    } catch {
      showError("Network error");
    } finally {
      setEmailing(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase">Save or Send Estimate</p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handlePrint}
        >
          <Printer className="h-4 w-4 mr-1" />
          Print / PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleShare}
        >
          <Download className="h-4 w-4 mr-1" />
          Save
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          asChild
        >
          <a href={estimateUrl} target="_blank" rel="noopener noreferrer">
            <FileText className="h-4 w-4 mr-1" />
            View
          </a>
        </Button>
      </div>
      {emailSent ? (
        <p className="text-green-600 dark:text-green-400 text-sm">Estimate sent to {emailTo}</p>
      ) : (
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="customer@email.com"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            className="flex-1 text-sm"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={sendEmail}
            disabled={!emailTo || emailing}
          >
            {emailing ? "Sending..." : "Email"}
          </Button>
        </div>
      )}
    </div>
  );
}
