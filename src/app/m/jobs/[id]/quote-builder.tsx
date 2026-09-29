"use client";

import { useState, useEffect } from "react";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { showError } from "@/lib/toast";
import { Share2, Printer, FileText, Plus, X, ChevronDown, ChevronRight } from "lucide-react";

type PriceItem = {
  id: string;
  kind: string;
  label: string;
  fraction: number | null;
  amountCents: number;
  sortOrder: number;
  usageCount?: number;
};

type QuoteLine = {
  priceItemId: string;
  label: string;
  qty: number;
  unitCents: number;
  unitLabel?: string;
  description?: string;
  category?: string;
};

type GovDetails = {
  projectName: string;
  projectLocation: string;
  agencyDept: string;
  solicitationNo: string;
  rfqNumber: string;
  contractNumber: string;
  pocName: string;
  pocPhone: string;
  paymentTerms: string;
  validDays: string;
};

const CATEGORIES = [
  "Labor", "Equipment", "Transportation", "Disposal",
  "Dump/Tipping Fees", "Recycling", "Packing Materials",
  "Cleaning Supplies", "Furniture Removal", "Electronics Removal",
  "Document/Paper Removal", "Hazardous/Special Handling",
  "Supervision", "Administrative", "Mobilization", "Demobilization",
];

const UNIT_OPTIONS = [
  "each", "hours", "labor hours", "days",
  "loads", "truckloads", "cubic yards",
  "tons", "lbs", "boxes", "pallets",
  "trips", "lots", "flat",
];

