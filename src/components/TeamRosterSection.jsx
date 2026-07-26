// src/components/TeamRosterSection.jsx
// ─────────────────────────────────────────────────────────
// Team roster entry — replaces the old fixed-slot "Team Captain" +
// "Additional Players" sections entirely. Two alternative entry
// methods (not combined): spreadsheet upload (primary/default) or
// manual entry (secondary, via a fold/unfold toggle). Produces one
// locked-in roster array (captain first) via onConfirmed(), which the
// registration form uses at final submit time — this component never
// talks to Supabase itself.
//
// Per FEATURE_SPEC_team_roster_registration.md's revised "v1 — roster
// entry" section + direct clarification: the captain's contact info now
// lives here (either the checked row on the spreadsheet path, or the
// fixed first card on the manual path) — there is no separate top-level
// "Team Captain" field set anymore, and Submit Registration's captain_*
// fields are sourced from index 0 of the confirmed roster.
// ─────────────────────────────────────────────────────────

import { useState } from "react";
import { Upload, FileSpreadsheet, ChevronDown, ChevronRight, Check, AlertCircle, Shirt, UtensilsCrossed, Edit2 } from "lucide-react";
import { useEvent } from "../context/EventContext";
import RosterDropBox from "./RosterDropBox";

const INP = { width: "100%", padding: "10px 12px", background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 10, color: "#fff", fontSize: 13, fontFamily: "'Inter',sans-serif" };
const LBL = { display: "block", fontSize: 10, fontWeight: 700, color: "#ffffff60", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 };
const SEL = { ...INP, appearance: "none" };
const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

function emptyCard(isCaptain) {
  return { name: "", email: "", phone: "", shirt_size: "", dietary_needs: "", is_coach: false, expanded: false, _captain: isCaptain };
}

function hasAnyManualData(cards) {
  return cards.some((c) => c.name || c.email || c.phone || c.shirt_size || c.dietary_needs || c.is_coach);
}

/* ═══════════════════════════════════════════════════════════
   MANUAL PATH — fixed captain card + up to playersMax player cards
   ═══════════════════════════════════════════════════════════ */
