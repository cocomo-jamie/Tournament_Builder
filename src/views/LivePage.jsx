import { useState, useMemo, useEffect } from "react";
import {
  Trophy, Users, MapPin, Clock, Zap, Star, Search,
  CircleDot, Award, ChevronRight, ChevronDown, Heart,
  Timer, Bell, Shield, BarChart3, Calendar, X,
  CheckCircle, ArrowRight, Bookmark, BookmarkCheck,
  DollarSign, ExternalLink, Flag, Target, Hash,
  Camera, Gift, Flame, Crown, PartyPopper, Sparkles,
  ThumbsUp, Share2, ImagePlus
} from "lucide-react";
import { useEvent } from "../context/EventContext";
import { useRealtimeMatches, useRealtimeStandings, useRealtimeTeams, useRealtimeAnnouncements, useRealtimeAreas } from "../hooks/useRealtime";
import { brackets as bracketsApi } from "../services/api";

/* ═══════════════════════════════════════════════════════════
   FAN ENGAGEMENT — TODO: needs DB tables for fan_follows,
   fan_donations, sponsor_quizzes, photo_contest_entries
   ═══════════════════════════════════════════════════════════ */
const FAN_COUNTS = {
  "Pallino Pushers": 24, "Rolling Stones": 19, "Court Jesters": 15, "Lawn & Order": 12,
  "Bocce Ballers": 11, "Gutter Queens": 10, "The Underdogs": 8, "Roll Models": 7,
  "Ball Busters": 6, "Pin Droppers": 5,
};
const FAN_DONATIONS = {
  "Rolling Stones": 680, "Pallino Pushers": 520, "Court Jesters": 340, "Lawn & Order": 290,
  "Gutter Queens": 210, "Bocce Ballers": 180, "The Underdogs": 150, "Roll Models": 120,
  "Pin Droppers": 80, "Ball Busters": 60,
};
const SPONSOR_QUIZ = [
  { q: "What does Tall Tree Health specialize in?", options: ["Community wellness", "Car insurance", "Pet grooming", "Landscaping"], answer: 0 },
  { q: "Which sponsor has been serving the community since 1985?", options: ["Beacon Law", "Island Savings", "Christie's Pub", "Victoria Plumbing"], answer: 3 },
  { q: "What is Christie's Pub's event day offer?", options: ["Free dessert", "Burger & beer for $20", "50% off nachos", "Kids eat free"], answer: 1 },
];
const PHOTO_ENTRIES = [
  { id: 1, fan: "Rachel M.", team: "Pallino Pushers", caption: "Team spirit!", votes: 34, time: "1:20 PM" },
  { id: 2, fan: "Steve K.", team: "Rolling Stones", caption: "Can't stop, won't stop!", votes: 28, time: "12:45 PM" },
  { id: 3, fan: "Maria L.", team: "Court Jesters", caption: "Jester energy!", votes: 19, time: "11:30 AM" },
  { id: 4, fan: "Jake T.", team: "Lawn & Order", caption: "Justice on the lawn", votes: 15, time: "2:00 PM" },
];

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const card = { background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 14, padding: 16 };
const badge = (c) => ({ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: c + "18", color: c, textTransform: "uppercase", letterSpacing: 0.5 });

