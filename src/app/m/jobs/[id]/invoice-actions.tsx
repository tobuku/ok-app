"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Printer, FileText, QrCode, MessageSquare, Copy, Check } from "lucide-react";
import { showError } from "@/lib/toast";
import QRCode from "qrcode";

export function InvoiceActions({
  jobId,
  orgName,
  receiptToken,
  customerPhone,
}: {
  jobId: string;
  orgName: string;
  receiptToken: string | null;
  customerPhone: string | null;
}) {
  const invoiceUrl = `/api/org/jobs/${jobId}/invoice`;
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const receiptUrl = receiptToken ? `${appUrl}/receipt/${receiptToken}` : null;

  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (showQr && receiptUrl && !qrDataUrl) {
      QRCode.toDataURL(receiptUrl, {
        width: 240,
        margin: 2,
        color: { dark: "#111827", light: "#ffffff" },
      }).then(setQrDataUrl);
    }
  }, [showQr, receiptUrl, qrDataUrl]);

  const digits = customerPhone?.replace(/\D/g, "") ?? null;
  const smsHref =
    digits && receiptUrl
      ? `sms:${digits}?body=${encodeURIComponent(`Your receipt: ${receiptUrl}`)}`
      : null;

  async function handleCopyReceipt() {
    if (!receiptUrl) return;
    try {
      await navigator.clipboard.writeText(receiptUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = receiptUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

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
        await navigator.share({
          title: `Invoice — ${orgName}`,
          url: invoiceUrl,
        });
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

  function handlePrint() {
    const win = window.open(invoiceUrl, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print());
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase">Receipt</p>

      {/* QR / SMS / Copy — only when receiptToken exists */}
      {receiptUrl && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-h-[44px]"
              onClick={() => setShowQr((v) => !v)}
            >
              <QrCode className="h-4 w-4 mr-1" />
              {showQr ? "Hide QR" : "Show QR"}
            </Button>
            {smsHref && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 min-h-[44px]"
                asChild
              >
                <a href={smsHref}>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Text
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-h-[44px]"
              onClick={handleCopyReceipt}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>

          {showQr && qrDataUrl && (
            <div className="flex justify-center py-2">
              <img
                src={qrDataUrl}
                alt="Receipt QR code"
                className="rounded-lg"
                width={240}
                height={240}
              />
            </div>
          )}
        </div>
      )}

      {/* Existing Share / Print / View */}
      <p className="text-xs font-medium text-muted-foreground uppercase pt-1">Invoice</p>
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
