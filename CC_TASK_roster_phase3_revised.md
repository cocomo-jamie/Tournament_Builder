# CC Task — Roster Phase 3 (revised), per updated spec

`FEATURE_SPEC_team_roster_registration.md` has been substantially revised based on manual testing of Phase 2. Re-read the "v1 — roster entry (revised 2026-07-25...)" section in full before building — this replaces, not extends, the "editable table" framing from the original Phase 3 wording. Standard discipline applies: stop and report, no self-verification, no `PROJECT_STATUS.md` edits.

## What's changing from Phase 2

Remove, don't patch: the fixed-slot "Additional Players" section and the temporary read-only preview list in `LandingPage.jsx`'s `RegistrationForm`. Both are explicitly superseded.

## Build

1. **Entry-method toggle** — spreadsheet upload (primary/default) vs. "Enter manually" (secondary option below it). Switching methods after data has been entered prompts a confirm dialog ("Changing to [file upload / manual entry] will lose the information you've already added. Proceed?") — both directions, not just manual→spreadsheet.

2. **Spreadsheet path fixes/additions to Phase 2's work:**
   - Add a remove/replace control on `RosterDropBox` — no way to clear a loaded file today.
   - Template + parser gain two optional columns: `shirt_size`, `dietary_needs`. Optional means genuinely optional — no warning if absent, unlike `name`/`email`.
   - Failure messaging needs to be actual guidance, not a warning wall. Specifically: when a header doesn't match at all (the "emial" typo case from testing), show a file-level message like *"We couldn't find a column matching 'email' — check your file's headers match the template,"* not just per-row `missing_email` flags with no explanation.

3. **Role assignment (spreadsheet path only)** — after parsing/review:
   - **First, check whether a "does this event use a coach" flag already exists** in the Wizard's event config (grep `TournamentWizard.jsx`, `configTransformer.js`, `events` schema) before adding anything. `players.is_coach` already exists in the schema; the event-level toggle may not. Report what you find — if it needs to be added, that's a small migration, but don't guess at a field name that might already exist under different naming.
   - If coach is requested: "Choose Captain" checkbox column → select one → "Choose Coach" checkbox column appears for the rest → select one → checkboxes disappear, those two rows show "Captain"/"Coach," everyone else shows "Player."
   - If coach is not requested: "Choose Captain" only → select → checkboxes disappear, that row shows "Captain," rest show "Player."

4. **Manual path:**
   - Captain and player entries are collapsible cards — collapsed by default (header only: name if entered, else "Captain"/"Player N" placeholder), expand via arrow/chevron to fill fields.
   - Captain is always the fixed first card, `is_captain: true` implicit — no checkbox needed, unlike the spreadsheet path.
   - If coach is requested (same flag as above), each player card gets a simple toggle: "This person is the team coach." No two-step reveal needed here — cards are added one at a time by someone who already knows who they're adding.
   - Same `playersMin`/`playersMax` bounding as the spreadsheet path.

5. **"OK"/confirm-roster button** — once roles are assigned (or captain/players entered manually) and any warnings are visible, an explicit confirm action locks the roster into the registration form's local state. **This does not write to the database** — `teams`/`players` rows are still only created on final form submission (waiver accepted, "Submit Registration" clicked), per the existing submission-logic design (build this as originally scoped: create `registrations` + `teams` + all `players` rows together at that point, remove `teams.createFromRegistration()`).

6. **Check, don't assume, the "can't add a 3rd player" finding from testing** — confirm whether this is a real add-button bug or the test event's `playersMax` was set below 3. Report which.

## Report back

Standard format — what was built, any place the spec's description didn't match the actual codebase, and specifically flag the coach-flag findings from step 3 before assuming a migration is needed.
