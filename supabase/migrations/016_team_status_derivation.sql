-- ═══════════════════════════════════════════════════════════════════════
-- Migration 016: Team status derivation (per-player approval)
-- ═══════════════════════════════════════════════════════════════════════
-- Part of FEATURE_SPEC_team_roster_registration.md Phase 4. teams.status
-- is derived from its players' individual status, not independently set:
-- 'approved' once the captain AND at least playersMin total players (the
-- captain counts toward that total) are individually 'approved';
-- 'pending' otherwise. Rejecting one player never cascades to the team
-- or to other players — this trigger only ever computes 'pending' or
-- 'approved', it never writes 'rejected'/'withdrawn' onto teams.status.
--
-- NOT APPLIED TO THE LIVE DB. Same manual-application pattern as every
-- other migration in this project — committed for the project owner to
-- run via the Supabase SQL Editor.
--
-- ── DB trigger vs. frontend computation — decision + reasoning ──
-- Chose a DB trigger (AFTER UPDATE OF status ON players), not a frontend
-- computation in AdminDashboard.jsx, for three reasons:
--   1. teams.status needs to be correct for ANY consumer, not just the
--      Registrations panel that happens to trigger the status change —
--      a future Team Mgmt / game-day view that filters or displays by
--      team.status shouldn't have to re-derive it itself or risk it
--      being stale because it wasn't the code path that changed a
--      player's status.
--   2. It keeps teams.status directly queryable/filterable in SQL
--      (`WHERE status = 'approved'`) instead of every consumer needing
--      the full players[] join just to compute what should be a stored,
--      simple column.
--   3. Matches this codebase's existing precedent for the same kind of
--      problem: schema.sql already has a trigger recomputing
--      pool_standings when a match's status flips to 'completed' —
--      derived-on-write via trigger is the established pattern here,
--      not a new one introduced by this migration.
-- Tradeoff acknowledged: this makes teams.status eventually-consistent
-- with a bit of DB-side logic that's less visible than a frontend
-- computation would be. Accepted given the precedent above and because
-- the alternative (every future consumer re-deriving it) is worse.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION recompute_team_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  min_required INT;
  approved_count INT;
  captain_approved BOOLEAN;
BEGIN
  SELECT players_min INTO min_required FROM events WHERE id = NEW.event_id;

  SELECT count(*) FILTER (WHERE status = 'approved') INTO approved_count
  FROM players WHERE team_id = NEW.team_id;

  SELECT EXISTS (
    SELECT 1 FROM players WHERE team_id = NEW.team_id AND is_captain = true AND status = 'approved'
  ) INTO captain_approved;

  UPDATE teams
  SET status = CASE
    WHEN captain_approved AND approved_count >= COALESCE(min_required, 1) THEN 'approved'
    ELSE 'pending'
  END
  WHERE id = NEW.team_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_player_status_change_recompute_team ON players;
CREATE TRIGGER on_player_status_change_recompute_team
  AFTER UPDATE OF status ON players
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION recompute_team_status();
