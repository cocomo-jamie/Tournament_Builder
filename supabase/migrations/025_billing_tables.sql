-- ═══════════════════════════════════════════════════════════════════════
-- Migration 025: billing tables (schema + manual status, no real Stripe)
-- ═══════════════════════════════════════════════════════════════════════
-- Phase 7 of the CC work order for
-- FEATURE_SPEC_billing_and_beneficiary_commitments.md — Cocomo's own
-- subscription/per-event billing revenue, tracked manually. No real
-- Stripe integration for Cocomo's side of this exists or is built here
-- (that needs a real Stripe account + finalized pricing, neither of
-- which exist yet, per the work order's framing) — `org_subscriptions`/
-- `event_billing` status is admin-set by hand, same "fake it for
-- testing" discipline as Phase 2's charity-verification stub.
--
-- Scope note: this is deliberately super_admin-only, not org_admin-
-- readable. The work order frames this as "super_admin-only admin UI to
-- manually set" without mentioning org-side visibility, so RLS here
-- mirrors that literally — an org currently has no way to see its own
-- billing status. Flagging that as a likely near-term gap rather than
-- widening it unasked.
--
-- NOT APPLIED TO THE LIVE DB. Same manual-application pattern as every
-- other migration in this project — committed for the project owner to
-- run via the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE billing_plans (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,          -- per_event | annual
  price         NUMERIC NOT NULL,
  event_limit   INT,                    -- NULL = unlimited
  active        BOOLEAN DEFAULT true NOT NULL
);

CREATE TABLE org_subscriptions (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id                 UUID NOT NULL REFERENCES billing_plans(id),
  status                  TEXT DEFAULT 'trialing' NOT NULL,   -- active | past_due | canceled | trialing
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  events_used_this_period INT DEFAULT 0 NOT NULL
);

CREATE INDEX idx_org_subscriptions_org ON org_subscriptions(org_id);

CREATE TABLE event_billing (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  billing_type  TEXT NOT NULL,                        -- per_event | covered_by_subscription
  amount        NUMERIC,
  status        TEXT DEFAULT 'pending' NOT NULL,       -- pending | invoiced | paid
  paid_at       TIMESTAMPTZ
);

CREATE INDEX idx_event_billing_event ON event_billing(event_id);
CREATE INDEX idx_event_billing_org ON event_billing(org_id);

ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full billing_plans" ON billing_plans FOR ALL USING (
  is_super_admin()
);
CREATE POLICY "Super admin full org_subscriptions" ON org_subscriptions FOR ALL USING (
  is_super_admin()
);
CREATE POLICY "Super admin full event_billing" ON event_billing FOR ALL USING (
  is_super_admin()
);

-- Seed a couple of plans so there's something to assign in the UI.
INSERT INTO billing_plans (name, type, price, event_limit, active) VALUES
  ('Single Event', 'per_event', 199.00, 1, true),
  ('Annual Unlimited', 'annual', 999.00, NULL, true);