"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

type CustomerData = { name: string; phone: string; email: string };
type AddressData = { line1: string; line2: string; city: string; state: string; zip: string };

export default function EstimateWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [customer, setCustomer] = useState<CustomerData>({
    name: "", phone: "", email: "",
  });
  const [address, setAddress] = useState<AddressData>({
    line1: "", line2: "", city: "", state: "HI", zip: "",
  });

  function updateCustomer(field: keyof CustomerData, value: string) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  function updateAddress(field: keyof AddressData, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/org/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, address }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create estimate");
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      router.push(`/m/jobs/${data.jobId}`);
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/m">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Link>
      </Button>

      <h1 className="text-xl font-bold mb-1">New Field Estimate</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Step {step} of 2
      </p>

      <Card>
        <CardContent className="pt-5 space-y-4">
          {step === 1 && (
            <>
              <div>
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={customer.name}
                  onChange={(e) => updateCustomer("name", e.target.value)}
                  placeholder="John Smith"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => updateCustomer("phone", e.target.value)}
                  placeholder="808-555-1234"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customer.email}
                  onChange={(e) => updateCustomer("email", e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>
              <Button
                className="w-full"
                disabled={!customer.name.trim()}
                onClick={() => setStep(2)}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label htmlFor="line1">Address Line 1 *</Label>
                <Input
                  id="line1"
                  value={address.line1}
                  onChange={(e) => updateAddress("line1", e.target.value)}
                  placeholder="123 Main St"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="line2">Address Line 2</Label>
                <Input
                  id="line2"
                  value={address.line2}
                  onChange={(e) => updateAddress("line2", e.target.value)}
                  placeholder="Apt, Suite, Unit"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={address.city}
                    onChange={(e) => updateAddress("city", e.target.value)}
                    placeholder="Honolulu"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={address.state}
                    onChange={(e) => updateAddress("state", e.target.value)}
                    placeholder="HI"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label htmlFor="zip">Zip *</Label>
                  <Input
                    id="zip"
                    value={address.zip}
                    onChange={(e) => updateAddress("zip", e.target.value)}
                    placeholder="96813"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={
                    submitting ||
                    !address.line1.trim() ||
                    !address.city.trim() ||
                    !address.state.trim() ||
                    !address.zip.trim()
                  }
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Estimate"
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
