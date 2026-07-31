# Feature Spec: Ledger, Platform Fee, Payments Direction, Treasurer Elevation

**Status:** Design record from project owner discussion (2026-07-30). Not built. Supersedes/extends `FEATURE_SPEC_admin_dashboard_cards.md` items 2 and 5, and resolves (in direction, not full detail) the "Payments — explicitly punted" question logged in `PROJECT_STATUS.md`.

---

## 1. Payments direction — resolved

**Decision:** each org connects its own payment processor (Stripe, primarily); money goes directly to the org, not through a Cocomo-held account. This is option (a) from the original punted question, now explicitly chosen over centralized collection.

**Why this fits the new platform-fee ask:** Stripe Connect supports a platform automatically taking a cut via `application_fee_amount` on a connected-account transaction — the org still receives funds directly, no wallet or hold-and-disburse model needed, no money-transmission exposure. This is architecture reasoning, not legal advice; the charitable-receipting question already flagged in `PROJECT_STATUS.md` still needs real legal/accounting review, more so now that a platform fee sits on top of donation money.

**New build item this implies, not yet scoped in detail:** per-org Stripe Connect onboarding (an org connects their own Stripe account to the platform). Today's Stripe toggle in the Wizard is a single centralized flag, not per-org — this is a materially different, currently-unbuilt piece.

**Non-Stripe rails (e-transfer, cash) don't get automatic fee capture.** The platform fee on those transactions would need manual reconciliation/invoicing against the ledger — flagging so this isn't assumed to be automatic across all payment methods.

---

## 2. Ledger — new tables (design sketch, not final schema)

**`transactions`** — one row per money movement, platform-wide:
- `id`, `event_id`, `org_id`
- `type` — `entry_fee`, `donation_team`, `donation_fan`, `sponsorship`, `expense`, `platform_fee`, `refund`
- `amount`, `currency`
- `source` — `stripe`, `e_transfer`, `cash`, `manual`
- `status` — `pending`, `completed`, `refunded`, `failed`
- `platform_fee_amount` — nullable, the cut taken on this transaction if fee-bearing
- Link back to whichever row generated it — `registration_id`, `sponsor_id`, `fan_donation_id`, `expense_id` (nullable FKs, exactly one populated per row)
- `recorded_by` (admin_users id, nullable — null for automated/trigger-generated entries)
- `created_at`, `notes`

**`fan_donations`** — new table, closes the gap flagged last session (`LivePage.jsx`'s donation leaderboard is currently hardcoded mock data with its own `TODO: needs DB tables for fan_donations` comment):
- `id`, `event_id`, `team_id` (nullable — "in support of" a team, feeds the existing fan leaderboard UI)
- `donor_name`, `donor_email` (both nullable if anonymous donation is allowed — see open question below)
- `amount`, `payment_method`, `payment_status`, `stripe_session_id`

**`expenses`** — tournament-related spending, per the project owner's "basic accounting structure... leveraged for tournament related expenses":
- `id`, `event_id`, `category`, `description`, `amount`
- `paid_to`, `paid_by` (admin_users id)
- `receipt_url`, `created_at`

**Revenue redefined, per this session:** entry fees + donations (team + fan) + sponsorship, all counted — correcting the prior session's framing that entry fees don't count toward anything. The fundraising *target* (from the prior spec, item 4) is still the narrower sponsors+donations number; "revenue" on the ledger/ dashboard is the broader total. These are two different numbers now, both real, not one superseding the other — worth being explicit about this distinction in the UI copy so "revenue" and "fundraising progress" aren't confused for the same figure.

---

## 3. Platform fee — mechanics, open questions

**Concept confirmed:** ~10% fee on revenue flowing through the platform, ties directly into the ledger (a `platform_fee` transaction type, computed per fee-bearing transaction).

**Open, blocking a build estimate:**
- **Fee basis** — gross revenue (entry fees + donations + sponsorship) or just the cause-facing money (donations + sponsorship, excluding entry fees which mostly cover the org's own event costs)? Biggest open call in this spec.
- **Refund clawback** — does a refunded transaction's platform fee get refunded too, or does the platform keep its cut regardless? Needs an explicit rule before the `refund` transaction type can be implemented correctly.
- **Collection timing** — automatic per-transaction (Stripe Connect `application_fee_amount`, only works for Stripe-routed money) vs. periodic invoicing against the ledger (needed regardless for e-transfer/cash, could also be the uniform approach for simplicity at the cost of automation).

---

## 4. Fan donations — additional open questions

- **Payment methods offered:** Stripe-only (cleanest automatic fee capture) vs. also e-transfer/cash (consistent with team-side options, but manual fee reconciliation like those rails already require).
- **Anonymous donations:** if donor email isn't required, that donation can't be tax-receipted and can't be attributed to a person for the "Biggest Fan Base" / donation leaderboard features already built in `LivePage.jsx`. Decide whether donor info is required, optional-but-encouraged, or optional-and-donation-shows-as-"Anonymous" on the leaderboard.

---

## 5. Treasurer elevation — confirmed direction

**Confirmed by project owner:** full admin-depth access, but still scoped to their one event — not a literal reassignment to the `org_admin` role (which is org-wide, spanning every event under that org — a meaningfully broader blast radius than intended here).

**Implementation direction:** extend `is_event_admin_for()`'s existing role check (currently `role = 'admin'`, from migration 019) to also include `treasurer` — i.e. `role IN ('admin', 'treasurer')` — rather than changing `admin_users.role` values. This keeps the `treasurer` label intact for display/reporting/invites while granting the same event-scoped CRUD depth `admin` already has. Effectively reverts Phase 6's RLS narrowing for this one role, while `volunteer_coord`, `referee`, and `control_desk` stay on the narrowed matrix as-is (no changes requested to those).

**Consequence worth flagging, not deciding here:** this also un-hides everything currently hidden from treasurer in the UI (`BUILD_SUBTAB_VISIBILITY` currently limits treasurer to the Registrations sub-tab only) — full admin depth implies Volunteers, Fundraising, and Rules sub-tabs all become visible/writable to treasurer too, not just the fundraising piece originally asked for. Confirm this is intended (seems consistent with "most impactful authority already in relation to revenue and teams," but it's a wider UI change than the fundraising-only ask that started this conversation).

---

## Open questions requiring a decision before CC estimates this work

1. Platform fee basis: gross revenue or cause-facing money only?
2. Does a refund claw back the platform fee?
3. Fee collection: automatic (Stripe Connect) vs. periodic invoice, uniformly or split by payment rail?
4. Fan donation payment methods: Stripe-only or also e-transfer/cash?
5. Fan donations: is donor info required, optional, or anonymous-allowed?
6. Confirm treasurer's full UI unlock (Volunteers/Fundraising/Rules, not just Fundraising) is intended.

## Suggested build order

1. Ledger tables (`transactions`, `fan_donations`, `expenses`) — foundational, everything else writes to or reads from these.
2. Fundraising trigger fix (from the prior spec) + sponsor-to-ledger wiring, now written against the ledger model instead of just `events.fundraising_current`.
3. Treasurer RLS elevation — small, independent, can land any time after this doc's open questions are resolved.
4. Fan donation collection UI + table — depends on payment-method decision (open question 4).
5. Platform fee computation + display — depends on open questions 1–3; likely the last piece since it needs the ledger and both revenue streams (team + fan donations) live first.
6. Stripe Connect per-org onboarding — largest, most independent piece; could realistically be scoped and built in parallel with 1–3 rather than strictly after.
