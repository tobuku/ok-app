"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch {
      setError("Network error");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        {step === "validating" && (
          <p className="text-center text-gray-500">Validating invite...</p>
        )}

        {step === "invalid" && (
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-4">Invalid Invite</h1>
            <p className="text-gray-600 mb-4">
              {error || "This invite link is invalid or has expired."}
            </p>
            <a href="/login" className="text-blue-600 hover:underline text-sm">
              Go to login
            </a>
          </div>
        )}

        {step === "set-password" && invite && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Welcome, {invite.user.name}</h1>
            <p className="text-gray-600 mb-6">
              Set your password to get started with <span className="font-medium">{invite.org.name}</span>.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={invite.user.email}
                  disabled
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleAccept}
                disabled={saving}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Creating account..." : "Create Account"}
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              After setting your password, you'll be redirected to sign in. From there, go to Settings to configure branding, pricing, team, and Stripe.
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center">
            <h1 className="text-xl font-bold text-green-700 mb-2">Account Created</h1>
            <p className="text-gray-600">Redirecting to sign in...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">Loading...</p></div>}>
      <OnboardingContent />
    </Suspense>
  );
}
