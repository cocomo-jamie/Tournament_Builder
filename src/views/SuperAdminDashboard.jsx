// src/views/SuperAdminDashboard.jsx
// ─────────────────────────────────────────────────────────
// Super-admin-only control panel. Two things this page can do
// that nothing else in the app can:
//   1. Create a bare organization (no bundled event — unlike the
//      Wizard, which creates org + event together).
//   2. Invite an org_admin into an existing organization.
// Plus read-only lists of existing orgs and platform-scope admins
// (super_admin + org_admin) so the page is useful at a glance.
//
// Gated to super_admin (adminUser.org_id === null) by SuperAdminRoute
// in App.jsx — non-super-admins are redirected, never shown this shell.
// ─────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, UserPlus, Shield, LogOut, AlertCircle,
  CheckCircle2, Copy, Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { admin as adminApi } from "../services/api";

const S = {
  input: { width: "100%", padding: "10px 14px", background: "#ffffff08", border: "1px solid #ffffff20", borderRadius: 10, color: "#fff", fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none" },
  label: { fontSize: 12, fontWeight: 600, color: "#ffffff80", marginBottom: 6, display: "block" },
  card: { background: "#ffffff06", border: "1px solid #ffffff12", borderRadius: 16, padding: 24 },
  btn: (disabled) => ({ padding: "11px 18px", borderRadius: 10, border: "none", background: disabled ? "#D4A84380" : "#D4A843", color: "#0a0a0a", fontWeight: 700, fontSize: 14, cursor: disabled ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 8 }),
  h2: { fontSize: 16, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 10, marginBottom: 4 },
  sub: { fontSize: 13, color: "#ffffff50", marginBottom: 20 },
};

function Notice({ kind, children }) {
  const c = kind === "error" ? "#C1121F" : "#22c55e";
  const Icon = kind === "error" ? AlertCircle : CheckCircle2;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "start", padding: 10, borderRadius: 8, background: `${c}15`, border: `1px solid ${c}40`, marginTop: 12 }}>
      <Icon size={16} color={c} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontSize: 13, color: kind === "error" ? "#ff8a8a" : "#86efac", lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { adminUser, signOut } = useAuth();
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [listError, setListError] = useState(null);

  // Create org form
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgResult, setOrgResult] = useState(null); // {kind, msg}

  // Invite org_admin form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOrgId, setInviteOrgId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null); // {kind, msg, link?}

  const refreshLists = async () => {
    setLoadingLists(true);
    setListError(null);
    try {
      const [o, a] = await Promise.all([
        adminApi.listOrganizations(),
        adminApi.listPlatformAdmins(),
      ]);
      setOrgs(o);
      setAdmins(a);
    } catch (err) {
      console.error("Failed to load super-admin lists:", err);
      setListError("Failed to load organizations / admins.");
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => { refreshLists(); }, []);

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    setOrgResult(null);
    if (!orgName.trim() || !orgEmail.trim()) {
      setOrgResult({ kind: "error", msg: "Org name and contact email are both required." });
      return;
    }
    setCreatingOrg(true);
    try {
      const org = await adminApi.createOrganization(orgName.trim(), orgEmail.trim());
      setOrgResult({ kind: "success", msg: `Organization "${org.name}" created.` });
      setOrgName("");
      setOrgEmail("");
      await refreshLists();
    } catch (err) {
      console.error("Create org failed:", err);
      setOrgResult({ kind: "error", msg: err.message || "Failed to create organization." });
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteResult(null);
    if (!inviteEmail.trim() || !inviteOrgId) {
      setInviteResult({ kind: "error", msg: "Email and organization are both required." });
      return;
    }
    setInviting(true);
    try {
      const invite = await adminApi.createInvite(inviteEmail.trim(), "org_admin", {
        orgId: inviteOrgId,
        eventId: null,
        invitedBy: adminUser?.id,
      });
      const link = `${window.location.origin}/accept-invite?token=${invite.token}`;
      setInviteResult({ kind: "success", msg: "Invite created. Send this link to the new org admin:", link });
      setInviteEmail("");
    } catch (err) {
      console.error("Invite failed:", err);
      setInviteResult({ kind: "error", msg: err.message || "Failed to create invite." });
    } finally {
      setInviting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const copyLink = (link) => {
    navigator.clipboard?.writeText(link).catch(() => {});
  };

  const orgName_ = (id) => orgs.find(o => o.id === id)?.name || "—";

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`* { box-sizing: border-box; } input:focus, select:focus { border-color: #D4A84360 !important; }`}</style>

      {/* Header */}
      <header style={{ borderBottom: "1px solid #ffffff10", background: "#0a0a0aee", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#D4A84330", display: "flex", alignItems: "center", justifyContent: "center" }}><Shield size={16} color="#D4A843" /></div>
            <div><p style={{ fontSize: 14, fontWeight: 800 }}>Platform Admin</p><p style={{ fontSize: 10, color: "#ffffff40" }}>Super Admin Console</p></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{adminUser?.display_name || adminUser?.email}</p>
              <p style={{ fontSize: 10, color: "#D4A843", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Super Admin</p>
            </div>
            <button onClick={handleSignOut} style={{ background: "#ffffff10", border: "none", cursor: "pointer", color: "#ffffffaa", padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><LogOut size={14} /> Sign Out</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24, display: "grid", gap: 20 }}>
        {listError && <Notice kind="error">{listError}</Notice>}

        {/* Two action cards side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {/* Create org */}
          <div style={S.card}>
            <h2 style={S.h2}><Building2 size={18} color="#D4A843" /> Create Organization</h2>
            <p style={S.sub}>Creates a bare org with no event. Use the Wizard to create an org bundled with an event.</p>
            <form onSubmit={handleCreateOrg} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={S.label}>Organization Name</label>
                <input style={S.input} value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="East Toronto Rotary Club" />
              </div>
              <div>
                <label style={S.label}>Contact Email</label>
                <input style={S.input} type="email" value={orgEmail} onChange={e => setOrgEmail(e.target.value)} placeholder="contact@org.com" />
              </div>
              <button type="submit" disabled={creatingOrg} style={S.btn(creatingOrg)}><Building2 size={16} /> {creatingOrg ? "Creating..." : "Create Organization"}</button>
            </form>
            {orgResult && <Notice kind={orgResult.kind}>{orgResult.msg}</Notice>}
          </div>

          {/* Invite org_admin */}
          <div style={S.card}>
            <h2 style={S.h2}><UserPlus size={18} color="#D4A843" /> Invite Org Admin</h2>
            <p style={S.sub}>Creates an org-scoped admin invite. They set a password via the accept link.</p>
            <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={S.label}>Email</label>
                <input style={S.input} type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="admin@org.com" />
              </div>
              <div>
                <label style={S.label}>Organization</label>
                <select style={{ ...S.input, appearance: "none" }} value={inviteOrgId} onChange={e => setInviteOrgId(e.target.value)}>
                  <option value="">Select an organization…</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={inviting || orgs.length === 0} style={S.btn(inviting)}><UserPlus size={16} /> {inviting ? "Creating Invite..." : "Create Invite"}</button>
            </form>
            {inviteResult && (
              <Notice kind={inviteResult.kind}>
                <div>{inviteResult.msg}</div>
                {inviteResult.link && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                    <code style={{ fontSize: 11, color: "#fff", background: "#00000040", padding: "6px 8px", borderRadius: 6, wordBreak: "break-all", flex: 1 }}>{inviteResult.link}</code>
                    <button onClick={() => copyLink(inviteResult.link)} style={{ background: "#ffffff15", border: "none", cursor: "pointer", color: "#fff", padding: 6, borderRadius: 6, flexShrink: 0 }} title="Copy link"><Copy size={14} /></button>
                  </div>
                )}
              </Notice>
            )}
          </div>
        </div>

        {/* Existing orgs */}
        <div style={S.card}>
          <h2 style={S.h2}><Building2 size={18} color="#D4A843" /> Organizations {!loadingLists && <span style={{ fontSize: 12, color: "#ffffff40", fontWeight: 600 }}>({orgs.length})</span>}</h2>
          <div style={{ marginTop: 12 }}>
            {loadingLists && <p style={{ fontSize: 13, color: "#ffffff50" }}>Loading…</p>}
            {!loadingLists && orgs.length === 0 && <p style={{ fontSize: 13, color: "#ffffff40" }}>No organizations yet.</p>}
            <div style={{ display: "grid", gap: 8 }}>
              {orgs.map(o => (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff08" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{o.name}</p>
                    <p style={{ fontSize: 12, color: "#ffffff50" }}>{o.email}</p>
                  </div>
                  <span style={{ fontSize: 11, color: "#ffffff40" }}>{o.created_at ? new Date(o.created_at).toLocaleDateString("en-CA") : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Existing admins */}
        <div style={S.card}>
          <h2 style={S.h2}><Users size={18} color="#D4A843" /> Platform Admins {!loadingLists && <span style={{ fontSize: 12, color: "#ffffff40", fontWeight: 600 }}>({admins.length})</span>}</h2>
          <p style={{ ...S.sub, marginBottom: 12 }}>Super admins and org admins (event-scoped roles are managed per-event in the Team tab).</p>
          <div>
            {loadingLists && <p style={{ fontSize: 13, color: "#ffffff50" }}>Loading…</p>}
            {!loadingLists && admins.length === 0 && <p style={{ fontSize: 13, color: "#ffffff40" }}>No platform admins yet.</p>}
            <div style={{ display: "grid", gap: 8 }}>
              {admins.map(a => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff08" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{a.display_name || a.email}</p>
                    <p style={{ fontSize: 12, color: "#ffffff50" }}>{a.email}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#D4A843", textTransform: "uppercase", letterSpacing: 0.5 }}>{(a.role || "").replace("_", " ")}</span>
                    <p style={{ fontSize: 11, color: "#ffffff40" }}>{a.org_id === null ? "Platform-wide" : (a.organizations?.name || orgName_(a.org_id))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
