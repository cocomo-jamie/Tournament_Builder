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
import { LoadingSpinner, ErrorDisplay } from "./LoadingSpinner";

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

export function AccessDenied({ message }) {
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

/**
 * AdminGate: combined auth + config gate for /e/:eventId/admin.
 *
 * This route needs auth resolved *before* a "config not found" result can
 * be trusted. useEventConfig() fires its fetch as soon as EventProvider
 * mounts, which can race AuthContext's session restore — an admin who is
 * genuinely authenticated can have their very first request go out
 * anonymously, get filtered to zero rows by RLS's public policy (draft
 * events are `status = 'draft'`, hidden from anon reads), and land here
 * with `notFound: true` despite the "Admin full events" policy being
 * additive and perfectly willing to return the row once the request
 * actually carries their session.
 *
 * A plain ConfigGate → ProtectedRoute split can't fix this: ConfigGate
 * commits to rendering the public "not published" branch before
 * ProtectedRoute (further down the tree) ever mounts to redirect to
 * login. So this gate resolves auth first, and if config came back
 * notFound, retries once now that the client has a session attached
 * before deciding whether that's "log in" / "wrong scope" / "doesn't
 * exist" — never the public "not published" message, which is reserved
 * for the anonymous public route.
 */
export default function AdminGate({ children }) {
  const { session, adminUser, resolving } = useResolvedAuth();
  const { config, eventId, loading, error, notFound, refetch } = useEvent();
  const location = useLocation();
  const retriedRef = useRef(false);

  // Reset the one-shot retry guard when navigating to a different event.
  useEffect(() => {
    retriedRef.current = false;
  }, [eventId]);

  // Auth resolved to a real admin, but the (possibly anonymous) initial
  // fetch came back empty — retry once now that the session is attached.
  useEffect(() => {
    if (!resolving && session && adminUser && notFound && !loading && !retriedRef.current) {
      retriedRef.current = true;
      refetch();
    }
  }, [resolving, session, adminUser, notFound, loading, refetch]);

  if (resolving || loading) return <LoadingSpinner />;

  if (!session) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!adminUser) {
    // Authenticated, but no admin_users row at all — not an admin.
    return <Navigate to="/login" replace />;
  }

  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  // Still nothing after the authenticated retry: this is a real access
  // problem (wrong org/event scope, or a bad eventId), not "not public
  // yet" — that message is for anonymous visitors on the public route.
  if (notFound || !config) {
    if (adminUser.org_id === null) {
      // super_admin's policy has no status/scope restriction at all —
      // if they still can't see it, the event genuinely doesn't exist.
      return <AccessDenied message="This event doesn't exist." />;
    }
    if (adminUser.event_id && adminUser.event_id !== eventId) {
      return <Navigate to={`/e/${adminUser.event_id}/admin`} replace />;
    }
    return <AccessDenied message="You don't have access to this event, or it doesn't exist." />;
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
