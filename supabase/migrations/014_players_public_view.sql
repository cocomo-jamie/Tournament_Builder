-- ═══════════════════════════════════════════════════════════════════════
-- Migration 014: players PII exposure fix (public-safe roster view)
-- ═══════════════════════════════════════════════════════════════════════
-- Found during Phase 1 of the identity work (FEATURE_SPEC_entitlements_
-- and_identity.md), not introduced by it. schema.sql's original
-- "Public read players basic" ON players FOR SELECT USING (true) was
-- never narrowed by any prior migration — anyone with the anon key can
-- currently read every column of every players row in production,
-- including phone and email. Same class of bug as the registrations
-- public-read PII exposure fixed live 2026-07-23 (migrations 010/011),
-- just never caught for this table.
--
-- NOT APPLIED TO THE LIVE DB. Same manual-application pattern as every
-- other migration in this project — committed for the project owner to
-- run via the Supabase SQL Editor.
--
-- ── What's actually publicly consumed (confirmed by grep, not assumed) ──
-- LandingPage.jsx: does not query `players` at all.
-- TVDisplay.jsx: does not query `players` at all.
-- LivePage.jsx (src/hooks/useRealtime.js's useRealtimeTeams, embeds
--   `players(*)` under `teams`): only ever reads `p.is_captain` and
--   `p.full_name` (LivePage.jsx line ~780, to label a team's captain).
-- AdminDashboard.jsx uses the same useRealtimeTeams hook but as an
--   authenticated admin, and DOES need phone (line ~1069, captain
--   contact info on the check-in list) — so the fix has to be
--   context-aware, not a blanket column removal.
-- PlayerPortal.jsx's roster display (email/phone/shirt/dietary) comes
--   from the custom otp.verify() query, not this table's public policy,
--   and that whole flow is being deleted in Phase 2 of the identity work
--   order — not touched here.
--
-- ── Why a view, not column-level GRANT/REVOKE ──
-- Column-level privilege revocation combined with `SELECT *` wildcard
-- expansion through PostgREST's embedding layer is not something that
-- can be verified without live access, and getting it wrong risks either
-- silently breaking the roster display or leaving the leak in place.
-- A restricted-column VIEW is the standard, documented Supabase pattern
-- for "some columns public, some not" (PostgREST supports resource
-- embedding through simple views that pass through a base table's FK
-- column), and it's unambiguous about what's exposed.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- Part A: narrow the base table
-- ─────────────────────────────────────────────────────────────────────
-- Admin access is already covered by "Admin full players" (migration
-- 010, is_event_admin_for). Self access is already covered by "Self read
-- own player row" / "Self update own player row" (migration 012). No
-- anonymous SELECT policy replaces this one — the public roster path
-- moves entirely to the players_public view below.
--
-- NOTE: this also removes the anon SELECT that the current (custom,
-- pre-Phase-2) otp.verify() flow in api.js relies on to join
-- `player:players(*, team:teams(*))` after a code is verified. That
-- flow is unreachable in production today regardless — PROJECT_STATUS.md
-- documents Player Portal OTP as already broken end-to-end because
-- Step 5's send-otp serverless function was never built, so
-- otp.request() fails before a session ever exists to verify against —
-- and Phase 2 of the identity work order deletes otp.verify() entirely
-- in favor of native Supabase phone auth. Flagging the coupling rather
-- than silently leaving it for whoever eventually re-reads this policy.

DROP POLICY IF EXISTS "Public read players basic" ON players;

-- ─────────────────────────────────────────────────────────────────────
-- Part B: public-safe roster view
-- ─────────────────────────────────────────────────────────────────────
-- Deliberately minimal — only the columns a real, grepped, public call
-- site uses today. Add columns here only when a real public view needs
-- them, not preemptively.
--
-- Created without `security_invoker`: this view is meant to keep showing
-- every player row to anyone (same row-visibility as the policy it
-- replaces), just with phone/email/dietary_needs/shirt_size removed —
-- so it intentionally runs as the view owner (bypasses the base table's
-- now-admin/self-only RLS) rather than re-applying RLS per viewer.

CREATE OR REPLACE VIEW players_public AS
SELECT
  id,
  team_id,
  is_captain,
  full_name
FROM players;

GRANT SELECT ON players_public TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- Before / after
-- ─────────────────────────────────────────────────────────────────────
-- BEFORE: anon (public/unauthenticated) SELECT on `players` returns
--   every column for every row — id, team_id, event_id, is_captain,
--   is_coach, full_name, email, phone, shirt_size, dietary_needs,
--   sort_order, created_at, auth_user_id.
-- AFTER:  anon has no SELECT on `players` at all. The public roster path
--   (`teams` embedding `players_public` via LivePage.jsx, updated
--   alongside this migration) returns only id, team_id, is_captain,
--   full_name. Admin (via "Admin full players") and a logged-in
--   player/captain reading their own row (via "Self read own player
--   row", migration 012) are unaffected — both already had — and keep —
--   full-column access through the base table.
