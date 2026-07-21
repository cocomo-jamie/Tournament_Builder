// src/views/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/"); // Pass 2 will redirect based on role
    } catch (err) {
      setError(err.message || "Login failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", fontFamily: "'Inter', system-ui, sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, #D4A843, #D4A843cc)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <LogIn size={26} color="#0a0a0a" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', Georgia, serif" }}>Admin Login</h1>
          <p style={{ fontSize: 13, color: "#ffffff60", marginTop: 4 }}>Tournament Builder</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#ffffff80", marginBottom: 6, display: "block" }}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ffffff20", background: "#ffffff08", color: "#fff", fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#ffffff80", marginBottom: 6, display: "block" }}>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ffffff20", background: "#ffffff08", color: "#fff", fontSize: 14 }} />
          </div>

          {error && (
            <div style={{ display: "flex", gap: 8, alignItems: "start", padding: 10, borderRadius: 8, background: "#C1121F15", border: "1px solid #C1121F40" }}>
              <AlertCircle size={16} color="#C1121F" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "#ff8a8a" }}>{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ marginTop: 4, padding: "12px", borderRadius: 10, border: "none", background: loading ? "#D4A84380" : "#D4A843", color: "#0a0a0a", fontWeight: 700, fontSize: 14, cursor: loading ? "wait" : "pointer" }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 12, color: "#ffffff40", marginTop: 20 }}>
          Have an invite link? <Link to="/accept-invite" style={{ color: "#D4A843" }}>Accept it here</Link>
        </p>
      </div>
    </div>
  );
}
