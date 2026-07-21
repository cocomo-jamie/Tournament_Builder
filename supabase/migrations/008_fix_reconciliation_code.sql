-- ═══════════════════════════════════════════════════════════════════════
-- Migration 008: Fix reconciliation_code collisions (409 on registration)
-- ═══════════════════════════════════════════════════════════════════════
-- Root cause: generate_recon_code() ran as SECURITY INVOKER (Postgres
-- default), executing under the caller's role — the anon key, since
-- public registration submission has no auth layer yet. The trigger's
-- internal `UPDATE events SET recon_counter = recon_counter + 1` has no
-- RLS policy granting anon UPDATE on `events` (only public SELECT/INSERT
-- and an authenticated-admin-only "Admin full events" policy exist), so
-- that UPDATE silently matched zero rows — no error, but recon_counter
-- never advanced. Every registration for an event read the same stale
-- counter and generated the same reconciliation_code, which collided
-- with the UNIQUE constraint on the second and subsequent inserts (409).
--
-- Fix: make the function SECURITY DEFINER (same pattern already used by
-- handle_invite_signup() in migration 007) so the increment bypasses RLS
-- regardless of caller, and fold the read+update into a single atomic
-- `UPDATE ... RETURNING` to also close a same-transaction race condition
-- between concurrent registrations for the same event.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION generate_recon_code()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  new_counter INT;
BEGIN
  UPDATE events
    SET recon_counter = recon_counter + 1
    WHERE id = NEW.event_id
    RETURNING recon_prefix, recon_counter INTO prefix, new_counter;

  NEW.reconciliation_code = prefix || '-' || new_counter::TEXT;
  RETURN NEW;
END;
$$;
