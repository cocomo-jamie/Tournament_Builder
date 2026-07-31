-- ═══════════════════════════════════════════════════════════════════════
-- Migration 026: org_admin read-only visibility on billing tables
-- ═══════════════════════════════════════════════════════════════════════
-- Follow-up to migration 025 (Phase 7). 025 was deliberately super_admin-
-- only, flagged there as a likely near-term gap since the work order
-- only specified "super_admin-only admin UI to manually set" and said
-- nothing about org-side visibility. This closes that gap: org_admin can
-- now SELECT their own org's org_subscriptions / event_billing rows.
-- Writes stay exclusively super_admin — no INSERT/UPDATE/DELETE grant
-- here, so "manually set" is unchanged.
--
-- NOT APPLIED TO THE LIVE DB. Same manual-application pattern as every
-- other migration in this project — committed for the project owner to
-- run via the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

-- Same is_org_admin_for() helper used everywhere else in this project —
-- scoped to the caller's own org, read-only.
CREATE POLICY "Org admin read own org_subscriptions" ON org_subscriptions FOR SELECT USING (
  is_org_admin_for(org_id)
);
CREATE POLICY "Org admin read own event_billing" ON event_billing FOR SELECT USING (
  is_org_admin_for(org_id)
);

-- billing_plans has no org_id column to scope by, so is_org_admin_for()
-- (which checks a specific org_id) doesn't fit here. Plan name/price
-- isn't sensitive info, and an org_admin needs to read it anyway to
-- render their subscription's plan name/price instead of a bare
-- plan_id — granted to any active org_admin row (org_id set, event_id
-- NULL, the org_admin shape used throughout this project), not scoped
-- further since there's nothing on this table to scope against.
CREATE POLICY "Org admin read billing_plans" ON billing_plans FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND active = true AND org_id IS NOT NULL AND event_id IS NULL
  )
);
