# Feature Spec: Team Roster Registration + Per-Player Approval

**Status:** Design record, not yet built. Supersedes/extends the never-wired `teams.createFromRegistration()` gap found 2026-07-25 (see `PROJECT_STATUS.md` session notes once logged).

**Scope decided 2026-07-25: captain-only entry for v1.** Self-registration (Path B below) is explicitly deferred — assessed and confirmed to be a genuinely additive piece, not a foundation that needs building now to avoid rework later. The schema and UI work below (per-player status, submission-time team/player creation, per-player approval foldout) is identical either way; self-registration only adds one separable "find my team and join" entry point on top later, using the same tables/columns already in place. Nothing here needs to be rebuilt when that gets added.

**Why this is still bigger than "fix the missing conversion call":** the current schema only captures one person (the captain) at registration. But the Wizard already collects `playersMin`/`playersMax` per team, and `players.sort_order`'s own comment ("0 = captain, 1 = player 2, etc.") shows multi-player rosters were intended, never built. And per your instruction, approval needs to be **per-player**, not just per-team — *"it's possible we may not approve one of the players in a team for any number of reasons."*

---

## Core model change

**Teams and players exist immediately at registration, not after approval.** Today, `teams`/`players` are only meant to exist post-approval (and even that link is broken — see above). Under this spec, submitting the registration form creates the `teams` row and every `players` row right away, all `status: 'pending'`. Approval becomes a status flip on already-existing rows, not a creation event.

**Approval is per-player, layered under a team-level view.** Status lives on `players`, not just on the team or the `registrations` row.

## Schema changes

```sql
-- teams needs its own lifecycle status now that it exists pre-approval
ALTER TABLE teams ADD COLUMN status TEXT DEFAULT 'pending' NOT NULL;
  -- pending, approved, rejected, withdrawn — mirrors registrations.status shape

-- players needs individual approval, and a way to know how they got here
ALTER TABLE players ADD COLUMN status TEXT DEFAULT 'pending' NOT NULL;
  -- pending, approved, rejected, withdrawn
ALTER TABLE players ADD COLUMN registration_id BIGINT REFERENCES registrations(id);
  -- which registrations row this player came from (v1: always set, since every
  -- player is captain-entered)
ALTER TABLE players ADD COLUMN self_registered BOOLEAN DEFAULT false NOT NULL;
  -- always false in v1 — column exists now so Path B (later) needs no migration
  -- of existing rows, just starts setting it true for its own inserts
```

## v1 — captain enters full roster

