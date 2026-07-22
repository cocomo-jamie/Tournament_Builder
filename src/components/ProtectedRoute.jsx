// src/components/ProtectedRoute.jsx
// ─────────────────────────────────────────────────────────
// Route guard for event-scoped admin routes (e.g. /e/:eventId/admin).
// This is the component PROJECT_STATUS.md had long (incorrectly)
// documented as already existing — it didn't; /e/:eventId/admin had
// zero route-level auth gating until this pass (Pass 3c). RLS still
// blocked unauthenticated data access underneath it, but the page shell
// itself loaded for anyone.
//
// Checks scope against the current event's org_id, read from
// useEvent()'s already-loaded config (`config._raw.org_id`) rather than
// issuing a redundant fetch — AdminDashboard needs that same event row
// anyway. Must be rendered inside both an <EventProvider> (EventShell)
// and a loaded config (ConfigGate).
// ─────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEvent } from "../context/EventContext";
import { LoadingSpinner } from "./LoadingSpinner";

/**
 * Resolves { session, adminUser, resolving }.
 *
 * AuthContext's `loading` flag only covers the *initial* session
 * bootstrap (see AuthContext.jsx's useEffect) — it does not cover the
 * `refreshAdminUser()` call triggered by `onAuthStateChange` after a
 * fresh sign-in, so `adminUser` can briefly lag behind `session` right
 * after login. Pass 3b's `WizardRoute` papered over this by treating
 * "session but no adminUser yet" as loading forever, which would also
 * hide a genuinely authenticated non-admin behind an infinite spinner.
 * Fixed properly here: actively re-run `refreshAdminUser()` once per
 * session and track that specific attempt, so "still resolving" and
 * "resolved to no admin row" are distinguishable.
 */
export function useResolvedAuth() {
  const { session, adminUser, loading, refreshAdminUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const attemptedFor = useRef(null);

  useEffect(() => {
    if (!session) {
      attemptedFor.current = null;
      return;
    }
    if (adminUser) return; // already resolved
    if (loading) return; // initial bootstrap is already fetching this
    if (attemptedFor.current === session.user.id) return; // already tried for this session

    attemptedFor.current = session.user.id;
    setChecking(true);
    refreshAdminUser().finally(() => setChecking(false));
  }, [session, adminUser, loading, refreshAdminUser]);

  return { session, adminUser, resolving: loading || checking };
}

function AccessDenied({ message }) {
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
        gap: 12,
        padding: 20,
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', Georgia, serif" }}>
        Access Denied
      </h2>
      <p style={{ color: "#ffffff60", fontSize: 14, maxWidth: 400, lineHeight: 1.6 }}>{message}</p>
    </div>
  );
}

export default function ProtectedRoute({ children }) {
  const { session, adminUser, resolving } = useResolvedAuth();
  const { config, eventId } = useEvent();
  const location = useLocation();

  if (resolving) return <LoadingSpinner />;

  if (!session) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!adminUser) {
    // Authenticated, but no admin_users row at all — not an admin.
    return <Navigate to="/login" replace />;
  }

  // super_admin: org_id is NULL, sees every event.
  if (adminUser.org_id === null) {
    return children;
  }

  const eventOrgId = config?._raw?.org_id;

  // org_admin: org_id set, event_id NULL — scoped to their whole org.
  if (adminUser.event_id === null) {
    if (adminUser.org_id === eventOrgId) return children;
    return <AccessDenied message="You don't have access to this organization's events." />;
  }

  // Event-scoped role (admin, treasurer, referee, volunteer_coord, control_desk).
  if (adminUser.event_id === eventId) return children;

  // Wrong event for this scoped admin — send them to their own event's admin.
  return <Navigate to={`/e/${adminUser.event_id}/admin`} replace />;
}