export function QuoteBuilder({
  jobId,
  jobStatus,
  taxRateBps,
}: {
  jobId: string;
  jobStatus: string;
  taxRateBps: number;
}) {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [truckLoads, setTruckLoads] = useState(1);
  const [discountCents, setDiscountCents] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [notes, setNotes] = useState("");
  const [govDetails, setGovDetails] = useState<GovDetails>({
    projectName: "", projectLocation: "", agencyDept: "",
    solicitationNo: "", rfqNumber: "", contractNumber: "",
    pocName: "", pocPhone: "", paymentTerms: "", validDays: "",
  });
  const [govExpanded, setGovExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ quoteId: string } | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailing, setEmailing] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Can only build quotes in ESTIMATE, ON_SITE, QUOTED, or DECLINED status
  const canQuote = ["ESTIMATE", "NEW", "SCHEDULED", "ON_SITE", "QUOTED", "DECLINED"].includes(jobStatus);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load price book
        const pbRes = await fetch("/api/org/pricebook");
        const pbData = await pbRes.json();
        const priceItems: PriceItem[] = pbData.items || [];
        setItems(priceItems);

        // If job is QUOTED, load existing quote for editing
        if (jobStatus === "QUOTED") {
          const qRes = await fetch(`/api/org/jobs/${jobId}/quote`);
          const qData = await qRes.json();
          const q = qData.quote;
          if (q && (q.status === "DRAFT" || q.status === "PRESENTED")) {
            setEditingQuoteId(q.id);
            setTruckLoads(q.truckLoads ?? 1);
            setDiscountCents(q.discountCents ?? 0);
            setDiscountReason(q.discountReason ?? "");
            setNotes(q.notes ?? "");
            // Restore gov details
            const gd: GovDetails = {
              projectName: q.projectName ?? "",
              projectLocation: q.projectLocation ?? "",
              agencyDept: q.agencyDept ?? "",
              solicitationNo: q.solicitationNo ?? "",
              rfqNumber: q.rfqNumber ?? "",
              contractNumber: q.contractNumber ?? "",
              pocName: q.pocName ?? "",
              pocPhone: q.pocPhone ?? "",
              paymentTerms: q.paymentTerms ?? "",
              validDays: q.validDays != null ? String(q.validDays) : "",
            };
            setGovDetails(gd);
            if (Object.values(gd).some((v) => v !== "")) setGovExpanded(true);
            // Restore lines from quote lines
            const restored: QuoteLine[] = (q.lines || []).map(
              (ql: { priceItemId: string | null; label: string; qty: number; unitCents: number; unitLabel?: string | null; description?: string | null; category?: string | null }) => ({
                priceItemId: ql.priceItemId ?? "",
                label: ql.label,
                qty: ql.qty,
                unitCents: ql.unitCents,
                unitLabel: ql.unitLabel ?? undefined,
                description: ql.description ?? undefined,
                category: ql.category ?? undefined,
              })
            );
            setLines(restored);
            // Show result card immediately so "Present to Customer" is accessible
            setResult({ quoteId: q.id });
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [jobId, jobStatus]);

  if (!canQuote) return null;

  const loadFractions = items.filter((i) => i.kind === "LOAD_FRACTION");
  const addons = items
    .filter((i) => i.kind === "ADDON" || i.kind === "FEE")
    .sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0) || a.sortOrder - b.sortOrder);

  const perLoadCents = lines.reduce((s, l) => s + l.qty * l.unitCents, 0);
  const subtotalCents = perLoadCents * truckLoads;
  const taxableAmount = subtotalCents - discountCents;
  const taxCents = Math.round((taxableAmount * taxRateBps) / 10000);
  const totalCents = taxableAmount + taxCents;

  // Custom lines are those without a priceItemId
  const customLines = lines.filter((l) => !l.priceItemId);

  function selectLoadFraction(item: PriceItem) {
    // Replace any existing load fraction
    setLines((prev) => [
      ...prev.filter((l) => {
        const pi = items.find((i) => i.id === l.priceItemId);
        return pi?.kind !== "LOAD_FRACTION";
      }),
      { priceItemId: item.id, label: item.label, qty: 1, unitCents: item.amountCents },
    ]);
  }

  function toggleAddon(item: PriceItem) {
    setLines((prev) => {
      const exists = prev.find((l) => l.priceItemId === item.id);
      if (exists) return prev.filter((l) => l.priceItemId !== item.id);
      return [
        ...prev,
        { priceItemId: item.id, label: item.label, qty: 1, unitCents: item.amountCents },
      ];
    });
  }

  function updateAddonQty(priceItemId: string, qty: number) {
    setLines((prev) =>
      prev.map((l) => (l.priceItemId === priceItemId ? { ...l, qty: Math.max(1, qty) } : l))
    );
  }

  function addCustomLine() {
    setLines((prev) => [
      ...prev,
      { priceItemId: "", label: "", qty: 1, unitCents: 0 },
    ]);
  }

  function updateCustomLine(index: number, updates: Partial<QuoteLine>) {
    // index is relative to custom lines, find the actual index in lines[]
    let customIdx = 0;
    setLines((prev) =>
      prev.map((l) => {
        if (!l.priceItemId) {
          if (customIdx === index) {
            customIdx++;
            return { ...l, ...updates };
          }
          customIdx++;
        }
        return l;
      })
    );
  }

  function removeCustomLine(index: number) {
    let customIdx = 0;
    setLines((prev) =>
      prev.filter((l) => {
        if (!l.priceItemId) {
          if (customIdx === index) {
            customIdx++;
            return false;
          }
          customIdx++;
        }
        return true;
      })
    );
  }

  async function submitQuote() {
    if (lines.length === 0) return;
    setSubmitting(true);

    const method = editingQuoteId ? "PATCH" : "POST";

    try {
      const res = await fetch(`/api/org/jobs/${jobId}/quote`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines, truckLoads, discountCents, discountReason, notes,
          ...govDetails,
          validDays: govDetails.validDays ? parseInt(govDetails.validDays, 10) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || `Failed to ${editingQuoteId ? "update" : "create"} quote`);
      } else {
        setResult({ quoteId: data.quote.id });
        setIsEditing(false);
      }
    } catch {
      showError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendEmail() {
    if (!emailTo || !result) return;
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
      }
    } catch {
      showError("Network error");
    } finally {
      setEmailing(false);
    }
  }

  if (result && !isEditing) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40">
        <CardContent className="p-4 space-y-3">
          <p className="text-green-800 dark:text-green-400 font-medium">
            {editingQuoteId ? "Quote updated" : "Quote created"}
          </p>
          <p className="text-green-600 dark:text-green-500 text-sm">Total: {formatCents(totalCents)}</p>
          <Button asChild className="w-full h-12">
            <a href={`/m/jobs/${jobId}/present?quoteId=${result.quoteId}`}>
              Present to Customer
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingQuoteId(result.quoteId);
              setIsEditing(true);
            }}
            className="w-full"
          >
            Edit Quote
          </Button>
          <div className="border-t border-green-200 dark:border-green-800 pt-3">
            <p className="text-foreground text-xs font-medium uppercase mb-2">Print or share estimate</p>
            <EstimateActions jobId={jobId} orgName="" />
          </div>
          <div className="border-t border-green-200 dark:border-green-800 pt-3">
            <p className="text-foreground text-xs font-medium uppercase mb-2">Or email estimate to customer</p>
            {emailSent ? (
              <p className="text-green-700 dark:text-green-400 text-sm">Estimate sent to {emailTo}</p>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="customer@email.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="flex-1 text-sm bg-background text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={sendEmail}
                  disabled={!emailTo || emailing}
                >
                  {emailing ? "Sending..." : "Send"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </CardContent>
      </Card>
    );
  }

  // Selected load fraction
  const selectedLF = lines.find((l) => {
    const pi = items.find((i) => i.id === l.priceItemId);
    return pi?.kind === "LOAD_FRACTION";
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {editingQuoteId ? "Edit Quote" : "Build Quote"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Load Fraction Selection */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Truck Load</p>
          <div className="grid grid-cols-3 gap-2">
            {loadFractions.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant={selectedLF?.priceItemId === item.id ? "default" : "outline"}
                onClick={() => selectLoadFraction(item)}
                className="h-auto py-2 px-1 flex flex-col text-xs"
              >
                <span className="font-medium">{item.label.replace(" Truck Load", "").replace(" Load", "")}</span>
                <span className="text-[10px] mt-0.5 opacity-75">
                  {formatCents(item.amountCents)}
                </span>
              </Button>
            ))}
          </div>
          {/* Editable price for selected load fraction */}
          {selectedLF && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Price:</span>
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                step="1"
                value={selectedLF.unitCents / 100 || ""}
                onChange={(e) => {
                  const cents = Math.round(Number(e.target.value) * 100);
                  setLines((prev) =>
                    prev.map((l) =>
                      l.priceItemId === selectedLF.priceItemId
                        ? { ...l, unitCents: cents }
                        : l
                    )
                  );
                }}
                className="w-28 text-sm h-9"
              />
            </div>
          )}
        </div>

        {/* Truck Loads Multiplier */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Number of Truck Loads</p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setTruckLoads((v) => Math.max(1, v - 1))}
              className="w-10 h-10 text-lg"
            >
              -
            </Button>
            <Input
              type="number"
              min="1"
              value={truckLoads}
              onChange={(e) => setTruckLoads(Math.max(1, Math.round(Number(e.target.value) || 1)))}
              className="w-20 text-center text-lg font-bold h-10"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setTruckLoads((v) => v + 1)}
              className="w-10 h-10 text-lg"
            >
              +
            </Button>
            {truckLoads > 1 && perLoadCents > 0 && (
              <span className="text-sm text-muted-foreground">
                {formatCents(perLoadCents)}/load
              </span>
            )}
          </div>
        </div>

        {/* Add-ons */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Add-ons</p>
          <div className="space-y-2">
            {addons.map((item) => {
              const line = lines.find((l) => l.priceItemId === item.id);
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={line ? "secondary" : "outline"}
                    onClick={() => toggleAddon(item)}
                    className="flex-1 justify-start text-left text-sm h-10"
                  >
                    {item.label} — {formatCents(item.amountCents)}
                  </Button>
                  {line && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateAddonQty(item.id, line.qty - 1)}
                        className="w-7 h-7 text-sm"
                      >
                        -
                      </Button>
                      <span className="w-6 text-center text-sm text-foreground">{line.qty}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateAddonQty(item.id, line.qty + 1)}
                        className="w-7 h-7 text-sm"
                      >
                        +
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Government / Contract Details (collapsible) */}
        <div className="border border-border rounded-lg">
          <button
            type="button"
            onClick={() => setGovExpanded(!govExpanded)}
            className="w-full flex items-center justify-between p-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <span>Government / Contract Details</span>
            {govExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {govExpanded && (
            <div className="px-3 pb-3 space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <Input
                  type="text" placeholder="Project Name" value={govDetails.projectName}
                  onChange={(e) => setGovDetails((g) => ({ ...g, projectName: e.target.value }))}
                  className="text-sm"
                />
                <Input
                  type="text" placeholder="Project Location" value={govDetails.projectLocation}
                  onChange={(e) => setGovDetails((g) => ({ ...g, projectLocation: e.target.value }))}
                  className="text-sm"
                />
                <Input
                  type="text" placeholder="Agency / Department" value={govDetails.agencyDept}
                  onChange={(e) => setGovDetails((g) => ({ ...g, agencyDept: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="text" placeholder="Solicitation #" value={govDetails.solicitationNo}
                  onChange={(e) => setGovDetails((g) => ({ ...g, solicitationNo: e.target.value }))}
                  className="text-sm"
                />
                <Input
                  type="text" placeholder="RFQ #" value={govDetails.rfqNumber}
                  onChange={(e) => setGovDetails((g) => ({ ...g, rfqNumber: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <Input
                type="text" placeholder="Contract #" value={govDetails.contractNumber}
                onChange={(e) => setGovDetails((g) => ({ ...g, contractNumber: e.target.value }))}
                className="text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="text" placeholder="POC Name" value={govDetails.pocName}
                  onChange={(e) => setGovDetails((g) => ({ ...g, pocName: e.target.value }))}
                  className="text-sm"
                />
                <Input
                  type="tel" placeholder="POC Phone" value={govDetails.pocPhone}
                  onChange={(e) => setGovDetails((g) => ({ ...g, pocPhone: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="text" placeholder="Payment Terms (e.g. Net 30)" value={govDetails.paymentTerms}
                  onChange={(e) => setGovDetails((g) => ({ ...g, paymentTerms: e.target.value }))}
                  className="text-sm"
                />
                <div className="flex items-center gap-1">
                  <Input
                    type="number" min="1" placeholder="30" value={govDetails.validDays}
                    onChange={(e) => setGovDetails((g) => ({ ...g, validDays: e.target.value }))}
                    className="text-sm w-20"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">days valid</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Custom Line Items */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Custom Line Items</p>
          <div className="space-y-3">
            {customLines.map((line, idx) => (
              <div
                key={idx}
                className="border border-dashed border-border rounded-lg p-3 space-y-2 bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono w-8 shrink-0">{String(idx + 1).padStart(3, "0")}</span>
                  <Input
                    type="text"
                    placeholder="Item name (e.g., Labor — Demo Crew)"
                    value={line.label}
                    onChange={(e) => updateCustomLine(idx, { label: e.target.value })}
                    className="flex-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomLine(idx)}
                    className="w-8 h-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={line.category ?? ""}
                    onChange={(e) => updateCustomLine(idx, { category: e.target.value || undefined })}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                  >
                    <option value="">Category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <Input
                  type="text"
                  placeholder="Description (optional)"
                  value={line.description ?? ""}
                  onChange={(e) => updateCustomLine(idx, { description: e.target.value })}
                  className="text-sm"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={line.qty}
                    onChange={(e) => updateCustomLine(idx, { qty: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
                    className="w-16 text-sm text-center"
                    placeholder="Qty"
                  />
                  <select
                    value={line.unitLabel && !UNIT_OPTIONS.includes(line.unitLabel) ? "custom" : (line.unitLabel ?? "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom") {
                        updateCustomLine(idx, { unitLabel: "" });
                      } else {
                        updateCustomLine(idx, { unitLabel: val || undefined });
                      }
                    }}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                  >
                    <option value="">Unit</option>
                    {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                    <option value="custom">custom...</option>
                  </select>
                  {line.unitLabel !== undefined && !UNIT_OPTIONS.includes(line.unitLabel ?? "") && (
                    <Input
                      type="text"
                      placeholder="Unit name"
                      value={line.unitLabel ?? ""}
                      onChange={(e) => updateCustomLine(idx, { unitLabel: e.target.value })}
                      className="w-20 text-sm"
                    />
                  )}
                  <span className="text-sm text-muted-foreground">x $</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={line.unitCents / 100 || ""}
                    onChange={(e) => updateCustomLine(idx, { unitCents: Math.round(Number(e.target.value) * 100) })}
                    className="w-24 text-sm"
                    placeholder="0.00"
                  />
                </div>
                {line.qty > 0 && line.unitCents > 0 && (
                  <p className="text-xs text-muted-foreground text-right">
                    Subtotal: {formatCents(line.qty * line.unitCents)}
                  </p>
                )}
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustomLine}
            className="mt-2 w-full"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Custom Line Item
          </Button>
        </div>

        {/* Discount */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Discount</p>
          <div className="flex gap-2">
            <div className="w-28">
              <Input
                type="number"
                min="0"
                step="1"
                value={discountCents / 100 || ""}
                onChange={(e) => setDiscountCents(Math.round(Number(e.target.value) * 100))}
                placeholder="$0.00"
                className="text-sm"
              />
            </div>
            <Input
              type="text"
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              placeholder="Reason (optional)"
              className="flex-1 text-sm"
            />
          </div>
        </div>

        {/* Notes / Scope of Work */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Scope of Work / Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the scope, special conditions, payment terms..."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Totals */}
        {lines.length > 0 && (
          <div className="border-t border-border pt-3 space-y-1 text-sm">
            {truckLoads > 1 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Per load</span>
                <span className="text-foreground">{formatCents(perLoadCents)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Subtotal{truckLoads > 1 ? ` (${truckLoads} loads)` : ""}
              </span>
              <span className="text-foreground">{formatCents(subtotalCents)}</span>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span>-{formatCents(discountCents)}</span>
              </div>
            )}
            {taxCents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({(taxRateBps / 100).toFixed(2)}%)</span>
                <span className="text-foreground">{formatCents(taxCents)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-foreground pt-1 border-t border-border">
              <span>Total</span>
              <span>{formatCents(totalCents)}</span>
            </div>
          </div>
        )}

        <Button
          type="button"
          onClick={submitQuote}
          disabled={lines.length === 0 || submitting}
          className="w-full h-12 font-medium"
        >
          {submitting
            ? (editingQuoteId ? "Updating..." : "Creating...")
            : (editingQuoteId ? "Update Quote" : "Create Quote")}
        </Button>
      </CardContent>
    </Card>
  );
}

function EstimateActions({ jobId }: { jobId: string; orgName: string }) {
  const estimateUrl = `/api/org/jobs/${jobId}/estimate`;

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
        await navigator.share({
          title: "Estimate",
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: "Estimate",
          url: estimateUrl,
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
    const win = window.open(estimateUrl, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print());
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex-1 min-h-[44px] bg-background"
        onClick={handleShare}
      >
        <Share2 className="h-4 w-4 mr-1" />
        Share
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex-1 min-h-[44px] bg-background"
        onClick={handlePrint}
      >
        <Printer className="h-4 w-4 mr-1" />
        Print
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex-1 min-h-[44px] bg-background"
        asChild
      >
        <a href={estimateUrl} target="_blank" rel="noopener noreferrer">
          <FileText className="h-4 w-4 mr-1" />
          View
        </a>
      </Button>
    </div>
  );
}
