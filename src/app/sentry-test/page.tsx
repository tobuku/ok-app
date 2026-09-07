"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryTestPage() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1 style={{ marginBottom: "1rem" }}>Sentry Test</h1>
      <button
        onClick={() => {
          Sentry.captureException(new Error("Sentry test error from JunkMint"));
        }}
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
        Send Test Error to Sentry
      </button>
    </div>
  );
}
