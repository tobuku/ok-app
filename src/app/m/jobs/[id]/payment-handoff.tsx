"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, MessageSquare, Copy, ExternalLink, Check } from "lucide-react";
import QRCode from "qrcode";

export function PaymentHandoff({
  checkoutUrl,
  customerPhone,
}: {
  checkoutUrl: string;
  customerPhone: string | null;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(checkoutUrl, {
      width: 280,
      margin: 2,
      color: { dark: "#111827", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [checkoutUrl]);

  const digits = customerPhone?.replace(/\D/g, "") ?? null;
  const smsHref = digits
    ? `sms:${digits}?body=${encodeURIComponent(`Pay here: ${checkoutUrl}`)}`
    : null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = checkoutUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-4">
        <p className="text-primary font-medium text-center">
          Customer scans to pay
        </p>

        {/* QR Code */}
        <div className="flex justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Payment QR code"
              className="rounded-lg"
              width={280}
              height={280}
            />
          ) : (
            <div className="w-[280px] h-[280px] bg-muted rounded-lg flex items-center justify-center">
              <QrCode className="h-8 w-8 text-muted-foreground animate-pulse" />
            </div>
          )}
        </div>

        {/* Text link to customer */}
        {smsHref && (
          <Button asChild className="w-full h-12 text-sm font-semibold">
            <a href={smsHref}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Text Link to Customer
            </a>
          </Button>
        )}

        {/* Copy link */}
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-semibold"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </>
          )}
        </Button>

        {/* De-emphasized direct open */}
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
        >
          <ExternalLink className="h-3 w-3" />
          Open on this device
          <span className="text-[10px]">(uses your wallet, not customer&apos;s)</span>
        </a>
      </CardContent>
    </Card>
  );
}
