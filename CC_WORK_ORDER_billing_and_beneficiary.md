# CC Work Order — Billing + Beneficiary Commitments

Reference: `FEATURE_SPEC_ledger_platform_fee_payments.md` (§1, §2, §5 — payments direction, ledger tables, treasurer elevation) and `FEATURE_SPEC_billing_and_beneficiary_commitments.md` (§1–§4 — flat billing, org/event ledger split, beneficiary + commitment, post-event accountability). Both are design records, not yet built. Same discipline as every other work order in this project: **phased, stop and report after each phase, no self-verification, no `PROJECT_STATUS.md` edits.** CC has no service-role/SQL-editor access — migrations are written, not applied; manual application by the project owner via Supabase SQL Editor, same pattern as every migration so far.

---

## Decisions made since the spec was written (2026-07-30, continued)

- **No charity registry list.** The spec's §3 CRA open-data sync (`cra_charity_registry_cache`, periodic scheduled job) is **cut** — not a meaningful add at this point. `beneficiaries.verified` still exists as a field, but nothing maintains a real external dataset to check it against.
- **Charity verification is faked for testing.** Build a single, clearly-isolated stub function (e.g. `verifyBeneficiaryRegistration(registrationNumber)`) that simulates the check — reasonable to just validate the CRA business-number *format* (9 digits + "RR" + 4 digits) and return true/false on that alone, no external call. **This must be the only place that decides `verified`** — one seam to swap in a real registry check later, not logic scattered across the UI. Comment it clearly as a placeholder in the code itself, not just in this doc.
- **Assumption, flag if wrong:** extending the same "fake it for testing, real integration later" approach to platform billing too — `org_subscriptions`/`event_billing` get an admin-settable status (manually marked active/paid) rather than a real Cocomo-side Stripe subscription integration, which needs a real Stripe account and finalized pricing neither of which exist yet. If this isn't wanted, drop Phase 7 and treat billing as schema-only for now.
- **Post-event fulfillment evidence defaults to private** (admin/`super_admin`-visible only), not public. The spec left this as an open question (§4) — defaulting to the more conservative option since a private record is trivial to make public later, while something shown publicly and then walked back is worse. Revisit if a public "money arrived" view turns out to matter.
- **Reviewer of fulfillment evidence:** `super_admin`, per the spec's own note — no new role being introduced for this.
- **One beneficiary per event, typed in-app attestation (not e-signature), single flat commitment split (not structured per-stream percentages)** — the spec's other open questions, all resolved to the simplest option consistent with how this codebase already does things (no e-signature tooling exists anywhere in this project; invite/commitment-style records elsewhere are plain typed records, not contracts).
- **Nominal per-event platform-fee line item for subscription-covered events** — explicitly deferred, not in this work order.

---

## Phase 1 — Migrations: beneficiaries + commitments

