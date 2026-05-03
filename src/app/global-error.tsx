"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "1rem",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", maxWidth: "24rem" }}>
            A critical error occurred. Please refresh the page or try again later.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: "0.6875rem", color: "#9ca3af" }}>
              ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "0.375rem 0.875rem",
              fontSize: "0.875rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
              background: "white",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
