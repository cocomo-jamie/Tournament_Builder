import { useState, useEffect, useMemo } from "react";
import {
  Trophy, Users, MapPin, Clock, Zap, Star,
  CircleDot, Award, BarChart3, ChevronRight,
  Heart, Timer, Bell, ArrowRight, Shield
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   CONFIG & BRAND
   ═══════════════════════════════════════════════════════════ */
const B = { primary: "#C1121F", secondary: "#1B4D3E", accent: "#D4A843", dark: "#020e4b", light: "#F4F1EA" };
const EVENT = { name: "ETRC Bocce Classic", tagline: "Fighting Elder Fraud", date: "Aug 29, 2026", venue: "ETRC Clubhouse" };
const CYCLE_MS = 15000;

/* ═══════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════ */
const COURTS = [
  { num: 1, status: "live", teamA: "Pallino Pushers", teamB: "Court Jesters", scoreA: 11, scoreB: 8, round: "R1", updated: true },
  { num: 2, status: "live", teamA: "Rolling Stones", teamB: "Lawn & Order", scoreA: 7, scoreB: 7, round: "R1", updated: false },
  { num: 3, status: "live", teamA: "Bocce Ballers", teamB: "Ball Busters", scoreA: 13, scoreB: 10, round: "R1", updated: true },
  { num: 4, status: "live", teamA: "The Underdogs", teamB: "Pin Droppers", scoreA: 5, scoreB: 9, round: "R1", updated: false },
  { num: 5, status: "upcoming", teamA: "Gutter Queens", teamB: "Roll Models", scoreA: null, scoreB: null, round: "R2" },
  { num: 6, status: "available", teamA: null, teamB: null, scoreA: null, scoreB: null },
];

const POOLS = [
  { name: "Pool A", teams: [
    { name: "Pallino Pushers", w: 3, l: 0, pf: 45, pa: 22, pts: 9 },
    { name: "Court Jesters", w: 2, l: 1, pf: 38, pa: 30, pts: 6 },
    { name: "The Underdogs", w: 1, l: 2, pf: 28, pa: 35, pts: 3 },
    { name: "Pin Droppers", w: 0, l: 3, pf: 18, pa: 42, pts: 0 },
  ]},
  { name: "Pool B", teams: [
    { name: "Rolling Stones", w: 3, l: 0, pf: 42, pa: 20, pts: 9 },
    { name: "Lawn & Order", w: 2, l: 1, pf: 35, pa: 28, pts: 6 },
    { name: "Bocce Ballers", w: 1, l: 2, pf: 30, pa: 33, pts: 3 },
    { name: "Ball Busters", w: 0, l: 3, pf: 15, pa: 41, pts: 0 },
  ]},
];

const BRACKET = [
  { round: "Quarter-Finals", matches: [
    { a: "Pallino Pushers", b: "Bocce Ballers", sa: 15, sb: 9, done: true },
    { a: "Rolling Stones", b: "Court Jesters", sa: 15, sb: 12, done: true },
    { a: "Lawn & Order", b: "The Underdogs", sa: 11, sb: 15, done: true },
    { a: "Gutter Queens", b: "Roll Models", sa: null, sb: null, done: false },
  ]},
  { round: "Semi-Finals", matches: [
    { a: "Pallino Pushers", b: "Rolling Stones", sa: null, sb: null, done: false },
    { a: "The Underdogs", b: "TBD", sa: null, sb: null, done: false },
  ]},
  { round: "Final", matches: [
    { a: "TBD", b: "TBD", sa: null, sb: null, done: false },
  ]},
];

const STATS = [
  { label: "Total Points Scored", value: "487", icon: Zap },
  { label: "Matches Completed", value: "18", icon: Trophy },
  { label: "Closest Match", value: "15-14", sub: "Pallino Pushers vs Lawn & Order", icon: Star },
  { label: "Highest Score", value: "15-2", sub: "Rolling Stones vs Pin Droppers", icon: Award },
  { label: "Teams Remaining", value: "8", icon: Users },
  { label: "Fundraised Today", value: "$4,250", icon: Heart },
];

const ANNOUNCEMENTS = [
  "🏆 Quarter-finals underway! Check the bracket for your next match.",
  "🍔 BBQ is OPEN — grab your tokens at the front desk!",
  "📸 Team photos at Court 1 during halftime — don't miss it!",
  "❤️ We've raised $4,250 so far — thank you for fighting elder fraud!",
  "⏰ Semi-finals begin at approximately 2:30 PM",
];

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { overflow: hidden; }

@keyframes scoreFlash {
  0%, 100% { background: transparent; }
  50% { background: ${B.accent}25; }
}
@keyframes slideIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes ticker {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}
@keyframes pulseDot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
@keyframes fadeSwitch {
  0% { opacity: 0; transform: scale(0.98); }
  8% { opacity: 1; transform: scale(1); }
  92% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.98); }
}

