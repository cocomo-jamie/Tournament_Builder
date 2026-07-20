-- ═══════════════════════════════════════════════════════════════════════
-- Migration 004: Temporary public insert policies for Wizard tables
-- ═══════════════════════════════════════════════════════════════════════
-- TEMPORARY — until Step 4 (auth layer) is built.
--
-- The Wizard's "Create Tournament" flow writes to 10 tables using the
-- anon key (no admin auth layer exists yet). The original schema only
-- granted admin write access via auth.uid()-based policies, so every
-- anonymous insert was rejected (42501 / RLS violation).
--
-- This migration adds public INSERT policies to the tables the Wizard
-- writes to, following the same pattern already used for `registrations`
-- and `volunteer_applications`.
--
-- ⚠️  TODO (Step 4): Once admin auth exists, replace these with policies
-- scoped to authenticated admins only (e.g. WITH CHECK (auth.uid() IS
-- NOT NULL), or org-scoped checks). Anyone with the anon key can
-- currently create tournaments — acceptable for solo development,
-- NOT acceptable once this ships publicly.
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "Public insert organizations"      ON organizations      FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert events"              ON events              FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert event_dates"         ON event_dates         FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert playing_areas"       ON playing_areas       FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert volunteer_roles"     ON volunteer_roles     FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert sponsor_tiers"       ON sponsor_tiers       FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert sponsors"            ON sponsors            FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert gift_basket_items"   ON gift_basket_items   FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert local_services"      ON local_services      FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert staff_contacts"      ON staff_contacts      FOR INSERT WITH CHECK (true);
