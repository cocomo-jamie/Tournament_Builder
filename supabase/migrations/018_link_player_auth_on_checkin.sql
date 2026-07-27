-- ═══════════════════════════════════════════════════════════════════════
-- Migration 018: first-time auth_user_id linking for QR check-in
-- ═══════════════════════════════════════════════════════════════════════
-- Part of FEATURE_SPEC_entitlements_and_identity.md Phase 3. Solves the
-- gap flagged at the end of Phase 2: migration 012's self-scoped RLS
-- ("Self update own player row") requires auth_user_id = auth.uid() to
-- already match, which can't be true on a captain's very first magic-
-- link check-in (auth_user_id starts NULL). This function does that
-- first link, SECURITY DEFINER, bypassing RLS deliberately — same
-- pattern as handle_invite_signup (migration 007) and the phone/email
-- linking triggers (migrations 012/013). Not an RLS policy exception,
-- per the work order.
--
-- NOT APPLIED TO THE LIVE DB. Same manual-application pattern as every
-- other migration in this project — committed for the project owner to
-- run via the Supabase SQL Editor.
--
-- ── Why this isn't just "trust the client-supplied player_id" ──
-- This function is callable by any authenticated user, and the whole
-- point of it is to bypass RLS — so it cannot blindly link whatever
-- player_id the caller passes in, or any authenticated captain could
-- hijack any other player's row by simply calling this with a different
-- id. The check below instead derives the *expected* player_id from the
-- caller's own auth.users.email (the synthetic player_<player_id>@
-- checkin.internal address that only Phase 2's generate-login-qr
-- function ever mints) and only proceeds if the argument matches that
-- derived identity. The argument exists for a clear/legible call site
-- and to fail fast on a mismatch, not as the source of truth.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION link_player_auth_on_checkin(player_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  caller_email TEXT;
  expected_email TEXT;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();

  IF caller_email IS NULL THEN
    RAISE EXCEPTION 'No authenticated user';
  END IF;

  expected_email := 'player_' || player_id::TEXT || '@checkin.internal';

  IF lower(caller_email) != lower(expected_email) THEN
    RAISE EXCEPTION 'player_id does not match the authenticated check-in identity';
  END IF;

  UPDATE players SET auth_user_id = auth.uid() WHERE id = player_id;
END;
$$;

GRANT EXECUTE ON FUNCTION link_player_auth_on_checkin(UUID) TO authenticated;
