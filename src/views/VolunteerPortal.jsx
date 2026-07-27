// src/views/VolunteerPortal.jsx
// ─────────────────────────────────────────────────────────────────────
// FEATURE_SPEC_entitlements_and_identity.md Phase 5: volunteer-facing
// magic-link login + self-service view of their own application.
//
// Unlike the captain QR flow (synthetic identity, link never emailed),
// this uses Supabase's native signInWithOtp() with the volunteer's real
// email — an actual email gets sent. auth_user_id linking is automatic
// via migration 013's email-match trigger; no manual RPC needed here
// (contrast with CheckIn.jsx's explicit linkAuthOnCheckin() call).
//
// No self-verification of the actual email flow, per the work order.
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { HandHelping, Mail, Send, CheckCircle, Clock, XCircle, LogOut, AlertCircle } from "lucide-react";
import { useEvent } from "../context/EventContext";
import { supabase } from "../supabaseClient";
import { volunteers as volunteersApi } from "../services/api";

const STATUS_STYLE = {
  pending: { label: "Pending Review", color: "#f59e0b", icon: Clock },
  approved: { label: "Approved", color: "#22c55e", icon: CheckCircle },
  declined: { label: "Declined", color: "#ef4444", icon: XCircle },
  withdrawn: { label: "Withdrawn", color: "#6b7280", icon: XCircle },
};

