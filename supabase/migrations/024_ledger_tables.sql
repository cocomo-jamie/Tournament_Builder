-- ═══════════════════════════════════════════════════════════════════════
-- Migration 024: ledger tables (bookkeeping only, no payment routing)
-- ═══════════════════════════════════════════════════════════════════════
-- Phase 6 of the CC work order for
-- FEATURE_SPEC_billing_and_beneficiary_commitments.md, per
-- FEATURE_SPEC_ledger_platform_fee_payments.md §2 and its billing-
-- addendum revision. Pure recording layer — no Stripe Connect, no
-- fee-skimming logic, no real fan-facing donation collection flow.
-- `platform_fee` is deliberately NOT a transaction type here — billing is
-- flat per Phase 7, not a revenue cut on event transactions.
--
-- NOT APPLIED TO THE LIVE DB. Same manual-application pattern as every
-- other migration in this project — committed for the project owner to
-- run via the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- Part A: transactions
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE transactions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,   -- entry_fee | donation_team | donation_fan | sponsorship | expense | refund
  amount          NUMERIC NOT NULL,
  currency        TEXT DEFAULT 'CAD' NOT NULL,
  source          TEXT NOT NULL,   -- stripe | e_transfer | cash | manual
  status          TEXT DEFAULT 'pending' NOT NULL,

  -- Nullable FK per originating row — at most one of these is set,
  -- depending on `type`. No CHECK constraint enforcing exactly-one; this
  -- is a bookkeeping table, not a source of truth requiring that rigor.
  --
  -- registration_id is BIGINT, not UUID — registrations.id is BIGSERIAL
  -- (schema.sql:151), confirmed against the same FK type already used by
  -- teams.registration_id (schema.sql:202) and players.registration_id
  -- (migration 015). sponsor_id checked too, same way: sponsors.id is
  -- UUID (schema.sql:395, gen_random_uuid()), so UUID here was correct.
  registration_id BIGINT REFERENCES registrations(id),
  sponsor_id      UUID REFERENCES sponsors(id),
  fan_donation_id UUID,   -- FK added below, after fan_donations exists
  expense_id      UUID,   -- FK added below, after expenses exists

  recorded_by     UUID REFERENCES admin_users(id),
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  notes           TEXT
);

CREATE INDEX idx_transactions_event ON transactions(event_id);
CREATE INDEX idx_transactions_org ON transactions(org_id);

-- ─────────────────────────────────────────────────────────────────────
-- Part B: fan_donations
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE fan_donations (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id           UUID REFERENCES teams(id),
  donor_name        TEXT,
  donor_email       TEXT,
  amount            NUMERIC NOT NULL,
  payment_method    TEXT NOT NULL,   -- stripe | e_transfer | cash | manual
  payment_status    TEXT DEFAULT 'pending' NOT NULL,
  stripe_session_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_fan_donations_event ON fan_donations(event_id);

-- ─────────────────────────────────────────────────────────────────────
-- Part C: expenses
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE expenses (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category      TEXT,
  description   TEXT,
  amount        NUMERIC NOT NULL,
  paid_to       TEXT,
  paid_by       UUID REFERENCES admin_users(id),
  receipt_url   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_expenses_event ON expenses(event_id);

ALTER TABLE transactions ADD CONSTRAINT transactions_fan_donation_id_fkey
  FOREIGN KEY (fan_donation_id) REFERENCES fan_donations(id);
ALTER TABLE transactions ADD CONSTRAINT transactions_expense_id_fkey
  FOREIGN KEY (expense_id) REFERENCES expenses(id);

-- ─────────────────────────────────────────────────────────────────────
-- Part D: RLS — same is_event_admin_for pattern as everything else, plus
-- an explicit treasurer re-grant (migration 019 narrowed
-- is_event_admin_for to role='admin' only; treasurer's "Registrations &
-- Payments: Full" bucket from the entitlements matrix covers this
-- ledger just as much as registrations — a treasurer role with no access
-- to expenses/donations/transactions would be a hole in exactly the
-- bucket the role exists for).
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fan_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full transactions" ON transactions FOR ALL USING (
  is_event_admin_for(event_id)
);
CREATE POLICY "Treasurer full transactions" ON transactions FOR ALL USING (
  has_event_role(event_id, ARRAY['treasurer'])
);

CREATE POLICY "Admin full fan_donations" ON fan_donations FOR ALL USING (
  is_event_admin_for(event_id)
);
CREATE POLICY "Treasurer full fan_donations" ON fan_donations FOR ALL USING (
  has_event_role(event_id, ARRAY['treasurer'])
);

CREATE POLICY "Admin full expenses" ON expenses FOR ALL USING (
  is_event_admin_for(event_id)
);
CREATE POLICY "Treasurer full expenses" ON expenses FOR ALL USING (
  has_event_role(event_id, ARRAY['treasurer'])
);
