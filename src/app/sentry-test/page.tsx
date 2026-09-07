"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";

export default function SentryTestPage() {
  const [status, setStatus] = useState("Ready");
  const client = Sentry.getClient();
  const dsn = client?.getDsn();

  async function sendTestError() {
    setStatus("Sending...");
    try {
      // If no client is initialized, init directly
      if (!Sentry.getClient()?.getDsn()) {
        Sentry.init({
          dsn: "https://74c2fa24d28931910d0bb527ef946c19@o4512043175313408.ingest.us.sentry.io/4512043189796864",
          tracesSampleRate: 1.0,
        });
      }
      Sentry.captureException(new Error("Sentry test error from JunkMint"));
      await Sentry.flush(5000);
      setStatus("Sent! Check Sentry Issues page in 30 seconds.");
    } catch (e) {
      setStatus(`Failed: ${e}`);
    }
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center", color: "white" }}>
      <h1 style={{ marginBottom: "1rem" }}>Sentry Test</h1>
      <p style={{ marginBottom: "0.5rem" }}>
        SDK initialized: <strong>{dsn ? "YES" : "NO"}</strong>
      </p>
      {dsn && (
        <p style={{ marginBottom: "0.5rem", fontSize: "0.75rem", opacity: 0.6 }}>
          DSN: ...{String(dsn).slice(-30)}
        </p>
      )}
      <p style={{ marginBottom: "1rem" }}>Status: {status}</p>
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
        Send Test Error
      </button>
    </div>
  );
}
