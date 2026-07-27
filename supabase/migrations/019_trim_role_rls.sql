-- ═══════════════════════════════════════════════════════════════════════
-- Migration 019: Trim treasurer/volunteer_coord/referee/control_desk RLS
-- ═══════════════════════════════════════════════════════════════════════
-- Part of FEATURE_SPEC_entitlements_and_identity.md Phase 6 — narrows
-- access for these four roles to match the entitlements matrix (Part 2
-- of the pre-2026-07-26 spec revision; reproduced in full in the Phase 6
-- report since the current spec file just references it as "unchanged,
-- carried forward" without repeating it). Also folds in two items
-- surfaced during Phases 4/5 (decided 2026-07-26):
--   - "Admin full players" narrowed off treasurer/volunteer_coord.
--   - Volunteer self-approval gap closed via SECURITY DEFINER RPCs
--     (chosen over an RLS WITH CHECK column-diff — see report).
--
-- HIGHEST RISK MIGRATION IN THIS WORK ORDER. This *removes* access that
-- currently works. CC has no live DB access to verify any of this — the
-- Phase 6 report includes a per-role, per-item manual verification
-- checklist; treat nothing here as confirmed until that checklist is run
-- against the live app after this migration is applied.
--
-- NOT APPLIED TO THE LIVE DB. Same manual-application pattern as every
-- other migration in this project — committed for the project owner to
-- run via the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- Part A: helper — is this user one of these specific roles for this event
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION has_event_role(check_event_id UUID, roles TEXT[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND active = true
      AND event_id = check_event_id AND role = ANY(roles)
  );
$$;

-- ─────────────────────────────────────────────────────────────────────
-- Part B: the core narrowing move
-- ─────────────────────────────────────────────────────────────────────
-- is_event_admin_for()'s third branch (migration 010) currently matches
-- *any* active event-scoped admin_users row, regardless of role — that's
-- the blanket access this migration removes. Restricting it to role =
-- 'admin' narrows every "Admin full X" policy built on this function
-- (events, registrations, teams, players, matches, playing_areas, pools,
-- brackets, pool_standings, volunteer_roles, volunteer_applications,
-- sponsors, sponsor_tiers, gift_basket_items, local_services,
-- staff_contacts, artifacts, announcements, otp_sessions,
-- playing_area_queue, activity_log — the full list in migration 010) in
-- one place, rather than rewriting ~20 policies individually. super_admin
-- and org_admin are unaffected (separate branches, unchanged).
--
-- Parts C/D below re-grant exactly what the matrix says treasurer/
-- volunteer_coord/referee/control_desk should keep.

CREATE OR REPLACE FUNCTION is_event_admin_for(check_event_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM admin_users au
      JOIN events e ON e.id = check_event_id
      WHERE au.id = auth.uid() AND au.active = true
        AND au.org_id = e.org_id AND au.event_id IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid() AND active = true AND event_id = check_event_id
        AND role = 'admin'
    );
$$;

-- ─────────────────────────────────────────────────────────────────────
-- Part C: re-grant per the matrix (additive SELECT/ALL policies)
-- ─────────────────────────────────────────────────────────────────────

-- Org/Event Settings: Read for all four.
CREATE POLICY "Event roles read events" ON events FOR SELECT USING (
  has_event_role(id, ARRAY['treasurer', 'volunteer_coord', 'referee', 'control_desk'])
);

-- Registrations & Payments: Full for treasurer only.
CREATE POLICY "Treasurer full registrations" ON registrations FOR ALL USING (
  has_event_role(event_id, ARRAY['treasurer'])
);

-- Reconciles "Registrations & Payments: Full" for treasurer with the fact
-- that per-player approve/reject (RegistrationsPanel's players.batchUpdate,
-- api.js ~line 334) is the same approval action as registrations.batchUpdate,
-- just applied to the players table — same UI panel, same call pattern,
-- keeps teams.status in sync via the existing recompute trigger (migration
-- 016). Treated as part of Registrations & Payments for treasurer, not
-- Teams & Players (which is the roster/captaincy side, not approval
-- status) — a judgment call reconciling the matrix's 9-bucket collapse
-- with an already-shipped, tightly-coupled workflow. Read-only below
-- covers Teams & Players generally; this adds the one UPDATE treasurer
-- needs on top of that for the approval flow specifically.
CREATE POLICY "Treasurer update player approval status" ON players FOR UPDATE USING (
  has_event_role(event_id, ARRAY['treasurer'])
);

-- Same coupling: payment-confirm and player-approval both call
-- activityLog.log() (AdminDashboard.jsx ~line 229-253) as part of the
-- same currently-working treasurer workflow.
CREATE POLICY "Treasurer insert activity_log" ON activity_log FOR INSERT WITH CHECK (
  has_event_role(event_id, ARRAY['treasurer'])
);

-- Teams & Players: Read for treasurer/referee/control_desk (not
-- volunteer_coord — matrix says "—"). control_desk/referee's actual
-- write access (check-in, captaincy transfer) goes through the RPCs in
-- Part D below, not a raw UPDATE policy here — see that section's
-- comment for why.
CREATE POLICY "Event roles read teams" ON teams FOR SELECT USING (
  has_event_role(event_id, ARRAY['treasurer', 'referee', 'control_desk'])
);
CREATE POLICY "Event roles read players" ON players FOR SELECT USING (
  has_event_role(event_id, ARRAY['treasurer', 'referee', 'control_desk'])
);

-- Match Engine: Full for referee (own event), Read for control_desk.
-- Folds in playing_areas/pools/brackets/pool_standings/playing_area_queue/
-- announcements as the same operational bucket — Game Day's UI treats
-- them as one unit (see Phase 6 report's flag on control_desk regressions
-- this causes for several currently-clickable buttons).
CREATE POLICY "Referee full matches" ON matches FOR ALL USING (
  has_event_role(event_id, ARRAY['referee'])
);
CREATE POLICY "Control desk read matches" ON matches FOR SELECT USING (
  has_event_role(event_id, ARRAY['control_desk'])
);

CREATE POLICY "Referee full playing_areas" ON playing_areas FOR ALL USING (
  has_event_role(event_id, ARRAY['referee'])
);
CREATE POLICY "Control desk read playing_areas" ON playing_areas FOR SELECT USING (
  has_event_role(event_id, ARRAY['control_desk'])
);

CREATE POLICY "Referee full pools" ON pools FOR ALL USING (
  has_event_role(event_id, ARRAY['referee'])
);
CREATE POLICY "Control desk read pools" ON pools FOR SELECT USING (
  has_event_role(event_id, ARRAY['control_desk'])
);

CREATE POLICY "Referee full brackets" ON brackets FOR ALL USING (
  has_event_role(event_id, ARRAY['referee'])
);
CREATE POLICY "Control desk read brackets" ON brackets FOR SELECT USING (
  has_event_role(event_id, ARRAY['control_desk'])
);

CREATE POLICY "Referee full pool_standings" ON pool_standings FOR ALL USING (
  has_event_role(event_id, ARRAY['referee'])
);
CREATE POLICY "Control desk read pool_standings" ON pool_standings FOR SELECT USING (
  has_event_role(event_id, ARRAY['control_desk'])
);

CREATE POLICY "Referee full playing_area_queue" ON playing_area_queue FOR ALL USING (
  has_event_role(event_id, ARRAY['referee'])
);
CREATE POLICY "Control desk read playing_area_queue" ON playing_area_queue FOR SELECT USING (
  has_event_role(event_id, ARRAY['control_desk'])
);

CREATE POLICY "Referee full announcements" ON announcements FOR ALL USING (
  has_event_role(event_id, ARRAY['referee'])
);
CREATE POLICY "Control desk read announcements" ON announcements FOR SELECT USING (
  has_event_role(event_id, ARRAY['control_desk'])
);

-- Volunteers: Full for volunteer_coord only.
CREATE POLICY "Volunteer coord full applications" ON volunteer_applications FOR ALL USING (
  has_event_role(event_id, ARRAY['volunteer_coord'])
);
CREATE POLICY "Volunteer coord full volunteer_roles" ON volunteer_roles FOR ALL USING (
  has_event_role(event_id, ARRAY['volunteer_coord'])
);

-- Sponsors & Gift Basket: Read for treasurer only.
CREATE POLICY "Treasurer read sponsors" ON sponsors FOR SELECT USING (
  has_event_role(event_id, ARRAY['treasurer'])
);
CREATE POLICY "Treasurer read sponsor_tiers" ON sponsor_tiers FOR SELECT USING (
  has_event_role(event_id, ARRAY['treasurer'])
);
CREATE POLICY "Treasurer read gift_basket_items" ON gift_basket_items FOR SELECT USING (
  has_event_role(event_id, ARRAY['treasurer'])
);

-- Local Svc/Staff: Read for all four.
CREATE POLICY "Event roles read local_services" ON local_services FOR SELECT USING (
  has_event_role(event_id, ARRAY['treasurer', 'volunteer_coord', 'referee', 'control_desk'])
);
CREATE POLICY "Event roles read staff_contacts" ON staff_contacts FOR SELECT USING (
  has_event_role(event_id, ARRAY['treasurer', 'volunteer_coord', 'referee', 'control_desk'])
);

-- Publishing/Artifacts, Admin/Team Mgmt: "—" for all four — no new policy.
-- admin_users/invites were already scoped to super_admin/org_admin only
-- (migration 010 Part D), unaffected by Part B's change here.

-- ─────────────────────────────────────────────────────────────────────
-- Part D: captaincy transfer + team check-in, via SECURITY DEFINER RPCs
-- ─────────────────────────────────────────────────────────────────────
-- Why RPCs and not a raw UPDATE policy with a column-restricting WITH
-- CHECK: a WITH CHECK clause can't reliably diff OLD vs NEW column
-- values in Postgres RLS — a self-referencing subquery inside WITH CHECK
-- sees the row as it exists at check time within the same statement,
-- which is not a safe way to assert "only these columns changed." A
-- narrow SECURITY DEFINER function with an explicit column list is
-- provably correct instead, and this project already has a working
-- precedent for exactly this shape (migration 018's
-- link_player_auth_on_checkin). All three below are gated to
-- admin/referee/control_desk for the relevant event — matches Phase 4's
-- explicit instruction for captaincy transfer, and extends the same
-- gate to the team-checkin/no-show actions referee/control_desk already
-- use today in Game Day's Team Check-In panel.
--
-- api.js's teams.checkIn/undoCheckIn/markEliminated and
-- players.transferCaptaincy now call these instead of raw .update() —
-- same external function signatures, so no call-site changes needed in
-- AdminDashboard.jsx.

CREATE OR REPLACE FUNCTION team_set_checked_in(p_team_id UUID, p_checked_in BOOLEAN)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  SELECT event_id INTO v_event_id FROM teams WHERE id = p_team_id;
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;
  IF NOT (is_event_admin_for(v_event_id) OR has_event_role(v_event_id, ARRAY['referee', 'control_desk'])) THEN
    RAISE EXCEPTION 'Not authorized to check in this team';
  END IF;

  IF p_checked_in THEN
    UPDATE teams SET checked_in = true, checked_in_at = now(), checked_in_by = auth.uid() WHERE id = p_team_id;
  ELSE
    UPDATE teams SET checked_in = false, checked_in_at = NULL, checked_in_by = NULL WHERE id = p_team_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION team_set_checked_in(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION team_mark_eliminated(p_team_id UUID, p_final_rank INT)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  SELECT event_id INTO v_event_id FROM teams WHERE id = p_team_id;
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;
  IF NOT (is_event_admin_for(v_event_id) OR has_event_role(v_event_id, ARRAY['referee', 'control_desk'])) THEN
    RAISE EXCEPTION 'Not authorized to update this team';
  END IF;

  UPDATE teams SET eliminated = true, final_rank = p_final_rank WHERE id = p_team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION team_mark_eliminated(UUID, INT) TO authenticated;

CREATE OR REPLACE FUNCTION transfer_captaincy(p_team_id UUID, p_outgoing_player_id UUID, p_incoming_player_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  SELECT event_id INTO v_event_id FROM teams WHERE id = p_team_id;
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;
  IF NOT (is_event_admin_for(v_event_id) OR has_event_role(v_event_id, ARRAY['referee', 'control_desk'])) THEN
    RAISE EXCEPTION 'Not authorized to transfer captaincy for this team';
  END IF;

  UPDATE players SET is_captain = false WHERE id = p_outgoing_player_id AND team_id = p_team_id;
  UPDATE players SET is_captain = true WHERE id = p_incoming_player_id AND team_id = p_team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_captaincy(UUID, UUID, UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- Part E: volunteer self-approval gap — SECURITY DEFINER RPCs
-- ─────────────────────────────────────────────────────────────────────
-- Decided 2026-07-26 (option chosen over an RLS WITH CHECK column guard,
-- same reasoning as Part D above — a column-diffing WITH CHECK doesn't
-- reliably work in Postgres RLS). Drops the blanket "Self update own
-- volunteer application" policy (migration 013) entirely — it had no
-- column restriction, so a volunteer's own session could UPDATE any
-- column on their own row, including status, directly via the Supabase
-- client, bypassing the UI's restraint to phone/experience/withdraw-only.
-- Replaced with two narrow functions scoped to exactly those two
-- legitimate self-actions.

DROP POLICY IF EXISTS "Self update own volunteer application" ON volunteer_applications;

CREATE OR REPLACE FUNCTION update_own_volunteer_info(app_id UUID, p_phone TEXT, p_experience TEXT, p_certifications TEXT)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE volunteer_applications
  SET phone = p_phone, experience = p_experience, certifications = p_certifications
  WHERE id = app_id AND auth_user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION update_own_volunteer_info(UUID, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION withdraw_own_volunteer_application(app_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE volunteer_applications SET status = 'withdrawn'
  WHERE id = app_id AND auth_user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION withdraw_own_volunteer_application(UUID) TO authenticated;
