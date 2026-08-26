"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

function OnboardingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [step, setStep] = useState<"validating" | "invalid" | "set-password" | "done">("validating");
  const [invite, setInvite] = useState<{ user: { name: string; email: string }; org: { name: string } } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStep("invalid");
      return;
    }
    fetch(`/api/onboarding/validate-token?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setInvite(data);
          setStep("set-password");
        } else {
          setError(data.error || "Invalid invite");
          setStep("invalid");
        }
      })
      .catch(() => {
        setStep("invalid");
      });
  }, [token]);

  async function handleAccept() {
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to accept invite");
        setSaving(false);
        return;
      }

      setStep("done");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch {
      setError("Network error");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        {step === "validating" && (
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Validating invite...</p>
          </CardContent>
        )}

        {step === "invalid" && (
          <>
            <CardHeader className="text-center">
              <CardTitle>Invalid Invite</CardTitle>
              <CardDescription>
                {error || "This invite link is invalid or has expired."}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <a href="/login" className="text-sm text-primary hover:underline">
                Go to login
              </a>
            </CardContent>
          </>
        )}

        {step === "set-password" && invite && (
          <>
            <CardHeader>
              <CardTitle>Welcome, {invite.user.name}</CardTitle>
              <CardDescription>
                Set your password to get started with <span className="font-medium text-foreground">{invite.org.name}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={invite.user.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button onClick={handleAccept} disabled={saving} className="w-full">
                {saving ? "Creating account..." : "Create Account"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                After setting your password, you'll be redirected to sign in.
              </p>
            </CardContent>
          </>
        )}

        {step === "done" && (
          <CardContent className="pt-6 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
            <CardTitle>Account Created</CardTitle>
            <p className="text-sm text-muted-foreground">Redirecting to sign in...</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
