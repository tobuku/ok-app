"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/lib/toast";

export function BrandingForm({
  orgName,
  initialLogoUrl,
  initialReceiptsEmail,
  initialSenderEmail,
  initialTaxRateBps,
}: {
  orgName: string;
  initialLogoUrl: string | null;
  initialReceiptsEmail: string;
  initialSenderEmail: string;
  initialTaxRateBps: number;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [receiptsEmail, setReceiptsEmail] = useState(initialReceiptsEmail);
  const [senderEmail, setSenderEmail] = useState(initialSenderEmail);
  const [taxRatePercent, setTaxRatePercent] = useState(
    (initialTaxRateBps / 100).toFixed(2)
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/org/branding", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || "Upload failed");
      } else {
        const data = await res.json();
        setLogoUrl(data.logoUrl);
        showSuccess("Logo uploaded");
      }
    } catch {
      showError("Network error");
    } finally {
      setUploading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const bps = Math.round(parseFloat(taxRatePercent) * 100);
      const res = await fetch("/api/org/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptsEmail: receiptsEmail.trim() || null,
          senderEmail: senderEmail.trim() || null,
          taxRateBps: bps,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || "Save failed");
      } else {
        showSuccess("Saved");
        router.refresh();
      }
    } catch {
      showError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Organization name (read-only for now) */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-1">Organization</h2>
          <p className="text-lg font-semibold text-foreground">{orgName}</p>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Shown on customer-facing screens (quote acceptance, receipts). PNG, JPEG, WebP, or SVG. Max 2MB.
          </p>
          {logoUrl ? (
            <div className="mb-3">
              <img
                src={logoUrl}
                alt={`${orgName} logo`}
                className="h-16 object-contain rounded border border-border p-1"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-3">No logo uploaded</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadLogo(file);
            }}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : logoUrl ? "Replace Logo" : "Upload Logo"}
          </Button>
        </CardContent>
      </Card>

      {/* Receipts email + tax rate */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label htmlFor="receipts-email">Receipts Email</Label>
            <p className="text-xs text-muted-foreground mb-2">
              A copy of every receipt is sent to this address.
            </p>
            <Input
              id="receipts-email"
              type="email"
              value={receiptsEmail}
              onChange={(e) => setReceiptsEmail(e.target.value)}
              placeholder="receipts@yourcompany.com"
            />
          </div>

          <div>
            <Label htmlFor="sender-email">Email Display Name</Label>
            <p className="text-xs text-muted-foreground mb-2">
              The name shown in the &quot;From&quot; field on receipts. Leave blank to
              use your organization name. Customer replies go to your Receipts Email above.
            </p>
            <Input
              id="sender-email"
              type="text"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder={orgName}
            />
          </div>

          <div>
            <Label htmlFor="tax-rate">Tax Rate (%)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Applied to quotes. Hawaii GET is 4.712%.
            </p>
            <Input
              id="tax-rate"
              type="number"
              step="0.001"
              min="0"
              max="50"
              value={taxRatePercent}
              onChange={(e) => setTaxRatePercent(e.target.value)}
              className="w-32"
            />
          </div>

          <div className="pt-2">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