1. Registration form (currently captain-only fields) extends to a roster section, bounded by the event's `playersMin`/`playersMax`, built around a **file drop box** rather than manual paste:
   - Captain drops a spreadsheet (`.csv` or `.xlsx`) with **`name`, `email`, `phone` columns** (header names matched case-insensitively, order-independent).
   - Provide a **downloadable template** (a blank `.csv` with the exact headers) right next to the drop box — removes most formatting guesswork before it happens.
   - Parse client-side on drop (no server round-trip needed just to read the file) using a spreadsheet-parsing library that handles both CSV and XLSX — **SheetJS (`xlsx` npm package)** is the standard choice here and handles both formats with one library; add it as a new dependency.
   - **Parsed rows populate an editable table**, not a silent auto-submit — captain reviews/edits/removes rows before the actual form submit. This matters because spreadsheet input is exactly the kind of thing that goes subtly wrong (extra blank rows, a phone number Excel reformatted, a header typo) and a review step catches it before it becomes bad data in `players`. This same editable table can also take a manually-added row directly (for a captain who'd rather not build a spreadsheet for 2-3 teammates) — one UI serves both the "reviewed file import" and "manual entry" cases rather than building them separately.
   - Validate on parse: flag rows missing `name` or `email`, flag if row count exceeds `playersMax`, but don't hard-block submission on warnings — let the captain see and decide (admin approval is still the real gate downstream).
2. On submit: create the `registrations` row (as today, captain-only fields, unchanged), **plus** immediately create the `teams` row (`status: 'pending'`) and a `players` row per roster entry (captain first, `is_captain: true`, `status: 'pending'`, `self_registered: false`, `registration_id` set).
3. Team/player creation now happens at **submission**, not at **approval** — a bigger change to the registration submission code path than just fixing the missing conversion call, but this is the one piece of real new work regardless of Path A/B scope.

## Admin UI — Registrations page, foldout per team

Per your instruction: captain listed first, then teammates, each individually actionable.

1. Each team row in the Registrations panel gets an expand/foldout control (the mechanism you found broken/unbuilt on the current page — this spec supersedes fixing that half-built foldout with a real one, rather than patching whatever's there).
2. Expanded view: captain's row first (sourced from the `registrations` row, same fields as today), then each `players` row for that team, sorted by `sort_order`.
3. **Per-player approve/reject**, not just a single team-level action — mirrors the existing independent-checkbox pattern already used for payment/approval on the registrations list itself (`PROJECT_STATUS.md`'s "Registrations Panel — Current Behavior" section), same interaction model extended one level deeper.
4. **Team-level status: derived, not independently set** — `approved` once the captain + minimum roster size (`playersMin`) are individually approved, `pending` otherwise. Avoids a team showing "approved" while its captain is still sitting in `pending`.
5. Rejecting an individual player does not cascade to reject the whole team — just that player. Team `status` derivation (point 4) naturally handles "team isn't complete yet" without a separate cascade rule.

## What happens to `teams.createFromRegistration()`

Becomes dead code under this design — team creation moves to registration-submission time. Remove it rather than leave an unused function sitting in `api.js`.

## Deferred — Path B, self-registration (additive, build later, no rework needed)

Not designed in detail here since it's out of v1 scope, but the shape for later: a public "find my team" form (search-by-name or invite-code, still an open call whenever this gets built) where a teammate submits their own info and it inserts directly into `players` (no `registrations` row) with `self_registered: true`, attached to the existing team. Uses the same `status`/`self_registered` columns already shipping in v1 — this is why deferring costs nothing structurally.

## Explicitly not solved here

- **Duplicate/conflicting roster entries** (captain accidentally enters the same person twice, or exceeds `playersMax`) — v1 answer: **admin catches it during approval**, no active prevention at submission time. Revisit only if this becomes a real nuisance in practice.
- **Notifying anyone of anything** — depends on Step 5 (email/SMS), same deferral pattern as the pause-registration spec. Not part of this build.
- **Interaction with the identity/entitlements work** (Phase 2's captain phone OTP) — unaffected. Roster entry here is still a public submission (like `registrations` today), not gated behind login. A captain-entered player *could* later get their own `auth_user_id` link, same pattern as `FEATURE_SPEC_entitlements_and_identity.md` — additive, not a blocker.

## Suggested build order

1. Migration: `teams.status`, `players.status`, `players.registration_id`, `players.self_registered`
2. Add `xlsx` (SheetJS) as a dependency; build the file drop box + client-side parse + downloadable CSV template
3. Editable roster review table (populated by parse or manual add), bounded by `playersMin`/`playersMax`, with validation warnings (missing name/email, over-count) shown but not hard-blocking
4. Submission logic: create `teams` + all `players` rows at submit time (replaces/removes `teams.createFromRegistration()`)
5. Registrations page: real foldout per team, captain first then roster, per-player approve/reject
6. Team status derivation logic (approved once captain + minimum roster approved)
7. Live-verify: register a test team via the file drop (try a deliberately messy spreadsheet — extra blank row, missing email on one line, a phone number Excel has reformatted — confirm the review table surfaces it sensibly rather than silently mangling it), confirm all rows appear correctly in the foldout, approve/reject individual players, confirm team status derives correctly at each stage
