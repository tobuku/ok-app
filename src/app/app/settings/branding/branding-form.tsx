"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export function BrandingForm({
  orgName,
  initialLogoUrl,
  initialReceiptsEmail,
  initialTaxRateBps,
}: {
  orgName: string;
  initialLogoUrl: string | null;
  initialReceiptsEmail: string;
  initialTaxRateBps: number;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [receiptsEmail, setReceiptsEmail] = useState(initialReceiptsEmail);
  const [taxRatePercent, setTaxRatePercent] = useState(
    (initialTaxRateBps / 100).toFixed(2)
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadLogo(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/org/branding", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Upload failed");
      } else {
        const data = await res.json();
        setLogoUrl(data.logoUrl);
        setMessage("Logo uploaded");
        setTimeout(() => setMessage(null), 2000);
      }
    } catch {
      setMessage("Network error");
    } finally {
      setUploading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMessage(null);
    try {
      const bps = Math.round(parseFloat(taxRatePercent) * 100);
      const res = await fetch("/api/org/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptsEmail: receiptsEmail.trim() || null,
          taxRateBps: bps,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Save failed");
      } else {
        setMessage("Saved");
        setTimeout(() => setMessage(null), 2000);
        router.refresh();
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Organization name (read-only for now) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-1">Organization</h2>
        <p className="text-lg font-semibold text-gray-900">{orgName}</p>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Logo</h2>
        <p className="text-xs text-gray-500 mb-3">
          Shown on customer-facing screens (quote acceptance, receipts). PNG, JPEG, WebP, or SVG. Max 2MB.
        </p>
        {logoUrl ? (
          <div className="mb-3">
            <img
              src={logoUrl}
              alt={`${orgName} logo`}
              className="h-16 object-contain rounded border border-gray-200 p-1"
            />
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-3">No logo uploaded</p>
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
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : logoUrl ? "Replace Logo" : "Upload Logo"}
        </button>
      </div>

      {/* Receipts email + tax rate */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Receipts Email
          </label>
          <p className="text-xs text-gray-500 mb-2">
            A copy of every receipt is sent to this address.
          </p>
          <input
            type="email"
            value={receiptsEmail}
            onChange={(e) => setReceiptsEmail(e.target.value)}
            placeholder="receipts@yourcompany.com"
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tax Rate (%)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Applied to quotes. Hawaii GET is 4.712%.
          </p>
          <input
            type="number"
            step="0.001"
            min="0"
            max="50"
            value={taxRatePercent}
            onChange={(e) => setTaxRatePercent(e.target.value)}
            className="w-32 border border-gray-200 rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:bg-gray-300 hover:bg-blue-700"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {message && (
            <span className={`text-sm ${
              message === "Saved" || message === "Logo uploaded"
                ? "text-green-600"
                : "text-red-600"
            }`}>
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
