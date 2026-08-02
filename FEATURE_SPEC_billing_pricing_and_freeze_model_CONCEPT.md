# Billing Pricing & Freeze/Thaw Model — Concept Capture

**Status:** Concept only, discussed 2026-08-02 while verifying Phase 4 of `CC_WORK_ORDER_billing_beneficiary_fixes.md`. Not a build-ready spec — needs the open questions below resolved and a proper `FEATURE_SPEC_*.md` written before any work order is cut. Sequenced after the current billing/beneficiary fix work order and the self-serve org creation / nav backlog items, same backend-first reasoning as those.

**Origin:** surfaced organically while testing the existing `org_subscriptions`/`event_billing` schema (migrations 025/027) — that schema handles manual status-cycling correctly (confirmed Phase 4), but has no pricing logic, no start/end dates, and no concept of what happens to access when payment lapses or an event finishes unpaid. This concept addresses those three gaps together, since they're related.

---

## 1. Pricing model

**Single, consecutive multi-day event** (e.g. a 3-day golf tournament): priced off the existing `events.event_days` field. Base rate for day 1, **+50% of the base rate for each additional consecutive day**. Billed upfront, in full, before the event goes live (or before `registration_open`, TBD which gate).

**Recurring/periodic event** (e.g. a quarterly bocce tournament): **not** modeled as N independent one-off events, and not folded silently into a subscription either — treated as its own thing, a **contract covering a series of event-instances over time**. Example: an annual contract covering 4 quarterly instances.
- Instance 1 (`n`) billed upfront, same as a one-off event.
- Each subsequent instance (`n2`, `n3`, `n4`...) billed **30 days prior to that specific instance's event date** — not upfront for the whole year, not billed reactively after the fact.
- This implies a new relationship the current schema doesn't have: a way to link multiple `events` rows together as instances of one series/contract, each retaining its own date and (potentially) its own day-count/pricing, with the *contract* — not each individual event — being the thing with billing cadence.

**Subscription:** deliberately left **day-unaware for now** — flat, not tiered by event length. Explicitly leaving room to make it day-aware or tiered later, since additional services may get rolled into subscription tiers over time and this shouldn't be designed narrowly around today's feature set.

---

## 2. Freeze/thaw model

**Two independent freeze scopes, not one:**
- **Per-event freeze** — applies to **paid (non-subscription) events** individually. One event freezing doesn't touch any other event under the same org.
- **Org-level freeze** — applies when a **subscription** lapses. Freezes the whole org's subscription-covered scope, not just one event.

**Grace periods on subscription lapse:** when a subscription lapses, don't freeze immediately — a super_admin can grant a grace period extension: **30, 60, or 90 days**, and these are **cumulative up to a 90-day maximum** (e.g. 30 + 30 + 30, or a single 90, but never beyond 90 total). Purpose: prevent an org's active, in-progress event from collapsing purely because a subscription payment lapsed at a bad moment. **Not yet decided:** what criteria determine which grace tier (30 vs. 60 vs. 90) a given situation gets — deferred, flagged explicitly as undecided rather than guessed at.

**Two-stage severity, not a single freeze state:**
- **Soft freeze** — admin/org_admin **edit access locked**, but they can still **view** everything (nav works, nothing disappears). The **public event page stays live** during soft freeze — a team mid-registration, or a public visitor, sees no difference.
- **Hard freeze** — the **public event page itself goes dark** too. Triggered when "the client has no interest in paying" — **not yet defined precisely**: is this purely time-based (soft freeze lasting past some further threshold), a manual super_admin judgment call, or both? Flagged as undecided, not assumed.

**Three triggers, one mechanism:** trial expiry, post-event-with-no-subscription, and subscription lapse (post-grace-period) all resolve to the same freeze/thaw primitive — this should be built as one reusable mechanism, not three special cases.

**Unlock/thaw:** happens by the org selecting/completing a payment model. Should apply uniformly regardless of which of the three triggers caused the freeze.

---

## 3. Trial model (new user onboarding funnel)

Concept for turning the current no-self-serve-signup gap (see `PROJECT_STATUS.md` Known Issues / self-serve org creation backlog item) into an actual conversion funnel:

1. New user signs up (self-serve — depends on the not-yet-built self-serve org creation feature), creates an org, runs through the Wizard, builds out a full event for free.
2. **7-day trial window** — full access, in-app hints/tips nudging toward subscribing, no payment required.
3. **Trial start timestamp is required and must be explicit** — either **automatic** (set the moment an event first moves past `draft`/into active use — exact trigger point TBD) or **manually set by a super_admin** (e.g. to extend a prospect's trial as a sales lever). Both paths write to the same field; there's no implicit "start" derived from `created_at` alone.
4. On day 7 with no payment selected, the org goes to **soft freeze** (see above) — navigable, nothing editable, public page unaffected.
5. Selecting a payment model (event-based or subscription) immediately thaws.

---

## 4. Computation model — deliberately no new job infrastructure

This project has no scheduled-job/cron infrastructure anywhere (confirmed repeatedly across other features — see Identity Sprint and Phase 5 fulfillment-evidence session notes in `PROJECT_STATUS.md`). Freeze state should **not** be a stored boolean flipped by a nightly job. Instead: **compute freeze state on read**, at whatever admin/public page load checks it — e.g. "is `now() > trial_started_at + 7 days` and no payment method selected?" evaluated live, every time, at the render choke point. This needs:
- A reliable `trial_started_at` (or equivalent) timestamp per event/org, set explicitly per point 3 above — this is the one new piece of state that's actually required for the derived-check model to work at all.
- Equivalent explicit timestamps for subscription lapse date and cumulative grace-days-granted, for the org-level freeze check.
- No new backend infrastructure beyond that — this is intentionally the same "derive don't schedule" pattern already used elsewhere in this codebase.

---

## Open questions, explicitly not decided yet

1. Grace-period tier criteria (30 vs. 60 vs. 90 days) — deferred.
2. Soft → hard freeze trigger — time-based, manual judgment call, or both — deferred.
3. Exact trigger point for automatic trial start (event creation? first move past `draft`? something else?) — deferred.
4. Data model for a "recurring event series/contract" linking multiple `events` rows under one billing contract — doesn't exist today, needs real schema design, not just a note.
5. What happens if a 30-days-prior billing charge for a recurring instance fails — does that instance freeze individually (fits the per-event freeze model) while the rest of the series continues? Not discussed yet, worth resolving before building.
6. Does the upfront-billing gate for a one-off event block `registration_open`, or something earlier/later in the event lifecycle? Not discussed yet.
