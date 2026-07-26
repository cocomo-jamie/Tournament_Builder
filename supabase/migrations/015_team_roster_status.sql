-- ═══════════════════════════════════════════════════════════════════════
-- Migration 015: Team roster registration — status + registration link
-- ═══════════════════════════════════════════════════════════════════════
-- Part of FEATURE_SPEC_team_roster_registration.md Phase 1. Adds the
-- columns needed to track per-team and per-player approval status, and
-- to link a roster's players back to the registration that created them.
--
-- NOT APPLIED TO THE LIVE DB. Same manual-application pattern as every
-- other migration in this project (010/011, 012/013, 014) — CC has no
-- service-role/SQL-editor access. Committed for the project owner to run
-- via the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE teams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' NOT NULL;
COMMENT ON COLUMN teams.status IS 'pending, approved, rejected, withdrawn. Derived from player statuses (Phase 4), not independently set.';

ALTER TABLE players ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' NOT NULL;
COMMENT ON COLUMN players.status IS 'pending, approved, rejected, withdrawn. Set per-player by admin approval (Phase 4).';

ALTER TABLE players ADD COLUMN IF NOT EXISTS registration_id BIGINT REFERENCES registrations(id);
COMMENT ON COLUMN players.registration_id IS 'The registration whose roster submission created this player row. NULL for players created by other paths (e.g. pre-existing rows, admin-added).';

ALTER TABLE players ADD COLUMN IF NOT EXISTS self_registered BOOLEAN DEFAULT false NOT NULL;
COMMENT ON COLUMN players.self_registered IS 'True if this player row was created via self-registration (Path B, deferred — FEATURE_SPEC_team_roster_registration.md). Always false for rows created by the captain-submits-roster path built in this spec.';

CREATE INDEX IF NOT EXISTS idx_players_registration ON players(registration_id) WHERE registration_id IS NOT NULL;
