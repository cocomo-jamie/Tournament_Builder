-- ═══════════════════════════════════════════════════════════════════════
-- Migration 005: Fix INSERT...RETURNING RLS failures (organizations, events)
-- ═══════════════════════════════════════════════════════════════════════
-- TEMPORARY — until Step 4 (auth layer) is built.
--
-- Postgres RLS requires a row to satisfy SELECT policies before it can
-- be returned via `INSERT ... RETURNING` (which Supabase's .select()
-- after .insert() triggers). An INSERT can pass its own WITH CHECK
-- policy and still fail with "new row violates row-level security
-- policy" if no SELECT policy permits reading the row back.
--
-- Two gaps caused this:
--   1. `organizations` had no public SELECT policy at all.
--   2. `events` had one, but scoped to `status != 'draft'` — and every
--      event the Wizard creates starts as status = 'draft'.
--
-- ⚠️  TODO (Step 4): Once admin auth exists, consider whether public
-- read on organizations/draft events should be narrowed (e.g. only the
-- creating admin can read their own draft org/event) rather than fully
-- public. Currently anyone with the anon key can read all organizations
-- and all draft events — acceptable for solo development only.
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "Public read organizations" ON organizations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read events" ON events;
CREATE POLICY "Public read events" ON events FOR SELECT USING (true);
