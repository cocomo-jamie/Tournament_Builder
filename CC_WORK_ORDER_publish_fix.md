# CC Work Order — Publish-Event Flow Fix

Reference: `FEATURE_SPEC_routing_and_landing.md`, Part 0. This is a live bug fix, not a new feature — do this standalone before touching identity or landing page work.

## Context (read first)

Every event in the live DB is currently `status = 'draft'`. There's no UI to change that. An anonymous visit to a draft event's public page currently throws a raw Postgrest error (`PGRST116 — Cannot coerce the result to a single JSON object`) instead of a friendly message, because `events.get()` in `src/services/api.js` uses `.single()`, RLS correctly filters the draft row to zero rows, and `.single()` throws on zero rows. The one test event in prod was published manually via SQL to unblock the deploy smoke test — that's not a real fix.

## Task 1 — Fix the error path

1. Open `src/services/api.js`, find `events.get()`.
2. Change `.single()` to `.maybeSingle()`.
3. Grep the codebase for every call site of `events.get()` and check what each does with the result. `.maybeSingle()` returns `{ data: null, error: null }` on zero rows instead of throwing — confirm nothing downstream assumes a thrown error here (e.g. a `try/catch` that currently relies on the throw to show an error state will now silently pass through `null` and may need an explicit `if (!data)` branch added instead).
4. In `src/views/LandingPage.jsx`, find wherever `events.get()`'s result is consumed. Add a branch: if the fetch succeeds but returns `null`, render a friendly "this tournament isn't public yet" state — not a blank screen, not a console error, not the existing generic `ErrorDisplay` (that component is for actual fetch failures, this is an expected state).

## Task 2 — Build the publish control

1. Decide placement: Publish tab or Build tab in `AdminDashboard.jsx` — wherever event status conceptually lives in the existing tab structure. Check `ROLE_TABS` to confirm which roles can see that tab before deciding (see permission note below).
2. Add a button/toggle that calls `events.update(eventId, { status: 'published' })` (this function should already exist in `api.js`'s `events` domain — check before adding a new one).
3. **Permission check — do not skip this:** confirm the publish action is actually gated by the existing RLS scope functions (`is_org_admin_for` / `is_event_admin_for`), not just hidden behind a tab a lower-privileged role happens not to see. Tab visibility is a UI convenience, not a security boundary — this project has already shipped one RLS gap (migration 010's wrong policy name) that a tab-hiding assumption would not have caught. Confirm directly: log in as a role that should NOT be able to publish (e.g. referee, control_desk) and attempt the update call directly, confirm RLS rejects it.
4. Add a visible status indicator (draft/published) somewhere in the admin view so the current state isn't a mystery.

## Task 3 — Stop here. Do not self-verify, do not mark anything done in `PROJECT_STATUS.md`.

Once Tasks 1 and 2 are built, stop and report back what was changed (files touched, the call-site check from Task 1.3, and confirmation of which role the publish action is gated to). Live verification is being done manually by the project owner, not by this session — do not run through the checklist below or represent it as done.

---

## Live-verify checklist (project owner runs this manually, not CC)

Per the project's standing rule: "done" means verified against the running app, not code written and compiling — and given this project's track record of things marked done that weren't (route protection, the Team tab, migration 010 never actually applying), verification is being kept independent of the build step this time.

- [ ] Log in as org_admin/admin, publish a draft event through the new UI (not SQL) — note: "Publish" calls `updateStatus(eventId, 'registration_open')`, not a literal `'published'` status (schema has no such enum value); confirm this actually flips the event's public visibility (RLS checks `status != 'draft'`)
- [ ] Log out, visit that event's public `/e/:eventId` URL with no auth — confirm it loads correctly
- [ ] Visit a *different*, still-draft event's public URL with no auth — confirm the friendly "not public yet" message renders, and confirm nothing appears in the browser console as an error
- [x] ~~Log in as a role that should not be able to publish (referee or control_desk), confirm the publish action is rejected at the RLS layer~~ — **confirmed gap, not a regression.** CC traced this directly from `010_rls_org_event_scoping.sql`: `is_event_admin_for()` grants access to any active event-scoped admin regardless of role, so `events` table RLS is role-blind within scope — a referee or control_desk user could call `events.update()` directly (e.g. via devtools) and RLS would allow it. Tab-hiding (`ROLE_TABS`) is the only thing currently preventing this in the UI. Pre-existing limitation, already flagged in the migration's own comments and tracked in `PROJECT_STATUS.md`/`FEATURE_SPEC_entitlements_and_identity.md`'s role-trim work — not introduced or worsened by this change, and not being fixed in this pass. Not re-testing this as a pass/fail item; recorded here so it isn't left ambiguous.
- [ ] Confirm the status indicator (Task 2.4) correctly reflects draft vs. published state after toggling

## When done

Only after the checklist above is manually confirmed: update `PROJECT_STATUS.md` to mark the publish-flow gap resolved, with today's date and a note on what was verified and by whom.