.slide-in { animation: slideIn 0.5s ease-out forwards; }
.score-flash { animation: scoreFlash 1.5s ease-in-out 3; }
.tv-fade { animation: fadeSwitch ${CYCLE_MS}ms ease-in-out; }
.pulse-dot { animation: pulseDot 1.2s ease-in-out infinite; }
.fd { font-family: 'Playfair Display', Georgia, serif; }
.fb { font-family: 'Inter', system-ui, sans-serif; }
`;

/* ═══════════════════════════════════════════════════════════
   HEADER BAR (persistent)
   ═══════════════════════════════════════════════════════════ */
function TVHeader({ elapsed, viewLabel }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);
  const fmt = (s) => `${Math.floor(s / 3600).toString().padStart(2, "0")}:${Math.floor((s % 3600) / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 32px", background: "#00000040", borderBottom: `2px solid ${B.accent}30` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${B.primary}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Trophy size={22} color={B.primary} />
        </div>
        <div>
          <h1 className="fd" style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>{EVENT.name}</h1>
          <p className="fb" style={{ fontSize: 11, color: B.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2 }}>{EVENT.tagline}</p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ textAlign: "center" }}>
          <p className="fb" style={{ fontSize: 10, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 1 }}>Viewing</p>
          <p className="fb" style={{ fontSize: 14, fontWeight: 700, color: B.accent }}>{viewLabel}</p>
        </div>
        <div style={{ height: 32, width: 1, background: "#ffffff15" }} />
        <div style={{ textAlign: "center" }}>
          <p className="fb" style={{ fontSize: 10, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 1 }}>Tournament</p>
          <p className="fb" style={{ fontSize: 18, fontWeight: 900, color: "#fff", fontFamily: "monospace", letterSpacing: 1 }}>{fmt(elapsed)}</p>
        </div>
        <div style={{ height: 32, width: 1, background: "#ffffff15" }} />
        <div style={{ textAlign: "right" }}>
          <p className="fb" style={{ fontSize: 10, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 1 }}>Time</p>
          <p className="fb" style={{ fontSize: 18, fontWeight: 900, color: "#fff", fontFamily: "monospace" }}>{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TICKER BAR (persistent bottom)
   ═══════════════════════════════════════════════════════════ */
function Ticker() {
  const text = ANNOUNCEMENTS.join("     ★     ");
  return (
    <div style={{ background: "#00000060", borderTop: `2px solid ${B.accent}30`, padding: "10px 0", overflow: "hidden", whiteSpace: "nowrap" }}>
      <div style={{ display: "inline-block", animation: `ticker ${ANNOUNCEMENTS.length * 8}s linear infinite` }}>
        <span className="fb" style={{ fontSize: 15, fontWeight: 600, color: B.accent, letterSpacing: 0.5 }}>{text}     ★     {text}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW 1: COURTS STATUS GRID
   ═══════════════════════════════════════════════════════════ */
function CourtsView() {
  return (
    <div className="slide-in" style={{ padding: "24px 32px", height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, height: "100%" }}>
        {COURTS.map(c => (
          <div key={c.num} style={{
            borderRadius: 20, overflow: "hidden",
            border: `2px solid ${c.status === "live" ? B.accent + "40" : c.status === "upcoming" ? "#ffffff15" : "#ffffff08"}`,
            background: c.status === "live" ? "#ffffff06" : "#ffffff03",
            display: "flex", flexDirection: "column",
          }}>
            {/* Court Header */}
            <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${c.status === "live" ? B.accent + "20" : "#ffffff08"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CircleDot size={14} color={c.status === "live" ? "#22c55e" : c.status === "upcoming" ? B.accent : "#ffffff30"} className={c.status === "live" ? "pulse-dot" : ""} />
                <span className="fb" style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Court {c.num}</span>
              </div>
              {c.status === "live" && <span className="fb" style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: 1 }}>{c.round} · Live</span>}
              {c.status === "upcoming" && <span className="fb" style={{ fontSize: 11, fontWeight: 700, color: B.accent, textTransform: "uppercase", letterSpacing: 1 }}>Up Next</span>}
              {c.status === "available" && <span className="fb" style={{ fontSize: 11, fontWeight: 700, color: "#ffffff30", textTransform: "uppercase", letterSpacing: 1 }}>Open</span>}
            </div>

            {/* Match Content */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "16px 20px" }}>
              {c.teamA ? (
                <>
                  <div className={c.updated ? "score-flash" : ""} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderRadius: 8 }}>
                    <span className="fb" style={{ fontSize: 18, fontWeight: 700, color: "#fff", flex: 1 }}>{c.teamA}</span>
                    <span className="fd" style={{ fontSize: 36, fontWeight: 900, color: c.scoreA !== null && c.scoreA >= (c.scoreB || 0) ? B.accent : "#ffffff80", minWidth: 50, textAlign: "right" }}>
                      {c.scoreA !== null ? c.scoreA : "—"}
                    </span>
                  </div>
                  <div style={{ height: 1, background: "#ffffff10", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
                    <span className="fb" style={{ fontSize: 18, fontWeight: 700, color: "#fff", flex: 1 }}>{c.teamB}</span>
                    <span className="fd" style={{ fontSize: 36, fontWeight: 900, color: c.scoreB !== null && c.scoreB >= (c.scoreA || 0) ? B.accent : "#ffffff80", minWidth: 50, textAlign: "right" }}>
                      {c.scoreB !== null ? c.scoreB : "—"}
                    </span>
                  </div>
                </>
              ) : (
                <p className="fb" style={{ textAlign: "center", fontSize: 16, color: "#ffffff20", fontWeight: 600 }}>No match assigned</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW 2: POOL STANDINGS
   ═══════════════════════════════════════════════════════════ */
function StandingsView() {
  return (
    <div className="slide-in" style={{ padding: "24px 32px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {POOLS.map((pool, pi) => (
          <div key={pi} style={{ borderRadius: 20, border: "1px solid #ffffff10", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", background: `${B.secondary}20`, borderBottom: "1px solid #ffffff10" }}>
              <h3 className="fd" style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{pool.name}</h3>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#ffffff40", textAlign: "left", textTransform: "uppercase", letterSpacing: 1 }}>#</th>
                  <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#ffffff40", textAlign: "left", textTransform: "uppercase", letterSpacing: 1 }}>Team</th>
                  <th style={{ padding: "10px 8px", fontSize: 11, fontWeight: 700, color: "#ffffff40", textAlign: "center", textTransform: "uppercase" }}>W</th>
                  <th style={{ padding: "10px 8px", fontSize: 11, fontWeight: 700, color: "#ffffff40", textAlign: "center", textTransform: "uppercase" }}>L</th>
                  <th style={{ padding: "10px 8px", fontSize: 11, fontWeight: 700, color: "#ffffff40", textAlign: "center", textTransform: "uppercase" }}>PF</th>
                  <th style={{ padding: "10px 8px", fontSize: 11, fontWeight: 700, color: "#ffffff40", textAlign: "center", textTransform: "uppercase" }}>PA</th>
                  <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#ffffff40", textAlign: "center", textTransform: "uppercase" }}>PTS</th>
                </tr>
              </thead>
              <tbody>
                {pool.teams.map((t, i) => (
                  <tr key={i} style={{ background: i < 2 ? `${B.secondary}08` : "transparent", borderBottom: "1px solid #ffffff06" }}>
                    <td style={{ padding: "14px 16px", fontSize: 16, fontWeight: 900, color: i < 2 ? B.accent : "#ffffff40" }}>{i + 1}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span className="fb" style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{t.name}</span>
                      {i < 2 && <span className="fb" style={{ fontSize: 9, fontWeight: 700, color: B.secondary, background: `${B.secondary}25`, padding: "2px 6px", borderRadius: 4, marginLeft: 8, textTransform: "uppercase" }}>Qualifies</span>}
                    </td>
                    <td style={{ padding: "14px 8px", fontSize: 16, fontWeight: 800, color: "#22c55e", textAlign: "center" }}>{t.w}</td>
                    <td style={{ padding: "14px 8px", fontSize: 16, fontWeight: 800, color: "#ef4444", textAlign: "center" }}>{t.l}</td>
                    <td style={{ padding: "14px 8px", fontSize: 14, color: "#ffffffaa", textAlign: "center" }}>{t.pf}</td>
                    <td style={{ padding: "14px 8px", fontSize: 14, color: "#ffffffaa", textAlign: "center" }}>{t.pa}</td>
                    <td style={{ padding: "14px 16px", fontSize: 18, fontWeight: 900, color: B.accent, textAlign: "center" }}>{t.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW 3: BRACKET
   ═══════════════════════════════════════════════════════════ */
function BracketView() {
  return (
    <div className="slide-in" style={{ padding: "24px 32px" }}>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", justifyContent: "center", height: "100%" }}>
        {BRACKET.map((round, ri) => (
          <div key={ri} style={{ flex: 1, maxWidth: 320, display: "flex", flexDirection: "column", gap: 16, justifyContent: "center", minHeight: ri === 0 ? "auto" : 200 }}>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <span className="fb" style={{ fontSize: 12, fontWeight: 700, color: B.accent, textTransform: "uppercase", letterSpacing: 2 }}>{round.round}</span>
            </div>
            {round.matches.map((m, mi) => (
              <div key={mi} style={{
                borderRadius: 14, overflow: "hidden",
                border: `1px solid ${m.done ? "#22c55e30" : !m.a || m.a === "TBD" ? "#ffffff08" : B.accent + "25"}`,
                background: m.done ? "#22c55e06" : "#ffffff04",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #ffffff08" }}>
                  <span className="fb" style={{ fontSize: 15, fontWeight: 700, color: m.done && m.sa > m.sb ? "#fff" : m.a === "TBD" ? "#ffffff30" : "#ffffffaa" }}>{m.a}</span>
                  <span className="fd" style={{ fontSize: 22, fontWeight: 900, color: m.sa !== null ? (m.sa > m.sb ? "#22c55e" : "#ffffff60") : "#ffffff20" }}>{m.sa !== null ? m.sa : "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                  <span className="fb" style={{ fontSize: 15, fontWeight: 700, color: m.done && m.sb > m.sa ? "#fff" : m.b === "TBD" ? "#ffffff30" : "#ffffffaa" }}>{m.b}</span>
                  <span className="fd" style={{ fontSize: 22, fontWeight: 900, color: m.sb !== null ? (m.sb > m.sa ? "#22c55e" : "#ffffff60") : "#ffffff20" }}>{m.sb !== null ? m.sb : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Trophy at the end */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, paddingTop: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `${B.accent}20`, border: `2px solid ${B.accent}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trophy size={32} color={B.accent} />
          </div>
          <p className="fd" style={{ fontSize: 14, fontWeight: 800, color: B.accent, marginTop: 8 }}>Champion</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW 4: TOURNAMENT STATS
   ═══════════════════════════════════════════════════════════ */
function StatsView() {
  return (
    <div className="slide-in" style={{ padding: "24px 32px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ borderRadius: 20, border: "1px solid #ffffff10", background: "#ffffff04", padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: `${B.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <s.icon size={26} color={B.accent} />
            </div>
            <p className="fd" style={{ fontSize: 42, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{s.value}</p>
            <p className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#ffffff60", textTransform: "uppercase", letterSpacing: 1, marginTop: 8 }}>{s.label}</p>
            {s.sub && <p className="fb" style={{ fontSize: 12, color: "#ffffff40", marginTop: 4 }}>{s.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROGRESS DOTS
   ═══════════════════════════════════════════════════════════ */
function ProgressDots({ current, total, progress, isSponsor }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)" }}>
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === current;
        const isSponsorDot = [0, 2, 4, 6].includes(i); // sponsor positions in the cycle
        const dotColor = isSponsorDot ? "#ffffff60" : B.accent;
        const fillColor = isSponsorDot ? "#ffffffaa" : B.accent;
        return (
          <div key={i} style={{ position: "relative", width: isActive ? 32 : 8, height: 8, borderRadius: 4, background: isActive ? "#ffffff15" : i < current ? fillColor + "40" : "#ffffff08", overflow: "hidden", transition: "width 0.3s" }}>
            {isActive && (
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress}%`, background: fillColor, borderRadius: 4, transition: "width 0.3s linear" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SPONSOR DATA (from admin/wizard config)
   ═══════════════════════════════════════════════════════════ */
const SPONSORS = {
  gold: { name: "Tall Tree Health", tier: "Gold", tagline: "Rooted in community wellness", logoUrl: "", website: "talltreehealth.ca", color: B.accent },
  silver: [
    { name: "Island Savings", tier: "Silver", tagline: "Banking on our community", logoUrl: "", color: "#94a3b8" },
    { name: "Victoria Plumbing", tier: "Silver", tagline: "Your local experts since 1985", logoUrl: "", color: "#94a3b8" },
  ],
  bronze: [
    { name: "Beacon Law Group", tier: "Bronze", tagline: "Protecting what matters", logoUrl: "" },
    { name: "Oceanside Physio", tier: "Bronze", tagline: "Move better, feel better", logoUrl: "" },
  ],
  community: [
    { name: "Christie's Pub", tier: "Community", tagline: "Great food, great times", logoUrl: "" },
    { name: "Fairfield Bikes", tier: "Community", tagline: "Ride local", logoUrl: "" },
  ],
};

/* ═══════════════════════════════════════════════════════════
   VIEW: GOLD SPONSOR (15s - premium placement)
   ═══════════════════════════════════════════════════════════ */
function GoldSponsorView() {
  const s = SPONSORS.gold;
  return (
    <div className="slide-in" style={{ padding: "32px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 700 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${s.color}15`, border: `1px solid ${s.color}30`, borderRadius: 40, padding: "6px 18px", marginBottom: 28 }}>
          <Star size={14} color={s.color} />
          <span className="fb" style={{ fontSize: 12, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: 2 }}>Gold Sponsor</span>
        </div>

        {/* Logo placeholder */}
        <div style={{ width: 180, height: 180, borderRadius: 24, background: `${s.color}10`, border: `2px solid ${s.color}25`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
          {s.logoUrl ? (
            <img src={s.logoUrl} alt={s.name} style={{ maxWidth: "80%", maxHeight: "80%" }} />
          ) : (
            <span className="fd" style={{ fontSize: 48, fontWeight: 900, color: s.color }}>{s.name.charAt(0)}</span>
          )}
        </div>

        <h2 className="fd" style={{ fontSize: 52, fontWeight: 900, color: "#fff", marginBottom: 12, letterSpacing: -1 }}>{s.name}</h2>
        {s.tagline && <p className="fb" style={{ fontSize: 20, color: "#ffffffaa", fontStyle: "italic", marginBottom: 20 }}>"{s.tagline}"</p>}
        {s.website && <p className="fb" style={{ fontSize: 14, color: "#ffffff50" }}>{s.website}</p>}

        <div style={{ marginTop: 36, paddingTop: 24, borderTop: `1px solid #ffffff10` }}>
          <p className="fb" style={{ fontSize: 13, color: "#ffffff40" }}>Proudly supporting the <strong style={{ color: B.accent }}>{EVENT.name}</strong> and the fight against elder fraud</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW: MULTI-SPONSOR SLIDE (5s - rotates through a tier)
   ═══════════════════════════════════════════════════════════ */
function SponsorSlide({ sponsors, tierLabel, tierColor }) {
  return (
    <div className="slide-in" style={{ padding: "32px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", width: "100%", maxWidth: 900 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${tierColor}15`, border: `1px solid ${tierColor}25`, borderRadius: 40, padding: "5px 16px", marginBottom: 32 }}>
          <Star size={12} color={tierColor} />
          <span className="fb" style={{ fontSize: 11, fontWeight: 700, color: tierColor, textTransform: "uppercase", letterSpacing: 2 }}>{tierLabel} Sponsors</span>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
          {sponsors.map((s, i) => (
            <div key={i} style={{ textAlign: "center", minWidth: 180 }}>
              <div style={{ width: 100, height: 100, borderRadius: 20, background: `${tierColor}08`, border: `1px solid ${tierColor}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                {s.logoUrl ? (
                  <img src={s.logoUrl} alt={s.name} style={{ maxWidth: "70%", maxHeight: "70%" }} />
                ) : (
                  <span className="fd" style={{ fontSize: 32, fontWeight: 900, color: tierColor + "80" }}>{s.name.charAt(0)}</span>
                )}
              </div>
              <p className="fb" style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{s.name}</p>
              {s.tagline && <p className="fb" style={{ fontSize: 13, color: "#ffffff60", fontStyle: "italic", marginTop: 4 }}>"{s.tagline}"</p>}
            </div>
          ))}
        </div>

        <p className="fb" style={{ fontSize: 12, color: "#ffffff30", marginTop: 32 }}>Thank you for supporting our community</p>
      </div>
    </div>
  );
}

function SilverSponsorView() { return <SponsorSlide sponsors={SPONSORS.silver} tierLabel="Silver" tierColor="#94a3b8" />; }
function BronzeSponsorView() { return <SponsorSlide sponsors={SPONSORS.bronze} tierLabel="Bronze" tierColor="#cd7f32" />; }
function CommunitySponsorView() { return <SponsorSlide sponsors={SPONSORS.community} tierLabel="Community" tierColor={B.secondary} />; }

/* ═══════════════════════════════════════════════════════════
   MAIN TV DISPLAY
   ═══════════════════════════════════════════════════════════ */
export default function TVDisplay() {
  // Views with variable durations (ms)
  const views = [
    { id: "gold_sponsor", label: "Gold Sponsor", component: GoldSponsorView, duration: 15000 },
    { id: "courts", label: "Live Courts", component: CourtsView, duration: 15000 },
    { id: "silver_sponsor", label: "Silver Sponsors", component: SilverSponsorView, duration: 5000 },
    { id: "standings", label: "Pool Standings", component: StandingsView, duration: 15000 },
    { id: "bronze_sponsor", label: "Bronze Sponsors", component: BronzeSponsorView, duration: 5000 },
    { id: "bracket", label: "Championship Bracket", component: BracketView, duration: 15000 },
    { id: "community_sponsor", label: "Community Sponsors", component: CommunitySponsorView, duration: 5000 },
    { id: "stats", label: "Tournament Stats", component: StatsView, duration: 15000 },
  ];

  const [currentView, setCurrentView] = useState(0);
  const [elapsed, setElapsed] = useState(4823);
  const [progress, setProgress] = useState(0);

  // Auto-cycle with variable durations
  useEffect(() => {
    const dur = views[currentView].duration;
    const timeout = setTimeout(() => {
      setCurrentView(v => (v + 1) % views.length);
      setProgress(0);
    }, dur);
    return () => clearTimeout(timeout);
  }, [currentView]);

  // Progress bar for current slide
  useEffect(() => {
    const dur = views[currentView].duration;
    const tick = setInterval(() => {
      setProgress(p => Math.min(100, p + (100 / (dur / 100))));
    }, 100);
    return () => clearInterval(tick);
  }, [currentView]);

  // Tournament clock
  useEffect(() => {
    const i = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const CurrentComponent = views[currentView].component;
  const isSponsor = views[currentView].id.includes("sponsor");

  return (
    <div style={{ width: "100vw", height: "100vh", background: `linear-gradient(170deg, ${B.dark} 0%, #010830 50%, ${B.dark} 100%)`, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', system-ui, sans-serif", position: "relative" }}>
      <style>{CSS}</style>

      <TVHeader elapsed={elapsed} viewLabel={views[currentView].label} />

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }} key={currentView}>
        <CurrentComponent />
      </div>

      <ProgressDots current={currentView} total={views.length} progress={progress} isSponsor={isSponsor} />
      <Ticker />
    </div>
  );
}
