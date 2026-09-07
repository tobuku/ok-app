"use client";

import { useState } from "react";

export default function SentryTestPage() {
  const [status, setStatus] = useState("Ready");

  async function sendTestError() {
    setStatus("Sending...");
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(new Error("Sentry test error from JunkMint"));
      await Sentry.flush(5000);
      setStatus("Sent! Check Sentry Issues page.");
    } catch (e) {
      setStatus(`Failed: ${e}`);
    }
  }

  function throwError() {
    throw new Error("JunkMint unhandled test error");
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center", color: "white" }}>
      <h1 style={{ marginBottom: "1rem" }}>Sentry Test</h1>
      <p style={{ marginBottom: "1rem" }}>Status: {status}</p>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        <button
          onClick={sendTestError}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            background: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
          }}
        >
          Send Captured Error
        </button>
        <button
          onClick={throwError}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            background: "#9333ea",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
          }}
        >
          Throw Unhandled Error
        </button>
      </div>
    </div>
  );
}