/* ═══════════════════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════════════════ */
function Header({ onSearch }) {
  const { config } = useEvent();
  const B = config.brand;
  const EVENT = config.event;
  return (
    <header style={{ background: `${B.dark}ee`, backdropFilter: "blur(12px)", borderBottom: "1px solid #ffffff10", padding: "12px 16px", position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${B.primary}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trophy size={16} color={B.primary} />
          </div>
          <div>
            <p className="fd" style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{EVENT.name}</p>
            <p className="fb" style={{ fontSize: 10, color: "#ffffff50" }}>LIVE · {EVENT.date}</p>
          </div>
        </div>
        <button onClick={onSearch} style={{ width: 36, height: 36, borderRadius: 10, background: "#ffffff08", border: "1px solid #ffffff15", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Search size={16} color="#ffffff60" />
        </button>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════
   SEARCH OVERLAY
   ═══════════════════════════════════════════════════════════ */
function SearchOverlay({ teams: TEAMS, onClose, onTeamSelect }) {
  const { config } = useEvent();
  const B = config.brand;
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q.trim()) return [];
    return TEAMS.filter(t => t.name.toLowerCase().includes(q.toLowerCase()) || t.captain.toLowerCase().includes(q.toLowerCase()));
  }, [q]);

  return (
    <div style={{ position: "fixed", inset: 0, background: `${B.dark}f5`, zIndex: 100, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 16, borderBottom: "1px solid #ffffff10" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#ffffff40" }} />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search teams or captains..."
              style={{ width: "100%", padding: "12px 12px 12px 40px", background: "#ffffff08", border: "1px solid #ffffff20", borderRadius: 12, color: "#fff", fontSize: 15, fontFamily: "'Inter',sans-serif", outline: "none" }} />
          </div>
          <button onClick={onClose} style={{ padding: "10px 14px", borderRadius: 10, background: "#ffffff08", border: "none", color: "#ffffff60", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Inter',sans-serif" }}>Cancel</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {q && results.length === 0 && <p className="fb" style={{ textAlign: "center", color: "#ffffff30", padding: 40, fontSize: 14 }}>No teams found</p>}
        {results.map(t => (
          <button key={t.id} onClick={() => { onTeamSelect(t); onClose(); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#ffffff04", border: "1px solid #ffffff08", borderRadius: 12, marginBottom: 8, cursor: "pointer", textAlign: "left" }}>
            <div>
              <p className="fb" style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{t.name}</p>
              <p className="fb" style={{ fontSize: 12, color: "#ffffff50" }}>Captain: {t.captain} · Pool {t.pool}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>{t.w}W</span>
              <span className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>{t.l}L</span>
              <ChevronRight size={16} color="#ffffff30" />
            </div>
          </button>
        ))}
        {!q && (
          <div style={{ textAlign: "center", padding: 40, color: "#ffffff20" }}>
            <Search size={32} style={{ marginBottom: 12 }} />
            <p className="fb" style={{ fontSize: 14 }}>Search for a team to see their schedule and results</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEAM PROFILE SHEET
   ═══════════════════════════════════════════════════════════ */
function TeamSheet({ team, schedule: SCHEDULE, teams: TEAMS, onClose }) {
  const { config } = useEvent();
  const B = config.brand;
  const matches = SCHEDULE.filter(m => m.a === team.name || m.b === team.name);
  const nextMatch = matches.find(m => m.status === "live" || m.status === "upcoming");

  return (
    <div className="slide-up" style={{ position: "fixed", inset: 0, background: `${B.dark}f8`, zIndex: 90, overflow: "auto" }}>
      <div style={{ padding: 16 }}>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#ffffff50", cursor: "pointer", fontSize: 13, fontFamily: "'Inter',sans-serif", marginBottom: 16 }}>
          <X size={16} /> Close
        </button>

        {/* Team Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `${B.accent}15`, border: `1px solid ${B.accent}25`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <span className="fd" style={{ fontSize: 28, fontWeight: 900, color: B.accent }}>{team.name.charAt(0)}</span>
          </div>
          <h2 className="fd" style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>{team.name}</h2>
          {team.slogan && <p className="fb" style={{ fontSize: 13, color: B.accent, fontStyle: "italic", marginTop: 4 }}>"{team.slogan}"</p>}
          <p className="fb" style={{ fontSize: 12, color: "#ffffff50", marginTop: 6 }}>Captain: {team.captain} · Pool {team.pool}</p>
          {team.eliminated && <span style={{ ...badge("#ef4444"), marginTop: 8, display: "inline-flex" }}>Eliminated</span>}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
          {[{ l: "Won", v: team.w, c: "#22c55e" }, { l: "Lost", v: team.l, c: "#ef4444" }, { l: "PF", v: team.pf, c: "#fff" }, { l: "PA", v: team.pa, c: "#ffffff80" }].map((s, i) => (
            <div key={i} style={{ ...card, textAlign: "center", padding: 12 }}>
              <p className="fb" style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</p>
              <p className="fb" style={{ fontSize: 10, color: "#ffffff50", textTransform: "uppercase" }}>{s.l}</p>
            </div>
          ))}
        </div>

        {/* Next Match */}
        {nextMatch && (
          <div style={{ background: `${B.accent}08`, border: `1px solid ${B.accent}25`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <p className="fb" style={{ fontSize: 11, fontWeight: 700, color: B.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              {nextMatch.status === "live" ? "🔴 Playing Now" : "Up Next"}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p className="fb" style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>vs {nextMatch.a === team.name ? nextMatch.b : nextMatch.a}</p>
                <p className="fb" style={{ fontSize: 12, color: "#ffffff60" }}>{nextMatch.round} · Court {nextMatch.court} · {nextMatch.time}</p>
              </div>
              {nextMatch.status === "live" && nextMatch.sa !== null && (
                <div style={{ textAlign: "right" }}>
                  <p className="fd" style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>
                    {nextMatch.a === team.name ? nextMatch.sa : nextMatch.sb}
                    <span style={{ color: "#ffffff30", margin: "0 4px" }}>-</span>
                    {nextMatch.a === team.name ? nextMatch.sb : nextMatch.sa}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Match History */}
        <h3 className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#ffffff60", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Match History</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {matches.map(m => {
            const isTeamA = m.a === team.name;
            const myScore = isTeamA ? m.sa : m.sb;
            const theirScore = isTeamA ? m.sb : m.sa;
            const opponent = isTeamA ? m.b : m.a;
            const won = myScore !== null && myScore > theirScore;
            return (
              <div key={m.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={badge(m.status === "live" ? "#22c55e" : m.status === "completed" ? "#6b7280" : "#f59e0b")}>{m.round}</span>
                    {m.status === "completed" && myScore !== null && (
                      <span style={badge(won ? "#22c55e" : "#ef4444")}>{won ? "W" : "L"}</span>
                    )}
                  </div>
                  <p className="fb" style={{ fontSize: 14, fontWeight: 600, color: "#ffffffcc", marginTop: 6 }}>vs {opponent}</p>
                  <p className="fb" style={{ fontSize: 11, color: "#ffffff40" }}>Court {m.court} · {m.time}</p>
                </div>
                {myScore !== null && (
                  <p className="fd" style={{ fontSize: 24, fontWeight: 900, color: won ? "#22c55e" : "#ffffff60" }}>
                    {myScore}<span style={{ color: "#ffffff20", margin: "0 3px" }}>-</span>{theirScore}
                  </p>
                )}
                {myScore === null && <span className="fb" style={{ fontSize: 12, color: "#ffffff30" }}>—</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: COURTS
   ═══════════════════════════════════════════════════════════ */
function CourtsTab({ courts: COURTS, teams: TEAMS, onTeamSelect }) {
  const { config } = useEvent();
  const B = config.brand;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {COURTS.map(c => (
        <div key={c.num} style={{ ...card, borderColor: c.status === "live" ? B.accent + "30" : "#ffffff10" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: c.a ? 12 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CircleDot size={14} color={c.status === "live" ? "#22c55e" : c.status === "completed" ? "#6b7280" : "#ffffff20"} className={c.status === "live" ? "pulse" : ""} />
              <span className="fb" style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Court {c.num}</span>
            </div>
            {c.status === "live" && <span style={badge("#22c55e")}>Live · {c.round}</span>}
            {c.status === "completed" && <span style={badge("#6b7280")}>Done</span>}
            {c.status === "available" && <span style={badge("#ffffff30")}>Open</span>}
          </div>
          {c.a && (
            <div style={{ background: "#ffffff04", borderRadius: 10, overflow: "hidden" }}>
              <button onClick={() => { const t = TEAMS.find(t => t.name === c.a); if (t) onTeamSelect(t); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #ffffff06", cursor: "pointer", textAlign: "left" }}>
                <span className="fb" style={{ fontSize: 14, fontWeight: 700, color: c.sa >= (c.sb || 0) ? "#fff" : "#ffffffaa" }}>{c.a}</span>
                <span className="fd" style={{ fontSize: 24, fontWeight: 900, color: c.sa !== null ? (c.sa >= c.sb ? B.accent : "#ffffff60") : "#ffffff20" }}>{c.sa ?? "—"}</span>
              </button>
              <button onClick={() => { const t = TEAMS.find(t => t.name === c.b); if (t) onTeamSelect(t); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", width: "100%", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                <span className="fb" style={{ fontSize: 14, fontWeight: 700, color: c.sb >= (c.sa || 0) ? "#fff" : "#ffffffaa" }}>{c.b}</span>
                <span className="fd" style={{ fontSize: 24, fontWeight: 900, color: c.sb !== null ? (c.sb >= c.sa ? B.accent : "#ffffff60") : "#ffffff20" }}>{c.sb ?? "—"}</span>
              </button>
            </div>
          )}
          {!c.a && <p className="fb" style={{ fontSize: 13, color: "#ffffff20", textAlign: "center", padding: 8 }}>No match assigned</p>}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: STANDINGS
   ═══════════════════════════════════════════════════════════ */
function StandingsTab({ pools: POOLS, teams: TEAMS, onTeamSelect }) {
  const { config } = useEvent();
  const B = config.brand;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {POOLS.map((pool, pi) => (
        <div key={pi} style={{ borderRadius: 14, border: "1px solid #ffffff10", overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", background: `${B.secondary}15`, borderBottom: "1px solid #ffffff10" }}>
            <h3 className="fd" style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{pool.name}</h3>
          </div>
          {pool.teams.map((t, i) => (
            <button key={i} onClick={() => { const team = TEAMS.find(tm => tm.name === t.name); if (team) onTeamSelect(team); }}
              style={{ display: "flex", alignItems: "center", width: "100%", padding: "12px 16px", background: i < 2 ? `${B.secondary}06` : "transparent", border: "none", borderBottom: i < pool.teams.length - 1 ? "1px solid #ffffff06" : "none", cursor: "pointer", textAlign: "left", gap: 12 }}>
              <span className="fb" style={{ fontSize: 16, fontWeight: 900, color: i < 2 ? B.accent : "#ffffff40", width: 24 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <p className="fb" style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{t.name}</p>
              </div>
              <span className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", width: 28, textAlign: "center" }}>{t.w}W</span>
              <span className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", width: 28, textAlign: "center" }}>{t.l}L</span>
              <span className="fb" style={{ fontSize: 14, fontWeight: 900, color: B.accent, width: 32, textAlign: "right" }}>{t.pts}</span>
              <ChevronRight size={14} color="#ffffff20" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: BRACKET
   ═══════════════════════════════════════════════════════════ */
function BracketTab({ schedule: SCHEDULE, teams: TEAMS, onTeamSelect }) {
  const { config } = useEvent();
  const B = config.brand;
  // TODO: derive display labels (QF/SF/Final) from bracket.total_rounds
  const rounds = useMemo(() => {
    const bracketMatches = SCHEDULE.filter(m => m.bracketId != null);
    const roundMap = {};
    bracketMatches.forEach(m => {
      if (!roundMap[m.round]) roundMap[m.round] = [];
      roundMap[m.round].push(m);
    });
    return Object.keys(roundMap)
      .sort((a, b) => Number(a) - Number(b))
      .map(round => ({ label: `Round ${round}`, matches: roundMap[round] }));
  }, [SCHEDULE]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {rounds.map((r, ri) => (
        <div key={ri}>
          <p className="fb" style={{ fontSize: 12, fontWeight: 700, color: B.accent, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>{r.label}</p>
          <div style={{ display: "grid", gap: 8 }}>
            {r.matches.map((m, mi) => {
              const aWon = m.sa !== null && m.sa > m.sb;
              const bWon = m.sb !== null && m.sb > m.sa;
              return (
                <div key={mi} style={{ ...card, padding: 0, overflow: "hidden", borderColor: m.status === "live" ? "#22c55e30" : "#ffffff10" }}>
                  <button onClick={() => { const t = TEAMS.find(t => t.name === m.a); if (t) onTeamSelect(t); }}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", width: "100%", background: aWon ? "#22c55e06" : "transparent", border: "none", borderBottom: "1px solid #ffffff06", cursor: m.a !== "TBD" ? "pointer" : "default", textAlign: "left" }}>
                    <span className="fb" style={{ fontSize: 14, fontWeight: 700, color: aWon ? "#fff" : m.a === "TBD" ? "#ffffff30" : "#ffffffaa" }}>{m.a}</span>
                    <span className="fd" style={{ fontSize: 20, fontWeight: 900, color: m.sa !== null ? (aWon ? "#22c55e" : "#ffffff50") : "#ffffff20" }}>{m.sa ?? "—"}</span>
                  </button>
                  <button onClick={() => { const t = TEAMS.find(t => t.name === m.b); if (t) onTeamSelect(t); }}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", width: "100%", background: bWon ? "#22c55e06" : "transparent", border: "none", cursor: m.b !== "TBD" ? "pointer" : "default", textAlign: "left" }}>
                    <span className="fb" style={{ fontSize: 14, fontWeight: 700, color: bWon ? "#fff" : m.b === "TBD" ? "#ffffff30" : "#ffffffaa" }}>{m.b}</span>
                    <span className="fd" style={{ fontSize: 20, fontWeight: 900, color: m.sb !== null ? (bWon ? "#22c55e" : "#ffffff50") : "#ffffff20" }}>{m.sb ?? "—"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {/* Trophy */}
      <div style={{ textAlign: "center", padding: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: `${B.accent}15`, border: `1px solid ${B.accent}25`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
          <Trophy size={24} color={B.accent} />
        </div>
        <p className="fd" style={{ fontSize: 14, fontWeight: 800, color: B.accent }}>Champion TBD</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: SCHEDULE
   ═══════════════════════════════════════════════════════════ */
function ScheduleTab({ schedule: SCHEDULE, teams: TEAMS, onTeamSelect }) {
  const { config } = useEvent();
  const B = config.brand;
  const grouped = useMemo(() => {
    const map = {};
    SCHEDULE.forEach(m => {
      if (!map[m.time]) map[m.time] = [];
      map[m.time].push(m);
    });
    return Object.entries(map);
  }, [SCHEDULE]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {grouped.map(([time, matches]) => (
        <div key={time}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Clock size={12} color="#ffffff40" />
            <span className="fb" style={{ fontSize: 12, fontWeight: 700, color: "#ffffff50" }}>{time}</span>
            {matches.some(m => m.status === "live") && <span style={badge("#22c55e")}>Now</span>}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {matches.map(m => (
              <div key={m.id} style={{ ...card, padding: 12, borderColor: m.status === "live" ? "#22c55e25" : "#ffffff10", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "center", minWidth: 40 }}>
                  <p className="fb" style={{ fontSize: 10, fontWeight: 700, color: "#ffffff40", textTransform: "uppercase" }}>CT {m.court}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button onClick={() => { const t = TEAMS.find(t => t.name === m.a); if (t) onTeamSelect(t); }}
                      style={{ background: "none", border: "none", cursor: m.a !== "TBD" ? "pointer" : "default", textAlign: "left", padding: 0 }}>
                      <span className="fb" style={{ fontSize: 13, fontWeight: m.sa > m.sb ? 800 : 600, color: m.sa > m.sb ? "#fff" : "#ffffffaa" }}>{m.a}</span>
                    </button>
                    <span className="fd" style={{ fontSize: 16, fontWeight: 900, color: m.sa !== null ? (m.sa > m.sb ? "#22c55e" : "#ffffff50") : "#ffffff20" }}>{m.sa ?? "—"}</span>
                  </div>
                  <div style={{ height: 1, background: "#ffffff06", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button onClick={() => { const t = TEAMS.find(t => t.name === m.b); if (t) onTeamSelect(t); }}
                      style={{ background: "none", border: "none", cursor: m.b !== "TBD" ? "pointer" : "default", textAlign: "left", padding: 0 }}>
                      <span className="fb" style={{ fontSize: 13, fontWeight: m.sb > m.sa ? 800 : 600, color: m.sb > m.sa ? "#fff" : "#ffffffaa" }}>{m.b}</span>
                    </button>
                    <span className="fd" style={{ fontSize: 16, fontWeight: 900, color: m.sb !== null ? (m.sb > m.sa ? "#22c55e" : "#ffffff50") : "#ffffff20" }}>{m.sb ?? "—"}</span>
                  </div>
                </div>
                <span style={badge(m.status === "live" ? "#22c55e" : m.status === "completed" ? "#6b7280" : "#f59e0b")}>{m.round}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: FEED (Announcements + Fundraising)
   ═══════════════════════════════════════════════════════════ */
function FeedTab({ announcements: ANNOUNCEMENTS }) {
  const { config } = useEvent();
  const B = config.brand;
  const raised = 4250;
  const goal = 15000;
  const pct = Math.min(100, (raised / goal) * 100);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Fundraising */}
      <div style={{ ...card, background: `${B.secondary}08`, borderColor: `${B.secondary}20` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Heart size={14} color={B.accent} />
          <span className="fb" style={{ fontSize: 12, fontWeight: 700, color: B.accent, textTransform: "uppercase", letterSpacing: 1 }}>Fundraising</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span className="fd" style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>${raised.toLocaleString()}</span>
          <span className="fb" style={{ fontSize: 12, color: "#ffffff50" }}>of ${goal.toLocaleString()}</span>
        </div>
        <div style={{ height: 10, background: "#ffffff10", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 5, background: `linear-gradient(90deg, ${B.secondary}, ${B.accent})`, width: `${pct}%` }} />
        </div>
      </div>

      {/* Announcements */}
      <div>
        <p className="fb" style={{ fontSize: 12, fontWeight: 700, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Announcements</p>
        <div style={{ display: "grid", gap: 8 }}>
          {ANNOUNCEMENTS.map(a => (
            <div key={a.id} style={{ ...card, padding: 14, borderColor: a.priority === "high" ? B.accent + "20" : "#ffffff10", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Bell size={14} color={a.priority === "high" ? B.accent : "#ffffff40"} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <p className="fb" style={{ fontSize: 13, color: "#ffffffcc", lineHeight: 1.5 }}>{a.msg}</p>
                <p className="fb" style={{ fontSize: 11, color: "#ffffff30", marginTop: 4 }}>{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEAM PICKER (shown on first visit)
   ═══════════════════════════════════════════════════════════ */
function TeamPicker({ teams: TEAMS, onPick }) {
  const { config } = useEvent();
  const B = config.brand;
  const randomPick = () => {
    const idx = Math.floor(Math.random() * TEAMS.length);
    onPick(TEAMS[idx]);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: B.dark, zIndex: 200, display: "flex", flexDirection: "column", overflow: "auto" }}>
      <div style={{ padding: "40px 20px 20px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: `${B.accent}15`, border: `1px solid ${B.accent}25`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Flame size={28} color={B.accent} />
        </div>
        <h1 className="fd" style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Pick Your Team!</h1>
        <p className="fb" style={{ fontSize: 14, color: "#ffffff60", lineHeight: 1.5, maxWidth: 320, margin: "0 auto 8px" }}>
          Follow a team to unlock the Fan Zone — sponsor quizzes, photo contests, and leaderboards.
        </p>
        <p className="fb" style={{ fontSize: 12, color: "#ffffff40", marginBottom: 24 }}>
          🏆 Biggest fan base wins a trophy · 💰 Top donating fans win too!
        </p>
        <button onClick={randomPick} style={{ padding: "10px 24px", borderRadius: 12, background: "#ffffff08", border: "1px solid #ffffff15", color: "#ffffffaa", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
          <Sparkles size={14} /> Surprise me — pick randomly!
        </button>
      </div>

      <div style={{ padding: "0 16px 40px", display: "grid", gap: 8 }}>
        {TEAMS.filter(t => !t.eliminated).map(t => (
          <button key={t.id} onClick={() => onPick(t)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px",
            background: "#ffffff04", border: "1px solid #ffffff10", borderRadius: 14, cursor: "pointer", textAlign: "left", width: "100%",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${B.accent}12`, border: `1px solid ${B.accent}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="fd" style={{ fontSize: 20, fontWeight: 900, color: B.accent }}>{t.name.charAt(0)}</span>
              </div>
              <div>
                <p className="fb" style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{t.name}</p>
                {t.slogan && <p className="fb" style={{ fontSize: 12, color: "#ffffff50", fontStyle: "italic" }}>"{t.slogan}"</p>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p className="fb" style={{ fontSize: 13, color: "#ffffff60" }}>{t.w}W-{t.l}L</p>
              <p className="fb" style={{ fontSize: 11, color: "#ffffff30" }}>{FAN_COUNTS[t.name] || 0} fans</p>
            </div>
          </button>
        ))}
        <div style={{ borderTop: "1px solid #ffffff10", paddingTop: 12, marginTop: 4 }}>
          <p className="fb" style={{ fontSize: 11, color: "#ffffff30", textAlign: "center", marginBottom: 8 }}>Eliminated teams</p>
          {TEAMS.filter(t => t.eliminated).map(t => (
            <button key={t.id} onClick={() => onPick(t)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px",
              background: "transparent", border: "1px solid #ffffff06", borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%", marginBottom: 6, opacity: 0.5,
            }}>
              <span className="fb" style={{ fontSize: 14, fontWeight: 600, color: "#ffffff80" }}>{t.name}</span>
              <span className="fb" style={{ fontSize: 12, color: "#ffffff30" }}>{t.w}W-{t.l}L</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FAN ZONE TAB
   ═══════════════════════════════════════════════════════════ */
function FanZoneTab({ myTeam, onChangeTeam }) {
  const { config } = useEvent();
  const B = config.brand;
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizDone, setQuizDone] = useState(false);
  const [photoSubmitted, setPhotoSubmitted] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");
  const [votedPhotos, setVotedPhotos] = useState({});

  const correctCount = quizAnswers.filter((a, i) => a === SPONSOR_QUIZ[i].answer).length;
  const bonusUnlocked = quizDone && correctCount === SPONSOR_QUIZ.length;

  const handleQuizAnswer = (answerIdx) => {
    const newAnswers = [...quizAnswers, answerIdx];
    setQuizAnswers(newAnswers);
    if (newAnswers.length >= SPONSOR_QUIZ.length) {
      setTimeout(() => setQuizDone(true), 600);
    } else {
      setTimeout(() => setQuizStep(quizStep + 1), 600);
    }
  };

  const votePhoto = (id) => {
    if (!votedPhotos[id]) setVotedPhotos(p => ({ ...p, [id]: true }));
  };

  // Leaderboards
  const fanRanking = Object.entries(FAN_COUNTS).sort((a, b) => b[1] - a[1]);
  const donationRanking = Object.entries(FAN_DONATIONS).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* My Team Banner */}
      <div style={{ ...card, background: `${B.accent}08`, borderColor: `${B.accent}25`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${B.accent}15`, border: `1px solid ${B.accent}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="fd" style={{ fontSize: 20, fontWeight: 900, color: B.accent }}>{myTeam.name.charAt(0)}</span>
          </div>
          <div>
            <p className="fb" style={{ fontSize: 11, fontWeight: 700, color: B.accent, textTransform: "uppercase", letterSpacing: 1 }}>Your Team</p>
            <p className="fb" style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{myTeam.name}</p>
          </div>
        </div>
        <button onClick={onChangeTeam} style={{ padding: "6px 12px", borderRadius: 8, background: "#ffffff08", border: "1px solid #ffffff15", color: "#ffffff60", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Change</button>
      </div>

      {/* Sponsor Quiz */}
      <div style={{ ...card, borderColor: bonusUnlocked ? "#22c55e25" : "#ffffff10" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Gift size={16} color={B.accent} />
          <span className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Sponsor Quiz</span>
          {bonusUnlocked && <span style={badge("#22c55e")}>Bonus Unlocked!</span>}
        </div>

        {!quizDone ? (
          <>
            <p className="fb" style={{ fontSize: 12, color: "#ffffff50", marginBottom: 12 }}>Answer all 3 correctly to upgrade your gift basket discount from 10% to 15%!</p>
            <div style={{ background: "#ffffff04", borderRadius: 12, padding: 16 }}>
              <p className="fb" style={{ fontSize: 11, color: B.accent, fontWeight: 700, marginBottom: 6 }}>Question {quizStep + 1} of {SPONSOR_QUIZ.length}</p>
              <p className="fb" style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 14, lineHeight: 1.4 }}>{SPONSOR_QUIZ[quizStep].q}</p>
              <div style={{ display: "grid", gap: 8 }}>
                {SPONSOR_QUIZ[quizStep].options.map((opt, i) => {
                  const answered = quizAnswers[quizStep] !== undefined;
                  const isCorrect = i === SPONSOR_QUIZ[quizStep].answer;
                  const isSelected = quizAnswers[quizStep] === i;
                  return (
                    <button key={i} onClick={() => !answered && handleQuizAnswer(i)} disabled={answered}
                      style={{
                        padding: "12px 16px", borderRadius: 10, textAlign: "left", cursor: answered ? "default" : "pointer",
                        background: answered ? (isCorrect ? "#22c55e15" : isSelected ? "#ef444415" : "#ffffff04") : "#ffffff06",
                        border: `1px solid ${answered ? (isCorrect ? "#22c55e30" : isSelected ? "#ef444430" : "#ffffff08") : "#ffffff12"}`,
                        color: answered ? (isCorrect ? "#22c55e" : isSelected ? "#ef4444" : "#ffffff60") : "#ffffffcc",
                        fontSize: 13, fontWeight: 600, fontFamily: "'Inter',sans-serif",
                      }}>
                      {answered && isCorrect && <CheckCircle size={14} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />}
                      {answered && isSelected && !isCorrect && <X size={14} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 12 }}>
            {bonusUnlocked ? (
              <>
                <PartyPopper size={32} color="#22c55e" style={{ marginBottom: 8 }} />
                <p className="fb" style={{ fontSize: 16, fontWeight: 800, color: "#22c55e", marginBottom: 4 }}>3/3 — Perfect Score!</p>
                <p className="fb" style={{ fontSize: 13, color: "#ffffffaa" }}>Your gift basket discount is now <strong style={{ color: "#22c55e" }}>15%</strong> instead of 10%!</p>
              </>
            ) : (
              <>
                <p className="fb" style={{ fontSize: 16, fontWeight: 800, color: B.accent, marginBottom: 4 }}>{correctCount}/3 Correct</p>
                <p className="fb" style={{ fontSize: 13, color: "#ffffffaa" }}>
                  {correctCount === 0 ? "Nice try! Your 10% discount still applies." : correctCount === 1 ? "Close! Your 10% discount still applies." : "Almost! Your 10% discount still applies."}
                </p>
                <button onClick={() => { setQuizStep(0); setQuizAnswers([]); setQuizDone(false); }}
                  style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, background: "#ffffff08", border: "1px solid #ffffff15", color: "#ffffffaa", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Try Again</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Photo Contest */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Camera size={16} color={B.accent} />
          <span className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Fan Photo Contest</span>
          <span style={badge(B.primary)}>🍺 Winner gets a free beer!</span>
        </div>

        {!photoSubmitted ? (
          <div style={{ background: "#ffffff04", borderRadius: 12, padding: 20, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "#ffffff08", border: "2px dashed #ffffff20", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", cursor: "pointer" }}>
              <ImagePlus size={24} color="#ffffff40" />
            </div>
            <p className="fb" style={{ fontSize: 13, color: "#ffffffaa", marginBottom: 12 }}>Snap your best fan moment!</p>
            <input value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} placeholder="Add a caption..."
              style={{ width: "100%", padding: "10px 14px", background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 10, color: "#fff", fontSize: 13, fontFamily: "'Inter',sans-serif", outline: "none", marginBottom: 12, textAlign: "center" }} />
            <button onClick={() => setPhotoSubmitted(true)} style={{ padding: "10px 20px", borderRadius: 10, background: B.primary, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Camera size={14} /> Submit Photo
            </button>
          </div>
        ) : (
          <div style={{ background: "#22c55e08", borderRadius: 12, padding: 16, textAlign: "center", border: "1px solid #22c55e20" }}>
            <CheckCircle size={24} color="#22c55e" style={{ marginBottom: 8 }} />
            <p className="fb" style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>Photo submitted!</p>
            <p className="fb" style={{ fontSize: 12, color: "#ffffff60" }}>Winner announced at the closing ceremony.</p>
          </div>
        )}

        {/* Photo Gallery / Voting */}
        <div style={{ marginTop: 16 }}>
          <p className="fb" style={{ fontSize: 12, fontWeight: 700, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Top Photos — Vote for your favorite!</p>
          <div style={{ display: "grid", gap: 8 }}>
            {PHOTO_ENTRIES.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff08" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: "#ffffff08", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Camera size={16} color="#ffffff40" />
                  </div>
                  <div>
                    <p className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{p.fan} <span style={{ fontWeight: 400, color: "#ffffff50" }}>· {p.team}</span></p>
                    <p className="fb" style={{ fontSize: 12, color: "#ffffff60" }}>"{p.caption}"</p>
                  </div>
                </div>
                <button onClick={() => votePhoto(p.id)} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8,
                  background: votedPhotos[p.id] ? `${B.accent}15` : "#ffffff06",
                  border: `1px solid ${votedPhotos[p.id] ? B.accent + "30" : "#ffffff12"}`,
                  color: votedPhotos[p.id] ? B.accent : "#ffffff60",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif",
                }}>
                  <ThumbsUp size={12} /> {(votedPhotos[p.id] ? p.votes + 1 : p.votes)}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fan Base Leaderboard */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Crown size={16} color={B.accent} />
          <span className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Biggest Fan Base</span>
          <span style={badge(B.accent)}>🏆 Trophy</span>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {fanRanking.slice(0, 5).map(([name, count], i) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: name === myTeam.name ? `${B.accent}08` : "transparent", borderRadius: 8, border: name === myTeam.name ? `1px solid ${B.accent}20` : "1px solid transparent" }}>
              <span className="fb" style={{ fontSize: 16, fontWeight: 900, color: i === 0 ? B.accent : "#ffffff40", width: 24 }}>{i + 1}</span>
              <span className="fb" style={{ fontSize: 13, fontWeight: 700, color: name === myTeam.name ? "#fff" : "#ffffffaa", flex: 1 }}>
                {name} {name === myTeam.name && <span style={{ fontSize: 10, color: B.accent }}>★ You</span>}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Users size={12} color="#ffffff40" />
                <span className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#ffffffcc" }}>{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Donation Leaderboard */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Heart size={16} color={B.primary} />
          <span className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Donation Challenge</span>
          <span style={badge(B.primary)}>🏆 Trophy</span>
        </div>
        <p className="fb" style={{ fontSize: 11, color: "#ffffff40", marginBottom: 14 }}>Which team's fans donate the most to fight elder fraud? Challenge runs until next Friday!</p>
        <div style={{ display: "grid", gap: 6 }}>
          {donationRanking.slice(0, 5).map(([name, amount], i) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: name === myTeam.name ? `${B.primary}08` : "transparent", borderRadius: 8, border: name === myTeam.name ? `1px solid ${B.primary}20` : "1px solid transparent" }}>
              <span className="fb" style={{ fontSize: 16, fontWeight: 900, color: i === 0 ? B.primary : "#ffffff40", width: 24 }}>{i + 1}</span>
              <span className="fb" style={{ fontSize: 13, fontWeight: 700, color: name === myTeam.name ? "#fff" : "#ffffffaa", flex: 1 }}>
                {name} {name === myTeam.name && <span style={{ fontSize: 10, color: B.primary }}>★ You</span>}
              </span>
              <span className="fb" style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? B.primary : "#ffffffcc" }}>${amount}</span>
            </div>
          ))}
        </div>
        <button style={{ marginTop: 14, width: "100%", padding: "12px 16px", borderRadius: 10, background: `${B.primary}15`, border: `1px solid ${B.primary}30`, color: B.primary, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Heart size={14} /> Donate for {myTeam.name}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════ */
export default function LivePage() {
  const { config, eventId } = useEvent();
  const B = config.brand;
  const EVENT = config.event;

  const CSS = useMemo(() => `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
.fd { font-family: 'Playfair Display', Georgia, serif; }
.fb { font-family: 'Inter', system-ui, sans-serif; }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
@keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
.pulse { animation: pulse 1.2s ease-in-out infinite; }
.slide-up { animation: slideUp .3s ease-out; }
`, [B.accent, B.dark, B.primary]);

  // ── Realtime data ──
  const { teams: rawTeams } = useRealtimeTeams(eventId);
  const { matches: rawMatches } = useRealtimeMatches(eventId);
  const { pools: rawPools } = useRealtimeStandings(eventId);
  const { data: rawAreas } = useRealtimeAreas(eventId);
  const { data: rawAnnouncements } = useRealtimeAnnouncements(eventId);
  const [rawBrackets, setRawBrackets] = useState([]);

  useEffect(() => {
    if (eventId) {
      bracketsApi.listWithMatches(eventId).then(setRawBrackets).catch(() => setRawBrackets([]));
    }
  }, [eventId]);

  // ── Adapter: TEAMS ──
  // Mock shape: { id, name, slogan, captain, w, l, pf, pa, pool, rank, eliminated, checkedIn }
  const TEAMS = useMemo(() => {
    const standingsMap = {};
    rawPools.forEach(p => {
      (p.pool_standings || []).forEach(s => {
        standingsMap[s.team_id || s.team?.id] = { ...s, poolName: p.name };
      });
    });

    return rawTeams.map(t => {
      const s = standingsMap[t.id] || {};
      const captain = (t.players || []).find(p => p.is_captain);
      return {
        id: t.id,
        name: t.name,
        slogan: t.slogan || "",
        captain: captain?.full_name || "",
        w: s.won || 0,
        l: s.lost || 0,
        pf: s.points_for || 0,
        pa: s.points_against || 0,
        pool: s.poolName || t.pool?.name || "",
        rank: s.pool_rank || 0,
        eliminated: t.eliminated || false,
        checkedIn: t.checked_in || false,
      };
    });
  }, [rawTeams, rawPools]);

  // ── Adapter: COURTS (playing areas merged with their current matches) ──
  // Mock shape: { num, status, a, b, sa, sb, round, updated }
  const COURTS = useMemo(() => {
    const areaMatchMap = {};
    rawMatches.forEach(m => {
      if (m.playing_area?.number != null && ["live", "score_entered", "disputed", "ready", "scheduled"].includes(m.status)) {
        const existing = areaMatchMap[m.playing_area.number];
        if (!existing || ["live", "score_entered", "disputed"].includes(m.status)) {
          areaMatchMap[m.playing_area.number] = m;
        }
      }
    });

    return rawAreas.map(area => {
      const m = areaMatchMap[area.number];
      const isLive = m && ["live", "score_entered", "disputed"].includes(m.status);
      const isUpcoming = m && ["scheduled", "ready"].includes(m.status);
      return {
        num: area.number,
        status: isLive ? "live" : isUpcoming ? "upcoming" : m?.status === "completed" ? "completed" : "available",
        a: m?.team_a?.name || null,
        b: m?.team_b?.name || null,
        sa: m?.team_a_score ?? null,
        sb: m?.team_b_score ?? null,
        round: m?.round || "",
        updated: false, // No flash animation tracking from DB currently
      };
    });
  }, [rawAreas, rawMatches]);

  // ── Adapter: SCHEDULE (all matches) ──
  // Mock shape: { id, time, round, court, a, b, sa, sb, status, bracketId }
  const SCHEDULE = useMemo(() => {
    return rawMatches.map(m => ({
      id: m.id,
      time: m.scheduled_time || "",
      round: m.round || "",
      court: m.playing_area?.number || 0,
      a: m.team_a?.name || "TBD",
      b: m.team_b?.name || "TBD",
      sa: m.team_a_score ?? null,
      sb: m.team_b_score ?? null,
      status: ["live", "score_entered", "disputed"].includes(m.status) ? "live"
            : m.status === "completed" ? "completed"
            : "upcoming",
      bracketId: m.bracket_id || null,
    }));
  }, [rawMatches]);

  // ── Adapter: POOLS ──
  // Mock shape: { name, teams: [{ name, w, l, pf, pa, pts }] }
  const POOLS = useMemo(() => {
    return rawPools.map(p => ({
      name: p.name,
      teams: (p.pool_standings || []).map(s => ({
        name: s.team?.name || "",
        w: s.won || 0,
        l: s.lost || 0,
        pf: s.points_for || 0,
        pa: s.points_against || 0,
        pts: s.ranking_points || 0,
      })),
    }));
  }, [rawPools]);

  // ── Adapter: ANNOUNCEMENTS ──
  // Mock shape: { id, time, msg, priority }
  const ANNOUNCEMENTS = useMemo(() => {
    return (rawAnnouncements || []).map(a => ({
      id: a.id,
      time: a.created_at ? new Date(a.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
      msg: a.message || "",
      priority: a.priority || "normal",
    }));
  }, [rawAnnouncements]);

  const [tab, setTab] = useState("courts");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [showPicker, setShowPicker] = useState(true);

  const handlePickTeam = (team) => {
    setMyTeam(team);
    setShowPicker(false);
  };

  const tabs = [
    { id: "courts", label: EVENT.areaLabel || "Courts", icon: CircleDot },
    { id: "standings", label: "Standings", icon: BarChart3 },
    { id: "bracket", label: "Bracket", icon: Trophy },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "fans", label: "Fan Zone", icon: Flame },
  ];

  const liveCount = COURTS.filter(c => c.status === "live").length;

  // Check if my team is playing right now
  const myTeamLive = myTeam ? COURTS.find(c => c.status === "live" && (c.a === myTeam.name || c.b === myTeam.name)) : null;

  return (
    <div style={{ minHeight: "100vh", background: B.dark, color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 70 }}>
      <style>{CSS}</style>

      {showPicker && <TeamPicker teams={TEAMS} onPick={handlePickTeam} />}

      <Header onSearch={() => setShowSearch(true)} />

      {/* Personalized banner if my team is live */}
      {myTeamLive && tab !== "fans" ? (
        <div style={{ padding: "12px 16px", background: `${B.accent}12`, borderBottom: `1px solid ${B.accent}25`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="pulse" style={{ width: 8, height: 8, borderRadius: 4, background: "#ef4444" }} />
            <span className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {myTeam.name} playing now!
            </span>
          </div>
          <span className="fb" style={{ fontSize: 14, fontWeight: 900, color: B.accent }}>
            {myTeamLive.a === myTeam.name ? myTeamLive.sa : myTeamLive.sb}
            <span style={{ color: "#ffffff30", margin: "0 3px" }}>-</span>
            {myTeamLive.a === myTeam.name ? myTeamLive.sb : myTeamLive.sa}
          </span>
        </div>
      ) : (
        <div style={{ padding: "12px 16px", background: `${B.primary}12`, borderBottom: `1px solid ${B.primary}20`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="pulse" style={{ width: 8, height: 8, borderRadius: 4, background: "#ef4444" }} />
            <span className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{liveCount} match{liveCount !== 1 ? "es" : ""} in progress</span>
          </div>
          <span className="fb" style={{ fontSize: 12, color: "#ffffff50" }}>Semi-Finals</span>
        </div>
      )}

      {/* Tab Content */}
      <div style={{ padding: 16 }}>
        {tab === "courts" && <CourtsTab courts={COURTS} teams={TEAMS} onTeamSelect={setSelectedTeam} />}
        {tab === "standings" && <StandingsTab pools={POOLS} teams={TEAMS} onTeamSelect={setSelectedTeam} />}
        {tab === "bracket" && <BracketTab schedule={SCHEDULE} teams={TEAMS} onTeamSelect={setSelectedTeam} />}
        {tab === "schedule" && <ScheduleTab schedule={SCHEDULE} teams={TEAMS} onTeamSelect={setSelectedTeam} />}
        {tab === "fans" && myTeam && <FanZoneTab myTeam={myTeam} onChangeTeam={() => setShowPicker(true)} />}
      </div>

      {/* Bottom Tab Bar */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `${B.dark}f0`, backdropFilter: "blur(12px)", borderTop: "1px solid #ffffff10", display: "flex", zIndex: 40, paddingBottom: "env(safe-area-inset-bottom, 0)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 0 8px", background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: tab === t.id ? B.accent : "#ffffff40", transition: "color 0.15s", position: "relative",
          }}>
            <t.icon size={20} />
            <span className="fb" style={{ fontSize: 10, fontWeight: 700 }}>{t.label}</span>
            {t.id === "courts" && liveCount > 0 && tab !== "courts" && (
              <div style={{ position: "absolute", top: 6, marginLeft: 16, width: 6, height: 6, borderRadius: 3, background: "#ef4444" }} />
            )}
            {t.id === "fans" && tab !== "fans" && (
              <div style={{ position: "absolute", top: 6, marginLeft: 16, width: 6, height: 6, borderRadius: 3, background: B.accent }} />
            )}
          </button>
        ))}
      </nav>

      {/* Overlays */}
      {showSearch && <SearchOverlay teams={TEAMS} onClose={() => setShowSearch(false)} onTeamSelect={setSelectedTeam} />}
      {selectedTeam && <TeamSheet team={selectedTeam} schedule={SCHEDULE} teams={TEAMS} onClose={() => setSelectedTeam(null)} />}
    </div>
  );
}
