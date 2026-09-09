"use client";

import { useEffect } from "react";

/**
 * Last-resort fallback — replaces the root layout when it (or a provider) throws,
 * so it must render its own <html>/<body>. Inline styles only: the app CSS may
 * not have loaded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#f5f5f4",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ padding: "1.5rem", maxWidth: "22rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Something broke</h1>
          <p style={{ marginTop: "0.75rem", color: "#a1a1aa", fontSize: "0.875rem", lineHeight: 1.6 }}>
            The portal failed to load. Reload the page — if it persists, contact Voltair Studio.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.6rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid #27272a",
              background: "transparent",
              color: "#f5f5f4",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
