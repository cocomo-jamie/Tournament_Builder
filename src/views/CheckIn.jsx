// src/views/CheckIn.jsx
// ─────────────────────────────────────────────────────────────────────
// FEATURE_SPEC_entitlements_and_identity.md Phase 3: the landing page a
// captain's QR/magic-link opens. Supabase's client (detectSessionInUrl,
// on by default) picks up the session from the link's URL fragment on
// load; this page just waits for that, links the player row (first
// check-in only), then shows the confirm screen.
//
// Phase 3b: this is no longer a dead end. Once checked_in is true — either
// because this visit just confirmed it, or because the captain is
// re-scanning a re-issued QR and was already checked in — this page hands
// off straight into PlayerPortal.jsx's CaptainDashboard (route /captain)
// using the now-live session, instead of leaving the captain stranded on
// a static confirmation screen.
//
// No self-verification of the actual scan-to-session flow — needs a
// real device, per the work order.
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, CheckCircle, AlertCircle, Trophy } from "lucide-react";
import { useEvent } from "../context/EventContext";
import { supabase } from "../supabaseClient";
import { players as playersApi } from "../services/api";

const SYNTHETIC_EMAIL_RE = /^player_([0-9a-f-]{36})@checkin\.internal$/i;

export default function CheckIn() {
  const { config, eventId } = useEvent();
  const navigate = useNavigate();
  const B = config.brand;

  const [status, setStatus] = useState("loading"); // loading, confirm, done, already, error
  const [player, setPlayer] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Already checked in (re-scanned QR) or just confirmed — either way,
  // hand off into the scoring dashboard rather than a dead-end screen.
  useEffect(() => {
    if (status !== "done" && status !== "already") return;
    const timer = setTimeout(() => {
      navigate(`/e/${eventId}/captain`, { replace: true });
    }, 1200);
    return () => clearTimeout(timer);
  }, [status, eventId, navigate]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session?.user?.email) {
        setStatus("error");
        setErrorMsg("This link is invalid or has expired. Ask staff for a new QR code.");
        return;
      }

      const match = session.user.email.match(SYNTHETIC_EMAIL_RE);
      if (!match) {
        setStatus("error");
        setErrorMsg("This link isn't a valid check-in link.");
        return;
      }

      const playerId = match[1];

      try {
        await playersApi.linkAuthOnCheckin(playerId);
        const row = await playersApi.getSelfForCheckin();
        if (cancelled) return;
        setPlayer(row);
        setStatus(row.checked_in ? "already" : "confirm");
      } catch (err) {
        console.error("Check-in link/lookup failed:", err);
        setStatus("error");
        setErrorMsg("Something went wrong loading your check-in. Ask staff for help.");
      }
    }

    run();
    return () => { cancelled = true; };
  }, []);

  const handleConfirm = async () => {
    try {
      const updated = await playersApi.setCheckedIn(player.id);
      setPlayer(updated);
      setStatus("done");
    } catch (err) {
      console.error("Check-in confirm failed:", err);
      setErrorMsg("Failed to check in. Please try again or ask staff.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: B.dark, color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: `${B.accent}15`, border: `1px solid ${B.accent}25`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          {status === "done" || status === "already" ? <CheckCircle size={32} color="#22c55e" /> : status === "error" ? <AlertCircle size={32} color="#ef4444" /> : <Shield size={32} color={B.accent} />}
        </div>

        {status === "loading" && (
          <p style={{ fontSize: 14, color: "#ffffff60" }}>Loading your check-in…</p>
        )}

        {status === "confirm" && player && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>
              Checking in for {player.event?.name || "the event"}
            </h1>
            <p style={{ fontSize: 15, color: "#ffffffaa", marginBottom: 28 }}>
              as <strong style={{ color: "#fff" }}>{player.full_name}</strong>, captain of{" "}
              <strong style={{ color: "#fff" }}>{player.team?.name || "your team"}</strong>?
            </p>
            {errorMsg && <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 16 }}>{errorMsg}</p>}
            <button
              onClick={handleConfirm}
              style={{ width: "100%", padding: "14px 20px", borderRadius: 12, border: "none", background: B.accent, color: B.dark, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
            >
              Yes, check me in
            </button>
          </>
        )}

        {status === "done" && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>You're checked in!</h1>
            <p style={{ fontSize: 14, color: "#ffffff60" }}>Taking you to your dashboard…</p>
          </>
        )}

        {status === "already" && player && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Welcome back</h1>
            <p style={{ fontSize: 14, color: "#ffffff60" }}>
              {player.full_name} is already checked in — taking you to your dashboard…
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Can't check in</h1>
            <p style={{ fontSize: 14, color: "#ffffff60" }}>{errorMsg}</p>
          </>
        )}

        <div style={{ marginTop: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.4 }}>
          <Trophy size={14} />
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{config.event?.name}</span>
        </div>
      </div>
    </div>
  );
}