1. Write (don't apply) a migration adding:
   - `beneficiaries` — `id`, `org_id` (FK), `name`, `registration_number`, `website`, `contact_name`, `contact_email`, `logo_url`, `verified BOOLEAN DEFAULT false NOT NULL`, `verified_at`, `created_at`
   - `event_beneficiary_commitments` — `id`, `event_id` (FK), `beneficiary_id` (FK), `commitment_text`, `signed_by` (FK `admin_users`), `signed_at`, `status TEXT DEFAULT 'draft' NOT NULL` (draft/published), plus the post-event fulfillment fields from spec §4: `fulfillment_status TEXT DEFAULT 'pending' NOT NULL` (pending/submitted/confirmed/disputed), `evidence_submitted_at`, `evidence_files JSONB DEFAULT '[]'::jsonb` (same `{url, filename, uploaded_at}` shape as `events.field_layout_files` — reuse the convention, don't invent a new one), `evidence_description`, `reviewed_by` (FK `admin_users`), `reviewed_at`
2. RLS: `beneficiaries` and `event_beneficiary_commitments` — admin-full within the org/event scope (same `is_event_admin_for`/`is_org_admin_for` pattern as everything else), no public read on the raw tables (the public-facing surfaces in Phase 4 read through a narrower path — see that phase).
3. Report back with exact migration contents.

**Stop here.**

---

## Phase 2 — Fake verification + beneficiary management UI

1. Build `verifyBeneficiaryRegistration(registrationNumber)` as an isolated function (own file/module) — format-check only, as described above. Comment prominently that this is a placeholder for a real CRA registry check.
2. Admin UI (org_admin/super_admin scope — a beneficiary belongs to the org that vouches for it) to create/edit a `beneficiaries` row, triggering the fake verification on save and displaying the resulting `verified` state.
3. Report back.

**Stop here.**

---

## Phase 3 — Commitment creation + publish-flow gate

1. Admin UI to create an `event_beneficiary_commitments` row for a given event: pick a `beneficiary_id` (from the org's own `beneficiaries`), write `commitment_text`, sign (`signed_by` = current admin user), publish (`status: 'published'`).
2. **Publish-flow gate:** `EventStatusCard`'s `handlePublish()` must block publishing when `events.is_charity = true` and no `event_beneficiary_commitments` row exists in `status = 'published'` for that event. Clear, specific error message — not a generic failure. Confirm the exact call site and existing validation pattern before adding this (read `handlePublish()` fully first).
3. Report back, including how the block is surfaced in the UI.

**Stop here.**

---

## Phase 4 — Commitment notice, four surfaces

1. Build one shared component (e.g. `BeneficiaryCommitmentNotice`) that reads a published commitment for an event and displays beneficiary name + `commitment_text`. Needs a public-readable path (published commitments only — RLS or a narrow view, same "don't just add a blanket public policy" discipline as `players_public`).
2. Mount it on: the public event page, the team registration form, the volunteer application form, and the invite-acceptance flow (referee/other admin invites).
3. No-op (renders nothing) on events without `is_charity = true` or without a published commitment.
4. Report back with each of the four mount points confirmed.

**Stop here.**

---

## Phase 5 — Post-event fulfillment evidence

1. Trigger point: `events.status` transitioning to `completed`. If `is_charity = true` and `fulfillment_status = 'pending'`, surface a persistent "action needed" prompt in that event's admin dashboard (in-app only — no email/notification infra exists in this project yet, don't build one for this).
2. Org-side UI: upload evidence files (reuse whatever file-upload pattern `field_layout_files` already uses), write `evidence_description`, submit (`fulfillment_status: 'submitted'`, `evidence_submitted_at` set).
3. `super_admin`-side UI: review submitted evidence, set `fulfillment_status` to `confirmed` or `disputed` (`reviewed_by`, `reviewed_at` set).
4. **Private by default** — no public-facing display of fulfillment status in this phase (see decisions above).
5. Report back.

**Stop here.**

---

## Phase 6 — Ledger tables (bookkeeping only, no payment routing)

1. Write (don't apply) a migration adding, per `FEATURE_SPEC_ledger_platform_fee_payments.md` §2 and its billing-addendum revision:
   - `transactions` — `id`, `event_id`, `org_id`, `type` (`entry_fee`/`donation_team`/`donation_fan`/`sponsorship`/`expense`/`refund` — note `platform_fee` is dropped as a transaction type since billing is flat now, not a revenue cut), `amount`, `currency`, `source` (`stripe`/`e_transfer`/`cash`/`manual`), `status`, one nullable FK per originating row (`registration_id`, `sponsor_id`, `fan_donation_id`, `expense_id`), `recorded_by`, `created_at`, `notes`
   - `fan_donations` — `id`, `event_id`, `team_id` (nullable), `donor_name`, `donor_email` (both nullable — no receipting requirement, so no forced-required fields here), `amount`, `payment_method`, `payment_status`, `stripe_session_id`
   - `expenses` — `id`, `event_id`, `category`, `description`, `amount`, `paid_to`, `paid_by` (FK `admin_users`), `receipt_url`, `created_at`
2. This is a pure recording layer — no Stripe Connect, no fee-skimming logic. Basic admin CRUD UI for `expenses` and manual entry of `fan_donations` (a real fan-facing donation collection UI/payment flow is bigger scope than this work order — flag if it looks like it's creeping in, don't build it here).
3. Report back.

**Stop here.**

---

## Phase 7 — Billing tables (schema + manual status, no real Stripe integration)

*See "assumption, flag if wrong" above — drop this phase if manual/fake billing status isn't wanted yet.*

1. Write (don't apply) a migration adding:
   - `billing_plans` — `id`, `name`, `type` (`per_event`/`annual`), `price`, `event_limit` (nullable), `active`
   - `org_subscriptions` — `id`, `org_id`, `plan_id`, `status` (`active`/`past_due`/`canceled`/`trialing`), `current_period_start`, `current_period_end`, `events_used_this_period`
   - `event_billing` — `id`, `event_id`, `org_id`, `billing_type` (`per_event`/`covered_by_subscription`), `amount`, `status` (`pending`/`invoiced`/`paid`), `paid_at`
2. `super_admin`-only admin UI to manually set an org's subscription/event billing status (this is the "fake" part — no real charge happens). Seed a couple of `billing_plans` rows as part of this phase so there's something to assign.
3. Report back.

**Stop here.**

---

## Explicitly out of scope for this work order

- Real CRA (or any) charity registry integration — Phase 2's stub is permanent until a future work order replaces it.
- Real Stripe billing integration for Cocomo's own subscription revenue.
- Real Stripe Connect / any payment routing for event-side money — orgs use their own payment methods; this platform only records what happened.
- Public-facing fulfillment status display.
- Fan-facing donation collection payment flow (Phase 6 gives you the table and manual entry only).
- Nominal per-event fee allocation for subscription-covered events.
- Treasurer RLS elevation (`FEATURE_SPEC_ledger_platform_fee_payments.md` §5) — independent, small, can be its own work order any time; not bundled here.
