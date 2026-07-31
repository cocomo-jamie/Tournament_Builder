# Feature Spec Addendum: Flat Billing, Beneficiary Commitments, Org/Event Ledger Split

**Status:** Design record from project owner discussion (2026-07-30, continued). Supersedes the platform-fee-percentage sections (§3) of `FEATURE_SPEC_ledger_platform_fee_payments.md` — that doc's §1 (payments direction), §2 (ledger tables), and §5 (treasurer elevation) still stand; only the *fee model* changes, not the ledger's existence.

---

## 1. Billing model — flat fee, org's choice of structure

**Decision:** Cocomo bills the org a flat fee, not a percentage of event revenue. Org chooses per-event or annual subscription.

**Why this simplifies everything from the prior session:** Cocomo no longer needs to touch event transaction flow at all. No Stripe Connect, no `application_fee_amount`, no per-transaction fee capture. An org can use any payment method for their event (Stripe, e-transfer, cash, cheques) — the event/org ledger becomes a **recording layer for the org's own bookkeeping**, not a routing layer Cocomo's revenue depends on. This retires §3's open questions in the prior doc (fee basis, refund clawback, collection timing) — they were about *skimming a percentage*, which no longer happens.

**New tables (design sketch):**

- **`billing_plans`** — `id`, `name`, `type` (`per_event` | `annual`), `price`, `event_limit` (nullable — null = unlimited events/year, or a specific N), `active`
- **`org_subscriptions`** — `id`, `org_id`, `plan_id`, `status` (`active`, `past_due`, `canceled`, `trialing`), `current_period_start`, `current_period_end`, `events_used_this_period` (if `event_limit` is capped), `stripe_subscription_id` (Cocomo's **own** Stripe account for SaaS billing — unrelated to how the org collects *their* event's money)
- **`event_billing`** — `id`, `event_id`, `org_id`, `billing_type` (`per_event` | `covered_by_subscription`), `amount`, `status` (`pending`, `invoiced`, `paid`), `paid_at`

**Open question, not blocking but worth an early answer:** should an event covered by an annual subscription still get a nominal "platform fee" line item in its own ledger (even at effectively $0, allocated from the annual price ÷ events run that year), so a single event's "true cost to run" stays comparable whether the org pays per-event or annually? Nice-to-have for the cost-reporting goal below, not required for v1.

---

## 2. Org ledger + event ledger(s) — the split, and why it matters for cost reporting

**Two levels, as described:**
- **Event ledger** — one event's `transactions` (entry fees, donations, sponsorship) and `expenses`, from `FEATURE_SPEC_ledger_platform_fee_payments.md` §2. Unchanged by this addendum.
- **Org ledger** — rollup across all of an org's events in a period, **plus** the org's own platform billing (`event_billing`/`org_subscriptions` from §1 above) as its own cost line — "Platform fee — Cocomo" sits in the org ledger the same way venue rental sits in an event's expenses.

**This is what answers "what does it cost to run an X event":** an event's true all-in cost = its own `expenses` + its allocated share of platform billing. Org-level rollup answers the annual version of the same question across every event they ran that year — directly useful for a fundraiser's own board/treasurer reporting, independent of anything Cocomo needs.

**Implementation note:** the org ledger is likely a **view/aggregation** over event-level `transactions`/`expenses` joined through `event_id → org_id`, plus `event_billing`/`org_subscriptions` — not necessarily its own duplicated table. Simpler and always consistent; revisit only if rollup query performance becomes a real problem.

---

## 3. Beneficiary — structured entity + written commitment

**Decision:** when an org declares an event benefits a charity, that charity must be a structured, named entity (not free text), backed by a written commitment, and that commitment must be visible to **anyone signing up in any capacity** (registering a team, volunteering, accepting a referee invite — not just donors).

**New tables:**

