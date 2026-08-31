"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.kind === "platform_user") {
          window.location.href = "/platform";
          return;
        }
        if (data.role === "LEADMAN") {
          window.location.href = "/m";
          return;
        }
      }
      window.location.href = "/app";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  const features = [
    "Dispatch, quote, and collect payment in the field",
    "Real-time job tracking with photo documentation",
    "Invoices, receipts, and daily summaries on autopilot",
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Hero — left side on desktop, top on mobile */}
      <div className="relative md:w-1/2 flex flex-col justify-center px-8 py-12 md:px-16 md:py-0 bg-[#1a4a16] overflow-hidden">
        {/* Background truck photo with green overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/hero-truck.jpg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f2d0c]/90 to-[#3e9c35]/80" />

        <div className="relative z-10 max-w-md mx-auto md:mx-0">
          <div className="flex items-center gap-3 mb-8">
            <Image
              src="/icon.png"
              alt="JunkMint"
              width={48}
              height={48}
              className="rounded-lg"
            />
            <span className="text-2xl font-bold text-white tracking-tight">
              JunkMint
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-6">
            Run your junk removal business from anywhere
          </h1>

          <div className="border-t border-white/20 pt-6 space-y-4">
            {features.map((feat) => (
              <div key={feat} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#a0d89a] shrink-0 mt-0.5" />
                <p className="text-white/90 text-sm leading-relaxed">{feat}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Login form — right side on desktop, bottom on mobile */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 md:p-12">
        <Card className="w-full max-w-sm border-0 shadow-none md:border md:shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Sign In</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your credentials to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
