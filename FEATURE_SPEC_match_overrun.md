# Feature Spec — Match Overrun Policy & Live Schedule Tracking

**Status:** Captured, not yet built. Depends on Step 4 (auth/roles) to be meaningful.
**Added:** 2026-07-19

---

## Policy (confirmed)

1. **Sport-specific overrun rules** live in per-event config (Wizard-editable), not hardcoded. Rationale: as more events run, we accumulate real timing data (actual match durations, overrun frequency, by sport/format) that should eventually inform smarter defaults for new event organizers setting up the Wizard. This is a data-informed-tool goal, not just a config field — see "Future: Cross-Event Analytics" below.

2. **Two distinct authority levels**, not one "admin" bucket:
   - **Tournament Admin** — full access to everything (sponsors, discount packages, fundraising, registrations, publishing, etc.)
   - **Tournament Referee** — authority over gameplay only: push/pull match start times, grant extra time (e.g. injuries), discipline/sanctioning/appeals during play. Referee does NOT get sponsor/financial/publishing access.
   - Referees and Admins can both extend time or reschedule; Admins additionally have the full platform surface.

3. **Rescheduling ("pull forward") is schedule-only, not duration-changing.** A ref/admin can move a match earlier in the schedule to claw back lost time, but that's a distinct action from granting a time extension. The two shouldn't be conflated in the UI or the data model.

4. **Live deficit/surplus tracking at two levels:**
   - **Per playing area** — "Court 3 is running 8 min behind"
   - **Tournament-wide rollup** — "Tournament is 22 min behind schedule overall"

---

## Why this waits for Step 4

The Referee role only means something once there's an actual permission boundary distinguishing it from Admin. Building the overrun/reschedule UI now would mean either (a) no gating at all, which contradicts the policy, or (b) gating against a role system that doesn't exist yet and would need to be redone once real auth lands. Cleaner to sequence: **Step 4 (auth + roles) → this feature**, ideally as part of the same body of work since they're tightly coupled.

---

## Rough technical shape (for scoping later, not final)

**Schema additions likely needed:**
- `events.overrun_policy` (JSONB) — sport-specific rule (e.g. sudden-death, golden point, hard cap, mercy rule) — separate from the existing `time_limit_min` which is just the base duration
- `matches.scheduled_start_time` vs `matches.actual_start_time` / `actual_end_time` — needed to compute deficit/surplus per match
- `matches.time_extension_min` + `extended_by` + `extension_reason` — audit trail for ref/admin time grants
- `matches.rescheduled_by` + `reschedule_reason` — audit trail for pull-forward actions

**Computation:**
- Per-area deficit/surplus: compare each area's live match's `actual_start_time` + `time_limit_min` (+ any extension) against `scheduled_start_time` of the *next* match queued for that area
- Tournament-wide: aggregate across all areas, likely a simple sum or average of deltas — exact formula TBD when we build it

**UI surfaces (future):**
- Admin/Referee Game Day view: live countdown/overrun indicator per playing area card (extends the playing areas grid already built in Pass 2)
- A small persistent "Schedule: X min behind / on time / ahead" indicator, tournament-wide
- Extend Time / Pull Forward actions, gated to Admin + Referee roles only

---

## Future: Cross-Event Analytics (explicitly out of scope for now)

The stated goal — "each event should improve knowledge" — implies eventually rolling up timing/overrun data *across* events and orgs to build data-informed defaults (e.g. "bocce round-robin matches average 14 min over their allotted time — consider a longer default"). That's a platform-level reporting capability distinct from any single event's schema, and likely deserves its own step on the roadmap once there's enough real event data to learn from. Not designed here — flagging so it doesn't get lost.

---

## Sequencing recommendation

Build this immediately after or alongside Step 4 (auth), since Referee-vs-Admin permission boundaries are the actual blocker, not the timing logic itself. Suggest folding into Step 4's scope as "Step 4b" rather than a fully separate roadmap step.