function LoginScreen({ eventId }) {
  const { config } = useEvent();
  const B = config.brand;
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const valid = /\S+@\S+\.\S+/.test(email);

  const handleSubmit = async () => {
    if (!valid) return;
    setSending(true);
    setError(null);
    try {
      await volunteersApi.requestLogin(email, eventId);
      setSent(true);
    } catch (err) {
      console.error("Volunteer login request failed:", err);
      setError("Couldn't send the login email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fade-in" style={{ padding: "60px 24px", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: `${B.accent}15`, border: `1px solid ${B.accent}25`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
        {sent ? <Mail size={32} color={B.accent} /> : <HandHelping size={32} color={B.accent} />}
      </div>

      {!sent ? (
        <>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Volunteer Portal</h1>
          <p style={{ fontSize: 14, color: "#ffffff60", marginBottom: 32, lineHeight: 1.5 }}>
            Enter the email you applied with. We'll send you a login link.
          </p>
          <div style={{ maxWidth: 320, margin: "0 auto" }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              style={{ width: "100%", padding: "14px", background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 12, color: "#fff", fontSize: 15, marginBottom: 16, fontFamily: "'Inter',sans-serif" }} />
            <button onClick={handleSubmit} disabled={!valid || sending}
              style={{ width: "100%", padding: "14px 20px", borderRadius: 12, border: "none", background: valid ? B.accent : "#ffffff15", color: valid ? B.dark : "#ffffff30", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'Inter',sans-serif" }}>
              <Send size={16} /> {sending ? "Sending..." : "Send Login Link"}
            </button>
            {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 12 }}>{error}</p>}
          </div>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Check your email</h1>
          <p style={{ fontSize: 14, color: "#ffffff60", maxWidth: 320, margin: "0 auto" }}>
            We sent a login link to <strong style={{ color: "#fff" }}>{email}</strong>. Click it to access your volunteer status.
          </p>
        </>
      )}
    </div>
  );
}

function VolunteerDashboard({ application, onLogout, onRefresh }) {
  const { config } = useEvent();
  const B = config.brand;
  const [phone, setPhone] = useState(application.phone || "");
  const [experience, setExperience] = useState(application.experience || "");
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const status = STATUS_STYLE[application.status] || STATUS_STYLE.pending;
  const StatusIcon = status.icon;
  const roleName = application.assigned_role?.title || application.primary_role?.title || "—";

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      // No UI input for certifications here — pass the existing value
      // through so the RPC (which always sets all three fields) doesn't
      // null it out.
      await volunteersApi.updateSelf(application.id, { phone, experience, certifications: application.certifications });
      setSaved(true);
      onRefresh();
    } catch (err) {
      console.error("Volunteer self-update failed:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    setError(null);
    try {
      await volunteersApi.withdraw(application.id);
      onRefresh();
    } catch (err) {
      console.error("Withdraw failed:", err);
      setError("Failed to withdraw. Please try again.");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{application.first_name} {application.last_name}</p>
          <p style={{ fontSize: 12, color: "#ffffff50" }}>{application.email}</p>
        </div>
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: "#ffffff08", border: "1px solid #ffffff12", color: "#ffffff50", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          <LogOut size={12} /> Sign Out
        </button>
      </div>

      <div style={{ background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <StatusIcon size={18} color={status.color} />
          <span style={{ fontSize: 14, fontWeight: 700, color: status.color }}>{status.label}</span>
        </div>
        <p style={{ fontSize: 13, color: "#ffffffaa" }}>Role: <strong style={{ color: "#fff" }}>{roleName}</strong></p>
        {application.checked_in && <p style={{ fontSize: 12, color: "#22c55e", marginTop: 6 }}>Checked in for game day</p>}
      </div>

      <div style={{ background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#ffffff60", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Your Info</h3>
        <label style={{ display: "block", fontSize: 11, color: "#ffffff50", marginBottom: 6 }}>Phone</label>
        <input value={phone} onChange={e => setPhone(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 10, color: "#fff", fontSize: 13, marginBottom: 14, fontFamily: "'Inter',sans-serif" }} />
        <label style={{ display: "block", fontSize: 11, color: "#ffffff50", marginBottom: 6 }}>Experience</label>
        <textarea value={experience} onChange={e => setExperience(e.target.value)} rows={3}
          style={{ width: "100%", padding: "10px 12px", background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 10, color: "#fff", fontSize: 13, resize: "none", marginBottom: 14, fontFamily: "'Inter',sans-serif" }} />
        <button onClick={handleSave} disabled={saving}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: B.accent, color: B.dark, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {application.status !== "withdrawn" && (
        <div style={{ background: "#ef444408", border: "1px solid #ef444420", borderRadius: 16, padding: 20 }}>
          <p style={{ fontSize: 12, color: "#ffffffaa", marginBottom: 12 }}>Can't make it anymore? Withdraw your application.</p>
          <button onClick={handleWithdraw} disabled={withdrawing}
            style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #ef444440", background: "#ef444415", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {withdrawing ? "Withdrawing..." : "Withdraw Application"}
          </button>
        </div>
      )}

      {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 16, textAlign: "center" }}>{error}</p>}
    </div>
  );
}

export default function VolunteerPortal() {
  const { config, eventId } = useEvent();
  const B = config.brand;

  const [checkingSession, setCheckingSession] = useState(true);
  const [application, setApplication] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const loadSelf = async () => {
    try {
      const data = await volunteersApi.getSelf();
      setApplication(data);
      setNotFound(false);
    } catch (err) {
      console.error("No linked volunteer application found:", err);
      setApplication(null);
      setNotFound(true);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setCheckingSession(false);
        return;
      }
      await loadSelf();
      if (!cancelled) setCheckingSession(false);
    }

    checkSession();

    // Magic-link redirect lands back on this same route with the session
    // arriving asynchronously (detectSessionInUrl) — re-check on the auth
    // state change rather than only on mount.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadSelf();
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setApplication(null);
    setNotFound(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: B.dark, color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn .4s ease-out; }
        input:focus, textarea:focus { outline: none; border-color: ${B.accent}88 !important; }
      `}</style>

      <header style={{ padding: "12px 16px", borderBottom: "1px solid #ffffff10" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 480, margin: "0 auto" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${B.primary}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <HandHelping size={16} color={B.primary} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{config.event?.name}</p>
        </div>
      </header>

      {checkingSession && (
        <div className="fade-in" style={{ padding: "80px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#ffffff60" }}>Loading…</p>
        </div>
      )}

      {!checkingSession && application && (
        <VolunteerDashboard application={application} onLogout={handleLogout} onRefresh={loadSelf} />
      )}

      {!checkingSession && !application && notFound && (
        <div className="fade-in" style={{ padding: "60px 24px", textAlign: "center" }}>
          <AlertCircle size={32} color="#ef4444" style={{ marginBottom: 16 }} />
          <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>No application found</h1>
          <p style={{ fontSize: 14, color: "#ffffff60", maxWidth: 320, margin: "0 auto" }}>
            We couldn't find a volunteer application linked to this email. If you haven't applied yet, use the volunteer form on the event page.
          </p>
        </div>
      )}

      {!checkingSession && !application && !notFound && <LoginScreen eventId={eventId} />}
    </div>
  );
}
