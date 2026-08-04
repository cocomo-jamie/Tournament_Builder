// src/components/OrgEventNav.jsx
// ─────────────────────────────────────────────────────────
// "Move To" fold-out nav for super_admin/org_admin: lets them jump
// between orgs/events without leaving the admin shell, and launch the
// Wizard pre-scoped to a specific org (or an entirely new one).
//
// Mounted directly in both AdminDashboard.jsx and SuperAdminDashboard.jsx
// headers — the two files don't share a header component, so this stays
// a standalone component included in each rather than duplicated markup.
//
// Every other role is locked to one event and has no use for this —
// callers should still gate rendering, but this also self-gates as a
// safety net.
// ─────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronDown, ChevronRight, Trophy, Plus, FolderTree, Check } from "lucide-react";
import { admin as adminApi, events as eventsApi } from "../services/api";

/**
 * @param {Object} adminUser - from useAuth()
 * @param {string} [currentEventId] - the event currently open (AdminDashboard only)
 * @param {string} [currentOrgId] - the org that owns the currently open event/console
 * @param {string} [accentColor] - highlight color, matched to the host page's palette
 */
export default function OrgEventNav({ adminUser, currentEventId, currentOrgId, accentColor = "#D4A843" }) {
  const navigate = useNavigate();
  const role = adminUser?.role;
  const isSuperAdmin = role === "super_admin";
  const isOrgAdmin = role === "org_admin";

  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState(null); // super_admin only, lazy-loaded on first open
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [expandedOrgId, setExpandedOrgId] = useState(null);
  const [eventsByOrg, setEventsByOrg] = useState({}); // orgId -> events[] | "loading"
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!isSuperAdmin && !isOrgAdmin) return null;

  const loadEvents = (orgId) => {
    setEventsByOrg(prev => ({ ...prev, [orgId]: "loading" }));
    eventsApi.getByOrg(orgId)
      .then(list => setEventsByOrg(prev => ({ ...prev, [orgId]: list })))
      .catch(err => {
        console.error("Failed to load events for org:", err);
        setEventsByOrg(prev => ({ ...prev, [orgId]: [] }));
      });
  };

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    if (isSuperAdmin && orgs === null) {
      setLoadingOrgs(true);
      adminApi.listOrganizations()
        .then(setOrgs)
        .catch(err => { console.error("Failed to load organizations:", err); setOrgs([]); })
        .finally(() => setLoadingOrgs(false));
    }
    if (isOrgAdmin && adminUser?.org_id && !eventsByOrg[adminUser.org_id]) {
      loadEvents(adminUser.org_id);
    }
  };

  const toggleOrgExpand = (orgId) => {
    const next = expandedOrgId === orgId ? null : orgId;
    setExpandedOrgId(next);
    if (next && !eventsByOrg[orgId]) loadEvents(orgId);
  };

  const goToEvent = (eventId) => {
    setOpen(false);
    navigate(`/e/${eventId}/admin`);
  };

  const goToNewEvent = (orgId) => {
    setOpen(false);
    navigate(orgId ? `/wizard?orgId=${orgId}` : "/wizard");
  };

  const goToNewOrg = () => {
    setOpen(false);
    navigate("/wizard");
  };

  const rowBtn = (active) => ({
    width: "100%", display: "flex", alignItems: "center", gap: 8,
    padding: "7px 10px", borderRadius: 8, border: "none", cursor: "pointer",
    background: active ? `${accentColor}20` : "transparent",
    color: active ? accentColor : "#ffffffcc",
    fontSize: 12.5, fontWeight: active ? 700 : 500,
    fontFamily: "'Inter',sans-serif", textAlign: "left",
  });

  const renderEventList = (orgId, indent) => {
    const list = eventsByOrg[orgId];
    if (list === "loading" || list === undefined) {
      return <p style={{ fontSize: 11, color: "#ffffff50", padding: `4px 0 4px ${indent}px` }}>Loading events…</p>;
    }
    return (
      <>
        {list.length === 0 && (
          <p style={{ fontSize: 11, color: "#ffffff40", padding: `4px 0 4px ${indent}px` }}>No events yet.</p>
        )}
        {list.map(ev => (
          <button key={ev.id} onClick={() => goToEvent(ev.id)} style={{ ...rowBtn(ev.id === currentEventId), paddingLeft: indent }}>
            {ev.id === currentEventId ? <Check size={12} /> : <Trophy size={12} style={{ opacity: 0.6 }} />}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.name}</span>
          </button>
        ))}
        <button onClick={() => goToNewEvent(orgId)} style={{ ...rowBtn(false), paddingLeft: indent, color: accentColor }}>
          <Plus size={12} /> New Event
        </button>
      </>
    );
  };

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      <button onClick={toggleOpen} style={{
        display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8,
        border: "1px solid #ffffff15", background: open ? "#ffffff10" : "#ffffff06", cursor: "pointer",
        color: "#ffffffcc", fontSize: 12, fontWeight: 600, fontFamily: "'Inter',sans-serif",
      }}>
        <FolderTree size={13} /> Move To <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, minWidth: 280, maxWidth: 360,
          maxHeight: 420, overflowY: "auto", background: "#141414", border: "1px solid #ffffff15",
          borderRadius: 12, boxShadow: "0 12px 32px #00000060", padding: 8, zIndex: 100,
        }}>
          {isOrgAdmin && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px" }}>Your Events</p>
              {renderEventList(adminUser.org_id, 26)}
            </div>
          )}

          {isSuperAdmin && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px" }}>Organizations</p>
              {loadingOrgs && <p style={{ fontSize: 11, color: "#ffffff50", padding: "4px 10px" }}>Loading organizations…</p>}
              {orgs && orgs.length === 0 && <p style={{ fontSize: 11, color: "#ffffff40", padding: "4px 10px" }}>No organizations yet.</p>}
              {orgs && orgs.map(org => {
                const isExpanded = expandedOrgId === org.id;
                const isCurrentOrg = org.id === currentOrgId;
                return (
                  <div key={org.id}>
                    <button onClick={() => toggleOrgExpand(org.id)} style={rowBtn(isCurrentOrg)}>
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      {isCurrentOrg ? <Check size={12} /> : <Building2 size={12} style={{ opacity: 0.6 }} />}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org.name}</span>
                    </button>
                    {isExpanded && renderEventList(org.id, 34)}
                  </div>
                );
              })}
              <div style={{ borderTop: "1px solid #ffffff10", marginTop: 6, paddingTop: 6 }}>
                <button onClick={goToNewOrg} style={{ ...rowBtn(false), color: accentColor }}>
                  <Plus size={12} /> New Organization
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
