# CC Work Order — Billing + Beneficiary Fixes (from 2026-07-31 E2E pass)

Reference: `billing_beneficiary_e2e_checklist.md` (session updates 2026-07-31, both passes). Same discipline as every other work order in this project: **phased, stop and report after each phase, no self-verification, no `PROJECT_STATUS.md` edits.** CC has no service-role/SQL-editor access — migrations are written, not applied.

Ordered so the two investigation phases that block further live testing go first. Everything else can happen in any order after that, but do them one phase at a time regardless.

---

## Phase 1 — Diagnose the second-event RLS block

**Do not assume this is a bug yet — diagnose first.**

1. Find the org_admin account used in testing. Query their `admin_users` row directly — what does `org_id` actually contain?
2. Compare against the `org_id` the `TournamentWizard.jsx` create call is actually submitting for the second event (add a temporary `console.log` of the payload right before the `createTournament` call if needed).
3. Confirm whether they match.
   - **If they don't match:** this is a session/wizard-state bug (wrong org being submitted), not an RLS bug — report which one it is and where the mismatch originates (stale session? wizard defaulting to the first org in a list? hardcoded somewhere?).
   - **If they do match:** the RLS policy itself is rejecting a legitimate same-org insert — re-read `010_rls_org_event_scoping.sql`'s `events` INSERT policy (`is_super_admin() OR is_org_admin_for(org_id)`) and `is_org_admin_for()`'s actual definition for anything that could reject a second row for the same org (e.g. an accidental uniqueness assumption baked into the helper function, not just the policy).
4. Report findings only — do not fix yet, this phase is diagnosis.

**Stop here.**

---

## Phase 2 — Fix Phase 4: public commitment notice doesn't render

Confirmed broken on two independently-built events (different orgs, different beneficiaries, both with published commitments) — not an empty-state/wrong-event issue.

1. Trace the data path for the public event page's Cause section: does it query `event_beneficiary_commitments` (joined to `beneficiaries`) at all, or is the component present but not wired to real data, or is the query firing but RLS is blocking it for anonymous/public reads?
   - Note from the original spec: `beneficiaries` and `event_beneficiary_commitments` RLS is **admin-scoped only** (`is_event_admin_for`/`is_org_admin_for`) — "the public-facing surfaces read through a narrower path, see that phase" was the original Phase 4 intent. Check whether that narrower public-read path was actually built, or whether the public page is just hitting the same admin-only-RLS'd tables and silently getting zero rows back.
2. Fix whichever of the three it turns out to be (missing public read path is the most likely candidate given the RLS note above).
3. Once the public event page renders correctly, check the other three surfaces (team registration form, volunteer application form, invite-acceptance page) using the same data path — confirm they either already work once the root cause is fixed, or need their own fix if they use a different code path.
4. Confirm the negative case still holds: a non-charity event, or a charity event with an unpublished/draft-only commitment, shows nothing on all four surfaces.
5. Report back with what the actual root cause was and which surfaces are now confirmed working.

**Stop here.**

---

## Phase 3 — Build an event status-advance control

Currently `draft → registration_open` is the only transition with a UI control anywhere (from the earlier publish-fix work). Nothing advances an event through `registration_closed → game_day → completed → archived` — no admin control exists for any role, including super_admin. This blocks all of Phase 5's fulfillment-evidence testing.

1. Decide placement — likely the same admin view/tab where the existing publish control lives, so event lifecycle state is managed in one place.
2. Add a control (dropdown or sequential "advance" button — CC's call, note the choice) that calls the existing `events.update(eventId, { status: ... })` path with the next status in the sequence. Confirm whether `api.js` already has a generic status-update function usable here or whether one needs adding.
3. Gate it the same way the existing publish control is gated (`is_org_admin_for`/`is_event_admin_for`, not just tab visibility) — same permission-check discipline as the original publish-fix work order.
4. Add/confirm a visible status indicator so the current lifecycle stage isn't a mystery (may already exist from the publish-fix work — check before adding a duplicate).
5. Do not build any date/calendar-driven automation — confirmed manual-only is the right scope here, consistent with the rest of this project having no scheduled-job infrastructure.
6. Report back with what was built and exactly which statuses can now be reached via the UI.

**Stop here.**

---

## Phase 4 — Reconcile missing Phase 7 billing UI

BillingPanel (super_admin) and BillingSummaryCard (org_admin Team tab) are not found anywhere in the deployed app, despite migrations 025/027 and the original work order describing them as built.

1. Check the actual codebase (not `PROJECT_STATUS.md` — that doc has a history of claiming things are done that weren't) for whether `BillingPanel`/`BillingSummaryCard` components exist at all.
   - **If they don't exist in the codebase:** Phase 7 of the original work order was never actually built past the migrations — report this plainly, don't guess why.
   - **If they exist in the codebase but aren't rendering:** check whether they're imported/mounted anywhere (e.g. commented out, behind a flag, or added to a branch that never made it into what's deployed to `cocomo-events.netlify.app`).
2. Do not rebuild from scratch without reporting first — if the components already exist and just need to be wired in, that's a much smaller fix than a full rebuild, and this needs to be known before deciding scope.
3. Report back with the actual state found, and if it just needs wiring in, note what that would take before doing it (separate stop/report, don't fix in the same phase as the diagnosis).

**Stop here.**

---

## Phase 5 — Ledger fixes (Phase 6 gaps)

Tab visibility and expense/donation create+delete permissions are all confirmed correct — these are additive fixes, not a rebuild.

1. Add edit capability for expenses (currently add/delete only).
2. Wire expenses into the running total — currently only donations affect it; expenses are tracked but don't move the number.
3. Add update + delete for fan donations (currently create/read only).
4. Re-confirm running total recalculates correctly on every operation (add/edit/delete expense; add/edit/delete donation) once the above exist.
5. Report back with what changed.

**Stop here.**

---

## Phase 6 — Beneficiary commitment: allow editing a draft

1. Add edit capability for a commitment while `status = 'draft'`.
2. Confirm a `published` commitment remains immutable (no edit path) — this is intentional, matching the "written commitment" framing; don't loosen this while fixing the draft case.
3. Report back.

**Stop here.**

---

## Phase 7 — Investigate Phase 3's inconsistent beneficiary-detail visibility

Original open item, still unresolved: an org_admin can see beneficiary registration details on one event but not another.

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
