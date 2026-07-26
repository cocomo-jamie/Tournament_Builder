# CC Work Order — Team Roster Registration + Per-Player Approval

Reference: `FEATURE_SPEC_team_roster_registration.md`. Inserted ahead of finishing the identity phases — the missing team/player creation this uncovered is what's been blocking real test data for identity verification, so fixing it now unblocks that too. Phased, same discipline as prior work orders: **stop and report after each phase, no self-verification, no `PROJECT_STATUS.md` edits.**

**Also still outstanding, not superseded by this:** `CC_FIX_embed_through_view.md` (LivePage roster embed via `players_public`) hasn't been reported back yet. Independent of this work — can run before, after, or interleaved — but don't lose track of it. Once this spec produces real `players` rows, that fix becomes properly testable for the first time.

---

## Phase 1 — Migrations

1. Write (don't apply) a migration adding:
   - `teams.status` — `TEXT DEFAULT 'pending' NOT NULL` (pending, approved, rejected, withdrawn)
   - `players.status` — same shape
   - `players.registration_id` — `BIGINT REFERENCES registrations(id)`
   - `players.self_registered` — `BOOLEAN DEFAULT false NOT NULL`
2. Same manual-application pattern as everything else in this project (010/011, 012/013, 014) — CC has no service-role/SQL-editor access. Say so explicitly in the report.
3. Report back, including the exact migration file contents.

**Stop here.**

---

## Phase 2 — File drop box + parsing + template (independent of Phase 3, can build in either order)

1. Add `xlsx` (SheetJS) as a new npm dependency — handles both `.csv` and `.xlsx` client-side.
2. Build a downloadable CSV template (headers: `name`, `email`, `phone`) linked next to the drop box.
3. Build the drop box UI on the registration form's new roster section. On file drop, parse client-side (no server round-trip) into rows.
4. Header matching: case-insensitive, order-independent — look for `name`/`email`/`phone` columns regardless of position or capitalization in the uploaded file.
5. **Do not auto-submit parsed rows.** Output goes into the editable review table built in Phase 3 — this phase's job is getting file contents into that table's state correctly, not submitting anything.
6. Validation on parse (surfaced as warnings in Phase 3's table, not blocking here): missing `name` or `email` on a row, row count exceeding the event's `playersMax`.
7. Report back — include how you handled a messy-file case in your own testing if you did any (extra blank rows, a phone Excel reformatted, a typo'd header) even though live verification is manual; useful context for what to specifically check.

**Stop here.**

---

## Phase 3 — Editable roster review table + submission logic

1. Build the editable table that Phase 2's parsed rows populate — add row, edit any cell, remove row. This table also serves as the **manual entry path** for a captain who skips the file upload entirely (small roster, doesn't want to build a spreadsheet) — one component, not two separate UIs.
2. Surface Phase 2's validation warnings inline in the table (e.g. a flagged row highlighted, missing-field indicator) — visible, not blocking. The captain can submit anyway; admin approval is the real gate.
3. Bound the table to the event's `playersMin`/`playersMax` — warn, don't hard-block, consistent with the spec's v1 decision that duplicate/overfull handling is an admin-approval-time concern, not a submission-time one.
4. **Submission logic — this is the core fix:** on form submit, create the `registrations` row (unchanged, captain fields only) **and immediately** create the `teams` row (`status: 'pending'`) and one `players` row per roster entry (captain first — `is_captain: true` — then the rest in table order, all `status: 'pending'`, `self_registered: false`, `registration_id` set to the new registration's id).
5. **Remove `teams.createFromRegistration()`** from `api.js` — it becomes dead code under this design (team creation now happens at submission, not as a separate conversion step). Don't leave it sitting unused.
6. Report back, specifically confirming: does the existing registration submission code path (wherever that currently lives) cleanly support inserting multiple rows in the same transaction/flow as the registration itself, or did you need to restructure how that submit function works? Flag if this touched more of the existing submission code than expected.

**Stop here.**

---

## Phase 4 — Registrations page: real foldout, per-player approval, team status

1. Replace whatever foldout mechanism currently exists on the Registrations page (confirmed not working/not fully built) with a real one.
2. Expanded view per team: captain's row first (from the `registrations` row, same fields as today), then each `players` row in `sort_order`.
3. Per-player approve/reject controls — independent per row, mirroring the existing independent-checkbox pattern already used for payment/approval at the registration level (same interaction model, one level deeper).
4. **Team status is derived, not independently settable:** `approved` once the captain + at least `playersMin` total players are individually `approved`; `pending` otherwise. Compute this wherever team status is displayed/queried — confirm whether this should be a DB-level derivation (a view, or a trigger recomputing `teams.status` on player status change) or purely a frontend computation, and flag your reasoning for whichever you pick in the report.
5. Rejecting one player does not cascade to reject the team or other players.
6. Report back.

**Stop here.**

---

## What's explicitly out of scope for this work order

- Self-registration (Path B from the spec) — deferred, not part of this build
- Notifications of any kind (approval, rejection) — Step 5 dependency, unrelated
- Active prevention of duplicate/overfull rosters at submission time — v1 accepts admin-catches-it-at-approval

## When each phase is done

Report back per phase, wait for confirmation before continuing. Manual live-verification and `PROJECT_STATUS.md` updates happen once all four phases are built and reviewed — by the project owner, not by CC.
