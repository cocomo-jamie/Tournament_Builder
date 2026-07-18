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

/* ═══════════════════════════════════════════════════════════
   BRAND & STYLES
   ═══════════════════════════════════════════════════════════ */
const B = { primary: "#C1121F", secondary: "#1B4D3E", accent: "#D4A843", dark: "#020e4b", light: "#F4F1EA" };
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
const INIT_REGS = [
  { id: 1, teamName: "The Pallino Pushers", captain: "Jane Smith", email: "jane@email.com", phone: "+1 250-555-0101", player2: "Mike Chen", p2shirt: "L", method: "e_transfer", payment: "paid", status: "confirmed", code: "EF-101", fee: 100, donation: 25, total: 125, date: "2026-07-10", slogan: "Born to throw" },
  { id: 2, teamName: "Bocce Ballers", captain: "Tom Wilson", email: "tom@email.com", phone: "+1 250-555-0102", player2: "Sarah Lee", p2shirt: "M", method: "e_transfer", payment: "pending", status: "submitted", code: "EF-102", fee: 100, donation: 0, total: 100, date: "2026-07-12", slogan: "Roll with it" },
  { id: 3, teamName: "Court Jesters", captain: "Amy Park", email: "amy@email.com", phone: "+1 250-555-0103", player2: "Dave Brown", p2shirt: "XL", method: "cash", payment: "pending", status: "submitted", code: "EF-103", fee: 100, donation: 50, total: 150, date: "2026-07-14", slogan: "" },
  { id: 4, teamName: "Rolling Stones", captain: "Chris Dao", email: "chris@email.com", phone: "+1 250-555-0104", player2: "Lin Zhang", p2shirt: "S", method: "stripe", payment: "paid", status: "confirmed", code: "EF-104", fee: 100, donation: 100, total: 200, date: "2026-07-15", slogan: "Can't stop us" },
  { id: 5, teamName: "Lawn & Order", captain: "Pat Riley", email: "pat@email.com", phone: "+1 250-555-0105", player2: "Jo Kim", p2shirt: "M", method: "e_transfer", payment: "pending", status: "submitted", code: "EF-105", fee: 100, donation: 0, total: 100, date: "2026-07-16", slogan: "Justice is served" },
];
const INIT_VOLS = [
  { id: 1, name: "Lisa Wong", email: "lisa@email.com", phone: "+1 250-555-0201", role: "Field Judges", other: ["Registration Desk"], exp: "3 charity events", certs: "First Aid", status: "pending" },
  { id: 2, name: "Mark Taylor", email: "mark@email.com", phone: "+1 250-555-0202", role: "Bar Staff", other: [], exp: "5 years bartending", certs: "Serving It Right", status: "approved" },
  { id: 3, name: "Sue Garcia", email: "sue@email.com", phone: "+1 250-555-0203", role: "Food Staff", other: ["Token Purchase Crew"], exp: "BBQ enthusiast", certs: "Food Safe L1", status: "pending" },
  { id: 4, name: "Dan Fisher", email: "dan@email.com", phone: "+1 250-555-0204", role: "Media", other: [], exp: "Amateur photographer", certs: "", status: "pending" },
];
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
function StatCard({ icon: Icon, label, value, sub, color = B.accent }) {
  return (
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={18} color={color} /></div>
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
function SubmitBar({ count, onSubmit, onDiscard }) {
  if (count === 0) return null;
  return (
    <div style={{ position: "sticky", bottom: 0, left: 0, right: 0, background: `${B.accent}15`, borderTop: `2px solid ${B.accent}40`, backdropFilter: "blur(12px)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 40, marginTop: 20, borderRadius: "14px 14px 0 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: B.accent + "30", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: B.accent }}>{count}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: B.accent }}>pending change{count !== 1 ? "s" : ""}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onDiscard} style={S.btn("#ffffff10", "#ffffffaa")}><Undo2 size={14} /> Discard All</button>
        <button onClick={onSubmit} style={S.btn(B.accent, B.dark)}><Save size={14} /> Submit Updates</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUILD — REGISTRATIONS (with batch submit)
   ═══════════════════════════════════════════════════════════ */
function RegistrationsPanel() {
  const [data, setData] = useState(INIT_REGS);
  const [changes, setChanges] = useState({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const queueChange = (id, field, value) => {
    setChanges(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };
  const getEffective = (r) => ({ ...r, ...(changes[r.id] || {}) });
  const hasChange = (id) => !!changes[id];
  const submitAll = () => { setData(prev => prev.map(r => ({ ...r, ...(changes[r.id] || {}) }))); setChanges({}); };
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
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#ffffff40" }} />
          <input style={{ ...S.input, paddingLeft: 34 }} placeholder="Search teams, codes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {["all", "pending", "paid", "confirmed"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ ...S.btnSm(filter === f ? B.accent + "20" : "transparent", filter === f ? B.accent : "#ffffff50"), border: `1px solid ${filter === f ? B.accent + "40" : "#ffffff15"}` }}>
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
                  <td style={S.td}><Badge status={r.payment} /></td>
                  <td style={S.td}><Badge status={r.status} /></td>
                  <td style={S.td} onClick={e => e.stopPropagation()}>
                    {r.payment === "pending" && r.status !== "rejected" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => queueChange(r.id, "payment", "paid") || queueChange(r.id, "status", "confirmed")} style={S.btnSm("#22c55e20", "#22c55e")} title="Mark paid"><Check size={14} /></button>
                        <button onClick={() => queueChange(r.id, "status", "rejected")} style={S.btnSm("#ef444420", "#ef4444")} title="Reject"><X size={14} /></button>
                      </div>
                    ) : r.payment === "paid" && changed ? (
                      <button onClick={() => queueChange(r.id, "payment", "pending") || queueChange(r.id, "status", "submitted")} style={S.btnSm("#f59e0b20", "#f59e0b")} title="Undo"><Undo2 size={14} /></button>
                    ) : r.payment === "paid" ? (
                      <CheckCircle size={16} color="#22c55e" />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SubmitBar count={changeCount} onSubmit={submitAll} onDiscard={discardAll} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUILD — VOLUNTEERS (with batch submit)
   ═══════════════════════════════════════════════════════════ */
function VolunteersPanel() {
  const [data, setData] = useState(INIT_VOLS);
  const [changes, setChanges] = useState({});

  const queue = (id, val) => setChanges(prev => ({ ...prev, [id]: val }));
  const eff = (v) => changes[v.id] !== undefined ? { ...v, status: changes[v.id] } : v;
  const submitAll = () => { setData(prev => prev.map(v => changes[v.id] !== undefined ? { ...v, status: changes[v.id] } : v)); setChanges({}); };
  const discardAll = () => setChanges({});
  const changeCount = Object.keys(changes).length;

  return (
    <div>
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
      <SubmitBar count={changeCount} onSubmit={submitAll} onDiscard={discardAll} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUILD — FUNDRAISING (with submit)
   ═══════════════════════════════════════════════════════════ */
function FundraisingPanel() {
  const [saved, setSaved] = useState(1250);
  const [current, setCurrent] = useState(1250);
  const goal = 15000;
  const pct = Math.min(100, (current / goal) * 100);
  const changed = current !== saved;

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
          <div><p style={{ fontSize: 24, fontWeight: 900, color: B.secondary }}>8%</p><p style={{ fontSize: 11, color: "#ffffff50" }}>Progress</p></div>
        </div>
      </div>
      <div style={S.card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#ffffff80", marginBottom: 12 }}>Update Amount</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ position: "relative", flex: 1 }}><span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#ffffff50" }}>$</span>
            <input type="number" value={current} onChange={e => setCurrent(parseInt(e.target.value) || 0)} style={{ ...S.input, paddingLeft: 28 }} /></div>
        </div>
      </div>
      <SubmitBar count={changed ? 1 : 0} onSubmit={() => setSaved(current)} onDiscard={() => setCurrent(saved)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUILD — TOURNAMENT RULES
   ═══════════════════════════════════════════════════════════ */
function RulesPanel() {
  const [saved, setSaved] = useState("## Tournament Rules\n\n1. Games are played to 15 points with a 20-minute time cap.\n2. If time expires, the team with more points wins.\n3. Closest ball to the pallino scores. Measurements by field judge are final.\n4. Teams must report to their assigned court within 5 minutes of being called or forfeit.\n5. Captains are responsible for entering and verifying scores.\n6. The tournament referee's decision is final on all disputes.\n7. Have fun — this is for charity!");
  const [draft, setDraft] = useState(saved);
  const changed = draft !== saved;

  return (
    <div>
      <div style={{ ...S.card }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}><BookOpen size={16} color={B.accent} /> Tournament Rules</h3>
        <p style={{ fontSize: 12, color: "#ffffff50", marginBottom: 16 }}>Markdown supported. Published to the /rules page and included in team packages.</p>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={16} style={{ ...S.input, resize: "vertical", lineHeight: 1.7, fontSize: 14 }} />
      </div>
      <SubmitBar count={changed ? 1 : 0} onSubmit={() => setSaved(draft)} onDiscard={() => setDraft(saved)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUILD CONTEXT (MAIN)
   ═══════════════════════════════════════════════════════════ */
function BuildContext() {
  const [tab, setTab] = useState("registrations");
  const tabs = [
    { id: "registrations", label: "Registrations", icon: Users },
    { id: "volunteers", label: "Volunteers", icon: HandHelping },
    { id: "fundraising", label: "Fundraising", icon: Heart },
    { id: "rules", label: "Rules", icon: BookOpen },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard icon={Users} label="Teams" value="5" sub="2 confirmed · 3 pending" />
        <StatCard icon={DollarSign} label="Revenue" value="$325" sub="+ $175 donations" color="#22c55e" />
        <StatCard icon={HandHelping} label="Volunteers" value="4" sub="1 approved · 3 pending" color={B.secondary} />
        <StatCard icon={Thermometer} label="Fundraising" value="8%" sub="$1,250 / $15,000" color={B.primary} />
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
                    <p style={{ fontSize: 7, color: B.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>ETRC Bocce Classic</p>
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
                    <p style={{ fontSize: 6, color: "#333", lineHeight: 1.6 }}>📅 Aug 29, 2026<br />📍 ETRC Clubhouse<br />🕐 Until 18:00<br />📶 Wi-Fi: ETRC-Guest</p>
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
  const [tab, setTab] = useState("overview");
  const [clockRunning, setClockRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const [checkedIn, setCheckedIn] = useState({});
  const [noShows, setNoShows] = useState({});

  useEffect(() => {
    if (clockRunning) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [clockRunning]);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const confirmed = INIT_REGS.filter(r => r.status === "confirmed");
  const checkIn = (id) => setCheckedIn(p => ({ ...p, [id]: true }));
  const markNoShow = (id) => setNoShows(p => ({ ...p, [id]: true }));

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
            <StatCard icon={UserCheck} label="Checked In" value={`${Object.keys(checkedIn).length}/${confirmed.length}`} sub="teams arrived" color="#22c55e" />
            <StatCard icon={CircleDot} label="Areas" value="6" sub="all available" color={B.accent} />
            <StatCard icon={Trophy} label="Matches" value="0" sub="not started" color={B.primary} />
            <StatCard icon={Ban} label="No-Shows" value={Object.keys(noShows).length} sub={Object.keys(noShows).length > 0 ? "byes awarded" : "none"} color="#6b7280" />
          </div>

          {/* Check-in */}
          <div style={{ ...S.card, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><UserCheck size={16} color={B.accent} /> Team Check-In</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {confirmed.map(r => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: checkedIn[r.id] ? "#22c55e08" : noShows[r.id] ? "#ef444408" : "#ffffff04", borderRadius: 10, border: `1px solid ${checkedIn[r.id] ? "#22c55e20" : noShows[r.id] ? "#ef444420" : "#ffffff08"}` }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{r.teamName}</p>
                    <p style={{ fontSize: 12, color: "#ffffff50" }}>{r.captain} · {r.phone}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!checkedIn[r.id] && !noShows[r.id] && <>
                      <button onClick={() => checkIn(r.id)} style={S.btn("#22c55e")}><Check size={14} /> Check In</button>
                      <button onClick={() => markNoShow(r.id)} style={S.btnSm("#ef444420", "#ef4444")} title="No-show — award bye to opponent"><Ban size={14} /> No-Show</button>
                    </>}
                    {checkedIn[r.id] && <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={14} /> Checked In</span>}
                    {noShows[r.id] && <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Ban size={14} /> No-Show (bye awarded)</span>}
                  </div>
                </div>
              ))}
              {confirmed.length === 0 && <p style={{ fontSize: 13, color: "#ffffff40", textAlign: "center", padding: 20 }}>No confirmed teams yet — confirm payments in Build first</p>}
            </div>
          </div>

          {/* Areas Grid */}
          <div style={{ ...S.card, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><CircleDot size={16} color={B.accent} /> Playing Areas</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} style={{ padding: 16, borderRadius: 12, border: "1px solid #ffffff10", background: "#ffffff04", textAlign: "center" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Court {n}</p>
                  <p style={{ fontSize: 12, color: "#22c55e", fontWeight: 600, marginTop: 4 }}>Available</p>
                </div>
              ))}
            </div>
          </div>

          {/* Match Engine */}
          <div style={{ ...S.card, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><Zap size={16} color={B.accent} /> Match Engine</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button style={S.btn("#ffffff10", "#ffffffaa")}><Shuffle size={14} /> Generate Bracket</button>
              <button style={S.btn("#ffffff10", "#ffffffaa")}><ArrowUpDown size={14} /> Assign Areas</button>
              <button style={S.btn("#ffffff10", "#ffffffaa")}><RefreshCw size={14} /> Reassign Home Captain</button>
              <button style={S.btn("#ffffff10", "#ffffffaa")}><CheckCircle size={14} /> Force Verify Score</button>
              <button style={S.btn("#ffffff10", "#ffffffaa")}><SkipForward size={14} /> Award Bye</button>
              <button style={S.btn("#ffffff10", "#ffffffaa")}><AlertCircle size={14} /> Resolve Dispute</button>
            </div>
          </div>

          {/* Announcements */}
          <div style={S.card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><Bell size={16} color={B.accent} /> Announcements</h3>
            <div style={{ display: "flex", gap: 10 }}>
              <input style={{ ...S.input, flex: 1 }} placeholder="PA / TV ticker announcement..." />
              <button style={S.btn(B.accent, B.dark)}><Send size={14} /> Send</button>
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
