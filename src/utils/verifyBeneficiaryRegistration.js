// src/utils/verifyBeneficiaryRegistration.js
// ─────────────────────────────────────────────────────────
// PLACEHOLDER — this is a stand-in for a real charity registry check
// (e.g. the CRA's list of registered charities), not a real one. No
// external registry lookup exists in this project. This file is the
// ONLY place that decides `beneficiaries.verified` — swap the body of
// verifyBeneficiaryRegistration() for a real registry call later
// without touching any caller.
//
// Today it only validates the *shape* of a CRA charity registration
// number (9 digits + "RR" + a 4-digit account identifier, e.g.
// "123456789RR0001") and returns true/false on that alone. A
// well-formed number that was never registered will pass; this proves
// nothing about the charity actually existing.
// ─────────────────────────────────────────────────────────

const CRA_BN_FORMAT = /^\d{9}RR\d{4}$/;

export function verifyBeneficiaryRegistration(registrationNumber) {
  if (!registrationNumber || typeof registrationNumber !== "string") return false;
  return CRA_BN_FORMAT.test(registrationNumber.trim().toUpperCase());
}
