-- ═══════════════════════════════════════════════════════════════════════
-- Migration 027: created_at on org_subscriptions
-- ═══════════════════════════════════════════════════════════════════════
-- billing.getSubscriptionForOrg() (src/services/api.js) needs a
-- deterministic "most recent subscription" ordering. It previously
-- ordered by current_period_end (nullable, and not guaranteed to
-- correlate with recency for a trialing/never-started subscription) with
-- a bare .limit(1) — well-defined only by accident. created_at gives an
-- unambiguous "which one is current" without changing how many
-- subscriptions an org can hold (no uniqueness constraint added here).
--
-- NOT APPLIED TO THE LIVE DB. Same manual-application pattern as every
-- other migration in this project — committed for the project owner to
-- run via the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE org_subscriptions ADD COLUMN created_at TIMESTAMPTZ DEFAULT now() NOT NULL;
