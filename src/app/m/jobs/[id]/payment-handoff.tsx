"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, CreditCard, Share2, Copy, Check, CheckCircle2, Loader2, XCircle, AlertTriangle } from "lucide-react";

export function PaymentHandoff({
  checkoutUrl,
  customerPhone,
  jobId,
  onPaid,
  onCancel,
}: {
  checkoutUrl: string;
  customerPhone: string | null;
  jobId?: string;
  onPaid?: (receiptToken: string | null) => void;
  onCancel?: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const [failed, setFailed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [elapsedMin, setElapsedMin] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  useEffect(() => {
    import("qrcode").then((mod) =>
      mod.default.toDataURL(checkoutUrl, {
        width: 280,
        margin: 2,
        color: { dark: "#111827", light: "#ffffff" },
      }).then(setQrDataUrl)
    );
  }, [checkoutUrl]);

  // Elapsed time tracker
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedMin(Math.floor((Date.now() - startTimeRef.current) / 60000));
    }, 10000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Poll for payment completion every 5s
  useEffect(() => {
    if (!jobId) return;

    pollingRef.current = setInterval(async () => {
      // Stop polling after 30 minutes
      if (Date.now() - startTimeRef.current > 30 * 60 * 1000) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setTimedOut(true);
        return;
      }

      try {
        const res = await fetch(`/api/org/jobs/${jobId}/pay/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.paid) {
          setPaid(true);
          if (pollingRef.current) clearInterval(pollingRef.current);
          onPaidRef.current?.(data.receiptToken);
        } else if (data.failed) {
          setFailed(true);
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [jobId]);

  function stopPolling() {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Payment Link",
          text: "Complete your payment here:",
          url: checkoutUrl,
        });
      } catch {
        // User cancelled share sheet — ignore
      }
    } else {
      handleCopy();
    }
  }

  function handleManualCard() {
    window.open(checkoutUrl, "_blank");
  }

  function handleConfirmedPayment() {
    stopPolling();
    setPaid(true);
    onPaidRef.current?.(null);
  }

  function handleTryAgain() {
    setFailed(false);
    setTimedOut(false);
    stopPolling();
    onCancel?.();
  }

  // --- Payment received ---
  if (paid) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
        <CardContent className="p-4 text-center space-y-2">
          <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
          <p className="text-green-800 dark:text-green-400 font-semibold text-lg">Payment Received</p>
          <p className="text-green-600 dark:text-green-500 text-sm">Customer paid by card</p>
        </CardContent>
      </Card>
    );
  }

  // --- Payment failed or expired ---
  if (failed) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <CardContent className="p-4 text-center space-y-3">
          <XCircle className="h-10 w-10 text-red-600 mx-auto" />
          <p className="text-red-800 dark:text-red-400 font-semibold text-lg">Payment Failed or Expired</p>
          <p className="text-red-600 dark:text-red-500 text-sm">The card was declined or the session expired</p>
          <Button onClick={handleTryAgain} className="w-full h-12">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- Timed out (30 min) ---
  if (timedOut) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
        <CardContent className="p-4 text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-amber-600 mx-auto" />
          <p className="text-amber-800 dark:text-amber-400 font-semibold text-lg">Payment Timed Out</p>
          <p className="text-amber-600 dark:text-amber-500 text-sm">No payment received after 30 minutes</p>
          <Button onClick={handleTryAgain} className="w-full h-12">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-4">
        {/* Waiting status with elapsed time */}
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className="text-primary font-medium">
            Waiting for customer payment...
            {elapsedMin > 0 && (
              <span className="text-muted-foreground font-normal ml-1">
                ({elapsedMin} min)
              </span>
            )}
          </p>
        </div>

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

        {/* Enter Card on This Device */}
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-semibold"
          onClick={handleManualCard}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Enter Card on This Device
        </Button>

        {/* Share Payment Link */}
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-semibold"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Payment Link
        </Button>

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

        {/* Customer showed proof of payment */}
        <Button
          variant="ghost"
          className="w-full h-10 text-xs text-muted-foreground"
          onClick={handleConfirmedPayment}
        >
          Customer showed proof of payment
        </Button>

        {/* Cancel */}
        {onCancel && (
          <Button
            variant="link"
            className="w-full text-sm text-muted-foreground"
            onClick={() => { stopPolling(); onCancel(); }}
          >
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
