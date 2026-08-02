# CC Work Order — Billing + Beneficiary Fixes (from 2026-07-31 E2E pass)

Reference: `billing_beneficiary_e2e_checklist.md` (session updates 2026-07-31, both passes). Same discipline as every other work order in this project: **phased, stop and report after each phase, no self-verification, no `PROJECT_STATUS.md` edits.** CC has no service-role/SQL-editor access — migrations are written, not applied.

Ordered so the phase that's already fully diagnosed (Phase 1) and the highest-impact confirmed bug (Phase 2) go first. Everything else can happen in any order after that, but do them one phase at a time regardless.

---

## Phase 1 — Apply the fix for the "second event" RLS bug (root cause already confirmed)

**Not a diagnosis phase anymore — root cause fully confirmed live, 2026-07-31/08-01, via direct SQL Editor investigation (session-faked RLS testing + Postgres logs).**

Root cause: `events` has no `SELECT` policy covering an org_admin reading their own org's **draft** events. The two existing SELECT policies only cover non-draft/public events, or event-scoped roles for a specific event. Supabase's JS client always appends `RETURNING` to `.insert()` calls, and Postgres checks `RETURNING` visibility against `SELECT` policies — so **any** org_admin creating **any** new event (always starts `status='draft'`) hits this, confirmed not specific to a second event or this org. Confirmed by: identical insert with `RETURNING` removed succeeds cleanly (fails only on an unrelated missing-column NOT NULL, then succeeds fully once that's added); with `RETURNING` present it fails identically to the original bug report, in the same simulated session (`SET LOCAL ROLE authenticated` + `SET LOCAL request.jwt.claims`).

A draft migration already exists: `028_fix_org_admin_events_select.sql` (attached separately). It adds:

```sql
create policy "Org admin read own events"
  on events
  for select
  to public
  using (
    is_super_admin()
    or is_org_admin_for(org_id)
    or is_event_admin_for(id)
  );
```

1. Review the draft migration — confirm the policy logic is correct and doesn't duplicate/conflict with the existing three SELECT policies on `events` (`"Public read events"`, `"Event roles read events"`).
2. Apply it live (same manual-apply process as every other migration in this project — CC has no service-role/SQL-editor access, migration is written not applied by CC).
3. Once applied, the project owner will live-verify: create a second event under an org that already has one, confirm it succeeds and the wizard returns normally (no more `42501`).
4. Also worth a quick sanity check once applied: confirm the *first* event a brand-new org_admin ever creates still works too (this bug should have been hitting every org_admin's very first event, not just second+ events — worth understanding why it apparently didn't block earlier testing, in case there's a second factor at play CC should flag rather than assume away).
5. Report back — this phase is done once the migration is applied and reported, live-verification happens on the project owner's side per the agreed slow/one-phase-at-a-time process.

**Stop here.**

---

## Phase 2 — ✅ RESOLVED 2026-08-01: public commitment notice now renders

**Root cause:** migration `022_beneficiary_commitments_public_view.sql` was written but never actually applied to the live DB — same failure pattern as migration 010's history (marked done, never run). Every piece of application code was correctly built (the API call, the component, mounting on all four required surfaces) — it was just querying a view that didn't exist. Confirmed via `information_schema.views` returning zero rows for `beneficiary_commitments_public` before the fix.

**Fix:** applied migration 022 live. Confirmed after: view exists with the correct definition (published commitments only, `beneficiary_name` + `commitment_text`), `anon`/`authenticated` both have `SELECT` grants, and all three test events' underlying data was already correct (`is_charity: true`, `commitment_status: 'published'`, real `commitment_text`/`beneficiary_name` — the data was never the problem, only the missing view).

**Live-verified:** public event page (logged out, incognito) now renders the Cause section correctly for a real test event ("Annual Golf Tournament").

**Not yet individually re-tested:** the other three surfaces (team registration form, volunteer application form, invite-acceptance page) — CC's code trace found all three correctly wired to the same component/API call that's now confirmed working, so likely fine, but not yet each individually click-tested live. Worth a quick pass before fully closing this out, given this project's history of "should work" not always matching "does work."

**Also fixed along the way:** `BeneficiaryCommitmentNotice.jsx` was silently swallowing all fetch errors (`.catch(() => setNotice(null))`), making "no commitment" and "the query is failing" indistinguishable. CC added `console.error` logging on that catch — worth keeping, it's what made this diagnosis fast once the view was confirmed present.

---

## Phase 3 — ✅ RESOLVED 2026-08-02: event status-advance control built and live-verified

**Built:** extended the existing `EventStatusCard` (Publish tab, `AdminDashboard.jsx`) with a sequential "advance" button (CC's call over a dropdown — a linear one-directional control makes skipping stages harder to do by accident) covering the full lifecycle `draft → registration_open → registration_closed → game_day → completed → archived`. Reused the existing `events.updateStatus(eventId, status)` — no new API function needed. The charity-commitment gate is preserved and fires only on the `draft → registration_open` step, unchanged from before; every other transition is a plain status update with no additional gating (none was specified). `archived` is terminal — button disappears, replaced with a "Final stage" indicator. Also extended the `Badge` component with colors/labels for all five non-draft statuses (previously only handled draft/published). No new RLS needed — `events` UPDATE was already covered by migration 010's `"Admin full events"` policy.

**Live-verified:** full sequence clicked through end to end including reaching `archived`; charity-commitment gate confirmed still blocking `draft → registration_open` correctly; the button itself doesn't get lost even when a fulfillment-evidence banner pushes it down the page (initial confusion during testing, resolved — not a bug, just needed to scroll).

**Bonus — also live-verified while here:** the original Phase 5 fulfillment-evidence lifecycle from the 07-31 build, untestable until this phase unblocked reaching `completed`. Confirmed working end to end: evidence submission (real file, description, timestamp all persisted correctly on `event_beneficiary_commitments`), super_admin's Beneficiary Evidence Review UI (found at `/super-admin` — briefly looked broken due to a URL-typing slip in testing, not a real bug), and Confirm action (`fulfillment_status: submitted → confirmed`, `reviewed_by`/`reviewed_at` populate correctly). This fully closes out the original checklist's Phase 5 item — no separate phase for it exists in this fix work order since unblocking it *was* this phase's stated purpose, and it's now verified done, not just unblocked.

---

## Phase 4 — ✅ RESOLVED 2026-08-02, no CC work needed

**Directly verified by the project owner** — the billing UI is real and fully functional, just inline in `SuperAdminDashboard.jsx` rather than separately-named `BillingPanel`/`BillingSummaryCard` components as originally described. Confirmed: super_admin can create org subscriptions and per-event billing, status cycles correctly, `paid` auto-stamps `paid_at`, org_admin's Team tab renders the same data read-only, and the specific `created_at` ordering bug the earlier fix targeted is genuinely fixed (newest subscription always shown, not an arbitrary one). No CC investigation or fix required — first phase in this work order closed entirely through direct testing.

**New scope surfaced during this verification, not part of this fix work order:** the billing schema has no pricing logic, no start/end dates, and no freeze/thaw access-control model. A full concept for this was captured — see `FEATURE_SPEC_billing_pricing_and_freeze_model_CONCEPT.md` and `PROJECT_STATUS.md`'s backlog item 5. Separate future feature, not a gap in Phase 7's original scope.

---

## Phase 5 — ✅ RESOLVED 2026-08-02: ledger fixes built and fully live-verified, scope expanded mid-phase

**Premise correction from CC before starting:** the work order's assumption ("currently only donations affect the running total") didn't match the actual code — neither donations nor expenses moved `fundraising_current`; it was a fully manual number, admin-typed only. Flagged before building rather than silently building on a wrong premise. Project owner directed a scope expansion on the spot: (a) auto-derive the total from the ledger, (b) add a separate event-day reconciliation figure for proceeds not captured as ledger rows (raffle, gate, concessions), (c) relabel the thermometer "Donations Received."

**Built:**
1. Expense edit — `expensesApi.update` existed but was unwired; now has a UI (create/edit form + Edit button per row).
2. Fan donation edit + delete — added `fanDonationsApi.update`/`.remove`, wired to UI with the same create/edit/delete pattern.
3. Running total auto-derived from the ledger — new `ledger.recomputeFundraising(eventId)` sums donations minus expenses into `events.fundraising_current`, fires after every mutating action in either section through one shared `onLedgerChange` callback (single recompute path, not per-action duplicated logic).
4. Event-Day Reconciliation (scope addition) — new `events.fundraising_reconciled_amount` column (migration 029, applied live 2026-08-02, confirmed via `information_schema.columns`). Thermometer now shows donations-net and reconciled amounts as two distinct figures, not blended — correct that it can sit under 100% mid-event and jump at reconciliation.
5. Label change — "Fundraising Progress" → "Donations Received" (public thermometer), "Raised" → "Received" (admin panel stat).

**Live-verified, end to end, with explicit before/after checks at each step (not just "no errors"):**
- Expense edit confirmed via targeted re-query on a specific known `id` (not just "a row exists") — genuinely persists.
- Fan donation edit and delete both confirmed the same rigorous way — edit checked by id, delete confirmed via a zero-row follow-up query.
- **Recompute path walked through all four mutation types in sequence** (add expense → drop; edit expense → adjust; delete donation → drop; add donation → rise), checking `fundraising_current` after each step and cross-checking both the admin panel and public thermometer show the same live value, not a stale one. All passed cleanly.
- Event-Day Reconciliation confirmed showing as a genuinely separate figure from the ledger-derived total, and the "Donations Received" label confirmed live.

**One small gap noted, not a blocker:** `expenses` has no `updated_at` column, so there's no way to see *when* an expense was last edited, only `created_at`. Worth folding into a future migration if edit-history ever matters.

---

## Phase 6 — ✅ RESOLVED 2026-08-02: draft editing built, published immutability confirmed UI-level only (accepted)

**Built:** `CommitmentForm` now supports edit mode (same pattern as Phase 5's expense/donation forms) — pre-fills beneficiary + text, calls `commitmentsApi.update()` instead of create. Both "Sign & Publish" and "Save as Draft" remain available while editing, so edit-then-publish works in one step. `BeneficiaryCommitmentPanel`'s Edit button only renders when `status === 'draft'`.

**Live-verified:** draft edit persists correctly (confirmed via direct id-targeted query, not just UI trust); edit-then-publish flips `status`/`signed_by`/`signed_at` correctly in one step; Edit button genuinely absent once published.

**Real finding, tested rigorously, not just assumed:** published-commitment immutability is **UI-level only, not enforced at the RLS/DB level**. Directly tested — a raw SQL `UPDATE` against a `published` commitment's `commitment_text` succeeded with no error, confirmed by re-querying the row. `event_beneficiary_commitments`'s existing `is_event_admin_for` UPDATE policy has no status-based `WITH CHECK`, so any admin with legitimate DB/API access to that org (not just the UI) could alter a "signed" commitment after the fact.

**Decision, made explicitly rather than left ambiguous:** accepted as-is — UI-level only, documented as a known, accepted limitation rather than fixed. Reasoning: matches this project's existing pattern elsewhere, and the only people who could exploit this already have legitimate access to that org's data — this isn't a stranger tampering with someone else's commitment. Revisit if the beneficiary/fulfillment feature ever needs to support a stronger accountability guarantee (e.g. external auditors relying on "published = immutable" being literally true, not just normally-true-via-the-UI).

---

## Phase 7 — Investigate Phase 3's inconsistent beneficiary-detail visibility

Original open item, still unresolved: an org_admin can see beneficiary registration details on one event but not another.

**Check this first, before re-diagnosing from scratch:** Phase 1's confirmed root cause was a missing `SELECT` policy (org_admin couldn't read their own org's draft events). Given that pattern, check whether `beneficiaries` and/or `event_beneficiary_commitments` have a similarly incomplete `SELECT` policy set — e.g. one that covers published/non-draft state correctly but silently excludes some other legitimate case (draft beneficiaries, a specific status, or similar). If the "working" event and "non-working" event differ in some status/state dimension neither of us has checked yet, that's a strong lead. Don't assume it's the same bug, but check for the same *shape* of bug before assuming it's something new like an org_id mismatch.

1. Check, in this order (per the original checklist notes):
   - Are the two events under the same org or different orgs?
   - Does the org_admin's `admin_users.org_id` match both events' `org_id`, or only one?
   - Does the "working" event's beneficiary have a different `org_id` (relative to the org_admin's own) than the "non-working" one?
   - Rule out stale session/cache (hard refresh, re-login) before treating this as an RLS bug.
2. Report findings. If it turns out to be the same root cause as Phase 1's RLS investigation (an org_id mismatch somewhere), say so explicitly rather than treating them as unrelated.

**Stop here.**

---

## Phase 8 — Design decision needed (not a build phase yet)

Flagging, not assigning build work: Phase 2's fake-verification labeling issue (a format-valid-but-fake registration number shows "Verified") needs a product decision before any code changes:
- Does the badge change wording (e.g. "Format valid" vs "Verified")?
- Should a manual evidence-based verification path be added for org admins whose real charity isn't in whatever registry data Cocomo eventually has, reviewed by super_admin (same pattern as Phase 5 fulfillment review)?

Do not build either of these until the project owner decides — this phase is a placeholder for that decision, not a task.

---

## When done

After each phase: stop, report what was changed/found, and wait. Do not batch multiple phases into one report. Live verification against the running app is done by the project owner, not by CC self-verifying — same standing rule as every other work order here.
