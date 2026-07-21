// src/views/AcceptInvite.jsx
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { admin as adminApi } from "../services/api";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const token = searchParams.get("token");

  const [invite, setInvite] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setInviteError("No invite token provided.");
      setLoadingInvite(false);
      return;
    }
    adminApi.getInviteByToken(token)
      .then(setInvite)
      .catch(() => setInviteError("This invite is invalid, expired, or already used."))
      .finally(() => setLoadingInvite(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (password !== confirmPassword) {
      setSubmitError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await signUp(invite.email, password);
      // The DB trigger auto-creates the admin_users row on signup.
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setSubmitError(err.message || "Signup failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const wrapStyle = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", fontFamily: "'Inter', system-ui, sans-serif", padding: 20 };

  if (loadingInvite) {
    return <div style={wrapStyle}><p style={{ color: "#ffffff60" }}>Loading invite...</p></div>;
  }

  if (inviteError) {
    return (
      <div style={wrapStyle}>
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <AlertCircle size={40} color="#C1121F" style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Invalid Invite</h2>
          <p style={{ fontSize: 13, color: "#ffffff60" }}>{inviteError}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={wrapStyle}>
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <CheckCircle2 size={40} color="#22c55e" style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Account Created</h2>
          <p style={{ fontSize: 13, color: "#ffffff60" }}>Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, #D4A843, #D4A843cc)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <UserPlus size={26} color="#0a0a0a" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', Georgia, serif" }}>Accept Invite</h1>
          <p style={{ fontSize: 13, color: "#ffffff60", marginTop: 6 }}>
            You've been invited to join {invite.organizations?.name || "the platform"} as <strong style={{ color: "#D4A843" }}>{invite.role.replace("_", " ")}</strong>.
          </p>
          <p style={{ fontSize: 12, color: "#ffffff40", marginTop: 4 }}>{invite.email}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#ffffff80", marginBottom: 6, display: "block" }}>Create Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ffffff20", background: "#ffffff08", color: "#fff", fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#ffffff80", marginBottom: 6, display: "block" }}>Confirm Password</label>
            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ffffff20", background: "#ffffff08", color: "#fff", fontSize: 14 }} />
          </div>

          {submitError && (
            <div style={{ display: "flex", gap: 8, alignItems: "start", padding: 10, borderRadius: 8, background: "#C1121F15", border: "1px solid #C1121F40" }}>
              <AlertCircle size={16} color="#C1121F" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "#ff8a8a" }}>{submitError}</p>
            </div>
          )}

          <button type="submit" disabled={submitting}
            style={{ marginTop: 4, padding: "12px", borderRadius: 10, border: "none", background: submitting ? "#D4A84380" : "#D4A843", color: "#0a0a0a", fontWeight: 700, fontSize: 14, cursor: submitting ? "wait" : "pointer" }}>
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
