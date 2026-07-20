// src/App.jsx
// ─────────────────────────────────────────────────────────
// Route Map:
//   /e/:eventId           → Public landing page
//   /e/:eventId/live      → Public game day hub
//   /e/:eventId/captain   → Captain OTP login + scoring
//   /e/:eventId/tv        → Clubhouse projector display
//   /e/:eventId/admin     → Admin dashboard
//   /wizard               → Tournament wizard (no eventId needed)
//   /                     → Redirects to /e/:defaultEventId or wizard
//
// Event ID resolution:
//   1. URL param :eventId (primary — supports multi-tenant)
//   2. VITE_EVENT_ID env var (fallback — single-event dev)
// ─────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { EventProvider, useEvent } from "./context/EventContext";
import { LoadingSpinner, ErrorDisplay, NoEventDisplay } from "./components/LoadingSpinner";

// Views
import LandingPage from "./views/LandingPage";
import AdminDashboard from "./views/AdminDashboard";
import TVDisplay from "./views/TVDisplay";
import LivePage from "./views/LivePage";
import PlayerPortal from "./views/PlayerPortal";
import TournamentWizard from "./tools/TournamentWizard";

// ─────────────────────────────────────────────────────────
// EventShell: resolves eventId and wraps children in provider
// ─────────────────────────────────────────────────────────

function EventShell({ children }) {
  const { eventId: paramId } = useParams();
  const eventId = paramId || import.meta.env.VITE_EVENT_ID;

  if (!eventId) {
    return <NoEventDisplay />;
  }

  return <EventProvider eventId={eventId}>{children}</EventProvider>;
}

// ─────────────────────────────────────────────────────────
// ConfigGate: renders children only when config is loaded
// ─────────────────────────────────────────────────────────

function ConfigGate({ children }) {
  const { config, loading, error, refetch } = useEvent();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
  if (!config) return <LoadingSpinner message="Preparing tournament..." />;

  return children;
}

// ─────────────────────────────────────────────────────────
// Root redirect logic
// ─────────────────────────────────────────────────────────

function RootRedirect() {
  const defaultEventId = import.meta.env.VITE_EVENT_ID;
  if (defaultEventId) {
    return <Navigate to={`/e/${defaultEventId}`} replace />;
  }
  return <Navigate to="/wizard" replace />;
}

// ─────────────────────────────────────────────────────────
// Legacy route redirects (old /live → /e/:id/live etc.)
// ─────────────────────────────────────────────────────────

function LegacyRedirect({ path }) {
  const defaultEventId = import.meta.env.VITE_EVENT_ID;
  if (defaultEventId) {
    return <Navigate to={`/e/${defaultEventId}${path}`} replace />;
  }
  return <NoEventDisplay />;
}

// ─────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Root ── */}
        <Route path="/" element={<RootRedirect />} />

        {/* ── Event-scoped routes ── */}
        <Route
          path="/e/:eventId"
          element={
            <EventShell>
              <ConfigGate>
                <LandingPage />
              </ConfigGate>
            </EventShell>
          }
        />
        <Route
          path="/e/:eventId/live"
          element={
            <EventShell>
              <ConfigGate>
                <LivePage />
              </ConfigGate>
            </EventShell>
          }
        />
        <Route
          path="/e/:eventId/captain"
          element={
            <EventShell>
              <ConfigGate>
                <PlayerPortal />
              </ConfigGate>
            </EventShell>
          }
        />
        <Route
          path="/e/:eventId/tv"
          element={
            <EventShell>
              <ConfigGate>
                <TVDisplay />
              </ConfigGate>
            </EventShell>
          }
        />
        <Route
          path="/e/:eventId/admin"
          element={
            <EventShell>
              <ConfigGate>
                <AdminDashboard />
              </ConfigGate>
            </EventShell>
          }
        />

        {/* ── Wizard (no event context needed) ── */}
        <Route path="/wizard" element={<TournamentWizard />} />

        {/* ── Legacy route support (redirect old URLs) ── */}
        <Route path="/live" element={<LegacyRedirect path="/live" />} />
        <Route path="/captain" element={<LegacyRedirect path="/captain" />} />
        <Route path="/tv" element={<LegacyRedirect path="/tv" />} />
        <Route path="/admin" element={<LegacyRedirect path="/admin" />} />

        {/* ── 404 ── */}
        <Route
          path="*"
          element={
            <div
              style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Inter', sans-serif",
                gap: 16,
                background: "#0a0a0a",
              }}
            >
              <h1 style={{ fontSize: 48, fontWeight: 900, color: "#D4A843" }}>
                404
              </h1>
              <p style={{ color: "#ffffff60" }}>Page not found</p>
              <a
                href="/"
                style={{
                  color: "#D4A843",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                ← Back to home
              </a>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
