import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import {
  Trophy, Users, DollarSign, Check, X, Search,
  ChevronRight, Eye, Shield, Calendar, Clock,
  Mail, Phone, Shirt, AlertCircle, Building2,
  Heart, HandHelping, Package, Zap, Star,
  FileText, Send, CreditCard, Banknote, UserCheck, UserX,
  CheckCircle, MoreHorizontal, RefreshCw, Bell,
  Monitor, Play, Pause, Settings, LogOut, Hash,
  Thermometer, Award, ClipboardList, MapPin, Gift, BarChart3,
  CircleDot, ArrowUpDown, ExternalLink, Download,
  Undo2, Save, CreditCard as Card, BookOpen, Printer,
  Timer, Ban, SkipForward, Shuffle, LayoutGrid, Sliders,
  BadgeCheck, QrCode, Scissors, UserPlus, Copy, Globe, ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { useEvent } from "../context/EventContext";
import { useAuth } from "../context/AuthContext";
import { registrations as registrationsApi, volunteers as volunteersApi, events as eventsApi, teams as teamsApi, players as playersApi, matches as matchesApi, announcements as announcementsApi, brackets as bracketsApi, activityLog, admin as adminApi, beneficiaries as beneficiariesApi, commitments as commitmentsApi, expenses as expensesApi, fanDonations as fanDonationsApi, ledger as ledgerApi, billing as billingApi } from "../services/api";
import { useRealtimeRegistrations, useRealtimeTeams, useRealtimeMatches, useRealtimeAreas } from "../hooks/useRealtime";
import { useScreenLock } from "../hooks/useScreenLock";
import { verifyBeneficiaryRegistration } from "../utils/verifyBeneficiaryRegistration";

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const S = {
  card: { background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 16, padding: 20 },
  input: { width: "100%", padding: "10px 14px", background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 10, color: "#fff", fontSize: 13, fontFamily: "'Inter',sans-serif", outline: "none" },
  badge: (c) => ({ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: c + "18", color: c, textTransform: "uppercase", letterSpacing: 0.5 }),
  btn: (bg, c = "#fff") => ({ padding: "8px 16px", borderRadius: 10, border: "none", background: bg, color: c, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif", display: "inline-flex", alignItems: "center", gap: 6 }),
  btnSm: (bg, c = "#fff") => ({ padding: "5px 12px", borderRadius: 8, border: "none", background: bg, color: c, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif", display: "inline-flex", alignItems: "center", gap: 4 }),
  th: { padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 1, textAlign: "left", borderBottom: "1px solid #ffffff10" },
  td: { padding: "12px 14px", fontSize: 13, color: "#ffffffcc", borderBottom: "1px solid #ffffff06" },
};

/* ═══════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════ */
// TODO: Pass 2 — wire to artifacts table or keep as static config
const INIT_ARTIFACTS = [
  { id: 1, type: "schedule", title: "Event Day Schedule", status: "draft", audience: "all" },
  { id: 2, type: "volunteer_package", title: "Volunteer Guide — Field Judges", status: "draft", audience: "volunteers" },
  { id: 3, type: "resource_directory", title: "Emergency & Staff Contacts", status: "draft", audience: "staff" },
  { id: 4, type: "gift_basket_page", title: "Digital Gift Basket", status: "draft", audience: "all" },
  { id: 5, type: "id_badges", title: "ID Badges — All Personnel", status: "draft", audience: "all" },
  { id: 6, type: "rules", title: "Tournament Rules", status: "draft", audience: "all" },
];

/* ═══════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════ */
function StatCard({ icon: Icon, label, value, sub, color }) {
  const { config } = useEvent();
  const resolvedColor = color || config.brand.accent;
  return (
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: resolvedColor + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={18} color={resolvedColor} /></div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      </div>
      <p style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 2 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "#ffffff50" }}>{sub}</p>}
    </div>
  );
}

function Badge({ status, label }) {
  const m = {
    paid: "#22c55e", pending: "#f59e0b", confirmed: "#22c55e", submitted: "#f59e0b", rejected: "#ef4444", approved: "#22c55e", declined: "#ef4444", draft: "#6b7280", review: "#3b82f6", published: "#22c55e",
    registration_open: "#22c55e", registration_closed: "#f59e0b", game_day: "#3b82f6", completed: "#8b5cf6", archived: "#6b7280",
  };
  return <span style={S.badge(m[status] || "#6b7280")}>{label || status}</span>;
}

function MethodIcon({ m }) {
  const I = { e_transfer: Send, stripe: CreditCard, cash: Banknote }[m] || DollarSign;
  return <I size={14} color="#ffffff50" />;
}

/* Sticky submit bar for batch pattern */
function SubmitBar({ count, onSubmit, onDiscard, submitting, error, disabled = false }) {
  const { config } = useEvent();
  const B = config.brand;
  if (count === 0) return null;
  return (
    <div style={{ position: "sticky", bottom: 0, left: 0, right: 0, background: `${B.accent}15`, borderTop: `2px solid ${B.accent}40`, backdropFilter: "blur(12px)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 40, marginTop: 20, borderRadius: "14px 14px 0 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: B.accent + "30", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: B.accent }}>{count}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: B.accent }}>pending change{count !== 1 ? "s" : ""}</span>
        {error && <span style={{ fontSize: 12, color: "#ef4444", marginLeft: 10 }}>{error}</span>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onDiscard} style={S.btn("#ffffff10", "#ffffffaa")}><Undo2 size={14} /> Discard All</button>
        <button onClick={onSubmit} disabled={submitting || disabled} style={S.btn(B.accent, B.dark)}><Save size={14} /> {submitting ? "Saving..." : "Submit Updates"}</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUILD — REGISTRATIONS (with batch submit)
   ═══════════════════════════════════════════════════════════ */
function RegistrationsPanel() {
  const { config, eventId } = useEvent();
  const { adminUser } = useAuth();
  const B = config.brand;

  const { data: rawRegs, loading: regsLoading, refetch: refetchRegs } = useRealtimeRegistrations(eventId);
  const { teams: allTeams, refetch: refetchTeams } = useRealtimeTeams(eventId);

  const { isActive, queuePosition, queueLength, activeAdminName, recordActivity } =
    useScreenLock(eventId, "registrations", adminUser?.id, adminUser?.display_name);
  const canEdit = isActive;

  // registration_id → team (with its joined players[]), for the foldout.
  // Keyed by String() since registrations.id is bigint and realtime
  // payloads aren't guaranteed to arrive as the same JS type as the
  // initial REST fetch (see useRealtime.js's UPDATE-merge comment).
  const teamByRegId = useMemo(() => {
    const m = new Map();
    (allTeams || []).forEach((t) => { if (t.registration_id != null) m.set(String(t.registration_id), t); });
    return m;
  }, [allTeams]);

  const data = useMemo(() => {
    return (rawRegs || []).map(r => ({
      id: r.id,
      teamName: r.team_name || "",
      captain: r.captain_name || "",
      email: r.captain_email || "",
      phone: r.captain_phone || "",
      method: r.payment_method || "",
      payment: r.payment_status || "pending",
      status: r.status || "submitted",
      code: r.reconciliation_code || "",
      fee: r.fee_amount || 0,
      donation: r.donation_amount || 0,
      total: r.total_amount || 0,
      date: r.created_at ? new Date(r.created_at).toLocaleDateString("en-CA") : "",
      slogan: r.team_slogan || "",
      captainShirt: r.captain_shirt || "",
      captainDiet: r.captain_dietary || "",
      story: r.team_story || "",
      imageConsent: r.image_consent || false,
      waiverAccepted: r.waiver_accepted || false,
    }));
  }, [rawRegs]);

  const [changes, setChanges] = useState({});
  const [playerChanges, setPlayerChanges] = useState({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (rawRegs) {
      const validIds = new Set(rawRegs.map(r => r.id));
      setChanges(prev => {
        const cleaned = {};
        for (const [id, val] of Object.entries(prev)) {
          if (validIds.has(id) || validIds.has(parseInt(id))) cleaned[id] = val;
        }
        return cleaned;
      });
    }
  }, [rawRegs]);

  // Kept as its own state (not merged into `changes`) since the cleanup
  // effect above validates keys against registration ids — mixing
  // player ids into that same object would get them silently stripped
  // the moment rawRegs refreshes.
  useEffect(() => {
    if (allTeams) {
      const validIds = new Set((allTeams || []).flatMap(t => (t.players || []).map(p => p.id)));
      setPlayerChanges(prev => {
        const cleaned = {};
        for (const [id, val] of Object.entries(prev)) {
          if (validIds.has(id)) cleaned[id] = val;
        }
        return cleaned;
      });
    }
  }, [allTeams]);

  // Queues a partial-field change for a registration, e.g. { payment: "paid" } or { status: "approved" }
  const queueChange = (id, fields) => {
    setChanges(prev => ({ ...prev, [id]: { ...prev[id], ...fields } }));
  };
  const queuePlayerChangeWithActivity = (id, fields) => {
    recordActivity();
    setPlayerChanges(prev => ({ ...prev, [id]: { ...prev[id], ...fields } }));
  };
  const getEffectivePlayer = (p) => ({ ...p, ...(playerChanges[p.id] || {}) });
  const hasPlayerChange = (id) => !!playerChanges[id];
  const queueChangeWithActivity = (id, fields) => {
    recordActivity();
    queueChange(id, fields);
  };
  const getEffective = (r) => ({ ...r, ...(changes[r.id] || {}) });
  const hasChange = (id) => !!changes[id];
  const submitAll = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updates = Object.entries(changes).map(([id, fields]) => {
        const update = { id };
        if (fields.payment !== undefined) {
          update.payment_status = fields.payment;
          update.payment_confirmed_at = fields.payment === "paid" ? new Date().toISOString() : null;
          update.payment_confirmed_by = fields.payment === "paid" ? adminUser?.id : null;
        }
        if (fields.status !== undefined) {
          update.status = fields.status;
          update.confirmed_at = fields.status === "approved" ? new Date().toISOString() : null;
          update.approved_by = fields.status === "approved" ? adminUser?.id : null;
        }
        return update;
      });

      if (updates.length) {
        await registrationsApi.batchUpdate(updates);
        await refetchRegs(); // guarantees fresh data regardless of realtime merge timing

        // Audit log each change
        for (const u of updates) {
          if (u.payment_status !== undefined) {
            await activityLog.log(eventId, u.payment_status === "paid" ? "payment_confirmed" : "payment_reverted", "registration", u.id, u, adminUser?.id);
          }
          if (u.status !== undefined) {
            const action = u.status === "approved" ? "registration_approved"
              : u.status === "rejected" ? "registration_rejected"
              : "registration_reverted"; // e.g. un-checking approval back to "submitted"
            await activityLog.log(eventId, action, "registration", u.id, u, adminUser?.id);
          }
        }
      }

      // Per-player approve/reject — same interaction model, one level
      // deeper. Each write here also fires the DB trigger that
      // recomputes the owning team's status (migration 016), so there's
      // nothing to compute here beyond the write + refetch.
      const playerUpdates = Object.entries(playerChanges).map(([id, fields]) => ({ id, status: fields.status }));
      if (playerUpdates.length) {
        await playersApi.batchUpdate(playerUpdates);
        await refetchTeams(); // teams' nested players[] doesn't self-update via realtime — see useRealtime.js

        for (const u of playerUpdates) {
          const action = u.status === "approved" ? "player_approved"
            : u.status === "rejected" ? "player_rejected"
            : "player_reverted";
          await activityLog.log(eventId, action, "player", u.id, u, adminUser?.id);
        }
      }

      setChanges({});
      setPlayerChanges({});
    } catch (err) {
      console.error("Batch update failed:", err);
      setSubmitError("Failed to save changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  const discardAll = () => { setChanges({}); setPlayerChanges({}); };

  const filtered = useMemo(() => {
    let list = data.map(getEffective);
    if (filter === "pending") list = list.filter(r => r.payment === "pending");
    else if (filter === "paid") list = list.filter(r => r.payment === "paid");
    else if (filter === "confirmed") list = list.filter(r => r.status === "confirmed");
    if (search) list = list.filter(r => r.teamName.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [data, changes, filter, search]);

  const changeCount = Object.keys(changes).length + Object.keys(playerChanges).length;

  return (
    <div>
      {regsLoading && <p style={{ fontSize: 13, color: "#ffffff50", marginBottom: 12 }}>Loading registrations...</p>}

      {!isActive && (
        <div style={{ padding: 14, borderRadius: 10, background: "#D4A84315", border: "1px solid #D4A84340", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <Clock size={16} color={B.accent} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {activeAdminName || "Another admin"} is currently editing this screen.
            </p>
            <p style={{ fontSize: 12, color: "#ffffff60" }}>
              You're #{queuePosition} in queue ({queueLength} total). This screen will unlock automatically when it's your turn.
            </p>
          </div>
        </div>
      )}
      {isActive && queueLength > 1 && (
        <div style={{ padding: 10, borderRadius: 8, background: "#22c55e10", border: "1px solid #22c55e30", marginBottom: 16, fontSize: 12, color: "#86efac" }}>
          You have edit access. {queueLength - 1} other admin{queueLength - 1 !== 1 ? "s" : ""} waiting.
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#ffffff40" }} />
          <input style={{ ...S.input, paddingLeft: 34 }} placeholder="Search teams, codes..." value={search} onChange={e => { recordActivity(); setSearch(e.target.value); }} />
        </div>
        {["all", "pending", "paid", "confirmed"].map(f => (
          <button key={f} onClick={() => { recordActivity(); setFilter(f); }} style={{ ...S.btnSm(filter === f ? B.accent + "20" : "transparent", filter === f ? B.accent : "#ffffff50"), border: `1px solid ${filter === f ? B.accent + "40" : "#ffffff15"}` }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid #ffffff10" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#ffffff04" }}>
            <th style={S.th}>Team</th><th style={S.th}>Captain</th><th style={S.th}>Code</th>
            <th style={S.th}>Method</th><th style={S.th}>Amount</th><th style={S.th}>Payment</th>
            <th style={S.th}>Status</th><th style={S.th}>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(r => {
              const changed = hasChange(r.id);
              const team = teamByRegId.get(String(r.id));
              const roster = [...(team?.players || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
              return (
              <Fragment key={r.id}>
                <tr onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  style={{ cursor: "pointer", background: changed ? B.accent + "08" : "transparent", borderLeft: changed ? `3px solid ${B.accent}` : "3px solid transparent" }}
                  onMouseEnter={e => { if (!changed) e.currentTarget.style.background = "#ffffff06"; }}
                  onMouseLeave={e => { if (!changed) e.currentTarget.style.background = "transparent"; }}>
                  <td style={{ ...S.td, fontWeight: 700, color: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ChevronRight size={14} color="#ffffff30" style={{ transform: expanded === r.id ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                      {r.teamName}
                      {changed && <span style={{ width: 6, height: 6, borderRadius: 3, background: B.accent, flexShrink: 0 }} />}
                    </div>
                  </td>
                  <td style={S.td}>{r.captain}</td>
                  <td style={{ ...S.td, fontFamily: "monospace", color: B.accent, fontWeight: 700 }}>{r.code}</td>
                  <td style={S.td}><MethodIcon m={r.method} /></td>
                  <td style={{ ...S.td, fontWeight: 600 }}>${r.total}</td>
                  <td style={S.td} onClick={e => e.stopPropagation()}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: canEdit ? "pointer" : "not-allowed" }}>
                      <input
                        type="checkbox"
                        checked={r.payment === "paid"}
                        disabled={!canEdit}
                        onChange={(e) => queueChangeWithActivity(r.id, { payment: e.target.checked ? "paid" : "pending" })}
                      />
                      <Badge status={r.payment} />
                    </label>
                  </td>
                  <td style={S.td} onClick={e => e.stopPropagation()}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: canEdit ? "pointer" : "not-allowed" }}>
                      <input
                        type="checkbox"
                        checked={r.status === "approved"}
                        disabled={!canEdit}
                        onChange={(e) => queueChangeWithActivity(r.id, { status: e.target.checked ? "approved" : "submitted" })}
                      />
                      <Badge status={r.status} />
                    </label>
                  </td>
                  <td style={S.td} onClick={e => e.stopPropagation()}>
                    {r.status !== "rejected" && (
                      <button onClick={() => queueChangeWithActivity(r.id, { status: "rejected" })} disabled={!canEdit} style={S.btnSm("#ef444420", "#ef4444")} title="Reject"><X size={14} /></button>
                    )}
                  </td>
                </tr>

                {expanded === r.id && (
                  <tr>
                    <td colSpan={8} style={{ padding: 0, background: "#00000030" }}>
                      <div style={{ padding: "16px 20px 20px 42px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 1 }}>From Registration</p>
                          <Badge status={r.status} />
                        </div>
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20, fontSize: 13, color: "#ffffffcc" }}>
                          <span><strong style={{ color: "#fff" }}>{r.captain}</strong></span>
                          <span style={{ color: "#ffffff60" }}>{r.email}</span>
                          <span style={{ color: "#ffffff60" }}>{r.phone}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 1 }}>Roster</p>
                          {team ? <Badge status={team.status || "pending"} /> : <span style={{ fontSize: 11, color: "#ffffff40" }}>No team/roster on file</span>}
                        </div>

                        {roster.length === 0 ? (
                          <p style={{ fontSize: 12, color: "#ffffff40" }}>No players recorded for this team.</p>
                        ) : (
                          <div style={{ display: "grid", gap: 6 }}>
                            {roster.map(p => {
                              const ep = getEffectivePlayer(p);
                              const pChanged = hasPlayerChange(p.id);
                              const role = p.is_captain ? "Captain" : p.is_coach ? "Coach" : "Player";
                              return (
                                <div key={p.id} style={{
                                  display: "flex", alignItems: "center", gap: 14, padding: "8px 12px", borderRadius: 8,
                                  background: pChanged ? B.accent + "10" : "#ffffff05",
                                  border: `1px solid ${pChanged ? B.accent + "30" : "#ffffff08"}`,
                                }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: role === "Player" ? "#ffffff40" : B.accent, minWidth: 55 }}>{role.toUpperCase()}</span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", flex: 1 }}>{p.full_name}</span>
                                  <span style={{ fontSize: 12, color: "#ffffff60" }}>{p.email}</span>
                                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: canEdit ? "pointer" : "not-allowed" }}>
                                    <input
                                      type="checkbox"
                                      checked={ep.status === "approved"}
                                      disabled={!canEdit}
                                      onChange={(e) => queuePlayerChangeWithActivity(p.id, { status: e.target.checked ? "approved" : "pending" })}
                                    />
                                    <Badge status={ep.status || "pending"} />
                                  </label>
                                  {ep.status !== "rejected" && (
                                    <button onClick={() => queuePlayerChangeWithActivity(p.id, { status: "rejected" })} disabled={!canEdit} style={S.btnSm("#ef444420", "#ef4444")} title="Reject player"><X size={13} /></button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <SubmitBar count={changeCount} onSubmit={submitAll} onDiscard={discardAll} submitting={submitting} error={submitError} disabled={!isActive} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUILD — VOLUNTEERS (with batch submit)
   ═══════════════════════════════════════════════════════════ */
function VolunteersPanel() {
  const { config, eventId } = useEvent();
  const B = config.brand;

  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [changes, setChanges] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (eventId) {
      setLoading(true);
      volunteersApi.list(eventId)
        .then(setRawData)
        .catch(err => console.error("Failed to load volunteers:", err))
        .finally(() => setLoading(false));
    }
  }, [eventId]);

  const data = useMemo(() => {
    const roleMap = {};
    (config.volunteers || []).forEach(r => { roleMap[r.id] = r.title; });

    return rawData.map(v => ({
      id: v.id,
      name: [v.first_name, v.last_name].filter(Boolean).join(" ") || "",
      email: v.email || "",
      phone: v.phone || "",
      role: v.primary_role?.title || "",
      other: (v.other_role_ids || []).map(id => roleMap[id] || "Unknown role").filter(Boolean),
      exp: v.experience || "",
      certs: v.certifications || "",
      status: v.status || "pending",
    }));
  }, [rawData, config.volunteers]);

  const queue = (id, val) => setChanges(prev => ({ ...prev, [id]: val }));
  const eff = (v) => changes[v.id] !== undefined ? { ...v, status: changes[v.id] } : v;
  const submitAll = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updates = Object.entries(changes).map(([id, status]) => ({ id, status }));
      await volunteersApi.batchUpdate(updates);
      const fresh = await volunteersApi.list(eventId);
      setRawData(fresh);
      setChanges({});
    } catch (err) {
      console.error("Volunteer batch update failed:", err);
      setSubmitError("Failed to save changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  const discardAll = () => setChanges({});
  const changeCount = Object.keys(changes).length;

  return (
    <div>
      {loading && <p style={{ fontSize: 13, color: "#ffffff50", marginBottom: 12 }}>Loading volunteers...</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[{ l: "Total", v: data.length, c: "#fff" }, { l: "Pending", v: data.map(eff).filter(v => v.status === "pending").length, c: "#f59e0b" }, { l: "Approved", v: data.map(eff).filter(v => v.status === "approved").length, c: "#22c55e" }].map((s, i) => (
          <div key={i} style={{ ...S.card, textAlign: "center" }}><p style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</p><p style={{ fontSize: 11, color: "#ffffff50" }}>{s.l}</p></div>
        ))}
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {data.map(v => {
          const e = eff(v);
          const changed = changes[v.id] !== undefined;
          return (
            <div key={v.id} style={{ ...S.card, borderColor: changed ? B.accent + "40" : "#ffffff10", background: changed ? B.accent + "06" : "#ffffff06" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{v.name} {changed && <span style={{ width: 6, height: 6, borderRadius: 3, background: B.accent, display: "inline-block", marginLeft: 6 }} />}</p>
                  <p style={{ fontSize: 12, color: B.accent, fontWeight: 600, marginTop: 2 }}>{v.role}</p>
                  {v.other.length > 0 && <p style={{ fontSize: 11, color: "#ffffff50", marginTop: 2 }}>Also: {v.other.join(", ")}</p>}
                </div>
                <Badge status={e.status} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <p style={{ fontSize: 12, color: "#ffffffaa", display: "flex", alignItems: "center", gap: 6 }}><Mail size={11} color="#ffffff50" /> {v.email}</p>
                <p style={{ fontSize: 12, color: "#ffffffaa", display: "flex", alignItems: "center", gap: 6 }}><Phone size={11} color="#ffffff50" /> {v.phone}</p>
              </div>
              {v.exp && <p style={{ fontSize: 12, color: "#ffffff60", marginBottom: 4 }}><strong style={{ color: "#ffffff80" }}>Exp:</strong> {v.exp}</p>}
              {v.certs && <p style={{ fontSize: 12, color: "#ffffff60", marginBottom: 8 }}><strong style={{ color: "#ffffff80" }}>Certs:</strong> {v.certs}</p>}
              <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid #ffffff08" }}>
                {(e.status === "pending" || changed) && <>
                  <button onClick={() => queue(v.id, "approved")} style={S.btn(e.status === "approved" ? "#22c55e30" : "#22c55e", e.status === "approved" ? "#22c55e" : "#fff")}><UserCheck size={14} /> {e.status === "approved" ? "Approved ✓" : "Approve"}</button>
                  <button onClick={() => queue(v.id, "declined")} style={S.btn(e.status === "declined" ? "#ef444430" : "#ffffff10", e.status === "declined" ? "#ef4444" : "#ffffff60")}><UserX size={14} /> {e.status === "declined" ? "Declined ✗" : "Decline"}</button>
                  {changed && <button onClick={() => { const n = { ...changes }; delete n[v.id]; setChanges(n); }} style={S.btnSm("#ffffff10", "#ffffff50")}><Undo2 size={12} /> Undo</button>}
                </>}
              </div>
            </div>
          );
        })}
      </div>
      <SubmitBar count={changeCount} onSubmit={submitAll} onDiscard={discardAll} submitting={submitting} error={submitError} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUILD — FUNDRAISING (with submit)
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   BUILD — BENEFICIARIES (org-scoped, org_admin/super_admin only)
   ═══════════════════════════════════════════════════════════ */
function BeneficiaryForm({ orgId, initial, onSaved, onCancel, B }) {
  const [name, setName] = useState(initial?.name || "");
  const [registrationNumber, setRegistrationNumber] = useState(initial?.registration_number || "");
  const [website, setWebsite] = useState(initial?.website || "");
  const [contactName, setContactName] = useState(initial?.contact_name || "");
  const [contactEmail, setContactEmail] = useState(initial?.contact_email || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Beneficiary name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const verified = verifyBeneficiaryRegistration(registrationNumber);
      const payload = {
        name: name.trim(),
        registration_number: registrationNumber.trim() || null,
        website: website.trim() || null,
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        verified,
        verified_at: verified ? new Date().toISOString() : null,
      };
      if (initial?.id) {
        await beneficiariesApi.update(initial.id, payload);
      } else {
        await beneficiariesApi.create(orgId, payload);
      }
      onSaved();
    } catch (err) {
      console.error("Failed to save beneficiary:", err);
      setError(err.message || "Failed to save beneficiary.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...S.card, marginTop: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>NAME</label>
          <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="Local Food Bank" />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>CRA REGISTRATION NUMBER</label>
          <input style={S.input} value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} placeholder="123456789RR0001" />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>WEBSITE</label>
          <input style={S.input} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>CONTACT NAME</label>
          <input style={S.input} value={contactName} onChange={e => setContactName(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>CONTACT EMAIL</label>
          <input style={S.input} type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
        </div>
      </div>
      <p style={{ fontSize: 11, color: "#ffffff40", marginTop: 10 }}>
        Verification is a format check only (9 digits + "RR" + 4 digits) — not a real charity registry lookup.
      </p>
      {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={handleSave} disabled={saving} style={S.btn(B.accent, B.dark)}>{saving ? "Saving..." : "Save Beneficiary"}</button>
        <button onClick={onCancel} style={S.btn("#ffffff10", "#ffffffaa")}>Cancel</button>
      </div>
    </div>
  );
}

function BeneficiariesPanel({ orgId, B }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(null); // beneficiary row, or {} for new, or null for closed

  const refresh = async () => {
    if (!orgId) return;
    setLoading(true);
    setLoadError(null);
    try {
      setList(await beneficiariesApi.listByOrg(orgId));
    } catch (err) {
      console.error("Failed to load beneficiaries:", err);
      setLoadError("Failed to load beneficiaries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [orgId]);

  return (
    <div style={{ ...S.card, marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}><Heart size={16} color={B.accent} /> Beneficiaries</h3>
        {!editing && <button onClick={() => setEditing({})} style={S.btnSm(B.accent, B.dark)}>+ Add Beneficiary</button>}
      </div>
      <p style={{ fontSize: 12, color: "#ffffff50", marginTop: 4 }}>Charities this organization can commit an event's proceeds to. Managed at the org level — reusable across events.</p>

      {loading && <p style={{ fontSize: 13, color: "#ffffff50", marginTop: 12 }}>Loading…</p>}
      {loadError && <p style={{ fontSize: 13, color: "#ef4444", marginTop: 12 }}>{loadError}</p>}
      {!loading && !loadError && list.length === 0 && !editing && <p style={{ fontSize: 13, color: "#ffffff40", marginTop: 12 }}>No beneficiaries yet.</p>}

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {list.map(ben => (
          <div key={ben.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff08" }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{ben.name}</p>
              <p style={{ fontSize: 12, color: "#ffffff50" }}>{ben.registration_number || "No registration number on file"}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={S.badge(ben.verified ? "#22c55e" : "#ef4444")}>{ben.verified ? "Verified" : "Unverified"}</span>
              <button onClick={() => setEditing(ben)} style={S.btnSm("#ffffff10", "#ffffffaa")}>Edit</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <BeneficiaryForm
          orgId={orgId}
          initial={editing.id ? editing : null}
          B={B}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUILD — BENEFICIARY COMMITMENT (event-scoped, charity events only)
   ═══════════════════════════════════════════════════════════ */
function CommitmentForm({ eventId, orgId, adminUserId, initial, onSaved, onCancel, B }) {
  const [orgBeneficiaries, setOrgBeneficiaries] = useState([]);
  const [beneficiaryId, setBeneficiaryId] = useState(initial?.beneficiary_id || "");
  const [commitmentText, setCommitmentText] = useState(initial?.commitment_text || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orgId) return;
    beneficiariesApi.listByOrg(orgId).then(setOrgBeneficiaries).catch(err => console.error("Failed to load beneficiaries:", err));
  }, [orgId]);

  const handleSave = async (publish) => {
    if (!beneficiaryId) {
      setError("Select a beneficiary first.");
      return;
    }
    if (!commitmentText.trim()) {
      setError("Commitment text is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fields = {
        beneficiary_id: beneficiaryId,
        commitment_text: commitmentText.trim(),
        signed_by: adminUserId,
        signed_at: new Date().toISOString(),
        status: publish ? "published" : "draft",
      };
      if (initial) {
        await commitmentsApi.update(initial.id, fields);
      } else {
        await commitmentsApi.create(eventId, fields);
      }
      onSaved();
    } catch (err) {
      console.error("Failed to save commitment:", err);
      setError(err.message || "Failed to save commitment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...S.card, marginTop: 12 }}>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>BENEFICIARY</label>
        <select style={{ ...S.input, appearance: "none" }} value={beneficiaryId} onChange={e => setBeneficiaryId(e.target.value)}>
          <option value="">Select a beneficiary…</option>
          {orgBeneficiaries.map(b => <option key={b.id} value={b.id}>{b.name}{b.verified ? "" : " (unverified)"}</option>)}
        </select>
        {orgBeneficiaries.length === 0 && <p style={{ fontSize: 11, color: "#ffffff40", marginTop: 4 }}>No beneficiaries on file for this org yet — add one under Fundraising first.</p>}
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>COMMITMENT TEXT</label>
        <textarea value={commitmentText} onChange={e => setCommitmentText(e.target.value)} rows={5} style={{ ...S.input, resize: "vertical", lineHeight: 1.6 }} placeholder="e.g. 100% of net proceeds from this event will be donated to…" />
      </div>
      <p style={{ fontSize: 11, color: "#ffffff40", marginTop: 10 }}>
        Signing records you ({adminUserId ? "current admin" : "—"}) as the signer with today's date. Publishing makes the commitment visible on the public event page and registration flows, and is required before the event itself can be published.
      </p>
      {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={() => handleSave(true)} disabled={saving} style={S.btn("#22c55e", "#fff")}>{saving ? "Saving..." : "Sign & Publish"}</button>
        <button onClick={() => handleSave(false)} disabled={saving} style={S.btn(B.accent, B.dark)}>{saving ? "Saving..." : initial ? "Save Changes" : "Save as Draft"}</button>
        <button onClick={onCancel} style={S.btn("#ffffff10", "#ffffffaa")}>Cancel</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   POST-EVENT FULFILLMENT EVIDENCE — org-side submission
   ═══════════════════════════════════════════════════════════ */
const FULFILLMENT_LABEL = {
  pending: { label: "Pending", color: "#ffffff60" },
  submitted: { label: "Under Review", color: "#f59e0b" },
  confirmed: { label: "Confirmed", color: "#22c55e" },
  disputed: { label: "Disputed", color: "#ef4444" },
};

function EvidenceFileLink({ file }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const openFile = async () => {
    if (signedUrl) { window.open(signedUrl, "_blank"); return; }
    setLoading(true);
    try {
      const url = await commitmentsApi.getEvidenceSignedUrl(file.url);
      setSignedUrl(url);
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

function FulfillmentEvidenceForm({ commitment, onSaved, onCancel, B }) {
  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState(commitment.evidence_description || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleFilePick = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = [];
      for (const file of picked) {
        uploaded.push(await commitmentsApi.uploadEvidenceFile(commitment.event_id, file));
      }
      setFiles(prev => [...prev, ...uploaded]);
    } catch (err) {
      console.error("Evidence upload failed:", err);
      setError(err.message || "File upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      await commitmentsApi.submitEvidence(commitment.id, {
        evidenceFiles: [...(commitment.evidence_files || []), ...files],
        evidenceDescription: description.trim(),
      });
      onSaved();
    } catch (err) {
      console.error("Failed to submit evidence:", err);
      setError(err.message || "Failed to submit evidence.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 10, padding: 12, background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff10" }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>DESCRIPTION</label>
      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...S.input, resize: "vertical" }} placeholder="How and when the funds were delivered…" />

      <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", margin: "10px 0 4px" }}>EVIDENCE FILES</label>
      <input type="file" multiple onChange={handleFilePick} disabled={uploading} style={{ fontSize: 12, color: "#ffffffaa" }} />
      {files.length > 0 && (
        <ul style={{ marginTop: 6, paddingLeft: 18 }}>
          {files.map((f, i) => <li key={i} style={{ fontSize: 12, color: "#ffffff70" }}>{f.filename}</li>)}
        </ul>
      )}

      {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={handleSubmit} disabled={saving || uploading} style={S.btnSm(B.accent, B.dark)}>{saving ? "Submitting..." : "Submit Evidence"}</button>
        <button onClick={onCancel} style={S.btnSm("#ffffff10", "#ffffffaa")}>Cancel</button>
      </div>
    </div>
  );
}

function FulfillmentSection({ commitment, onUpdated, B }) {
  const [submitting, setSubmitting] = useState(false);
  const fulfillment = FULFILLMENT_LABEL[commitment.fulfillment_status] || FULFILLMENT_LABEL.pending;

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #ffffff08" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 0.5 }}>Fulfillment</p>
        <span style={S.badge(fulfillment.color)}>{fulfillment.label}</span>
      </div>
      {commitment.evidence_description && commitment.fulfillment_status !== "pending" && (
        <p style={{ fontSize: 12, color: "#ffffff70", marginTop: 6 }}>{commitment.evidence_description}</p>
      )}
      {(commitment.evidence_files || []).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
          {commitment.evidence_files.map((f, i) => <EvidenceFileLink key={i} file={f} />)}
        </div>
      )}
      {(commitment.fulfillment_status === "pending" || commitment.fulfillment_status === "disputed") && (
        submitting
          ? <FulfillmentEvidenceForm commitment={commitment} B={B} onCancel={() => setSubmitting(false)} onSaved={() => { setSubmitting(false); onUpdated(); }} />
          : <button onClick={() => setSubmitting(true)} style={{ ...S.btnSm(B.accent, B.dark), marginTop: 8 }}>Submit Evidence</button>
      )}
    </div>
  );
}

function BeneficiaryCommitmentPanel({ eventId, orgId, B }) {
  const { adminUser } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  const refresh = async () => {
    if (!eventId) return;
    setLoading(true);
    setLoadError(null);
    try {
      setList(await commitmentsApi.listByEvent(eventId));
    } catch (err) {
      console.error("Failed to load commitments:", err);
      setLoadError("Failed to load beneficiary commitments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [eventId]);

  const publish = async (id) => {
    try {
      await commitmentsApi.update(id, { status: "published" });
      await refresh();
    } catch (err) {
      console.error("Failed to publish commitment:", err);
    }
  };

  const hasPublished = list.some(c => c.status === "published");

  return (
    <div style={{ ...S.card, marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}><Heart size={16} color={B.accent} /> Beneficiary Commitment</h3>
        {!creating && !editing && <button onClick={() => setCreating(true)} style={S.btnSm(B.accent, B.dark)}>+ New Commitment</button>}
      </div>
      <p style={{ fontSize: 12, color: "#ffffff50", marginTop: 4 }}>
        This event is flagged as a charity event — a published commitment is required before the event can be published.
      </p>

      {loading && <p style={{ fontSize: 13, color: "#ffffff50", marginTop: 12 }}>Loading…</p>}
      {loadError && <p style={{ fontSize: 13, color: "#ef4444", marginTop: 12 }}>{loadError}</p>}
      {!loading && !loadError && !hasPublished && <p style={{ fontSize: 12, color: "#f59e0b", marginTop: 12 }}>No published commitment yet — the event cannot be published until one exists.</p>}

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {list.map(c => (
          <div key={c.id} style={{ padding: "12px 14px", background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff08" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{c.beneficiary?.name || "—"}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={S.badge(c.status === "published" ? "#22c55e" : "#ffffff60")}>{c.status}</span>
                {c.status === "draft" && <button onClick={() => { setEditing(c); setCreating(false); }} style={S.btnSm("#ffffff10", "#ffffffaa")}>Edit</button>}
                {c.status === "draft" && <button onClick={() => publish(c.id)} style={S.btnSm("#22c55e", "#fff")}>Publish</button>}
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#ffffff70", marginTop: 6, whiteSpace: "pre-wrap" }}>{c.commitment_text}</p>
            {c.status === "published" && <FulfillmentSection commitment={c} B={B} onUpdated={refresh} />}
          </div>
        ))}
      </div>

      {creating && (
        <CommitmentForm
          eventId={eventId}
          orgId={orgId}
          adminUserId={adminUser?.id}
          B={B}
          onCancel={() => setCreating(false)}
          onSaved={() => { setCreating(false); refresh(); }}
        />
      )}
      {editing && (
        <CommitmentForm
          eventId={eventId}
          orgId={orgId}
          adminUserId={adminUser?.id}
          initial={editing}
          B={B}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function FundraisingPanel() {
  const { config, eventId, refetch } = useEvent();
  const { adminUser } = useAuth();
  const B = config.brand;
  const orgId = config?._raw?.org_id;
  const canManageBeneficiaries = adminUser?.role === "org_admin" || adminUser?.role === "super_admin";

  const goal = config.fundraising.goal || 15000;
  const donationsNet = config.fundraising.donationsNet || 0;
  const current = config.fundraising.current || 0; // donationsNet + reconciledAmount — what the thermometer shows
  const [saved, setSaved] = useState(config.fundraising.reconciledAmount || 0);
  const [reconciled, setReconciled] = useState(config.fundraising.reconciledAmount || 0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const changed = reconciled !== saved;

  useEffect(() => {
    const configReconciled = config.fundraising.reconciledAmount || 0;
    setSaved(configReconciled);
    setReconciled(configReconciled);
  }, [config.fundraising.reconciledAmount]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await eventsApi.updateReconciledAmount(eventId, reconciled);
      setSaved(reconciled);
      await refetch();
    } catch (err) {
      console.error("Reconciliation update failed:", err);
      setSubmitError("Failed to update. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}><Thermometer size={16} color={B.accent} /> Donations Received</h3>
          <span style={{ fontSize: 12, color: "#ffffff50" }}>Goal: ${goal.toLocaleString()}</span>
        </div>
        <div style={{ height: 32, background: "#ffffff10", borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ height: "100%", borderRadius: 16, background: `linear-gradient(90deg, ${B.secondary}, ${B.accent})`, width: `${pct}%`, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 12, transition: "width 0.5s" }}>
            {pct > 8 && <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{Math.round(pct)}%</span>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center" }}>
          <div><p style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>${current.toLocaleString()}</p><p style={{ fontSize: 11, color: "#ffffff50" }}>Received</p></div>
          <div><p style={{ fontSize: 24, fontWeight: 900, color: B.accent }}>${(goal - current).toLocaleString()}</p><p style={{ fontSize: 11, color: "#ffffff50" }}>Remaining</p></div>
          <div><p style={{ fontSize: 24, fontWeight: 900, color: B.secondary }}>{Math.round(pct)}%</p><p style={{ fontSize: 11, color: "#ffffff50" }}>Progress</p></div>
        </div>
        <p style={{ fontSize: 11, color: "#ffffff40", marginTop: 12 }}>
          ${donationsNet.toLocaleString(undefined, { minimumFractionDigits: 2 })} from donations (net of expenses, tracked automatically in the Ledger tab){reconciled > 0 ? ` + $${reconciled.toLocaleString(undefined, { minimumFractionDigits: 2 })} reconciled` : ""}.
        </p>
      </div>
      <div style={S.card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#ffffff80", marginBottom: 4 }}>Event-Day Reconciliation</h3>
        <p style={{ fontSize: 12, color: "#ffffff40", marginBottom: 12 }}>Additional proceeds not tracked as individual ledger entries — raffle, gate, concessions, etc. Add this once, typically at event close, on top of the donations total above.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ position: "relative", flex: 1 }}><span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#ffffff50" }}>$</span>
            <input type="number" value={reconciled} onChange={e => setReconciled(parseFloat(e.target.value) || 0)} style={{ ...S.input, paddingLeft: 28 }} /></div>
        </div>
      </div>
      <SubmitBar count={changed ? 1 : 0} onSubmit={handleSubmit} onDiscard={() => setReconciled(saved)} submitting={submitting} error={submitError} />
      {/* Gated to org_admin/super_admin, same as BeneficiariesPanel below: migration
          021's RLS only grants beneficiaries SELECT to is_org_admin_for(org_id), so
          an event-scoped 'admin' can't read the org's beneficiary list to pick one
          here even if this panel were shown to them. */}
      {config.cause.isCharity && canManageBeneficiaries && <BeneficiaryCommitmentPanel eventId={eventId} orgId={orgId} B={B} />}
      {canManageBeneficiaries && <BeneficiariesPanel orgId={orgId} B={B} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUILD — LEDGER (bookkeeping only — expenses CRUD + manual fan
   donation entry. No Stripe Connect, no fan-facing collection flow.)
   ═══════════════════════════════════════════════════════════ */
const EXPENSE_CATEGORIES = ["Venue", "Equipment", "Food & Beverage", "Prizes", "Printing", "Permits", "Other"];
const DONATION_METHODS = ["e_transfer", "cash", "stripe", "manual"];

function ExpenseForm({ eventId, adminUserId, initial, onSaved, onCancel, B }) {
  const [category, setCategory] = useState(initial?.category || EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState(initial?.description || "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [paidTo, setPaidTo] = useState(initial?.paid_to || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fields = { category, description: description.trim() || null, amount: amt, paid_to: paidTo.trim() || null };
      if (initial) {
        await expensesApi.update(initial.id, fields);
      } else {
        await expensesApi.create(eventId, { ...fields, paid_by: adminUserId });
      }
      onSaved();
    } catch (err) {
      console.error("Failed to save expense:", err);
      setError(err.message || "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...S.card, marginTop: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>CATEGORY</label>
          <select style={{ ...S.input, appearance: "none" }} value={category} onChange={e => setCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>AMOUNT</label>
          <input type="number" style={S.input} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>PAID TO</label>
          <input style={S.input} value={paidTo} onChange={e => setPaidTo(e.target.value)} placeholder="Vendor / person" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>DESCRIPTION</label>
          <input style={S.input} value={description} onChange={e => setDescription(e.target.value)} placeholder="What was this for?" />
        </div>
      </div>
      {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={handleSave} disabled={saving} style={S.btn(B.accent, B.dark)}>{saving ? "Saving..." : initial ? "Save Changes" : "Save Expense"}</button>
        <button onClick={onCancel} style={S.btn("#ffffff10", "#ffffffaa")}>Cancel</button>
      </div>
    </div>
  );
}

function ExpensesSection({ eventId, adminUserId, B, onLedgerChange }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setList(await expensesApi.list(eventId));
    } catch (err) {
      console.error("Failed to load expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [eventId]);

  const afterChange = async () => {
    setCreating(false);
    setEditing(null);
    await refresh();
    await onLedgerChange();
  };

  const remove = async (id) => {
    try {
      await expensesApi.remove(id);
      await afterChange();
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  };

  const total = list.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}><DollarSign size={16} color={B.accent} /> Expenses</h3>
        {!creating && !editing && <button onClick={() => setCreating(true)} style={S.btnSm(B.accent, B.dark)}>+ Add Expense</button>}
      </div>
      {!loading && <p style={{ fontSize: 12, color: "#ffffff50", marginTop: 4 }}>{list.length} expense{list.length !== 1 ? "s" : ""} · ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })} total</p>}

      {loading && <p style={{ fontSize: 13, color: "#ffffff50", marginTop: 12 }}>Loading…</p>}
      {!loading && list.length === 0 && !creating && <p style={{ fontSize: 13, color: "#ffffff40", marginTop: 12 }}>No expenses recorded yet.</p>}

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {list.map(e => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff08" }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{e.description || e.category}</p>
              <p style={{ fontSize: 12, color: "#ffffff50" }}>{e.category}{e.paid_to ? ` · ${e.paid_to}` : ""}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#ef4444" }}>-${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <button onClick={() => { setEditing(e); setCreating(false); }} style={S.btnSm("#ffffff10", "#ffffffaa")}>Edit</button>
              <button onClick={() => remove(e.id)} style={S.btnSm("#ffffff10", "#ffffffaa")}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {creating && (
        <ExpenseForm eventId={eventId} adminUserId={adminUserId} B={B} onCancel={() => setCreating(false)} onSaved={afterChange} />
      )}
      {editing && (
        <ExpenseForm eventId={eventId} adminUserId={adminUserId} initial={editing} B={B} onCancel={() => setEditing(null)} onSaved={afterChange} />
      )}
    </div>
  );
}

function FanDonationForm({ eventId, initial, onSaved, onCancel, B }) {
  const [donorName, setDonorName] = useState(initial?.donor_name || "");
  const [donorEmail, setDonorEmail] = useState(initial?.donor_email || "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [paymentMethod, setPaymentMethod] = useState(initial?.payment_method || DONATION_METHODS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fields = {
        donor_name: donorName.trim() || null,
        donor_email: donorEmail.trim() || null,
        amount: amt,
        payment_method: paymentMethod,
      };
      if (initial) {
        await fanDonationsApi.update(initial.id, fields);
      } else {
        await fanDonationsApi.create(eventId, { ...fields, payment_status: "paid" });
      }
      onSaved();
    } catch (err) {
      console.error("Failed to save donation:", err);
      setError(err.message || "Failed to save donation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...S.card, marginTop: 12 }}>
      <p style={{ fontSize: 12, color: "#ffffff40", marginBottom: 10 }}>Manual entry — for donations collected outside this platform (cash, e-transfer, etc). Not a payment flow.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>DONOR NAME</label>
          <input style={S.input} value={donorName} onChange={e => setDonorName(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>DONOR EMAIL</label>
          <input style={S.input} type="email" value={donorEmail} onChange={e => setDonorEmail(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>AMOUNT</label>
          <input type="number" style={S.input} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>METHOD</label>
          <select style={{ ...S.input, appearance: "none" }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            {DONATION_METHODS.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
          </select>
        </div>
      </div>
      {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={handleSave} disabled={saving} style={S.btn(B.accent, B.dark)}>{saving ? "Saving..." : initial ? "Save Changes" : "Save Donation"}</button>
        <button onClick={onCancel} style={S.btn("#ffffff10", "#ffffffaa")}>Cancel</button>
      </div>
    </div>
  );
}

function FanDonationsSection({ eventId, B, onLedgerChange }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setList(await fanDonationsApi.list(eventId));
    } catch (err) {
      console.error("Failed to load fan donations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [eventId]);

  const afterChange = async () => {
    setCreating(false);
    setEditing(null);
    await refresh();
    await onLedgerChange();
  };

  const remove = async (id) => {
    try {
      await fanDonationsApi.remove(id);
      await afterChange();
    } catch (err) {
      console.error("Failed to delete donation:", err);
    }
  };

  const total = list.reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <div style={{ ...S.card, marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}><Heart size={16} color={B.accent} /> Fan Donations</h3>
        {!creating && !editing && <button onClick={() => setCreating(true)} style={S.btnSm(B.accent, B.dark)}>+ Record Donation</button>}
      </div>
      {!loading && <p style={{ fontSize: 12, color: "#ffffff50", marginTop: 4 }}>{list.length} donation{list.length !== 1 ? "s" : ""} · ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })} total</p>}

      {loading && <p style={{ fontSize: 13, color: "#ffffff50", marginTop: 12 }}>Loading…</p>}
      {!loading && list.length === 0 && !creating && <p style={{ fontSize: 13, color: "#ffffff40", marginTop: 12 }}>No fan donations recorded yet.</p>}

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {list.map(d => (
          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff08" }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{d.donor_name || "Anonymous"}</p>
              <p style={{ fontSize: 12, color: "#ffffff50" }}>{d.payment_method.replace("_", " ")}{d.team?.name ? ` · for ${d.team.name}` : ""}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>+${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <button onClick={() => { setEditing(d); setCreating(false); }} style={S.btnSm("#ffffff10", "#ffffffaa")}>Edit</button>
              <button onClick={() => remove(d.id)} style={S.btnSm("#ffffff10", "#ffffffaa")}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {creating && (
        <FanDonationForm eventId={eventId} B={B} onCancel={() => setCreating(false)} onSaved={afterChange} />
      )}
      {editing && (
        <FanDonationForm eventId={eventId} initial={editing} B={B} onCancel={() => setEditing(null)} onSaved={afterChange} />
      )}
    </div>
  );
}

function LedgerPanel() {
  const { config, eventId, refetch } = useEvent();
  const { adminUser } = useAuth();
  const B = config.brand;

  const onLedgerChange = async () => {
    try {
      await ledgerApi.recomputeFundraising(eventId);
    } catch (err) {
      console.error("Failed to recompute fundraising total:", err);
    }
    await refetch();
  };

  return (
    <div>
      <ExpensesSection eventId={eventId} adminUserId={adminUser?.id} B={B} onLedgerChange={onLedgerChange} />
      <FanDonationsSection eventId={eventId} B={B} onLedgerChange={onLedgerChange} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUILD — TOURNAMENT RULES
   ═══════════════════════════════════════════════════════════ */
function RulesPanel() {
  const { config, eventId } = useEvent();
  const B = config.brand;

  const [saved, setSaved] = useState(config.rules || "");
  const [draft, setDraft] = useState(config.rules || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const changed = draft !== saved;

  useEffect(() => {
    const configRules = config.rules || "";
    setSaved(configRules);
    setDraft(configRules);
  }, [config.rules]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await eventsApi.updateRules(eventId, draft);
      setSaved(draft);
    } catch (err) {
      console.error("Rules update failed:", err);
      setSubmitError("Failed to save rules. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ ...S.card }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}><BookOpen size={16} color={B.accent} /> Tournament Rules</h3>
        <p style={{ fontSize: 12, color: "#ffffff50", marginBottom: 16 }}>Markdown supported. Published to the /rules page and included in team packages.</p>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={16} style={{ ...S.input, resize: "vertical", lineHeight: 1.7, fontSize: 14 }} />
      </div>
      <SubmitBar count={changed ? 1 : 0} onSubmit={handleSubmit} onDiscard={() => setDraft(saved)} submitting={submitting} error={submitError} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUILD CONTEXT (MAIN)
   ═══════════════════════════════════════════════════════════ */
// Phase 6b: Fundraising/Rules both write to the `events` table
// (updateFundraising/updateRules), which migration 019 caps at Read for
// treasurer/volunteer_coord. Hiding the whole sub-tab rather than showing
// it read-only with the save button removed — this project's only
// existing precedent for role-based access is whole-tab visibility
// (ROLE_TABS, same file, ~40 lines below), not an in-page read-only mode,
// so this extends that idiom one level down rather than introducing a
// new one. Neither role has any legitimate read-only use for these tabs
// today (fundraising % and rules content are both already visible
// elsewhere — the stat cards above, and the public event page — so there
// was no case for "show it, just disable the button" to fit).
const BUILD_SUBTAB_VISIBILITY = {
  treasurer: ["registrations", "ledger"],
  volunteer_coord: ["volunteers"],
};

function BuildContext() {
  const { config, eventId } = useEvent();
  const { adminUser } = useAuth();
  const B = config.brand;
  const allTabs = [
    { id: "registrations", label: "Registrations", icon: Users },
    { id: "volunteers", label: "Volunteers", icon: HandHelping },
    { id: "fundraising", label: "Fundraising", icon: Heart },
    { id: "ledger", label: "Ledger", icon: Banknote },
    { id: "rules", label: "Rules", icon: BookOpen },
  ];
  const visibleSubtabIds = BUILD_SUBTAB_VISIBILITY[adminUser?.role] || allTabs.map(t => t.id);
  const tabs = allTabs.filter(t => visibleSubtabIds.includes(t.id));
  const [tab, setTab] = useState(visibleSubtabIds[0]);

  useEffect(() => {
    if (!visibleSubtabIds.includes(tab)) setTab(visibleSubtabIds[0]);
  }, [adminUser?.role]);

  const { data: rawRegs } = useRealtimeRegistrations(eventId);
  const [rawVols, setRawVols] = useState([]);

  useEffect(() => {
    if (eventId) {
      volunteersApi.list(eventId).then(setRawVols).catch(() => {});
    }
  }, [eventId]);

  const regStats = useMemo(() => {
    const regs = rawRegs || [];
    const confirmed = regs.filter(r => r.status === "confirmed").length;
    const pending = regs.length - confirmed;
    const revenue = regs.filter(r => r.payment_status === "paid").reduce((sum, r) => sum + (r.fee_amount || 0), 0);
    const donations = regs.reduce((sum, r) => sum + (r.donation_amount || 0), 0);
    return { total: regs.length, confirmed, pending, revenue, donations };
  }, [rawRegs]);

  const volStats = useMemo(() => {
    const vols = rawVols || [];
    const approved = vols.filter(v => v.status === "approved").length;
    const pending = vols.filter(v => v.status === "pending").length;
    return { total: vols.length, approved, pending };
  }, [rawVols]);

  const fundPct = config.fundraising.goal > 0
    ? Math.round((config.fundraising.current || 0) / config.fundraising.goal * 100)
    : 0;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard icon={Users} label="Teams" value={String(regStats.total)} sub={`${regStats.confirmed} confirmed · ${regStats.pending} pending`} />
        <StatCard icon={DollarSign} label="Revenue" value={`$${regStats.revenue.toLocaleString()}`} sub={`+ $${regStats.donations.toLocaleString()} donations`} color="#22c55e" />
        <StatCard icon={HandHelping} label="Volunteers" value={String(volStats.total)} sub={`${volStats.approved} approved · ${volStats.pending} pending`} color={B.secondary} />
        <StatCard icon={Thermometer} label="Fundraising" value={`${fundPct}%`} sub={`$${(config.fundraising.current || 0).toLocaleString()} / $${(config.fundraising.goal || 0).toLocaleString()}`} color={B.primary} />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid #ffffff10", paddingBottom: 2 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 16px", background: "transparent", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 700, fontFamily: "'Inter',sans-serif",
            color: tab === t.id ? B.accent : "#ffffff50",
            borderBottom: tab === t.id ? `2px solid ${B.accent}` : "2px solid transparent",
            display: "flex", alignItems: "center", gap: 6,
          }}><t.icon size={14} /> {t.label}</button>
        ))}
      </div>
      {tab === "registrations" && <RegistrationsPanel />}
      {tab === "volunteers" && <VolunteersPanel />}
      {tab === "fundraising" && <FundraisingPanel />}
      {tab === "ledger" && <LedgerPanel />}
      {tab === "rules" && <RulesPanel />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PUBLISH — with ID Badge Preview
   ═══════════════════════════════════════════════════════════ */
// Full event lifecycle, in order. draft → registration_open is gated by the
// charity-commitment check below; the rest are plain manual advances (no
// date/calendar automation — confirmed out of scope).
const STATUS_FLOW = ["draft", "registration_open", "registration_closed", "game_day", "completed", "archived"];
const STATUS_LABELS = {
  draft: "Draft",
  registration_open: "Registration Open",
  registration_closed: "Registration Closed",
  game_day: "Game Day",
  completed: "Completed",
  archived: "Archived",
};

function EventStatusCard() {
  const { config, eventId, refetch } = useEvent();
  const status = config.event.status || "draft";
  const isPublished = status !== "draft";
  const [advancing, setAdvancing] = useState(false);
  const [publishError, setPublishError] = useState(null);

  const statusIndex = STATUS_FLOW.indexOf(status);
  const nextStatus = statusIndex >= 0 ? STATUS_FLOW[statusIndex + 1] : null;

  const handleAdvance = async () => {
    if (advancing || !nextStatus) return;
    setAdvancing(true);
    setPublishError(null);
    try {
      if (nextStatus === "registration_open" && config.cause.isCharity) {
        const published = await commitmentsApi.getPublished(eventId);
        if (!published) {
          setPublishError("This is a charity event — ask your org admin to add and publish a beneficiary commitment before this event can go live.");
          return;
        }
      }
      await eventsApi.updateStatus(eventId, nextStatus);
      await refetch();
    } catch (err) {
      console.error("Failed to advance event status:", err);
      setPublishError("Failed to update event status. Please try again.");
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div style={{ ...S.card, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Event Status</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Badge status={status} label={STATUS_LABELS[status] || status} />
          <span style={{ fontSize: 12, color: "#ffffff50" }}>
            {isPublished ? "Public page is live at /e/" + eventId : "Public page returns \"not public yet\" until published"}
          </span>
        </div>
      </div>
      {nextStatus ? (
        <div style={{ textAlign: "right" }}>
          <button onClick={handleAdvance} disabled={advancing} style={{ ...S.btn("#22c55e", "#fff"), opacity: advancing ? 0.7 : 1 }}>
            {status === "draft" ? <Globe size={14} /> : <ArrowRight size={14} />}
            {advancing ? "Updating..." : status === "draft" ? "Publish Event" : `Advance to ${STATUS_LABELS[nextStatus]}`}
          </button>
          {publishError && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>{publishError}</p>}
        </div>
      ) : (
        <span style={{ fontSize: 12, color: "#ffffff50", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={14} /> Final stage</span>
      )}
    </div>
  );
}

function PublishContext() {
  const { config } = useEvent();
  const B = config.brand;
  const EVENT = config.event;
  const [artifacts, setArtifacts] = useState(INIT_ARTIFACTS);
  const [showBadge, setShowBadge] = useState(false);
  const advance = (id) => {
    const flow = { draft: "review", review: "approved", approved: "published" };
    setArtifacts(prev => prev.map(a => a.id === id ? { ...a, status: flow[a.status] || a.status } : a));
  };
  const icons = { schedule: Calendar, volunteer_package: HandHelping, resource_directory: Phone, gift_basket_page: Gift, id_badges: BadgeCheck, rules: BookOpen };

  return (
    <div>
      <EventStatusCard />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div><h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Artifact Publisher</h2>
          <p style={{ fontSize: 13, color: "#ffffff50" }}>Generate, review, approve, publish.</p></div>
        <button style={S.btn(B.accent, B.dark)}><Zap size={14} /> Generate All Drafts</button>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {artifacts.map(a => {
          const Icon = icons[a.type] || FileText;
          const labels = { draft: "Send to Review", review: "Approve", approved: "Publish" };
          return (
            <div key={a.id} style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#ffffff08", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={18} color={B.accent} /></div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{a.title}</p>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}><Badge status={a.status} /><span style={{ fontSize: 11, color: "#ffffff40" }}>{a.audience}</span></div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {a.type === "id_badges" && <button onClick={() => setShowBadge(!showBadge)} style={S.btnSm("#ffffff10", "#ffffffaa")}><Eye size={14} /> Preview</button>}
                  {a.status !== "published" && <button onClick={() => advance(a.id)} style={S.btn(a.status === "approved" ? "#22c55e" : B.accent, a.status === "approved" ? "#fff" : B.dark)}>{labels[a.status]}</button>}
                  {a.status === "published" && <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={14} /> Live</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ID Badge Preview */}
      {showBadge && (
        <div style={{ marginTop: 20, ...S.card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}><BadgeCheck size={16} color={B.accent} /> ID Badge Preview — 69×104mm, 4-up on A4</h3>
            <button onClick={() => setShowBadge(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} color="#ffffff50" /></button>
          </div>
          <p style={{ fontSize: 12, color: "#ffffff50", marginBottom: 16 }}>Front and back printed on same sheet, fold at bottom edge. Cut along dotted lines.</p>

          {/* 2x2 preview grid simulating A4 */}
          <div style={{ background: "#ffffff", borderRadius: 8, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 500 }}>
            {["Jane Smith|Captain|Pallino Pushers", "Mike Chen|Player|Pallino Pushers", "Tom Wilson|Captain|Bocce Ballers", "Sarah Lee|Player|Bocce Ballers"].map((d, i) => {
              const [name, role, team] = d.split("|");
              return (
                <div key={i} style={{ border: "1px dashed #ccc", borderRadius: 4, overflow: "hidden" }}>
                  {/* Front */}
                  <div style={{ background: B.dark, padding: "12px 10px", textAlign: "center", height: 100, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: B.primary + "30", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}><Trophy size={12} color={B.primary} /></div>
                    <p style={{ fontSize: 7, color: B.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{EVENT.name || config.org.name}</p>
                    <p style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{name}</p>
                    <p style={{ fontSize: 7, color: "#ffffffaa", marginTop: 1 }}>{team}</p>
                    <span style={{ fontSize: 6, fontWeight: 700, color: B.dark, background: role === "Captain" ? B.accent : B.secondary, padding: "1px 6px", borderRadius: 4, marginTop: 4, display: "inline-block" }}>{role.toUpperCase()}</span>
                  </div>
                  {/* Fold line */}
                  <div style={{ borderTop: "2px dashed #aaa", position: "relative" }}>
                    <span style={{ position: "absolute", right: 4, top: -6, fontSize: 6, color: "#999", background: "#fff", padding: "0 2px" }}>✂ fold</span>
                  </div>
                  {/* Back */}
                  <div style={{ background: "#f5f5f0", padding: "8px 10px", height: 100, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <p style={{ fontSize: 7, fontWeight: 700, color: B.dark, marginBottom: 4, textTransform: "uppercase" }}>Event Info</p>
                    <p style={{ fontSize: 6, color: "#333", lineHeight: 1.6 }}>📅 {EVENT.date || "TBD"}<br />📍 {EVENT.venue || "TBD"}<br />🕐 Until {EVENT.endTime || "TBD"}<br />📶 Wi-Fi: {config.org.name ? `${config.org.name}-Guest` : "Guest"}</p>
                    <div style={{ borderTop: "1px solid #ddd", marginTop: 6, paddingTop: 4 }}>
                      <p style={{ fontSize: 6, fontWeight: 700, color: "#333" }}>Emergency: 555-123-4567</p>
                      <p style={{ fontSize: 5, color: "#999", marginTop: 2 }}>First Aid: Main Pavilion</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button style={S.btn(B.accent, B.dark)}><Printer size={14} /> Generate Print PDF</button>
            <button style={S.btn("#ffffff10", "#ffffffaa")}><Download size={14} /> Download Template</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GAME DAY — FORMAT SIMULATOR
   ═══════════════════════════════════════════════════════════ */
function FormatSimulator() {
  const { config } = useEvent();
  const B = config.brand;
  const [teams, setTeams] = useState(24);
  const [format, setFormat] = useState("double_elim");
  const [areas, setAreas] = useState(6);
  const [timePerMatch, setTimePerMatch] = useState(25);

  const calc = useMemo(() => {
    let matches = 0, rounds = 0, desc = "";
    const t = teams;
    if (format === "single_elim") {
      matches = t - 1;
      rounds = Math.ceil(Math.log2(t));
      desc = `${rounds} rounds, ${matches} matches. Losers eliminated immediately.`;
    } else if (format === "double_elim") {
      matches = 2 * (t - 1);
      rounds = Math.ceil(Math.log2(t)) * 2 + 1;
      desc = `~${rounds} rounds, ~${matches} matches. Teams need 2 losses to be eliminated. Winners bracket + losers bracket + grand final.`;
    } else if (format === "round_robin") {
      matches = (t * (t - 1)) / 2;
      rounds = t - 1;
      desc = `${rounds} rounds, ${matches} matches. Every team plays every other team once.`;
    } else if (format === "pool_playoff") {
      const poolCount = Math.ceil(t / 4);
      const poolMatches = poolCount * 6;
      const playoffTeams = poolCount * 2;
      const playoffMatches = playoffTeams - 1;
      matches = poolMatches + playoffMatches;
      rounds = 3 + Math.ceil(Math.log2(playoffTeams));
      desc = `${poolCount} pools of ~4. ${poolMatches} pool matches → top 2 per pool advance → ${playoffMatches} playoff matches. ${rounds} total rounds.`;
    } else if (format === "swiss") {
      rounds = Math.ceil(Math.log2(t));
      matches = Math.floor(t / 2) * rounds;
      desc = `${rounds} rounds, ${matches} matches. Teams paired by similar records each round.`;
    }
    const concurrent = Math.min(areas, Math.floor(t / 2));
    const totalMinutes = Math.ceil(matches / concurrent) * timePerMatch;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return { matches, rounds, desc, concurrent, totalMinutes, timeStr: `${hours}h ${mins}m`, fitsInDay: totalMinutes <= 480 };
  }, [teams, format, areas, timePerMatch]);

  return (
    <div style={S.card}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Sliders size={16} color={B.accent} /> Format Simulator</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>TEAMS</label>
          <input type="number" min="4" max="64" value={teams} onChange={e => setTeams(parseInt(e.target.value) || 4)} style={S.input} /></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>FORMAT</label>
          <select value={format} onChange={e => setFormat(e.target.value)} style={{ ...S.input, appearance: "none" }}>
            <option value="single_elim">Single Elimination</option>
            <option value="double_elim">Double Elimination</option>
            <option value="round_robin">Round Robin</option>
            <option value="pool_playoff">Pool → Playoffs</option>
            <option value="swiss">Swiss System</option>
          </select></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>PLAYING AREAS</label>
          <input type="number" min="1" max="20" value={areas} onChange={e => setAreas(parseInt(e.target.value) || 1)} style={S.input} /></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>MIN/MATCH</label>
          <input type="number" min="5" max="120" value={timePerMatch} onChange={e => setTimePerMatch(parseInt(e.target.value) || 5)} style={S.input} /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "#ffffff08", borderRadius: 10, padding: 14, textAlign: "center" }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{calc.matches}</p><p style={{ fontSize: 11, color: "#ffffff50" }}>Total Matches</p></div>
        <div style={{ background: "#ffffff08", borderRadius: 10, padding: 14, textAlign: "center" }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{calc.rounds}</p><p style={{ fontSize: 11, color: "#ffffff50" }}>Rounds</p></div>
        <div style={{ background: "#ffffff08", borderRadius: 10, padding: 14, textAlign: "center" }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{calc.concurrent}</p><p style={{ fontSize: 11, color: "#ffffff50" }}>Concurrent</p></div>
        <div style={{ background: calc.fitsInDay ? "#22c55e10" : "#ef444410", borderRadius: 10, padding: 14, textAlign: "center", border: `1px solid ${calc.fitsInDay ? "#22c55e30" : "#ef444430"}` }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: calc.fitsInDay ? "#22c55e" : "#ef4444" }}>{calc.timeStr}</p><p style={{ fontSize: 11, color: "#ffffff50" }}>Estimated Duration</p></div>
      </div>

      <p style={{ fontSize: 13, color: "#ffffffaa", lineHeight: 1.6, background: "#ffffff04", padding: 14, borderRadius: 10 }}>{calc.desc}</p>

      {!calc.fitsInDay && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, color: "#ef4444", fontSize: 12, fontWeight: 600 }}>
          <AlertCircle size={14} /> Exceeds 8-hour window. Consider adding playing areas or changing format.
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GAME DAY CONTEXT (FULL)
   ═══════════════════════════════════════════════════════════ */
function GameDayContext() {
  const { config, eventId } = useEvent();
  const { adminUser } = useAuth();
  const B = config.brand;
  // Phase 6b: control_desk is Read-only on Match Engine per the trimmed
  // RLS (migration 019) — only team check-in and captaincy transfer are
  // RPC-gated and still work for this role. Hiding rather than disabling
  // the rest so control_desk doesn't see buttons that now silently fail.
  const isControlDesk = adminUser?.role === "control_desk";

  // Realtime data
  const { teams: allTeams, checkedIn: checkedInTeams, loading: teamsLoading } = useRealtimeTeams(eventId);
  const { matches: allMatches, live: liveMatches, completed: completedMatches } = useRealtimeMatches(eventId);
  const { data: areas, loading: areasLoading } = useRealtimeAreas(eventId);

  // Local UI state
  const [tab, setTab] = useState("overview");
  const [clockRunning, setClockRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const [actionError, setActionError] = useState(null);
  const [announcementText, setAnnouncementText] = useState("");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  useEffect(() => {
    if (clockRunning) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [clockRunning]);

  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => setActionError(null), 5000);
    return () => clearTimeout(timer);
  }, [actionError]);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleCheckIn = async (teamId) => {
    setActionError(null);
    try {
      await teamsApi.checkIn(teamId);
    } catch (err) {
      console.error("Check-in failed:", err);
      setActionError("Check-in failed. Please try again.");
    }
  };

  const handleNoShow = async (teamId) => {
    setActionError(null);
    try {
      const teamMatch = allMatches.find(m =>
        ["scheduled", "ready"].includes(m.status) &&
        (m.team_a_id === teamId || m.team_b_id === teamId)
      );
      if (teamMatch) {
        const winnerId = teamMatch.team_a_id === teamId ? teamMatch.team_b_id : teamMatch.team_a_id;
        const loserId = teamId;
        await matchesApi.awardBye(teamMatch.id, winnerId, loserId);
      }
    } catch (err) {
      console.error("No-show failed:", err);
      setActionError("Failed to process no-show. Please try again.");
    }
  };

  const handleGenerateBracket = async () => {
    setActionError(null);
    try {
      // TODO: Full bracket generation — seed teams, create matches
      await bracketsApi.create(eventId, "Main Bracket", "single_elimination", config.tournament.format);
    } catch (err) {
      console.error("Generate bracket failed:", err);
      setActionError("Failed to generate bracket.");
    }
  };

  const handleAssignAreas = async () => {
    setActionError(null);
    // TODO: Auto-assign matches to available playing areas
    setActionError("Auto-assign not yet implemented. Use the match list to assign individually.");
  };

  const handleReassignCaptain = async () => {
    setActionError(null);
    // TODO: needs match selection UI. For now, stub with message.
    setActionError("Select a specific match to reassign home captain.");
  };

  const handleForceVerify = async () => {
    setActionError(null);
    const pendingVerify = allMatches.find(m => m.status === "score_entered");
    if (!pendingVerify) {
      setActionError("No matches awaiting verification.");
      return;
    }
    try {
      await matchesApi.forceVerify(pendingVerify.id);
    } catch (err) {
      console.error("Force verify failed:", err);
      setActionError("Failed to force verify.");
    }
  };

  const handleAwardBye = async () => {
    setActionError(null);
    const byeMatch = allMatches.find(m => ["scheduled", "ready"].includes(m.status) && (!m.team_a_id || !m.team_b_id));
    if (!byeMatch) {
      setActionError("No matches with a missing opponent to award a bye.");
      return;
    }
    try {
      const winnerId = byeMatch.team_a_id || byeMatch.team_b_id;
      const loserId = byeMatch.team_a_id ? byeMatch.team_b_id : byeMatch.team_a_id;
      await matchesApi.awardBye(byeMatch.id, winnerId, loserId);
    } catch (err) {
      console.error("Award bye failed:", err);
      setActionError("Failed to award bye.");
    }
  };

  const handleResolveDispute = async () => {
    setActionError(null);
    const disputed = allMatches.find(m => m.status === "disputed");
    if (!disputed) {
      setActionError("No disputed matches.");
      return;
    }
    try {
      await matchesApi.resolveDispute(disputed.id, disputed.team_a_score, disputed.team_b_score);
    } catch (err) {
      console.error("Resolve dispute failed:", err);
      setActionError("Failed to resolve dispute.");
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementText.trim()) return;
    setSendingAnnouncement(true);
    setActionError(null);
    try {
      await announcementsApi.create(eventId, announcementText.trim(), {
        priority: "normal",
        showOnTV: true,
        // createdBy: adminUserId, // TODO: add when auth layer exists
      });
      setAnnouncementText("");
    } catch (err) {
      console.error("Send announcement failed:", err);
      setActionError("Failed to send announcement.");
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "simulator", label: "Format Simulator", icon: Sliders },
    { id: "checkin", label: "Captain QR", icon: QrCode },
  ];

  return (
    <div>
      {/* Master Clock */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, background: clockRunning ? `${B.primary}10` : "#ffffff06", border: `1px solid ${clockRunning ? B.primary + "30" : "#ffffff10"}`, borderRadius: 16, padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Timer size={20} color={clockRunning ? B.primary : "#ffffff50"} />
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 1 }}>Tournament Clock</p>
            <p style={{ fontSize: 32, fontWeight: 900, color: "#fff", fontFamily: "monospace", letterSpacing: 2 }}>{formatTime(elapsed)}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setClockRunning(!clockRunning)} style={S.btn(clockRunning ? "#ef4444" : "#22c55e")}>
            {clockRunning ? <><Pause size={14} /> Pause</> : <><Play size={14} /> {elapsed > 0 ? "Resume" : "Start Tournament"}</>}
          </button>
          {elapsed > 0 && <button onClick={() => { setClockRunning(false); setElapsed(0); }} style={S.btn("#ffffff10", "#ffffff60")}><RefreshCw size={14} /> Reset</button>}
          <button style={S.btn("#ffffff10", "#ffffffaa")}><Monitor size={14} /> TV Display</button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid #ffffff10", paddingBottom: 2 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 16px", background: "transparent", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 700, fontFamily: "'Inter',sans-serif",
            color: tab === t.id ? B.accent : "#ffffff50",
            borderBottom: tab === t.id ? `2px solid ${B.accent}` : "2px solid transparent",
            display: "flex", alignItems: "center", gap: 6,
          }}><t.icon size={14} /> {t.label}</button>
        ))}
      </div>

      {tab === "simulator" && <FormatSimulator />}

      {tab === "checkin" && (
        <div style={{ display: "grid", gap: 16 }}>
          <CaptainQRPanel teams={allTeams} />
          <CaptainQRBatchPanel teams={allTeams} />
        </div>
      )}

      {tab === "overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
            <StatCard icon={UserCheck} label="Checked In" value={`${checkedInTeams.length}/${allTeams.length}`} sub="teams arrived" color="#22c55e" />
            <StatCard icon={CircleDot} label="Areas" value={String((areas || []).length)} sub={`${(areas || []).filter(a => a.status === "available").length} available`} color={B.accent} />
            <StatCard icon={Trophy} label="Matches" value={String(completedMatches.length)} sub={`${liveMatches.length} live`} color={B.primary} />
            <StatCard icon={Ban} label="No-Shows" value={String(allTeams.filter(t => t.eliminated).length)} sub={allTeams.some(t => t.eliminated) ? "byes awarded" : "none"} color="#6b7280" />
          </div>

          {actionError && (
            <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 10, background: "#ef444415", border: "1px solid #ef444430", color: "#ef4444", fontSize: 13, fontWeight: 600 }}>
              {actionError}
            </div>
          )}

          {/* Check-in */}
          <div style={{ ...S.card, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><UserCheck size={16} color={B.accent} /> Team Check-In</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {allTeams.map(t => {
                const captain = t.players?.find(p => p.is_captain);
                return (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: t.checked_in ? "#22c55e08" : t.eliminated ? "#ef444408" : "#ffffff04", borderRadius: 10, border: `1px solid ${t.checked_in ? "#22c55e20" : t.eliminated ? "#ef444420" : "#ffffff08"}` }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{t.name}</p>
                      <p style={{ fontSize: 12, color: "#ffffff50" }}>{captain?.full_name || ""} · {captain?.phone || ""}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {!t.checked_in && !t.eliminated && <>
                        <button onClick={() => handleCheckIn(t.id)} style={S.btn("#22c55e")}><Check size={14} /> Check In</button>
                        {/* No-Show calls matchesApi.awardBye(), which writes to `matches` —
                            control_desk is Read-only there per migration 019, so this would
                            silently fail for that role even though it's not literally
                            "Match Engine" UI; hidden alongside it for the same reason. */}
                        {!isControlDesk && (
                          <button onClick={() => handleNoShow(t.id)} style={S.btnSm("#ef444420", "#ef4444")} title="No-show — award bye to opponent"><Ban size={14} /> No-Show</button>
                        )}
                      </>}
                      {t.checked_in && <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={14} /> Checked In</span>}
                      {t.eliminated && <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Ban size={14} /> No-Show (bye awarded)</span>}
                    </div>
                  </div>
                );
              })}
              {allTeams.length === 0 && <p style={{ fontSize: 13, color: "#ffffff40", textAlign: "center", padding: 20 }}>No confirmed teams yet — confirm payments in Build first</p>}
            </div>
          </div>

          {/* Areas Grid */}
          <div style={{ ...S.card, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><CircleDot size={16} color={B.accent} /> Playing Areas</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              {(areas || []).map(area => {
                const matchOnArea = allMatches.find(m =>
                  m.playing_area_id === area.id &&
                  ["live", "score_entered", "disputed"].includes(m.status)
                );
                const statusLabel = matchOnArea ? "Live" : area.status === "maintenance" ? "Maintenance" : "Available";
                const statusColor = matchOnArea ? "#22c55e" : area.status === "maintenance" ? "#ef4444" : "#22c55e";

                return (
                  <div key={area.id} style={{ padding: 16, borderRadius: 12, border: "1px solid #ffffff10", background: "#ffffff04", textAlign: "center" }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{area.name || `${config.event.areaLabel || "Court"} ${area.number}`}</p>
                    <p style={{ fontSize: 12, color: statusColor, fontWeight: 600, marginTop: 4 }}>{statusLabel}</p>
                    {matchOnArea && (
                      <p style={{ fontSize: 11, color: "#ffffff40", marginTop: 2 }}>
                        {matchOnArea.team_a?.name || "?"} vs {matchOnArea.team_b?.name || "?"}
                      </p>
                    )}
                  </div>
                );
              })}
              {(!areas || areas.length === 0) && (
                <p style={{ fontSize: 13, color: "#ffffff40", textAlign: "center", padding: 20, gridColumn: "1 / -1" }}>
                  No playing areas configured. Create them in the Wizard.
                </p>
              )}
            </div>
          </div>

          {/* Match Engine — control_desk is Read-only here per migration 019
              (Match Engine = Read for control_desk, Full for referee), so
              these writes are hidden entirely rather than shown-then-failing. */}
          {!isControlDesk && (
            <div style={{ ...S.card, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><Zap size={16} color={B.accent} /> Match Engine</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={handleGenerateBracket} style={S.btn("#ffffff10", "#ffffffaa")}><Shuffle size={14} /> Generate Bracket</button>
                <button onClick={handleAssignAreas} style={S.btn("#ffffff10", "#ffffffaa")}><ArrowUpDown size={14} /> Assign Areas</button>
                <button onClick={handleReassignCaptain} style={S.btn("#ffffff10", "#ffffffaa")}><RefreshCw size={14} /> Reassign Home Captain</button>
                <button onClick={handleForceVerify} style={S.btn("#ffffff10", "#ffffffaa")}><CheckCircle size={14} /> Force Verify Score</button>
                <button onClick={handleAwardBye} style={S.btn("#ffffff10", "#ffffffaa")}><SkipForward size={14} /> Award Bye</button>
                <button onClick={handleResolveDispute} style={S.btn("#ffffff10", "#ffffffaa")}><AlertCircle size={14} /> Resolve Dispute</button>
              </div>
            </div>
          )}

          {/* Announcements — same Match Engine bucket; control_desk gets Read only. */}
          {!isControlDesk && (
            <div style={S.card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><Bell size={16} color={B.accent} /> Announcements</h3>
              <div style={{ display: "flex", gap: 10 }}>
                <input style={{ ...S.input, flex: 1 }} placeholder="PA / TV ticker announcement..." value={announcementText} onChange={e => setAnnouncementText(e.target.value)} />
                <button onClick={handleSendAnnouncement} disabled={sendingAnnouncement || !announcementText.trim()} style={S.btn(B.accent, B.dark)}><Send size={14} /> {sendingAnnouncement ? "Sending..." : "Send"}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CAPTAIN QR — staff-facing kiosk (FEATURE_SPEC_entitlements_and_
   identity.md Phase 3, staffed-only per Phase 3b). Search/select a team,
   generate its captain's QR/magic-link check-in code via the Netlify
   function, always as the authenticated staff session — the unattended
   shared-secret "kiosk" path was removed server-side in Phase 3b.
   checked_in is informational only here (a status badge); re-issuing a
   QR for an already-checked-in captain is allowed (lost phone, or Phase
   4's captaincy transfer).
   ═══════════════════════════════════════════════════════════ */
function CaptainQRPanel({ teams }) {
  const { config } = useEvent();
  const { session } = useAuth();
  const B = config.brand;

  const [query, setQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrFor, setQrFor] = useState(null); // { id, name } of the player the current QR was issued for
  const [loading, setLoading] = useState(false);
  const [transferringTo, setTransferringTo] = useState(null); // player id currently mid-transfer
  const [error, setError] = useState(null);

  const filtered = (teams || []).filter(t => (t.name || "").toLowerCase().includes(query.toLowerCase()));
  const selectedTeam = (teams || []).find(t => t.id === selectedTeamId);
  const captain = selectedTeam?.players?.find(p => p.is_captain);
  const otherPlayers = (selectedTeam?.players || []).filter(p => !p.is_captain);

  useEffect(() => {
    setQrDataUrl(null);
    setQrFor(null);
    setError(null);
  }, [selectedTeamId]);

  const issueQR = async (playerId, playerName) => {
    const { action_link } = await playersApi.generateLoginQR(playerId, session?.access_token);
    const dataUrl = await QRCode.toDataURL(action_link, { width: 240, margin: 1 });
    setQrDataUrl(dataUrl);
    setQrFor({ id: playerId, name: playerName });
  };

  const handleGenerate = async () => {
    if (!captain) return;
    setLoading(true);
    setError(null);
    try {
      await issueQR(captain.id, captain.full_name);
    } catch (err) {
      console.error("Generate check-in QR failed:", err);
      setError(err.message || "Failed to generate QR code.");
    } finally {
      setLoading(false);
    }
  };

  // Phase 4: flip is_captain from the outgoing to the incoming player
  // (team-scoped updates, gated by "Admin full players" today — see the
  // Phase 4 report for the open note on that policy not yet being
  // narrowed to admin/referee/control_desk specifically), then
  // immediately issue and display the new captain's QR.
  const handleTransfer = async (incoming) => {
    if (!captain || !selectedTeam) return;
    setTransferringTo(incoming.id);
    setError(null);
    try {
      await playersApi.transferCaptaincy(selectedTeam.id, captain.id, incoming.id);
      await issueQR(incoming.id, incoming.full_name);
    } catch (err) {
      console.error("Captaincy transfer failed:", err);
      setError(err.message || "Failed to transfer captaincy.");
    } finally {
      setTransferringTo(null);
    }
  };

  return (
    <div style={S.card}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <QrCode size={16} color={B.accent} /> Captain Check-In QR
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <input style={S.input} placeholder="Search team..." value={query} onChange={e => setQuery(e.target.value)} />
          <div style={{ marginTop: 10, maxHeight: 320, overflowY: "auto", display: "grid", gap: 6 }}>
            {filtered.map(t => {
              const c = t.players?.find(p => p.is_captain);
              return (
                <button key={t.id} onClick={() => setSelectedTeamId(t.id)} style={{
                  textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${selectedTeamId === t.id ? "#ffffff30" : "#ffffff10"}`,
                  background: selectedTeamId === t.id ? "#ffffff10" : "#ffffff04", color: "#fff",
                  fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</p>
                    <p style={{ fontSize: 11, color: "#ffffff50" }}>{c?.full_name || "No captain set"}</p>
                  </div>
                  {c?.checked_in && <span style={S.badge("#22c55e")}>Checked in</span>}
                </button>
              );
            })}
            {filtered.length === 0 && <p style={{ fontSize: 12, color: "#ffffff40", padding: 10 }}>No teams match.</p>}
          </div>

          {selectedTeam && otherPlayers.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Transfer Captaincy
              </p>
              <div style={{ display: "grid", gap: 6 }}>
                {otherPlayers.map(p => (
                  <button key={p.id} onClick={() => handleTransfer(p)} disabled={transferringTo !== null}
                    style={{ ...S.btnSm("#ffffff08", "#ffffffaa"), justifyContent: "space-between", width: "100%" }}>
                    <span>{p.full_name}</span>
                    <span>{transferringTo === p.id ? "Transferring..." : "Make Captain"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 260 }}>
          {!selectedTeam && <p style={{ fontSize: 12, color: "#ffffff40", textAlign: "center" }}>Select a team to generate its captain's check-in QR.</p>}
          {selectedTeam && !captain && <p style={{ fontSize: 12, color: "#ef4444", textAlign: "center" }}>This team has no captain set — assign one first.</p>}
          {selectedTeam && captain && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {captain.checked_in
                ? <span style={S.badge("#22c55e")}>Already checked in</span>
                : <span style={S.badge("#6b7280")}>Not checked in yet</span>}
            </div>
          )}
          {selectedTeam && captain && !qrDataUrl && (
            <button onClick={handleGenerate} disabled={loading} style={S.btn(B.accent, B.dark)}>
              {loading ? "Generating..." : captain.checked_in ? `Re-issue QR for ${captain.full_name}` : `Generate QR for ${captain.full_name}`}
            </button>
          )}
          {qrDataUrl && qrFor && (
            <>
              <img src={qrDataUrl} alt="Captain check-in QR code" style={{ width: 220, height: 220, borderRadius: 12, background: "#fff", padding: 8 }} />
              <p style={{ fontSize: 12, color: "#ffffffaa", textAlign: "center" }}>{qrFor.name} — {selectedTeam.name}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={qrDataUrl} download={`checkin-qr-${(selectedTeam.name || "team").replace(/\s+/g, "-")}.png`} style={{ ...S.btnSm("#ffffff10", "#ffffffaa"), textDecoration: "none" }}>
                  <Download size={12} /> Download
                </a>
                <button onClick={() => issueQR(qrFor.id, qrFor.name)} style={S.btnSm("#ffffff10", "#ffffffaa")}>Regenerate</button>
              </div>
            </>
          )}
          {error && <p style={{ fontSize: 12, color: "#ef4444", textAlign: "center" }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CAPTAIN QR — BATCH / PRINT (Phase 4). Generates every team's captain
   QR ahead of time and lays them out as one printable sheet (grid of
   QR + name + team) — format confirmed with project owner 2026-07-26
   ("both": printable sheet as the primary view, plus per-captain
   download). Each card also gets its own download link for staff who
   want a per-team output instead of cutting up the sheet.
   ═══════════════════════════════════════════════════════════ */
function CaptainQRBatchPanel({ teams }) {
  const { config } = useEvent();
  const { session } = useAuth();
  const B = config.brand;

  const [items, setItems] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const captainedTeams = (teams || []).filter(t => t.players?.some(p => p.is_captain));

  const handleGenerateAll = async () => {
    setRunning(true);
    setItems([]);
    setProgress({ done: 0, total: captainedTeams.length });

    const results = [];
    for (const t of captainedTeams) {
      const cap = t.players.find(p => p.is_captain);
      try {
        const { action_link } = await playersApi.generateLoginQR(cap.id, session?.access_token);
        const dataUrl = await QRCode.toDataURL(action_link, { width: 200, margin: 1 });
        results.push({ teamId: t.id, teamName: t.name, captainName: cap.full_name, checkedIn: cap.checked_in, dataUrl, error: null });
      } catch (err) {
        console.error(`Generate QR failed for team ${t.name}:`, err);
        results.push({ teamId: t.id, teamName: t.name, captainName: cap.full_name, dataUrl: null, error: err.message || "Failed" });
      }
      setProgress(p => ({ ...p, done: p.done + 1 }));
    }
    setItems(results);
    setRunning(false);
  };

  return (
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <Printer size={16} color={B.accent} /> Printed QR Fallback — All Captains
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleGenerateAll} disabled={running || captainedTeams.length === 0} style={S.btn(B.accent, B.dark)}>
            {running ? `Generating ${progress.done}/${progress.total}...` : `Generate All (${captainedTeams.length})`}
          </button>
          {items.length > 0 && !running && (
            <button onClick={() => window.print()} style={S.btn("#ffffff10", "#ffffffaa")}><Printer size={14} /> Print Sheet</button>
          )}
        </div>
      </div>

      {captainedTeams.length === 0 && (
        <p style={{ fontSize: 13, color: "#ffffff40", textAlign: "center", padding: 20 }}>No teams with a captain set yet.</p>
      )}

      {items.length > 0 && (
        <div className="qr-print-sheet" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
          {items.map(it => (
            <div key={it.teamId} style={{ textAlign: "center", padding: 12, borderRadius: 12, border: "1px solid #ffffff10", background: "#ffffff04" }}>
              {it.dataUrl ? (
                <img src={it.dataUrl} alt={`${it.captainName} check-in QR`} style={{ width: "100%", maxWidth: 150, borderRadius: 8, background: "#fff", padding: 6 }} />
              ) : (
                <p style={{ fontSize: 11, color: "#ef4444", padding: "30px 0" }}>Failed: {it.error}</p>
              )}
              <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginTop: 8 }}>{it.captainName}</p>
              <p style={{ fontSize: 11, color: "#ffffff50" }}>{it.teamName}</p>
              {it.checkedIn && <span style={{ ...S.badge("#22c55e"), marginTop: 4 }}>Checked in</span>}
              {it.dataUrl && (
                <a href={it.dataUrl} download={`checkin-qr-${(it.teamName || "team").replace(/\s+/g, "-")}.png`} style={{ display: "block", marginTop: 6, fontSize: 11, color: B.accent, textDecoration: "none" }}>
                  Download
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEAM CONTEXT — admin roster + event-scoped invites
   (super_admin / org_admin only)
   ═══════════════════════════════════════════════════════════ */
const EVENT_ROLES = [
  { id: "admin", label: "Admin — full event access" },
  { id: "treasurer", label: "Treasurer — registrations & payments" },
  { id: "referee", label: "Referee — game day match ops" },
  { id: "volunteer_coord", label: "Volunteer Coordinator" },
  { id: "control_desk", label: "Control Desk — court/bracket control" },
];

/* ═══════════════════════════════════════════════════════════
   BILLING SUMMARY — read-only. org_admin/super_admin only (migration
   026 RLS); writes still happen exclusively in SuperAdminDashboard.
   Org-scoped, not event-scoped — this is the one place in AdminDashboard
   that's already org-level rather than per-event (org-wide invites live
   here too), so it's the natural home rather than bolting billing onto
   a single event's tab.
   ═══════════════════════════════════════════════════════════ */
function BillingSummaryCard({ orgId, B }) {
  const [subscription, setSubscription] = useState(null);
  const [eventBilling, setEventBilling] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      billingApi.getSubscriptionForOrg(orgId),
      billingApi.listEventBillingForOrg(orgId),
    ]).then(([sub, eb]) => {
      setSubscription(sub);
      setEventBilling(eb);
    }).catch(err => {
      console.error("Failed to load billing summary:", err);
      setLoadError("Failed to load billing.");
    }).finally(() => setLoading(false));
  }, [orgId]);

  return (
    <div style={S.card}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}><Card size={16} color={B.accent} /> Billing</h3>
      <p style={{ fontSize: 12, color: "#ffffff50", marginBottom: 16 }}>Read-only — contact Cocomo to change your plan or billing status.</p>

      {loading && <p style={{ fontSize: 13, color: "#ffffff50" }}>Loading…</p>}
      {loadError && <p style={{ fontSize: 13, color: "#ef4444" }}>{loadError}</p>}

      {!loading && !loadError && (
        <>
          <div style={{ padding: "12px 14px", background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff08", marginBottom: 12 }}>
            {subscription ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{subscription.billing_plans?.name || "—"}</p>
                  <p style={{ fontSize: 12, color: "#ffffff50" }}>${subscription.billing_plans?.price} · {subscription.billing_plans?.type}</p>
                </div>
                <span style={S.badge(subscription.status === "active" ? "#22c55e" : subscription.status === "past_due" ? "#ef4444" : "#f59e0b")}>{subscription.status.replace("_", " ")}</span>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#ffffff40" }}>No subscription on file.</p>
            )}
          </div>

          {eventBilling.length > 0 && (
            <div style={{ display: "grid", gap: 8 }}>
              {eventBilling.map(eb => (
                <div key={eb.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff08" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{eb.events?.name || "—"}</p>
                    <p style={{ fontSize: 11, color: "#ffffff50" }}>{eb.billing_type.replace("_", " ")}{eb.amount ? ` · $${eb.amount}` : ""}</p>
                  </div>
                  <span style={S.badge(eb.status === "paid" ? "#22c55e" : "#f59e0b")}>{eb.status}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TeamContext() {
  const { config, eventId } = useEvent();
  const { adminUser } = useAuth();
  const B = config.brand;
  const orgId = config?._raw?.org_id;

  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [inviting, setInviting] = useState(false);
  const [result, setResult] = useState(null); // { kind: "success"|"error", msg, link? }

  const refresh = async () => {
    if (!orgId || !eventId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await adminApi.listEventTeam(orgId, eventId);
      setTeam(rows);
    } catch (err) {
      console.error("Failed to load team:", err);
      setLoadError("Failed to load team members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [orgId, eventId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setResult(null);
    if (!email.trim()) {
      setResult({ kind: "error", msg: "Email is required." });
      return;
    }
    setInviting(true);
    try {
      const invite = await adminApi.createInvite(email.trim(), role, {
        orgId,
        eventId,
        invitedBy: adminUser?.id,
      });
      const link = `${window.location.origin}/accept-invite?token=${invite.token}`;
      setResult({ kind: "success", msg: "Invite created. Send this link:", link });
      setEmail("");
      await refresh();
    } catch (err) {
      console.error("Invite failed:", err);
      setResult({ kind: "error", msg: err.message || "Failed to create invite." });
    } finally {
      setInviting(false);
    }
  };

  const scopeLabel = (a) => {
    if (a.org_id === null) return "Platform-wide";
    if (a.event_id === null) return "Org-wide";
    if (a.event_id === eventId) return "This event";
    return "Other event";
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Invite form */}
      <div style={S.card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}><UserPlus size={16} color={B.accent} /> Invite Team Member</h3>
        <p style={{ fontSize: 12, color: "#ffffff50", marginBottom: 16 }}>Creates an invite scoped to this event. They set a password via the accept link.</p>
        <form onSubmit={handleInvite} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>EMAIL</label>
            <input type="email" style={S.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="person@email.com" />
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", display: "block", marginBottom: 4 }}>ROLE</label>
            <select style={{ ...S.input, appearance: "none" }} value={role} onChange={e => setRole(e.target.value)}>
              {EVENT_ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <button type="submit" disabled={inviting} style={S.btn(B.accent, B.dark)}><Send size={14} /> {inviting ? "Inviting..." : "Send Invite"}</button>
        </form>
        {result && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: result.kind === "error" ? "#ef444415" : "#22c55e15", border: `1px solid ${result.kind === "error" ? "#ef444440" : "#22c55e40"}` }}>
            <p style={{ fontSize: 13, color: result.kind === "error" ? "#ff8a8a" : "#86efac" }}>{result.msg}</p>
            {result.link && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <code style={{ fontSize: 11, color: "#fff", background: "#00000040", padding: "6px 8px", borderRadius: 6, wordBreak: "break-all", flex: 1 }}>{result.link}</code>
                <button type="button" onClick={() => navigator.clipboard?.writeText(result.link).catch(() => {})} style={{ background: "#ffffff15", border: "none", cursor: "pointer", color: "#fff", padding: 6, borderRadius: 6, flexShrink: 0 }} title="Copy link"><Copy size={14} /></button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Roster */}
      <div style={S.card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Shield size={16} color={B.accent} /> Current Team {!loading && <span style={{ fontSize: 12, color: "#ffffff40", fontWeight: 600 }}>({team.length})</span>}</h3>
        {loading && <p style={{ fontSize: 13, color: "#ffffff50" }}>Loading team...</p>}
        {loadError && <p style={{ fontSize: 13, color: "#ef4444" }}>{loadError}</p>}
        {!loading && !loadError && team.length === 0 && <p style={{ fontSize: 13, color: "#ffffff40" }}>No team members yet.</p>}
        <div style={{ display: "grid", gap: 8 }}>
          {team.map(a => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#ffffff04", borderRadius: 10, border: "1px solid #ffffff08" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{a.display_name || a.email}</p>
                <p style={{ fontSize: 12, color: "#ffffff50" }}>{a.email}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={S.badge(B.accent)}>{(a.role || "").replace("_", " ")}</span>
                <p style={{ fontSize: 11, color: "#ffffff40", marginTop: 4 }}>{scopeLabel(a)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BillingSummaryCard orgId={orgId} B={B} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROLE → TAB VISIBILITY
   ═══════════════════════════════════════════════════════════ */
const ROLE_TABS = {
  super_admin: ["build", "publish", "gameday", "team"],
  org_admin: ["build", "publish", "gameday", "team"],
  admin: ["build", "publish", "gameday"],
  treasurer: ["build"],
  volunteer_coord: ["build"],
  referee: ["gameday"],
  control_desk: ["gameday"],
};

/* ═══════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   FULFILLMENT ACTION BANNER — persistent, in-app only (no email/
   notification infra exists in this project). Fires when the event has
   completed, is a charity event, and its published commitment is still
   waiting on fulfillment evidence.
   ═══════════════════════════════════════════════════════════ */
function FulfillmentActionBanner({ config, eventId, onGoToFundraising }) {
  const { adminUser } = useAuth();
  const [published, setPublished] = useState(null);
  const canAct = adminUser?.role === "org_admin" || adminUser?.role === "super_admin";

  useEffect(() => {
    if (!eventId || !config.cause.isCharity || config.event.status !== "completed") {
      setPublished(null);
      return;
    }
    commitmentsApi.getPublished(eventId).then(setPublished).catch(() => setPublished(null));
  }, [eventId, config.cause.isCharity, config.event.status]);

  if (!published || published.fulfillment_status !== "pending") return null;

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
      background: "#f59e0b15", border: "1px solid #f59e0b40", borderRadius: 12, padding: "14px 18px", marginBottom: 20,
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <AlertCircle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Action needed: beneficiary fulfillment evidence</p>
          <p style={{ fontSize: 12, color: "#ffffff70", marginTop: 2 }}>
            {canAct
              ? `This event is complete — submit evidence that ${published.beneficiary?.name || "the beneficiary"} received the committed proceeds.`
              : `This event needs its beneficiary fulfillment evidence submitted — ask your org admin.`}
          </p>
        </div>
      </div>
      {canAct && (
        <button onClick={onGoToFundraising} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "#f59e0b", color: "#0a0a0a", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
          Go to Fundraising
        </button>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { config, eventId } = useEvent();
  const { adminUser, signOut } = useAuth();
  const navigate = useNavigate();
  const B = config.brand;

  const allCtxs = [
    { id: "build", label: "Build", icon: Settings },
    { id: "publish", label: "Publish", icon: FileText },
    { id: "gameday", label: "Game Day", icon: Zap },
    { id: "team", label: "Team", icon: Shield },
  ];

  const visibleIds = ROLE_TABS[adminUser?.role] || ["build", "publish", "gameday"];
  const ctxs = allCtxs.filter(c => visibleIds.includes(c.id));
  const [ctx, setCtx] = useState(visibleIds[0]);

  // If the role/visible tabs change (e.g. adminUser resolves after mount),
  // keep the active tab valid for this role.
  useEffect(() => {
    if (!visibleIds.includes(ctx)) setCtx(visibleIds[0]);
  }, [adminUser?.role]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const roleLabel = (adminUser?.role || "").replace("_", " ");

  return (
    <div style={{ minHeight: "100vh", background: B.dark, color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #ffffff20; border-radius: 3px; }
        @media print {
          body * { visibility: hidden; }
          .qr-print-sheet, .qr-print-sheet * { visibility: visible; }
          .qr-print-sheet { position: absolute; top: 0; left: 0; width: 100%; }
        }`}</style>

      <header style={{ borderBottom: "1px solid #ffffff10", background: `${B.dark}ee`, backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: B.primary + "30", display: "flex", alignItems: "center", justifyContent: "center" }}><Trophy size={16} color={B.primary} /></div>
              <div><p style={{ fontSize: 14, fontWeight: 800 }}>{config.event?.name || "Admin Dashboard"}</p><p style={{ fontSize: 10, color: "#ffffff40" }}>Admin Dashboard</p></div>
            </div>
            <div style={{ height: 28, width: 1, background: "#ffffff15", margin: "0 8px" }} />
            <div style={{ display: "flex", gap: 4, background: "#ffffff06", borderRadius: 10, padding: 3 }}>
              {ctxs.map(c => (
                <button key={c.id} onClick={() => setCtx(c.id)} style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: ctx === c.id ? B.accent + "20" : "transparent",
                  color: ctx === c.id ? B.accent : "#ffffff50",
                  fontSize: 12, fontWeight: 700, fontFamily: "'Inter',sans-serif",
                  display: "flex", alignItems: "center", gap: 5,
                }}><c.icon size={13} /> {c.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{adminUser?.display_name || adminUser?.email || "—"}</p>
              {roleLabel && <p style={{ fontSize: 10, color: B.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{roleLabel}</p>}
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: B.secondary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
              {(adminUser?.display_name || adminUser?.email || "?").slice(0, 2).toUpperCase()}
            </div>
            <button onClick={handleSignOut} title="Sign out" style={{ background: "#ffffff10", border: "none", cursor: "pointer", color: "#ffffffaa", padding: "7px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><LogOut size={14} /> Sign Out</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <FulfillmentActionBanner config={config} eventId={eventId} onGoToFundraising={() => setCtx("build")} />
        {ctx === "build" && <BuildContext />}
        {ctx === "publish" && <PublishContext />}
        {ctx === "gameday" && <GameDayContext />}
        {ctx === "team" && <TeamContext />}
      </main>
    </div>
  );
}
