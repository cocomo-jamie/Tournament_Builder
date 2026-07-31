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
  CheckCircle2, Copy, Users, Heart, CreditCard,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { admin as adminApi, commitments as commitmentsApi, billing as billingApi, events as eventsApi } from "../services/api";

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

function EvidenceFileLink({ file }) {
  const [loading, setLoading] = useState(false);
  const openFile = async () => {
    setLoading(true);
    try {
      const url = await commitmentsApi.getEvidenceSignedUrl(file.url);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Failed to get evidence file URL:", err);
    } finally {
      setLoading(false);
    }
  };
  return (
    <button onClick={openFile} disabled={loading} style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
      {loading ? "Opening…" : file.filename}
    </button>
  );
}

function EvidenceReviewCard({ commitment, onReviewed }) {
  const { adminUser } = useAuth();
  const [reviewing, setReviewing] = useState(false);

  const review = async (status) => {
    setReviewing(true);
    try {
      await commitmentsApi.reviewEvidence(commitment.id, status, adminUser?.id);
      onReviewed();
    } catch (err) {
      console.error("Failed to review evidence:", err);
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div style={{ padding: "12px 14px", background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff08" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{commitment.event?.name || "—"}</p>
          <p style={{ fontSize: 12, color: "#ffffff50" }}>
            {commitment.event?.organizations?.name || "—"} → {commitment.beneficiary?.name || "—"}
          </p>
        </div>
        <span style={{ fontSize: 11, color: "#ffffff40" }}>{commitment.evidence_submitted_at ? new Date(commitment.evidence_submitted_at).toLocaleDateString("en-CA") : ""}</span>
      </div>
      {commitment.evidence_description && <p style={{ fontSize: 12, color: "#ffffff70", marginTop: 8 }}>{commitment.evidence_description}</p>}
      {(commitment.evidence_files || []).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
          {commitment.evidence_files.map((f, i) => <EvidenceFileLink key={i} file={f} />)}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={() => review("confirmed")} disabled={reviewing} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Confirm</button>
        <button onClick={() => review("disputed")} disabled={reviewing} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Dispute</button>
      </div>
    </div>
  );
}

const SUB_STATUSES = ["trialing", "active", "past_due", "canceled"];
const EVENT_BILLING_STATUSES = ["pending", "invoiced", "paid"];
const STATUS_COLOR = { active: "#22c55e", paid: "#22c55e", trialing: "#f59e0b", pending: "#f59e0b", invoiced: "#f59e0b", past_due: "#ef4444", canceled: "#ffffff50" };

function OrgSubscriptionForm({ orgs, plans, onSaved, onCancel }) {
  const [orgId, setOrgId] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id || "");
  const [status, setStatus] = useState("trialing");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!orgId || !planId) {
      setError("Org and plan are both required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await billingApi.createSubscription(orgId, planId, status);
      onSaved();
    } catch (err) {
      console.error("Failed to create subscription:", err);
      setError(err.message || "Failed to create subscription.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 12, padding: 14, background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff10" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <select style={{ ...S.input, appearance: "none" }} value={orgId} onChange={e => setOrgId(e.target.value)}>
          <option value="">Select org…</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select style={{ ...S.input, appearance: "none" }} value={planId} onChange={e => setPlanId(e.target.value)}>
          {plans.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price})</option>)}
        </select>
        <select style={{ ...S.input, appearance: "none" }} value={status} onChange={e => setStatus(e.target.value)}>
          {SUB_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>
      {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={handleSave} disabled={saving} style={S.btn(saving)}>{saving ? "Saving..." : "Create Subscription"}</button>
        <button onClick={onCancel} style={{ ...S.btn(false), background: "#ffffff10" }}>Cancel</button>
      </div>
    </div>
  );
}

function BillingPanel() {
  const [orgs, setOrgs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingSub, setCreatingSub] = useState(false);

  const [orgEvents, setOrgEvents] = useState({}); // orgId -> events[]
  const [ebOrgId, setEbOrgId] = useState("");
  const [ebEventId, setEbEventId] = useState("");
  const [ebType, setEbType] = useState("per_event");
  const [ebAmount, setEbAmount] = useState("");
  const [eventBilling, setEventBilling] = useState([]);
  const [creatingEb, setCreatingEb] = useState(false);
  const [ebError, setEbError] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [o, p, s, eb] = await Promise.all([
        adminApi.listOrganizations(),
        billingApi.listPlans(),
        billingApi.listSubscriptions(),
        billingApi.listEventBilling(),
      ]);
      setOrgs(o);
      setPlans(p);
      setSubs(s);
      setEventBilling(eb);
    } catch (err) {
      console.error("Failed to load billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleSubStatusChange = async (id, status) => {
    try {
      await billingApi.updateSubscriptionStatus(id, status);
      await refresh();
    } catch (err) {
      console.error("Failed to update subscription status:", err);
    }
  };

  const handleEbOrgChange = async (orgId) => {
    setEbOrgId(orgId);
    setEbEventId("");
    if (orgId && !orgEvents[orgId]) {
      try {
        const evs = await eventsApi.getByOrg(orgId);
        setOrgEvents(prev => ({ ...prev, [orgId]: evs }));
      } catch (err) {
        console.error("Failed to load org events:", err);
      }
    }
  };

  const handleCreateEventBilling = async () => {
    if (!ebEventId || !ebOrgId) {
      setEbError("Org and event are both required.");
      return;
    }
    setEbError(null);
    try {
      await billingApi.createEventBilling(ebEventId, ebOrgId, ebType, ebAmount ? parseFloat(ebAmount) : null);
      setCreatingEb(false);
      setEbOrgId(""); setEbEventId(""); setEbAmount("");
      await refresh();
    } catch (err) {
      console.error("Failed to create event billing:", err);
      setEbError(err.message || "Failed to create event billing row.");
    }
  };

  const handleEbStatusChange = async (id, status) => {
    try {
      await billingApi.updateEventBillingStatus(id, status);
      await refresh();
    } catch (err) {
      console.error("Failed to update event billing status:", err);
    }
  };

  return (
    <>
      {/* Org subscriptions */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={S.h2}><CreditCard size={18} color="#D4A843" /> Org Subscriptions {!loading && <span style={{ fontSize: 12, color: "#ffffff40", fontWeight: 600 }}>({subs.length})</span>}</h2>
          {!creatingSub && plans.length > 0 && <button onClick={() => setCreatingSub(true)} style={{ ...S.btn(false), padding: "7px 14px", fontSize: 12 }}>+ New Subscription</button>}
        </div>
        <p style={S.sub}>Manually-set status — no real Stripe billing for Cocomo's own subscription revenue exists yet.</p>

        {loading && <p style={{ fontSize: 13, color: "#ffffff50" }}>Loading…</p>}
        {!loading && subs.length === 0 && <p style={{ fontSize: 13, color: "#ffffff40" }}>No subscriptions yet.</p>}
        <div style={{ display: "grid", gap: 8 }}>
          {subs.map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff08" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{s.organizations?.name || "—"}</p>
                <p style={{ fontSize: 12, color: "#ffffff50" }}>{s.billing_plans?.name || "—"} · ${s.billing_plans?.price}</p>
              </div>
              <select value={s.status} onChange={e => handleSubStatusChange(s.id, e.target.value)} style={{ ...S.input, width: "auto", padding: "6px 10px", fontSize: 12, color: STATUS_COLOR[s.status] || "#fff" }}>
                {SUB_STATUSES.map(st => <option key={st} value={st}>{st.replace("_", " ")}</option>)}
              </select>
            </div>
          ))}
        </div>

        {creatingSub && <OrgSubscriptionForm orgs={orgs} plans={plans} onCancel={() => setCreatingSub(false)} onSaved={() => { setCreatingSub(false); refresh(); }} />}
      </div>

      {/* Event billing */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={S.h2}><CreditCard size={18} color="#D4A843" /> Event Billing {!loading && <span style={{ fontSize: 12, color: "#ffffff40", fontWeight: 600 }}>({eventBilling.length})</span>}</h2>
          {!creatingEb && <button onClick={() => setCreatingEb(true)} style={{ ...S.btn(false), padding: "7px 14px", fontSize: 12 }}>+ New Event Billing</button>}
        </div>
        <p style={S.sub}>Per-event charges or subscription-covered events — status is set manually here.</p>

        {loading && <p style={{ fontSize: 13, color: "#ffffff50" }}>Loading…</p>}
        {!loading && eventBilling.length === 0 && <p style={{ fontSize: 13, color: "#ffffff40" }}>No event billing rows yet.</p>}
        <div style={{ display: "grid", gap: 8 }}>
          {eventBilling.map(eb => (
            <div key={eb.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff08" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{eb.events?.name || "—"}</p>
                <p style={{ fontSize: 12, color: "#ffffff50" }}>{eb.organizations?.name || "—"} · {eb.billing_type.replace("_", " ")}{eb.amount ? ` · $${eb.amount}` : ""}</p>
              </div>
              <select value={eb.status} onChange={e => handleEbStatusChange(eb.id, e.target.value)} style={{ ...S.input, width: "auto", padding: "6px 10px", fontSize: 12, color: STATUS_COLOR[eb.status] || "#fff" }}>
                {EVENT_BILLING_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
          ))}
        </div>

        {creatingEb && (
          <div style={{ marginTop: 12, padding: 14, background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff10" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <select style={{ ...S.input, appearance: "none" }} value={ebOrgId} onChange={e => handleEbOrgChange(e.target.value)}>
                <option value="">Select org…</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <select style={{ ...S.input, appearance: "none" }} value={ebEventId} onChange={e => setEbEventId(e.target.value)} disabled={!ebOrgId}>
                <option value="">Select event…</option>
                {(orgEvents[ebOrgId] || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select style={{ ...S.input, appearance: "none" }} value={ebType} onChange={e => setEbType(e.target.value)}>
                <option value="per_event">Per event</option>
                <option value="covered_by_subscription">Covered by subscription</option>
              </select>
              <input style={S.input} type="number" value={ebAmount} onChange={e => setEbAmount(e.target.value)} placeholder="Amount (optional)" />
            </div>
            {ebError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{ebError}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={handleCreateEventBilling} style={S.btn(false)}>Create</button>
              <button onClick={() => setCreatingEb(false)} style={{ ...S.btn(false), background: "#ffffff10" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function SuperAdminDashboard() {
  const { adminUser, signOut } = useAuth();
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [listError, setListError] = useState(null);

  const [pendingReview, setPendingReview] = useState([]);
  const [loadingReview, setLoadingReview] = useState(true);

  const refreshReview = async () => {
    setLoadingReview(true);
    try {
      setPendingReview(await commitmentsApi.listSubmittedForReview());
    } catch (err) {
      console.error("Failed to load evidence review queue:", err);
    } finally {
      setLoadingReview(false);
    }
  };

  useEffect(() => { refreshReview(); }, []);

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

        {/* Billing (Phase 7 — manual status, no real Stripe integration) */}
        <BillingPanel />

        {/* Beneficiary fulfillment evidence review */}
        <div style={S.card}>
          <h2 style={S.h2}><Heart size={18} color="#D4A843" /> Beneficiary Evidence Review {!loadingReview && <span style={{ fontSize: 12, color: "#ffffff40", fontWeight: 600 }}>({pendingReview.length})</span>}</h2>
          <p style={S.sub}>Fulfillment evidence submitted by orgs, awaiting confirm/dispute. Private — not shown anywhere public.</p>
          {loadingReview && <p style={{ fontSize: 13, color: "#ffffff50" }}>Loading…</p>}
          {!loadingReview && pendingReview.length === 0 && <p style={{ fontSize: 13, color: "#ffffff40" }}>Nothing awaiting review.</p>}
          <div style={{ display: "grid", gap: 8 }}>
            {pendingReview.map(c => (
              <EvidenceReviewCard key={c.id} commitment={c} onReviewed={refreshReview} />
            ))}
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
