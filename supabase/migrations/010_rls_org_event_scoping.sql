-- ═══════════════════════════════════════════════════════════════════════
-- Migration 010: RLS org/event scoping (Pass 3)
-- ═══════════════════════════════════════════════════════════════════════
-- Replaces blanket "any active admin" policies with real org_id/event_id
-- scoping, using admin_users.org_id / event_id added in migration 007.
-- Also retires the temporary public policies from 004/005/006.
--
-- Scope model:
--   org_id IS NULL                    -> super_admin, sees everything
--   org_id set, event_id IS NULL      -> org_admin, sees all events in that org
--   org_id set, event_id set          -> event-scoped role, sees only that event
--
-- NOTE: This pass does NOT restrict which tables a given role can touch
-- within their scope (e.g. treasurer vs referee) — that's flagged as a
-- future exploration item in PROJECT_STATUS.md. Every scoped admin has
-- full CRUD on all tables within their org/event boundary.
--
-- NOTE: admin_lock_queue (migration 009) is intentionally left on its
-- existing blanket "any active admin" policy — out of scope for this
-- pass (it's a UI coordination queue, not PII, and not in the table list
-- reviewed here).
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- Part A: Helper functions
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND active = true AND org_id IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION is_org_admin_for(check_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND active = true
      AND org_id = check_org_id AND event_id IS NULL
  );
$$;

-- True if the current user is a super_admin, an org_admin whose org owns
-- this event, or an event-scoped admin assigned to this exact event.
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
    );
$$;

-- ─────────────────────────────────────────────────────────────────────
-- Part B: organizations
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admin full organizations" ON organizations;
CREATE POLICY "Admin full organizations" ON organizations FOR ALL USING (
  is_super_admin() OR is_org_admin_for(id)
);

-- ─────────────────────────────────────────────────────────────────────
-- Part C: event-scoped "Admin full X" policies
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admin full events" ON events;
CREATE POLICY "Admin full events" ON events FOR ALL USING (
  is_event_admin_for(id)
);

DROP POLICY IF EXISTS "Admin full registrations" ON registrations;
CREATE POLICY "Admin full registrations" ON registrations FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full teams" ON teams;
CREATE POLICY "Admin full teams" ON teams FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full players" ON players;
CREATE POLICY "Admin full players" ON players FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full matches" ON matches;
CREATE POLICY "Admin full matches" ON matches FOR ALL USING (
  is_event_admin_for(event_id)
);

-- Was "Admin full courts" on the `courts` table pre-001-rename; table is
-- now `playing_areas` but the policy name itself was never renamed.
DROP POLICY IF EXISTS "Admin full courts" ON playing_areas;
CREATE POLICY "Admin full playing_areas" ON playing_areas FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full pools" ON pools;
CREATE POLICY "Admin full pools" ON pools FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full brackets" ON brackets;
CREATE POLICY "Admin full brackets" ON brackets FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full pool_standings" ON pool_standings;
CREATE POLICY "Admin full pool_standings" ON pool_standings FOR ALL USING (
  is_event_admin_for(event_id)
);

-- volunteer_roles had no admin policy before this pass (public read/insert only).
DROP POLICY IF EXISTS "Admin full volunteer_roles" ON volunteer_roles;
CREATE POLICY "Admin full volunteer_roles" ON volunteer_roles FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full volunteer_apps" ON volunteer_applications;
CREATE POLICY "Admin full volunteer_apps" ON volunteer_applications FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full sponsors" ON sponsors;
CREATE POLICY "Admin full sponsors" ON sponsors FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full sponsor_tiers" ON sponsor_tiers;
CREATE POLICY "Admin full sponsor_tiers" ON sponsor_tiers FOR ALL USING (
  is_event_admin_for(event_id)
);

-- gift_basket_items, local_services, staff_contacts had no admin policy
-- before this pass (public read/insert only).
DROP POLICY IF EXISTS "Admin full gift_basket_items" ON gift_basket_items;
CREATE POLICY "Admin full gift_basket_items" ON gift_basket_items FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full local_services" ON local_services;
CREATE POLICY "Admin full local_services" ON local_services FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full staff_contacts" ON staff_contacts;
CREATE POLICY "Admin full staff_contacts" ON staff_contacts FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full artifacts" ON artifacts;
CREATE POLICY "Admin full artifacts" ON artifacts FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full announcements" ON announcements;
CREATE POLICY "Admin full announcements" ON announcements FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full otp_sessions" ON otp_sessions;
CREATE POLICY "Admin full otp_sessions" ON otp_sessions FOR ALL USING (
  is_event_admin_for(event_id)
);

