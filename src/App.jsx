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
import { AuthProvider } from "./context/AuthContext";
import { LoadingSpinner, ErrorDisplay, NoEventDisplay } from "./components/LoadingSpinner";
import ProtectedRoute, { useResolvedAuth } from "./components/ProtectedRoute";

// Views
import LandingPage from "./views/LandingPage";
import AdminDashboard from "./views/AdminDashboard";
import TVDisplay from "./views/TVDisplay";
import LivePage from "./views/LivePage";
import PlayerPortal from "./views/PlayerPortal";
import TournamentWizard from "./tools/TournamentWizard";
import Login from "./views/Login";
import AcceptInvite from "./views/AcceptInvite";
import SuperAdminDashboard from "./views/SuperAdminDashboard";

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
// WizardRoute: gates /wizard to super_admin/org_admin only.
// Not event-scoped (no :eventId, no EventProvider in the tree), so this
// stays its own lightweight guard rather than reusing ProtectedRoute
// directly — ProtectedRoute depends on useEvent(), which isn't available
// here. It does share ProtectedRoute's `useResolvedAuth()` for the
// session/adminUser resolution fix, so the two guards behave consistently.
// ─────────────────────────────────────────────────────────

function WizardRoute({ children }) {
  const { session, adminUser, resolving } = useResolvedAuth();

  if (resolving) return <LoadingSpinner />;
  if (!session) return <Navigate to="/login?redirect=/wizard" replace />;
  if (!adminUser) return <Navigate to="/login" replace />;

  if (adminUser.role === "super_admin" || adminUser.role === "org_admin") {
    return children;
  }

  if (adminUser.event_id) {
    return <Navigate to={`/e/${adminUser.event_id}/admin`} replace />;
  }

  return <Navigate to="/login" replace />;
}

// ─────────────────────────────────────────────────────────
// SuperAdminRoute: gates /super-admin to super_admin only
// (adminUser.org_id === null). Non-super-admins are redirected —
// never shown "Access Denied" — since nobody else should ever
// legitimately land here. Mirrors WizardRoute: not event-scoped,
// so it shares useResolvedAuth() rather than ProtectedRoute (which
// depends on useEvent()).
// ─────────────────────────────────────────────────────────

function SuperAdminRoute({ children }) {
  const { session, adminUser, resolving } = useResolvedAuth();

  if (resolving) return <LoadingSpinner />;
  if (!session) return <Navigate to="/login?redirect=/super-admin" replace />;
  if (!adminUser) return <Navigate to="/login" replace />;

  // super_admin is the only role with org_id === null.
  if (adminUser.org_id === null) return children;

  // Everyone else: send them where they belong, no "Access Denied".
  if (adminUser.event_id) return <Navigate to={`/e/${adminUser.event_id}/admin`} replace />;
  return <Navigate to="/login" replace />;
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
    <AuthProvider>
      <BrowserRouter>
        <Routes>
        {/* ── Auth routes (new) ── */}
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />

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
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              </ConfigGate>
            </EventShell>
          }
        />

        {/* ── Super admin console (super_admin only, no event context) ── */}
        <Route
          path="/super-admin"
          element={
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          }
        />

        {/* ── Wizard (no event context needed) ── */}
        <Route
          path="/wizard"
          element={
            <WizardRoute>
              <TournamentWizard />
            </WizardRoute>
          }
        />

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
    </AuthProvider>
  );
}
