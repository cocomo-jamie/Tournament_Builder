import { useState, useRef, useEffect } from "react";
import {
  Trophy, Users, Phone, Shield, Check, X, Clock,
  ChevronRight, ArrowRight, AlertCircle, CircleDot,
  CheckCircle, XCircle, MapPin, Hash, Star, Zap,
  LogOut, Award, Target, Lock, Send, Timer,
  MessageSquare, RefreshCw, Shirt, Flag
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════ */
const B = { primary: "#C1121F", secondary: "#1B4D3E", accent: "#D4A843", dark: "#020e4b", light: "#F4F1EA" };
const EVENT = { name: "ETRC Bocce Classic", date: "August 29, 2026" };

/* ═══════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════ */
const MOCK_CAPTAIN = {
  name: "Jane Smith", phone: "+1 250-555-0101", teamId: 1,
  team: { name: "Pallino Pushers", slogan: "Born to throw", pool: "A", seed: 1, checkedIn: true },
  roster: [
    { name: "Jane Smith", role: "Captain", shirt: "M", dietary: "None" },
    { name: "Mike Chen", role: "Player", shirt: "L", dietary: "Vegetarian" },
  ],
};

const MOCK_MATCHES = [
  { id: 1, round: "Pool A-1", time: "9:00 AM", court: 1, opponent: "Court Jesters", myScore: 15, theirScore: 9, status: "completed", wasHome: true, verified: true },
  { id: 2, round: "Pool A-3", time: "10:00 AM", court: 1, opponent: "Bocce Ballers", myScore: 15, theirScore: 6, status: "completed", wasHome: false, verified: true },
  { id: 3, round: "Pool A-5", time: "11:00 AM", court: 3, opponent: "The Underdogs", myScore: 15, theirScore: 11, status: "completed", wasHome: true, verified: true },
  { id: 4, round: "QF-1", time: "1:00 PM", court: 1, opponent: "Bocce Ballers", myScore: 15, theirScore: 9, status: "completed", wasHome: false, verified: true },
  { id: 5, round: "SF-1", time: "2:15 PM", court: 1, opponent: "Rolling Stones", myScore: null, theirScore: null, status: "live", wasHome: true, verified: false },
];

const ACTIVE_MATCH = {
  id: 5, round: "Semi-Final 1", time: "2:15 PM", court: 1,
  teamA: "Pallino Pushers", teamB: "Rolling Stones",
  homeCaptainTeam: "Pallino Pushers",
  status: "live",
};

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
.fd { font-family: 'Playfair Display', Georgia, serif; }
.fb { font-family: 'Inter', system-ui, sans-serif; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
@keyframes shake { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-6px); } 75% { transform:translateX(6px); } }
.fade-in { animation: fadeIn .4s ease-out; }
.pulse { animation: pulse 1.2s ease-in-out infinite; }
.shake { animation: shake .3s ease-in-out; }
input:focus { outline: none; border-color: ${B.accent}88 !important; box-shadow: 0 0 0 3px ${B.accent}22; }
`;

const card = { background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 16, padding: 20 };
const badgeStyle = (c) => ({ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 12, background: c + "18", color: c, textTransform: "uppercase", letterSpacing: 0.5 });
const btn = (bg, c = "#fff") => ({ width: "100%", padding: "14px 20px", borderRadius: 12, border: "none", background: bg, color: c, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 });

/* ═══════════════════════════════════════════════════════════
   SCREEN 1: PHONE ENTRY
   ═══════════════════════════════════════════════════════════ */
function PhoneEntry({ onSubmit }) {
  const [phone, setPhone] = useState("");
  const valid = phone.replace(/\D/g, "").length >= 10;

  return (
    <div className="fade-in" style={{ padding: "60px 24px", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: `${B.accent}15`, border: `1px solid ${B.accent}25`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
        <Shield size={32} color={B.accent} />
      </div>
      <h1 className="fd" style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Captain Login</h1>
      <p className="fb" style={{ fontSize: 14, color: "#ffffff60", marginBottom: 32, lineHeight: 1.5 }}>
        Enter the phone number you registered with. We'll send a 6-digit code to verify.
      </p>

      <div style={{ maxWidth: 320, margin: "0 auto" }}>
        <label className="fb" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, textAlign: "left" }}>Phone Number</label>
        <div style={{ position: "relative", marginBottom: 20 }}>
          <Phone size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#ffffff40" }} />
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 250-555-0101"
            style={{ width: "100%", padding: "14px 14px 14px 42px", background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 12, color: "#fff", fontSize: 16, fontFamily: "'Inter',sans-serif" }} />
        </div>
        <button onClick={() => valid && onSubmit(phone)} disabled={!valid}
          style={{ ...btn(valid ? B.accent : "#ffffff15", valid ? B.dark : "#ffffff30") }}>
          <Send size={16} /> Send Verification Code
        </button>
        <p className="fb" style={{ fontSize: 11, color: "#ffffff30", marginTop: 16 }}>
          Standard SMS rates may apply. Code expires in 5 minutes.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN 2: OTP VERIFICATION
   ═══════════════════════════════════════════════════════════ */
function OTPVerify({ phone, onVerified, onBack }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const handleDigit = (idx, val) => {
    if (val.length > 1) val = val.slice(-1);
    if (val && !/^\d$/.test(val)) return;
    const next = [...code];
    next[idx] = val;
    setCode(next);
    setError(false);
    if (val && idx < 5) refs[idx + 1].current?.focus();
    if (next.every(d => d !== "")) {
      setVerifying(true);
      setTimeout(() => {
        setVerifying(false);
        onVerified();
      }, 1200);
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
  };

  return (
    <div className="fade-in" style={{ padding: "60px 24px", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: `${B.secondary}15`, border: `1px solid ${B.secondary}25`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
        <Lock size={32} color={B.secondary} />
      </div>
      <h1 className="fd" style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Enter Code</h1>
      <p className="fb" style={{ fontSize: 14, color: "#ffffff60", marginBottom: 32 }}>
        Sent to <strong style={{ color: "#fff" }}>{phone}</strong>
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 24 }} className={error ? "shake" : ""}>
        {code.map((d, i) => (
          <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1}
            value={d} onChange={e => handleDigit(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
            style={{
              width: 48, height: 56, textAlign: "center", fontSize: 24, fontWeight: 900, fontFamily: "monospace",
              background: verifying ? `${B.secondary}15` : "#ffffff08",
              border: `2px solid ${error ? "#ef4444" : d ? B.accent + "60" : "#ffffff15"}`,
              borderRadius: 12, color: "#fff",
            }} />
        ))}
      </div>

      {verifying && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
          <RefreshCw size={14} color={B.secondary} style={{ animation: "spin 1s linear infinite" }} />
          <span className="fb" style={{ fontSize: 13, color: B.secondary, fontWeight: 600 }}>Verifying...</span>
        </div>
      )}

      {error && <p className="fb" style={{ fontSize: 13, color: "#ef4444", marginBottom: 16 }}>Invalid code. Please try again.</p>}

      <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
        <button onClick={onBack} className="fb" style={{ background: "none", border: "none", color: "#ffffff50", fontSize: 13, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>← Change number</button>
        <button className="fb" style={{ background: "none", border: "none", color: B.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Resend code</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCORE ENTRY (Home Captain)
   ═══════════════════════════════════════════════════════════ */
function ScoreEntry({ match, myTeam, onSubmit }) {
  const [myScore, setMyScore] = useState("");
  const [theirScore, setTheirScore] = useState("");
  const isTeamA = match.teamA === myTeam;
  const opponent = isTeamA ? match.teamB : match.teamA;
  const valid = myScore !== "" && theirScore !== "" && (parseInt(myScore) !== parseInt(theirScore));

  const submit = () => {
    onSubmit({
      teamAScore: isTeamA ? parseInt(myScore) : parseInt(theirScore),
      teamBScore: isTeamA ? parseInt(theirScore) : parseInt(myScore),
    });
  };

  return (
    <div className="fade-in" style={{ ...card, background: `${B.accent}06`, borderColor: `${B.accent}25`, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div className="pulse" style={{ width: 8, height: 8, borderRadius: 4, background: "#ef4444" }} />
        <span className="fb" style={{ fontSize: 12, fontWeight: 700, color: B.accent, textTransform: "uppercase", letterSpacing: 1 }}>You are Home Captain — Enter Score</span>
      </div>
      <p className="fb" style={{ fontSize: 11, color: "#ffffff40", marginBottom: 20 }}>{match.round} · Court {match.court}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", marginBottom: 20 }}>
        {/* My Team */}
        <div style={{ textAlign: "center" }}>
          <p className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{myTeam}</p>
          <input type="number" min="0" max="99" value={myScore} onChange={e => setMyScore(e.target.value)}
            style={{ width: "100%", height: 72, textAlign: "center", fontSize: 36, fontWeight: 900, fontFamily: "'Playfair Display',serif", background: "#ffffff08", border: `2px solid ${myScore ? B.accent + "50" : "#ffffff15"}`, borderRadius: 14, color: "#fff" }} />
        </div>

        <div style={{ padding: "0 8px" }}>
          <p className="fd" style={{ fontSize: 20, color: "#ffffff20" }}>vs</p>
        </div>

        {/* Opponent */}
        <div style={{ textAlign: "center" }}>
          <p className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#ffffffaa", marginBottom: 8 }}>{opponent}</p>
          <input type="number" min="0" max="99" value={theirScore} onChange={e => setTheirScore(e.target.value)}
            style={{ width: "100%", height: 72, textAlign: "center", fontSize: 36, fontWeight: 900, fontFamily: "'Playfair Display',serif", background: "#ffffff08", border: `2px solid ${theirScore ? "#ffffff30" : "#ffffff15"}`, borderRadius: 14, color: "#ffffffcc" }} />
        </div>
      </div>

      <button onClick={submit} disabled={!valid} style={btn(valid ? B.secondary : "#ffffff15", valid ? "#fff" : "#ffffff30")}>
        <Send size={16} /> Submit Score
      </button>
      <p className="fb" style={{ fontSize: 11, color: "#ffffff30", textAlign: "center", marginTop: 10 }}>The opposing captain will be asked to verify this score.</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCORE VERIFICATION (Away Captain)
   ═══════════════════════════════════════════════════════════ */
function ScoreVerify({ match, myTeam, scores, onVerify, onDispute }) {
  const [reason, setReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const isTeamA = match.teamA === myTeam;
  const myScore = isTeamA ? scores.teamAScore : scores.teamBScore;
  const theirScore = isTeamA ? scores.teamBScore : scores.teamAScore;
  const opponent = isTeamA ? match.teamB : match.teamA;

  return (
    <div className="fade-in" style={{ ...card, background: `${B.primary}06`, borderColor: `${B.primary}25`, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <AlertCircle size={16} color={B.primary} />
        <span className="fb" style={{ fontSize: 12, fontWeight: 700, color: B.primary, textTransform: "uppercase", letterSpacing: 1 }}>Score Submitted — Please Verify</span>
      </div>
      <p className="fb" style={{ fontSize: 11, color: "#ffffff40", marginBottom: 20 }}>{match.round} · Court {match.court} · Entered by {opponent}'s captain</p>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{ textAlign: "center" }}>
          <p className="fb" style={{ fontSize: 12, fontWeight: 700, color: "#ffffff60", marginBottom: 4 }}>{myTeam}</p>
          <p className="fd" style={{ fontSize: 48, fontWeight: 900, color: myScore > theirScore ? "#22c55e" : "#fff" }}>{myScore}</p>
        </div>
        <p className="fd" style={{ fontSize: 20, color: "#ffffff20" }}>—</p>
        <div style={{ textAlign: "center" }}>
          <p className="fb" style={{ fontSize: 12, fontWeight: 700, color: "#ffffff60", marginBottom: 4 }}>{opponent}</p>
          <p className="fd" style={{ fontSize: 48, fontWeight: 900, color: theirScore > myScore ? "#22c55e" : "#ffffffaa" }}>{theirScore}</p>
        </div>
      </div>

      <p className="fb" style={{ fontSize: 14, fontWeight: 600, color: "#ffffffcc", textAlign: "center", marginBottom: 20 }}>Does this score look correct?</p>

      {!showDispute ? (
        <div style={{ display: "grid", gap: 10 }}>
          <button onClick={onVerify} style={btn("#22c55e")}><CheckCircle size={16} /> Yes — Confirm Score</button>
          <button onClick={() => setShowDispute(true)} style={btn("#ffffff10", "#ffffffaa")}><XCircle size={16} /> No — Dispute This Score</button>
        </div>
      ) : (
        <div className="fade-in">
          <label className="fb" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>What's wrong?</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Describe the issue..."
            style={{ width: "100%", padding: "12px 14px", background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 12, color: "#fff", fontSize: 14, fontFamily: "'Inter',sans-serif", resize: "none", marginBottom: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={() => setShowDispute(false)} style={{ ...btn("#ffffff10", "#ffffff80"), fontSize: 13 }}>Cancel</button>
            <button onClick={() => onDispute(reason)} disabled={!reason.trim()} style={{ ...btn(reason.trim() ? B.primary : "#ffffff15", reason.trim() ? "#fff" : "#ffffff30"), fontSize: 13 }}>
              <Flag size={14} /> Submit Dispute
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CAPTAIN DASHBOARD
   ═══════════════════════════════════════════════════════════ */
function CaptainDashboard({ captain, onLogout }) {
  const [scoreState, setScoreState] = useState("entry"); // entry, submitted, verified, disputed
  const [submittedScores, setSubmittedScores] = useState(null);

  const team = captain.team;
  const activeMatch = ACTIVE_MATCH;
  const isHome = activeMatch.homeCaptainTeam === team.name;
  const matches = MOCK_MATCHES;
  const completed = matches.filter(m => m.status === "completed");
  const record = { w: completed.filter(m => m.myScore > m.theirScore).length, l: completed.filter(m => m.myScore < m.theirScore).length };

  const handleScoreSubmit = (scores) => {
    setSubmittedScores(scores);
    setScoreState("submitted");
  };

  const handleVerify = () => setScoreState("verified");
  const handleDispute = (reason) => setScoreState("disputed");

  return (
    <div style={{ minHeight: "100vh", background: B.dark, paddingBottom: 24 }}>
      {/* Header */}
      <header style={{ background: `${B.dark}ee`, backdropFilter: "blur(12px)", borderBottom: "1px solid #ffffff10", padding: "12px 16px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${B.accent}15`, border: `1px solid ${B.accent}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={16} color={B.accent} />
            </div>
            <div>
              <p className="fb" style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{team.name}</p>
              <p className="fb" style={{ fontSize: 10, color: B.accent, fontWeight: 600 }}>Captain: {captain.name}</p>
            </div>
          </div>
          <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: "#ffffff08", border: "1px solid #ffffff12", color: "#ffffff50", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
            <LogOut size={12} /> Exit
          </button>
        </div>
      </header>

      <div style={{ padding: 16 }}>
        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { l: "Won", v: record.w, c: "#22c55e" },
            { l: "Lost", v: record.l, c: "#ef4444" },
            { l: "Pool", v: team.pool, c: B.accent },
            { l: "Seed", v: `#${team.seed}`, c: "#fff" },
          ].map((s, i) => (
            <div key={i} style={{ ...card, textAlign: "center", padding: 12 }}>
              <p className="fb" style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</p>
              <p className="fb" style={{ fontSize: 10, color: "#ffffff50", textTransform: "uppercase" }}>{s.l}</p>
            </div>
          ))}
        </div>

        {/* Active Match — Score Entry or Verification */}
        {activeMatch.status === "live" && scoreState === "entry" && isHome && (
          <ScoreEntry match={activeMatch} myTeam={team.name} onSubmit={handleScoreSubmit} />
        )}

        {activeMatch.status === "live" && scoreState === "entry" && !isHome && submittedScores && (
          <ScoreVerify match={activeMatch} myTeam={team.name} scores={submittedScores} onVerify={handleVerify} onDispute={handleDispute} />
        )}

        {activeMatch.status === "live" && scoreState === "entry" && !isHome && !submittedScores && (
          <div style={{ ...card, background: `${B.secondary}06`, borderColor: `${B.secondary}20`, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div className="pulse" style={{ width: 8, height: 8, borderRadius: 4, background: "#22c55e" }} />
              <span className="fb" style={{ fontSize: 12, fontWeight: 700, color: B.secondary, textTransform: "uppercase", letterSpacing: 1 }}>Match in Progress</span>
            </div>
            <p className="fb" style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>vs {activeMatch.teamA === team.name ? activeMatch.teamB : activeMatch.teamA}</p>
            <p className="fb" style={{ fontSize: 12, color: "#ffffff50", marginTop: 4 }}>{activeMatch.round} · Court {activeMatch.court}</p>
            <p className="fb" style={{ fontSize: 13, color: "#ffffffaa", marginTop: 12, background: "#ffffff04", padding: 12, borderRadius: 8 }}>
              <Shield size={12} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} color={B.accent} />
              You're the <strong style={{ color: B.accent }}>Away Captain</strong>. Wait for the Home Captain to submit the score — you'll be asked to verify it.
            </p>
          </div>
        )}

        {scoreState === "submitted" && (
          <div className="fade-in" style={{ ...card, background: `${B.accent}06`, borderColor: `${B.accent}25`, marginBottom: 16, textAlign: "center" }}>
            <Timer size={24} color={B.accent} style={{ marginBottom: 8 }} />
            <p className="fb" style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Score Submitted</p>
            <p className="fb" style={{ fontSize: 22, fontWeight: 900, color: B.accent, margin: "8px 0" }}>
              {submittedScores.teamAScore} — {submittedScores.teamBScore}
            </p>
            <p className="fb" style={{ fontSize: 13, color: "#ffffff60" }}>Waiting for {activeMatch.teamB}'s captain to verify...</p>
          </div>
        )}

        {scoreState === "verified" && (
          <div className="fade-in" style={{ ...card, background: "#22c55e06", borderColor: "#22c55e25", marginBottom: 16, textAlign: "center" }}>
            <CheckCircle size={32} color="#22c55e" style={{ marginBottom: 8 }} />
            <p className="fb" style={{ fontSize: 16, fontWeight: 800, color: "#22c55e" }}>Score Verified!</p>
            <p className="fb" style={{ fontSize: 13, color: "#ffffffaa", marginTop: 4 }}>Result is now official. Good game!</p>
          </div>
        )}

        {scoreState === "disputed" && (
          <div className="fade-in" style={{ ...card, background: `${B.primary}06`, borderColor: `${B.primary}25`, marginBottom: 16, textAlign: "center" }}>
            <AlertCircle size={32} color={B.primary} style={{ marginBottom: 8 }} />
            <p className="fb" style={{ fontSize: 16, fontWeight: 800, color: B.primary }}>Score Disputed</p>
            <p className="fb" style={{ fontSize: 13, color: "#ffffffaa", marginTop: 4 }}>A tournament referee has been notified and will come to your court to resolve this.</p>
          </div>
        )}

        {/* Roster */}
        <div style={{ ...card, marginBottom: 16 }}>
          <h3 className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#ffffff60", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={14} color={B.accent} /> Team Roster
          </h3>
          {captain.roster.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < captain.roster.length - 1 ? "1px solid #ffffff06" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: p.role === "Captain" ? `${B.accent}15` : "#ffffff08", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {p.role === "Captain" ? <Shield size={14} color={B.accent} /> : <Users size={14} color="#ffffff40" />}
                </div>
                <div>
                  <p className="fb" style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{p.name}</p>
                  <p className="fb" style={{ fontSize: 11, color: "#ffffff40" }}>{p.role}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {p.shirt && <span style={badgeStyle("#ffffff40")}><Shirt size={10} /> {p.shirt}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Match History */}
        <div style={card}>
          <h3 className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#ffffff60", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <Trophy size={14} color={B.accent} /> Match History
          </h3>
          {matches.map((m, i) => {
            const won = m.myScore !== null && m.myScore > m.theirScore;
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < matches.length - 1 ? "1px solid #ffffff06" : "none" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={badgeStyle(m.status === "live" ? "#22c55e" : "#6b7280")}>{m.round}</span>
                    {m.wasHome && <span style={badgeStyle(B.accent)}>Home</span>}
                    {m.status === "completed" && <span style={badgeStyle(won ? "#22c55e" : "#ef4444")}>{won ? "W" : "L"}</span>}
                    {m.status === "live" && <span style={badgeStyle("#22c55e")}>Live</span>}
                  </div>
                  <p className="fb" style={{ fontSize: 14, fontWeight: 600, color: "#ffffffcc" }}>vs {m.opponent}</p>
                  <p className="fb" style={{ fontSize: 11, color: "#ffffff30" }}>Court {m.court} · {m.time}</p>
                </div>
                {m.myScore !== null ? (
                  <p className="fd" style={{ fontSize: 22, fontWeight: 900, color: won ? "#22c55e" : "#ffffff60" }}>
                    {m.myScore}<span style={{ color: "#ffffff15", margin: "0 3px" }}>-</span>{m.theirScore}
                  </p>
                ) : (
                  <div className="pulse" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <CircleDot size={10} color="#22c55e" />
                    <span className="fb" style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>In progress</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════ */
export default function PlayerPortal() {
  const [screen, setScreen] = useState("phone"); // phone, otp, dashboard
  const [phone, setPhone] = useState("");

  return (
    <div style={{ minHeight: "100vh", background: B.dark, color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{CSS}</style>

      {screen === "phone" && (
        <>
          <header style={{ padding: "12px 16px", borderBottom: "1px solid #ffffff10" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${B.primary}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Trophy size={16} color={B.primary} />
              </div>
              <div>
                <p className="fd" style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{EVENT.name}</p>
                <p className="fb" style={{ fontSize: 10, color: "#ffffff50" }}>Captain Portal</p>
              </div>
            </div>
          </header>
          <PhoneEntry onSubmit={(p) => { setPhone(p); setScreen("otp"); }} />
        </>
      )}

      {screen === "otp" && (
        <>
          <header style={{ padding: "12px 16px", borderBottom: "1px solid #ffffff10" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${B.primary}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Trophy size={16} color={B.primary} />
              </div>
              <p className="fd" style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{EVENT.name}</p>
            </div>
          </header>
          <OTPVerify phone={phone} onVerified={() => setScreen("dashboard")} onBack={() => setScreen("phone")} />
        </>
      )}

      {screen === "dashboard" && (
        <CaptainDashboard captain={MOCK_CAPTAIN} onLogout={() => setScreen("phone")} />
      )}
    </div>
  );
}
