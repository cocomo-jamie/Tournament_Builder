// src/components/LoadingSpinner.jsx
// ─────────────────────────────────────────────────────────
// Shared loading and error states for views waiting on
// Supabase data. Matches the dark-theme aesthetic.
// ─────────────────────────────────────────────────────────

import { AlertCircle, RefreshCw, Trophy } from "lucide-react";

export function LoadingSpinner({ message = "Loading tournament..." }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        fontFamily: "'Inter', system-ui, sans-serif",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "linear-gradient(135deg, #D4A843, #D4A843cc)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "spin 2s ease-in-out infinite",
        }}
      >
        <Trophy size={24} color="#fff" />
      </div>
      <p style={{ color: "#ffffff60", fontSize: 14, fontWeight: 500 }}>
        {message}
      </p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
      `}</style>
    </div>
  );
}

export function ErrorDisplay({ error, onRetry }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        fontFamily: "'Inter', system-ui, sans-serif",
        gap: 16,
        padding: 20,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#C1121F20",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertCircle size={28} color="#C1121F" />
      </div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: "#fff",
          fontFamily: "'Playfair Display', Georgia, serif",
        }}
      >
        Something went wrong
      </h2>
      <p
        style={{
          color: "#ffffff60",
          fontSize: 14,
          maxWidth: 400,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        {error?.message || "Unable to load tournament data. Please try again."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            padding: "10px 24px",
            background: "#D4A843",
            color: "#0a0a0a",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={16} /> Try Again
        </button>
      )}
    </div>
  );
}

export function NoEventDisplay() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        fontFamily: "'Inter', system-ui, sans-serif",
        gap: 16,
        padding: 20,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#D4A84320",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Trophy size={28} color="#D4A843" />
      </div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: "#fff",
          fontFamily: "'Playfair Display', Georgia, serif",
        }}
      >
        No Tournament Selected
      </h2>
      <p
        style={{
          color: "#ffffff60",
          fontSize: 14,
          maxWidth: 400,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        This page requires an event ID. Check the URL or visit the tournament
        setup wizard to create one.
      </p>
    </div>
  );
}
