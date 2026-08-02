// src/components/BeneficiaryCommitmentNotice.jsx
// ─────────────────────────────────────────────────────────
// Shared notice for the four public/registration-facing surfaces (public
// event page, team registration form, volunteer application form,
// invite-acceptance flow). Reads a published beneficiary commitment via
// the public-safe beneficiary_commitments_public view (migration 022) and
// renders the beneficiary name + commitment text. Renders nothing when
// there's no eventId, no is_charity flag, or no published commitment —
// callers don't need to check anything themselves.
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { commitments as commitmentsApi } from "../services/api";

export default function BeneficiaryCommitmentNotice({ eventId, isCharity = true, accent = "#D4A843" }) {
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!eventId || !isCharity) {
      setNotice(null);
      return;
    }
    commitmentsApi.getPublicNotice(eventId)
      .then(data => { if (!cancelled) setNotice(data); })
      .catch(err => { console.error("BeneficiaryCommitmentNotice: getPublicNotice failed", err); if (!cancelled) setNotice(null); });
    return () => { cancelled = true; };
  }, [eventId, isCharity]);

  if (!notice) return null;

  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      background: `${accent}12`, border: `1px solid ${accent}35`,
      borderRadius: 12, padding: "14px 16px",
    }}>
      <Heart size={16} color={accent} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
          Supporting {notice.beneficiary_name}
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#ffffffcc", margin: 0 }}>{notice.commitment_text}</p>
      </div>
    </div>
  );
}
