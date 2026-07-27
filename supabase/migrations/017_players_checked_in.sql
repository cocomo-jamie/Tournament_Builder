-- ═══════════════════════════════════════════════════════════════════════
-- Migration 017: players.checked_in
-- ═══════════════════════════════════════════════════════════════════════
-- Part of FEATURE_SPEC_entitlements_and_identity.md Phase 1b (QR/magic-link
-- check-in design). Adds the flag that Phase 3's check-in landing page
-- sets to true on confirm.
--
-- NOT APPLIED TO THE LIVE DB. Per this project's established pattern
-- (see migrations 010/011/012/013 in PROJECT_STATUS.md), CC has no
-- psql/service-role access — this file is committed for manual
-- application via the Supabase SQL Editor by the project owner.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE players ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN players.checked_in IS 'Set true when this player (captain) completes the QR/magic-link check-in flow (Phase 3). Not linked to auth_user_id presence — a player can be linked without being checked in for a given event.';
