-- ═══════════════════════════════════════════════════════════════════════
-- Migration 012: Player self-identity (phone OTP linking)
-- ═══════════════════════════════════════════════════════════════════════
-- Part of FEATURE_SPEC_entitlements_and_identity.md Phase 1. Adds the
-- column and self-scoped RLS a captain's real `auth.users` identity
-- (from native Supabase phone OTP, wired up in Phase 2) needs to read
-- and update their own `players` row.
--
-- NOT APPLIED TO THE LIVE DB. Per this project's established pattern
-- (see migrations 010/011 in PROJECT_STATUS.md), CC has no psql/service-
-- role access — this file is committed for manual application via the
-- Supabase SQL Editor by the project owner.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- Part A: auth_user_id column
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE players ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN players.auth_user_id IS 'Links this player row to their Supabase Auth identity (native phone OTP). NULL until first successful login — existing players predate this column. Set by link_player_auth_by_phone() trigger, not client code.';

CREATE INDEX IF NOT EXISTS idx_players_auth_user ON players(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- Part B: self-scoped RLS
-- ─────────────────────────────────────────────────────────────────────
-- NOTE: schema.sql's "Public read players basic" policy (FOR SELECT
-- USING (true)) is still live and already grants unauthenticated read of
-- every column on this table, including phone/email — that predates this
-- migration and this migration does not touch it (out of scope for this
-- work order; flagged separately in the Phase 1 report). The SELECT
-- policy below is additive and, in practice, redundant for read access
-- until that pre-existing policy is tightened. It's still written because
-- it's the access boundary the feature spec asks for, and because RLS
-- policies are permissive/OR'd — this one will start doing real work the
-- moment "Public read players basic" is narrowed.
--
-- UPDATE has no existing public or self policy at all today — only
-- "Admin full players" (migration 010) can currently write to this
-- table. So the UPDATE policy below is a genuine new capability: it's
-- what lets a logged-in captain edit their own player row for the first
-- time.

CREATE POLICY "Self read own player row" ON players FOR SELECT USING (
  auth_user_id = auth.uid()
);

CREATE POLICY "Self update own player row" ON players FOR UPDATE USING (
  auth_user_id = auth.uid()
) WITH CHECK (
  auth_user_id = auth.uid()
);

-- ─────────────────────────────────────────────────────────────────────
-- Part C: auth_user_id-linking trigger (phone match)
-- ─────────────────────────────────────────────────────────────────────
-- Mirrors handle_invite_signup (migration 007): SECURITY DEFINER, fires
-- AFTER INSERT ON auth.users, bypasses RLS since the new identity has no
-- players row linked yet to satisfy any self-scoped policy.
--
-- Fires once per NEW auth.users row (i.e. once per new phone number the
-- system has ever seen) — a returning captain's subsequent OTP logins
-- reuse their existing auth.users row and do not re-trigger this.
--
-- Match key is phone number, digits-only compared (strips '+', spaces,
-- dashes) so a loosely-formatted registration-form value ("+1
-- 250-555-0100") can match Supabase Auth's E.164 auth.users.phone
-- ("12505550100"). This is normalization, not identity resolution — the
-- known open issue from FEATURE_SPEC_entitlements_and_identity.md Part 1
-- (phone as sole match key has typo/reuse risk) is NOT solved here.
--
-- Decision per Phase 2 spec: if the phone number matches zero or more
-- than one *unlinked* players row, do not guess — skip linking entirely
-- and leave auth_user_id NULL. This function never raises an exception:
-- throwing here would roll back the AFTER INSERT trigger's outer
-- transaction and could abort the auth.users insert itself, breaking
-- sign-in for a real, legitimate user over a linking ambiguity that has
-- nothing to do with whether their login should succeed. "Skip" is the
-- safe form of "don't guess" for a trigger sitting on the auth path.

CREATE OR REPLACE FUNCTION link_player_auth_by_phone()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  match_count INT;
  matched_player_id UUID;
BEGIN
  IF NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  SELECT count(*), max(id) INTO match_count, matched_player_id
  FROM players
  WHERE auth_user_id IS NULL
    AND phone IS NOT NULL
    AND regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(NEW.phone, '[^0-9]', '', 'g')
    AND regexp_replace(phone, '[^0-9]', '', 'g') != '';

  IF match_count = 1 THEN
    UPDATE players SET auth_user_id = NEW.id WHERE id = matched_player_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_player ON auth.users;
CREATE TRIGGER on_auth_user_created_link_player
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_player_auth_by_phone();
