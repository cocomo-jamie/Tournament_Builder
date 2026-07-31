# Billing + Beneficiary Commitments — End-to-End Verification Checklist

Covers CC work order `CC_WORK_ORDER_billing_and_beneficiary.md`, Phases 1–7 plus follow-ups. Migrations 021–027 all applied live. Test against `https://cocomo-events.netlify.app`.

---

## Session pause point — 2026-07-31

Tested through Phase 4 tonight. Three open items found (detailed inline below), none of them build-breaking or security issues — all logic/UX gaps worth fixing, not urgent overnight problems:

1. **Phase 2:** fake verification accepts any correctly-*formatted* registration number as "Verified" — needs a design decision on labeling + a manual evidence-based verification path for org admins.
2. **Phase 3:** org_admin can see beneficiary registration details on one event but not another — inconsistent, needs investigation before assuming a fix.
3. **Phase 4:** "no sign of anything" reported — needs retesting on the actual Phase 3 test event before concluding it's broken, since existing pre-feature events legitimately showing nothing would be correct behavior.

**Committed:** yes — recommended committing tonight's work as-is. These are known, logged gaps in new functionality, not a broken build; safer to checkpoint than leave it uncommitted overnight.

Phases 5, 6, and 7 not retested this session — still only covered by the earlier per-phase reviews during the build, not this end-to-end pass.

---

## Beneficiary creation + fake verification (Phase 2)

- [x] As org_admin, create a beneficiary with a valid-format registration number (`123456789RR0001`) — shows Verified
- [x] Create one with an invalid format — shows Unverified, no error thrown
- [x] Create one with registration number left blank — saves fine, Unverified, no crash
- [x] As treasurer/referee/other non-org-admin role, confirm the Beneficiaries panel is not visible

**⚠️ OPEN ISSUE — 2026-07-31:** a format-*valid* but fake registration number (`987654321RR0005`) also gets marked Verified. The stub is checking shape only, which is what it was built to do — but "Verified" as a label is misleading when it's really just "correctly formatted." This needs a real design decision, not a quick patch:
- Does the badge/label need to change (e.g. "Format valid" vs "Verified") so it stops implying a level of confidence the fake stub can't back up?
- Separately, a real accountability path is needed for when the org's claimed charity isn't in whatever data Cocomo eventually has (which may be stale/incomplete even once real registry-checking exists) — an org admin should be able to supply supporting evidence (a letter, a web reference) and have that accepted as an alternate path to "verified," reviewed by someone (super_admin, presumably, matching the Phase 5 fulfillment-review pattern). This is a real new feature, not a bug fix — a manual-evidence verification path alongside the automated one, not instead of it.

## Commitment creation + publish gate (Phase 3)

- [x] As org_admin, pick a beneficiary, write commitment text, Save as Draft — appears in the panel as draft
- [x] Sign & Publish — `signed_by`/`signed_at` set, status flips to published
- [x] On a charity event with no published commitment, try to publish the event — blocked, error message says "ask your org admin" (not the earlier self-service wording)
- [x] As org_admin, publish a commitment, then publish the event — succeeds
- [x] On a non-charity event, confirm publishing is unaffected by any of this

**⚠️ OPEN ISSUE — 2026-07-31:** as org_admin, beneficiary registration details are not visible (pre- or post-publish) on one event, but *are* visible on another. Inconsistent, needs investigation before this phase is truly closed. For CC to check first, before guessing at a fix:
- Are the two events under the same org, or different orgs?
- What does this org_admin's `admin_users` row actually contain (`org_id` in particular) — does it match both events' `org_id`, or only one?
- Does the working event's beneficiary have a different `org_id` than the non-working one's, relative to the org_admin's own `org_id`?
- Rule out a stale-data/caching explanation (hard refresh, re-login) before treating it as an RLS bug.

## Public commitment notice, four surfaces (Phase 4)

**⚠️ REPORTED 2026-07-31: "no sign of anything on existing events."** Before treating this as a confirmed bug, first rule out the boring explanation: pre-existing events (created before this feature existed) likely have `is_charity = false` and/or no beneficiary commitment at all — in which case rendering nothing is *correct*, not broken (matches the "shows nothing" checklist item below). **Retest specifically on the event used for Phase 3's testing** (the one with a published commitment) before concluding this is a real rendering bug rather than an empty-state on the wrong event.

- [ ] Retest on the Phase 3 test event (has `is_charity = true` + a published commitment) — does it show there?
- [ ] Logged out, in incognito: public event page shows the commitment (Cause section)
- [ ] Team registration form shows it above Team Identity
- [ ] Volunteer application form shows it above the role picker
- [ ] Invite-acceptance page shows it when the invite is event-scoped; does *not* show for an org-level invite (no event attached)
- [ ] A non-charity event, or a charity event with no published commitment, shows nothing on all four surfaces — not a blank box, not an error

## Post-event fulfillment evidence (Phase 5)

- [ ] Mark a charity event `completed` — fulfillment banner appears on every tab
- [ ] As a non-org-admin role, banner shows the "ask your org admin" wording, not "Go to Fundraising"
- [ ] As org_admin, banner says "Go to Fundraising" and the link works
- [ ] Upload evidence (file + description), submit — `fulfillment_status` flips to submitted
- [ ] As super_admin, the Beneficiary Evidence Review card shows it across orgs/events
- [ ] Signed URL for the uploaded file actually opens and shows the right file
- [ ] Confirm sets `reviewed_by`/`reviewed_at`, status flips to confirmed
- [ ] Dispute instead — status flips to disputed, and org can resubmit from that state
- [ ] As an admin scoped to a *different* event, confirm they cannot read or write the first event's evidence files (storage RLS boundary test — this is the one genuinely new piece of infrastructure in the whole work order)
- [ ] Confirm nothing about fulfillment status or evidence appears anywhere on the public surfaces from Phase 4

## Ledger (Phase 6)

- [ ] Ledger sub-tab visible to admin/org_admin/super_admin/treasurer; not visible to referee/volunteer_coord/control_desk
- [ ] Add/edit/delete an expense — running total recalculates each time
- [ ] Add a fan donation with donor info, and one without — both save, running total updates
- [ ] As treasurer specifically (not just admin), confirm full CRUD works on both sections
- [ ] Admin scoped to a different event cannot see or write this event's ledger data

## Billing (Phase 7 + follow-ups)

- [ ] As super_admin, create an org_subscription and an event_billing row from the BillingPanel
- [ ] Change status via the inline dropdown — saves immediately; marking `paid` on event_billing auto-stamps `paid_at`
- [ ] As org_admin, the Team tab's BillingSummaryCard shows the org's current subscription and event billing rows, read-only
- [ ] Create a second subscription for the same org (super_admin) — confirm the org_admin's card now shows the most recently created one, not an arbitrary one (this is the exact bug the `created_at` fix addressed — worth actually proving it rather than trusting the fix)
- [ ] org_admin cannot edit anything on the BillingSummaryCard — read-only holds

## Explicitly not expected to work — don't file these as bugs

- No real charity registry check (format validation only)
- No real Cocomo-side Stripe billing — all statuses are hand-set
- No fan-facing donation payment page
- No public display of fulfillment status