-- Was "Admin full court_queue" on the `court_queue` table pre-001-rename;
-- table is now `playing_area_queue` but the policy name was never renamed.
DROP POLICY IF EXISTS "Admin full court_queue" ON playing_area_queue;
CREATE POLICY "Admin full playing_area_queue" ON playing_area_queue FOR ALL USING (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Admin full activity_log" ON activity_log;
CREATE POLICY "Admin full activity_log" ON activity_log FOR ALL USING (
  is_event_admin_for(event_id)
);

-- ─────────────────────────────────────────────────────────────────────
-- Part D: admin_users and invites
-- ─────────────────────────────────────────────────────────────────────

-- Migration 003 replaced the original "Admin read admin_users" policy
-- with "Admin read own row" (self-read only, to fix infinite recursion).
-- Preserve that self-read capability here (every logged-in admin,
-- including event-scoped roles, needs to read their own row for
-- getCurrentAdmin() in api.js to work) while adding org-scoped visibility
-- for org_admins/super_admins managing their team.
DROP POLICY IF EXISTS "Admin read own row" ON admin_users;
DROP POLICY IF EXISTS "Admin read admin_users" ON admin_users;
CREATE POLICY "Admin read admin_users" ON admin_users FOR SELECT USING (
  id = auth.uid() OR is_super_admin() OR (org_id IS NOT NULL AND is_org_admin_for(org_id))
);

DROP POLICY IF EXISTS "Admin create invites" ON invites;
CREATE POLICY "Admin create invites" ON invites FOR INSERT WITH CHECK (
  is_super_admin() OR (org_id IS NOT NULL AND is_org_admin_for(org_id))
);

DROP POLICY IF EXISTS "Admin read invites" ON invites;
CREATE POLICY "Admin read invites" ON invites FOR SELECT USING (
  is_super_admin() OR (org_id IS NOT NULL AND is_org_admin_for(org_id))
);

-- ─────────────────────────────────────────────────────────────────────
-- Part E: retire the 004/005/006 public policies
-- ─────────────────────────────────────────────────────────────────────

-- 004: public INSERT policies — the Wizard now runs post-login (Step 4),
-- so these require an authenticated org_admin/super_admin instead.
DROP POLICY IF EXISTS "Public insert organizations" ON organizations;
CREATE POLICY "Admin insert organizations" ON organizations FOR INSERT WITH CHECK (
  is_super_admin()
);

DROP POLICY IF EXISTS "Public insert events" ON events;
CREATE POLICY "Admin insert events" ON events FOR INSERT WITH CHECK (
  is_super_admin() OR is_org_admin_for(org_id)
);

DROP POLICY IF EXISTS "Public insert event_dates" ON event_dates;
CREATE POLICY "Admin insert event_dates" ON event_dates FOR INSERT WITH CHECK (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Public insert playing_areas" ON playing_areas;
CREATE POLICY "Admin insert playing_areas" ON playing_areas FOR INSERT WITH CHECK (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Public insert volunteer_roles" ON volunteer_roles;
CREATE POLICY "Admin insert volunteer_roles" ON volunteer_roles FOR INSERT WITH CHECK (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Public insert sponsor_tiers" ON sponsor_tiers;
CREATE POLICY "Admin insert sponsor_tiers" ON sponsor_tiers FOR INSERT WITH CHECK (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Public insert sponsors" ON sponsors;
CREATE POLICY "Admin insert sponsors" ON sponsors FOR INSERT WITH CHECK (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Public insert gift_basket_items" ON gift_basket_items;
CREATE POLICY "Admin insert gift_basket_items" ON gift_basket_items FOR INSERT WITH CHECK (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Public insert local_services" ON local_services;
CREATE POLICY "Admin insert local_services" ON local_services FOR INSERT WITH CHECK (
  is_event_admin_for(event_id)
);

DROP POLICY IF EXISTS "Public insert staff_contacts" ON staff_contacts;
CREATE POLICY "Admin insert staff_contacts" ON staff_contacts FOR INSERT WITH CHECK (
  is_event_admin_for(event_id)
);

-- 005: public SELECT on organizations / draft events was overly broad.
-- NOTE: organizations DOES need a scoped public read — configTransformer.js
-- reads event.organizations.brand / .logo_url (via the `organizations(*)`
-- embed in events.get()) to render the public landing page's branding.
-- PostgREST silently returns null for an RLS-blocked embed rather than
-- erroring, so removing this entirely would break public-site branding,
-- not just tighten access. Scope it instead: an org is publicly readable
-- only if it has at least one non-draft event (mirrors the events policy
-- below, so a super_admin/org_admin's still-unpublished org stays hidden).
DROP POLICY IF EXISTS "Public read organizations" ON organizations;
CREATE POLICY "Public read organizations" ON organizations FOR SELECT USING (
  EXISTS (SELECT 1 FROM events e WHERE e.org_id = organizations.id AND e.status != 'draft')
);

DROP POLICY IF EXISTS "Public read events" ON events;
CREATE POLICY "Public read events" ON events FOR SELECT USING (status != 'draft');

-- 006: public SELECT on registrations — the PII exposure. Remove
-- entirely; admin access is already covered by the Part C policy above,
-- and the public recon-code lookup feature is being dropped (see
-- api.js / PROJECT_STATUS.md), so there is no remaining legitimate
-- public read path.
DROP POLICY IF EXISTS "Public read registrations TEMP" ON registrations;
