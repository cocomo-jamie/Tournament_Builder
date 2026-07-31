-- ═══════════════════════════════════════════════════════════════════════
-- Migration 022: public-safe beneficiary commitment view
-- ═══════════════════════════════════════════════════════════════════════
-- Phase 4 of the CC work order for
-- FEATURE_SPEC_billing_and_beneficiary_commitments.md — the four public/
-- registration-facing surfaces (public event page, team registration
-- form, volunteer application form, invite-acceptance flow) need to read
-- a *published* commitment's beneficiary name + commitment text.
--
-- Migration 021's RLS on `event_beneficiary_commitments` and
-- `beneficiaries` is admin-only (is_event_admin_for / is_org_admin_for) —
-- no public read path exists on either base table, deliberately. Rather
-- than add a blanket public SELECT policy (which would also expose
-- draft/disputed commitments and beneficiaries' contact_email etc — same
-- mistake migration 014 fixed for `players`), this adds one narrow view:
-- published commitments only, and only the two columns any of the four
-- public surfaces actually display.
--
-- Created without `security_invoker`, same reasoning as migration 014's
-- players_public — the view intentionally runs as its owner so it can
-- read across the base tables' admin-only RLS, but exposes nothing except
-- the columns selected here.
--
-- NOT APPLIED TO THE LIVE DB. Same manual-application pattern as every
-- other migration in this project — committed for the project owner to
-- run via the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW beneficiary_commitments_public AS
SELECT
  c.event_id,
  b.name AS beneficiary_name,
  c.commitment_text
FROM event_beneficiary_commitments c
JOIN beneficiaries b ON b.id = c.beneficiary_id
WHERE c.status = 'published';

GRANT SELECT ON beneficiary_commitments_public TO anon, authenticated;