function ManualCard({ card, index, requireCoach, onChange, onToggleExpand, accent }) {
  const label = card._captain ? "Captain" : `Player ${index + 1}`;
  const headerName = card.name || label;
  return (
    <div style={{ background: "#ffffff04", border: "1px solid #ffffff08", borderRadius: 12, overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggleExpand}
        style={{ width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <span className="fb" style={{ fontSize: 13, fontWeight: 700, color: card.name ? "#fff" : "#ffffff50", display: "flex", alignItems: "center", gap: 8 }}>
          {card.expanded ? <ChevronDown size={14} color="#ffffff50" /> : <ChevronRight size={14} color="#ffffff50" />}
          {headerName}
          {card._captain && <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`, padding: "2px 8px", borderRadius: 10 }}>CAPTAIN</span>}
          {!card._captain && card.is_coach && <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`, padding: "2px 8px", borderRadius: 10 }}>COACH</span>}
        </span>
      </button>
      {card.expanded && (
        <div style={{ padding: "0 14px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ gridColumn: "1/-1" }}><label style={LBL}>Name *</label><input style={INP} value={card.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Full name" /></div>
            <div><label style={LBL}>Email *</label><input style={INP} type="email" value={card.email} onChange={(e) => onChange({ email: e.target.value })} placeholder="player@email.com" /></div>
            <div><label style={LBL}>Phone</label><input style={INP} type="tel" value={card.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="+1 250-555-0100" /></div>
            <div><label style={LBL}><Shirt size={9} style={{ display: "inline", verticalAlign: -1, marginRight: 3 }} /> Shirt Size</label>
              <select style={SEL} value={card.shirt_size} onChange={(e) => onChange({ shirt_size: e.target.value })}><option value="">Select</option>{SHIRT_SIZES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label style={LBL}><UtensilsCrossed size={9} style={{ display: "inline", verticalAlign: -1, marginRight: 3 }} /> Dietary Needs</label>
              <input style={INP} value={card.dietary_needs} onChange={(e) => onChange({ dietary_needs: e.target.value })} placeholder="Allergies, vegetarian..." /></div>
          </div>
          {!card._captain && requireCoach && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={card.is_coach} onChange={(e) => onChange({ is_coach: e.target.checked })} />
              <span className="fb" style={{ fontSize: 12, color: "#ffffffaa" }}>This person is the team coach</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

function ManualPath({ C, cards, setCards }) {
  const update = (i, patch) => setCards((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {cards.map((card, i) => (
        <ManualCard
          key={i}
          card={card}
          index={i}
          requireCoach={C.tournament.requireCoach}
          accent={C.brand.accent}
          onChange={(patch) => update(i, patch)}
          onToggleExpand={() => update(i, { expanded: !card.expanded })}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SPREADSHEET PATH — drop box + role assignment
   ═══════════════════════════════════════════════════════════ */
function UploadPath({ C, rows, setRows, fileWarnings, setFileWarnings, captainIdx, setCaptainIdx, coachIdx, setCoachIdx, onCleared }) {
  const requireCoach = C.tournament.requireCoach;
  const rolesAssigned = captainIdx != null && (!requireCoach || coachIdx != null);

  const handleParsed = (parsedRows, warnings) => {
    setRows(parsedRows);
    setFileWarnings(warnings || []);
    setCaptainIdx(null);
    setCoachIdx(null);
  };

  const handleCleared = () => {
    setRows([]);
    setFileWarnings([]);
    setCaptainIdx(null);
    setCoachIdx(null);
    onCleared?.();
  };

  const pickCaptain = (i) => {
    setCaptainIdx(i);
    if (coachIdx === i) setCoachIdx(null);
  };
  const pickCoach = (i) => setCoachIdx(i);
  const resetRoles = () => { setCaptainIdx(null); setCoachIdx(null); };

  return (
    <div>
      <RosterDropBox maxPlayers={C.tournament.playersMax} onParsed={handleParsed} onCleared={handleCleared} />

      {fileWarnings.length > 0 && (
        <div style={{ marginTop: 12, display: "grid", gap: 4 }}>
          {fileWarnings.map((w, i) => (
            <p key={i} className="fb" style={{ fontSize: 12, color: C.brand.accent, display: "flex", alignItems: "flex-start", gap: 6 }}>
              <AlertCircle size={13} style={{ marginTop: 1, flexShrink: 0 }} /> {w}
            </p>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {!rolesAssigned ? (
            <p className="fb" style={{ fontSize: 12, color: "#ffffff70", marginBottom: 10 }}>
              {captainIdx == null ? "Choose the team captain:" : `Choose the team coach (everyone but ${rows[captainIdx].name || "the captain"}):`}
            </p>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p className="fb" style={{ fontSize: 12, color: "#ffffff70" }}>Roles assigned.</p>
              <button type="button" onClick={resetRoles} className="fb" style={{ fontSize: 11, fontWeight: 600, color: C.brand.accent, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <Edit2 size={11} /> Change
              </button>
            </div>
          )}

          <div style={{ display: "grid", gap: 6 }}>
            {rows.map((r, i) => {
              const role = i === captainIdx ? "Captain" : i === coachIdx ? "Coach" : "Player";
              const selectableForCaptain = captainIdx == null;
              const selectableForCoach = captainIdx != null && coachIdx == null && i !== captainIdx && requireCoach;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, fontSize: 12,
                  background: r.warnings.length ? `${C.brand.primary}10` : "#ffffff04",
                  border: `1px solid ${r.warnings.length ? C.brand.primary + "30" : "#ffffff08"}`,
                }}>
                  {selectableForCaptain && (
                    <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}>
                      <input type="checkbox" checked={i === captainIdx} onChange={() => pickCaptain(i)} />
                      <span className="fb" style={{ fontSize: 11, color: "#ffffff60" }}>Captain</span>
                    </label>
                  )}
                  {selectableForCoach && (
                    <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}>
                      <input type="checkbox" checked={i === coachIdx} onChange={() => pickCoach(i)} />
                      <span className="fb" style={{ fontSize: 11, color: "#ffffff60" }}>Coach</span>
                    </label>
                  )}
                  {(rolesAssigned || (!selectableForCaptain && !selectableForCoach)) && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: role === "Player" ? "#ffffff40" : C.brand.accent, background: role === "Player" ? "transparent" : `${C.brand.accent}18`, padding: role === "Player" ? 0 : "2px 8px", borderRadius: 10, flexShrink: 0, minWidth: 50 }}>
                      {role.toUpperCase()}
                    </span>
                  )}
                  <span style={{ color: "#fff", fontWeight: 600, flex: 1 }}>{r.name || <em style={{ color: "#ffffff40" }}>no name</em>}</span>
                  <span style={{ color: "#ffffff60" }}>{r.email || <em style={{ color: "#ffffff40" }}>no email</em>}</span>
                  <span style={{ color: "#ffffff60" }}>{r.phone}</span>
                  {r.warnings.length > 0 && <AlertCircle size={13} color={C.brand.primary} style={{ flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OUTER SECTION — method toggle + confirm gate
   ═══════════════════════════════════════════════════════════ */
export default function TeamRosterSection({ onConfirmed }) {
  const { config: C } = useEvent();
  const minPlayers = C.tournament.playersMin;
  const maxPlayers = C.tournament.playersMax;
  const requireCoach = C.tournament.requireCoach;

  const [method, setMethod] = useState("upload");
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedRoster, setConfirmedRoster] = useState(null);

  // Upload-path state
  const [uploadRows, setUploadRows] = useState([]);
  const [fileWarnings, setFileWarnings] = useState([]);
  const [captainIdx, setCaptainIdx] = useState(null);
  const [coachIdx, setCoachIdx] = useState(null);

  // Manual-path state
  const [manualCards, setManualCards] = useState(() => Array.from({ length: maxPlayers }, (_, i) => emptyCard(i === 0)));

  const hasUploadData = uploadRows.length > 0;
  const hasManualData = hasAnyManualData(manualCards);

  const switchMethod = (next) => {
    if (next === method) return;
    const losingData = method === "upload" ? hasUploadData : hasManualData;
    if (losingData) {
      const label = method === "upload" ? "file upload" : "manual entry";
      const ok = window.confirm(`Changing to ${next === "upload" ? "file upload" : "manual entry"} will lose the information you've already added to ${label}. Proceed?`);
      if (!ok) return;
    }
    // Reset the method being left.
    if (method === "upload") {
      setUploadRows([]); setFileWarnings([]); setCaptainIdx(null); setCoachIdx(null);
    } else {
      setManualCards(Array.from({ length: maxPlayers }, (_, i) => emptyCard(i === 0)));
    }
    setConfirmed(false);
    setConfirmedRoster(null);
    onConfirmed(null);
    setMethod(next);
  };

  // ── Validation gates ──
  // Captain name + email are hard requirements here, not just the soft
  // "warn, don't block" treatment other rows/fields get — registrations.
  // captain_name/captain_email are NOT NULL columns fed directly from the
  // captain slot, so letting an empty one through would surface as a raw
  // DB error at final submit instead of a clear message here.
  const uploadCaptainComplete = captainIdx != null && uploadRows[captainIdx]?.name && uploadRows[captainIdx]?.email;
  const uploadRolesAssigned = uploadCaptainComplete && (!requireCoach || coachIdx != null);
  const uploadCanConfirm = uploadRolesAssigned && uploadRows.length >= minPlayers;

  const manualCaptainComplete = manualCards[0].name.trim() && manualCards[0].email.trim();
  const manualFilled = manualCards.filter((c) => c.name.trim());
  const manualCanConfirm = manualCaptainComplete && manualFilled.length >= minPlayers;

  const canConfirm = method === "upload" ? uploadCanConfirm : manualCanConfirm;

  const handleConfirm = () => {
    if (!canConfirm) return;
    let roster;
    if (method === "upload") {
      const captain = uploadRows[captainIdx];
      const coach = coachIdx != null ? uploadRows[coachIdx] : null;
      const rest = uploadRows.filter((_, i) => i !== captainIdx && i !== coachIdx);
      roster = [
        { ...captain, is_captain: true, is_coach: false },
        ...(coach ? [{ ...coach, is_captain: false, is_coach: true }] : []),
        ...rest.map((r) => ({ ...r, is_captain: false, is_coach: false })),
      ].map(({ warnings, ...r }) => r);
    } else {
      roster = manualFilled.map((c) => ({
        name: c.name, email: c.email, phone: c.phone, shirt_size: c.shirt_size, dietary_needs: c.dietary_needs,
        is_captain: c._captain, is_coach: !c._captain && c.is_coach,
      }));
    }
    setConfirmedRoster(roster);
    setConfirmed(true);
    onConfirmed(roster);
  };

  const editRoster = () => {
    setConfirmed(false);
    onConfirmed(null);
  };

  if (confirmed && confirmedRoster) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p className="fb" style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", display: "flex", alignItems: "center", gap: 6 }}><Check size={14} /> Roster confirmed ({confirmedRoster.length} players)</p>
          <button type="button" onClick={editRoster} className="fb" style={{ fontSize: 11, fontWeight: 600, color: C.brand.accent, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <Edit2 size={11} /> Edit roster
          </button>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {confirmedRoster.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, fontSize: 12, background: "#ffffff04", border: "1px solid #ffffff08" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: p.is_captain || p.is_coach ? C.brand.accent : "#ffffff40", minWidth: 50 }}>
                {p.is_captain ? "CAPTAIN" : p.is_coach ? "COACH" : "PLAYER"}
              </span>
              <span style={{ color: "#fff", fontWeight: 600, flex: 1 }}>{p.name}</span>
              <span style={{ color: "#ffffff60" }}>{p.email}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {method === "upload" ? (
        <UploadPath
          C={C}
          rows={uploadRows} setRows={setUploadRows}
          fileWarnings={fileWarnings} setFileWarnings={setFileWarnings}
          captainIdx={captainIdx} setCaptainIdx={setCaptainIdx}
          coachIdx={coachIdx} setCoachIdx={setCoachIdx}
        />
      ) : (
        <ManualPath C={C} cards={manualCards} setCards={setManualCards} />
      )}

      <button
        type="button"
        onClick={() => switchMethod(method === "upload" ? "manual" : "upload")}
        className="fb"
        style={{
          marginTop: 14, fontSize: 12, fontWeight: 700, color: C.brand.accent,
          background: `${C.brand.accent}12`, border: `1px solid ${C.brand.accent}30`, borderRadius: 20,
          padding: "6px 16px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
        }}
      >
        {method === "upload" ? <><FileSpreadsheet size={12} /> Enter team manually instead</> : <><Upload size={12} /> Upload a spreadsheet instead</>}
      </button>

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={handleConfirm}
          style={{
            padding: "10px 22px", borderRadius: 10, border: "none", cursor: canConfirm ? "pointer" : "default",
            background: canConfirm ? "#22c55e" : "#ffffff15", color: canConfirm ? "#fff" : "#ffffff30",
            fontSize: 13, fontWeight: 700, fontFamily: "'Inter',sans-serif", display: "inline-flex", alignItems: "center", gap: 8,
          }}
        >
          <Check size={14} /> OK — confirm roster
        </button>
        {!canConfirm && (
          <p className="fb" style={{ fontSize: 11, color: "#ffffff40", marginTop: 8 }}>
            {method === "upload" && captainIdx == null && "Choose a captain"}
            {method === "upload" && captainIdx != null && !uploadCaptainComplete && "The chosen captain needs both a name and an email"}
            {method === "upload" && uploadCaptainComplete && requireCoach && coachIdx == null && "Choose a coach"}
            {method === "upload" && uploadRolesAssigned && uploadRows.length < minPlayers && `Needs at least ${minPlayers} players (${uploadRows.length} on the sheet)`}
            {method === "manual" && !manualCaptainComplete && "Fill in the captain's name and email"}
            {method === "manual" && manualCaptainComplete && manualFilled.length < minPlayers && `Needs at least ${minPlayers} players filled in (${manualFilled.length} so far)`}
          </p>
        )}
      </div>
    </div>
  );
}
