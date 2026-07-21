import { useState, useMemo, useEffect, useRef } from "react";
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
  BadgeCheck, QrCode, Scissors
} from "lucide-react";
import { useEvent } from "../context/EventContext";
import { useAuth } from "../context/AuthContext";
import { registrations as registrationsApi, volunteers as volunteersApi, events as eventsApi, teams as teamsApi, matches as matchesApi, announcements as announcementsApi, brackets as bracketsApi, activityLog } from "../services/api";
import { useRealtimeRegistrations, useRealtimeTeams, useRealtimeMatches, useRealtimeAreas } from "../hooks/useRealtime";
import { useScreenLock } from "../hooks/useScreenLock";

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

function Badge({ status }) {
  const m = { paid: "#22c55e", pending: "#f59e0b", confirmed: "#22c55e", submitted: "#f59e0b", rejected: "#ef4444", approved: "#22c55e", declined: "#ef4444", draft: "#6b7280", review: "#3b82f6", published: "#22c55e" };
  return <span style={S.badge(m[status] || "#6b7280")}>{status}</span>;
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

  const { isActive, queuePosition, queueLength, activeAdminName, recordActivity } =
    useScreenLock(eventId, "registrations", adminUser?.id, adminUser?.display_name);
  const canEdit = isActive;

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

  // Queues a partial-field change for a registration, e.g. { payment: "paid" } or { status: "approved" }
  const queueChange = (id, fields) => {
    setChanges(prev => ({ ...prev, [id]: { ...prev[id], ...fields } }));
  };
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

      setChanges({});
    } catch (err) {
      console.error("Batch update failed:", err);
      setSubmitError("Failed to save changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  const discardAll = () => setChanges({});

  const filtered = useMemo(() => {
    let list = data.map(getEffective);
    if (filter === "pending") list = list.filter(r => r.payment === "pending");
    else if (filter === "paid") list = list.filter(r => r.payment === "paid");
    else if (filter === "confirmed") list = list.filter(r => r.status === "confirmed");
    if (search) list = list.filter(r => r.teamName.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [data, changes, filter, search]);

  const changeCount = Object.keys(changes).length;

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
              return (
                <tr key={r.id} onClick={() => setExpanded(expanded === r.id ? null : r.id)}
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
function FundraisingPanel() {
  const { config, eventId } = useEvent();
  const B = config.brand;

  const goal = config.fundraising.goal || 15000;
  const [saved, setSaved] = useState(config.fundraising.current || 0);
  const [current, setCurrent] = useState(config.fundraising.current || 0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const changed = current !== saved;

  useEffect(() => {
    const configCurrent = config.fundraising.current || 0;
    setSaved(configCurrent);
    setCurrent(configCurrent);
  }, [config.fundraising.current]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await eventsApi.updateFundraising(eventId, current);
      setSaved(current);
    } catch (err) {
      console.error("Fundraising update failed:", err);
      setSubmitError("Failed to update. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}><Thermometer size={16} color={B.accent} /> Fundraising</h3>
          <span style={{ fontSize: 12, color: "#ffffff50" }}>Goal: ${goal.toLocaleString()}</span>
        </div>
        <div style={{ height: 32, background: "#ffffff10", borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ height: "100%", borderRadius: 16, background: `linear-gradient(90deg, ${B.secondary}, ${B.accent})`, width: `${pct}%`, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 12, transition: "width 0.5s" }}>
            {pct > 8 && <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{Math.round(pct)}%</span>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center" }}>
          <div><p style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>${current.toLocaleString()}</p><p style={{ fontSize: 11, color: "#ffffff50" }}>Raised</p></div>
          <div><p style={{ fontSize: 24, fontWeight: 900, color: B.accent }}>${(goal - current).toLocaleString()}</p><p style={{ fontSize: 11, color: "#ffffff50" }}>Remaining</p></div>
          <div><p style={{ fontSize: 24, fontWeight: 900, color: B.secondary }}>{Math.round(pct)}%</p><p style={{ fontSize: 11, color: "#ffffff50" }}>Progress</p></div>
        </div>
      </div>
      <div style={S.card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#ffffff80", marginBottom: 12 }}>Update Amount</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ position: "relative", flex: 1 }}><span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#ffffff50" }}>$</span>
            <input type="number" value={current} onChange={e => setCurrent(parseInt(e.target.value) || 0)} style={{ ...S.input, paddingLeft: 28 }} /></div>
        </div>
      </div>
      <SubmitBar count={changed ? 1 : 0} onSubmit={handleSubmit} onDiscard={() => setCurrent(saved)} submitting={submitting} error={submitError} />
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
function BuildContext() {
  const { config, eventId } = useEvent();
  const B = config.brand;
  const [tab, setTab] = useState("registrations");
  const tabs = [
    { id: "registrations", label: "Registrations", icon: Users },
    { id: "volunteers", label: "Volunteers", icon: HandHelping },
    { id: "fundraising", label: "Fundraising", icon: Heart },
    { id: "rules", label: "Rules", icon: BookOpen },
  ];

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
      {tab === "rules" && <RulesPanel />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PUBLISH — with ID Badge Preview
   ═══════════════════════════════════════════════════════════ */
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
  const B = config.brand;

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
                        <button onClick={() => handleNoShow(t.id)} style={S.btnSm("#ef444420", "#ef4444")} title="No-show — award bye to opponent"><Ban size={14} /> No-Show</button>
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

          {/* Match Engine */}
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

          {/* Announcements */}
          <div style={S.card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><Bell size={16} color={B.accent} /> Announcements</h3>
            <div style={{ display: "flex", gap: 10 }}>
              <input style={{ ...S.input, flex: 1 }} placeholder="PA / TV ticker announcement..." value={announcementText} onChange={e => setAnnouncementText(e.target.value)} />
              <button onClick={handleSendAnnouncement} disabled={sendingAnnouncement || !announcementText.trim()} style={S.btn(B.accent, B.dark)}><Send size={14} /> {sendingAnnouncement ? "Sending..." : "Send"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const { config } = useEvent();
  const B = config.brand;
  const [ctx, setCtx] = useState("build");
  const ctxs = [
    { id: "build", label: "Build", icon: Settings },
    { id: "publish", label: "Publish", icon: FileText },
    { id: "gameday", label: "Game Day", icon: Zap },
  ];

  return (
    <div style={{ minHeight: "100vh", background: B.dark, color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #ffffff20; border-radius: 3px; }`}</style>

      <header style={{ borderBottom: "1px solid #ffffff10", background: `${B.dark}ee`, backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: B.primary + "30", display: "flex", alignItems: "center", justifyContent: "center" }}><Trophy size={16} color={B.primary} /></div>
              <div><p style={{ fontSize: 14, fontWeight: 800 }}>ETRC Bocce Classic</p><p style={{ fontSize: 10, color: "#ffffff40" }}>Admin Dashboard</p></div>
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
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#ffffff50" }}><ExternalLink size={16} /></button>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: B.secondary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>JH</div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        {ctx === "build" && <BuildContext />}
        {ctx === "publish" && <PublishContext />}
        {ctx === "gameday" && <GameDayContext />}
      </main>
    </div>
  );
}
