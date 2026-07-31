# Ledger Tables Verification Checklist — Phase 6 (Billing + Beneficiary Work Order)

Migrations 024 + 025 applied live. Test against `https://cocomo-events.netlify.app`, not `localhost` (same reason as always — though this phase has no Netlify function involved, worth keeping the habit).

---

## Schema sanity

- [ ] `transactions`, `fan_donations`, `expenses` all exist in the Table Editor
- [ ] `transactions.registration_id` is `BIGINT` (the fix), not `UUID`
- [ ] Confirm whatever CC found when checking `sponsor_id`'s type against `sponsors.id` — note the actual result here once you have it, don't assume it matched just because 025 applied cleanly

## Ledger tab visibility (role gating)

- [ ] `admin` (event-scoped) sees the Ledger sub-tab under Build
- [ ] `org_admin` / `super_admin` see it
- [ ] `treasurer` sees it (this is the new grant from Phase 6 — the one that didn't exist before CC's judgment-call fix)
- [ ] `referee`, `volunteer_coord`, `control_desk` do **not** see it

## Expenses — CRUD

- [ ] Add an expense (category, amount, paid-to, description) — appears in the list
- [ ] Running total updates correctly after adding
- [ ] Edit an existing expense — running total recalculates
- [ ] Delete an expense — running total recalculates, row disappears
- [ ] As `treasurer`: confirm full CRUD works (this is the role the ledger exists for — don't just test as admin and assume treasurer behaves the same)

## Fan donations — manual entry

- [ ] Add a donation with donor name + email filled in
- [ ] Add a donation with donor name/email **left blank** — confirm it saves (nullable, no receipting requirement — this is the case most likely to break if a NOT NULL slipped in somewhere)
- [ ] Running total updates correctly across both

## Boundary check — not just does it work, does it stay contained

- [ ] Log in as an `admin` scoped to a *different* event, confirm they cannot see or write the first event's expenses/fan donations (direct RLS test, not just "the UI doesn't show a way to get there")

## Not built in this phase — don't expect these

- No UI for `transactions` itself (recording layer only, other flows write to it later)
- No fan-facing donation collection page (manual entry only, no Stripe)
