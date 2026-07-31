-- ═══════════════════════════════════════════════════════════════════════
-- Migration 021: Beneficiaries + event beneficiary commitments
-- ═══════════════════════════════════════════════════════════════════════
-- Phase 1 of the CC work order for
-- FEATURE_SPEC_billing_and_beneficiary_commitments.md (§1-§4).
--
-- `beneficiaries` belongs to an org (the org vouches for/manages the
-- charity record; a beneficiary can be reused across that org's events).
-- `event_beneficiary_commitments` ties one beneficiary to one event with
-- a typed commitment + post-event fulfillment tracking (spec §4).
--
-- `verified`/`verified_at` are set by the app-side fake verification stub
-- (Phase 2, verifyBeneficiaryRegistration()) — no real registry sync
-- exists; see work order "Decisions made" section.
--
-- Fulfillment evidence defaults to private (admin/super_admin-visible
-- only) per work order decision — no public read path in this migration.
--
-- NOT APPLIED TO THE LIVE DB. Same manual-application pattern as every
-- other migration in this project — committed for the project owner to
-- run via the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- Part A: beneficiaries
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE beneficiaries (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  registration_number   TEXT,
  website               TEXT,
  contact_name          TEXT,
  contact_email         TEXT,
  logo_url              TEXT,
  verified              BOOLEAN DEFAULT false NOT NULL,
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_beneficiaries_org ON beneficiaries(org_id);

ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full beneficiaries" ON beneficiaries FOR ALL USING (
  is_super_admin() OR is_org_admin_for(org_id)
);

-- ─────────────────────────────────────────────────────────────────────
-- Part B: event_beneficiary_commitments
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE event_beneficiary_commitments (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  beneficiary_id        UUID NOT NULL REFERENCES beneficiaries(id),
  commitment_text       TEXT,
  signed_by             UUID REFERENCES admin_users(id),
  signed_at             TIMESTAMPTZ,
  status                TEXT DEFAULT 'draft' NOT NULL,      -- draft | published

  -- Post-event fulfillment accountability (spec §4)
  fulfillment_status    TEXT DEFAULT 'pending' NOT NULL,     -- pending | submitted | confirmed | disputed
  evidence_submitted_at TIMESTAMPTZ,
  evidence_files        JSONB DEFAULT '[]'::jsonb,           -- [{url, filename, uploaded_at}] — same shape as events.field_layout_files
  evidence_description  TEXT,
  reviewed_by           UUID REFERENCES admin_users(id),
  reviewed_at           TIMESTAMPTZ,

  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_event_beneficiary_commitments_event ON event_beneficiary_commitments(event_id);
CREATE INDEX idx_event_beneficiary_commitments_beneficiary ON event_beneficiary_commitments(beneficiary_id);

ALTER TABLE event_beneficiary_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full event_beneficiary_commitments" ON event_beneficiary_commitments FOR ALL USING (
  is_event_admin_for(event_id)
);
