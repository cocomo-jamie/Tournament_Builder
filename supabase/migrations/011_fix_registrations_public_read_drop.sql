-- ═══════════════════════════════════════════════════════════════════════
-- Migration 011: Correct registrations public-read policy drop (Pass 3 fix)
-- ═══════════════════════════════════════════════════════════════════════
-- Migration 010 attempted to drop the public SELECT policy on
-- `registrations` but guessed the wrong policy name ("Public read
-- registrations"). The real name, confirmed via live Supabase dashboard
-- inspection, was "Public read registrations TEMP" — so the DROP silently
-- no-op'd and public PII exposure remained live after Pass 3 was marked
-- done. Found via a direct unauthenticated REST call against the live
-- project, which returned full registrant data (name/email/phone) using
-- only the anon key.
--
-- The live database has already been corrected manually via the Supabase
-- dashboard Policies UI. This migration exists so that any OTHER
-- environment — a fresh local setup, a teammate's database, a future
-- staging/prod deploy — running migrations from scratch also ends up
-- correct, instead of silently reintroducing this exposure.
--
-- Written to be safe to run against either state: a DB that still has the
-- TEMP-named policy (fresh/other environments) or one that's already been
-- manually corrected (this project's current live DB) — DROP POLICY IF
-- EXISTS is a no-op if the name doesn't match, so both drop attempts below
-- are harmless regardless of which policy name is actually present.
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Public read registrations TEMP" ON registrations;
DROP POLICY IF EXISTS "Public read registrations" ON registrations;

-- No replacement policy — per the Pass 3 decision, there is no legitimate
-- public read path on registrations. Admin access is covered by
-- "Admin full registrations" (migration 010); public write access for new
-- signups is covered by "Public insert registrations", left untouched.

-- Verification query (run manually after applying, not part of the
-- migration itself): confirm registrations has exactly two policies left —
-- "Admin full registrations" and "Public insert registrations" — and no
-- policy on it grants unauthenticated SELECT.
