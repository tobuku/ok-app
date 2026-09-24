"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Printer, FileText, QrCode, MessageSquare, Copy, Check, Mail, Send, CheckCircle2 } from "lucide-react";
import { showError } from "@/lib/toast";
import QRCode from "qrcode";

export function InvoiceActions({
  jobId,
  orgName,
  receiptToken,
  customerPhone,
  customerEmail,
}: {
  jobId: string;
  orgName: string;
  receiptToken: string | null;
  customerPhone: string | null;
  customerEmail?: string | null;
}) {
  const invoiceUrl = `/api/org/jobs/${jobId}/invoice`;
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const receiptUrl = receiptToken ? `${appUrl}/receipt/${receiptToken}` : null;

  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [receiptConfirmed, setReceiptConfirmed] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState(customerEmail ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

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

  async function handleSendReceipt() {
    if (!email.trim()) {
      showError("Enter an email address");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/org/jobs/${jobId}/receipt/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || "Failed to send receipt");
      } else {
        setSent(true);
        setShowEmailForm(false);
      }
    } catch {
      showError("Network error");
    } finally {
      setSending(false);
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
    <div className="space-y-3">
      {/* Receipt confirmation prompt */}
      {!receiptConfirmed && !sent && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
          <p className="text-amber-800 dark:text-amber-400 font-medium text-sm">
            Does the customer have a copy of their receipt?
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white font-semibold"
              onClick={() => setReceiptConfirmed(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Yes
            </Button>
            <Button
              size="sm"
              className="flex-1 h-11 font-semibold"
              onClick={() => setShowEmailForm(true)}
            >
              <Mail className="h-4 w-4 mr-1" />
              Send Receipt
            </Button>
          </div>
          {showEmailForm && (
            <div className="space-y-2 pt-1">
              <Input
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
              <Button
                onClick={handleSendReceipt}
                disabled={sending}
                className="w-full h-11 font-semibold"
              >
                <Send className="h-4 w-4 mr-1" />
                {sending ? "Sending..." : "Send Receipt Email"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Sent confirmation */}
      {sent && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-green-800 dark:text-green-400 text-sm font-medium">
            Receipt sent to {email}
          </p>
        </div>
      )}

      {/* Receipt sharing tools */}
      <p className="text-xs font-medium text-muted-foreground uppercase">Receipt</p>

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

      {/* Email receipt button (always available even after confirmation) */}
      {(receiptConfirmed || sent) && !showEmailForm && (
        <Button
          variant="outline"
          size="sm"
          className="w-full min-h-[44px]"
          onClick={() => { setShowEmailForm(true); setReceiptConfirmed(false); setSent(false); }}
        >
          <Mail className="h-4 w-4 mr-1" />
          {sent ? "Send to Another Email" : "Email Receipt"}
        </Button>
      )}

      {/* Inline email form when triggered from the button above */}
      {(receiptConfirmed || sent) && showEmailForm && (
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="customer@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
          <Button
            onClick={handleSendReceipt}
            disabled={sending}
            className="w-full h-11 font-semibold"
          >
            <Send className="h-4 w-4 mr-1" />
            {sending ? "Sending..." : "Send Receipt Email"}
          </Button>
        </div>
      )}

      {/* Invoice tools */}
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
