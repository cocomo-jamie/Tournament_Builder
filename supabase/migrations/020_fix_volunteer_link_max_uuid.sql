-- ═══════════════════════════════════════════════════════════════════════
-- Migration 020: fix max(uuid) does not exist in auth.users linking triggers
-- ═══════════════════════════════════════════════════════════════════════
-- HOTFIX — discovered 2026-07-27 during Phase 6 verification. Blocked ALL
-- new-user signup: link_volunteer_auth_by_email() (migration 013) calls
-- max(id) on volunteer_applications.id, a UUID column — Postgres has no
-- MAX() aggregate for uuid, so this fails at query-plan time regardless
-- of row count. This trigger fires AFTER INSERT ON auth.users for every
-- new Supabase Auth signup, not just volunteers, so it broke the
-- treasurer invite signup that surfaced this, and would break every other
-- kind of signup too, since all AFTER INSERT ON auth.users triggers run
-- in the same statement — one throwing aborts the whole insert.
--
-- Scan requested alongside this fix (migrations 007-019, every
-- SECURITY DEFINER function, for the same aggregate-on-uuid class of
-- bug): found ONE more instance not in the original report —
-- link_player_auth_by_phone() (migration 012) has the identical bug,
-- max(id) on players.id, same shape, same trigger-on-auth.users pattern.
-- Both are fixed here. Every other SECURITY DEFINER function was checked
-- and has no aggregate on a uuid column — see the Phase 6 hotfix report
-- for the full list of what was checked.
--
-- Fix shape (both functions): drop the MAX(id) aggregate entirely in
-- favor of a count(*) = 1 guard followed by a direct UPDATE ... WHERE on
-- the same match predicate — no need to capture the matched row's id
-- separately at all.
--
-- NOT APPLIED TO THE LIVE DB. Same manual-application pattern as every
-- other migration in this project — committed for the project owner to
-- run via the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION link_volunteer_auth_by_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  match_count INT;
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO match_count
  FROM volunteer_applications
  WHERE auth_user_id IS NULL
    AND lower(email) = lower(NEW.email);

  IF match_count = 1 THEN
    UPDATE volunteer_applications
    SET auth_user_id = NEW.id
    WHERE auth_user_id IS NULL
      AND lower(email) = lower(NEW.email);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION link_player_auth_by_phone()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  match_count INT;
BEGIN
  IF NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO match_count
  FROM players
  WHERE auth_user_id IS NULL
    AND phone IS NOT NULL
    AND regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(NEW.phone, '[^0-9]', '', 'g')
    AND regexp_replace(phone, '[^0-9]', '', 'g') != '';

  IF match_count = 1 THEN
    UPDATE players
    SET auth_user_id = NEW.id
    WHERE auth_user_id IS NULL
      AND phone IS NOT NULL
      AND regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(NEW.phone, '[^0-9]', '', 'g')
      AND regexp_replace(phone, '[^0-9]', '', 'g') != '';
  END IF;

  RETURN NEW;
END;
$$;