**`beneficiaries`** — the charity/cause itself, reusable across an org's events:
- `id`, `org_id` (which org registered this beneficiary — a beneficiary belongs to the org that vouches for it, not global/shared across orgs, at least for v1)
- `name`, `registration_number` (charity registration #, jurisdiction-dependent — format varies by country, worth deciding whether to validate or just store as text), `website`, `contact_name`, `contact_email`, `logo_url`
- `verified` — boolean, defaults false. **Decided: Cocomo verifies `registration_number` against the relevant public charity registry before this can flip true** — not pure self-attestation.

**Verification mechanics — Canada, v1 scope:** the CRA's "List of charities" is published as an open-data bulk dataset (~85,000 registered charities — legal name, BN/registration number, address, status — refreshed periodically via the Open Government Portal), not a live per-request lookup API. Realistic implementation: a scheduled job periodically pulls that dataset into a local mirror table (e.g. `cra_charity_registry_cache` — BN, legal name, status, last synced), and a new `beneficiaries` row gets checked against that cache — match on registration number, confirm status is currently "registered" (not revoked/annulled) — before `verified` flips true.

**New infra this implies:** this project has no scheduled/cron mechanism today — everything is either a Postgres trigger or a client-triggered call. A periodic external-data sync job is a new category of infrastructure, not an extension of an existing one (e.g. a scheduled Netlify function).

**Scope limitation to flag now, not an oversight:** CRA only covers Canadian-registered charities. A US or other foreign beneficiary can't be verified by this v1 mechanism — the IRS has an equivalent (Tax Exempt Organization Search) but that's a separate integration, out of scope unless it comes up. Given the platform's current footprint this seems like a reasonable v1 limit, but worth being explicit that "verified" only means "verified against CRA" at launch.

**`event_beneficiary_commitments`** — the actual written commitment, tied to one event:
- `id`, `event_id`, `beneficiary_id`
- `commitment_text` — the specific, plain-language statement of what's being passed through (e.g. "100% of donations and 50% of entry fee revenue" or a fixed dollar commitment) — free text for the statement itself, but the *fact* that a statement exists and who's accountable for it is structured
- `signed_by` (`admin_users.id`) — who at the org attested to this
- `signed_at`
- `status` — `draft`, `published`

**Publish-flow dependency — decided: yes, this is a hard gate.** An event with `is_charity = true` cannot publish (the existing Publish flow, `FEATURE_SPEC_routing_and_landing.md` Part 0) until a commitment exists in `status = 'published'`. `EventStatusCard`'s `handlePublish()` needs a new precondition check alongside whatever it already validates — worth CC confirming there's a clear, specific error message ("This event benefits a charity — add a beneficiary commitment before publishing") rather than a generic failure, since this will be the first time anyone hits a real precondition on publish.

**Surfacing requirement — this is the harder part of the build, not the schema:** "anyone signing up in any capacity" means this needs to appear on:
- The public event page (marketing/landing) — the actual registration entry point
- The team registration form itself
- The volunteer application form
- Referee/admin invite acceptance flow

That's four separate UI surfaces needing the same commitment block, not one. Worth scoping as its own UI work item once the schema/publish-gate questions above are settled — likely a single shared component (`BeneficiaryCommitmentNotice` or similar) reused across all four, rather than four separate implementations.

**How this interacts with §2's ledger:** a `donation_fan`/`donation_team`/`sponsorship` transaction on an event with a published beneficiary commitment is implicitly "for" that beneficiary — no need for a `beneficiary_id` on every transaction row; the commitment lives at the event level and applies to the relevant revenue streams as described in `commitment_text`. If an event ever needs *multiple* beneficiaries with different splits, that's a bigger structural change (would need `commitment_text` to become a real structured split rather than prose) — not assumed necessary for v1, flagging as a limitation to be aware of.

---

## 4. Post-event accountability — evidence the commitment was kept

**Decided:** Cocomo holds a record requiring the org to submit evidence, after the event, that the beneficiary commitment was actually fulfilled. **Explicitly not in scope:** tax receipts — that's between the org/charity and their donors, not Cocomo's concern. The bar here is "a respectable and reasonable level of accountability for claims," not an audit or a receipting system.

**Schema — extends `event_beneficiary_commitments` from §3:**
- `fulfillment_status` — `pending`, `submitted`, `confirmed`, `disputed`. Starts `pending` the moment the commitment is `published`.
- `evidence_submitted_at`, `evidence_files` (JSONB array of `{url, filename, uploaded_at}` — same shape already used for `events.field_layout_files`, so this follows an existing convention rather than inventing a new one)
- `evidence_description` — org's own plain-language account of what was delivered (e.g. "$4,250 e-transferred to Elder Fraud Prevention Society, confirmation attached")
- `reviewed_by` (`admin_users.id`) — **note:** there's no dedicated "Cocomo staff" role in the current role model; only `super_admin` is platform-wide, so reviewing evidence would fall to a super_admin unless a new role is wanted for this specifically. Flagging rather than assuming a new role should be added.
- `reviewed_at`

**Trigger point for requesting evidence:** `events.status` already has a `completed` value in its lifecycle (draft → registration_open → registration_closed → game_day → completed → archived). The natural trigger is an event transitioning to `completed` — at that point, if `is_charity = true` and `fulfillment_status = 'pending'`, surface a persistent "action needed" prompt in the org's admin dashboard. A proactive reminder (email/notification) is a nicer version of this but needs the same new scheduled-job infrastructure flagged in §3's verification mechanics — reasonable to start with an in-dashboard prompt only for v1 and add proactive reminders later once that infra exists anyway for CRA syncing.

**Open question this adds:** does the post-event fulfillment status become **publicly visible** too (closing the transparency loop — donors see afterward that the money arrived), or is this a private record between the org and Cocomo? The pre-event commitment is explicitly required to be public; nothing said so far about the post-event evidence being public. This is a real scope difference (a private compliance record vs. a public accountability report), not just a follow-on detail — worth a direct decision rather than assuming either way.

**Wording caution, same as the payments/legal flag earlier:** whatever label gets shown publicly for a `confirmed` fulfillment status (e.g. a "✓ Verified" badge) should be reviewed for exactly what it's claiming — "Cocomo reviewed the evidence the org submitted" is a materially different (and more defensible) claim than "Cocomo confirms this money was delivered," and the difference matters if a commitment is ever disputed.

---

## Decided this session

- Flat billing, org's choice of per-event or annual (§1).
- Beneficiary must be a structured entity, verified against CRA's public registry (§3).
- Publishing a charity event is hard-gated on a published commitment (§3).
- Post-event fulfillment evidence is required and tracked by Cocomo; tax receipts are explicitly out of scope (§4).

## Open questions remaining

1. Nominal per-event platform-fee line item for subscription-covered events — worth it for cost-reporting consistency, or overkill?
2. Is a typed attestation (name + checkbox + text field, in-app) sufficient for "written commitment," or does this need actual e-signature/contract tooling? Affects both build scope and how legally defensible the commitment is — worth raising with whoever ends up doing the legal review.
3. Can one event have multiple beneficiaries with different splits, or is one-beneficiary-per-event an acceptable v1 constraint?
4. Who reviews submitted fulfillment evidence — `super_admin` by default, or does this warrant a dedicated Cocomo-staff role? (§4)
5. Is post-event fulfillment status public (closing the transparency loop for donors) or a private Cocomo↔org record? (§4)

## Suggested build order (revised)

1. `cra_charity_registry_cache` sync job + `beneficiaries` table + verification check — foundational, everything else in this feature depends on a beneficiary being nameable and verifiable.
2. `event_beneficiary_commitments` table, admin UI to create/sign a commitment, publish-flow gate.
3. The four-surface commitment-notice UI component (public event page, team registration, volunteer application, invite acceptance).
4. Post-event fulfillment tracking (§4) — the `completed`-status trigger, evidence upload, review UI.
5. Ledger tables (`transactions`, `fan_donations`, `expenses`) — pure bookkeeping, no platform-fee-percentage logic.
6. Billing tables (`billing_plans`, `org_subscriptions`, `event_billing`) + Cocomo's own Stripe subscription integration.
7. Treasurer RLS elevation — unchanged from prior spec, independent of all of the above, can land any time.
