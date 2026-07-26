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

## v1 — roster entry (revised 2026-07-25, after Phase 2 testing)

**Entry method: alternatives, not combined.** Spreadsheet upload is the primary/default path; "Enter manually" is a secondary option below it. A captain picks one method for the *whole* roster — not a mix of both. **Switching methods after entering data prompts a confirmation** ("Changing to [file upload / manual entry] will lose the information you've already added. Proceed?" Yes/No) — applies in both directions (manual→spreadsheet and spreadsheet→manual), since either switch discards unsaved state in the method being left.

### Spreadsheet path (primary)
1. Drop box + downloadable template, per Phase 2 (built) — template gets two more optional columns: `shirt_size`, `dietary_needs` (alongside the existing `name`, `email`, `phone`). Parser recognizes them if present, doesn't require them — same "warn, don't block" pattern as `name`/`email` today, but these two don't warn at all if absent (they're genuinely optional, not just soft-required).
2. **Must be removable/replaceable** — a clear/remove control on the drop box once a file's loaded, so a captain isn't stuck with a bad upload. (Confirmed gap in Phase 2's build — no such control exists yet.)
3. Parsed rows render in a review list. **Failure/warning messages must be legible guidance, not a silent wall of flags** — e.g. a file-level "We couldn't find a column matching 'email' — check your file's headers match the template" when a header doesn't match at all (confirmed gap: Phase 2 testing found a typo'd header produces per-row `missing_email` warnings with no explanation of *why*, reading as a mysterious failure rather than an actionable one).
4. **Role assignment, after parsing:**
   - If the event's Wizard config requests a coach: a "Choose Captain" checkbox column appears. Selecting one row triggers "Choose Coach" (checkbox column re-prompts for the remaining rows). Once both are chosen, checkboxes disappear; the two selected rows show "Captain"/"Coach" respectively, every other row shows "Player."
   - If the event does not request a coach: only "Choose Captain" appears. Once selected, checkboxes disappear, that row shows "Captain," the rest show "Player."
   - **Open question for CC to resolve, not guess at:** does a "coach requested" flag already exist somewhere in the Wizard's event config (grep `TournamentWizard.jsx`/`configTransformer.js`/`events` schema before assuming), or does this need a new `events` column added? `players.is_coach` already exists in the schema, but the event-level "does this tournament use coaches at all" toggle may not. Report back rather than adding a new column blind.
5. **"OK" / confirm-roster button:** once roles are assigned and any warnings are visible/addressed, an explicit confirm action locks the roster into the registration form's local state. This does **not** write to the database — it's a step-completion action within the still-unsubmitted form, same as any other completed form section. Actual `teams`/`players` row creation still only happens when the full registration is submitted (waiver accepted, "Submit Registration" clicked) — per the existing submission-logic design below.

### Manual path (secondary, via "Enter manually")
1. **Captain and player entries are collapsible cards** — collapsed by default, showing just a header (name once entered, or "Player N" / "Captain" placeholder before that), with an arrow/chevron to expand and fill in fields. Applies to both the captain's card and every added player card — a UI change from the Phase 2 scaffolding's flat fixed-slot layout.
2. Captain is always the fixed first card (`is_captain: true` implicit, no checkbox needed — unlike the spreadsheet path, there's no ambiguity about who's captain here).
3. If the event requests a coach, each player card gets a simple "This person is the team coach" toggle instead of the spreadsheet path's two-step reveal — no ambiguity to resolve here either, since cards are added one at a time by a person who knows who they're adding.
4. Same bounding by `playersMin`/`playersMax` as the spreadsheet path; same "OK"/confirm-roster action once complete.
5. **Note on a Phase 2 testing finding:** "can't add a third player" was observed during testing — check whether this is an actual add-button bug or the test event's `playersMax` was set below 3 before assuming it's broken.

### Superseded by this revision
The Phase 2 scaffolding's fixed-slot "Additional Players" section and the temporary read-only preview list are both replaced by the design above — not extended or patched. Remove them as part of building this, don't leave both existing side by side.

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

1. Migration: `teams.status`, `players.status`, `players.registration_id`, `players.self_registered` — done
2. File drop box + client-side parse + downloadable template (`name`/`email`/`phone`) — done, needs the additions/fixes above (remove/replace control, `shirt_size`/`dietary_needs` columns, clearer failure guidance)
3. Entry-method toggle (spreadsheet primary / manual secondary) with switch-confirmation; collapsible captain/player cards for the manual path; role-assignment UI for the spreadsheet path (captain/coach checkboxes); "OK"/confirm-roster action; remove the superseded Phase 2 scaffolding
4. Submission logic: create `teams` + all `players` rows at submit time (replaces/removes `teams.createFromRegistration()`)
5. Registrations page: real foldout per team, captain first then roster, per-player approve/reject
6. Team status derivation logic (approved once captain + minimum roster approved)
7. Live-verify: both entry methods end-to-end, method-switching warning both directions, coach flow on an event configured for it and one not, a deliberately messy spreadsheet (typo'd header, blank rows, Excel-formatted phone number), confirm all rows appear correctly in the foldout, approve/reject individual players, confirm team status derives correctly at each stage
