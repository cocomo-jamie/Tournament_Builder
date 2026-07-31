# Feature Spec: Admin Dashboard Stat Cards + Fundraising Model + Role RLS Follow-up

**Status:** Design record from project owner feedback (2026-07-30), not yet built. Input for the next CC work order — do not treat anything below as done.

---

## 1. TEAMS card — "confirmed" / "spots available"

**Current:** `StatCard` shows `{confirmed} confirmed · {pending} pending`, both derived from `registrations` (`AdminDashboard.jsx`, `regStats`).

**Change:** Replace "pending" with **"spots available"** = `events.max_teams - confirmed`.

**Definition confirmed, per project owner:** confirmed = **paid AND approved by an admin** — i.e. `registrations.payment_status = 'paid' AND registrations.status = 'confirmed'`, not just `status = 'confirmed'` alone as today. Worth double-checking whether the current `regStats.confirmed` calc already implies both (it currently checks `status === "confirmed"` only) — confirm whether `status` can be `'confirmed'` with `payment_status` still `'pending'` in practice before assuming the existing field alone is sufficient.

**Open question for CC:** what should "pending" registrations (not yet confirmed) count against — do they still occupy a "spot" against `max_teams` for the purposes of this card, or only actually-confirmed teams count toward spots-remaining? Not specified by the project owner; flag and confirm rather than guessing, since it affects whether an org can end up "oversold" during a pending-heavy registration window.

---

## 2. REVENUE card — total + sponsor/donation breakout

**Current:** Shows `revenue` (paid registration fees only) + a single `donations` sub-line (team donations only, from `registrations.donation_amount`).

**Change:** Show:
- **Total revenue** (top-line number)
- **Sponsors** = total sponsor revenue received
- **Donations** = total donations received **from teams AND fans**

**🔴 Real gap found, not just a display change:** there is currently no "fan donation" data path in the schema at all. `LivePage.jsx`'s donation leaderboard is hardcoded mock data (`FAN_DONATIONS` constant) with a comment already flagging this: `// TODO: needs DB tables for fan_follows, fan_donations, sponsor_quizzes, photo_contest_entries`. Team-side donations *are* real (`registrations.donation_amount`), but fan donations as a concept — a fan (non-participant) donating money during the event, separate from a team's entry — has no table, no payment path, nothing. This card's "donations" number can only be fully real once that's built. **Needs a scope decision before CC estimates this:** is fan donation collection in scope for this pass (new table + a payment/collection UI), or does "donations" on this card mean team-side only for now, with fan donations flagged as a known gap?

**Sponsor revenue:** `sponsors` table has `paid BOOLEAN` but no amount column of its own — amount comes from the linked `sponsor_tiers.amount`. "Total sponsor revenue" would be `SUM(sponsor_tiers.amount) WHERE sponsors.paid = true`, joined through `sponsors.tier_id`.

**Also requested — event-day prominence:** the project owner wants the donation total to be flagged prominently on people's devices, on the TV display, and called out over the PA during the event. This is a separate, bigger ask than the admin card — it implies real-time push/announcement behavior tied to the donation total, likely hooking into the existing `announcements` table (already realtime-enabled) or a new dedicated "milestone" mechanism. Flagging as its own follow-up item, not assumed to be in scope for the stat-card change itself.

---

## 3. VOLUNTEERS card — approved / to-be-reviewed subtotals

**Current:** Already shows `{approved} approved · {pending} pending` (`volStats` in `AdminDashboard.jsx`) — closest thing to already done. Confirm with the project owner whether "to be reviewed" is just a relabel of "pending" (likely, given `volunteer_applications.status` has no other pre-approval state) or implies something new.

---

## 4. FUNDRAISING target — post-registration, sponsors + donations only

**Project owner's framing:** the fundraising target is what's set **after** registrations close — sponsors and donations count toward it; team entry fees are earmarked for tournament running costs and should NOT count toward the fundraising target.

**🔴 This is a real bug, not just a relabel.** The existing `update_fundraising()` trigger (`schema.sql`) currently does:
```sql
UPDATE events
SET fundraising_current = fundraising_current + COALESCE(NEW.donation_amount, 0) + NEW.fee_amount
WHERE id = NEW.event_id AND is_charity = true;
```
It adds **entry fee AND donation** to `fundraising_current` whenever a registration's `payment_status` flips to `paid`. Per this feedback, `fee_amount` should not be in that sum at all — only `donation_amount` (team-side) and, per item 2 above, sponsor payments. Sponsors currently have no trigger touching `fundraising_current` at all — sponsor payments would need to be added to the same total the moment `sponsors.paid` flips true, mirroring the pattern of the registration trigger.

**Also affects:** `FundraisingPanel`'s manual `current` field (an admin can hand-edit `fundraising_current` via `eventsApi.updateFundraising`) — worth confirming with the project owner whether that manual-override path stays, now that the number is meant to be trigger-derived from two real sources rather than admin-entered.

---

## 5. Treasurer — read/write on fundraising

**Current (migration 019):** treasurer has row-level **read-only** on `events` (`"Event roles read events"` policy, `SELECT` only) — no write path to `fundraising_current`/`fundraising_goal` at all. `FundraisingPanel`'s save button is already hidden for treasurer (Phase 6b UI work), consistent with the current read-only RLS.

**Change:** treasurer needs **read/write** specifically on fundraising-related fields.

**Design note for CC, not a decision:** `events` is a wide table (venue, branding, format, status, etc.) — granting treasurer blanket `UPDATE` on `events` would over-privilege them into event settings they shouldn't touch (this project's existing pattern treats "Org/Event Settings" as read-only for all four narrowed roles, per the entitlements matrix). Two paths, not chosen here:
  - **(a)** A `SECURITY DEFINER` RPC scoped to just `fundraising_current`/`fundraising_goal`, callable by treasurer — same pattern already used elsewhere in this project for the volunteer self-approval gap (chosen over a raw RLS column grant, per the Phase 6 report).
  - **(b)** Column-level Postgres `GRANT UPDATE (fundraising_current, fundraising_goal) ON events TO authenticated` combined with the existing row-scoped RLS `WITH CHECK` — not a pattern this codebase uses anywhere else, so (a) is likely the better fit for consistency, but noting both.
  - This also depends on item 4 above: if `fundraising_current` becomes fully trigger-derived (registrations + sponsors), treasurer may only need write access to `fundraising_goal` (the target), not `fundraising_current` (the actual) — worth resolving item 4's scope first since it changes what treasurer actually needs to write.

Also un-hide `FundraisingPanel`'s save UI for treasurer once the RLS/RPC path exists — currently hidden by `BUILD_SUBTAB_VISIBILITY` alongside Rules.

**Everything else passes, per project owner** — no other treasurer permission changes needed.

---

## 6. Volunteer coordinator — passes

No changes requested. Confirmed working as-is per current entitlements matrix and Phase 6b UI work.

---

## Suggested build order

1. Fundraising trigger fix (item 4) — resolves what "fundraising_current" should even mean before the card or the RLS write path are built on top of it.
2. Sponsor revenue → fundraising total wiring (items 2 + 4 together — same underlying gap, sponsors have no trigger today).
3. Admin dashboard card copy/logic changes (items 1–3) — mostly frontend once the underlying numbers are correct.
4. Treasurer fundraising write path (item 5) — needs item 4's scope resolved first (goal-only vs. goal+current).
5. Fan donations (item 2's flagged gap) and event-day PA/TV/device fundraising callouts — likely a separate, larger spec of their own given the new table + realtime + display surfaces involved; not bundled into this pass unless the project owner wants it scoped now.
