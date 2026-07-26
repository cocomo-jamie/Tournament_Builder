-- ═══════════════════════════════════════════════════════════════════════
-- Migration 013: Volunteer self-identity (magic link linking)
-- ═══════════════════════════════════════════════════════════════════════
-- Part of FEATURE_SPEC_entitlements_and_identity.md Phase 1. Adds the
-- column and self-scoped RLS a volunteer's real `auth.users` identity
-- (from Supabase email magic link, wired up in Phase 3) needs to read
-- and update their own `volunteer_applications` row.
--
-- NOT APPLIED TO THE LIVE DB. Same manual-application pattern as
-- migration 012 — committed for the project owner to run via the
-- Supabase SQL Editor, not applied by CC.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- Part A: auth_user_id column
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE volunteer_applications ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN volunteer_applications.auth_user_id IS 'Links this application to the volunteer''s Supabase Auth identity (email magic link). NULL until first successful login. Set by link_volunteer_auth_by_email() trigger, not client code.';

CREATE INDEX IF NOT EXISTS idx_volunteer_apps_auth_user ON volunteer_applications(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- Part B: self-scoped RLS
-- ─────────────────────────────────────────────────────────────────────
-- Unlike players, volunteer_applications has no pre-existing public read
-- policy — only "Public insert volunteer_apps" (submit) and "Admin full
-- volunteer_apps" (migration 010) exist today. So both policies below are
-- genuine new capability: this is what lets a logged-in volunteer see and
-- update their own application (status, shift info) for the first time.

CREATE POLICY "Self read own volunteer application" ON volunteer_applications FOR SELECT USING (
  auth_user_id = auth.uid()
);

CREATE POLICY "Self update own volunteer application" ON volunteer_applications FOR UPDATE USING (
  auth_user_id = auth.uid()
) WITH CHECK (
  auth_user_id = auth.uid()
);

-- ─────────────────────────────────────────────────────────────────────
-- Part C: auth_user_id-linking trigger (email match)
-- ─────────────────────────────────────────────────────────────────────
-- Same shape and same safety reasoning as link_player_auth_by_phone() in
-- migration 012 — see that file's comments for the full rationale on why
-- this skips (never raises) on zero/multiple matches, and why that's
-- unrelated to whether the user's sign-in itself should succeed.
--
-- Email match is case-insensitive (lower()) since that's the one
-- normalization that's unambiguously safe to make (email is
-- case-insensitive per RFC in practice, unlike phone formatting).

CREATE OR REPLACE FUNCTION link_volunteer_auth_by_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  match_count INT;
  matched_app_id UUID;
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  SELECT count(*), max(id) INTO match_count, matched_app_id
  FROM volunteer_applications
  WHERE auth_user_id IS NULL
    AND lower(email) = lower(NEW.email);

  IF match_count = 1 THEN
    UPDATE volunteer_applications SET auth_user_id = NEW.id WHERE id = matched_app_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_volunteer ON auth.users;
CREATE TRIGGER on_auth_user_created_link_volunteer
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_volunteer_auth_by_email();
